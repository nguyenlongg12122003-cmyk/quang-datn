import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useSearchSuggestions } from '@/features/catalog/api'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
}

export function SearchBar({ className }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)
  const navigate = useNavigate()
  const { data: suggestions = [], isFetching } = useSearchSuggestions(debounced)

  const goToSearch = (term: string) => {
    const q = term.trim()
    if (!q) return
    setOpen(false)
    navigate(`/products?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'h-10 w-full justify-start gap-2 text-muted-foreground',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="truncate">Tìm bút, giấy, văn phòng phẩm…</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Nhập từ khóa tìm kiếm…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') goToSearch(query)
          }}
        />
        <CommandList>
          {isFetching ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Đang tìm…</div>
          ) : null}
          {!isFetching && debounced.length >= 2 && suggestions.length === 0 ? (
            <CommandEmpty>Không có gợi ý phù hợp.</CommandEmpty>
          ) : null}
          {suggestions.length > 0 ? (
            <CommandGroup heading="Gợi ý">
              {suggestions.map((s) => (
                <CommandItem key={s} value={s} onSelect={() => goToSearch(s)}>
                  <Search className="size-4 text-muted-foreground" />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  )
}
