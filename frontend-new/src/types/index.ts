// Domain models mirroring the backend payloads documented in
// backend/API_DOCS_FOR_FRONTEND_AGENT.md. Kept intentionally close to runtime shapes.

export type UserRole = 'customer' | 'staff' | 'admin'
export type UserStatus = 'active' | 'locked'

export interface Address {
  id: string
  name: string
  phone: string
  street: string
  ward: string
  district: string
  city: string
  isDefault: boolean
}

export interface User {
  id: string
  email: string
  name: string
  phone: string
  avatar?: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  addresses: Address[]
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string
  description?: string
  image?: string
  productCount?: number
}

export interface Brand {
  id: string
  name: string
  logo?: string | null
}

export interface ProductImage {
  id: string
  url: string
  alt?: string
}

export interface CustomizationOption {
  key?: string
  label: string
  inputType: 'text' | 'image'
  placeholder?: string
  helpText?: string
  extraPrice?: number
}

export interface WholesalePrice {
  minQty: number
  price: number
}

export type ProductStatus = 'active' | 'inactive' | 'draft'

export interface Product {
  id: string
  name: string
  slug: string
  sku: string
  categoryId: string
  brandId: string
  price: number
  originalPrice: number
  discount?: number
  images: ProductImage[]
  description?: string
  specifications?: Record<string, string>
  stock: number
  sold?: number
  rating?: number
  reviewCount?: number
  reviews?: ProductReview[]
  colors?: string[]
  tags?: string[]
  isFlashSale?: boolean
  flashSaleEnd?: string | null
  flashSalePrice?: number | null
  isCustomizable?: boolean
  customizationOptions?: Array<CustomizationOption | string>
  wholesalePrice?: WholesalePrice[]
  createdAt?: string
  status: ProductStatus
}

export interface ProductReview {
  id: string
  userId: string
  userName: string
  userAvatar?: string | null
  rating: number
  comment: string
  helpful?: number
  isVerifiedPurchase?: boolean
  createdAt: string
}

export type VoucherType = 'fixed' | 'percentage'
export type VoucherStatus = 'active' | 'inactive' | 'expired'

export interface Voucher {
  id: string
  code: string
  type: VoucherType
  value: number
  minOrderValue: number
  maxDiscount?: number | null
  usageLimit?: number
  usedCount?: number
  startDate?: string
  endDate?: string
  status?: VoucherStatus
  description?: string
}

export interface UserVoucher {
  id: string
  userId: string
  voucherId: string
  claimedAt: string
  expiresAt: string
  isUsed: boolean
  usedAt?: string | null
  orderId?: string | null
  voucher: Voucher
}

export interface OrderItemCustomization {
  type: string
  text: string
  inputType: 'text' | 'image'
  extraPrice?: number
}

export interface OrderItem {
  productId: string
  productName: string
  productImage?: string
  price: number
  quantity: number
  customization?: OrderItemCustomization | null
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export type PaymentMethod = 'cod' | 'vnpay' | 'payos'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type ShippingMethod = 'standard' | 'express' | 'same_day'

export interface OrderTimelineEntry {
  status: OrderStatus
  date: string
  note?: string
}

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ReturnRequest {
  reason: string
  status: ReturnRequestStatus
  createdAt: string
  resolvedAt?: string | null
  note?: string
}

export interface Order {
  id: string
  userId: string
  subtotal: number
  shippingFee: number
  discount: number
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  shippingMethod: ShippingMethod
  shippingAddress: Omit<Address, 'id' | 'isDefault'> & Partial<Pick<Address, 'id' | 'isDefault'>>
  voucherCode?: string | null
  note?: string
  createdAt: string
  returnRequest?: ReturnRequest | null
  items: OrderItem[]
  timeline: OrderTimelineEntry[]
}

export type ChatChannel = 'support' | 'ai'

export interface RecommendedProduct {
  id: string
  slug: string
  name: string
  image?: string
  price: number
  originalPrice?: number
  rating?: number
  reviewCount?: number
  sold?: number
  isFlashSale?: boolean
  isCustomizable?: boolean
  reason?: string
}

export interface ChatMessage {
  id: string
  channel: ChatChannel
  senderId: string
  senderName: string
  senderRole: 'customer' | 'admin'
  targetUserId?: string
  message: string
  metadata?: {
    recommendedProducts?: RecommendedProduct[]
  } | null
  timestamp: string
  isRead: boolean
}

export interface SupportConversation {
  userId: string
  userName: string
  userAvatar?: string | null
  lastMessageAt: string
  lastMessage: string
  unreadCount: number
}

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  pendingOrders: number
  lowStockProducts: number
  newCustomersThisMonth: number
  returnRate: number
  ordersByStatus: Array<{ status: OrderStatus; count: number }>
  topProducts: Array<{ name: string; sold: number; revenue: number }>
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>
}

export interface RevenueReport {
  monthly: Array<{ month: string; revenue: number; orders: number }>
  byCategory: Array<{ name: string; revenue: number; orders: number }>
}

export type CustomerReport = Array<{
  month: string
  newCustomers: number
  totalCustomers: number
}>
