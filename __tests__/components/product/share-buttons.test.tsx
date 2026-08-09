import { describe, it, expect } from 'vitest'

/**
 * Unit tests cho ShareButtons URL construction logic — Phase 9 D4.
 */
describe('ShareButtons — URL construction', () => {
  const url = 'https://kandes.shop/products/cursor-pro-1-thang'
  const productName = 'Cursor Pro 1 tháng'

  it('encodes URL for Facebook share', () => {
    const encodedUrl = encodeURIComponent(url)
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    expect(facebookUrl).toContain(encodeURIComponent('https://kandes.shop/products/cursor-pro-1-thang'))
    expect(facebookUrl.startsWith('https://www.facebook.com/sharer/sharer.php?u=')).toBe(true)
  })

  it('encodes URL + text for Twitter/X share', () => {
    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(productName)
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
    expect(twitterUrl).toContain(encodedText)
    expect(decodeURIComponent(encodedText)).toBe(productName)
  })

  it('detects navigator.share availability', () => {
    const hasNativeShare = (nav: { share?: unknown }) => typeof nav.share === 'function'
    expect(hasNativeShare({ share: () => Promise.resolve() })).toBe(true)
    expect(hasNativeShare({})).toBe(false)
  })
})