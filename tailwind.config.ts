import type { Config } from 'tailwindcss'

/**
 * Tailwind theme — Brand Kandes.
 *
 * Phong cách: cyberpunk / glitch / RGB-shift — không dùng neon green làm primary.
 * Token primary lấy từ cyan/electric blue trong logo animated.
 * Purple là accent cho CTA hover.
 */

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand surface — pure dark cho cyber feel
        ink: {
          DEFAULT: '#05060A',
          50: '#E6EDF5',
          100: '#BFCBDB',
          200: '#7C8AA1',
          300: '#4A5769',
          400: '#1F2733',
          500: '#12161F',
          600: '#0C1018',
          700: '#080B11',
          800: '#06080D',
          900: '#05060A',
        },

        // Brand accent — cyan / electric blue (lấy từ logo animated)
        electric: {
          DEFAULT: '#00E5FF',
          hover: '#00B8CC',
          muted: 'rgba(0, 229, 255, 0.12)',
          deep: '#0088A8',
        },

        // Purple accent (logo highlight + CTA hover state)
        plasma: {
          DEFAULT: '#7C3AED',
          hover: '#A855F7',
          muted: 'rgba(124, 58, 237, 0.15)',
        },

        // Semantic
        danger: '#FF3366',
        warning: '#FFB800',
        success: '#00E5FF',
      },
      fontFamily: {
        // Tech/display — dùng cho wordmark + headings
        display: ['"Space Grotesk"', '"JetBrains Mono"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-xl': [
          'clamp(56px, 9vw, 96px)',
          { lineHeight: '1.0', fontWeight: '700', letterSpacing: '-0.03em' },
        ],
        'display-lg': [
          'clamp(40px, 6vw, 64px)',
          { lineHeight: '1.05', fontWeight: '700', letterSpacing: '-0.02em' },
        ],
        h1: ['40px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['28px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        h3: ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        h4: ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['17px', { lineHeight: '1.65', fontWeight: '400' }],
        body: ['15px', { lineHeight: '1.65', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '12px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 0 0 rgba(255, 255, 255, 0.04)',
        DEFAULT: '0 2px 0 0 rgba(255, 255, 255, 0.04)',
        md: '0 0 0 1px rgba(255, 255, 255, 0.06)',
        lg: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 12px 32px -8px rgba(0, 0, 0, 0.5)',
        'glow-electric': '0 0 0 1px rgba(0, 229, 255, 0.4), 0 0 24px -4px rgba(0, 229, 255, 0.35)',
        'glow-plasma': '0 0 0 1px rgba(124, 58, 237, 0.4), 0 0 24px -4px rgba(124, 58, 237, 0.35)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
        fast: '120ms',
        slow: '320ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'rgb-shift': {
          '0%, 100%': {
            textShadow: '0 0 0 transparent, -1px 0 #FF3366, 1px 0 #00E5FF',
          },
          '50%': { textShadow: '1px 0 #FF3366, -1px 0 #00E5FF' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.6' },
        },
        pulse_dot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.3)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        'rgb-shift': 'rgb-shift 3s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
        flicker: 'flicker 6s linear infinite',
        'pulse-dot': 'pulse_dot 1.8s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
      backgroundImage: {
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        scanlines:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.025) 2px, rgba(0, 229, 255, 0.025) 3px)',
        'grid-tech':
          'linear-gradient(rgba(0, 229, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-tech': '48px 48px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar'),
  ],
}

export default config
