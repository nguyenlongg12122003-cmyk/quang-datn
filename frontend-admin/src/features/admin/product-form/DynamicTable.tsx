interface DynamicTableProps {
  headers: string[]
  columns?: string
  emptyText: string
  isEmpty: boolean
  children: React.ReactNode
}

export function DynamicTable({
  headers,
  columns = '1fr 1fr 40px',
  emptyText,
  isEmpty,
  children,
}: DynamicTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className="grid gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: columns }}
      >
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      {isEmpty ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="divide-y">{children}</div>
      )}
    </div>
  )
}

export function DynamicTableRow({
  columns,
  children,
}: {
  columns: string
  children: React.ReactNode
}) {
  return (
    <div
      className="grid items-center gap-3 px-3 py-2"
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  )
}