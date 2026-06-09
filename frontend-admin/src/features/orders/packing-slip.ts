import QRCode from 'qrcode'
import type { Order, OrderItem } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_OPTIONS,
  SHOP_INFO,
} from '@/lib/constants'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatAddress(order: Order): string {
  const address = order.shippingAddress
  return [address.street, address.ward, address.district, address.city]
    .filter(Boolean)
    .join(', ')
}

function getShippingLabel(order: Order): string {
  const option = SHIPPING_OPTIONS.find((o) => o.value === order.shippingMethod)
  return option ? `${option.label} (${option.eta})` : order.shippingMethod
}

function describeCustomization(item: OrderItem): string | null {
  if (!item.customization) return null
  const { type, inputType, text } = item.customization
  if (inputType === 'image') return `${type} · Ảnh thiết kế`
  if (text) return `${type} · “${text}”`
  return type
}

function renderItems(order: Order): string {
  return order.items
    .map((item) => {
      const custom = describeCustomization(item)
      const customLine = custom
        ? `<div class="item-custom">${escapeHtml(custom)}</div>`
        : ''
      return `
        <div class="item">
          <div class="item-main">
            <span class="item-name">${escapeHtml(item.productName)}</span>
            <span class="item-qty">×${item.quantity}</span>
          </div>
          ${customLine}
        </div>
      `
    })
    .join('')
}

function renderCodBanner(order: Order): string {
  const isCod = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid'
  if (!isCod) return ''
  return `
    <div class="cod-banner">
      <span class="cod-label">THU HỘ (COD)</span>
      <span class="cod-amount">${escapeHtml(formatCurrency(order.total))}</span>
    </div>
  `
}

function renderNote(order: Order): string {
  if (!order.note?.trim()) return ''
  return `
    <div class="note">
      <span class="label">Ghi chú</span>
      <span>${escapeHtml(order.note.trim())}</span>
    </div>
  `
}

async function buildQrDataUrl(orderId: string): Promise<string> {
  return QRCode.toDataURL(orderId, {
    width: 96,
    margin: 1,
    errorCorrectionLevel: 'M',
  })
}

function buildSlipHtml(order: Order, qrDataUrl: string): string {
  const address = formatAddress(order)
  const statusLabel = ORDER_STATUS_LABELS[order.status]
  const paymentLabel = `${PAYMENT_METHOD_LABELS[order.paymentMethod]} · ${PAYMENT_STATUS_LABELS[order.paymentStatus]}`

  return `
    <section class="slip">
      <header class="slip-header">
        <div class="brand">
          <div class="brand-mark">Q</div>
          <div>
            <div class="brand-name">${escapeHtml(SHOP_INFO.name)}</div>
            <div class="brand-tagline">${escapeHtml(SHOP_INFO.tagline)}</div>
          </div>
        </div>
        <div class="slip-type">PHIẾU ĐÓNG GÓI</div>
      </header>

      <div class="order-id-row">
        <div>
          <div class="label">Mã đơn hàng</div>
          <div class="order-id">${escapeHtml(order.id)}</div>
          <div class="meta">${escapeHtml(formatDateTime(order.createdAt))}</div>
          <div class="meta">Trạng thái: ${escapeHtml(statusLabel)}</div>
        </div>
        <img class="qr" src="${qrDataUrl}" alt="QR ${escapeHtml(order.id)}" />
      </div>

      <div class="block">
        <div class="block-title">Người nhận</div>
        <div class="recipient-name">
          ${escapeHtml(order.shippingAddress.name)} · ${escapeHtml(order.shippingAddress.phone)}
        </div>
        <div class="recipient-address">${escapeHtml(address)}</div>
      </div>

      <div class="block">
        <div class="block-title">Sản phẩm (${order.items.length})</div>
        <div class="items">${renderItems(order)}</div>
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Tạm tính</span>
          <span>${escapeHtml(formatCurrency(order.subtotal))}</span>
        </div>
        <div class="total-row">
          <span>Phí vận chuyển</span>
          <span>${escapeHtml(formatCurrency(order.shippingFee))}</span>
        </div>
        ${
          order.discount > 0
            ? `<div class="total-row discount"><span>Giảm giá</span><span>−${escapeHtml(formatCurrency(order.discount))}</span></div>`
            : ''
        }
        <div class="total-row grand">
          <span>Tổng cộng</span>
          <span>${escapeHtml(formatCurrency(order.total))}</span>
        </div>
      </div>

      ${renderCodBanner(order)}

      <div class="footer-meta">
        <div><span class="label">Thanh toán</span> ${escapeHtml(paymentLabel)}</div>
        <div><span class="label">Vận chuyển</span> ${escapeHtml(getShippingLabel(order))}</div>
        ${order.voucherCode ? `<div><span class="label">Voucher</span> ${escapeHtml(order.voucherCode)}</div>` : ''}
      </div>

      ${renderNote(order)}

      <footer class="slip-footer">
        Dán phiếu này lên gói hàng trước khi bàn giao đơn vị vận chuyển · ${escapeHtml(SHOP_INFO.hotline)}
      </footer>
    </section>
  `
}

