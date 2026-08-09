import { db } from '@/lib/db'
import { NotFoundError, ConflictError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { productRepository, categoryRepository } from './repository'
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  listProductsSchema,
} from './validators'
import type { z } from 'zod'

type CreateProductInput = z.infer<typeof createProductSchema>
type UpdateProductInput = z.infer<typeof updateProductSchema>
type CreateCategoryInput = z.infer<typeof createCategorySchema>
type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
type ListProductsInput = z.infer<typeof listProductsSchema>

export const catalogService = {
  // ===== Public =====
  async listPublishedProducts(input: ListProductsInput) {
    return productRepository.listPublished(input)
  },

  async getProductDetail(slug: string) {
    const product = await productRepository.findPublishedBySlug(slug)
    if (!product) throw new NotFoundError('Sản phẩm không tồn tại')
    // Tăng view (fire-and-forget)
    db.product
      .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
      .catch((err) => logger.warn({ err, productId: product.id }, 'view increment failed'))
    const related = await productRepository.getRelated(product.id, product.categoryId)
    return { product, related }
  },

  async listActiveCategories() {
    return categoryRepository.listActiveTree()
  },

  async getCategoryBySlug(slug: string) {
    const category = await categoryRepository.findActiveBySlug(slug)
    if (!category) throw new NotFoundError('Danh mục không tồn tại')
    return category
  },

  /**
   * Cross-sell "Khách cũng mua" — Phase 9 D2.
   * Query: cùng category + giá trong khoảng ±30% so với sản phẩm hiện tại,
   * ưu tiên sản phẩm được xem nhiều (viewCount desc) như proxy cho "bán tốt"
   * (chưa có bảng order-analytics riêng ở Phase 9).
   */
  async getCrossSellProducts(slug: string, limit = 6) {
    const product = await productRepository.findPublishedBySlug(slug)
    if (!product) throw new NotFoundError('Sản phẩm không tồn tại')
    return productRepository.getCrossSell(product.id, product.categoryId, product.priceCents, limit)
  },

  // ===== Admin =====
  async createProduct(input: CreateProductInput, actorId: string, ip?: string) {
    // Slug uniqueness check
    const existingSlug = await db.product.findUnique({
      where: { slug: input.slug },
    })
    if (existingSlug) {
      throw new ConflictError(`Slug "${input.slug}" đã tồn tại`)
    }
    const existingSku = await db.product.findUnique({
      where: { sku: input.sku },
    })
    if (existingSku) {
      throw new ConflictError(`SKU "${input.sku}" đã tồn tại`)
    }

    const created = await productRepository.create({
      category: { connect: { id: input.categoryId } },
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      shortDescription: input.shortDescription,
      description: input.description,
      priceCents: input.priceCents,
      salePriceCents: input.salePriceCents ?? null,
      currency: input.currency,
      deliveryStrategy: input.deliveryStrategy,
      stockStatus: input.stockStatus,
      trackInventory: input.trackInventory,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      ...(input.variants && input.variants.length > 0
        ? {
            variants: {
              create: input.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                priceCents: v.priceCents,
                salePriceCents: v.salePriceCents ?? null,
                durationDays: v.durationDays ?? null,
                position: v.position,
                isActive: v.isActive,
              })),
            },
          }
        : {}),
    })

    await this.writeAudit(actorId, 'product.create', 'Product', created.id, input, ip)
    return created
  },

  async updateProduct(id: string, input: UpdateProductInput, actorId: string, ip?: string) {
    const existing = await productRepository.findByIdForAdmin(id)
    if (!existing) throw new NotFoundError('Sản phẩm không tồn tại')

    // Slug/SKU conflict check
    if (input.slug && input.slug !== existing.slug) {
      const conflict = await db.product.findUnique({ where: { slug: input.slug } })
      if (conflict) throw new ConflictError(`Slug "${input.slug}" đã tồn tại`)
    }
    if (input.sku && input.sku !== existing.sku) {
      const conflict = await db.product.findUnique({ where: { sku: input.sku } })
      if (conflict) throw new ConflictError(`SKU "${input.sku}" đã tồn tại`)
    }

    // Build update payload dynamically
    const updateData: Record<string, unknown> = {}
    if (input.categoryId !== undefined) updateData.category = { connect: { id: input.categoryId } }
    if (input.name !== undefined) updateData.name = input.name
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.sku !== undefined) updateData.sku = input.sku
    if (input.shortDescription !== undefined) updateData.shortDescription = input.shortDescription
    if (input.description !== undefined) updateData.description = input.description
    if (input.priceCents !== undefined) updateData.priceCents = input.priceCents
    if (input.salePriceCents !== undefined) updateData.salePriceCents = input.salePriceCents
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.deliveryStrategy !== undefined) updateData.deliveryStrategy = input.deliveryStrategy
    if (input.stockStatus !== undefined) updateData.stockStatus = input.stockStatus
    if (input.trackInventory !== undefined) updateData.trackInventory = input.trackInventory
    if (input.isPublished !== undefined) updateData.isPublished = input.isPublished
    if (input.isFeatured !== undefined) updateData.isFeatured = input.isFeatured
    if (input.seoTitle !== undefined) updateData.seoTitle = input.seoTitle
    if (input.seoDescription !== undefined) updateData.seoDescription = input.seoDescription

    if (input.variants && input.variants.length > 0) {
      // Wipe and recreate variants trong transaction
      const variantsData = input.variants
      const updated = await db.$transaction(async (tx) => {
        await tx.productVariant.deleteMany({ where: { productId: id } })
        return tx.product.update({
          where: { id },
          data: {
            ...updateData,
            variants: {
              create: variantsData.map((v) => ({
                name: v.name,
                sku: v.sku,
                priceCents: v.priceCents,
                salePriceCents: v.salePriceCents ?? null,
                durationDays: v.durationDays ?? null,
                position: v.position,
                isActive: v.isActive,
              })),
            },
          },
          include: { variants: true, media: true },
        })
      })
      await this.writeAudit(actorId, 'product.update', 'Product', id, input, ip)
      return updated
    }

    const updated = await productRepository.update(id, updateData as never)
    await this.writeAudit(actorId, 'product.update', 'Product', id, input, ip)
    return updated
  },

  async deleteProduct(id: string, actorId: string, ip?: string) {
    const existing = await productRepository.findByIdForAdmin(id)
    if (!existing) throw new NotFoundError('Sản phẩm không tồn tại')
    await productRepository.softDelete(id)
    await this.writeAudit(
      actorId,
      'product.delete',
      'Product',
      id,
      { name: existing.name },
      ip
    )
    return { ok: true }
  },

  async listProductsForAdmin(input: ListProductsInput) {
    return productRepository.listAllForAdmin(input)
  },

  async getProductForAdmin(id: string) {
    const product = await productRepository.findByIdForAdmin(id)
    if (!product) throw new NotFoundError('Sản phẩm không tồn tại')
    return product
  },

  // ===== Categories admin =====
  async createCategory(input: CreateCategoryInput, actorId: string, ip?: string) {
    const existing = await db.category.findUnique({ where: { slug: input.slug } })
    if (existing) throw new ConflictError(`Slug "${input.slug}" đã tồn tại`)

    const created = await categoryRepository.create({
      ...(input.parentId ? { parent: { connect: { id: input.parentId } } } : {}),
      slug: input.slug,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      position: input.position,
      isActive: input.isActive,
    })
    await this.writeAudit(actorId, 'category.create', 'Category', created.id, input, ip)
    return created
  },

  async updateCategory(id: string, input: UpdateCategoryInput, actorId: string, ip?: string) {
    const existing = await categoryRepository.findByIdForAdmin(id)
    if (!existing) throw new NotFoundError('Danh mục không tồn tại')

    if (input.slug && input.slug !== existing.slug) {
      const conflict = await db.category.findUnique({ where: { slug: input.slug } })
      if (conflict) throw new ConflictError(`Slug "${input.slug}" đã tồn tại`)
    }

    const updated = await categoryRepository.update(id, input)
    await this.writeAudit(actorId, 'category.update', 'Category', id, input, ip)
    return updated
  },

  async deleteCategory(id: string, actorId: string, ip?: string) {
    await categoryRepository.delete(id)
    await this.writeAudit(actorId, 'category.delete', 'Category', id, {}, ip)
    return { ok: true }
  },

  async listCategoriesForAdmin() {
    return categoryRepository.listAllForAdmin()
  },

  // ===== Audit helper =====
  async writeAudit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    payload: unknown,
    ip?: string
  ) {
    try {
      await db.auditLog.create({
        data: {
          actorId,
          actorType: 'admin',
          action,
          resourceType,
          resourceId,
          ipAddress: ip,
          payload: payload as never,
        },
      })
    } catch (err) {
      logger.error({ err, action, resourceId }, 'audit log write failed')
    }
  },
}
