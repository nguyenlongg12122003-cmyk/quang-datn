import { Link } from 'react-router'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/components/common/ProductGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { useWishlist } from '@/features/wishlist/api'

export function WishlistPage() {
  const { data: items = [], isLoading } = useWishlist()

  return (
    <PageContainer className="space-y-6">
      <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
      {!isLoading && items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Chưa có sản phẩm yêu thích"
          description="Nhấn vào biểu tượng trái tim trên sản phẩm để lưu lại."
          action={
            <Button asChild>
              <Link to="/products">Khám phá sản phẩm</Link>
            </Button>
          }
        />
      ) : (
        <ProductGrid products={items} loading={isLoading} />
      )}
    </PageContainer>
  )
}
