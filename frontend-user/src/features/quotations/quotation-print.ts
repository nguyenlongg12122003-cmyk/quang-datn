import type { BusinessProfile, Quotation } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

function escapeHtml(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

interface QuotationPrintOptions {
  business?: BusinessProfile | null
}

export function openQuotationPrint(quotation: Quotation, options: QuotationPrintOptions = {}) {
  const { business } = options
  const rows = quotation.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}${item.sku ? `<br/><small>SKU: ${escapeHtml(item.sku)}</small>` : ''}</td>
        <td>${escapeHtml(item.packagingUnit ? `${item.packagingQty} ${item.packagingUnit}` : String(item.quantity))}</td>
        <td class="num">${formatCurrency(item.unitPrice)}</td>
        <td class="num">${formatCurrency(item.unitPrice * item.quantity)}</td>
      </tr>
    `,
    )
    .join('')

  const businessBlock = business
    ? `<div class="meta">
        <p><strong>${escapeHtml(business.companyName)}</strong></p>
        <p>MST: ${escapeHtml(business.taxCode)}</p>
        <p>${escapeHtml(business.invoiceAddress)}</p>
        <p>Liên hệ: ${escapeHtml(business.contactPerson)} · ${escapeHtml(business.contactPhone)}</p>
      </div>`
    : ''

  const noteBlock = quotation.note
    ? `<p class="note"><strong>Ghi chú:</strong> ${escapeHtml(quotation.note)}</p>`
    : ''

  const discountRow = quotation.discount > 0
    ? `<tr><td colspan="3" class="num">Chiết khấu</td><td class="num">−${formatCurrency(quotation.discount)}</td></tr>`
    : ''

  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8" />
  <title>Báo giá ${escapeHtml(quotation.code)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin-bottom: 4px; }
    .meta { margin: 12px 0; font-size: 13px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; vertical-align: top; }
    th { background: #f7f7f7; }
    .num { text-align: right; }
    .summary { margin-top: 12px; width: 320px; margin-left: auto; }
    .summary td { border: none; padding: 4px 8px; }
    .note { margin-top: 16px; font-size: 13px; }
    .footer { margin-top: 24px; font-size: 12px; color: #666; }
  </style></head><body>
  <h1>BẢNG BÁO GIÁ</h1>
  <p>Mã: <strong>${escapeHtml(quotation.code)}</strong></p>
  <p>Ngày tạo: ${escapeHtml(formatDateTime(quotation.createdAt))} · Hiệu lực đến: ${escapeHtml(formatDate(quotation.validUntil))}</p>
  ${businessBlock}
  <table>
    <thead><tr><th>Sản phẩm</th><th>Quy cách/SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="summary">
    <tr><td>Tạm tính</td><td class="num">${formatCurrency(quotation.subtotal)}</td></tr>
    ${discountRow}
    <tr><td><strong>Tổng cộng</strong></td><td class="num"><strong>${formatCurrency(quotation.total)}</strong></td></tr>
  </table>
  ${noteBlock}
  <p class="footer">Báo giá có hiệu lực đến ngày ${escapeHtml(formatDate(quotation.validUntil))}.</p>
  <script>window.onload=()=>window.print()</script></body></html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
}