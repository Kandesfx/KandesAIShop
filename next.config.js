/**
 * Bundle analyzer config — Phase 11-PERF.
 *
 * Uncomment the import to enable. Run `npm run analyze` to see bundle output.
 */

// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//   enabled: process.env.ANALYZE === 'true',
// })

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.vietqr.io' },
      { protocol: 'https', hostname: 'pub-*.r2.dev' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'cdn.kandes.shop' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // Phase 11-PERF: Production source maps for error tracking
  productionBrowserSourceMaps: false,
  // Phase 11-PERF: Optimize package imports for tree-shaking
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./node_modules/argon2/prebuilds/**/*'],
    },
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash-es',
      'clsx',
      'tailwind-merge',
    ],
  },
  // Phase 11-PERF: Compress responses
  compress: true,
  generateEtags: true,
  // Phase 11-PERF: SWC minify (default in Next 14, but explicit)
  swcMinify: true,
  // Phase 11-PERF: Modularize imports (Next 13+)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  async redirects() {
    return [
      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/policy', destination: '/legal/privacy', permanent: true },
      { source: '/terms', destination: '/legal/terms', permanent: true },
      { source: '/refund-policy', destination: '/legal/refund-policy', permanent: true },
    ]
  },
  async rewrites() {
    return []
  },
}

// module.exports = withBundleAnalyzer(nextConfig)
module.exports = nextConfig
