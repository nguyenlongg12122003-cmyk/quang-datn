import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  'aria-invalid'?: boolean
}

function parseDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className,
  disabled,
  id,
  'aria-invalid': ariaInvalid,
}: CurrencyInputProps) {
  const digits = parseDigits(value)
  const display = digits ? formatNumber(Number(digits)) : ''

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className="pr-8"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        đ
      </span>
    </div>
  )
}