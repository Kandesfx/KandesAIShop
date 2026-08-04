/**
 * Model alias map — Phase 6 P6-04 (D49).
 *
 * Hard-code 4 public alias → upstream model trên CC Pro.
 * KHÔNG lưu DB Setting Phase 6 — admin không cần edit model map.
 * KHÔNG lộ upstream cho KH — chỉ alias `kandes-*`.
 *
 * Phase 7+ có thể move vào DB nếu admin cần edit runtime.
 */

import type { ModelAliasEntry } from './types'

export const MODEL_ALIASES: readonly ModelAliasEntry[] = [
  { alias: 'kandes-gpt-4o', upstream: 'gpt-4o', family: 'gpt-4o' },
  {
    alias: 'kandes-claude-sonnet-4.5',
    upstream: 'claude-sonnet-4.5',
    family: 'claude-sonnet',
  },
  { alias: 'kandes-gemini-2.0-flash', upstream: 'gemini-2.0-flash', family: 'gemini-flash' },
  { alias: 'kandes-deepseek-v3', upstream: 'deepseek-v3', family: 'deepseek' },
]

const ALIAS_MAP: Map<string, ModelAliasEntry> = new Map(
  MODEL_ALIASES.map((e) => [e.alias, e])
)

/**
 * Resolve public alias → upstream model name.
 * Nếu KH gửi raw `gpt-4o` (không prefix) → vẫn forward as-is (KH đã biết upstream).
 * Phase 7 có thể reject nếu muốn strict alias-only.
 */
export function resolveModelAlias(model: string): ModelAliasEntry {
  const entry = ALIAS_MAP.get(model)
  if (entry) return entry
  // Pass-through: dùng nguyên model name, family = 'gpt-4o' fallback.
  return {
    alias: model,
    upstream: model,
    family: 'gpt-4o',
  }
}

/** Lấy 1 entry theo alias (cho UI listing). */
export function getAliasEntry(alias: string): ModelAliasEntry | undefined {
  return ALIAS_MAP.get(alias)
}

/** List tất cả aliases (cho `/api/ai/v1/models`). */
export function listAliases(): readonly ModelAliasEntry[] {
  return MODEL_ALIASES
}