const PRINT_STYLES = `
  @page {
    size: A6 portrait;
    margin: 6mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 11px;
    line-height: 1.35;
    color: #0f2c38;
    background: #fff;
  }

  .slip {
    width: 100%;
    max-width: 105mm;
    min-height: 130mm;
    padding: 4mm 0;
    page-break-after: always;
    break-after: page;
  }

  .slip:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .slip-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    border-bottom: 1.5px solid #2890b8;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #2890b8;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 14px;
  }

  .brand-name {
    font-size: 14px;
    font-weight: 700;
    color: #2890b8;
  }

  .brand-tagline {
    font-size: 9px;
    color: #5a7a88;
  }

  .slip-type {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #5a7a88;
    text-align: right;
    white-space: nowrap;
  }

  .order-id-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }

  .label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #5a7a88;
  }

  .order-id {
    font-size: 15px;
    font-weight: 800;
    font-family: Consolas, "Courier New", monospace;
    margin-top: 2px;
  }

  .meta {
    font-size: 9px;
    color: #5a7a88;
    margin-top: 2px;
  }

  .qr {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
  }

  .block {
    border: 1px solid #d3e9f1;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 8px;
  }

  .block-title {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #2890b8;
    margin-bottom: 4px;
  }

  .recipient-name {
    font-weight: 700;
    font-size: 12px;
  }

  .recipient-address {
    margin-top: 2px;
    font-size: 10px;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-main {
    display: flex;
    justify-content: space-between;
    gap: 6px;
  }

  .item-name {
    flex: 1;
    font-weight: 600;
  }

  .item-qty {
    font-weight: 700;
    white-space: nowrap;
  }

  .item-custom {
    font-size: 9px;
    color: #6b4fa0;
    margin-top: 1px;
  }

  .totals {
    border-top: 1px dashed #b8d8e8;
    padding-top: 6px;
    margin-bottom: 6px;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    margin-bottom: 2px;
  }

  .total-row.discount {
    color: #1a7a4a;
  }

  .total-row.grand {
    font-size: 12px;
    font-weight: 800;
    border-top: 1px solid #d3e9f1;
    padding-top: 4px;
    margin-top: 4px;
  }

  .cod-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff4e5;
    border: 1.5px solid #e67e00;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 8px;
  }

  .cod-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #b35c00;
  }

  .cod-amount {
    font-size: 14px;
    font-weight: 800;
    color: #b35c00;
  }

  .footer-meta {
    font-size: 9px;
    color: #3d5a66;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 6px;
  }

  .note {
    font-size: 9px;
    background: #f4f8fa;
    border-radius: 4px;
    padding: 4px 6px;
    margin-bottom: 6px;
  }

  .note .label {
    display: block;
    margin-bottom: 2px;
  }

  .slip-footer {
    font-size: 8px;
    color: #7a96a3;
    text-align: center;
    border-top: 1px solid #e8f4f8;
    padding-top: 6px;
  }

  @media screen {
    body {
      padding: 16px;
      background: #eef4f7;
    }

    .slip {
      background: #fff;
      border: 1px solid #d3e9f1;
      border-radius: 8px;
      padding: 10mm;
      margin: 0 auto 16px;
      box-shadow: 0 2px 8px rgba(15, 44, 56, 0.08);
    }
  }
`

/**
 * Opens a print preview window with one A6 packing slip per order.
 * Returns false when the popup is blocked or there is nothing to print.
 */
export async function printOrderSlips(orders: Order[]): Promise<boolean> {
  if (orders.length === 0) return false

  const slips = await Promise.all(
    orders.map(async (order) => {
      const qrDataUrl = await buildQrDataUrl(order.id)
      return buildSlipHtml(order, qrDataUrl)
    }),
  )

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=480,height=720')
  if (!printWindow) return false

  const title =
    orders.length === 1
      ? `Phiếu đóng gói ${orders[0].id}`
      : `Phiếu đóng gói (${orders.length} đơn)`

  printWindow.document.open()
  printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${slips.join('\n')}
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 300);
      });
    </script>
  </body>
</html>`)
  printWindow.document.close()

  return true
}