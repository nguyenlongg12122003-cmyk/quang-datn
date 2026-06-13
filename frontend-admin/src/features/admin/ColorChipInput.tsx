import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  isLightSwatch,
  resolveColorSwatch,
  SUGGESTED_COLOR_NAMES,
} from '@/features/admin/color-utils'
import { parseCsvField } from '@/features/admin/product-form-utils'

interface ColorChipInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

function chipsToValue(chips: string[]): string {
  return chips.join(', ')
}

export function ColorChipInput({ value, onChange, className, disabled }: ColorChipInputProps) {
  const [draft, setDraft] = useState('')
  const chips = parseCsvField(value)

  const addChip = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    const exists = chips.some((chip) => chip.toLowerCase() === next.toLowerCase())
    if (exists) return
    onChange(chipsToValue([...chips, next]))
    setDraft('')
  }

  const removeChip = (chip: string) => {
    onChange(chipsToValue(chips.filter((c) => c !== chip)))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip(draft)
    } else if (e.key === 'Backspace' && !draft && chips.length > 0) {
      removeChip(chips[chips.length - 1])
    }
  }

  const unusedSuggestions = SUGGESTED_COLOR_NAMES.filter(
    (name) => !chips.some((c) => c.toLowerCase() === name.toLowerCase()),
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5">
        {chips.map((chip) => {
          const swatch = resolveColorSwatch(chip)
          return (
            <Badge
              key={chip}
              variant="secondary"
              className="gap-1.5 pr-1 font-normal"
            >
              <span
                className={cn(
                  'size-3.5 shrink-0 rounded-full border',
                  isLightSwatch(swatch) ? 'border-border' : 'border-transparent',
                )}
                style={{ backgroundColor: swatch }}
                aria-hidden
              />
              {chip}
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Xóa ${chip}`}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          )
        })}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addChip(draft)}
          placeholder={chips.length ? 'Thêm màu…' : 'Đỏ, Xanh dương…'}
          disabled={disabled}
          className="h-7 min-w-[120px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {unusedSuggestions.slice(0, 6).map((name) => (
            <Button
              key={name}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => addChip(name)}
              disabled={disabled}
            >
              <span
                className={cn(
                  'size-3 rounded-full border',
                  isLightSwatch(resolveColorSwatch(name)) ? 'border-border' : 'border-transparent',
                )}
                style={{ backgroundColor: resolveColorSwatch(name) }}
                aria-hidden
              />
              {name}
            </Button>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Swatch trên cửa hàng dựa theo tên màu hoặc mã hex (#ff0000).
      </p>
    </div>
  )
}