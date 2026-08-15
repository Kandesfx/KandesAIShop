import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { JsonLd } from './json-ld'
import { buildBreadcrumbSchema } from '@/lib/structured-data'

type Crumb = {
  label: string
  href?: string
}

type BreadcrumbsProps = {
  items: Crumb[]
  className?: string
}

/**
 * Breadcrumbs navigation with JSON-LD structured data — Phase 11-SEO.
 *
 * Renders visible breadcrumb UI + Schema.org BreadcrumbList for rich snippets.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const schemaItems = items
    .filter((i) => i.href)
    .map((i) => ({
      name: i.label,
      url: i.href as string,
    }))

  return (
    <>
      {schemaItems.length > 0 && <JsonLd data={buildBreadcrumbSchema(schemaItems)} />}
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex items-center gap-1 text-sm text-gray-600">
          <li>
            <Link
              href="/"
              className="flex items-center hover:text-gray-900"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
          </li>
          {items.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
              {crumb.href && i < items.length - 1 ? (
                <Link
                  href={crumb.href}
                  className="hover:text-gray-900 hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
