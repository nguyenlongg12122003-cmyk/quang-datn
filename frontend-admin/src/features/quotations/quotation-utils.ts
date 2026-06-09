import type { Quotation, QuotationStatus } from '@/types'

export function isQuotationExpired(quotation: Pick<Quotation, 'validUntil' | 'status'>): boolean {
  if (quotation.status === 'expired') return true
  return new Date(quotation.validUntil).getTime() < Date.now()
}

export function getQuotationStatusLabel(
  quotation: Quotation,
  labels: Record<QuotationStatus, string>,
): string {
  if (isQuotationExpired(quotation) && ['draft', 'sent', 'accepted'].includes(quotation.status)) {
    return labels.expired
  }
  return labels[quotation.status]
}