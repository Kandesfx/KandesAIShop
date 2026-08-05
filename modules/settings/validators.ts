import { z } from 'zod'
import type { SettingFieldDef, SettingCategoryKey } from './types'
import { getCategoryDef, listCategoryKeys } from './registry'

/**
 * Settings validators — P4-06.
 *
 * Build Zod schema dynamically từ registry. Mỗi field type map sang 1 Zod rule:
 *   - text/textarea:    string().max(maxLength).optional() (allow empty)
 *   - email:            string().email().optional()
 *   - url:              string().url().or(empty).optional()
 *   - number:           coerce.number().int().min().max()
 *   - boolean:          coerce.boolean()
 *   - select:           enum(options)
 *   - multiselect:      array(enum(options))
 *   - password:         string().max(maxLength).optional() — allow empty để "không đổi"
 *
 * Service KHÔNG validate (trust internal call từ route đã parse).
 * Route boundary bắt buộc parseInput() trước khi gọi service.
 */

function fieldToZod(field: SettingFieldDef): z.ZodTypeAny {
  const base = (): z.ZodString => z.string()

  switch (field.type) {
    case 'text':
    case 'textarea': {
      let s = base()
      if (field.maxLength) s = s.max(field.maxLength)
      return field.required ? s.min(1) : s.optional()
    }
    case 'email':
      return z.string().email('Email không hợp lệ').optional()
    case 'url': {
      // Empty string OK (cho phép clear), non-empty phải là URL hợp lệ.
      const urlSchema = z.string().url('URL không hợp lệ')
      return z
        .union([urlSchema, z.literal('')])
        .optional()
    }
    case 'number': {
      let n = z.coerce.number().int('Phải là số nguyên')
      if (field.min !== undefined) n = n.min(field.min)
      if (field.max !== undefined) n = n.max(field.max)
      return n.optional()
    }
    case 'boolean':
      return z.coerce.boolean()
    case 'select':
      return z
        .enum((field.options ?? []) as [string, ...string[]])
        .optional()
    case 'multiselect':
      return z
        .array(z.enum((field.options ?? []) as [string, ...string[]]))
        .optional()
    case 'password': {
      // Cho phép empty (giữ nguyên giá trị cũ trong service layer).
      let s = base()
      if (field.maxLength) s = s.max(field.maxLength)
      return s.optional()
    }
  }
}

export function buildCategorySchema(categoryKey: SettingCategoryKey) {
  const def = getCategoryDef(categoryKey)
  if (!def) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['category'],
        message: `Category không tồn tại: ${categoryKey}`,
      },
    ])
  }
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of def.fields) {
    shape[f.key] = fieldToZod(f)
  }
  return z.object({
    values: z.record(z.string(), z.unknown()).refine(
      (v) => {
        // Chỉ chấp nhận keys thuộc category đó
        return Object.keys(v).every((k) => k in shape)
      },
      { message: 'Có key không thuộc category này' }
    ),
  })
}

const categoryEnum = z.enum(listCategoryKeys() as [SettingCategoryKey, ...SettingCategoryKey[]])

export const settingsCategoryParamSchema = z.object({
  category: categoryEnum,
})

export const testEmailSchema = z.object({
  to: z.string().email('Email không hợp lệ'),
  subject: z.string().max(200).optional(),
  content: z.string().max(5000).optional(),
})

export const testTelegramSchema = z.object({
  chatId: z.string().min(1).optional(),
  message: z.string().max(4096).optional(),
})

export const seedSettingsSchema = z.object({
  force: z.coerce.boolean().optional(),
})
