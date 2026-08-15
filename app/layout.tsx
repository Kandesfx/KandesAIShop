import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CartProvider } from '@/lib/cart-context'
import { ToastProvider } from '@/components/ui/toast'
import { cartService } from '@/modules/cart'
import { getCurrentUser } from '@/lib/auth'
import { DEFAULT_METADATA, SITE_URL } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { buildOrganizationSchema, buildWebSiteSchema } from '@/lib/structured-data'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  ...DEFAULT_METADATA,
  metadataBase: new URL(process.env.APP_URL || SITE_URL),
  title: {
    default: 'Kandes.shop — Công cụ AI coding chính hãng',
    template: '%s · Kandes.shop',
  },
  description:
    'Cursor Pro, Windsurf, GitHub Copilot, Claude Pro, ChatGPT Plus và nhiều hơn nữa. Giao tự động qua email trong 30 giây — không chờ đợi, không thủ tục.',
  keywords: [
    'Cursor Pro',
    'Windsurf',
    'GitHub Copilot',
    'ChatGPT Plus',
    'Claude Pro',
    'AI coding tools',
    'JetBrains AI',
    'OpenRouter',
  ],
  openGraph: {
    ...DEFAULT_METADATA.openGraph,
    title: 'Kandes.shop — Công cụ AI coding chính hãng',
    description: 'Cursor Pro, Windsurf, GitHub Copilot, Claude Pro. Giao tự động 30 giây.',
  },
  twitter: {
    ...DEFAULT_METADATA.twitter,
    title: 'Kandes.shop',
    description: 'Công cụ AI coding chính hãng — giao tự động 30 giây.',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null
  let initialCart = null

  try {
    user = await getCurrentUser()
  } catch {
    // guest
  }

  try {
    initialCart = await cartService.getCurrentCart(user?.id ?? null)
  } catch {
    // cart service down — provider sẽ fetch client-side
  }

  return (
    <html
      lang="vi"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-ink-900 text-ink-50 antialiased flex flex-col">
        <JsonLd data={buildOrganizationSchema()} />
        <JsonLd data={buildWebSiteSchema()} />
        <CartProvider initialCart={initialCart}>
          <ToastProvider>
            <Header currentUser={user ? { id: user.id, email: user.email ?? '', name: user.name ?? null, avatarUrl: user.avatarUrl ?? null, role: user.role } : null} />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  )
}
