import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supportChatApi, type ChatMessage } from '@/lib/api-service';
import { connectSocket, getSocket, onSocketReconnect } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { ChatPanel } from './shared/ChatPanel';
import { ChatLauncher } from './shared/ChatLauncher';
import { ChatComposer } from './shared/ChatComposer';
import { ChatLoadingSkeleton } from './shared/ChatLoadingSkeleton';
import { groupConsecutiveMessages } from './shared/groupMessages';

export function StaffSupportWidget() {
  const { isAuthenticated, token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const groups = useMemo(() => groupConsecutiveMessages(messages), [messages]);

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
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !(m.id.startsWith('temp-') && m.message === msg.message && m.senderRole === msg.senderRole));
        if (withoutTemp.find((item) => item.id === msg.id)) return withoutTemp;
        return [...withoutTemp, msg];
      });
      if (!open && msg.senderRole === 'admin') {
        setUnreadCount((count) => count + 1);
      }
    };

    socket.on('new_message', handler);

    const unsubReconnect = onSocketReconnect(() => {
      supportChatApi.getMessages().then(setMessages).catch(() => {});
    });

    return () => {
      socket.off('new_message', handler);
      unsubReconnect();
    };
  }, [isAuthenticated, open, token]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      channel: 'support',
      senderId: 'me',
      senderName: 'Bạn',
      senderRole: 'customer',
      message: text,
      metadata: null,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', { channel: 'support', message: text }, (result?: { ok?: boolean; id?: string; error?: string }) => {
        if (result?.error) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setInput(text);
        } else if (result?.id) {
          setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: result.id! } : m));
        }
      });
      return;
    }

    try {
      await supportChatApi.sendMessage(text);
      const items = await supportChatApi.getMessages();
      setMessages(items);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
      {open && (
        <ChatPanel
          onClose={() => setOpen(false)}
          className="border-slate-200"
          headerClassName="border-b border-slate-800 bg-slate-950 text-white"
          bodyClassName="bg-slate-50"
          scrollKey={messages.length}
          header={
            <>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Nhân viên hỗ trợ</div>
              <div className="text-lg font-semibold leading-snug">Trao đổi trực tiếp với cửa hàng</div>
              <p className="text-sm text-slate-300">
                Dùng khi bạn cần báo giá, xử lý đơn hàng hoặc hỗ trợ thủ công.
              </p>
            </>
          }
          footer={
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={() => void sendMessage()}
              disabled={!isAuthenticated}
              placeholder="Nhập yêu cầu cần nhân viên hỗ trợ... (Shift+Enter để xuống dòng)"
              sendButtonClassName="bg-slate-900 hover:bg-slate-800"
              textareaClassName="focus-visible:ring-slate-400"
            />
          }
        >
          {!isAuthenticated ? (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-muted-foreground">
              Đăng nhập để trao đổi trực tiếp với nhân viên hỗ trợ.
              <div className="mt-3">
                <a href="/login" className="font-medium text-slate-900 hover:underline">Đi tới đăng nhập</a>
              </div>
            </div>
          ) : loading ? (
            <ChatLoadingSkeleton />
          ) : messages.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 text-center text-sm text-muted-foreground">
              Gửi tin nhắn để kết nối với nhân viên. Các yêu cầu báo giá và hỗ trợ đơn hàng nên gửi ở đây.
            </div>
          ) : (
            groups.map((group) => {
              const isCustomer = group.senderRole === 'customer';
              return (
                <div key={group.key} className={`flex flex-col gap-1 ${isCustomer ? 'items-end' : 'items-start'}`}>
                  {!isCustomer && (
                    <div className="flex items-center gap-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Avatar size="sm" className="bg-slate-900 text-white">
                        <AvatarFallback className="bg-slate-900 text-white">
                          <UserRound className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      {group.senderName}
                    </div>
                  )}
                  {group.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[82%] rounded-[22px] px-3 py-2 text-sm shadow-sm ${isCustomer ? 'rounded-br-sm bg-slate-900 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-900'}`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </ChatPanel>
      )}

      <ChatLauncher
        open={open}
        onToggle={() => {
          setOpen((value) => !value);
          setUnreadCount(0);
        }}
        icon={<MessageCircle className="h-5 w-5" />}
        eyebrow="Nhân viên"
        title="Chat trực tiếp với cửa hàng"
        ariaLabel="Chat với nhân viên hỗ trợ"
        unreadCount={unreadCount}
        iconClassName="bg-slate-900 text-white"
        eyebrowClassName="text-slate-500"
      />
    </div>
  );
}
