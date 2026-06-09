import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const SKELETON_ROWS = 5

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="size-4" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1 h-3 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-1 h-3 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-1 h-3 w-14" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24 rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-8 w-24" />
      </TableCell>
    </TableRow>
  )
}

function CardSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-full" />
    </Card>
  )
}

export function OrderListSkeleton() {
  return (
    <>
      <Card className="hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 9 }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <TableRowSkeleton key={index} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </>
  )
}