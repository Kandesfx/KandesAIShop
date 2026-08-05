import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
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
  authors: [{ name: 'Kandes.shop' }],
  creator: 'Kandes.shop',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: 'Kandes.shop',
    title: 'Kandes.shop — Công cụ AI coding chính hãng',
    description: 'Cursor Pro, Windsurf, GitHub Copilot, Claude Pro. Giao tự động 30 giây.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kandes.shop',
    description: 'Công cụ AI coding chính hãng — giao tự động 30 giây.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-ink-900 text-ink-50 antialiased flex flex-col">
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
