import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Pagination } from '@/components/common/Pagination'
import { ProductFormDialog } from '@/features/admin/ProductFormDialog'
import { useProducts } from '@/features/catalog/api'
import { useDeleteProduct } from '@/features/admin/api'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency, formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Product } from '@/types'

const PAGE_SIZE = 12

export function AdminProductsPage() {
  // Admin sees all statuses (no status filter). Ask for a large page to approximate "all".
  const { data, isLoading } = useProducts({ limit: 200 })
  const products = data?.items ?? []
  const deleteProduct = useDeleteProduct()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    )
  }, [products, debounced])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sản phẩm ({filtered.length})</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm theo tên / SKU"
              className="w-56 pl-9"
            />
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="size-4" /> Thêm
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Tồn</TableHead>
              <TableHead>Đã bán</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="size-10 rounded object-cover" />
                      ) : (
                        <div className="size-10 rounded bg-muted" />
                      )}
                      <span className="line-clamp-2 max-w-xs text-sm font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell>{formatCurrency(p.price)}</TableCell>
                  <TableCell className={p.stock < 100 ? 'font-medium text-amber-600' : ''}>{p.stock}</TableCell>
                  <TableCell>{formatNumber(p.sold ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status === 'active' ? 'Đang bán' : p.status === 'inactive' ? 'Ngừng' : 'Nháp'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Sửa">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(p.id)}
                      aria-label="Xóa"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa sản phẩm?"
        description="Thao tác này không thể hoàn tác."
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteProduct.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa sản phẩm'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}
