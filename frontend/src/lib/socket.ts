import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;
const reconnectListeners = new Set<() => void>();

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    if (socket?.recovered === false) {
      reconnectListeners.forEach((cb) => cb());
    }
  });

  socket.io.on('reconnect', () => {
    reconnectListeners.forEach((cb) => cb());
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  reconnectListeners.clear();
}

export function getSocket(): Socket | null {
  return socket;
}

export function onSocketReconnect(callback: () => void): () => void {
  reconnectListeners.add(callback);
  return () => { reconnectListeners.delete(callback); };
}
