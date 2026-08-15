/**
 * Model alias map — Phase 7-RB (D54) + Dynamic Models.
 *
 * Public alias `kandes-*` → upstream model trên CC Pro.
 * Các alias này là MẶC ĐỊNH — KH có thể dùng raw model name bất kỳ.
 *
 * KHÔNG lưu DB Setting Phase 7 — admin không cần edit model map.
 * KHÔNG lộ upstream cho KH — chỉ alias `kandes-*`.
 *
 * Behavior: KH gửi raw model name (vd `claude-opus-4.8`)
 * → vẫn forward as-is, family auto-resolve theo prefix heuristic.
 */

import type { ModelAliasEntry } from './types'

export const MODEL_ALIASES: readonly ModelAliasEntry[] = [
  // Codex (GPT) models
  { alias: 'kandes-codex', upstream: 'gpt-5.4', family: 'gpt-codex' },
  { alias: 'kandes-codex-fast', upstream: 'gpt-5.4-mini', family: 'gpt-codex-mini' },
  { alias: 'kandes-codex-review', upstream: 'codex-auto-review', family: 'gpt-codex' },
  { alias: 'kandes-gpt-pro', upstream: 'gpt-5.5', family: 'gpt-pro' },
  // Claude models - verified 2026-08-12 với NCC Pro
  { alias: 'kandes-claude', upstream: 'claude-sonnet-4-6', family: 'claude-sonnet' },
  { alias: 'kandes-claude-pro', upstream: 'claude-sonnet-5', family: 'claude-sonnet-pro' },
  { alias: 'kandes-claude-opus', upstream: 'claude-opus-4-6', family: 'claude-opus' },
  { alias: 'kandes-claude-opus-latest', upstream: 'claude-opus-5', family: 'claude-opus' },
  { alias: 'kandes-claude-haiku', upstream: 'claude-haiku-4-5', family: 'claude-haiku' },
]

const ALIAS_MAP: Map<string, ModelAliasEntry> = new Map(
  MODEL_ALIASES.map((e) => [e.alias, e])
)

/**
 * Resolve public alias → upstream model name + family.
 *
 * Pass-through: KH gửi raw `gpt-5.4` / `claude-sonnet-4.6` (Codex CLI/Claude Code
 * đã config upstream name) → vẫn forward, family auto-resolve theo prefix heuristic.
 */
export function resolveModelAlias(model: string): ModelAliasEntry {
  const entry = ALIAS_MAP.get(model)
  if (entry) return entry
  // Map official Anthropic model names (e.g. from Claude Code CLI) to NCC upstream names
  let upstream = model
  const mLow = model.toLowerCase()
  if (mLow.includes('claude-3-5-sonnet')) upstream = 'claude-sonnet-5'
  else if (mLow.includes('claude-3-5-haiku')) upstream = 'claude-haiku-4-5'
  else if (mLow.includes('claude-3-opus')) upstream = 'claude-opus-5'

  // Pass-through heuristic — KH gửi raw upstream name.
  return {
    alias: model,
    upstream,
    family: inferFamily(upstream),
  }
}

/**
 * Heuristic family detection khi KH gửi raw upstream model name
 * (vd `gpt-5.4`, `claude-opus-4.8`). Dựa trên prefix match.
 */
function inferFamily(model: string): ModelAliasEntry['family'] {
  const m = model.toLowerCase()
  if (m.startsWith('codex-')) return 'gpt-codex'
  if (m.startsWith('gpt-5.4-mini') || m.startsWith('gpt-4.1-mini')) return 'gpt-codex-mini'
  if (m.startsWith('gpt-5') || m.startsWith('gpt-4')) return 'gpt-codex'
  // Claude models
  if (m.includes('opus')) return 'claude-opus'
  if (m.includes('haiku')) return 'claude-haiku'
  // Sonnet pro = sonnet-5 or sonnet-4-7+
  if (m.includes('sonnet-5') || m.match(/sonnet-4-[789]/)) return 'claude-sonnet-pro'
  if (m.includes('sonnet')) return 'claude-sonnet'
  return 'gpt-codex' // fallback an toàn — family mặc định cho cost estimate.
}

/** Lấy 1 entry theo alias (cho UI listing). */
export function getAliasEntry(alias: string): ModelAliasEntry | undefined {
  return ALIAS_MAP.get(alias)
}

/** List tất cả aliases (cho `/api/ai/v1/models`). */
export function listAliases(): readonly ModelAliasEntry[] {
  return MODEL_ALIASES
}