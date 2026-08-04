import { describe, it, expect } from 'vitest'
import { resolveModelAlias, listAliases, getAliasEntry, MODEL_ALIASES } from './models'

describe('model aliases', () => {
  it('listAliases returns 4 entries', () => {
    expect(listAliases()).toHaveLength(4)
  })

  it('every alias has unique alias and starts with kandes-', () => {
    const aliases = listAliases().map((a) => a.alias)
    expect(new Set(aliases).size).toBe(aliases.length)
    for (const a of aliases) expect(a).toMatch(/^kandes-/)
  })

  it('resolveModelAlias — known alias returns upstream', () => {
    expect(resolveModelAlias('kandes-gpt-4o').upstream).toBe('gpt-4o')
    expect(resolveModelAlias('kandes-claude-sonnet-4.5').upstream).toBe('claude-sonnet-4.5')
  })

  it('resolveModelAlias — unknown alias pass-through', () => {
    const result = resolveModelAlias('custom-model')
    expect(result.upstream).toBe('custom-model')
    expect(result.alias).toBe('custom-model')
  })

  it('getAliasEntry — by alias', () => {
    expect(getAliasEntry('kandes-gpt-4o')?.family).toBe('gpt-4o')
    expect(getAliasEntry('not-registered')).toBeUndefined()
  })

  it('hard-coded map (D49) — kandes-gpt-4o MUST map to gpt-4o', () => {
    const entry = MODEL_ALIASES.find((a) => a.alias === 'kandes-gpt-4o')
    expect(entry).toBeDefined()
    expect(entry?.upstream).toBe('gpt-4o')
  })
})