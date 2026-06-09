import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from '@/lib/constants'
import { getAccessToken } from '@/lib/auth-token'

let socket: Socket | null = null

/** Lazily creates (or returns) the singleton socket, authenticated with the current token. */
export function getSocket(): Socket {
  if (socket) return socket
  socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/** Reconnects with a fresh token (call after login/logout). */
export function reconnectSocket(): void {
  disconnectSocket()
  if (getAccessToken()) getSocket()
}
