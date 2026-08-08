import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils'

type StarRatingProps = {
  /** Rating value from 0 to 5 (supports decimals for half-stars) */
  value: number
  /** Maximum stars (default 5) */
  max?: number
  /** Size in pixels (default 16) */
  size?: number
  /** Show numeric value next to stars (default false) */
  showValue?: boolean
  /** Show review count (e.g. "(42)") */
  reviewCount?: number
  /** Custom className for container */
  className?: string
}

/**
 * StarRating — Display product rating as stars.
 * 
 * Supports:
 * - Whole stars (value: 4 → 4 full stars)
 * - Half stars (value: 4.5 → 4 full + 1 half)
 * - Decimal precision (value: 4.3 → rounds to 4.5)
 * 
 * @example
 * <StarRating value={4.5} showValue reviewCount={42} />
 * // Renders: ★★★★½ 4.5 (42)
 */
export function StarRating({
  value,
  max = 5,
  size = 16,
  showValue = false,
  reviewCount,
  className,
}: StarRatingProps) {
  // Clamp value between 0 and max
  const rating = Math.max(0, Math.min(max, value))
  
  // Calculate full stars and whether to show half star
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.25 && rating % 1 < 0.75
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="inline-flex items-center" role="img" aria-label={`${rating} out of ${max} stars`}>
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={size}
            className="fill-terracotta text-terracotta"
            aria-hidden
          />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <StarHalf
            size={size}
            className="fill-terracotta text-terracotta"
            aria-hidden
          />
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={size}
            className="text-ink-400"
            aria-hidden
          />
        ))}
      </div>

      {/* Numeric value */}
      {showValue && (
        <span className="text-body-sm text-ink-100 font-medium tabular-nums">
          {rating.toFixed(1)}
        </span>
      )}

      {/* Review count */}
      {reviewCount !== undefined && reviewCount > 0 && (
        <span className="text-body-sm text-ink-400">
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
