import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { VoucherFormDialog } from '@/features/admin/VoucherFormDialog'
import { usePublicVouchers } from '@/features/vouchers/api'
import { useDeleteVoucher } from '@/features/admin/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Voucher } from '@/types'

export function AdminVouchersPage() {
  const { data: vouchers = [] } = usePublicVouchers()
  const deleteVoucher = useDeleteVoucher()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (v: Voucher) => {
    setEditing(v)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Voucher</h1>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="size-4" /> Tạo voucher
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          Danh sách hiển thị các voucher đang hoạt động (theo giới hạn API hiện tại).
        </AlertDescription>
      </Alert>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Giá trị</TableHead>
              <TableHead>Đơn tối thiểu</TableHead>
              <TableHead>Đã dùng</TableHead>
              <TableHead>HSD</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.code}</TableCell>
                <TableCell>
                  {v.type === 'fixed' ? formatCurrency(v.value) : `${v.value}%`}
                </TableCell>
                <TableCell>{formatCurrency(v.minOrderValue)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {v.usedCount ?? 0}/{v.usageLimit ?? '∞'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {v.endDate ? formatDate(v.endDate) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)} aria-label="Sửa">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteId(v.id)}
                    aria-label="Xóa"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <VoucherFormDialog open={open} onOpenChange={setOpen} voucher={editing} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa voucher?"
        description="Không thể xóa voucher đã dùng trong đơn hàng."
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteVoucher.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa voucher'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}
