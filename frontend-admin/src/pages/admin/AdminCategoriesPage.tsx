import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useCategories } from '@/features/catalog/api'
import { useDeleteCategory, useSaveCategory } from '@/features/admin/api'
import { getErrorMessage } from '@/lib/api/axios'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'

export function AdminCategoriesPage() {
  const { data: categories = [] } = useCategories()
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', icon: '', description: '' })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', slug: '', icon: '', description: '' })
    setOpen(true)
  }
  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', description: c.description ?? '' })
    setOpen(true)
  }

  const submit = () => {
    if (!form.name.trim()) {
      toast.error('Nhập tên danh mục')
      return
    }
    const payload = { ...form, slug: form.slug || slugify(form.name) }
    saveCategory.mutate(
      { id: editing?.id, payload },
      {
        onSuccess: () => {
          toast.success(editing ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục')
          setOpen(false)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Danh mục</h1>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="size-4" /> Thêm danh mục
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Số sản phẩm</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                <TableCell>{c.productCount ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Sửa">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteId(c.id)}
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
            <DialogTitle>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên danh mục</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (tự tạo nếu để trống)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (tên lucide, tùy chọn)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saveCategory.isPending}>
              {saveCategory.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa danh mục?"
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteCategory.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa danh mục'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}
