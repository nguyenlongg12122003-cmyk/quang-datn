import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingCarrier,
  ShippingMethod,
} from '@/types'

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn trả',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  vnpay: 'VNPay',
  payos: 'PayOS',
  credit: 'Thanh toán công nợ (B2B)',
}

export const CUSTOMIZATION_STATUS_LABELS = {
  pending_review: 'Chờ duyệt mẫu',
  approved: 'Đã duyệt mẫu',
  rejected: 'Từ chối mẫu',
  in_production: 'Đang sản xuất',
  completed: 'Hoàn tất in ấn',
} as const

export const BUSINESS_TYPE_LABELS = {
  company: 'Công ty / Doanh nghiệp',
  school: 'Trường học',
  government: 'Cơ quan nhà nước',
  other: 'Tổ chức khác',
} as const

export const BUSINESS_STATUS_LABELS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
} as const

export const QUOTATION_STATUS_LABELS = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  accepted: 'Đã duyệt',
  rejected: 'Từ chối',
  converted: 'Đã chuyển đơn',
  expired: 'Hết hạn',
} as const

export interface ShippingOption {
  value: ShippingMethod
  label: string
  fee: number
  eta: string
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { value: 'standard', label: 'Tiêu chuẩn', fee: 30000, eta: '3-5 ngày' },
  { value: 'express', label: 'Nhanh', fee: 50000, eta: '1-2 ngày' },
  { value: 'same_day', label: 'Trong ngày', fee: 80000, eta: 'Trong ngày' },
]

export const FREE_SHIPPING_THRESHOLD = 500000

export const SHIPPING_CARRIER_LABELS: Record<ShippingCarrier, string> = {
  ghtk: 'GHTK',
  ghn: 'GHN',
  viettel_post: 'Viettel Post',
  jt: 'J&T Express',
  ninja_van: 'Ninja Van',
  vnpost: 'VNPost',
  other: 'Khác',
}