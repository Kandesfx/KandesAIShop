import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import { NotFoundError, OutOfStockError } from '../../lib/errors'
import {
  generateGuestToken,
  readGuestToken,
  setGuestCookie,
  clearGuestCookie,
} from './guest'
import type { Prisma, CartItem } from '@prisma/client'
import type { CartItemView, CartView } from './types'

/**
 * Cart service — Phase 2 P2-06.
 *
 * Strategy:
 *   - User đã login: cart lưu DB với userId unique.
 *   - Guest: cart lưu DB với guestToken unique (cookie `kds_cart`).
 *   - Khi login → merge items từ guest cart vào user cart (sum quantity nếu trùng).
 *
 * Tính tiền real-time: subtotal = sum(lineTotal). Discount/total để 0 nếu chưa
 * có coupon (P2-07 sẽ apply coupon).
 *
 * Snapshot price: `unitPriceCents` lưu tại thời điểm add vào cart (BR: cart
 * không bị ảnh hưởng khi admin đổi giá).
 *
 * Stock check:
 *   - INSTANT_AUTO + trackInventory: check available inventory count.
 *   - MANUAL/FILE/TOPUP/EXTERNAL_INVITE: không check stock (admin handle sau).
 *   - Nếu hết → throw OutOfStockError.
 */

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          slug: true,
          name: true,
          stockStatus: true,
          trackInventory: true,
          deliveryStrategy: true,
          media: {
            where: { type: 'image' },
            orderBy: { position: 'asc' },
            take: 1,
            select: { url: true },
          },
        },
      },
      variant: { select: { name: true } },
    },
  },
  coupon: { select: { code: true } },
} as const

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>

async function loadCartById(cartId: string): Promise<CartView> {
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  })
  if (!cart) throw new Error(`Cart ${cartId} disappeared`)
  return toCartView(cart)
}

async function ensureUserCart(userId: string) {
  let cart = await db.cart.findUnique({ where: { userId } })
  if (!cart) {
    cart = await db.cart.create({ data: { userId } })
  }
  return cart
}

async function ensureGuestCart(guestToken: string) {
  let cart = await db.cart.findUnique({ where: { guestToken } })
  if (!cart) {
    cart = await db.cart.create({ data: { guestToken } })
  }
  return cart
}

function toCartView(cart: CartWithItems): CartView {
  const items: CartItemView[] = cart.items.map((it) => {
    const unit = BigInt(it.unitPriceCents)
    const qty = it.quantity
    const lineTotal = unit * BigInt(qty)
    return {
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      productSlug: it.product.slug,
      productName: it.product.name,
      productImage: it.product.media[0]?.url ?? null,
      variantName: it.variant?.name ?? null,
      unitPriceCents: unit.toString(),
      quantity: qty,
      lineTotalCents: lineTotal.toString(),
    }
  })

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0)

  return {
    id: cart.id,
    type: cart.userId ? 'user' : 'guest',
    items,
    itemCount,
    subtotalCents: cart.subtotalCents.toString(),
    discountCents: cart.discountCents.toString(),
    totalCents: cart.totalCents.toString(),
    couponCode: cart.coupon?.code ?? null,
  }
}

