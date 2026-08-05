import { describe, it, expect } from 'vitest'
import { addItemSchema, updateQtySchema } from '@/modules/cart/validators'

describe('cart/validators', () => {
  it('addItemSchema — happy path', () => {
    const r = addItemSchema.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      variantId: '00000000-0000-0000-0000-000000000002',
      quantity: 2,
    })
    expect(r.success).toBe(true)
  })

  it('addItemSchema — variantId optional', () => {
    const r = addItemSchema.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      quantity: 1,
    })
    expect(r.success).toBe(true)
  })

  it('addItemSchema — quantity=0 bị reject', () => {
    const r = addItemSchema.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      quantity: 0,
    })
    expect(r.success).toBe(false)
  })

  it('addItemSchema — productId không UUID bị reject', () => {
    const r = addItemSchema.safeParse({
      productId: 'not-uuid',
      quantity: 1,
    })
    expect(r.success).toBe(false)
  })

  it('addItemSchema — quantity vượt 99 bị reject', () => {
    const r = addItemSchema.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      quantity: 100,
    })
    expect(r.success).toBe(false)
  })

  it('updateQtySchema — cho phép quantity=0 (nghĩa là xoá)', () => {
    const r = updateQtySchema.safeParse({ quantity: 0 })
    expect(r.success).toBe(true)
  })

  it('updateQtySchema — quantity âm bị reject', () => {
    const r = updateQtySchema.safeParse({ quantity: -1 })
    expect(r.success).toBe(false)
  })
})
