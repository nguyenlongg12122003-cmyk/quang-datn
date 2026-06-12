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

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
  returned: [],
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

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  business_license: 'Giấy phép kinh doanh / ĐKKD',
  authorization_letter: 'Giấy ủy quyền',
  representative_id: 'CCCD / CMND người đại diện',
  other: 'Giấy tờ khác',
} as const

export const REVIEW_ACTION_LABELS: Record<string, string> = {
  submitted: 'Gửi đăng ký',
  resubmitted: 'Gửi lại sau từ chối',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
} as const

export const CUSTOMER_TYPE_LABELS = {
  retail: 'Giá lẻ',
  wholesale: 'Giá sỉ',
  enterprise: 'Giá đại lý',
} as const

export const QUOTATION_STATUS_LABELS = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  accepted: 'Đã duyệt',
  rejected: 'Từ chối',
  converted: 'Đã chuyển đơn',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
} as const

export const STOCK_MOVEMENT_TYPE_LABELS = {
  in: 'Nhập kho',
  out: 'Xuất kho',
  adjustment: 'Kiểm kê',
  sale: 'Bán hàng',
  return: 'Hoàn hàng',
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

export const SHOP_INFO = {
  name: 'QuangVPP',
  tagline: 'Văn phòng phẩm chất lượng',
  hotline: '1900 xxxx',
} as const

export const PACKING_SLIP_STATUSES: OrderStatus[] = ['confirmed', 'processing']

export const PAYMENT_GATED_STATUSES: OrderStatus[] = ['confirmed', 'processing', 'shipping']

export const SHIPPING_CARRIER_OPTIONS: Array<{ value: ShippingCarrier; label: string }> = [
  { value: 'ghtk', label: 'GHTK' },
  { value: 'ghn', label: 'GHN' },
  { value: 'viettel_post', label: 'Viettel Post' },
  { value: 'jt', label: 'J&T Express' },
  { value: 'ninja_van', label: 'Ninja Van' },
  { value: 'vnpost', label: 'VNPost' },
  { value: 'other', label: 'Khác' },
]

export const SHIPPING_CARRIER_LABELS: Record<ShippingCarrier, string> = {
  ghtk: 'GHTK',
  ghn: 'GHN',
  viettel_post: 'Viettel Post',
  jt: 'J&T Express',
  ninja_van: 'Ninja Van',
  vnpost: 'VNPost',
  other: 'Khác',
}

export const RETURN_STATUS_LABELS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
} as const

export const ORDER_TAB_LABELS = {
  all: 'Tất cả',
  pending: 'Chờ xác nhận',
  needs_action: 'Cần xử lý',
  packing: 'Đang gói',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
} as const

export const ORDER_TAB_DESCRIPTIONS = {
  all: 'Toàn bộ đơn hàng trong hệ thống.',
  pending: 'Đơn mới đặt, chờ staff xác nhận.',
  needs_action:
    'Đơn cần can thiệp: chờ xác nhận, chờ chuyển đóng gói, chưa in phiếu, hoặc thanh toán online chưa về.',
  packing: 'Đơn đã xác nhận hoặc đang đóng gói tại kho.',
  shipping: 'Đơn đã bàn giao đơn vị vận chuyển.',
  delivered: 'Đơn đã giao thành công cho khách hàng.',
  cancelled: 'Đơn đã bị hủy bởi khách hoặc admin, hoặc do thanh toán thất bại.',
} as const