import { Outlet } from 'react-router'
import { ExternalLink, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/common/Logo'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminAccountMenu } from '@/components/layout/AdminAccountMenu'
import { RouteProgress } from '@/components/layout/RouteProgress'

const STORE_URL = import.meta.env.VITE_STORE_URL ?? 'http://localhost:5173'

export function AdminLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <RouteProgress />
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar p-0">
            <SheetHeader className="border-b border-sidebar-border p-4">
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <AdminSidebar />
          </SheetContent>
        </Sheet>
        <Logo to="/" />
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          Quản trị
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Cửa hàng
            </a>
          </Button>
          <AdminAccountMenu />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <div className="sticky top-16">
            <AdminSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}