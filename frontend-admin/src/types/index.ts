// Domain models mirroring the backend payloads documented in
// backend/API_DOCS_FOR_FRONTEND_AGENT.md. Kept intentionally close to runtime shapes.

export type UserRole = 'customer' | 'staff' | 'admin'
export type UserStatus = 'active' | 'locked'
export type CustomerType = 'retail' | 'wholesale' | 'enterprise'

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
  customerType?: CustomerType
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

export interface PackagingUnit {
  label: string
  qtyPerUnit: number
  price?: number | null
}

export interface GroupPrices {
  wholesale?: WholesalePrice[]
  enterprise?: WholesalePrice[]
}

export type BusinessType = 'company' | 'school' | 'government' | 'other'
export type BusinessStatus = 'pending' | 'approved' | 'rejected'

export interface BusinessProfile {
  userId: string
  companyName: string
  taxCode?: string | null
  businessType: BusinessType
  contactPerson: string
  contactPhone?: string | null
  contactEmail?: string | null
  invoiceAddress?: string | null
  creditLimit: number
  paymentTermDays: number
  status: BusinessStatus
  approvedAt?: string | null
  note?: string | null
  createdAt: string
  // New for improved verification accuracy
  documents?: BusinessDocument[]
  reviewHistory?: BusinessReviewEvent[]
  // Stats attached by /manage for quick "view user orders" context
  stats?: {
    orderCount: number
    totalSpent: number
    lastOrderAt?: string | null
    creditOrderCount: number
    creditTotal: number
  }
}

export type BusinessDocumentType = 'business_license' | 'authorization_letter' | 'representative_id' | 'other'

export interface BusinessDocument {
  type: BusinessDocumentType
  url: string
  name?: string
  uploadedAt: string
}

export interface BusinessReviewEvent {
  action: 'submitted' | 'resubmitted' | 'approved' | 'rejected'
  status: BusinessStatus
  creditLimit?: number
  paymentTermDays?: number
  customerType?: string
  note?: string
  performedBy?: string
  performedAt: string
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired' | 'cancelled'

export interface QuotationItem {
  id?: number
  productId: string
  productName: string
  productImage?: string
  sku?: string
  unitPrice: number
  quantity: number
  packagingUnit?: string | null
  packagingQty?: number
  customization?: OrderItemCustomization | null
}

export interface Quotation {
  id: string
  userId: string
  code: string
  status: QuotationStatus
  subtotal: number
  discount: number
  total: number
  note?: string | null
  validUntil: string
  convertedOrderId?: string | null
  createdAt: string
  updatedAt: string
  userName?: string
  userEmail?: string
  items: QuotationItem[]
}

export interface InvoiceInfo {
  taxCode?: string
  companyName?: string
  invoiceAddress?: string
  invoiceNumber?: string
  vatRate?: number
}

export interface VatInvoice {
  id: string
  orderId: string
  invoiceNumber: string
  taxCode?: string | null
  companyName?: string | null
  invoiceAddress?: string | null
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  status: 'issued' | 'cancelled'
  issuedAt: string
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
  barcode?: string | null
  lowStockThreshold?: number
  packagingUnits?: PackagingUnit[]
  groupPrices?: GroupPrices
  customizationLeadDays?: number
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

export type CustomizationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'in_production'
  | 'completed'

export interface OrderItem {
  id?: number
  productId: string
  productName: string
  productImage?: string
  price: number
  quantity: number
  customization?: OrderItemCustomization | null
  customizationStatus?: CustomizationStatus | null
  customizationNote?: string | null
  packagingUnit?: string | null
  packagingQty?: number
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export type PaymentMethod = 'cod' | 'vnpay' | 'payos' | 'credit' | 'cash'
export type SalesChannel = 'online' | 'pos'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type ShippingMethod = 'standard' | 'express' | 'same_day'
export type ShippingCarrier =
  | 'ghtk'
  | 'ghn'
  | 'viettel_post'
  | 'jt'
  | 'ninja_van'
  | 'vnpost'
  | 'other'

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
  shippingCarrier?: ShippingCarrier | null
  trackingNumber?: string | null
  packingSlipPrintedAt?: string | null
  quotationId?: string | null
  paymentTermDays?: number | null
  paymentDueDate?: string | null
  invoiceInfo?: InvoiceInfo | null
  estimatedDeliveryDate?: string | null
  hasCustomItems?: boolean
  salesChannel?: SalesChannel
  createdByStaffId?: string | null
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
  posOrders: number
  posRevenue: number
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
