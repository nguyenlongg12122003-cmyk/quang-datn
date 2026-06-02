import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supportChatApi, type ChatMessage, type ChatConversation } from '@/lib/api-service';
import { connectSocket, getSocket, onSocketReconnect } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';

const quoteTagMap: Record<string, { label: string; className: string }> = {
  '[YEU_CAU_BAO_GIA_MUA_SI]': { label: 'Báo giá mua sỉ', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  '[YEU_CAU_BAO_GIA_TUY_CHINH]': { label: 'Báo giá tùy chỉnh', className: 'bg-purple-100 text-purple-800 border-purple-200' },
};

function parseTaggedMessage(raw: string) {
  const lines = raw.split('\n');
  const firstLine = lines[0]?.trim();
  const tagConfig = firstLine ? quoteTagMap[firstLine] : undefined;
  if (!tagConfig) {
    return { tag: null, body: raw };
  }
  return {
    tag: { key: firstLine, ...tagConfig },
    body: lines.slice(1).join('\n').trim(),
  };
}

function timeAgo(isoStr: string): string {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

export function AdminChat() {
  const { user, token } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const refreshConversations = () => {
    supportChatApi.getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  };

  useEffect(() => {
    refreshConversations();
    const interval = setInterval(refreshConversations, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedUserId) return;
    setLoadingMsgs(true);
    supportChatApi.getMessages(selectedUserId)
      .then(msgs => { setMessages(msgs); })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
    // Mark as read
    supportChatApi.markRead(selectedUserId).catch(() => {});
    // Update unread count in conversations list
    setConversations(prev => prev.map(c => c.userId === selectedUserId ? { ...c, unreadCount: 0 } : c));
  }, [selectedUserId]);

  // Realtime socket subscription
  useEffect(() => {
    const socket = token ? connectSocket(token) : getSocket();
    if (!socket) return;

    const handler = (msg: ChatMessage) => {
      if (msg.channel !== 'support') return;
      const conversationUserId = msg.senderRole === 'customer' ? msg.senderId : msg.targetUserId;
      if (!conversationUserId) return;

      if (selectedUserId && conversationUserId === selectedUserId) {
        setMessages(prev => {
          const withoutTemp = prev.filter(m => !(m.id.startsWith('temp-') && m.message === msg.message && m.senderRole === msg.senderRole));
          if (withoutTemp.find(m => m.id === msg.id)) return withoutTemp;
          return [...withoutTemp, msg];
        });
        if (msg.senderRole === 'customer') {
          supportChatApi.markRead(selectedUserId).catch(() => {});
        }
      } else {
        setConversations(prev => {
          const existingIdx = prev.findIndex(c => c.userId === conversationUserId);
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              unreadCount: msg.senderRole === 'customer'
                ? updated[existingIdx].unreadCount + 1
                : updated[existingIdx].unreadCount,
              lastMessage: msg.message,
              lastMessageAt: msg.timestamp,
            };
            return updated;
          }
          refreshConversations();
          return prev;
        });
      }
    };

    socket.on('new_message', handler);

    const unsubReconnect = onSocketReconnect(() => {
      refreshConversations();
      if (selectedUserId) {
        supportChatApi.getMessages(selectedUserId).then(setMessages).catch(() => {});
      }
    });

    return () => {
      socket.off('new_message', handler);
      unsubReconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedUserId) return;
    const text = input.trim();
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      channel: 'support',
      senderId: user?.id || '',
      senderName: user?.name || 'Admin',
      senderRole: 'admin',
      targetUserId: selectedUserId,
      message: text,
      metadata: null,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', { channel: 'support', message: text, targetUserId: selectedUserId }, (result?: { ok?: boolean; id?: string; error?: string }) => {
        if (result?.error) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setInput(text);
        } else if (result?.id) {
          setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: result.id! } : m));
        }
      });
    } else {
      try {
        await supportChatApi.sendMessage(text, selectedUserId);
        const msgs = await supportChatApi.getMessages(selectedUserId);
        setMessages(msgs);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(text);
      }
    }
  };

  const filteredConvs = conversations.filter(c =>
    c.userName.toLowerCase().includes(searchQ.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="flex h-[calc(100vh-4rem)] border rounded-xl overflow-hidden">
      {/* Left: Conversations list */}
      <div className="w-72 shrink-0 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-primary" /> Chat hỗ trợ
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Tìm khách hàng..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">Chưa có cuộc trò chuyện</div>
          ) : (
            <div className="divide-y">
              {filteredConvs.map(conv => (
                (() => {
                  const parsed = parseTaggedMessage(conv.lastMessage || '');
                  return (
                <button
                  key={conv.userId}
                  className={`w-full text-left p-3 hover:bg-accent transition-colors flex gap-3 items-start ${selectedUserId === conv.userId ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedUserId(conv.userId)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={conv.userAvatar} />
                    <AvatarFallback className="text-xs">{conv.userName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate">{conv.userName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                    </div>
                    {parsed.tag ? (
                      <div className="mt-0.5 space-y-1">
                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${parsed.tag.className}`}>{parsed.tag.label}</Badge>
                        <p className="text-xs text-muted-foreground truncate">{parsed.body || 'Yêu cầu báo giá mới'}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="ml-1 h-5 min-w-5 px-1 text-xs rounded-full shrink-0">{conv.unreadCount}</Badge>
                  )}
                </button>
                  );
                })()
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageCircle className="h-16 w-16 opacity-20" />
            <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b flex items-center gap-3 bg-background">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedConv?.userAvatar} />
                <AvatarFallback className="text-xs">{selectedConv?.userName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm">{selectedConv?.userName}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedConv?.lastMessageAt
                    ? `Tin nhắn gần nhất: ${timeAgo(selectedConv.lastMessageAt)} trước`
                    : 'Khách hàng'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
              {loadingMsgs ? (
                <div className="flex justify-center pt-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm pt-8">Chưa có tin nhắn</div>
              ) : (
                messages.map(msg => {
                  const isAdmin = msg.senderRole === 'admin';
                  const parsed = parseTaggedMessage(msg.message);
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      {!isAdmin && (
                        <Avatar className="h-7 w-7 shrink-0 mt-1">
                          <AvatarImage src={selectedConv?.userAvatar} />
                          <AvatarFallback className="text-xs">{msg.senderName[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[60%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        {!isAdmin && <span className="text-xs text-muted-foreground px-1">{msg.senderName}</span>}
                        <div className={`rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-background border rounded-bl-sm'}`}>
                          {parsed.tag && (
                            <Badge variant="outline" className={`mb-1 text-[10px] py-0 px-1.5 ${parsed.tag.className}`}>
                              {parsed.tag.label}
                            </Badge>
                          )}
                          <div className="whitespace-pre-wrap break-words">{parsed.body || msg.message}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isAdmin && (
                        <Avatar className="h-7 w-7 shrink-0 mt-1">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">{user?.name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2 bg-background">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
                placeholder={`Trả lời ${selectedConv?.userName ?? ''}...`}
                className="text-sm"
              />
              <Button onClick={() => void sendMessage()} disabled={!input.trim()} className="shrink-0 gap-1">
                <Send className="h-4 w-4" /> Gửi
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
