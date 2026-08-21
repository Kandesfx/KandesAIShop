import { z } from 'zod'

/**
 * Validators cho catalog module (public + admin).
 *
 * Theo quy tắc MASTER_SPEC §4.5:
 *   - Validate tại ranh giới (route handler)
 *   - Service trust internal calls
 */

export const productSortEnum = z.enum([
  'newest',
  'price-asc',
  'price-desc',
  'popular',
  'rating',
])

export const listProductsSchema = z.object({
  category: z.string().optional(),
  q: z.string().max(120).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: productSortEnum.default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  featured: z.coerce.boolean().optional(),
  includeUnpublished: z.coerce.boolean().optional(),
})

export const productSlugSchema = z.object({
  slug: z.string().min(1).max(200),
})

export const categorySlugSchema = z.object({
  slug: z.string().min(1).max(120),
})

// ====== Admin ======

const bigintFromNumber = z.union([z.number(), z.string()]).transform((v) => BigInt(v))

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số, dấu gạch ngang'),
  sku: z.string().min(2).max(80),
  shortDescription: z.string().max(280).optional(),
  description: z.string().max(20000).optional(),
  priceCents: bigintFromNumber.refine((v) => v >= 0n, 'Giá phải >= 0'),
  salePriceCents: bigintFromNumber.optional(),
  currency: z.string().length(3).default('VND'),
  deliveryStrategy: z.enum([
    'INSTANT_AUTO',
    'MANUAL_KEY',
    'MANUAL_MESSAGE',
    'FILE_DOWNLOAD',
    'TOPUP',
    'EXTERNAL_INVITE',
  ]),
  stockStatus: z.enum(['in_stock', 'out_of_stock', 'preorder']).default('in_stock'),
  trackInventory: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().max(80).optional(),
  seoDescription: z.string().max(200).optional(),
  media: z
    .array(
      z.object({
        url: z.string().min(1),
        altText: z.string().optional(),
        type: z.enum(['image', 'video', 'file']).default('image'),
        position: z.number().int().min(0).default(0),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        sku: z.string().min(2).max(80),
        priceCents: bigintFromNumber,
        salePriceCents: bigintFromNumber.optional(),
        durationDays: z.number().int().positive().optional(),
        position: z.number().int().min(0).default(0),
        isActive: z.boolean().default(true),
      })
    )
    .default([]),
})

export const updateProductSchema = createProductSchema.partial().extend({
  categoryId: z.string().uuid().optional(),
})

export const productIdSchema = z.object({
  id: z.string().uuid(),
})

export const createCategorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().max(80).optional(),
  seoDescription: z.string().max(200).optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryIdSchema = z.object({
  id: z.string().uuid(),
})
