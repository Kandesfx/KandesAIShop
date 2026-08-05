'use client'

import Image from 'next/image'
import Link from 'next/link'

interface TopProduct {
  id: string
  name: string
  slug: string | null
  imageUrl: string | null
  quantity: number
  revenue: number
}

interface TopProductsProps {
  data: TopProduct[]
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(cents)
}

export function TopProducts({ data }: TopProductsProps) {
  return (
    <div className="border border-ink-400 bg-ink-800/40 p-6">
      <h3 className="text-[13px] font-display text-ink-50 mb-4">Top sản phẩm</h3>

      {data.length === 0 ? (
        <p className="text-[12px] text-ink-200 py-8 text-center">Chưa có dữ liệu</p>
      ) : (
        <div className="space-y-3">
          {data.map((product, idx) => (
            <Link
              key={product.id}
              href={product.slug ? `/products/${product.slug}` : '#'}
              className="flex items-center gap-3 p-2 hover:bg-ink-700/50 rounded transition-colors"
            >
              {/* Rank */}
              <span className="text-[12px] font-mono text-ink-200 w-5">
                #{idx + 1}
              </span>

              {/* Image */}
              <div className="w-10 h-10 bg-ink-600 rounded overflow-hidden flex-shrink-0">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-300 text-[10px]">
                    No img
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-ink-50 truncate">{product.name}</div>
                <div className="text-[10px] text-ink-200">
                  {product.quantity} đã bán
                </div>
              </div>

              {/* Revenue */}
              <div className="text-[12px] text-success font-mono">
                {formatCurrency(product.revenue)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
