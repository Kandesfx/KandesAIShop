import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { AppError } from '@/lib/errors'
import {
  verifyHmacSignature,
  verifyApiKey,
  readRawBody,
  extractSignature,
  isWebhookConfigured,
  getSepayWebhookSecret,
  SEPAY_SIGNATURE_HEADER,
  SEPAY_SIGNATURE_ALGORITHM,
  SEPAY_SIGNATURE_ENCODING,
} from '@/lib/webhook-verify'
import { sepayWebhookSchema, recordPayment, extractPaymentReference } from '@/modules/payment'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/sepay
 *
 * SePay gửi webhook khi có giao dịch CK vào TK ngân hàng.
 * Hỗ trợ 2 cách verify:
 *   - HMAC-SHA256: Header `X-Sepay-Signature` chứa hex SHA-256 signature.
 *   - API Key: Header `Authorization: Apikey <key>`.
 *
 * Flow:
 *   1. Verify authentication (HMAC hoặc API Key).
 *   2. Validate payload qua Zod.
 *   3. Extract paymentReference từ content (regex "KDSxxxx").
 *   4. recordPayment() — idempotent qua providerTransactionId.
 *   5. Nếu kind='processed' → trigger delivery service (Phase 3 sync).
 *
 * Rate-limit: 100/min/IP (SePay có thể gửi batch).
 *
 * ⚠️ KHÔNG log raw payload (chứa PII như SĐT, tên).
 * ⚠️ KHÔNG trả lỗi chi tiết — chỉ 200/401/500.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req) ?? 'unknown'
    await rateLimitOrThrow(rateLimitKey('webhook:sepay', ip), 100, 60 * 1000)

    // 1. Đọc raw body & verify auth nếu có config
    const secret = getSepayWebhookSecret()
    const rawBody = await readRawBody(req)
    const authHeader =
      req.headers.get('authorization') ||
      req.headers.get('x-api-key') ||
      req.headers.get('api-key') ||
      req.headers.get('x-sepay-api-key')
    const sigHeader = extractSignature(req.headers.get(SEPAY_SIGNATURE_HEADER))

    if (secret && (authHeader || sigHeader)) {
      if (authHeader) {
        // Ưu tiên API Key (Authorization: Apikey <key> hoặc Bearer <key>)
        verifyApiKey(authHeader, secret)
      } else if (sigHeader) {
        // Fallback: HMAC-SHA256
        verifyHmacSignature({
          rawBody,
          signature: sigHeader,
          secret,
          algorithm: SEPAY_SIGNATURE_ALGORITHM,
          signatureEncoding: SEPAY_SIGNATURE_ENCODING,
        })
      }
    }

    // 3. Parse + validate payload
    let rawParsed: unknown
    try {
      rawParsed = JSON.parse(rawBody)
    } catch {
      throw new AppError('WEBHOOK_INVALID_PAYLOAD', 'Body không phải JSON', 400)
    }
    const parsed = sepayWebhookSchema.safeParse(rawParsed)
    if (!parsed.success) {
      logger.warn(
        {
          errors: parsed.error.errors.map((e) => e.path.join('.')).join(', '),
        },
        'SePay webhook payload invalid'
      )
      throw new AppError('WEBHOOK_INVALID_PAYLOAD', 'Payload không hợp lệ', 400)
    }
    const payload = parsed.data

    // 4. Extract paymentReference từ code hoặc content
    const orderNumber =
      (payload.code ? extractPaymentReference(payload.code) : null) ||
      extractPaymentReference(payload.content) ||
      payload.code ||
      null

    if (!orderNumber) {
      logger.warn(
        { contentPreview: payload.content?.slice(0, 32), code: payload.code },
        'SePay webhook content không match pattern KDS'
      )
      // Vẫn trả 200 để SePay không retry
      return ok({ kind: 'no_match', orderNumber: null, message: 'No payment reference found' })
    }

    // 5. Record payment (idempotent qua providerTransactionId)
    const result = await recordPayment({
      providerTransactionId: String(payload.id),
      orderNumber,
      amountCents: BigInt(payload.transferAmount), // VND = cents (identity)
      transactionDate: new Date(payload.transactionDate),
      rawPayload: rawParsed,
    })

    // 6. Nếu processed → trigger delivery (sync, Phase 3)
    if (result.kind === 'processed') {
      // Lazy import để tránh circular dependency giữa payment ↔ delivery
      const { deliveryService } = await import('@/modules/delivery')
      try {
        await deliveryService.processOrder(result.orderId)
      } catch (err) {
        // Delivery fail → log + không crash (admin sẽ retry thủ công Phase 4)
        logger.error(
          {
            orderId: result.orderId,
            err: (err as Error).message,
          },
          'Auto-delivery fail sau khi mark paid'
        )
      }
    }

    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
