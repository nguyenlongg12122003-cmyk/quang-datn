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
    <div className="flex min-h-svh flex-col bg-background">
      <RouteProgress />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-4 sm:gap-3 lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border p-4">
                <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
                <Logo to="/" />
              </SheetHeader>
              <AdminSidebar />
            </SheetContent>
          </Sheet>

          <Logo to="/" className="min-w-0" hideWordmarkBelowSm />
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Quản trị
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-2 px-2 text-muted-foreground sm:px-3"
            >
              <a
                href={STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mở cửa hàng"
              >
                <ExternalLink className="size-4 shrink-0" />
                <span className="hidden sm:inline">Cửa hàng</span>
              </a>
            </Button>
            <AdminAccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:block">
          <div className="sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto">
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