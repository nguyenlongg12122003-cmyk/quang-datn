import { useState } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RatingStars } from '@/components/common/RatingStars'
import { EmptyState } from '@/components/common/EmptyState'
import { ReviewSummary } from '@/features/product/ReviewSummary'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/axios'
import { useAuthStore } from '@/stores/auth-store'
import { useCreateReview, useProductReviews } from '@/features/catalog/api'

interface ProductReviewsProps {
  productId: string
  averageRating?: number
}

export function ProductReviews({ productId, averageRating }: ProductReviewsProps) {
  const { data: reviews = [], isLoading } = useProductReviews(productId)
  const token = useAuthStore((s) => s.token)
  const createReview = useCreateReview(productId)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const submit = () => {
    if (!comment.trim()) {
      toast.error('Vui lòng nhập nhận xét')
      return
    }
    createReview.mutate(
      { rating, comment: comment.trim() },
      {
        onSuccess: () => {
          toast.success('Cảm ơn đánh giá của bạn!')
          setComment('')
          setRating(5)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải đánh giá…</p>
      ) : reviews.length > 0 ? (
        <ReviewSummary reviews={reviews} averageRating={averageRating} />
      ) : null}

      {token ? (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Viết đánh giá</p>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} sao`}>
                <Star
                  className={cn(
                    'size-6 transition-colors',
                    i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button onClick={submit} disabled={createReview.isPending}>
            {createReview.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Đăng nhập để viết đánh giá.</p>
      )}

      {isLoading ? null : reviews.length === 0 ? (
        <EmptyState icon={Star} title="Chưa có đánh giá" description="Hãy là người đầu tiên đánh giá sản phẩm này." />
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="flex gap-3 border-b border-border pb-4 last:border-0">
              <Avatar>
                <AvatarImage src={r.userAvatar ?? undefined} alt={r.userName} />
                <AvatarFallback>{r.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.userName}</span>
                  {r.isVerifiedPurchase ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Đã mua hàng
                    </Badge>
                  ) : null}
                </div>
                <RatingStars rating={r.rating} />
                <p className="text-sm text-foreground">{r.comment}</p>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}