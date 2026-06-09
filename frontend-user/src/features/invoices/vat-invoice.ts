import type { Order, VatInvoice } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/format'

function escapeHtml(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function openVatInvoicePrint(order: Order, invoice: VatInvoice) {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatCurrency(item.price)}</td>
        <td class="num">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hóa đơn VAT ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
    th { background: #f5f5f5; text-align: left; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; width: 320px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
  <div class="meta">
    Số hóa đơn: <strong>${escapeHtml(invoice.invoiceNumber)}</strong><br/>
    Đơn hàng: ${escapeHtml(order.id)}<br/>
    Ngày xuất: ${escapeHtml(formatDateTime(invoice.issuedAt))}<br/>
    Khách hàng: ${escapeHtml(invoice.companyName || '')}<br/>
    MST: ${escapeHtml(invoice.taxCode || '')}<br/>
    Địa chỉ xuất HĐ: ${escapeHtml(invoice.invoiceAddress || '')}
  </div>
  <table>
    <thead>
      <tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div><span>Tạm tính</span><span>${formatCurrency(invoice.subtotal)}</span></div>
    <div><span>VAT (${invoice.vatRate}%)</span><span>${formatCurrency(invoice.vatAmount)}</span></div>
    <div class="grand"><span>Tổng cộng</span><span>${formatCurrency(invoice.total)}</span></div>
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
}