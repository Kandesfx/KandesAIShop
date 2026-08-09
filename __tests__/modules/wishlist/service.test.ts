import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wishlistService } from '@/modules/wishlist/service'
import { NotFoundError } from '@/lib/errors'

/**
 * Unit tests cho wishlist service — Phase 9 D3 "Lưu lại sau".
 *
 * Mock `@/lib/db` + repository để test business logic (idempotency,
 * validation product/variant, quyền sở hữu) mà không cần DB thật.
 */

vi.mock('@/lib/db', () => ({
  db: {
    product: {
      findUnique: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/modules/wishlist/repository', () => ({
  wishlistRepository: {
    findByUserAndProduct: vi.fn(),
    create: vi.fn(),
    listByUser: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
    deleteByUserAndProduct: vi.fn(),
  },
}))

describe('wishlist service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addToWishlist', () => {
    it('throws NotFoundError nếu product không tồn tại', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.product.findUnique).mockResolvedValue(null as never)

      await expect(
        wishlistService.addToWishlist('user-1', { productId: 'product-1' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError nếu product chưa published hoặc đã xoá', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.product.findUnique).mockResolvedValue({
        id: 'product-1',
        isPublished: false,
        deletedAt: null,
      } as never)

      await expect(
        wishlistService.addToWishlist('user-1', { productId: 'product-1' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError nếu variant không thuộc product', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.product.findUnique).mockResolvedValue({
        id: 'product-1',
        isPublished: true,
        deletedAt: null,
      } as never)
      vi.mocked(db.productVariant.findUnique).mockResolvedValue({
        id: 'variant-1',
        productId: 'other-product',
      } as never)

      await expect(
        wishlistService.addToWishlist('user-1', {
          productId: 'product-1',
          variantId: 'variant-1',
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('idempotent — trả về item hiện tại nếu đã có trong wishlist', async () => {
      const { db } = await import('@/lib/db')
      const { wishlistRepository } = await import('@/modules/wishlist/repository')

      vi.mocked(db.product.findUnique).mockResolvedValue({
        id: 'product-1',
        isPublished: true,
        deletedAt: null,
      } as never)
      vi.mocked(wishlistRepository.findByUserAndProduct).mockResolvedValue({
        id: 'existing-id',
      } as never)

      const result = await wishlistService.addToWishlist('user-1', {
        productId: 'product-1',
      })

      expect(result).toEqual({ id: 'existing-id' })
      expect(wishlistRepository.create).not.toHaveBeenCalled()
    })

    it('tạo item mới nếu chưa có trong wishlist', async () => {
      const { db } = await import('@/lib/db')
      const { wishlistRepository } = await import('@/modules/wishlist/repository')

      vi.mocked(db.product.findUnique).mockResolvedValue({
        id: 'product-1',
        isPublished: true,
        deletedAt: null,
      } as never)
      vi.mocked(wishlistRepository.findByUserAndProduct).mockResolvedValue(null)
      vi.mocked(wishlistRepository.create).mockResolvedValue({ id: 'new-id' } as never)

      const result = await wishlistService.addToWishlist('user-1', {
        productId: 'product-1',
        variantId: null,
      })

      expect(result).toEqual({ id: 'new-id' })
      expect(wishlistRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        productId: 'product-1',
        variantId: null,
      })
    })
  })

  describe('removeFromWishlist', () => {
    it('throws NotFoundError nếu item không tồn tại', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')
      vi.mocked(wishlistRepository.findById).mockResolvedValue(null)

      await expect(wishlistService.removeFromWishlist('user-1', 'item-1')).rejects.toThrow(
        NotFoundError
      )
    })

    it('throws NotFoundError nếu item thuộc user khác (kiểm tra quyền sở hữu)', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')
      vi.mocked(wishlistRepository.findById).mockResolvedValue({
        id: 'item-1',
        userId: 'other-user',
      } as never)

      await expect(wishlistService.removeFromWishlist('user-1', 'item-1')).rejects.toThrow(
        NotFoundError
      )
      expect(wishlistRepository.delete).not.toHaveBeenCalled()
    })

    it('xoá item nếu đúng owner', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')
      vi.mocked(wishlistRepository.findById).mockResolvedValue({
        id: 'item-1',
        userId: 'user-1',
      } as never)

      await wishlistService.removeFromWishlist('user-1', 'item-1')

      expect(wishlistRepository.delete).toHaveBeenCalledWith('item-1')
    })
  })

  describe('listWishlist', () => {
    it('map denormalized product/variant data sang WishlistItemView', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')
      vi.mocked(wishlistRepository.listByUser).mockResolvedValue([
        {
          id: 'item-1',
          productId: 'product-1',
          variantId: null,
          createdAt: new Date('2026-08-09T00:00:00Z'),
          product: {
            slug: 'san-pham-1',
            name: 'Sản phẩm 1',
            priceCents: 100000n,
            salePriceCents: null,
            isPublished: true,
            deletedAt: null,
            media: [{ url: 'https://example.com/img.jpg' }],
          },
          variant: null,
        },
      ] as never)

      const result = await wishlistService.listWishlist('user-1')

      expect(result).toEqual([
        {
          id: 'item-1',
          productId: 'product-1',
          variantId: null,
          productSlug: 'san-pham-1',
          productName: 'Sản phẩm 1',
          productImage: 'https://example.com/img.jpg',
          variantName: null,
          unitPriceCents: '100000',
          isPublished: true,
          createdAt: '2026-08-09T00:00:00.000Z',
        },
      ])
    })

    it('dùng variant salePriceCents/priceCents khi có variant', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')
      vi.mocked(wishlistRepository.listByUser).mockResolvedValue([
        {
          id: 'item-1',
          productId: 'product-1',
          variantId: 'variant-1',
          createdAt: new Date('2026-08-09T00:00:00Z'),
          product: {
            slug: 'san-pham-1',
            name: 'Sản phẩm 1',
            priceCents: 100000n,
            salePriceCents: null,
            isPublished: true,
            deletedAt: null,
            media: [],
          },
          variant: {
            name: 'Bản 1 tháng',
            priceCents: 50000n,
            salePriceCents: 40000n,
            isActive: true,
          },
        },
      ] as never)

      const result = await wishlistService.listWishlist('user-1')

      expect(result[0]?.unitPriceCents).toBe('40000')
      expect(result[0]?.variantName).toBe('Bản 1 tháng')
      expect(result[0]?.productImage).toBeNull()
    })

    it('isPublished = false nếu product đã ngừng bán hoặc variant inactive', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')
      vi.mocked(wishlistRepository.listByUser).mockResolvedValue([
        {
          id: 'item-1',
          productId: 'product-1',
          variantId: 'variant-1',
          createdAt: new Date('2026-08-09T00:00:00Z'),
          product: {
            slug: 'san-pham-1',
            name: 'Sản phẩm 1',
            priceCents: 100000n,
            salePriceCents: null,
            isPublished: true,
            deletedAt: null,
            media: [],
          },
          variant: {
            name: 'Bản 1 tháng',
            priceCents: 50000n,
            salePriceCents: null,
            isActive: false,
          },
        },
      ] as never)

      const result = await wishlistService.listWishlist('user-1')

      expect(result[0]?.isPublished).toBe(false)
    })
  })

  describe('removeByProduct', () => {
    it('gọi repository.deleteByUserAndProduct với variantId đúng', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')

      await wishlistService.removeByProduct('user-1', 'product-1', 'variant-1')

      expect(wishlistRepository.deleteByUserAndProduct).toHaveBeenCalledWith(
        'user-1',
        'product-1',
        'variant-1'
      )
    })

    it('mặc định variantId là null nếu không truyền', async () => {
      const { wishlistRepository } = await import('@/modules/wishlist/repository')

      await wishlistService.removeByProduct('user-1', 'product-1')

      expect(wishlistRepository.deleteByUserAndProduct).toHaveBeenCalledWith(
        'user-1',
        'product-1',
        null
      )
    })
  })
})
