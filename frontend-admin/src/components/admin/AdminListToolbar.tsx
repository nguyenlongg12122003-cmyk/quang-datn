import { useState, type ReactNode } from 'react'
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface AdminListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  activeFilterCount?: number
  filterTitle?: string
  footer?: ReactNode
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  sticky?: boolean
  className?: string
}

export function AdminListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm…',
  filters,
  activeFilterCount = 0,
  filterTitle = 'Bộ lọc',
  footer,
  hasActiveFilters = false,
  onClearFilters,
  onRefresh,
  isRefreshing = false,
  sticky = false,
  className,
}: AdminListToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)

  const handleClearFilters = () => {
    onClearFilters?.()
    setFilterOpen(false)
  }

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm',
          sticky &&
            'sticky top-14 z-30 -mx-4 rounded-none border-x-0 border-t-0 bg-background/95 shadow-md backdrop-blur-md lg:-mx-6',
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 border-border/80 bg-background pl-9 shadow-none"
            />
          </div>

          {filters ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFilterCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="size-5 rounded-full px-0 text-[11px] font-semibold"
                >
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
          ) : null}

          {hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </Button>
          ) : null}

          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Làm mới danh sách"
            >
              <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          ) : null}
        </div>

        {footer ? (
          <>
            <Separator />
            <div className="bg-muted/10 px-3 py-2.5">{footer}</div>
          </>
        ) : null}
      </div>

      {filters ? (
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
              <SheetTitle>{filterTitle}</SheetTitle>
              <SheetDescription>Chọn tiêu chí để thu hẹp danh sách.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{filters}</div>

            <SheetFooter className="flex-row gap-2 border-t border-border/70 px-5 py-4">
              {hasActiveFilters && onClearFilters ? (
                <Button type="button" variant="outline" onClick={handleClearFilters}>
                  Xóa bộ lọc
                </Button>
              ) : null}
              <Button type="button" className="flex-1" onClick={() => setFilterOpen(false)}>
                Áp dụng
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  )
}