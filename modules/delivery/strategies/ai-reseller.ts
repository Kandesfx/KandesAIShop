import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { encrypt } from '@/lib/encryption'
import { generateApiToken } from '@/modules/ai-gateway/auth'
import { pickFromPool } from '@/modules/ai-gateway/ncc-keys'
import { sendApiKeyDeliveredEmail } from '@/modules/ai-gateway/email'
import type { StrategyContext } from '../types'

/**
 * AI_RESELLER — Phase 6 P6-11.
 *
 * Tự động cấp NCC API key cho KH khi đơn AI plan được paid:
 *   1. Resolve AiPlan từ ProductVariant.aiPlanId.
 *   2. Pick 1 NCC key từ pool (FIFO highest balance, transaction `FOR UPDATE`).
 *   3. Generate `ks-xxx` token + SHA-256 hash.
 *   4. Tạo `AiApiKey` (user, plan, nccKeyId, source='kandes_purchased').
 *   5. Encrypt token → save to `OrderItem.deliveredContentEncrypted`.
 *   6. Email plaintext token (1 lần) cho KH.
 *
 * Lưu ý:
 *   - KHÔNG log plaintext token.
 *   - Nếu pool exhausted → throw ConflictError → admin notification (telegram).
 *   - KHÔNG mark NCC key 'exhausted' sau khi bind (key vẫn còn balance).
 */
export async function deliverAiReseller(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber, productId, variantId } = ctx

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  // Tìm variant để resolve AiPlan (lấy variant đầu tiên có aiPlanId).
  const targetItem =
    order.items.find(
      (it) => it.productId === productId && (variantId == null || it.variantId === variantId)
    ) ?? order.items[0]
  if (!targetItem) throw new NotFoundError('Không tìm thấy item trong đơn')

  const variant = targetItem.variantId
    ? await db.productVariant.findUnique({
        where: { id: targetItem.variantId },
        include: { aiPlan: true },
      })
    : null

  // Fallback: lấy plan đầu tiên active (an toàn — product đã qua checkout thì có plan).
  const aiPlan =
    variant?.aiPlan ??
    (await db.aiPlan.findFirst({ where: { isActive: true }, orderBy: { priceCents: 'asc' } }))
  if (!aiPlan) {
    throw new ConflictError('Chưa có AI plan nào active — admin cần seed plans')
  }

  if (!order.user) {
    throw new ConflictError('AI plan orders yêu cầu user đăng nhập')
  }

  // 1. Pick NCC key từ pool
  const nccKey = await pickFromPool('ccpro')
  if (!nccKey) {
    throw new ConflictError(
      'NCC key pool exhausted — admin cần nạp thêm key hoặc sync balance'
    )
  }

  // 2. Generate ks-xxx token
  const { token, keyPrefix, keyHash } = generateApiToken()

  // 3. Compute expiresAt
  const expiresAt = new Date(Date.now() + aiPlan.durationDays * 24 * 60 * 60 * 1000)

  // 4. Tạo AiApiKey
  const apiKey = await db.aiApiKey.create({
    data: {
      userId: order.user.id,
      planId: aiPlan.id,
      nccKeyId: nccKey.id,
      source: 'kandes_purchased',
      name: `Plan ${aiPlan.name} · ${orderNumber}`,
      keyPrefix,
      keyHash,
      status: 'active',
      quotaUsedTokens: 0n,
      expiresAt,
    },
    select: { id: true },
  })

  // 5. Encrypt token → save to OrderItem
  const ciphertext = encrypt(token)
  await db.orderItem.updateMany({
    where: {
      orderId,
      productId,
      variantId: variantId ?? null,
      deliveredContentEncrypted: null,
    },
    data: {
      deliveredContentEncrypted: ciphertext,
    },
  })

  // 6. Email (fire-and-forget — failure logged, không block pipeline)
  void sendApiKeyDeliveredEmail({
    to: order.user.email ?? '',
    userName: order.user.name ?? 'Quý khách',
    planName: aiPlan.name,
    apiKeyId: apiKey.id,
    plaintextToken: token,
    expiresAt,
    baseUrl: process.env.PUBLIC_BASE_URL ?? 'https://kandes.shop',
  }).catch((err) => {
    logger.error(
      { err: (err as Error).message, apiKeyId: apiKey.id, orderId },
      'AI_RESELLER: email send failed'
    )
  })

  logger.info(
    {
      orderId,
      orderNumber,
      apiKeyId: apiKey.id,
      planId: aiPlan.id,
      nccKeyId: nccKey.id,
      userId: order.user.id,
    },
    'AI_RESELLER: delivered NCC API key'
  )

  return { deliveredItemIds: [apiKey.id], success: true }
}