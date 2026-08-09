/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // D66: Standalone output for minimal Docker image (skips node_modules in /app)
  output: 'standalone',
  // P7-01: Security headers moved to middleware.ts for dynamic CSP
  // P7-02: Strict mode ESLint deferred via ESLint ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
  // P7-02: Image optimization
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
    // P7-02: Lazy loading by default
    minimumCacheTTL: 60,
  },
  // P7-02: Bundle analyzer ready (uncomment to use)
  // bundles: {
  //   analyze: process.env.ANALYZE_BUNDLE === 'true',
  // },
  // P7-07: Rewrites for api subdomain (D51 deferred — enable when DNS ready)
  async rewrites() {
    return []
  },
  // P7-02: Compress responses
  compress: true,
  // P7-01: Generate ETags
  generateEtags: true,
}

module.exports = nextConfig