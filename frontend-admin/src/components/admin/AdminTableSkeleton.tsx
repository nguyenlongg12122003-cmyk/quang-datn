import { Skeleton } from '@/components/ui/skeleton'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { cn } from '@/lib/utils'

interface AdminTableSkeletonProps {
  rows?: number
  columns?: number
}

export function AdminTableSkeleton({ rows = 5, columns = 5 }: AdminTableSkeletonProps) {
  return (
    <AdminDataPanel className="space-y-0 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 border-b border-border/50 py-3 last:border-0">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4',
                colIndex === 0 ? 'w-40' : colIndex === columns - 1 ? 'ml-auto w-16' : 'w-24',
              )}
            />
          ))}
        </div>
      ))}
    </AdminDataPanel>
  )
}