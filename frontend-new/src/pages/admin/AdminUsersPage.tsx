import { useState } from 'react'
import { Lock, Search, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminUsers, useSetUserRole, useSetUserStatus } from '@/features/admin/api'
import { useDebounce } from '@/hooks/use-debounce'
import { formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const q = useDebounce(search, 300)
  const { data: users = [], isLoading } = useAdminUsers({
    q: q || undefined,
    role: role === 'all' ? undefined : role,
  })
  const setStatus = useSetUserStatus()
  const setUserRole = useSetUserRole()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Người dùng</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên / email"
              className="w-56 pl-9"
            />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole | 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              <SelectItem value="customer">Khách hàng</SelectItem>
              <SelectItem value="staff">Nhân viên</SelectItem>
              <SelectItem value="admin">Quản trị</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tham gia</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Đang tải…</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarImage src={u.avatar ?? undefined} alt={u.name} />
                        <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        setUserRole.mutate(
                          { id: u.id, role: v as UserRole },
                          {
                            onSuccess: () => toast.success('Đã đổi vai trò'),
                            onError: (error) => toast.error(getErrorMessage(error)),
                          },
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue>{ROLE_LABELS[u.role]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Khách hàng</SelectItem>
                        <SelectItem value="staff">Nhân viên</SelectItem>
                        <SelectItem value="admin">Quản trị</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>
                      {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() =>
                        setStatus.mutate(
                          { id: u.id, status: u.status === 'active' ? 'locked' : 'active' },
                          {
                            onSuccess: () => toast.success('Đã cập nhật trạng thái'),
                            onError: (error) => toast.error(getErrorMessage(error)),
                          },
                        )
                      }
                    >
                      {u.status === 'active' ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                      {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
