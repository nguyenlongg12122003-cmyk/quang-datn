import type { Quotation, QuotationStatus } from '@/types'

/**
 * MIRROR FILE — KEEP IN SYNC WITH frontend-admin/src/features/quotations/quotation-utils.ts
 * Pure functions only. Changes here must be mirrored (or better, extracted in future).
 */

export function isQuotationExpired(quotation: Pick<Quotation, 'validUntil' | 'status'>): boolean {
  if (quotation.status === 'expired') return true
  return new Date(quotation.validUntil).getTime() < Date.now()
}

export function canConvertQuotation(quotation: Quotation): boolean {
  return quotation.status === 'accepted' && !isQuotationExpired(quotation) && !quotation.convertedOrderId
}

export function canCancelQuotation(quotation: Quotation): boolean {
  return quotation.status === 'sent' && !isQuotationExpired(quotation) && !quotation.convertedOrderId
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