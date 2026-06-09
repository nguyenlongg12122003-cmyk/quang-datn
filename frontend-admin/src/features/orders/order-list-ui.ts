import type { OrderTab } from '@/lib/api/endpoints/orders'
import {
  hasPackingSlipPrinted,
  isAwaitingOnlinePayment,
} from '@/features/orders/order-helpers'
import type { Order } from '@/types'

export type OrderWaitSeverity = 'normal' | 'warning' | 'urgent'

const ACTIONABLE_STATUSES = new Set(['pending', 'confirmed', 'processing'])

export function getOrderWaitSeverity(order: Order): OrderWaitSeverity | null {
  if (!ACTIONABLE_STATUSES.has(order.status)) return null

  const hours =
    (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)

  if (hours >= 72) return 'urgent'
  if (hours >= 24) return 'warning'
  return 'normal'
}

export function getNeedsActionReasons(order: Order): string[] {
  const reasons: string[] = []

  if (order.status === 'pending') {
    reasons.push('Chờ xác nhận')
  }

  if (order.status === 'confirmed') {
    reasons.push('Chờ đóng gói')
  }

  if (order.status === 'processing' && !hasPackingSlipPrinted(order)) {
    reasons.push('Chưa in phiếu')
  }

  if (isAwaitingOnlinePayment(order)) {
    reasons.push('Chờ TT online')
  }

  return reasons
}

export function getOrderTabEmptyState(
  tab: OrderTab,
  hasSearch: boolean,
): { title: string; hint?: string } {
  if (hasSearch) {
    return {
      title: 'Không tìm thấy đơn phù hợp',
      hint: 'Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.',
    }
  }

  switch (tab) {
    case 'pending':
      return {
        title: 'Không có đơn chờ xác nhận',
        hint: 'Đơn mới sẽ xuất hiện ở đây khi khách đặt hàng.',
      }
    case 'needs_action':
      return {
        title: 'Không có đơn cần xử lý',
        hint: 'Tất cả đơn đã được xác nhận, in phiếu hoặc thanh toán đầy đủ.',
      }
    case 'packing':
      return {
        title: 'Không có đơn đang gói',
        hint: 'Chuyển sang tab Cần xử lý để xem đơn chờ đóng gói.',
      }
    case 'shipping':
      return {
        title: 'Không có đơn đang giao',
        hint: 'Đơn sẽ hiện ở đây sau khi bàn giao vận chuyển.',
      }
    case 'delivered':
      return {
        title: 'Không có đơn đã giao',
        hint: 'Đơn hoàn tất sẽ xuất hiện ở đây sau khi xác nhận đã giao.',
      }
    case 'cancelled':
      return {
        title: 'Không có đơn đã hủy',
        hint: 'Đơn bị hủy sẽ xuất hiện ở đây.',
      }
    default:
      return {
        title: 'Chưa có đơn hàng',
        hint: 'Đơn đầu tiên sẽ xuất hiện khi có khách đặt hàng.',
      }
  }
}