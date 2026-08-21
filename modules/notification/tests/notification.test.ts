import { describe, it, expect } from 'vitest'
import { resolveTemplate } from '../templates'
import { DEFAULT_BACKOFF_MINUTES, DEFAULT_MAX_ATTEMPTS } from '../types'
import type { NotificationData } from '../types'

/**
 * Notification module — Phase 3 P3-07 unit tests.
 *
 * Covers pure functions only (templates, constants). Queue + service paths are
 * tested in integration tests against the real DB.
 */

const baseData: NotificationData = {
  orderNumber: 'KDS-20260804-0001',
  totalCents: '199000',
  currency: 'VND',
  items: [{ name: 'Cursor Pro', quantity: 1, unitPriceCents: '199000' }],
  deliveredContentKeys: true,
}

describe('notification/templates', () => {
  it('renders every event into subject + html + text', () => {
    const events: Array<{
      ev: 'order.created' | 'order.paid' | 'order.delivered' | 'order.cancelled' | 'order.refunded'
      hasItemsTable: boolean
    }> = [
      { ev: 'order.created', hasItemsTable: true },
      { ev: 'order.paid', hasItemsTable: false },
      { ev: 'order.delivered', hasItemsTable: true },
      { ev: 'order.cancelled', hasItemsTable: false },
      { ev: 'order.refunded', hasItemsTable: false },
    ]
    for (const { ev, hasItemsTable } of events) {
      const tpl = resolveTemplate(ev, baseData)
      expect(tpl, `event ${ev}`).not.toBeNull()
      expect(tpl!.subject).toContain('Kandes.shop')
      expect(tpl!.subject).toContain(baseData.orderNumber)
      expect(tpl!.html).toContain('<html')
      if (hasItemsTable) {
        expect(tpl!.html).toContain('Cursor Pro')
      }
      expect(tpl!.text.length).toBeGreaterThan(0)
    }
  })

  it('escapes HTML in delivered message and reason (XSS guard)', () => {
    const tpl = resolveTemplate('order.cancelled', {
      ...baseData,
      reason: '<script>alert(1)</script>',
    })
    expect(tpl).not.toBeNull()
    expect(tpl!.html).toContain('&lt;script&gt;')
    expect(tpl!.html).not.toContain('<script>')
  })

  it('never embeds raw keys inside the delivered email body', () => {
    const tpl = resolveTemplate('order.delivered', {
      ...baseData,
      deliveredContentKeys: true,
    })
    expect(tpl!.html).not.toContain('pk_live_')
    expect(tpl!.html).not.toContain('sk_')
    expect(tpl!.html).not.toMatch(/[A-Za-z0-9_\-]{32,}/)
  })

  it('omits the reason line when reason is missing', () => {
    const tpl = resolveTemplate('order.cancelled', { ...baseData })
    expect(tpl!.html).not.toContain('Lý do:')
  })
})

describe('notification/queue — constants', () => {
  it('exposes a 3-step backoff schedule (1, 5, 15 minutes)', () => {
    expect(DEFAULT_BACKOFF_MINUTES).toEqual([1, 5, 15])
  })
  it('max attempts defaults to 3', () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(3)
  })
})
