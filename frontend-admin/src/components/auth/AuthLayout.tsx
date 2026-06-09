import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'

interface AuthLayoutProps {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-brand-50 via-background to-brand-100/60 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-brand-200/40 blur-3xl"
        />

        <div className="relative z-10">
          <Logo to="/" />
        </div>

        <Badge variant="secondary" className="relative z-10 w-fit">
          Khu vực quản trị
        </Badge>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 w-full max-w-md lg:hidden">
          <Logo to="/" className="justify-center" />
        </div>

        <div className="w-full max-w-md space-y-6">
          <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl lg:text-left">
            {title}
          </h1>

          <div
            className={cn(
              'rounded-2xl border bg-card p-6 shadow-sm sm:p-8',
              'ring-1 ring-border/60'
            )}
          >
            {children}
          </div>

          {footer ? <div className="text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}