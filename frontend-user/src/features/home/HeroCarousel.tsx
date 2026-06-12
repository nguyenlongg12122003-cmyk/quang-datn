import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { SearchBar } from '@/components/layout/SearchBar'
import { HERO_SLIDES, HOT_SEARCH_KEYWORDS } from '@/features/home/constants'
import { cn } from '@/lib/utils'

const SLIDE_INTERVAL_MS = 6000

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const navigate = useNavigate()

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + HERO_SLIDES.length) % HERO_SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [paused])

  const slide = HERO_SLIDES[activeIndex]
  const BadgeIcon = slide.badgeIcon

  const handleCategoryAnchor = (e: React.MouseEvent, href: string) => {
    if (!href.startsWith('#')) return
    e.preventDefault()
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="relative overflow-hidden bg-brand-50"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Banner khuyến mãi"
    >
      <PageContainer className="relative py-10 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="space-y-4">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                  slide.accent === 'commerce'
                    ? 'bg-commerce/15 text-commerce'
                    : 'bg-primary/10 text-primary',
                )}
              >
                <BadgeIcon className="size-4" aria-hidden />
                {slide.badge}
              </span>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {slide.title}{' '}
                <span
                  className={cn(
                    slide.accent === 'commerce' ? 'text-commerce' : 'text-primary',
                  )}
                >
                  {slide.highlight}
                </span>
              </h1>
              <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
                {slide.description}
              </p>
            </div>

            <div className="hidden max-w-md md:block">
              <SearchBar />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Tìm nhanh:</span>
              {HOT_SEARCH_KEYWORDS.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => navigate(`/products?q=${encodeURIComponent(keyword)}`)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <Search className="size-3" aria-hidden />
                  {keyword}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to={slide.ctaTo}>
                  {slide.ctaLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {slide.secondaryLabel && slide.secondaryTo ? (
                <Button asChild size="lg" variant="outline">
                  <Link
                    to={slide.secondaryTo}
                    onClick={(e) => handleCategoryAnchor(e, slide.secondaryTo!)}
                  >
                    {slide.secondaryLabel}
                  </Link>
                </Button>
              ) : null}
            </div>

            <div
              className="flex items-center gap-2 pt-1"
              role="tablist"
              aria-label="Chọn banner"
            >
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={s.badge}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === activeIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-primary/25 hover:bg-primary/40',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
              {HERO_SLIDES.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-700',
                    i === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
                  )}
                  aria-hidden={i !== activeIndex}
                >
                  <img
                    src={s.image}
                    alt={s.imageAlt}
                    className="size-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent',
                      s.accent === 'commerce' && 'from-commerce/30',
                    )}
                  />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm',
                        s.accent === 'commerce' ? 'bg-commerce/80' : 'bg-primary/80',
                      )}
                    >
                      <s.badgeIcon className="size-4" aria-hidden />
                      {s.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-3 mt-6 md:hidden">
          <SearchBar />
        </div>
      </PageContainer>
    </section>
  )
}