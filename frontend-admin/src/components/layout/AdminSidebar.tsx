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
  { to: '/vouchers', label: 'Voucher', icon: Ticket },
  { to: '/users', label: 'Người dùng', icon: Users },
  { to: '/support', label: 'Hỗ trợ', icon: MessagesSquare },
]

export function AdminSidebar() {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}