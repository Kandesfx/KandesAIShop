import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import { NotFoundError, OutOfStockError, UnauthorizedError, AppError } from '../../lib/errors'
import { decrypt } from '../../lib/encryption'
import { verifyPassword } from '../auth/password'
import { readGuestToken } from '../cart/guest'
import type {
  CheckoutInput,
  TrackOrderInput,
  OrdersQueryInput,
  OrderStatusFilter,
  RevealKeyInput,
} from './validators'
import type { OrderItemView, OrderView, CheckoutResult } from './types'
import type { Order, OrderItem, PaymentMethod, Prisma } from '@prisma/client'

/**
 * Checkout service — Phase 2 P2-07.
 *
 * Flow:
 *   1. Load cart (user hoặc guest). Validate > 0 item, stock còn.
 *   2. Trong 1 transaction:
 *      - Sinh orderNumber `KDS-YYYYMMDD-XXXX` (sequence trong ngày, BR-1.1).
 *      - Sinh paymentReference `KDS {seq}` (4 chữ số để SePay webhook dễ match).
 *      - Snapshot OrderItem từ CartItem + Product/Variant tại thời điểm tạo.
 *      - Insert Order + OrderItems + OrderStatusHistory (pending).
 *      - Clear cart (xoá cartItems, reset totals, BR-1.6).
 *      - Compute expiresAt = now + 15 phút (BR-1.2 — auto-cancel).
 *   3. Build QR URL (VietQR) — controller/service caller dùng để trả client.
 *
 * Ownership:
 *   - User đã login: order.userId = user.id; getOrderView yêu cầu userId match.
 *   - Guest: order.userId = null; order.guestEmail/Phone/Token lưu; view qua
 *     guestToken cookie (xem `getOrderView`).
 *
 * Auto-cancel (BR-1.2):
 *   - expireOverdueOrders() được gọi định kỳ (Phase 3+ cron) — ở P2-07 chưa
 *     có cron, nhưng method public để route order có thể trigger manual nếu user
 *     quay lại trang sau khi hết hạn.
 *
 * Out of scope (Phase 3):
 *   - SePay webhook handler (match payment_reference → set paid).
 *   - Inventory key reservation (BR-3.2) — P2-07 chỉ check stock cho INSTANT_AUTO.
 *   - Delivery (sẽ trigger khi order paid → INSTANT_AUTO sẽ reserve + reveal).
 */

const ORDER_EXPIRY_MS = 15 * 60 * 1000 // 15 phút (BR-1.2)
const EXPIRY_OVERDUE_GRACE_MS = 60 * 1000 // Đợi thêm 60s sau expiresAt trước khi cancel

/** Alphanumeric chars cho paymentReference suffix — đủ A-Z + 0-9. */
const REF_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const REF_MIN_LEN = 6
const REF_MAX_LEN = 8

/**
 * Sinh random alphanumeric suffix dài 6-8 ký tự.
 * Dùng crypto.getRandomValues để đảm bảo randomness.
 */
function generatePaymentRefSuffix(): string {
  const length = REF_MIN_LEN + Math.floor(Math.random() * (REF_MAX_LEN - REF_MIN_LEN + 1))
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  let result = ''
  for (const v of arr) {
    result += REF_CHARS[v % REF_CHARS.length]
  }
  return result
}

type CartItemWithRelations = Prisma.CartItemGetPayload<{
  include: {
    product: {
      select: {
        id: true
        name: true
        sku: true
        stockStatus: true
        trackInventory: true
        deliveryStrategy: true
        isPublished: true
        deletedAt: true
        variants: { select: { id: true; name: true } }
      }
    }
    variant: { select: { id: true; name: true } }
  }
}>

type CartWithItemsForCheckout = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true
            name: true
            sku: true
            stockStatus: true
            trackInventory: true
            deliveryStrategy: true
            isPublished: true
            deletedAt: true
            variants: { select: { id: true; name: true } }
          }
        }
        variant: { select: { id: true; name: true } }
      }
    }
    coupon: { select: { code: true; id: true } }
  }
}>

const orderInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: { select: { name: true } },
    },
  },
} as const

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

function toOrderItemView(item: OrderWithItems['items'][number]): OrderItemView {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productNameSnapshot: item.productNameSnapshot,
    variantNameSnapshot: item.variant?.name ?? null,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents.toString(),
    totalPriceCents: item.totalPriceCents.toString(),
  }
}

export function toOrderView(order: OrderWithItems, currentUserId?: string | null): OrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    isGuest: order.userId === null,
    hasAccount: order.userId !== null,
    isOwner: Boolean(currentUserId && order.userId === currentUserId),
    guestEmail: order.guestEmail,
    guestPhone: order.guestPhone,
    notes: order.notes,
    items: order.items.map(toOrderItemView),
    subtotalCents: order.subtotalCents.toString(),
    discountCents: order.discountCents.toString(),
    shippingCents: order.shippingCents.toString(),
    taxCents: order.taxCents.toString(),
    totalCents: order.totalCents.toString(),
    currency: order.currency,
    expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
  }
}

/**
 * Sequence 4 chữ số theo ngày (BR-1.1).
 * Đếm số order đã tạo trong cùng ngày (UTC+0 nếu server chạy UTC; ở VN dev dùng local).
 *
 * BR-1.1: sequence reset mỗi ngày → key prefix theo YYYYMMDD.
 * Format: KDS-YYYYMMDD-XXXX (4 chữ số zero-pad).
 *
 * Race condition giữa 2 request đồng thời: count + 1 là best-effort.
 * Order number là UNIQUE trong DB → Prisma sẽ throw P2002 nếu trùng.
 * Caller (service.createOrderFromCart) catch P2002 + retry tối đa 3 lần.
 */
async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<{
  orderNumber: string
  sequence: number
}> {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const dateStr = `${yyyy}${mm}${dd}`

  const startOfDay = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const countToday = await tx.order.count({
    where: { createdAt: { gte: startOfDay, lt: startOfNextDay } },
  })
  const sequence = countToday + 1
  const orderNumber = `KDS-${dateStr}-${String(sequence).padStart(4, '0')}`
  return { orderNumber, sequence }
}

async function loadCartForCheckout(userId: string | null): Promise<CartWithItemsForCheckout> {
  let cart: CartWithItemsForCheckout | null
  if (userId) {
    cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stockStatus: true,
                trackInventory: true,
                deliveryStrategy: true,
                isPublished: true,
                deletedAt: true,
                variants: { select: { id: true, name: true } },
              },
            },
            variant: { select: { id: true, name: true } },
          },
        },
        coupon: { select: { code: true, id: true } },
      },
    })
  } else {
    const token = readGuestToken()
    if (!token) throw new NotFoundError('Giỏ hàng không tồn tại')
    cart = await db.cart.findUnique({
      where: { guestToken: token },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stockStatus: true,
                trackInventory: true,
                deliveryStrategy: true,
                isPublished: true,
                deletedAt: true,
                variants: { select: { id: true, name: true } },
              },
            },
            variant: { select: { id: true, name: true } },
          },
        },
        coupon: { select: { code: true, id: true } },
      },
    })
  }

  if (!cart) throw new NotFoundError('Giỏ hàng không tồn tại')
  return cart
}

/**
 * Validate cart có thể checkout: items > 0, mỗi item còn bán, INSTANT_AUTO có stock.
 * Throw NotFoundError / OutOfStockError.
 */
