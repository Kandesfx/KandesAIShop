import { describe, it, expect } from 'vitest'
import { resolveModelAlias, listAliases, getAliasEntry } from './models'

describe('models — alias resolution (Phase 7-RB D54)', () => {
  it('resolves all 9 kandes-* aliases', () => {
    const expected = [
      ['kandes-codex', 'gpt-5.4', 'gpt-codex'],
      ['kandes-codex-fast', 'gpt-5.4-mini', 'gpt-codex-mini'],
      ['kandes-codex-review', 'codex-auto-review', 'gpt-codex'],
      ['kandes-gpt-pro', 'gpt-5.5', 'gpt-pro'],
      ['kandes-claude', 'claude-sonnet-4-6', 'claude-sonnet'],
      ['kandes-claude-pro', 'claude-sonnet-5', 'claude-sonnet-pro'],
      ['kandes-claude-opus', 'claude-opus-4-6', 'claude-opus'],
      ['kandes-claude-opus-latest', 'claude-opus-5', 'claude-opus'],
      ['kandes-claude-haiku', 'claude-haiku-4-5', 'claude-haiku'],
    ] as const
    for (const [alias, upstream, family] of expected) {
      const entry = resolveModelAlias(alias)
      expect(entry.alias).toBe(alias)
      expect(entry.upstream).toBe(upstream)
      expect(entry.family).toBe(family)
    }
  })

  it('passes through raw upstream model names', () => {
    // Codex CLI / Claude Code KH gửi raw model name — KHÔNG ép alias.
    const gpt = resolveModelAlias('gpt-5.4')
    expect(gpt.upstream).toBe('gpt-5.4')
    expect(gpt.family).toBe('gpt-codex')

    const claude = resolveModelAlias('claude-sonnet-4-6')
    expect(claude.upstream).toBe('claude-sonnet-4-6')
    expect(claude.family).toBe('claude-sonnet')

    const opus = resolveModelAlias('claude-opus-5')
    expect(opus.upstream).toBe('claude-opus-5')
    expect(opus.family).toBe('claude-opus')
  })

  it('infers family via heuristic for unknown model names', () => {
    // Model mới KH / NCC thêm — không có alias, vẫn forward + infer family.
    expect(resolveModelAlias('gpt-5.6-sol').family).toBe('gpt-codex')
    expect(resolveModelAlias('gpt-5.6-luna').family).toBe('gpt-codex')
    expect(resolveModelAlias('claude-haiku-4-6-20260101').family).toBe('claude-haiku')
    expect(resolveModelAlias('claude-sonnet-5.1').family).toBe('claude-sonnet-pro')
  })

  it('listAliases returns 9 entries', () => {
    expect(listAliases()).toHaveLength(9)
  })

  it('getAliasEntry returns undefined for unknown alias', () => {
    expect(getAliasEntry('kandes-gpt-4o')).toBeUndefined() // deprecated alias
    expect(getAliasEntry('random-model')).toBeUndefined()
  })
})