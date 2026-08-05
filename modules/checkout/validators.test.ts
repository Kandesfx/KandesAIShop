import { describe, it, expect } from 'vitest'
import {
  checkoutSchema,
  orderNumberParamSchema,
  trackOrderSchema,
  ordersQuerySchema,
  revealKeySchema,
} from '@/modules/checkout/validators'

describe('checkout/validators', () => {
  describe('checkoutSchema', () => {
    it('happy path — đầy đủ các trường', () => {
      const r = checkoutSchema.safeParse({
        email: 'buyer@example.com',
        phone: '0901234567',
        notes: 'Giao buổi chiều',
        acceptTerms: true,
        paymentMethod: 'sepay_qr',
      })
      expect(r.success).toBe(true)
    })

    it('happy path — tối thiểu', () => {
      const r = checkoutSchema.safeParse({
        email: 'buyer@example.com',
        phone: '0901234567',
        acceptTerms: true,
      })
      expect(r.success).toBe(true)
    })

    it('notes optional và có thể rỗng', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '0901234567',
        notes: '',
        acceptTerms: true,
      })
      expect(r.success).toBe(true)
    })

    it('reject acceptTerms = false', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '0901234567',
        acceptTerms: false,
      })
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.errors.some((e) => e.path.includes('acceptTerms'))).toBe(true)
      }
    })

    it('reject email không hợp lệ', () => {
      const r = checkoutSchema.safeParse({
        email: 'not-an-email',
        phone: '0901234567',
        acceptTerms: true,
      })
      expect(r.success).toBe(false)
    })

    it('reject phone quá ngắn', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '12345',
        acceptTerms: true,
      })
      expect(r.success).toBe(false)
    })

    it('reject phone có ký tự lạ', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '0901234567abc',
        acceptTerms: true,
      })
      expect(r.success).toBe(false)
    })

    it('accept phone có dấu + đầu (format VN)', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '+84901234567',
        acceptTerms: true,
      })
      expect(r.success).toBe(true)
    })

    it('reject notes quá 500 ký tự', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '0901234567',
        notes: 'x'.repeat(501),
        acceptTerms: true,
      })
      expect(r.success).toBe(false)
    })

    it('reject paymentMethod không hợp lệ', () => {
      const r = checkoutSchema.safeParse({
        email: 'a@b.com',
        phone: '0901234567',
        acceptTerms: true,
        paymentMethod: 'crypto',
      })
      expect(r.success).toBe(false)
    })

    it('email được trim', () => {
      const r = checkoutSchema.safeParse({
        email: '  buyer@example.com  ',
        phone: '0901234567',
        acceptTerms: true,
      })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.email).toBe('buyer@example.com')
      }
    })
  })

  describe('orderNumberParamSchema', () => {
    it('accept đúng format KDS-YYYYMMDD-XXXX', () => {
      expect(orderNumberParamSchema.safeParse({ orderNumber: 'KDS-20260804-0042' }).success).toBe(
        true
      )
    })

    it('reject format sai (sequence không đủ 4 chữ số)', () => {
      expect(orderNumberParamSchema.safeParse({ orderNumber: 'KDS-20260804-42' }).success).toBe(
        false
      )
    })

    it('reject format sai (không có prefix)', () => {
      expect(orderNumberParamSchema.safeParse({ orderNumber: '20260804-0042' }).success).toBe(false)
    })

    it('reject ký tự lạ', () => {
      expect(orderNumberParamSchema.safeParse({ orderNumber: 'KDS-2026080X-0042' }).success).toBe(
        false
      )
    })
  })

  describe('trackOrderSchema', () => {
    it('OK với email format', () => {
      const r = trackOrderSchema.safeParse({
        orderNumber: 'KDS-20260804-0001',
        contact: 'buyer@example.com',
      })
      expect(r.success).toBe(true)
    })

    it('OK với SĐT format', () => {
      const r = trackOrderSchema.safeParse({
        orderNumber: 'KDS-20260804-0001',
        contact: '0901234567',
      })
      expect(r.success).toBe(true)
    })

    it('OK với +84 prefix', () => {
      const r = trackOrderSchema.safeParse({
        orderNumber: 'KDS-20260804-0001',
        contact: '+84901234567',
      })
      expect(r.success).toBe(true)
    })

    it('reject orderNumber sai format', () => {
      expect(
        trackOrderSchema.safeParse({
          orderNumber: 'INVALID',
          contact: 'a@b.com',
        }).success
      ).toBe(false)
    })

    it('reject contact quá ngắn (min 3)', () => {
      expect(
        trackOrderSchema.safeParse({
          orderNumber: 'KDS-20260804-0001',
          contact: 'a',
        }).success
      ).toBe(false)
    })

    it('reject contact quá dài (max 254)', () => {
      expect(
        trackOrderSchema.safeParse({
          orderNumber: 'KDS-20260804-0001',
          contact: 'a'.repeat(255),
        }).success
      ).toBe(false)
    })

    it('reject thiếu orderNumber', () => {
      expect(trackOrderSchema.safeParse({ contact: 'a@b.com' }).success).toBe(false)
    })

    it('reject thiếu contact', () => {
      expect(trackOrderSchema.safeParse({ orderNumber: 'KDS-20260804-0001' }).success).toBe(false)
    })

    it('contact được trim', () => {
      const r = trackOrderSchema.safeParse({
        orderNumber: 'KDS-20260804-0001',
        contact: '  buyer@example.com  ',
      })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.contact).toBe('buyer@example.com')
      }
    })
  })

  describe('ordersQuerySchema', () => {
    it('default values khi parse chuỗi rỗng', () => {
      const r = ordersQuerySchema.parse({})
      expect(r.status).toBe('all')
      expect(r.page).toBe(1)
      expect(r.limit).toBe(20)
    })

    it('coerce number từ string', () => {
      const r = ordersQuerySchema.parse({ status: 'pending', page: '3', limit: '10' })
      expect(r.status).toBe('pending')
      expect(r.page).toBe(3)
      expect(r.limit).toBe(10)
    })

    it('reject status không hợp lệ', () => {
      expect(ordersQuerySchema.safeParse({ status: 'invalid' }).success).toBe(false)
    })

    it('reject page < 1', () => {
      expect(ordersQuerySchema.safeParse({ page: '0' }).success).toBe(false)
    })

    it('reject page > 200', () => {
      expect(ordersQuerySchema.safeParse({ page: '201' }).success).toBe(false)
    })

    it('reject limit > 50', () => {
      expect(ordersQuerySchema.safeParse({ limit: '51' }).success).toBe(false)
    })

    it('reject limit < 1', () => {
      expect(ordersQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
    })

    it('accept hết các status filter', () => {
      const statuses = [
        'all',
        'pending',
        'paid',
        'processing',
        'delivered',
        'completed',
        'cancelled',
        'refunded',
      ]
      for (const s of statuses) {
        expect(ordersQuerySchema.safeParse({ status: s }).success).toBe(true)
      }
    })
  })

  describe('revealKeySchema', () => {
    it('OK với password bất kỳ (kiểm tra ở service)', () => {
      expect(revealKeySchema.safeParse({ password: 'any-string' }).success).toBe(true)
    })

    it('reject rỗng', () => {
      expect(revealKeySchema.safeParse({ password: '' }).success).toBe(false)
    })

    it('reject thiếu password', () => {
      expect(revealKeySchema.safeParse({}).success).toBe(false)
    })

    it('reject password > 200 chars (chống abuse)', () => {
      expect(revealKeySchema.safeParse({ password: 'a'.repeat(201) }).success).toBe(false)
    })

    it('accept đúng 200 chars', () => {
      expect(revealKeySchema.safeParse({ password: 'a'.repeat(200) }).success).toBe(true)
    })
  })
})