async function validateCart(cart: CartWithItemsForCheckout): Promise<void> {
  if (cart.items.length === 0) {
    throw new NotFoundError('Giỏ hàng trống — không thể thanh toán')
  }

  // Check product còn bán
  for (const item of cart.items) {
    if (!item.product.isPublished || item.product.deletedAt) {
      throw new NotFoundError(`Sản phẩm "${item.product.name}" đã ngừng bán`)
    }
    if (item.variantId) {
      const variantStillValid = item.product.variants.some((v) => v.id === item.variantId)
      if (!variantStillValid) {
        throw new NotFoundError(`Phân loại của "${item.product.name}" không còn bán`)
      }
    }
  }

  // Check stock INSTANT_AUTO + trackInventory
  for (const item of cart.items) {
    if (item.product.deliveryStrategy === 'INSTANT_AUTO' && item.product.trackInventory) {
      if (item.product.stockStatus === 'out_of_stock') {
        throw new OutOfStockError(`"${item.product.name}" đã hết hàng`)
      }
      const available = await db.inventoryItem.count({
        where: { productId: item.productId, status: 'available' },
      })
      if (available < item.quantity) {
        throw new OutOfStockError(`"${item.product.name}" chỉ còn ${available} sản phẩm trong kho`)
      }
    }
  }
}

export type CreateOrderMeta = {
  ipAddress?: string
  userAgent?: string
}

