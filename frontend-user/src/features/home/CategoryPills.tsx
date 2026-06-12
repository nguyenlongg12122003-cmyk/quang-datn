import { Link } from 'react-router'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/layout/PageContainer'
import { CATEGORY_ACCENT_CLASSES } from '@/features/home/constants'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryPillsProps {
  categories: Category[]
}

export function CategoryPills({ categories }: CategoryPillsProps) {
  if (categories.length === 0) return null

  return (
    <section id="categories" className="scroll-mt-20">
      <SectionHeading
        title="Danh mục nổi bật"
        description="Chọn nhanh theo nhóm sản phẩm văn phòng phẩm"
        action={
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/products">
              Xem tất cả
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-6 xl:grid-cols-8 [&::-webkit-scrollbar]:hidden">
        {categories.map((category, index) => {
          const accent = CATEGORY_ACCENT_CLASSES[index % CATEGORY_ACCENT_CLASSES.length]
          return (
            <Link
              key={category.id}
              to={`/categories/${category.slug}`}
              className="group flex w-[88px] shrink-0 flex-col items-center gap-2 sm:w-auto"
            >
              <span
                className={cn(
                  'grid size-16 place-items-center overflow-hidden rounded-2xl transition-transform group-hover:scale-105 sm:size-[72px]',
                  accent,
                )}
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <LayoutGrid className="size-7 text-primary" aria-hidden />
                )}
              </span>
              <div className="w-full text-center">
                <p className="line-clamp-2 text-xs font-medium leading-tight sm:text-sm">
                  {category.name}
                </p>
                {category.productCount != null ? (
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    {formatNumber(category.productCount)} SP
                  </p>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}