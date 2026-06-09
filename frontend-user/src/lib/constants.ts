import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
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
}

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