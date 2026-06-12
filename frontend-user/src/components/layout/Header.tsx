import { Link } from 'react-router'
import { ChevronDown, Heart, LayoutGrid, Menu, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Logo } from '@/components/common/Logo'
import { SearchBar } from '@/components/layout/SearchBar'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { useCategories } from '@/features/catalog/api'
import { useCartStore, selectCartCount } from '@/stores/cart-store'

export function Header() {
  const cartCount = useCartStore(selectCartCount)
  const { data: categories = [] } = useCategories()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              <Link to="/products" className="rounded-md px-3 py-2 text-sm hover:bg-accent">
                Tất cả sản phẩm
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.slug}`}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  {c.name}
                </Link>
              ))}
              <Link
                to="/products?isFlashSale=true"
                className="rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                Flash Sale
              </Link>
              <Link to="/vouchers" className="rounded-md px-3 py-2 text-sm hover:bg-accent">
                Voucher
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/products">Sản phẩm</Link>
          </Button>

          {categories.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <LayoutGrid className="size-4" aria-hidden />
                  Danh mục
                  <ChevronDown className="size-3.5 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {categories.map((c) => (
                  <DropdownMenuItem key={c.id} asChild>
                    <Link to={`/categories/${c.slug}`} className="cursor-pointer">
                      {c.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild>
                  <Link to="/products" className="cursor-pointer font-medium text-primary">
                    Xem tất cả sản phẩm
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {categories.slice(0, 3).map((c) => (
            <Button key={c.id} asChild variant="ghost" size="sm">
              <Link to={`/categories/${c.slug}`}>{c.name}</Link>
            </Button>
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link to="/products?isFlashSale=true">Flash Sale</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/vouchers">Voucher</Link>
          </Button>
        </nav>

        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button asChild variant="ghost" size="icon" aria-label="Yêu thích">
            <Link to="/wishlist">
              <Heart className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Giỏ hàng">
            <Link to="/cart">
              <ShoppingCart className="size-5" />
              {cartCount > 0 ? (
                <Badge className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px]">
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
          <AccountMenu />
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 md:hidden">
        <SearchBar />
      </div>
    </header>
  )
}
