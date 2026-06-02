import { Link } from 'react-router'
import { Logo } from '@/components/common/Logo'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Văn phòng phẩm chất lượng cho học tập và công việc. Giao nhanh, giá tốt,
            tùy chỉnh in ấn theo yêu cầu.
          </p>
        </div>
        <FooterColumn
          title="Mua sắm"
          links={[
            { label: 'Tất cả sản phẩm', to: '/products' },
            { label: 'Flash Sale', to: '/products?isFlashSale=true' },
            { label: 'Voucher', to: '/vouchers' },
          ]}
        />
        <FooterColumn
          title="Tài khoản"
          links={[
            { label: 'Đơn hàng', to: '/orders' },
            { label: 'Yêu thích', to: '/wishlist' },
            { label: 'Voucher của tôi', to: '/my-vouchers' },
          ]}
        />
        <FooterColumn
          title="Hỗ trợ"
          links={[
            { label: 'Đăng nhập', to: '/login' },
            { label: 'Đăng ký', to: '/register' },
          ]}
        />
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} QuangVPP. Đã đăng ký bản quyền.
      </div>
    </footer>
  )
}

interface FooterColumnProps {
  title: string
  links: Array<{ label: string; to: string }>
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
