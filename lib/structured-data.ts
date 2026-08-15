/**
 * Structured data (JSON-LD) helpers — Phase 11-SEO.
 *
 * Generates Schema.org markup for products, organization, breadcrumbs, etc.
 * Drop these into pages to enable rich snippets in search results.
 */

import { SITE_URL } from '@/lib/seo'

/**
 * Product structured data — for product detail pages.
 */
export function buildProductSchema(product: {
  name: string
  description: string
  image?: string
  price: number
  currency?: string
  sku?: string
  brand?: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  rating?: { value: number; count: number }
  url: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: product.url,
      priceCurrency: product.currency || 'VND',
      price: product.price,
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      seller: {
        '@type': 'Organization',
        name: 'Kandes.shop',
      },
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating.value,
          reviewCount: product.rating.count,
        }
      : undefined,
  }
  return schema
}

/**
 * Organization structured data — for homepage/about pages.
 */
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kandes.shop',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'Cửa hàng số chuyên sản phẩm AI / công cụ lập trình. Cursor Pro, Claude Pro, ChatGPT Plus và nhiều hơn nữa.',
    sameAs: [
      'https://facebook.com/kandes.shop',
      'https://twitter.com/kandes_shop',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      availableLanguage: ['vi', 'en'],
      email: 'support@kandes.shop',
    },
  }
}

/**
 * BreadcrumbList structured data — for navigation hierarchy.
 */
export function buildBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * FAQPage structured data — for FAQ sections.
 */
export function buildFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * WebSite structured data with SearchAction — enables sitelinks search box.
 */
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kandes.shop',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * LocalBusiness structured data (Vietnam).
 */
export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'Kandes.shop',
    url: SITE_URL,
    description: 'Cửa hàng AI / API keys chính hãng',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'VN',
      addressLocality: 'Ho Chi Minh City',
    },
    priceRange: '₫₫',
  }
}
