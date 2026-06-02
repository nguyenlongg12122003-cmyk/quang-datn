import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LazyImage } from '@/components/ui/lazy-image';
import { aiChatApi, formatPrice, type ChatMessage, type ChatRecommendedProduct } from '@/lib/api-service';
import { useAuthStore } from '@/store/auth-store';
import { ChatPanel } from './shared/ChatPanel';
import { ChatLauncher } from './shared/ChatLauncher';
import { ChatComposer } from './shared/ChatComposer';
import { ChatLoadingSkeleton } from './shared/ChatLoadingSkeleton';
import { TypingDots } from './shared/TypingDots';

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

function ProductRecommendationCard({ product }: { product: ChatRecommendedProduct }) {
  return (
    <Link to={`/product/${product.slug}`} className="block">
      <Card className="group/card overflow-hidden rounded-[22px] border-emerald-100 bg-white py-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
        <CardContent className="flex gap-3 p-3">
          <LazyImage
            src={product.image || 'https://placehold.co/160x160?text=QuangVPP'}
            alt={product.name}
            className="h-20 w-20 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</div>
              <span className="shrink-0 text-sm font-bold text-emerald-700">{formatPrice(product.price)}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {product.isFlashSale && <Badge className="bg-rose-600 text-white">Flash Sale</Badge>}
              {product.isCustomizable && (
                <Badge variant="outline" className="border-emerald-200 text-emerald-700">Tùy chỉnh</Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {product.rating.toFixed(1)}/5 • {product.reviewCount} đánh giá • Đã bán {product.sold}
            </div>
            <div className="mt-2 line-clamp-2 text-xs text-slate-600">{product.reason}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 transition-colors group-hover/card:text-emerald-800">
              Xem chi tiết
              <ArrowRight className="h-3 w-3 transition-transform group-hover/card:translate-x-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AiProductAdvisorWidget() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

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

  const refreshMessages = async () => {
    const items = await aiChatApi.getMessages();
    setMessages(items);
    return items;
  };

  const pollForAiReply = async (customerMessageTimestamp: string) => {
    for (let attempt = 0; attempt < AI_POLL_ATTEMPTS; attempt += 1) {
      await wait(AI_POLL_DELAY_MS);
      try {
        const newItems = await aiChatApi.getNewMessages(customerMessageTimestamp);
        const hasAiReply = newItems.some((item) => item.senderRole !== 'customer');
        if (hasAiReply) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newItems.filter((m) => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
          if (openRef.current) {
            await aiChatApi.markRead().catch(() => {});
          } else {
            setUnreadCount((count) => count + 1);
          }
          return;
        }
      } catch {
        // continue polling on network errors
      }
    }
  };

  const submitPrompt = async (rawValue?: string) => {
    const text = String(rawValue ?? input).trim();
    if (!text || thinking) return;
    let messageSent = false;

    setInput('');
    setThinking(true);
    const sentAt = new Date().toISOString();
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
        timestamp: sentAt,
        isRead: false,
      },
    ]);

    try {
      const response = await aiChatApi.sendMessage(text);
      messageSent = true;
      await refreshMessages().catch(() => {});
      if (response.aiReplyScheduled) {
        await pollForAiReply(sentAt).catch(() => {});
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
        <ChatPanel
          onClose={() => setOpen(false)}
          className="border-emerald-200"
          headerClassName="border-b border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.28),_transparent_42%),linear-gradient(135deg,#0f172a,#064e3b)] text-white"
          bodyClassName="bg-[linear-gradient(180deg,rgba(236,253,245,0.55),rgba(255,255,255,0))]"
          scrollKey={`${messages.length}-${thinking}`}
          header={
            <>
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                <Sparkles className="h-3.5 w-3.5" />
                AI tư vấn
              </div>
              <div className="text-lg font-semibold leading-snug">Chọn sản phẩm đúng nhu cầu</div>
              <p className="text-sm text-white/75">
                Mô tả nhu cầu, mức giá hoặc môi trường sử dụng, mình sẽ đề xuất sản phẩm phù hợp.
              </p>
            </>
          }
          footer={
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={() => void submitPrompt()}
              disabled={!isAuthenticated || thinking}
              placeholder="Ví dụ: mình cần bút ký dưới 200k"
              sendButtonClassName="bg-emerald-700 hover:bg-emerald-800"
              textareaClassName="border-emerald-200 focus-visible:ring-emerald-500"
            />
          }
        >
          {!isAuthenticated ? (
            <div className="mt-10 rounded-3xl border border-dashed border-emerald-300 bg-white/80 p-5 text-center text-sm text-muted-foreground">
              Đăng nhập để dùng AI tư vấn sản phẩm và lưu lại lịch sử trao đổi.
              <div className="mt-3">
                <a href="/login" className="font-medium text-emerald-700 hover:underline">Đi tới đăng nhập</a>
              </div>
            </div>
          ) : loading ? (
            <ChatLoadingSkeleton accentClassName="bg-emerald-100" />
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
                  <div key={msg.id} className={`flex flex-col gap-2 ${isCustomer ? 'items-end' : 'items-start'}`}>
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
                          <ProductRecommendationCard key={product.id} product={product} />
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
                    <div className="flex items-center gap-2 text-emerald-700">
                      <TypingDots />
                      <span>Đang phân tích nhu cầu...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </ChatPanel>
      )}

      <ChatLauncher
        open={open}
        onToggle={() => {
          setOpen((value) => !value);
          setUnreadCount(0);
        }}
        icon={<Sparkles className="h-5 w-5" />}
        eyebrow="AI tư vấn"
        title="Gợi ý sản phẩm theo nhu cầu"
        ariaLabel="AI tư vấn sản phẩm"
        unreadCount={unreadCount}
        iconClassName="bg-emerald-700 text-white shadow-lg shadow-emerald-700/30"
        eyebrowClassName="text-emerald-700"
      />
    </div>
  );
}
