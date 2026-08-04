import { describe, it, expect } from 'vitest'
import {
  chatCompletionRequestSchema,
  listNccKeysSchema,
  addNccKeySchema,
  updateNccKeySchema,
  createApiKeySchema,
  usageQuerySchema,
} from './validators'

describe('ai-gateway validators', () => {
  describe('chatCompletionRequestSchema', () => {
    it('accepts minimal valid request', () => {
      const r = chatCompletionRequestSchema.safeParse({
        model: 'kandes-gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
      })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.stream).toBe(false)
    })

    it('rejects empty messages', () => {
      const r = chatCompletionRequestSchema.safeParse({
        model: 'kandes-gpt-4o',
        messages: [],
      })
      expect(r.success).toBe(false)
    })

    it('rejects empty model', () => {
      const r = chatCompletionRequestSchema.safeParse({
        model: '',
        messages: [{ role: 'user', content: 'hi' }],
      })
      expect(r.success).toBe(false)
    })

    it('rejects temperature > 2', () => {
      const r = chatCompletionRequestSchema.safeParse({
        model: 'kandes-gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 3,
      })
      expect(r.success).toBe(false)
    })
  })

  describe('listNccKeysSchema', () => {
    it('default page=1 pageSize=20', () => {
      const r = listNccKeysSchema.safeParse({})
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.page).toBe(1)
        expect(r.data.pageSize).toBe(20)
      }
    })

    it('coerces strings to numbers', () => {
      const r = listNccKeysSchema.safeParse({ page: '5', pageSize: '50' })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.page).toBe(5)
        expect(r.data.pageSize).toBe(50)
      }
    })
  })

  describe('addNccKeySchema', () => {
    it('accepts valid input', () => {
      const r = addNccKeySchema.safeParse({
        provider: 'ccpro',
        apiKey: 'sk-test-1234567890',
        totalQuotaUsd: 10,
      })
      expect(r.success).toBe(true)
    })

    it('rejects negative quotaUsd', () => {
      const r = addNccKeySchema.safeParse({
        provider: 'ccpro',
        apiKey: 'sk-test-1234567890',
        totalQuotaUsd: -5,
      })
      expect(r.success).toBe(false)
    })

    it('rejects invalid provider', () => {
      const r = addNccKeySchema.safeParse({
        provider: 'unknown-provider',
        apiKey: 'sk-test-1234567890',
        totalQuotaUsd: 10,
      })
      expect(r.success).toBe(false)
    })
  })

  describe('createApiKeySchema', () => {
    it('accepts minimal valid', () => {
      const r = createApiKeySchema.safeParse({ name: 'My key' })
      expect(r.success).toBe(true)
    })

    it('rejects empty name', () => {
      const r = createApiKeySchema.safeParse({ name: '' })
      expect(r.success).toBe(false)
    })
  })

  describe('usageQuerySchema', () => {
    it('accepts empty (defaults)', () => {
      const r = usageQuerySchema.safeParse({})
      expect(r.success).toBe(true)
    })

    it('accepts valid range + groupBy=model', () => {
      const r = usageQuerySchema.safeParse({
        from: '2026-01-01T00:00:00Z',
        to: '2026-12-31T23:59:59Z',
        groupBy: 'model',
      })
      expect(r.success).toBe(true)
    })
  })

  describe('updateNccKeySchema', () => {
    it('accepts partial updates', () => {
      const r = updateNccKeySchema.safeParse({ status: 'active' })
      expect(r.success).toBe(true)
    })
  })
})