interface OrderListEmptyStateProps {
  title: string
  hint?: string
}

export function OrderListEmptyState({ title, hint }: OrderListEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {hint ? <p className="max-w-md text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )
}