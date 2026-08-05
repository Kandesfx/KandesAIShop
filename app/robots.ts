import { MetadataRoute } from 'next'

/**
 * robots.txt — P7-07.
 *
 * Allow all crawlers. Disallow /admin/, /api/, /account/, /checkout/.
 * Sitemap at standard location.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL ?? 'https://kandes.shop'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/account/',
          '/checkout/',
          '/order/',
          '/cart',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}