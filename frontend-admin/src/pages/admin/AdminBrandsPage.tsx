import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/common/ImageUploader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useBrands } from '@/features/catalog/api'
import { useDeleteBrand, useSaveBrand } from '@/features/admin/api'
import { getErrorMessage } from '@/lib/api/axios'
import type { Brand } from '@/types'

export function AdminBrandsPage() {
  const { data: brands = [] } = useBrands()
  const saveBrand = useSaveBrand()
  const deleteBrand = useDeleteBrand()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', logo: '' })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', logo: '' })
    setOpen(true)
  }
  const openEdit = (b: Brand) => {
    setEditing(b)
    setForm({ name: b.name, logo: b.logo ?? '' })
    setOpen(true)
  }

  const submit = () => {
    if (!form.name.trim()) {
      toast.error('Nhập tên thương hiệu')
      return
    }
    saveBrand.mutate(
      { id: editing?.id, payload: { name: form.name, logo: form.logo || undefined } },
      {
        onSuccess: () => {
          toast.success(editing ? 'Đã cập nhật' : 'Đã thêm thương hiệu')
          setOpen(false)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Thương hiệu</h1>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="size-4" /> Thêm thương hiệu
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="size-9 rounded object-contain" />
                  ) : (
                    <span className="grid size-9 place-items-center rounded bg-secondary text-xs font-bold text-primary">
                      {b.name.charAt(0)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)} aria-label="Sửa">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteId(b.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên thương hiệu</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <ImageUploader
                value={form.logo}
                onChange={(url) => setForm({ ...form, logo: url })}
                previewClassName="size-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saveBrand.isPending}>
              {saveBrand.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa thương hiệu?"
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteBrand.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}
