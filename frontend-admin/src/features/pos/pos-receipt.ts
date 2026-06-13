import { formatCurrency, formatDateTime } from '@/lib/format'
import { SHOP_INFO } from '@/lib/constants'
import type { CreatePosOrderResult } from '@/lib/api/endpoints/pos'
import type { PosPaymentMethod } from '@/features/pos/pos-helpers'

export interface PosReceiptData {
  id: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: PosPaymentMethod
  createdAt?: string
  customerName?: string
  items: Array<{
    productName: string
    quantity: number
    price: number
  }>
}

const THERMAL_STYLES = `
  @page {
    size: 58mm auto;
    margin: 2mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    width: 54mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }

  .receipt {
    width: 100%;
  }

  .center {
    text-align: center;
  }

  .shop-name {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .shop-tagline {
    font-size: 9px;
    margin-top: 2px;
  }

  .divider {
    border-top: 1px dashed #000;
    margin: 6px 0;
  }

  .divider-bold {
    border-top: 2px solid #000;
    margin: 6px 0;
  }

  .meta {
    font-size: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .item {
    margin-bottom: 4px;
  }

  .item-name {
    font-weight: 600;
    word-break: break-word;
  }

  .item-line {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 10px;
  }

  .totals {
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .totals .row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
  }

  .grand-total {
    font-size: 14px;
    font-weight: 700;
    margin-top: 4px;
  }

  .footer {
    font-size: 9px;
    text-align: center;
    margin-top: 8px;
  }

  @media screen {
    body {
      padding: 12px;
      background: #f4f4f5;
    }

    .receipt {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 4px;
      padding: 8px;
      margin: 0 auto;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }
  }
`

function escapeHtml(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paymentLabel(method: PosPaymentMethod): string {
  return method === 'cash' ? 'TIỀN MẶT' : 'QR PAYOS'
}

function buildReceiptHtml(data: PosReceiptData): string {
  const createdLabel = data.createdAt ? formatDateTime(data.createdAt) : formatDateTime(new Date().toISOString())
  const itemLines = data.items
    .map((item) => {
      const lineTotal = item.price * item.quantity
      return `
        <div class="item">
          <div class="item-name">${escapeHtml(item.productName)}</div>
          <div class="item-line">
            <span>${item.quantity} x ${escapeHtml(formatCurrency(item.price))}</span>
            <span>${escapeHtml(formatCurrency(lineTotal))}</span>
          </div>
        </div>
      `
    })
    .join('')

  const discountRow =
    data.discount > 0
      ? `<div class="row"><span>Giảm giá</span><span>−${escapeHtml(formatCurrency(data.discount))}</span></div>`
      : ''

  return `
    <div class="receipt">
      <div class="center">
        <div class="shop-name">${escapeHtml(SHOP_INFO.name)}</div>
        <div class="shop-tagline">${escapeHtml(SHOP_INFO.tagline)}</div>
        <div class="shop-tagline">Hotline: ${escapeHtml(SHOP_INFO.hotline)}</div>
      </div>

      <div class="divider-bold"></div>

      <div class="center" style="font-weight:700;font-size:12px;">HÓA ĐƠN BÁN HÀNG</div>
      <div class="divider"></div>

      <div class="meta">
        <span>Mã đơn: ${escapeHtml(data.id)}</span>
        <span>Thời gian: ${escapeHtml(createdLabel)}</span>
        <span>Khách: ${escapeHtml(data.customerName || 'Khách lẻ')}</span>
        <span>Thanh toán: ${paymentLabel(data.paymentMethod)}</span>
      </div>

      <div class="divider"></div>

      ${itemLines}

      <div class="divider-bold"></div>

      <div class="totals">
        <div class="row"><span>Tạm tính</span><span>${escapeHtml(formatCurrency(data.subtotal))}</span></div>
        ${discountRow}
        <div class="row grand-total"><span>TỔNG CỘNG</span><span>${escapeHtml(formatCurrency(data.total))}</span></div>
      </div>

      <div class="divider"></div>

      <div class="footer">
        Cảm ơn quý khách!<br />
        Hẹn gặp lại tại ${escapeHtml(SHOP_INFO.name)}
      </div>
    </div>
  `
}

function buildPrintDocument(receiptHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>${THERMAL_STYLES}</style>
  </head>
  <body>
    ${receiptHtml}
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 250);
      });
    </script>
  </body>
</html>`
}

function openPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank', 'width=320,height=640')

  if (!printWindow) {
    URL.revokeObjectURL(url)
    return false
  }

  const revoke = () => URL.revokeObjectURL(url)
  printWindow.addEventListener('load', revoke, { once: true })
  setTimeout(revoke, 60_000)
  return true
}

function printViaHiddenIframe(html: string): boolean {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!doc || !win) {
    iframe.remove()
    return false
  }

  doc.open()
  doc.write(html)
  doc.close()

  const triggerPrint = () => {
    win.focus()
    win.print()
    const cleanup = () => iframe.remove()
    win.addEventListener('afterprint', cleanup, { once: true })
    setTimeout(cleanup, 120_000)
  }

  if (doc.readyState === 'complete') {
    setTimeout(triggerPrint, 250)
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 250)
  }

  return true
}

export function toReceiptData(
  order: CreatePosOrderResult,
  customerName?: string,
): PosReceiptData {
  return {
    id: order.id,
    subtotal: order.subtotal,
    discount: order.discount ?? Math.max(0, order.subtotal - order.total),
    total: order.total,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    customerName: customerName || order.customerName,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
    })),
  }
}

/** Opens print dialog for 58mm thermal receipt. */
export async function printPosReceipt(data: PosReceiptData): Promise<boolean> {
  const html = buildPrintDocument(buildReceiptHtml(data), `Bill ${data.id}`)
  return openPrintWindow(html) || printViaHiddenIframe(html)
}