import { Outlet } from 'react-router'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RouteProgress } from '@/components/layout/RouteProgress'
import { ChatLauncher } from '@/components/chat/ChatLauncher'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <RouteProgress />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatLauncher />
    </div>
  )
}
