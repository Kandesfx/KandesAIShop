import type { Prisma } from '@prisma/client'

/**
 * Catalog repository — Data access layer.
 *
 * Service gọi repo, route gọi service.
 * Repo chỉ chứa raw Prisma queries, không có business logic.
 */

import { db } from '@/lib/db'
import type { listProductsSchema } from './validators'

type ListProductsInput = z.infer<typeof listProductsSchema>

import { z } from 'zod'

export type { Product } from './types'

export const productRepository = {
  /**
   * List products với filter + sort + pagination.
   * CHỈ trả về products đã published (public API).
   */
  async listPublished(input: ListProductsInput) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isPublished: true,
      ...(input.category && { category: { slug: input.category } }),
      ...(input.featured !== undefined && { isFeatured: input.featured }),
      ...(input.q && {
        OR: [
          { name: { contains: input.q, mode: 'insensitive' } },
          { shortDescription: { contains: input.q, mode: 'insensitive' } },
          { description: { contains: input.q, mode: 'insensitive' } },
          { sku: { contains: input.q, mode: 'insensitive' } },
        ],
      }),
      ...(input.minPrice !== undefined || input.maxPrice !== undefined
        ? {
            priceCents: {
              ...(input.minPrice !== undefined && { gte: BigInt(input.minPrice) }),
              ...(input.maxPrice !== undefined && { lte: BigInt(input.maxPrice) }),
            },
          }
        : {}),
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
      switch (input.sort) {
        case 'price-asc':
          return [{ priceCents: 'asc' }]
        case 'price-desc':
          return [{ priceCents: 'desc' }]
        case 'popular':
          return [{ viewCount: 'desc' }]
        case 'rating':
          return [{ avgRating: 'desc' }]
        case 'newest':
        default:
          return [{ createdAt: 'desc' }]
      }
    })()

    const [items, total] = await db.$transaction([
      db.product.findMany({
        where,
        orderBy,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          media: { orderBy: { position: 'asc' }, take: 1 },
          variants: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
          },
        },
      }),
      db.product.count({ where }),
    ])

    return {
      items: items.map((p) => ({
        ...p,
        avgRating: p.avgRating.toNumber(),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    }
  },

  async findPublishedBySlug(slug: string) {
    const product = await db.product.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      include: {
        category: true,
        media: { orderBy: { position: 'asc' } },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
        attributes: true,
        tags: { include: { tag: true } },
      },
    })
    
    if (!product) return null
    
    // Convert Decimal to number for avgRating (D10 — Phase 9 Đợt 1)
    return {
      ...product,
      avgRating: product.avgRating.toNumber(),
    }
  },

  /**
   * Cross-sell "Khách cũng mua" — Phase 9 D2.
   * Cùng category + giá trong khoảng ±30% giá sản phẩm hiện tại, sort theo viewCount desc.
   */
  async getCrossSell(productId: string, categoryId: string, priceCents: bigint, limit = 6) {
    const price = Number(priceCents)
    const minPrice = BigInt(Math.floor(price * 0.7))
    const maxPrice = BigInt(Math.ceil(price * 1.3))

    const products = await db.product.findMany({
      where: {
        id: { not: productId },
        categoryId,
        isPublished: true,
        deletedAt: null,
        priceCents: { gte: minPrice, lte: maxPrice },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      include: {
        media: { take: 1, orderBy: { position: 'asc' } },
        category: { select: { name: true, slug: true } },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    // Fallback: nếu không đủ sản phẩm trong khoảng giá, bổ sung thêm cùng category
    // (không filter giá) để tránh hiển thị carousel trống/quá ít item.
    if (products.length < limit) {
      const excludeIds = [productId, ...products.map((p) => p.id)]
      const fallback = await db.product.findMany({
        where: {
          id: { notIn: excludeIds },
          categoryId,
          isPublished: true,
          deletedAt: null,
        },
        orderBy: { viewCount: 'desc' },
        take: limit - products.length,
        include: {
          media: { take: 1, orderBy: { position: 'asc' } },
          category: { select: { name: true, slug: true } },
          variants: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
          },
        },
      })
      products.push(...fallback)
    }

    return products.map((p) => ({
      ...p,
      avgRating: p.avgRating.toNumber(),
    }))
  },

  async getRelated(productId: string, categoryId: string, limit = 4) {
    const products = await db.product.findMany({
      where: {
        id: { not: productId },
        categoryId,
        isPublished: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        media: { take: 1, orderBy: { position: 'asc' } },
        category: { select: { name: true, slug: true } },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          take: 1,
        },
      },
    })
    
    // Convert Decimal to number for avgRating
    return products.map((p) => ({
      ...p,
      avgRating: p.avgRating.toNumber(),
    }))
  },

  /** Admin — list all (kể cả draft) */
  async listAllForAdmin(input: ListProductsInput & { includeUnpublished?: boolean }) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(input.includeUnpublished ? {} : { isPublished: true }),
      ...(input.category && { category: { slug: input.category } }),
      ...(input.q && {
        OR: [
          { name: { contains: input.q, mode: 'insensitive' } },
          { sku: { contains: input.q, mode: 'insensitive' } },
        ],
      }),
    }

    const [items, total] = await db.$transaction([
      db.product.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { variants: true } },
        },
      }),
      db.product.count({ where }),
    ])

    return {
      items: items.map((p) => ({
        ...p,
        avgRating: p.avgRating.toNumber(),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    }
  },

  async findByIdForAdmin(id: string) {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        media: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
        attributes: true,
        tags: { include: { tag: true } },
      },
    })
    
    if (!product) return null
    
    return {
      ...product,
      avgRating: product.avgRating.toNumber(),
    }
  },

  async create(data: Prisma.ProductCreateInput) {
    const product = await db.product.create({
      data,
      include: {
        variants: true,
        media: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    })
    
    return {
      ...product,
      avgRating: product.avgRating.toNumber(),
    }
  },

  async update(id: string, data: Prisma.ProductUpdateInput) {
    const product = await db.product.update({
      where: { id },
      data,
      include: {
        variants: { orderBy: { position: 'asc' } },
        media: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
      },
    })
    
    return {
      ...product,
      avgRating: product.avgRating.toNumber(),
    }
  },

  async softDelete(id: string) {
    return db.product.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    })
  },
}

