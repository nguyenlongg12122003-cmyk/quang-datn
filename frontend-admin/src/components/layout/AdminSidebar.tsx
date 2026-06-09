import { NavLink } from 'react-router'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  ShoppingBag,
  Ticket,
  Users,
  MessagesSquare,
  Warehouse,
  Building2,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Sản phẩm', icon: Package },
  { to: '/categories', label: 'Danh mục', icon: FolderTree },
  { to: '/brands', label: 'Thương hiệu', icon: Tags },
  { to: '/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { to: '/quotations', label: 'Báo giá B2B', icon: FileText },
  { to: '/inventory', label: 'Kho hàng', icon: Warehouse },
  { to: '/business', label: 'Doanh nghiệp', icon: Building2 },
  { to: '/vouchers', label: 'Voucher', icon: Ticket },
  { to: '/users', label: 'Người dùng', icon: Users },
  { to: '/support', label: 'Hỗ trợ', icon: MessagesSquare },
]

export function AdminSidebar() {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-primary/10 text-primary shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}