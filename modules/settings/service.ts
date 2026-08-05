import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { SettingCategoryKey, CategoryView } from './types'
import { SETTINGS_REGISTRY, getCategoryDef, listCategoryKeys } from './registry'

/**
 * Settings service — P4-06.
 *
 * Quản lý Setting table (key/value Json/category). Runtime config vẫn đọc từ
 * env (D30); Setting table chỉ serve admin UI + audit log.
 *
 * Quy ước:
 *   - KHÔNG log raw sensitive value (mask trước khi log).
 *   - Service KHÔNG validate (trust internal callers; route đã parseInput).
 *   - write batch trong 1 transaction để atomic.
 */

type JsonScalar = string | number | boolean | null
type JsonValue = JsonScalar | JsonObject | JsonArray
interface JsonObject {
  [k: string]: JsonValue
}
type JsonArray = JsonValue[]

function maskValue(value: JsonValue, sensitive: boolean): JsonValue {
  if (!sensitive) return value
  if (typeof value === 'string' && value.length > 0) return '••••••••'
  return value
}

/**
 * Lấy toàn bộ setting rows trong DB, group theo category.
 * Output không chứa field defs — chỉ data, để response nhỏ.
 */
async function loadStoredRows(): Promise<Map<string, Map<string, JsonValue>>> {
  const rows = await db.setting.findMany({
    select: { key: true, value: true, category: true },
  })
  const grouped = new Map<string, Map<string, JsonValue>>()
  for (const r of rows) {
    let bucket = grouped.get(r.category)
    if (!bucket) {
      bucket = new Map()
      grouped.set(r.category, bucket)
    }
    bucket.set(r.key, r.value as JsonValue)
  }
  return grouped
}

/**
 * GET /api/admin/settings — trả toàn bộ categories kèm fields.
 * Sensitive values được mask trước khi trả ra ngoài.
 */
export async function getAllCategories(): Promise<CategoryView[]> {
  const stored = await loadStoredRows()

  return SETTINGS_REGISTRY.map<CategoryView>((cat) => {
    const bucket = stored.get(cat.key) ?? new Map<string, JsonValue>()
    const values: Record<string, JsonValue> = {}
    for (const f of cat.fields) {
      const raw = bucket.has(f.key) ? bucket.get(f.key)! : (f.defaultValue ?? null)
      values[f.key] = maskValue(raw, !!f.sensitive)
    }
    return {
      category: cat.key,
      label: cat.label,
      description: cat.description,
      values,
      fields: cat.fields,
    }
  })
}

/**
 * GET /api/admin/settings/[category] — trả 1 category.
 */
export async function getCategory(category: string): Promise<CategoryView> {
  const def = getCategoryDef(category)
  if (!def) {
    throw new NotFoundError(`Category không tồn tại: ${category}`)
  }
  const rows = await db.setting.findMany({
    where: { category },
    select: { key: true, value: true },
  })
  const stored = new Map<string, JsonValue>(
    rows.map((r) => [r.key, r.value as JsonValue])
  )
  const values: Record<string, JsonValue> = {}
  for (const f of def.fields) {
    const storedVal = stored.get(f.key)
    const raw = storedVal !== undefined ? storedVal : ((f.defaultValue ?? null) as JsonValue)
    values[f.key] = maskValue(raw, !!f.sensitive)
  }
  return {
    category: def.key,
    label: def.label,
    description: def.description,
    values,
    fields: def.fields,
  }
}

/**
 * PUT /api/admin/settings/[category] — cập nhật values.
 * Service nhận values đã validate từ route; chỉ lo write + audit.
 *
 * Sensitive fields: nếu value rỗng → giữ nguyên giá trị cũ trong DB.
 */
export async function updateCategory(
  category: string,
  values: Record<string, JsonValue>,
  actor: { id: string }
): Promise<{ updated: number; skipped: number }> {
  const def = getCategoryDef(category)
  if (!def) {
    throw new NotFoundError(`Category không tồn tại: ${category}`)
  }

  const now = new Date()
  let updated = 0
  let skipped = 0

  // Sensitive keys mà caller gửi empty string → skip (giữ nguyên).
  const toWrite: { key: string; value: JsonValue }[] = []
  for (const field of def.fields) {
    if (!(field.key in values)) continue
    const incoming = values[field.key]
    if (incoming === undefined) {
      // Caller không gửi key này → skip silently.
      continue
    }
    if (field.sensitive && (incoming === '' || incoming === null)) {
      // Sensitive field với empty/null → giữ nguyên giá trị cũ.
      skipped += 1
      continue
    }
    toWrite.push({ key: field.key, value: incoming as JsonValue })
  }

  if (toWrite.length === 0) {
    return { updated: 0, skipped }
  }

  // Batch transaction: tránh partial write nếu 1 row fail.
  await db.$transaction(
    toWrite.map((row) =>
      db.setting.upsert({
        where: { key: row.key },
        create: {
          key: row.key,
          value: row.value as never,
          category: def.key,
          updatedBy: actor.id,
        },
        update: {
          value: row.value as never,
          updatedBy: actor.id,
          updatedAt: now,
        },
      })
    )
  )

  updated = toWrite.length

  // Audit: chỉ log non-sensitive keys raw; sensitive → chỉ log tên key.
  const safeKeys = toWrite.map((r) => r.key).filter((k) => {
    const f = def.fields.find((x) => x.key === k)
    return !f?.sensitive
  })

  await db.auditLog.create({
    data: {
      actorId: actor.id,
      actorType: 'admin',
      action: 'settings.update',
      resourceType: 'setting',
      resourceId: def.key,
      payload: {
        category: def.key,
        keys: toWrite.map((r) => r.key),
        safeKeys,
        skipped,
      } as never,
    },
  })

  logger.info(
    {
      category: def.key,
      actorId: actor.id,
      updatedKeys: toWrite.map((r) => r.key),
      skipped,
    },
    'Settings updated'
  )

  return { updated, skipped }
}

/**
 * Seed defaults — insert tất cả fields nếu chưa tồn tại.
 * Idempotent: KHÔNG overwrite existing values.
 */
export async function seedDefaults(): Promise<{
  inserted: number
  skipped: number
  byCategory: Record<string, number>
}> {
  const existing = await db.setting.findMany({ select: { key: true } })
  const existingKeys = new Set(existing.map((r) => r.key))

  const byCategory: Record<string, number> = {}
  let inserted = 0
  let skipped = 0
  const toCreate: {
    key: string
    value: JsonValue
    category: string
    description?: string
  }[] = []

  for (const cat of SETTINGS_REGISTRY) {
    for (const f of cat.fields) {
      if (existingKeys.has(f.key)) {
        skipped += 1
        continue
      }
      toCreate.push({
        key: f.key,
        value: (f.defaultValue ?? null) as JsonValue,
        category: cat.key,
        description: f.description ?? undefined,
      })
      byCategory[cat.key] = (byCategory[cat.key] ?? 0) + 1
    }
  }

  if (toCreate.length > 0) {
    await db.$transaction(
      toCreate.map((row) =>
        db.setting.create({
          data: {
            key: row.key,
            value: row.value as never,
            category: row.category,
            description: row.description,
          },
        })
      )
    )
    inserted = toCreate.length
  }

  return { inserted, skipped, byCategory }
}

/**
 * Test helper — dùng cho unit test, không gọi từ production code.
 */
export const __testing = {
  maskValue,
  listCategoryKeys,
}

export const settingsService = {
  getAllCategories,
  getCategory,
  updateCategory,
  seedDefaults,
}

export { getCategoryDef, listCategoryKeys } from './registry'
export type { SettingCategoryKey }
