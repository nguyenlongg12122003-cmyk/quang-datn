import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { queryClient } from '@/lib/query/queryClient'
import { registerUnauthorizedHandler } from '@/lib/auth-token'
import { useAuthStore } from '@/stores/auth-store'
import { disconnectSocket } from '@/lib/socket'
import App from './App.tsx'
import './index.css'

// Session-expiry: clear auth on any 401 so guards redirect to /login.
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout()
  disconnectSocket()
  queryClient.clear()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
