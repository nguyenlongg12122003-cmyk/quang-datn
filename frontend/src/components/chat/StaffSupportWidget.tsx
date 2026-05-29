import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supportChatApi, type ChatMessage } from '@/lib/api-service';
import { connectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';

export function StaffSupportWidget() {
  const { isAuthenticated, token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    supportChatApi.getMessages()
      .then((items) => setMessages(items))
      .catch(() => {})
      .finally(() => setLoading(false));
    supportChatApi.markRead().catch(() => {});
  }, [isAuthenticated, open]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = token ? connectSocket(token) : getSocket();
    if (!socket) return;

    const handler = (msg: ChatMessage) => {
      if (msg.channel !== 'support') return;
      setMessages((prev) => prev.find((item) => item.id === msg.id) ? prev : [...prev, msg]);
      if (!open && msg.senderRole === 'admin') {
        setUnreadCount((count) => count + 1);
      }
    };

    socket.on('new_message', handler);
    return () => { socket.off('new_message', handler); };
  }, [isAuthenticated, open, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', { channel: 'support', message: text }, (result?: { error?: string }) => {
        if (result?.error) {
          setInput(text);
        }
      });
      return;
    }

    try {
      await supportChatApi.sendMessage(text);
      const items = await supportChatApi.getMessages();
      setMessages(items);
    } catch {
      setInput(text);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
      {open && (
        <div className="h-[430px] w-[min(92vw,21rem)] overflow-hidden rounded-[26px] border border-slate-200 bg-background shadow-2xl">
          <div className="border-b bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Nhân viên hỗ trợ</div>
                <div className="mt-1 text-lg font-semibold">Trao đổi trực tiếp với cửa hàng</div>
                <p className="mt-1 text-sm text-slate-300">
                  Dùng khi bạn cần báo giá, xử lý đơn hàng hoặc hỗ trợ thủ công.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex h-[calc(430px-96px)] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3">
              {!isAuthenticated ? (
                <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-muted-foreground">
                  Đăng nhập để trao đổi trực tiếp với nhân viên hỗ trợ.
                  <div className="mt-3">
                    <a href="/login" className="font-medium text-slate-900 hover:underline">Đi tới đăng nhập</a>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 text-center text-sm text-muted-foreground">
                  Gửi tin nhắn để kết nối với nhân viên. Các yêu cầu báo giá và hỗ trợ đơn hàng nên gửi ở đây.
                </div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.senderRole === 'customer';
                  return (
                    <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-[22px] px-3 py-2 text-sm shadow-sm ${isCustomer ? 'rounded-br-sm bg-slate-900 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-900'}`}>
                        {!isCustomer && (
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            <UserRound className="h-3.5 w-3.5" />
                            {msg.senderName}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t bg-white px-3 py-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
                  disabled={!isAuthenticated}
                  placeholder="Nhập yêu cầu cần nhân viên hỗ trợ..."
                  className="h-10 rounded-full text-sm"
                />
                <Button
                  onClick={() => void sendMessage()}
                  disabled={!isAuthenticated || !input.trim()}
                  className="h-10 w-10 rounded-full"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setOpen((value) => !value);
          setUnreadCount(0);
        }}
        className="group flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-left shadow-xl transition-transform hover:-translate-y-0.5"
      >
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white">
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          {!open && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Nhân viên</span>
          <span className="block text-sm font-medium text-slate-900">Chat trực tiếp với cửa hàng</span>
        </span>
      </button>
    </div>
  );
}
