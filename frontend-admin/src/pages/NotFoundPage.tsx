import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'

export function NotFoundPage() {
  return (
    <PageContainer className="grid min-h-[60vh] place-items-center">
      <div className="space-y-4 text-center">
        <p className="text-6xl font-extrabold text-primary">404</p>
        <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
        <p className="text-muted-foreground">Trang bạn tìm có thể đã bị xóa hoặc thay đổi.</p>
        <Button asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
