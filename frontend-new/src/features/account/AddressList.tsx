import { useState } from 'react'
import { MapPin, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AddressFormDialog } from '@/features/account/AddressFormDialog'
import { useDeleteAddress, useSetDefaultAddress } from '@/features/account/api'
import { useAuthStore } from '@/stores/auth-store'
import { getErrorMessage } from '@/lib/api/axios'
import { cn } from '@/lib/utils'
import type { Address } from '@/types'

const EMPTY_ADDRESSES: Address[] = []

export function AddressList() {
  // Select the (stable) array ref; never build a new array inside the selector
  // or zustand's useSyncExternalStore will loop ("Maximum update depth exceeded").
  const addresses = useAuthStore((s) => s.user?.addresses ?? EMPTY_ADDRESSES)
  const deleteAddress = useDeleteAddress()
  const setDefault = useSetDefaultAddress()
  const [addDialog, setAddDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setAddDialog(true)}>
          <Plus className="size-4" /> Thêm địa chỉ
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="Chưa có địa chỉ" description="Thêm địa chỉ để thanh toán nhanh hơn." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <Card key={addr.id} className={cn(addr.isDefault && 'border-primary')}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {addr.name} · {addr.phone}
                  </p>
                  {addr.isDefault ? (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Star className="size-3 fill-primary" /> Mặc định
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                </p>
                <div className="flex gap-2 pt-1">
                  {!addr.isDefault ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDefault.mutate(addr.id, {
                          onSuccess: () => toast.success('Đã đặt làm mặc định'),
                          onError: (error) => toast.error(getErrorMessage(error)),
                        })
                      }
                    >
                      Đặt mặc định
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive"
                    onClick={() => setDeleteId(addr.id)}
                  >
                    <Trash2 className="size-4" /> Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddressFormDialog open={addDialog} onOpenChange={setAddDialog} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xóa địa chỉ?"
        description="Bạn có chắc muốn xóa địa chỉ này?"
        destructive
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!deleteId) return
          deleteAddress.mutate(deleteId, {
            onSuccess: () => toast.success('Đã xóa địa chỉ'),
            onError: (error) => toast.error(getErrorMessage(error)),
          })
          setDeleteId(null)
        }}
      />
    </div>
  )
}
