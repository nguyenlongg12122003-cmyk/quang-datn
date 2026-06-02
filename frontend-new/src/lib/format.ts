import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatDate(value: string | Date, pattern = 'dd/MM/yyyy'): string {
  return format(new Date(value), pattern, { locale: vi })
}

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), 'HH:mm dd/MM/yyyy', { locale: vi })
}

export function formatRelative(value: string | Date): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi })
}
