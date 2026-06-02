import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  onClose: () => void;
  /** Header content (eyebrow + title + subtitle), rendered inside the colored bar. */
  header: ReactNode;
  /** Scrollable message area. */
  children: ReactNode;
  /** Footer (composer / locked state). */
  footer: ReactNode;
  /** Tailwind classes for the header bar background + text color. */
  headerClassName: string;
  /** Tailwind classes for the scroll body background. */
  bodyClassName?: string;
  /** Extra classes for the outer shell (e.g. border accent). */
  className?: string;
  /** Dependencies that should trigger an auto-scroll to bottom. */
  scrollKey: unknown;
}

/** Shared chat shell: rounded card with header, scrollable body, and footer. */
export function ChatPanel({
  onClose,
  header,
  children,
  footer,
  headerClassName,
  bodyClassName,
  className,
  scrollKey,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scrollKey]);

  return (
    <div
      className={cn(
        'flex h-[520px] w-[min(92vw,23rem)] flex-col overflow-hidden rounded-[28px] border bg-background shadow-2xl',
        className,
      )}
    >
      <div className={cn('relative shrink-0 overflow-hidden px-4 py-4', headerClassName)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">{header}</div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đóng cửa sổ chat"
            className="h-8 w-8 shrink-0 rounded-full text-current hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className={cn('flex-1', bodyClassName)}>
        <div className="space-y-3 px-3 py-3">
          {children}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background px-3 py-3">{footer}</div>
    </div>
  );
}
