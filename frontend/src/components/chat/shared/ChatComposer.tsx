import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** Tailwind classes for the send button (background). */
  sendButtonClassName?: string;
  /** Tailwind classes applied to the textarea (focus ring/border accents). */
  textareaClassName?: string;
}

/**
 * Auto-growing message input. Enter submits, Shift+Enter inserts a newline.
 * `field-sizing-content` on the textarea grows it up to max-height.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
  sendButtonClassName,
  textareaClassName,
}: ChatComposerProps) {
  const canSend = !disabled && value.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'max-h-28 min-h-10 resize-none rounded-2xl py-2.5 text-sm',
          textareaClassName,
        )}
      />
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSend}
        size="icon"
        className={cn('h-10 w-10 shrink-0 rounded-full', sendButtonClassName)}
        aria-label="Gửi tin nhắn"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
