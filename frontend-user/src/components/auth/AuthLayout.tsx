import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'

interface AuthLayoutProps {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative z-10">
          <Logo
            to="/"
            className="text-primary-foreground [&_span]:text-primary-foreground [&_span_span]:text-brand-200"
          />
        </div>

        <p className="relative z-10 max-w-xs text-lg font-medium leading-snug">
          Văn phòng phẩm chất lượng
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center bg-linear-to-b from-secondary/40 via-background to-background px-4 py-10 sm:px-8">
        <div className="mb-8 w-full max-w-md lg:hidden">
          <Logo to="/" className="justify-center" />
        </div>

        <div className="w-full max-w-md space-y-6">
          <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl lg:text-left">
            {title}
          </h1>

          <div
            className={cn(
              'rounded-2xl border bg-card/80 p-6 shadow-lg backdrop-blur-sm sm:p-8',
              'ring-1 ring-border/50'
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