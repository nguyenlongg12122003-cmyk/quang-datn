import { Outlet } from 'react-router'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RouteProgress } from '@/components/layout/RouteProgress'
import { ChatLauncher } from '@/components/chat/ChatLauncher'
import { PromoTopBar } from '@/features/home/PromoTopBar'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <RouteProgress />
      <PromoTopBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatLauncher />
    </div>
  )
}
