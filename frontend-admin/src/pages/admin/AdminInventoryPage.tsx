import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { useInventoryAdjust, useInventoryMovements, useLowStockProducts } from '@/features/inventory/api'
import { inventoryApi } from '@/lib/api/endpoints/inventory'
import { catalogApi } from '@/lib/api/endpoints/catalog'
import { STOCK_MOVEMENT_TYPE_LABELS } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { Product } from '@/types'

const MOVEMENTS_PAGE_SIZE = 20

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function AdminInventoryPage() {
  const [movementPage, setMovementPage] = useState(1)
  const { data: lowStock = [] } = useLowStockProducts()
  const { data: movements, isLoading } = useInventoryMovements({
    page: movementPage,
    limit: MOVEMENTS_PAGE_SIZE,
  })
  const adjust = useInventoryAdjust()

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const debouncedSearch = useDebouncedValue(productSearch.trim())
  const [quantity, setQuantity] = useState('10')
  const [targetStock, setTargetStock] = useState('')
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [reason, setReason] = useState('')
  const [barcode, setBarcode] = useState('')

  const { data: searchResults } = useQuery({
    queryKey: ['inventory', 'product-search', debouncedSearch],
    queryFn: () => catalogApi.listProducts({ q: debouncedSearch, limit: 8, page: 1 }),
    enabled: debouncedSearch.length >= 2,
  })

  const selectProduct = (product: Product) => {
    setSelectedProduct(product)
    setProductSearch(product.name)
    setTargetStock(String(product.stock))
  }

  const submitAdjust = () => {
    if (!selectedProduct) {
      toast.error('Chọn sản phẩm trước khi điều chỉnh kho')
      return
    }

    const payload =
      type === 'adjustment'
        ? {
            productId: selectedProduct.id,
            type,
            targetStock: Number(targetStock),
            reason,
          }
        : {
            productId: selectedProduct.id,
            type,
            quantity: Number(quantity),
            reason,
          }

    adjust.mutate(payload, {
      onSuccess: (res) => {
        toast.success(`${res.message} (${res.stockBefore} → ${res.stockAfter})`)
        setSelectedProduct((prev) =>
          prev ? { ...prev, stock: res.stockAfter } : prev,
        )
        if (type === 'adjustment') {
          setTargetStock(String(res.stockAfter))
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const lookupBarcode = async () => {
    if (!barcode.trim()) return
    try {
      const product = await inventoryApi.byBarcode(barcode.trim())
      selectProduct(product)
      toast.success(`Đã chọn: ${product.name}`)
    } catch {
      toast.error('Không tìm thấy sản phẩm theo mã')
    }
  }

  const movementTotal = movements?.total ?? 0
  const movementPages = Math.max(1, Math.ceil(movementTotal / MOVEMENTS_PAGE_SIZE))

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Quản lý kho" description="Nhập/xuất kho, cảnh báo tồn thấp, quét barcode khi đóng gói." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Điều chỉnh tồn kho</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Quét barcode / SKU</Label>
              <div className="flex gap-2">
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Nhập mã và Enter"
                  onKeyDown={(e) => e.key === 'Enter' && lookupBarcode()}
                />
                <Button variant="outline" onClick={lookupBarcode}>Tìm</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tìm sản phẩm</Label>
              <Input
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value)
                  if (!e.target.value.trim()) setSelectedProduct(null)
                }}
                placeholder="Nhập tên, SKU hoặc mã sản phẩm"
              />
              {debouncedSearch.length >= 2 && searchResults?.items.length ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  {searchResults.items.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60"
                      onClick={() => selectProduct(product)}
                    >
                      <span className="min-w-0 truncate font-medium">{product.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {product.sku} · tồn {product.stock}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedProduct ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-muted-foreground">
                  SKU {selectedProduct.sku} · Tồn hiện tại:{' '}
                  <span className="font-semibold text-foreground">{selectedProduct.stock}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa chọn sản phẩm.</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Loại</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Nhập kho</SelectItem>
                    <SelectItem value="out">Xuất kho</SelectItem>
                    <SelectItem value="adjustment">Kiểm kê (đặt tồn thực tế)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{type === 'adjustment' ? 'Tồn sau kiểm kê' : 'Số lượng'}</Label>
                {type === 'adjustment' ? (
                  <Input
                    type="number"
                    min={0}
                    value={targetStock}
                    onChange={(e) => setTargetStock(e.target.value)}
                  />
                ) : (
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lý do</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button onClick={submitAdjust} disabled={adjust.isPending || !selectedProduct}>
              Cập nhật kho
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cảnh báo tồn thấp ({lowStock.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có sản phẩm tồn thấp.</p>
            ) : lowStock.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted/50"
                onClick={() => selectProduct(p)}
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-muted-foreground">SKU {p.sku}</p>
                </div>
                <Badge variant="destructive">
                  {p.stock} / ngưỡng {p.lowStockThreshold ?? 10}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <AdminDataPanel>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium">Lịch sử biến động kho</span>
          {movementTotal > 0 ? (
            <span className="text-sm text-muted-foreground">{movementTotal} bản ghi</span>
          ) : null}
        </div>
        {isLoading ? <p className="p-4 text-sm text-muted-foreground">Đang tải...</p> : null}
        {!isLoading && !movements?.items.length ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có biến động kho.</p>
        ) : null}
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Thời gian</th>
                <th className="p-2">Sản phẩm</th>
                <th className="p-2">Loại</th>
                <th className="p-2">SL</th>
                <th className="p-2">Trước → Sau</th>
                <th className="p-2">Lý do</th>
              </tr>
            </thead>
            <tbody>
              {movements?.items.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2">{formatDateTime(m.createdAt)}</td>
                  <td className="p-2">{m.productName}</td>
                  <td className="p-2">{STOCK_MOVEMENT_TYPE_LABELS[m.type]}</td>
                  <td className="p-2">{m.quantity}</td>
                  <td className="p-2">{m.stockBefore} → {m.stockAfter}</td>
                  <td className="p-2 text-muted-foreground">{m.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {movementPages > 1 ? (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={movementPage <= 1}
              onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {movementPage} / {movementPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={movementPage >= movementPages}
              onClick={() => setMovementPage((p) => Math.min(movementPages, p + 1))}
            >
              Sau
            </Button>
          </div>
        ) : null}
      </AdminDataPanel>
    </div>
  )
}