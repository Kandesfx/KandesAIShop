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
        content: 'KDSAB12CD thanh toan',
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
        content: 'KDSAB12CD',
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
    it('match "KDSAB12CD" (suffix 6 chars, total 9)', () => {
      // KDS (3) + AB12CD (6) = 9 total; suffix phải 6-8 chars
      const m = 'KDSAB12CD'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      expect(m![2]).toBe('KDSAB12CD')
    })

    it('match "KDSABCDEFGH" (suffix 8 chars, total 11)', () => {
      // KDS (3) + ABCDEFGH (8) = 11 total; max suffix 8
      const m = 'KDSABCDEFGH'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      expect(m![2]).toBe('KDSABCDEFGH')
    })

    it('match "KDSab12Cd" trong nội dung dài (case insensitive)', () => {
      const m = 'KH thanh toan KDSab12Cd'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      expect(m![2]).toBe('KDSab12Cd')
    })

    it('match "KDS-20260804-0001" (full orderNumber)', () => {
      const m = 'KH thanh toan KDS-20260804-0001'.match(PAYMENT_REFERENCE_PATTERN)
      expect(m).not.toBeNull()
      expect(m![1]).toBe('KDS-20260804-0001')
    })

    it('reject "KD 0001" (sai prefix)', () => {
      expect('KD 0001'.match(PAYMENT_REFERENCE_PATTERN)).toBeNull()
    })

    it('reject "KDSABC" (suffix 3 chars, quá ngắn)', () => {
      expect('KDSABC'.match(PAYMENT_REFERENCE_PATTERN)).toBeNull()
    })

    it('reject "KDS 0001" (old 4-digit format)', () => {
      expect('KDS 0001'.match(PAYMENT_REFERENCE_PATTERN)).toBeNull()
    })

    it('reject "KDS1" (suffix 0 chars)', () => {
      expect('KDS1'.match(PAYMENT_REFERENCE_PATTERN)).toBeNull()
    })
  })
})