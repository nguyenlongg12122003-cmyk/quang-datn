import { useMemo, useState } from 'react'
import { Lock, Unlock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AdminActiveFilterChips } from '@/components/admin/AdminActiveFilterChips'
import { AdminDataPanel } from '@/components/admin/AdminDataPanel'
import { AdminFilterField } from '@/components/admin/AdminFilterField'
import { AdminFilterSelect } from '@/components/admin/AdminFilterSelect'
import { AdminListToolbar } from '@/components/admin/AdminListToolbar'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { EmptyState } from '@/components/common/EmptyState'
import { useAdminUsers, useSetUserRole, useSetUserStatus } from '@/features/admin/api'
import { useAdminListRefetch } from '@/hooks/use-admin-list-refetch'
import { useDebounce } from '@/hooks/use-debounce'
import { formatDate, formatNumber } from '@/lib/format'
import { getErrorMessage } from '@/lib/api/axios'
import type { UserRole, UserStatus } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
}

const ROLE_OPTIONS = [
  { value: 'all', label: 'Tất cả vai trò' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'admin', label: 'Quản trị' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
]

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<UserStatus | 'all'>('all')
  const q = useDebounce(search, 300)

  const query = useMemo(
    () => ({
      q: q.trim() || undefined,
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
    }),
    [q, role, status],
  )

  const { data: users = [], isLoading, refetch } = useAdminUsers(query)
  const { refresh, isRefreshing } = useAdminListRefetch(refetch)
  const setUserStatus = useSetUserStatus()
  const setUserRole = useSetUserRole()

  const hasActiveFilters = Boolean(q.trim()) || role !== 'all' || status !== 'all'

  const filterChips = [
    q.trim()
      ? { key: 'q', label: `Tìm: "${q.trim()}"`, onRemove: () => setSearch('') }
      : null,
    role !== 'all'
      ? {
          key: 'role',
          label: ROLE_LABELS[role],
          onRemove: () => setRole('all'),
        }
      : null,
    status !== 'all'
      ? {
          key: 'status',
          label: STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status,
          onRemove: () => setStatus('all'),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>

  const resetFilters = () => {
    setSearch('')
    setRole('all')
    setStatus('all')
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Người dùng"
        description={
          isLoading
            ? 'Đang tải…'
            : `${formatNumber(users.length)} người dùng${hasActiveFilters ? ' phù hợp bộ lọc' : ''}`
        }
      />

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm tên, email, số điện thoại…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        activeFilterCount={filterChips.filter((chip) => chip.key !== 'q').length}
        footer={
          <AdminActiveFilterChips chips={filterChips} onClearAll={hasActiveFilters ? resetFilters : undefined} />
        }
        filters={
          <>
            <AdminFilterField label="Vai trò">
              <AdminFilterSelect
                value={role}
                onValueChange={(value) => setRole(value as UserRole | 'all')}
                options={ROLE_OPTIONS}
              />
            </AdminFilterField>
            <AdminFilterField label="Trạng thái">
              <AdminFilterSelect
                value={status}
                onValueChange={(value) => setStatus(value as UserStatus | 'all')}
                options={STATUS_OPTIONS}
              />
            </AdminFilterField>
          </>
        }
      />

      {isLoading ? (
        <AdminTableSkeleton rows={6} columns={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng'}
          description={
            hasActiveFilters
              ? 'Thử đổi từ khóa hoặc xóa bộ lọc.'
              : 'Người dùng sẽ xuất hiện khi có tài khoản đăng ký.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <AdminDataPanel className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tham gia</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border/60">
                          <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {user.phone ? (
                            <p className="text-xs text-muted-foreground">{user.phone}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          setUserRole.mutate(
                            { id: user.id, role: value as UserRole },
                            {
                              onSuccess: () => toast.success('Đã đổi vai trò'),
                              onError: (error) => toast.error(getErrorMessage(error)),
                            },
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-32 bg-background text-sm">
                          <SelectValue>{ROLE_LABELS[user.role]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Khách hàng</SelectItem>
                          <SelectItem value="staff">Nhân viên</SelectItem>
                          <SelectItem value="admin">Quản trị</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                        {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          setUserStatus.mutate(
                            { id: user.id, status: user.status === 'active' ? 'locked' : 'active' },
                            {
                              onSuccess: () => toast.success('Đã cập nhật trạng thái'),
                              onError: (error) => toast.error(getErrorMessage(error)),
                            },
                          )
                        }
                      >
                        {user.status === 'active' ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                        {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminDataPanel>

          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <AdminDataPanel key={user.id} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-border/60">
                    <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                    {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value) =>
                      setUserRole.mutate(
                        { id: user.id, role: value as UserRole },
                        {
                          onSuccess: () => toast.success('Đã đổi vai trò'),
                          onError: (error) => toast.error(getErrorMessage(error)),
                        },
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-full max-w-[160px] bg-background text-sm">
                      <SelectValue>{ROLE_LABELS[user.role]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Khách hàng</SelectItem>
                      <SelectItem value="staff">Nhân viên</SelectItem>
                      <SelectItem value="admin">Quản trị</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      setUserStatus.mutate(
                        { id: user.id, status: user.status === 'active' ? 'locked' : 'active' },
                        {
                          onSuccess: () => toast.success('Đã cập nhật trạng thái'),
                          onError: (error) => toast.error(getErrorMessage(error)),
                        },
                      )
                    }
                  >
                    {user.status === 'active' ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                    {user.status === 'active' ? 'Khóa' : 'Mở'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Tham gia {formatDate(user.createdAt)}</p>
              </AdminDataPanel>
            ))}
          </div>
        </>
      )}
    </div>
  )
}