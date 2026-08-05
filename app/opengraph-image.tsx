import { ImageResponse } from 'next/og'

/**
 * OpenGraph image generator — P7-07.
 *
 * Generates 1200x630 OG images dynamically for product pages.
 * Used via: <meta property="og:image" content="/opengraph-image?title=...">
 *
 * Brand: dark theme, electric accent, Kandes identity.
 */
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; product?: string }>
}) {
  const params = await searchParams
  const title = params.title ?? 'Kandes.shop — Cong cu AI coding chinh hang'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          backgroundColor: '#09090b',
          padding: '60px 72px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top-left corner decoration */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            width: 48,
            height: 48,
            borderTop: '2px solid #06b6d4',
            borderLeft: '2px solid #06b6d4',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            width: 48,
            height: 48,
            borderTop: '2px solid #06b6d4',
            borderRight: '2px solid #06b6d4',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            width: 48,
            height: 48,
            borderBottom: '2px solid #06b6d4',
            borderLeft: '2px solid #06b6d4',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            width: 48,
            height: 48,
            borderBottom: '2px solid #06b6d4',
            borderRight: '2px solid #06b6d4',
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#06b6d4',
              boxShadow: '0 0 16px #06b6d4',
            }}
          />
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#06b6d4',
              textTransform: 'uppercase',
            }}
          >
            Kandes.shop
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 900,
          }}
        >
          <span
            style={{
              fontSize: title.length > 40 ? 52 : 64,
              fontWeight: 800,
              color: '#fafafa',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </span>
        </div>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 32,
            padding: '12px 24px',
            border: '1px solid #06b6d4',
            borderRadius: 4,
          }}
        >
          <span style={{ fontSize: 20, color: '#06b6d4', fontWeight: 600 }}>
            Mua ngay →
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}