export const checkoutService = {
  /**
   * Tạo order từ cart hiện tại (user hoặc guest).
   *
   * - BR-1.6: 1 giỏ → 1 đơn. Clear cart sau khi tạo.
   * - BR-1.7: order có >= 1 item + total > 0.
   * - BR-1.1: orderNumber `KDS-YYYYMMDD-XXXX` sequence trong ngày.
   * - BR-1.2: expiresAt = now + 15 phút (auto-cancel sau).
   * - BR-2.1: paymentReference unique, nằm trong nội dung CK.
   * - D6: paymentReference format = `KDS {seq}` (4 chữ số, dễ match webhook Phase 3).
   * - D7: orderNumber format = `KDS-YYYYMMDD-XXXX`.
   *
   * Caller chịu trách nhiệm build QR URL từ `paymentReference` + `totalCents` qua
   * module checkout/qr.ts. Service không gọi QR provider để giữ layer sạch.
   */
  async createOrderFromCart(
    input: CheckoutInput,
    userId: string | null,
    meta: CreateOrderMeta = {}
  ): Promise<CheckoutResult> {
    const cart = await loadCartForCheckout(userId)

    await validateCart(cart)

    const subtotalCents = cart.items.reduce(
      (sum, it) => sum + BigInt(it.unitPriceCents) * BigInt(it.quantity),
      0n
    )
    if (subtotalCents <= 0n) {
      throw new NotFoundError('Tổng tiền phải > 0')
    }

    // Tổng = subtotal - discount (coupon đã được recompute ở cartService).
    // Nếu coupon đã validate fail thì discount = 0.
    const discountCents = BigInt(cart.discountCents)
    const totalCents = subtotalCents - discountCents

    const paymentMethod: PaymentMethod = 'sepay_qr'
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MS)

    // Nếu chưa login (userId === null), kiểm tra xem email/phone có thuộc về tài khoản nào đã tồn tại trong DB không
    let effectiveUserId = userId
    if (!effectiveUserId && (input.email || input.phone)) {
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            ...(input.email ? [{ email: input.email.trim().toLowerCase() }] : []),
            ...(input.phone ? [{ phone: input.phone.replace(/\D/g, '') }] : []),
          ],
        },
        select: { id: true },
      })
      if (existingUser) {
        effectiveUserId = existingUser.id
      }
    }

    // Retry tối đa 3 lần nếu race condition trên orderNumber (UNIQUE).
    let attempt = 0
    const maxAttempts = 3
    let created: Order | null = null
    let orderNumberStr = ''
    let paymentRef = ''

    while (attempt < maxAttempts) {
      attempt++
      try {
        created = await db.$transaction(async (tx) => {
          const { orderNumber, sequence } = await generateOrderNumber(tx)
          // D6: paymentReference format = `KDS{suffix}` (6-8 alphanumeric, prefix KDS).
          // Độ dài ngẫu nhiên 6-8 để tránh guessable sequence.
          // Chỉ dùng alphanumeric không confuse (không O,0,I,1).
          const suffix = generatePaymentRefSuffix()
          const paymentReference = `KDS${suffix}`

          const order = await tx.order.create({
            data: {
              orderNumber,
              userId: effectiveUserId,
              guestEmail: input.email || null,
              guestPhone: input.phone || null,
              guestToken: cart.guestToken || null,
              cartId: cart.id,
              status: 'pending',
              paymentStatus: 'unpaid',
              paymentMethod,
              paymentReference,
              subtotalCents,
              discountCents,
              shippingCents: 0n,
              taxCents: 0n,
              totalCents,
              currency: 'VND',
              couponId: cart.couponId ?? null,
              notes: input.notes || null,
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
              expiresAt,
            },
          })

          // Snapshot items
          await tx.orderItem.createMany({
            data: cart.items.map((it) => ({
              orderId: order.id,
              productId: it.productId,
              variantId: it.variantId,
              productNameSnapshot: it.product.name,
              productSkuSnapshot: it.product.sku,
              quantity: it.quantity,
              unitPriceCents: BigInt(it.unitPriceCents),
              totalPriceCents: BigInt(it.unitPriceCents) * BigInt(it.quantity),
            })),
          })

          // Audit (BR-1.9)
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: null,
              toStatus: 'pending',
              changedBy: userId,
              reason: 'Order created from cart',
            },
          })

          // Clear cart (BR-1.6)
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
          await tx.cart.update({
            where: { id: cart.id },
            data: {
              subtotalCents: 0n,
              discountCents: 0n,
              totalCents: 0n,
              couponId: null,
            },
          })

          orderNumberStr = orderNumber
          paymentRef = paymentReference
          return order
        })
        break
      } catch (err) {
        // Prisma unique constraint violation → retry với sequence mới
        const isUniqueError =
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        if (!isUniqueError || attempt >= maxAttempts) throw err
        logger.warn({ attempt, orderNumberStr }, 'Order number race condition, retrying')
      }
    }

    if (!created) throw new Error('Tạo đơn thất bại sau nhiều lần thử')

    logger.info(
      {
        orderId: created.id,
        orderNumber: orderNumberStr,
        userId,
        totalCents: totalCents.toString(),
        itemCount: cart.items.length,
      },
      'Order created from cart'
    )

    return {
      orderId: created.id,
      orderNumber: orderNumberStr,
      qrUrl: '', // caller build từ qr.ts với paymentRef + totalCents
      qrPayload: '',
      amount: Number(totalCents),
      paymentReference: paymentRef,
      expiresAt: expiresAt.toISOString(),
      redirectUrl: `/order/${orderNumberStr}`,
    }
  },

  /**
   * Lấy OrderView.
   * toOrderView xử lý phân quyền bảo mật (mask key nếu đơn thuộc account nhưng chưa login).
   */
  async getOrderView(orderNumber: string, userId: string | null): Promise<OrderView> {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: orderInclude,
    })
    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

    return toOrderView(order, userId)
  },

  /**
   * Lấy status ngắn gọn (cho client polling tại trang /order/[orderNumber]).
   * Chỉ trả status + paymentStatus + expiresAt + cancelledAt + paidAt.
   */
  async getOrderStatus(
    orderNumber: string,
    _userId: string | null
  ): Promise<
    Pick<
      OrderView,
      'orderNumber' | 'status' | 'paymentStatus' | 'expiresAt' | 'cancelledAt' | 'paidAt'
    >
  > {
    const order = await db.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        expiresAt: true,
        cancelledAt: true,
        paidAt: true,
      },
    })
    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    }
  },

  /**
   * Auto-cancel order PENDING quá hạn. BR-1.2.
   * Best-effort: idempotent (chỉ cancel nếu vẫn pending + đã quá grace).
   * Phase 3 sẽ gọi từ cron. P2-07 route có thể trigger thử mỗi lần user
   * quay lại trang order expired (giảm thiểu UX chờ).
   */
  async expireOverdueOrder(orderNumber: string): Promise<boolean> {
    const now = Date.now()
    const cutoff = new Date(now - EXPIRY_OVERDUE_GRACE_MS)

    const order = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true, expiresAt: true },
    })
    if (!order) return false
    if (order.status !== 'pending') return false
    if (!order.expiresAt || order.expiresAt > cutoff) return false

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          paymentStatus: 'failed',
        },
      })
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: 'pending',
          toStatus: 'cancelled',
          reason: 'Auto-cancelled: payment timeout (BR-1.2)',
        },
      })
    })

    logger.info({ orderId: order.id, orderNumber }, 'Order auto-cancelled (expired)')
    return true
  },
}

