import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { clearGuestCookie } from '@/modules/cart'
import { checkoutService, buildQrUrl, isSepayConfigured } from '@/modules/checkout'
import { checkoutSchema } from '@/modules/checkout'
import { isTurnstileConfigured, verifyTurnstileToken } from '@/modules/checkout/turnstile'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkout
 * Body: { email, phone, notes?, acceptTerms: true, paymentMethod: 'sepay_qr' }
 *
 * Flow:
 *   - Rate-limit 10/min/user (theo REST_API §10 — /checkout).
 *   - Validate input (Zod, route boundary).
 *   - Service tạo Order từ cart (transaction + snapshot + clear cart).
 *   - Build QR URL từ paymentReference + amount (VietQR).
 *   - Clear guest cart cookie nếu guest checkout (cart đã clear ở DB).
 *   - Trả CheckoutResult cho client → redirect sang /order/[orderNumber].
 *
 * Nếu SePay chưa config env: trả 503 + hướng dẫn (BR-1.7 tránh đơn không có
 * cách thanh toán).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const ip = getClientIp(req)

    // Rate-limit theo user (hoặc IP cho guest) — 10/min.
    await rateLimitOrThrow(rateLimitKey('checkout', user?.id ?? ip ?? 'unknown'), 10, 60 * 1000)

    if (!isSepayConfigured()) {
      throw new AppError(
        'PAYMENT_FAILED',
        'Thanh toán QR chưa được cấu hình trên hệ thống. Vui lòng liên hệ admin.',
        503
      )
    }

    const input = parseInput(checkoutSchema, await req.json())

    // Phase 9 C7: Turnstile CAPTCHA (anti-fraud). Chỉ enforce khi đã config
    // TURNSTILE_SECRET_KEY — nếu chưa setup hoặc Turnstile down, fallback về
    // rate-limit hiện tại (không chặn checkout, theo PHASE_9_POLISH.md).
    if (isTurnstileConfigured()) {
      if (!input.turnstileToken) {
        throw new AppError('VALIDATION_ERROR', 'Vui lòng xác minh CAPTCHA để tiếp tục', 422, [
          { field: 'turnstileToken', message: 'Thiếu token xác minh CAPTCHA' },
        ])
      }
      let verified: { success: boolean }
      try {
        verified = await verifyTurnstileToken(input.turnstileToken, ip)
      } catch (err) {
        // Network error / Turnstile API down → log + fallback rate-limit thay vì
        // chặn toàn bộ checkout (tránh single point of failure từ dịch vụ ngoài).
        logger.warn({ err: (err as Error).message }, 'checkout: turnstile verify error, fallback rate-limit')
        verified = { success: true }
      }
      if (!verified.success) {
        throw new AppError('VALIDATION_ERROR', 'Xác minh CAPTCHA thất bại, vui lòng thử lại', 422, [
          { field: 'turnstileToken', message: 'Token CAPTCHA không hợp lệ hoặc đã hết hạn' },
        ])
      }
    }

    const userAgent = req.headers.get('user-agent') ?? undefined

    const result = await checkoutService.createOrderFromCart(input, user?.id ?? null, {
      ipAddress: ip,
      userAgent,
    })

    // Build QR URL sau khi có paymentReference + amount
    const qrUrl = buildQrUrl({
      amountVnd: result.amount,
      paymentReference: result.paymentReference,
    })
    const resultWithQr = { ...result, qrUrl }

    return ok({ result: resultWithQr }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