export const cartService = {
  /**
   * Lấy hoặc tạo cart cho user hoặc guest. Tự sinh guest token + set cookie
   * cho lần đầu.
   */
  async getOrCreateCart(userId: string | null) {
    if (userId) return ensureUserCart(userId)
    let token = readGuestToken()
    if (!token) {
      token = generateGuestToken()
      setGuestCookie(token)
    }
    return ensureGuestCart(token)
  },

  /**
   * Lấy cart hiện tại (user hoặc guest).
   * Tự tạo cart mới nếu chưa có (lazy init).
   */
  async getCurrentCart(userId: string | null): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId)
    return loadCartById(cart.id)
  },

  /**
   * Thêm item vào cart (user hoặc guest).
   * Nếu item đã có (cùng productId + variantId) → cộng dồn quantity.
   */
  async addItem(
    userId: string | null,
    input: { productId: string; variantId?: string | null; quantity: number }
  ): Promise<CartView> {
    // Validate product + variant tồn tại và published
    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: {
        id: true,
        priceCents: true,
        salePriceCents: true,
        stockStatus: true,
        trackInventory: true,
        deliveryStrategy: true,
        isPublished: true,
        deletedAt: true,
      },
    })
    if (!product || !product.isPublished || product.deletedAt) {
      throw new NotFoundError('Sản phẩm không tồn tại hoặc đã ngừng bán')
    }

    // Snapshot price: variant nếu có variantId, ngược lại product. Ưu tiên salePrice.
    let unitPriceCents: bigint
    if (input.variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: input.variantId },
        select: {
          id: true,
          productId: true,
          priceCents: true,
          salePriceCents: true,
          isActive: true,
        },
      })
      if (!variant || variant.productId !== product.id || !variant.isActive) {
        throw new NotFoundError('Variant không tồn tại hoặc đã ngừng bán')
      }
      unitPriceCents = variant.salePriceCents ?? variant.priceCents
    } else {
      unitPriceCents = product.salePriceCents ?? product.priceCents
    }

    // Đảm bảo cart tồn tại (cần trước stock check để trừ qty trong cart)
    const cart = await this.getOrCreateCart(userId)

    // Stock check cho INSTANT_AUTO + trackInventory
    // F3: phải trừ qty đã có trong cart hiện tại (nếu add lại sp đã có)
    if (product.deliveryStrategy === 'INSTANT_AUTO' && product.trackInventory) {
      if (product.stockStatus === 'out_of_stock') {
        throw new OutOfStockError()
      }
      const existingInCart = await db.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          variantId: input.variantId ?? null,
        },
        select: { quantity: true },
      })
      const qtyAlreadyInCart = existingInCart?.quantity ?? 0
      const totalRequested = qtyAlreadyInCart + input.quantity
      const available = await db.inventoryItem.count({
        where: { productId: product.id, status: 'available' },
      })
      if (available < totalRequested) {
        const remaining = Math.max(0, available - qtyAlreadyInCart)
        throw new OutOfStockError(
          remaining === 0
            ? 'Sản phẩm đã hết hàng'
            : `Chỉ có thể thêm ${remaining} sản phẩm nữa`
        )
      }
    }

    // Upsert item (cộng dồn quantity nếu đã tồn tại)
    // Upsert: Prisma composite unique với nullable variantId cần split branch
    if (input.variantId) {
      await db.cartItem.upsert({
        where: {
          cartId_productId_variantId: {
            cartId: cart.id,
            productId: input.productId,
            variantId: input.variantId,
          },
        },
        create: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId,
          quantity: input.quantity,
          unitPriceCents,
        },
        update: {
          quantity: { increment: input.quantity },
          unitPriceCents,
        },
      })
    } else {
      // Tìm item trùng productId + variantId=null bằng findFirst
      const existing = await db.cartItem.findFirst({
        where: { cartId: cart.id, productId: input.productId, variantId: null },
      })
      if (existing) {
        await db.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + input.quantity,
            unitPriceCents,
          },
        })
      } else {
        await db.cartItem.create({
          data: {
            cartId: cart.id,
            productId: input.productId,
            variantId: null,
            quantity: input.quantity,
            unitPriceCents,
          },
        })
      }
    }

    await recomputeCartTotals(cart.id)
    const view = await loadCartById(cart.id)

    logger.info(
      {
        cartId: cart.id,
        userId,
        productId: input.productId,
        quantity: input.quantity,
      },
      'Cart item added'
    )

    return view
  },

  /** Update quantity. quantity=0 → xoá item. */
  async updateQty(
    userId: string | null,
    itemId: string,
    input: { quantity: number }
  ): Promise<CartView> {
    const item = await db.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: { select: { userId: true, guestToken: true } },
        product: {
          select: {
            stockStatus: true,
            trackInventory: true,
            deliveryStrategy: true,
          },
        },
      },
    })
    if (!item) throw new NotFoundError('Item không tồn tại trong giỏ')

    // Auth check: đảm bảo user sở hữu cart này
    if (userId && item.cart.userId !== userId) {
      throw new NotFoundError('Item không tồn tại trong giỏ')
    }
    if (!userId && item.cart.guestToken !== readGuestToken()) {
      throw new NotFoundError('Item không tồn tại trong giỏ')
    }

    // F4: nếu tăng số lượng (mới > cũ) và là INSTANT_AUTO + trackInventory
    // → re-check stock. Giảm hoặc xoá thì không cần.
    if (input.quantity > item.quantity && item.product.trackInventory && item.product.deliveryStrategy === 'INSTANT_AUTO') {
      if (item.product.stockStatus === 'out_of_stock') {
        throw new OutOfStockError()
      }
      const available = await db.inventoryItem.count({
        where: { productId: item.productId, status: 'available' },
      })
      if (available < input.quantity) {
        throw new OutOfStockError(`Chỉ còn ${available} sản phẩm trong kho`)
      }
    }

    if (input.quantity === 0) {
      await db.cartItem.delete({ where: { id: itemId } })
    } else {
      await db.cartItem.update({
        where: { id: itemId },
        data: { quantity: input.quantity },
      })
    }

    await recomputeCartTotals(item.cartId)
    return loadCartById(item.cartId)
  },

  /** Xoá item. */
  async removeItem(userId: string | null, itemId: string): Promise<CartView> {
    return this.updateQty(userId, itemId, { quantity: 0 })
  },

  /** Xoá toàn bộ items. */
  async clearCart(userId: string | null): Promise<void> {
    const cart = userId
      ? await db.cart.findUnique({ where: { userId } })
      : await db.cart.findUnique({ where: { guestToken: readGuestToken() ?? '_none_' } })

    if (!cart) return

    await db.cartItem.deleteMany({ where: { cartId: cart.id } })
    await db.cart.update({
      where: { id: cart.id },
      data: { subtotalCents: 0, discountCents: 0, totalCents: 0 },
    })
  },

  /**
   * Merge guest cart → user cart khi user login.
   * Strategy: cho mỗi item trong guest cart, upsert vào user cart (sum quantity).
   * Sau đó xoá guest cart + clear cookie. Toàn bộ wrap trong transaction để
   * đảm bảo atomicity (F1).
   */
  async mergeGuestCartToUser(userId: string, guestToken: string | null): Promise<CartView | null> {
    if (!guestToken) return null

    const guestCart = await db.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    })
    if (!guestCart || guestCart.items.length === 0) {
      clearGuestCookie()
      return null
    }

    // Đảm bảo user cart tồn tại (ngoài transaction — nếu user chưa có cart
    // thì create ở ngoài, merge logic chỉ trong tx)
    const userCart = await ensureUserCart(userId)

    await db.$transaction(async (tx) => {
      for (const item of guestCart.items) {
        await mergeOneItem(tx, userCart.id, item)
      }
      await tx.cart.delete({ where: { id: guestCart.id } })
    })

    clearGuestCookie()
    await recomputeCartTotals(userCart.id)
    const view = await loadCartById(userCart.id)
    logger.info(
      { userId, guestCartId: guestCart.id, mergedItems: guestCart.items.length },
      'Guest cart merged to user'
    )
    return view
  },
}

