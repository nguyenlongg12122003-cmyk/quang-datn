import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

/** Client-side pagination control (backend has no server pagination). */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null

  const pages = buildPageList(page, pageCount)

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Phân trang">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={`gap-${idx}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Trang sau"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}

function buildPageList(page: number, pageCount: number): Array<number | '...'> {
  const delta = 1
  const range: Array<number | '...'> = []
  const left = Math.max(2, page - delta)
  const right = Math.min(pageCount - 1, page + delta)

  range.push(1)
  if (left > 2) range.push('...')
  for (let i = left; i <= right; i++) range.push(i)
  if (right < pageCount - 1) range.push('...')
  if (pageCount > 1) range.push(pageCount)
  return range
}
