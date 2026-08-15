/**
 * Semantic HTML helpers — Phase 11-SEO.
 *
 * Components that wrap content with proper semantic HTML for SEO.
 */

import * as React from 'react'

/**
 * Semantic <main> wrapper for page content (skip if already in layout).
 */
export function PageMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main id="main-content" className={className}>
      {children}
    </main>
  )
}

/**
 * Semantic <article> wrapper for self-contained content (blog posts, products).
 */
export function Article({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article className={className} itemScope itemType="https://schema.org/Article">
      {children}
    </article>
  )
}

/**
 * Semantic <section> wrapper for content sections.
 */
export function Section({
  children,
  ariaLabel,
  className,
}: {
  children: React.ReactNode
  ariaLabel?: string
  className?: string
}) {
  return (
    <section aria-label={ariaLabel} className={className}>
      {children}
    </section>
  )
}