/**
 * Upsert 1 item từ guest cart vào user cart. Tách ra để dùng chung với
 * transaction client (F1) và composite key nullable handling (giống addItem).
 */
async function mergeOneItem(
  tx: Prisma.TransactionClient,
  userCartId: string,
  item: CartItem
): Promise<void> {
  if (item.variantId) {
    await tx.cartItem.upsert({
      where: {
        cartId_productId_variantId: {
          cartId: userCartId,
          productId: item.productId,
          variantId: item.variantId,
        },
      },
      create: {
        cartId: userCartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      },
      update: {
        quantity: { increment: item.quantity },
      },
    })
  } else {
    const existing = await tx.cartItem.findFirst({
      where: { cartId: userCartId, productId: item.productId, variantId: null },
    })
    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      })
    } else {
      await tx.cartItem.create({
        data: {
          cartId: userCartId,
          productId: item.productId,
          variantId: null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        },
      })
    }
  }
}

/**
 * Tính lại subtotal/discount/total dựa trên items hiện tại.
 *
 * F2: Nếu cart có couponId → đọc coupon, validate còn hiệu lực, tính discount
 * theo type (% hoặc fixed). Nếu coupon hết hạn/hết lượt → clear coupon + discount=0.
 * BR-5.3: discount không vượt quá subtotal (không cho âm).
 */
async function recomputeCartTotals(cartId: string): Promise<void> {
  const items = await db.cartItem.findMany({
    where: { cartId },
    select: { unitPriceCents: true, quantity: true },
  })

  const subtotalCents = items.reduce(
    (sum, it) => sum + BigInt(it.unitPriceCents) * BigInt(it.quantity),
    0n
  )

  const cart = await db.cart.findUnique({
    where: { id: cartId },
    select: { couponId: true },
  })

  let discountCents = 0n
  let couponIdToKeep: string | null = cart?.couponId ?? null

  if (cart?.couponId && subtotalCents > 0n) {
    const coupon = await db.coupon.findUnique({
      where: { id: cart.couponId },
      select: {
        type: true,
        value: true,
        minOrderCents: true,
        maxDiscountCents: true,
        maxUses: true,
        usedCount: true,
        startsAt: true,
        expiresAt: true,
        isActive: true,
      },
    })

    const now = new Date()
    const isValid =
      coupon &&
      coupon.isActive &&
      coupon.startsAt <= now &&
      coupon.expiresAt >= now &&
      (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
      subtotalCents >= BigInt(coupon.minOrderCents)

    if (!isValid || !coupon) {
      // Coupon không còn hợp lệ → gỡ
      couponIdToKeep = null
      discountCents = 0n
    } else {
      // Tính discount
      if (coupon.type === 'percent') {
        // value là % (0-100). Tính: subtotal * value / 100
        discountCents = (subtotalCents * BigInt(coupon.value)) / 100n
        if (coupon.maxDiscountCents !== null) {
          const cap = BigInt(coupon.maxDiscountCents)
          if (discountCents > cap) discountCents = cap
        }
      } else {
        // fixed: value là VND (cents)
        discountCents = BigInt(coupon.value)
      }
      // BR-5.3: không vượt subtotal
      if (discountCents > subtotalCents) discountCents = subtotalCents
    }
  }

  const totalCents = subtotalCents - discountCents

  await db.cart.update({
    where: { id: cartId },
    data: {
      subtotalCents,
      discountCents,
      totalCents,
      couponId: couponIdToKeep,
    },
  })
}
