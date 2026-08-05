import { describe, it, expect } from 'vitest'
import {
  sepayWebhookSchema,
  PAYMENT_REFERENCE_PATTERN,
} from '@/modules/payment/validators'

describe('payment validators', () => {
  describe('sepayWebhookSchema', () => {
    it('OK với payload đầy đủ', () => {
      const payload = {
        id: 123456,
        gateway: 'Vietcombank',
        transactionDate: '2026-08-04T10:00:00Z',
        accountNumber: '9999888877',
        code: null,
        content: 'KDS 0001 thanh toan',
        transferAmount: 100000,
        accumulated: 500000,
        subAccount: null,
        referenceCode: 'VCB-123',
        description: null,
      }
      expect(sepayWebhookSchema.safeParse(payload).success).toBe(true)
    })

    it('OK với payload tối thiểu (optional absent)', () => {
      const payload = {
        id: 1,
        gateway: 'VCB',
        transactionDate: '2026-08-04T10:00:00Z',
        accountNumber: '1234',
        content: 'KDS 0001',
        transferAmount: 100,
      }
      expect(sepayWebhookSchema.safeParse(payload).success).toBe(true)
    })

    it('reject id = 0 (phải positive)', () => {
      expect(
        sepayWebhookSchema.safeParse({
          id: 0,
          gateway: 'VCB',
          transactionDate: '2026-08-04',
          accountNumber: '1',
          content: 'x',
          transferAmount: 1,
        }).success
      ).toBe(false)
    })

    it('reject transferAmount âm', () => {
      expect(
        sepayWebhookSchema.safeParse({
          id: 1,
          gateway: 'VCB',
          transactionDate: '2026-08-04',
          accountNumber: '1',
          content: 'x',
          transferAmount: -1,
        }).success
      ).toBe(false)
    })

    it('reject content quá dài (> 512)', () => {
      expect(
        sepayWebhookSchema.safeParse({
          id: 1,
          gateway: 'VCB',
          transactionDate: '2026-08-04',
          accountNumber: '1',
          content: 'a'.repeat(513),
          transferAmount: 1,
        }).success
      ).toBe(false)
    })

    it('reject thiếu required field', () => {
      expect(sepayWebhookSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('PAYMENT_REFERENCE_PATTERN', () => {
    it('match "KDS 0001"', () => {
      const m = 'KDS 0001 thanh toan'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      // group 2 captures short ref "KDS 0001"
      expect(m![2]).toBe('KDS 0001')
    })

    it('match "KDS0001" (no space)', () => {
      const m = 'KDS0001'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      expect(m![2]).toBe('KDS0001')
    })

    it('match "KDS-20260804-0001" (full orderNumber)', () => {
      const m = 'KH thanh toan KDS-20260804-0001'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      expect(m![1]).toBe('KDS-20260804-0001')
    })

    it('reject không match', () => {
      expect('nothing here'.match(PAYMENT_REFERENCE_PATTERN)).toBeNull()
      expect('KDS 1' .match(PAYMENT_REFERENCE_PATTERN)).toBeNull() // only 1 digit
      expect('KD 0001'.match(PAYMENT_REFERENCE_PATTERN)).toBeNull() // no 'S'
    })
  })
})