import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatLauncherProps {
  open: boolean;
  onToggle: () => void;
  /** Icon shown when the panel is closed. */
  icon: ReactNode;
  /** Small uppercase eyebrow label, e.g. "AI tư vấn". */
  eyebrow: string;
  /** Main label, e.g. "Gợi ý sản phẩm theo nhu cầu". */
  title: string;
  /** Accessible label / tooltip text for the icon-only state. */
  ariaLabel: string;
  unreadCount?: number;
  /** Tailwind classes for the circular icon container (background + text). */
  iconClassName: string;
  eyebrowClassName: string;
}

/** Floating action button that opens a chat panel. Shared by both chat widgets. */
export function ChatLauncher({
  open,
  onToggle,
  icon,
  eyebrow,
  title,
  ariaLabel,
  unreadCount = 0,
  iconClassName,
  eyebrowClassName,
}: ChatLauncherProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={open ? `Đóng ${ariaLabel}` : ariaLabel}
          aria-expanded={open}
          onClick={onToggle}
          className="group flex items-center gap-3 rounded-full border border-border bg-background px-4 py-3 text-left shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className={cn('relative flex h-11 w-11 items-center justify-center rounded-full', iconClassName)}>
            {open ? <X className="h-5 w-5" /> : icon}
            {!open && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span className="hidden sm:block">
            <span className={cn('block text-xs font-semibold uppercase tracking-[0.22em]', eyebrowClassName)}>
              {eyebrow}
            </span>
            <span className="block text-sm font-medium text-foreground">{title}</span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="sm:hidden">
        {ariaLabel}
      </TooltipContent>
    </Tooltip>
  );
}