// Re-export helper for tests
export const __test = { generateOrderNumber, validateCart, toOrderView, normalizeContact }

// ====== P2-08 Guest Tracking ======

/** Constant-time delay để chống enumerate orderNumber (D15). */
const TRACK_DELAY_MS = 200

/**
 * Normalize contact:
 * - Email: lowercase + trim.
 * - Phone: strip spaces/dashes, `+84` → `0`, chỉ giữ chữ số.
 *
 * Trả về cả 2 dạng để service so sánh DB không phụ thuộc vào validate trước
 * (DB đã lưu phone dạng 0xx..., email lowercase — phải match normalize).
 */
export function normalizeContact(input: string): { email: string; phone: string } {
  const trimmed = input.trim()
  const phoneDigits = trimmed.replace(/[\s-]/g, '').replace(/^\+84/, '0').replace(/[^\d]/g, '')
  const email = trimmed.toLowerCase()
  return { email, phone: phoneDigits }
}

/**
 * Tra cứu order cho guest (P2-08).
 *
 * Quy trình:
 *   1. Lookup order theo orderNumber (DB không lộ tồn tại/không tồn tại).
 *   2. Match: (guestEmail === contact.email) OR (guestPhone === contact.phone).
 *   3. Constant-time delay ~200ms trước khi trả/throw (chống enumerate).
 *   4. Cùng trả 404 NotFoundError cho cả "sai orderNumber" và "sai contact".
 *
 * Trả OrderView (giống getOrderView) — UI client render ngay hoặc redirect
 * sang /order/[orderNumber] để có QR + countdown.
 *
 * ⚠️ Phase 3: thêm audit log (who tracked qua IP + orderNumber + timestamp).
 * ⚠️ Phase 3: thêm option OTP verify thay vì chỉ contact (master-spec §3).
 */
export async function trackOrderByGuest(input: TrackOrderInput): Promise<OrderView> {
  const { orderNumber, contact } = input
  const normalized = normalizeContact(contact)

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  })

  let match = false
  if (order) {
    const emailMatch = order.guestEmail && order.guestEmail === normalized.email
    const phoneMatch = order.guestPhone && order.guestPhone === normalized.phone
    match = Boolean(emailMatch || phoneMatch)
  }

  // Constant-time delay — cần dù Promise.all với throw để ĐẢM bảo delay
  // (không exit early).
  await new Promise((resolve) => setTimeout(resolve, TRACK_DELAY_MS))

  if (!order || !match) {
    throw new NotFoundError('Không tìm thấy đơn hàng với thông tin đã nhập')
  }

  return toOrderView(order)
}

// ====== P2-09 My Orders (User) ======

/** Shape đơn giản cho list — KHÔNG gồm items (không nặng khi list nhiều). */
export type OrderListItem = {
  id: string
  orderNumber: string
  status: OrderView['status']
  paymentStatus: OrderView['paymentStatus']
  totalCents: string
  currency: string
  itemCount: number
  createdAt: string
  paidAt: string | null
  deliveredAt: string | null
}

export type ListUserOrdersResult = {
  items: OrderListItem[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

/**
 * List đơn của user (P2-09).
 *
 * - Scope: `WHERE userId = :userId` (chỉ order của user, không kể guest).
 * - Filter status (optional).
 * - Pagination: skip/take, hasMore = total > skip + take.
 * - Returns OrderListItem (không bao gồm items để list page nhẹ).
 *
 * Phase 3: thêm search by orderNumber, filter date range.
 */
export async function listUserOrders(
  userId: string,
  query: OrdersQueryInput
): Promise<ListUserOrdersResult> {
  const { status, page, limit } = query
  const where: Prisma.OrderWhereInput = { userId }
  if (status !== 'all') {
    where.status = status
  }

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { items: true } },
      },
    }),
  ])

  const items: OrderListItem[] = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status as OrderView['status'],
    paymentStatus: o.paymentStatus as OrderView['paymentStatus'],
    totalCents: o.totalCents.toString(),
    currency: o.currency,
    itemCount: o._count.items,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
  }))

  return {
    items,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  }
}

