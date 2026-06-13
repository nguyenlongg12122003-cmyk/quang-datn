import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: string
  children: React.ReactNode
  className?: string
  error?: string
  required?: boolean
  description?: string
  'data-field'?: string
}

export function FormField({
  label,
  children,
  className,
  error,
  required,
  description,
  'data-field': dataField,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)} data-field={dataField}>
      {label ? (
        <Label className="text-sm font-medium">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}