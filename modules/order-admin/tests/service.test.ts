import { describe, it, expect } from 'vitest'
import { schemas } from '../validators'
import type { DeliverInput } from '../types'

/**
 * Order-admin validators — Phase 3 P3-05.
 *
 * Tests pure validator logic (Zod). DB-touching paths live in
 * `tests/integration/order-admin.test.ts`.
 */

describe('order-admin/validators', () => {
  it('list schema defaults page=1, limit=20 and coerces stringified numbers', () => {
    const parsed = schemas.list.parse({ page: '2', limit: '5' })
    expect(parsed.page).toBe(2)
    expect(parsed.limit).toBe(5)
  })

  it('list schema rejects oversized limit', () => {
    expect(() => schemas.list.parse({ limit: '500' })).toThrow()
  })

  it('list schema rejects unknown status', () => {
    expect(() => schemas.list.parse({ status: 'unicorn' })).toThrow()
  })

  it('id param rejects non-uuid', () => {
    expect(() => schemas.idParam.parse({ id: 'not-a-uuid' })).toThrow()
    expect(() =>
      schemas.idParam.parse({ id: '12345678-1234-1234-1234-123456789012' })
    ).not.toThrow()
  })

  it('refund requires positive integer amount and a 3+ char reason', () => {
    expect(() => schemas.refund.parse({ amountCents: '0', reason: 'x' })).toThrow()
    expect(() => schemas.refund.parse({ amountCents: '100', reason: 'khách refund' })).not.toThrow()
  })

  it('cancel requires 3+ char reason', () => {
    expect(() => schemas.cancel.parse({ reason: 'no' })).toThrow()
    expect(() => schemas.cancel.parse({ reason: 'không liên lạc được' })).not.toThrow()
  })

  it('note enforces non-empty + 2000 char cap', () => {
    expect(() => schemas.note.parse({ note: '' })).toThrow()
    const long = 'a'.repeat(2001)
    expect(() => schemas.note.parse({ note: long })).toThrow()
  })

  it('deliver picks correct discriminator branch', () => {
    const stock: DeliverInput = {
      mode: 'pick_from_stock',
      itemIds: ['11111111-1111-1111-1111-111111111111'],
    }
    const mkey: DeliverInput = {
      mode: 'manual_key',
      keys: [{ orderItemId: '11111111-1111-1111-1111-111111111111', key: 'ABCD-EFGH' }],
    }
    const mmsg: DeliverInput = {
      mode: 'manual_message',
      messages: [{ orderItemId: '11111111-1111-1111-1111-111111111111', message: 'sent' }],
    }
    expect(schemas.deliver.parse(stock).mode).toBe('pick_from_stock')
    expect(schemas.deliver.parse(mkey).mode).toBe('manual_key')
    expect(schemas.deliver.parse(mmsg).mode).toBe('manual_message')
  })

  it('deliver rejects empty arrays', () => {
    expect(() => schemas.deliver.parse({ mode: 'manual_key', keys: [] })).toThrow()
    expect(() => schemas.deliver.parse({ mode: 'manual_message', messages: [] })).toThrow()
  })
})
