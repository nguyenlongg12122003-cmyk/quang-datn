import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface AdminFilterChip {
  key: string
  label: string
  onRemove: () => void
}

interface AdminActiveFilterChipsProps {
  chips: AdminFilterChip[]
  onClearAll?: () => void
}

export function AdminActiveFilterChips({ chips, onClearAll }: AdminActiveFilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Đang áp dụng</span>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className="gap-1 rounded-full border-primary/20 bg-primary/5 pr-1 font-normal text-foreground"
        >
          {chip.label}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-5 rounded-full hover:bg-primary/10"
            onClick={chip.onRemove}
            aria-label={`Bỏ lọc ${chip.label}`}
          >
            <X className="size-3" />
          </Button>
        </Badge>
      ))}
      {onClearAll ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs text-muted-foreground"
          onClick={onClearAll}
        >
          Xóa tất cả
        </Button>
      ) : null}
    </div>
  )
}