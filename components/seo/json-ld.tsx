import * as React from 'react'

/**
 * JSON-LD structured data component — Phase 11-SEO.
 * Drop into any page to inject Schema.org markup.
 */
type JsonLdProps = {
  data: object
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
