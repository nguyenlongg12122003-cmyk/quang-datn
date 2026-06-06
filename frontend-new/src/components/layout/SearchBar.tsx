import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { useSearchSuggestions } from '@/features/catalog/api'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const debounced = useDebounce(query, 250)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: suggestions = [], isFetching } = useSearchSuggestions(debounced)

  const showSuggestions = isFocused && debounced.length >= 2

  const goToSearch = (term: string) => {
    const q = term.trim()
    if (!q) return
    setQuery('')
    setIsFocused(false)
    navigate(`/products?q=${encodeURIComponent(q)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    goToSearch(query)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSuggestionClick = (s: string) => {
    goToSearch(s)
  }

  const clearQuery = () => {
    setQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Tìm bút, giấy, văn phòng phẩm…"
          className="h-10 w-full pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-2 text-muted-foreground"
        >
          <Search className="size-4" />
        </Button>
      </form>

      {/* Suggestions dropdown (non-modal) */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="max-h-[280px] overflow-y-auto py-1">
            {isFetching ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Đang tìm kiếm…</div>
            ) : suggestions.length > 0 ? (
              <div>
                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Gợi ý sản phẩm
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Search className="size-3.5 text-muted-foreground" />
                    <span className="line-clamp-1">{s}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Không có gợi ý. Nhấn Enter để tìm “{debounced}”.
              </div>
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            Nhấn Enter để tìm kiếm tự do
          </div>
        </div>
      )}
    </div>
  )
}
