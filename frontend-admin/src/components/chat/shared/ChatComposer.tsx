import { useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatComposer({ onSend, disabled, placeholder }: ChatComposerProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Nhập tin nhắn…'}
        rows={1}
        className="max-h-28 min-h-10 resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <Button size="icon" onClick={submit} disabled={disabled || !value.trim()} aria-label="Gửi">
        <SendHorizontal className="size-4" />
      </Button>
    </div>
  )
}
