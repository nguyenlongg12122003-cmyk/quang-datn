import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  GraduationCap,
  PenLine,
  Printer,
  School,
  Sparkles,
} from 'lucide-react'

export const HOT_SEARCH_KEYWORDS = [
  'Bút bi Thiên Long',
  'Giấy A4 Double A',
  'Băng keo',
  'Bìa hồ sơ',
  'Kéo văn phòng',
] as const

export interface HeroSlide {
  id: string
  badge: string
  badgeIcon: LucideIcon
  title: string
  highlight: string
  description: string
  ctaLabel: string
  ctaTo: string
  secondaryLabel?: string
  secondaryTo?: string
  accent: 'primary' | 'commerce'
  image: string
  imageAlt: string
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'back-to-school',
    badge: 'Mùa tựu trường',
    badgeIcon: GraduationCap,
    title: 'Chuẩn bị',
    highlight: 'năm học mới',
    description: 'Bộ dụng cụ học tập, vở, bút viết chính hãng — giá ưu đãi cho học sinh và sinh viên.',
    ctaLabel: 'Mua dụng cụ học tập',
    ctaTo: '/products',
    secondaryLabel: 'Xem danh mục',
    secondaryTo: '#categories',
    accent: 'primary',
    image: '/images/banners/back-to-school.jpg',
    imageAlt: 'Dụng cụ học tập và văn phòng phẩm cho năm học mới',
  },
  {
    id: 'flash-sale',
    badge: 'Flash Sale',
    badgeIcon: Sparkles,
    title: 'Ưu đãi',
    highlight: 'có hạn',
    description: 'Hàng nghìn sản phẩm giảm sâu — nhanh tay kẻo lỡ, số lượng có hạn.',
    ctaLabel: 'Săn Flash Sale',
    ctaTo: '/products?isFlashSale=true',
    accent: 'commerce',
    image: '/images/banners/flash-sale.jpg',
    imageAlt: 'Sản phẩm văn phòng phẩm đang giảm giá Flash Sale',
  },
  {
    id: 'custom-print',
    badge: 'In ấn tùy chỉnh',
    badgeIcon: Printer,
    title: 'In logo',
    highlight: 'theo yêu cầu',
    description: 'Bút, sổ tay, name card, áo thun — miễn phí tư vấn thiết kế mẫu cho doanh nghiệp.',
    ctaLabel: 'Xem sản phẩm in ấn',
    ctaTo: '/products?isCustomizable=true',
    secondaryLabel: 'Đăng ký DN',
    secondaryTo: '/account',
    accent: 'primary',
    image: '/images/banners/custom-print.jpg',
    imageAlt: 'Dịch vụ in ấn tùy chỉnh logo trên bút và văn phòng phẩm',
  },
]

export interface ShopByNeedItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  to: string
  accentClass: string
}

export const SHOP_BY_NEED_ITEMS: ShopByNeedItem[] = [
  {
    id: 'student',
    title: 'Học sinh & sinh viên',
    description: 'Bút, vở, bộ dụng cụ học tập đủ bộ theo cấp học.',
    icon: GraduationCap,
    to: '/products',
    accentClass: 'bg-brand-100 text-brand-700',
  },
  {
    id: 'office',
    title: 'Văn phòng công ty',
    description: 'Giấy A4, bút ký, folder, dụng cụ làm việc hàng ngày.',
    icon: Building2,
    to: '/products',
    accentClass: 'bg-accent text-accent-foreground',
  },
  {
    id: 'school',
    title: 'Trường học & cơ quan',
    description: 'Mua sỉ theo khối lượng, hỗ trợ hóa đơn VAT cho trường và cơ quan.',
    icon: School,
    to: '/account',
    accentClass: 'bg-secondary text-secondary-foreground',
  },
  {
    id: 'print',
    title: 'In ấn tùy chỉnh',
    description: 'In logo, tên công ty lên bút, sổ, ấn phẩm quà tặng.',
    icon: PenLine,
    to: '/products?isCustomizable=true',
    accentClass: 'bg-commerce/15 text-commerce',
  },
]

export interface TestimonialItem {
  id: string
  name: string
  role: string
  quote: string
  product: string
  rating: number
}

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: '1',
    name: 'Nguyễn Thị Lan',
    role: 'Nhân sự — Công ty TNHH ABC',
    quote: 'Đặt 200 bộ bút in logo giao đúng hạn, chất lượng in sắc nét. Sẽ tiếp tục hợp tác cho sự kiện cuối năm.',
    product: 'Bút bi in logo doanh nghiệp',
    rating: 5,
  },
  {
    id: '2',
    name: 'Trần Minh Đức',
    role: 'Giáo viên THCS',
    quote: 'Mua giấy A4 và dụng cụ cho cả khối, giá sỉ hợp lý, giao hàng gọn gàng đúng như cam kết.',
    product: 'Giấy A4 & dụng cụ văn phòng',
    rating: 5,
  },
  {
    id: '3',
    name: 'Lê Hoàng Nam',
    role: 'Startup 15 nhân viên',
    quote: 'Giao nhanh nội thành, hỗ trợ tư vấn nhiệt tình. Giỏ hàng văn phòng đặt một lần là đủ cả tháng.',
    product: 'Combo văn phòng cơ bản',
    rating: 5,
  },
]

export const CATEGORY_ACCENT_CLASSES = [
  'bg-brand-100',
  'bg-brand-50',
  'bg-accent',
  'bg-secondary',
  'bg-brand-100',
  'bg-accent',
  'bg-secondary',
  'bg-brand-50',
] as const