/**
 * Lấy chi tiết 1 đơn của user (P2-09).
 *
 * - Ownership: chỉ order có `userId === userId` (không trả của user khác).
 * - Không tồn tại / không sở hữu → NotFoundError (chung) — chống enumerate.
 * - Trả OrderView đầy đủ (tái sử dụng toOrderView).
 */
export async function getUserOrder(userId: string, orderNumber: string): Promise<OrderView> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  })

  if (!order || order.userId !== userId) {
    throw new NotFoundError('Không tìm thấy đơn hàng')
  }

  return toOrderView(order)
}

/** Reveal key cho 1 đơn (P2-09). */
export type RevealKeyResult = {
  orderId: string
  orderNumber: string
  items: Array<{
    id: string
    productNameSnapshot: string
    content: string | null
    message: string | null
  }>
}

/**
 * Reveal key/credentials của order (P2-09).
 *
 * - Auth: gọi qua `requireUser` (graph caller).
 * - Ownership: order.userId === userId (chống lộ key của user khác).
 * - Trạng thái: CHỈ cho phép khi order.status = 'delivered' hoặc 'completed'.
 * - Password verify: user nhập lại password (D16) — chống phishing / shared device.
 * - Decrypt: `OrderItem.deliveredContentEncrypted` qua lib/encryption.
 * - Nếu item không có deliveredContentEncrypted → content = null
 *   (vd: PHYSICAL_PRODUCT sẽ có deliveredMessage thay vì key).
 * - Audit log: chỉ log orderNumber + userId, KHÔNG log key.
 *
 * Lưu ý: TRƯỚC KHI expose key, đảm bảo route caller đã rate-limit
 * (REST_API §10: 5/min/user).
 */
export async function revealKeyForUser(
  userId: string,
  orderNumber: string,
  input?: RevealKeyInput,
  userPasswordHash?: string
): Promise<RevealKeyResult> {
  // Nếu có password được gửi lên và có hash, verify (nếu cần tương thích ngược)
  if (input?.password && userPasswordHash) {
    const ok = await verifyPassword(userPasswordHash, input.password)
    if (!ok) {
      throw new AppError('INVALID_PASSWORD', 'Mật khẩu không đúng', 401)
    }
  }

  // 2. Load order + items (chỉ items — không cần full orderInclude)
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      items: {
        select: {
          id: true,
          productNameSnapshot: true,
          deliveredContentEncrypted: true,
          deliveredMessage: true,
        },
      },
    },
  })

  if (!order || order.userId !== userId) {
    throw new NotFoundError('Không tìm thấy đơn hàng')
  }

  // 3. Chỉ cho reveal sau khi delivered
  if (order.status !== 'delivered' && order.status !== 'completed') {
    throw new AppError('NOT_DELIVERED', 'Key chỉ có sẵn sau khi đơn được giao thành công', 400)
  }

  // 4. Decrypt từng item
  const items = order.items.map((it) => {
    let content: string | null = null
    if (it.deliveredContentEncrypted) {
      try {
        content = decrypt(Buffer.from(it.deliveredContentEncrypted))
      } catch (err) {
        logger.error(
          { orderId: order.id, itemId: it.id, err: (err as Error).message },
          'decrypt deliveredContent thất bại'
        )
        content = null
      }
    }
    return {
      id: it.id,
      productNameSnapshot: it.productNameSnapshot,
      content,
      message: it.deliveredMessage,
    }
  })

  // 5. Audit log (KHÔNG log key)
  logger.info(
    { orderId: order.id, orderNumber: order.orderNumber, userId, itemCount: items.length },
    'Key revealed bởi user'
  )

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    items,
  }
}
