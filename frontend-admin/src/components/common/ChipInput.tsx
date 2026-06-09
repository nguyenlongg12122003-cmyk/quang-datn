import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChipInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function parseChips(value: string): string[] {
  return value
    .split(',')
    .map((chip) => chip.trim())
    .filter(Boolean)
}

function chipsToValue(chips: string[]): string {
  return chips.join(', ')
}

export function ChipInput({
  value,
  onChange,
  placeholder = 'Nhập rồi nhấn Enter',
  className,
  disabled,
}: ChipInputProps) {
  const [draft, setDraft] = useState('')
  const chips = parseChips(value)

  const addChip = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    const exists = chips.some((chip) => chip.toLowerCase() === next.toLowerCase())
    if (exists) return
    onChange(chipsToValue([...chips, next]))
    setDraft('')
  }

  const removeChip = (index: number) => {
    onChange(chipsToValue(chips.filter((_, i) => i !== index)))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip(draft)
    } else if (e.key === 'Backspace' && !draft && chips.length > 0) {
      removeChip(chips.length - 1)
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 shadow-xs transition-colors',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {chips.map((chip, index) => (
        <Badge key={`${chip}-${index}`} variant="secondary" className="gap-1 pr-1 font-normal">
          {chip}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
            onClick={() => removeChip(index)}
            disabled={disabled}
            aria-label={`Xóa ${chip}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addChip(draft)}
        placeholder={chips.length === 0 ? placeholder : 'Thêm…'}
        disabled={disabled}
        className="h-7 min-w-[120px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  )
}