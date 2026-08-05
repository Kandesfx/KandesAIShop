import type { Prisma } from '@prisma/client'

/**
 * Settings types — P4-06.
 *
 * Shape definitions for the 5 setting categories exposed in admin UI.
 * Runtime config vẫn đọc từ env (lib/env.ts, frozen tại startup) — table
 * Setting chỉ phục vụ display + future audit.
 */

export type SettingFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'password'

export type SettingCategoryKey = 'general' | 'payment' | 'email' | 'notifications' | 'sla'

export interface SettingFieldDef {
  /** Unique key lưu DB, vd 'shop.name' */
  key: string
  /** Label tiếng Việt hiển thị form */
  label: string
  /** Mô tả ngắn (placeholder hoặc help text) */
  description?: string
  /** Loại input render trong UI */
  type: SettingFieldType
  /** Cho type=select/multiselect */
  options?: string[]
  /** Required validation (chỉ áp dụng khi có giá trị) */
  required?: boolean
  /** Giá trị min/max cho type=number */
  min?: number
  max?: number
  /** Max length cho text/textarea */
  maxLength?: number
  /** Field chứa secret — mask trong UI, KHÔNG log raw value */
  sensitive?: boolean
  /** Sub-group trong UI (vd 'shop', 'seo') */
  group?: string
  /** Env var tương ứng — read-only display hint */
  envVar?: string
  /** Default value khi field chưa có trong DB */
  defaultValue?: string | number | boolean | string[] | null
}

export interface SettingCategoryDef {
  key: SettingCategoryKey
  label: string
  description: string
  fields: SettingFieldDef[]
}

export interface CategoryView {
  category: SettingCategoryKey
  label: string
  description: string
  values: Record<string, Prisma.JsonValue>
  fields: SettingFieldDef[]
}
