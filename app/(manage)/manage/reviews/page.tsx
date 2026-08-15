import { db } from '@/lib/db'
import { ReviewsList } from '@/components/admin/reviews/reviews-list'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  // Lấy initial data
  const reviews = await db.review.findMany({
    where: { status: 'pending', deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      product: { select: { id: true, name: true, slug: true } },
      replies: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })

  const total = await db.review.count({ where: { status: 'pending', deletedAt: null } })

  const initialData = {
    reviews: reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.isAnonymous ? 'Ẩn danh' : (r.user.name ?? 'Người dùng'),
      userEmail: r.user.email,
      userAvatarUrl: r.user.avatarUrl,
      productId: r.productId,
      productName: r.product.name,
      productSlug: r.product.slug,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isAnonymous: r.isAnonymous,
      status: r.status,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
      reply: r.replies[0]
        ? {
            id: r.replies[0].id,
            content: r.replies[0].content,
            createdAt: r.replies[0].createdAt.toISOString(),
          }
        : null,
    })),
    page: 1,
    total,
    hasMore: total > 20,
  }

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / REVIEWS ]
        </span>
        <h1 className="text-display-lg font-display">
          Reviews
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Duyệt và quản lý đánh giá sản phẩm
        </p>
      </div>

      {/* Reviews List */}
      <ReviewsList initialData={initialData} />
    </div>
  )
}
