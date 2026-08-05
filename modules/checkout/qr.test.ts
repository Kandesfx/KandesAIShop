import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isSepayConfigured, buildQrUrl } from '@/modules/checkout/qr'

/**
 * Mock env để test QR builder độc lập với .env thật.
 * Lưu ý: modules/checkout/qr.ts import env từ lib/env — chạy lúc module load,
 * nên cần mock TRƯỚC khi import.
 */
vi.mock('@/lib/env', () => ({
  env: {
    SEPAY_BANK_CODE: 'VCB',
    SEPAY_ACCOUNT_NUMBER: '1234567890',
    SEPAY_ACCOUNT_NAME: 'NGUYEN VAN A',
    SEPAY_QR_TEMPLATE: 'compact2',
  },
}))

describe('checkout/qr', () => {
  describe('isSepayConfigured', () => {
    it('trả true khi env đủ 3 trường', () => {
      expect(isSepayConfigured()).toBe(true)
    })
  })

  describe('buildQrUrl', () => {
    it('trả URL VietQR hợp lệ', () => {
      const url = buildQrUrl({
        amountVnd: 199000,
        paymentReference: 'KDS 0001',
      })
      expect(url).toContain('https://img.vietqr.io/image/VCB-1234567890-compact2.png')
      expect(url).toContain('amount=199000')
      expect(url).toContain('addInfo=KDS+0001')
      expect(url).toContain('accountName=NGUYEN+VAN+A')
    })

    it('encode đúng khi paymentReference có space', () => {
      const url = buildQrUrl({
        amountVnd: 50000,
        paymentReference: 'KDS 0042',
      })
      expect(url).toContain('addInfo=KDS+0042')
    })

    it('amountVnd bị truncate phần thập phân', () => {
      const url = buildQrUrl({
        amountVnd: 12345.67,
        paymentReference: 'KDS 0001',
      })
      expect(url).toContain('amount=12345')
    })

    it('cho phép override config (test)', () => {
      const url = buildQrUrl({
        amountVnd: 1000,
        paymentReference: 'TEST',
        config: {
          bankCode: 'MB',
          accountNumber: '9999',
          accountName: 'TEST',
          template: 'qr_only',
        },
      })
      expect(url).toContain('MB-9999-qr_only.png')
    })
  })
})

describe('checkout/qr — chưa config', () => {
  // Reset module + mock env rỗng để test nhánh thiếu config
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/lib/env', () => ({
      env: {
        SEPAY_BANK_CODE: '',
        SEPAY_ACCOUNT_NUMBER: '',
        SEPAY_ACCOUNT_NAME: '',
        SEPAY_QR_TEMPLATE: 'compact2',
      },
    }))
  })

  afterEach(() => {
    vi.doUnmock('@/lib/env')
    vi.resetModules()
  })

  it('isSepayConfigured trả false khi thiếu env', async () => {
    const { isSepayConfigured: isCfg } = await import('@/modules/checkout/qr')
    expect(isCfg()).toBe(false)
  })

  it('buildQrUrl throw khi thiếu env', async () => {
    const { buildQrUrl: build } = await import('@/modules/checkout/qr')
    expect(() => build({ amountVnd: 1000, paymentReference: 'KDS 0001' })).toThrow(
      /chưa được cấu hình/
    )
  })
})
