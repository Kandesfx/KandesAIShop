'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Trophy, ArrowRight } from 'lucide-react'

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function TopProducts({ data }: TopProductsProps) {
  return (
    <div className="border border-ink-400 bg-ink-800/60 p-6 rounded-lg shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Trophy size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-display font-semibold text-ink-50">Top sản phẩm bán chạy</h3>
              <div className="text-[12px] text-ink-100 mt-0.5">Xếp hạng theo doanh số 30 ngày</div>
            </div>
          </div>
          <Link
            href="/manage/reports/top-products"
            className="text-[12px] text-electric hover:underline flex items-center gap-1 font-mono"
          >
            Báo cáo chi tiết <ArrowRight size={12} />
          </Link>
        </div>

        {data.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-ink-100 border border-dashed border-ink-400/60 rounded my-2">
            Chưa có dữ liệu đơn hàng trong 30 ngày qua
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.map((product, idx) => {
              const rankColor =
                idx === 0
                  ? 'bg-amber-500 text-ink-950 font-bold'
                  : idx === 1
                  ? 'bg-slate-300 text-ink-950 font-bold'
                  : idx === 2
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-ink-700 text-ink-100'

              return (
                <Link
                  key={product.id}
                  href={product.slug ? `/products/${product.slug}` : '#'}
                  className="flex items-center gap-3 p-2.5 hover:bg-ink-700/60 rounded-md border border-transparent hover:border-ink-400 transition-all group"
                >
                  {/* Rank Badge */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono flex-shrink-0 ${rankColor}`}
                  >
                    {idx + 1}
                  </span>

                  {/* Image */}
                  <div className="w-11 h-11 bg-ink-900 border border-ink-400/50 rounded overflow-hidden flex-shrink-0 relative">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={44}
                        height={44}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-100 text-[10px] font-mono">
                        NO IMG
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink-50 truncate group-hover:text-electric transition-colors">
                      {product.name}
                    </div>
                    <div className="text-[12px] text-ink-100 font-mono mt-0.5">
                      Đã bán: <strong className="text-ink-50">{product.quantity}</strong> lượt
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="text-right">
                    <div className="text-[13px] font-bold text-emerald-400 font-mono">
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
