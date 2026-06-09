import { ORDER_STATUS_TRANSITIONS, PAYMENT_GATED_STATUSES } from '@/lib/constants'
import type { Order, OrderItem, OrderStatus } from '@/types'

export function summarizeOrderItems(items: OrderItem[]): string {
  if (items.length === 0) return '—'

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
  const firstName = items[0].productName

  if (items.length === 1) {
    return `${firstName} ×${items[0].quantity}`
  }

  return `${items.length} SP (${totalQty} món) · ${firstName}…`
}

export function isAwaitingOnlinePayment(order: Order): boolean {
  return order.paymentMethod !== 'cod' && order.paymentStatus === 'pending'
}

export function hasPendingReturn(order: Order): boolean {
  return order.returnRequest?.status === 'pending'
}

export function getNextOrderStatus(order: Order): OrderStatus | null {
  return ORDER_STATUS_TRANSITIONS[order.status].find((status) => status !== 'cancelled') ?? null
}

export function getPaymentBlockReason(order: Order, nextStatus: OrderStatus): string | null {
  if (!PAYMENT_GATED_STATUSES.includes(nextStatus)) return null
  if (isAwaitingOnlinePayment(order)) {
    return 'Đơn thanh toán online chưa được thanh toán. Không thể tiếp tục xử lý.'
  }
  return null
}

export function requiresHandoffDialog(order: Order, nextStatus: OrderStatus): boolean {
  return order.status === 'processing' && nextStatus === 'shipping'
}

export function hasPackingSlipPrinted(order: Order): boolean {
  return Boolean(order.packingSlipPrintedAt)
}

export function countCustomizedItems(order: Order): number {
  return order.items.filter((item) => Boolean(item.customization)).length
}

export function hasCustomizedItems(order: Order): boolean {
  return countCustomizedItems(order) > 0
}