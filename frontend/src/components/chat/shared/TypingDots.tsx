import { cn } from '@/lib/utils';

interface TypingDotsProps {
  className?: string;
}

/** Three bouncing dots used as a "typing" / "thinking" indicator. */
export function TypingDots({ className }: TypingDotsProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label="Đang soạn">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  );
}
