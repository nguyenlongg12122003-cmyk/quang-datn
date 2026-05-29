import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { aiChatApi, formatPrice, type ChatMessage } from '@/lib/api-service';
import { useAuthStore } from '@/store/auth-store';

const starterPrompts = [
  'Mình cần bút viết êm cho học sinh cấp 2',
  'Gợi ý sổ tay nhỏ gọn để mang đi học',
  'Có sản phẩm nào phù hợp văn phòng 20 người không?',
];
const AI_POLL_ATTEMPTS = 15;
const AI_POLL_DELAY_MS = 2000;

function wait(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export function AiProductAdvisorWidget() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const introVisible = useMemo(() => messages.length === 0 && !loading, [messages.length, loading]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    aiChatApi.getMessages()
      .then((items) => setMessages(items))
      .catch(() => {})
      .finally(() => setLoading(false));
    aiChatApi.markRead().catch(() => {});
  }, [isAuthenticated, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const refreshMessages = async () => {
    const items = await aiChatApi.getMessages();
    setMessages(items);
    return items;
  };

  const pollForAiReply = async (customerMessageId: string) => {
    for (let attempt = 0; attempt < AI_POLL_ATTEMPTS; attempt += 1) {
      await wait(AI_POLL_DELAY_MS);
      const items = await refreshMessages();
      const customerIndex = items.findIndex((item) => item.id === customerMessageId);
      const hasNewAiReply = items.slice(customerIndex + 1).some((item) => item.senderRole !== 'customer');
      if (hasNewAiReply) {
        await aiChatApi.markRead().catch(() => {});
        return;
      }
    }
  };

  const submitPrompt = async (rawValue?: string) => {
    const text = String(rawValue ?? input).trim();
    if (!text || thinking) return;
    let messageSent = false;

    setInput('');
    setThinking(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        channel: 'ai',
        senderId: 'me',
        senderName: 'Bạn',
        senderRole: 'customer',
        message: text,
        metadata: null,
        timestamp: new Date().toISOString(),
        isRead: false,
      },
    ]);

    try {
      const response = await aiChatApi.sendMessage(text);
      messageSent = true;
      await refreshMessages().catch(() => {});
      if (response.aiReplyScheduled) {
        await pollForAiReply(response.id).catch(() => {});
      }
    } catch {
      if (!messageSent) {
        setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('temp-')));
      }
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="h-[520px] w-[min(92vw,23rem)] overflow-hidden rounded-[28px] border border-emerald-200 bg-background shadow-2xl">
          <div className="relative overflow-hidden border-b border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.28),_transparent_42%),linear-gradient(135deg,#0f172a,#064e3b)] px-4 py-4 text-white">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI tư vấn
                </div>
                <div className="text-lg font-semibold">Chọn sản phẩm đúng nhu cầu</div>
                <p className="max-w-xs text-sm text-white/75">
                  Mô tả nhu cầu, mức giá hoặc môi trường sử dụng, mình sẽ đề xuất sản phẩm phù hợp.
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

          <div className="flex h-[calc(520px-92px)] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(236,253,245,0.55),rgba(255,255,255,0))] px-3 py-3">
              {!isAuthenticated ? (
                <div className="mt-10 rounded-3xl border border-dashed border-emerald-300 bg-white/80 p-5 text-center text-sm text-muted-foreground">
                  Đăng nhập để dùng AI tư vấn sản phẩm và lưu lại lịch sử trao đổi.
                  <div className="mt-3">
                    <a href="/login" className="font-medium text-emerald-700 hover:underline">Đi tới đăng nhập</a>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <>
                  {introVisible && (
                    <div className="space-y-3 rounded-[24px] border border-emerald-100 bg-white/90 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                        <Bot className="h-4 w-4" />
                        Bạn có thể hỏi như sau
                      </div>
                      <div className="space-y-2">
                        {starterPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-left text-sm text-emerald-950 transition-colors hover:bg-emerald-100"
                            onClick={() => void submitPrompt(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isCustomer = msg.senderRole === 'customer';
                    const recommendedProducts = msg.metadata?.recommendedProducts ?? [];
                    return (
                      <div key={msg.id} className={`space-y-2 ${isCustomer ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`max-w-[82%] rounded-[22px] px-3 py-2 text-sm shadow-sm ${isCustomer ? 'rounded-br-sm bg-emerald-700 text-white' : 'rounded-bl-sm border border-emerald-100 bg-white text-slate-900'}`}>
                          {!isCustomer && (
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              <Bot className="h-3.5 w-3.5" />
                              AI tư vấn sản phẩm
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                        </div>

                        {!isCustomer && recommendedProducts.length > 0 && (
                          <div className="grid w-full grid-cols-1 gap-2">
                            {recommendedProducts.map((product) => (
                              <Link key={product.id} to={`/product/${product.slug}`} className="block">
                                <Card className="overflow-hidden rounded-[22px] border-emerald-100 bg-white py-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                  <CardContent className="flex gap-3 p-3">
                                    <img
                                      src={product.image || 'https://placehold.co/160x160?text=QuangVPP'}
                                      alt={product.name}
                                      className="h-20 w-20 rounded-2xl object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                                          {product.name}
                                        </div>
                                        <span className="shrink-0 text-sm font-bold text-emerald-700">
                                          {formatPrice(product.price)}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {product.isFlashSale && (
                                          <Badge className="bg-rose-600 text-white">Flash Sale</Badge>
                                        )}
                                        {product.isCustomizable && (
                                          <Badge variant="outline" className="border-emerald-200 text-emerald-700">Tùy chỉnh</Badge>
                                        )}
                                      </div>
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        {product.rating.toFixed(1)}/5 • {product.reviewCount} đánh giá • Đã bán {product.sold}
                                      </div>
                                      <div className="mt-2 line-clamp-2 text-xs text-slate-600">
                                        {product.reason}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {thinking && (
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-[22px] rounded-bl-sm border border-emerald-100 bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          <Bot className="h-3.5 w-3.5" />
                          AI tư vấn sản phẩm
                        </div>
                        Đang phân tích nhu cầu và đối chiếu catalog...
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-emerald-100 bg-white px-3 py-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void submitPrompt()}
                  disabled={!isAuthenticated || thinking}
                  placeholder="Ví dụ: mình cần bút ký dưới 200k"
                  className="h-10 rounded-full border-emerald-200 text-sm focus-visible:ring-emerald-500"
                />
                <Button
                  onClick={() => void submitPrompt()}
                  disabled={!isAuthenticated || !input.trim() || thinking}
                  className="h-10 w-10 rounded-full bg-emerald-700 hover:bg-emerald-800"
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
        onClick={() => setOpen((value) => !value)}
        className="group flex items-center gap-3 rounded-full border border-emerald-200 bg-white px-4 py-3 text-left shadow-xl transition-transform hover:-translate-y-0.5"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-700/30">
          {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">AI tư vấn</span>
          <span className="block text-sm font-medium text-slate-900">Gợi ý sản phẩm theo nhu cầu</span>
        </span>
      </button>
    </div>
  );
}
