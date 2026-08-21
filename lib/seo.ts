/**
 * SEO configuration — Phase 11-SEO.
 *
 * Centralized constants for site-wide metadata, OpenGraph, Twitter cards.
 * Pages override these with their own `metadata` export.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kandes.shop'
export const SITE_NAME = 'Kandes.shop'
export const SITE_DESCRIPTION =
  'Cửa hàng số chuyên sản phẩm AI / công cụ lập trình. Key AI Claude, GPT, codex với giá tốt nhất Việt Nam.'
export const SITE_KEYWORDS = [
  'AI API key',
  'Claude API',
  'GPT API',
  'Codex',
  'AI Gateway',
  'Cursor AI',
  'Cline AI',
  'Claude Code',
  'AI keys Vietnam',
  'mua key AI',
  'API key giá rẻ',
]
export const SITE_LOCALE = 'vi_VN'
export const OG_IMAGE = `${SITE_URL}/og-default.png`
export const TWITTER_HANDLE = '@kandes_shop'

export const DEFAULT_METADATA = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - Cửa hàng AI / API Keys`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: 'Kandes.shop Team' }],
  creator: 'Kandes.shop',
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website' as const,
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Cửa hàng AI / API Keys`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    creator: TWITTER_HANDLE,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: SITE_URL,
    languages: {
      'vi-VN': `${SITE_URL}/vi`,
      'en-US': `${SITE_URL}/en`,
    },
  },
}

/**
 * Page-specific metadata builders.
 */
export function buildProductMetadata(product: {
  name: string
  description: string
  price: number
  image?: string
  slug: string
}) {
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      type: 'website' as const,
      title: product.name,
      description: product.description,
      images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
    alternates: {
      canonical: `${SITE_URL}/products/${product.slug}`,
    },
  }
}

export function buildCategoryMetadata(category: { name: string; description?: string; slug: string }) {
  return {
    title: category.name,
    description: category.description || `${category.name} - ${SITE_NAME}`,
    alternates: {
      canonical: `${SITE_URL}/categories/${category.slug}`,
    },
  }
}