export const categoryRepository = {
  async listActiveTree() {
    const all = await db.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: { where: { isPublished: true, deletedAt: null } } } },
      },
    })
    return all
  },

  async findActiveBySlug(slug: string) {
    const category = await db.category.findFirst({
      where: { slug, isActive: true },
      include: {
        products: {
          where: { isPublished: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            media: { take: 1, orderBy: { position: 'asc' } },
            variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
          },
        },
      },
    })
    
    if (!category) return null
    
    return {
      ...category,
      products: category.products.map((p) => ({
        ...p,
        avgRating: p.avgRating.toNumber(),
      })),
    }
  },

  async listAllForAdmin() {
    return db.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true, children: true } },
      },
    })
  },

  async findByIdForAdmin(id: string) {
    return db.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    })
  },

  async create(data: Prisma.CategoryCreateInput) {
    return db.category.create({ data })
  },

  async update(id: string, data: Prisma.CategoryUpdateInput) {
    return db.category.update({ where: { id }, data })
  },

  async delete(id: string) {
    // NoAction parent reference — phải delete children trước nếu có
    const childCount = await db.category.count({ where: { parentId: id } })
    if (childCount > 0) {
      throw new Error('Không thể xoá danh mục còn danh mục con')
    }
    const productCount = await db.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      throw new Error(`Không thể xoá danh mục còn ${productCount} sản phẩm`)
    }
    return db.category.delete({ where: { id } })
  },
}
