import { describe, it, expect, vi } from 'vitest'

const findFirstMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    notificationTemplate: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}))

import { interpolate, extractVariables, validateTemplate, resolveTemplateUniversal } from './templates-db'

describe('templates-db — P5-05', () => {
  describe('interpolate', () => {
    it('thay thế {{var}} đúng variable', () => {
      const out = interpolate('Đơn {{orderNumber}} - {{minutesOver}}p', {
        orderNumber: 'KDS-001',
        totalCents: '0',
        currency: 'VND',
        items: [],
        minutesOver: 45,
      })
      expect(out).toBe('Đơn KDS-001 - 45p')
    })

    it('escape HTML trong value', () => {
      const out = interpolate('{{orderNumber}}', {
        orderNumber: '<script>alert(1)</script>',
        totalCents: '0',
        currency: 'VND',
        items: [],
      })
      expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    })

    it('unknown var → empty string', () => {
      const out = interpolate('Hi {{injection}}', {
        orderNumber: 'X',
        totalCents: '0',
        currency: 'VND',
        items: [],
      })
      expect(out).toBe('Hi ')
    })

    it('undefined value → empty string', () => {
      const out = interpolate('hi {{orderNumber}}', {
        orderNumber: '',
        totalCents: '0',
        currency: 'VND',
        items: [],
        deliveredContentKeys: undefined,
      })
      expect(out).toBe('hi ')
    })

    it('whitespace trong placeholder được trim', () => {
      const out = interpolate('hi {{  orderNumber  }}', {
        orderNumber: 'X',
        totalCents: '0',
        currency: 'VND',
        items: [],
      })
      expect(out).toBe('hi X')
    })
  })

  describe('extractVariables', () => {
    it('list unique vars', () => {
      const v = extractVariables('{{orderNumber}} | {{minutesOver}} | {{orderNumber}}')
      expect(v.sort()).toEqual(['minutesOver', 'orderNumber'])
    })

    it('empty khi không có var', () => {
      expect(extractVariables('hello world')).toEqual([])
    })
  })

  describe('validateTemplate', () => {
    it('ok chỉ chấp nhận whitelist', () => {
      const r = validateTemplate('{{orderNumber}} - {{minutesOver}} - {{level}}')
      expect(r.ok).toBe(true)
      expect(r.invalid).toEqual([])
    })

    it('invalid list các var cấm', () => {
      const r = validateTemplate('{{orderNumber}} - {{authorEmail}}')
      expect(r.ok).toBe(false)
      expect(r.invalid).toContain('authorEmail')
    })
  })

  describe('resolveTemplateUniversal', () => {
    it('trả null khi DB empty + channel telegram (no fallback)', async () => {
      findFirstMock.mockResolvedValueOnce(null)
      const r = await resolveTemplateUniversal({
        event: 'sla.breach',
        channel: 'telegram',
        language: 'vi',
        data: {
          orderNumber: 'KDS-001',
          totalCents: '0',
          currency: 'VND',
          items: [],
          minutesOver: 45,
          level: 1,
        },
      })
      expect(r).toBeNull()
    })

    it('dùng DB row khi có (telegram strip HTML)', async () => {
      findFirstMock.mockResolvedValueOnce({
        bodyTemplate: '<b>Đơn {{orderNumber}}</b> quá hạn {{minutesOver}}p',
        subject: '[L{{level}}]',
        isActive: true,
      })
      const r = await resolveTemplateUniversal({
        event: 'sla.breach',
        channel: 'telegram',
        language: 'vi',
        data: {
          orderNumber: 'KDS-001',
          totalCents: '0',
          currency: 'VND',
          items: [],
          minutesOver: 45,
          level: 1,
        },
      })
      expect(r?.text).toBe('Đơn KDS-001 quá hạn 45p')
      expect(r?.subject).toBe('[L{{level}}]')
      expect(r?.html).toBe('')
    })

    it('email channel fallback to hardcoded resolveTemplate', async () => {
      findFirstMock.mockResolvedValueOnce(null)
      const r = await resolveTemplateUniversal({
        event: 'order.created',
        channel: 'email',
        language: 'vi',
        data: {
          orderNumber: 'KDS-001',
          totalCents: '100000',
          currency: 'VND',
          items: [],
        },
      })
      expect(r?.subject).toContain('KDS-001')
    })
  })
})
