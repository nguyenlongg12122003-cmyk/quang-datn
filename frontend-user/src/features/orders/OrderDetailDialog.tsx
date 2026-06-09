import { Link } from 'react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from '@/components/common/OrderStatusBadge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  CUSTOMIZATION_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_CARRIER_LABELS,
} from '@/lib/constants'
import { invoiceApi } from '@/lib/api/endpoints/invoices'
import { openVatInvoicePrint } from '@/features/invoices/vat-invoice'
import { formatDate } from '@/lib/format'
import { Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '@/types'

interface OrderDetailDialogProps {
  order: Order | null
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({
  order,
  onOpenChange,
}: OrderDetailDialogProps) {
  const handleDownloadCustomizationImage = (imageSrc: string, item: { productName: string }) => {
    if (!order || !imageSrc) return;

    const isDataUrl = imageSrc.startsWith('data:image/');

    // Create a clean filename base
    const safeProduct = item.productName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50);
    const filenameBase = `${order.id}-${safeProduct}-custom`;

    if (isDataUrl) {
      // Old base64 flow
      const link = document.createElement('a');
      link.href = imageSrc;

      let ext = 'png';
      if (imageSrc.startsWith('data:image/jpeg') || imageSrc.startsWith('data:image/jpg')) ext = 'jpg';
      else if (imageSrc.startsWith('data:image/webp')) ext = 'webp';
      else if (imageSrc.startsWith('data:image/gif')) ext = 'gif';

      link.download = `${filenameBase}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Cloudinary / regular image URL - open in new tab or trigger download via fetch + blob for better control
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filenameBase; // browsers may ignore this for cross-origin, fallback to opening
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {order ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <DialogTitle className="flex items-center gap-3">
                    Đơn {order.id} <OrderStatusBadge status={order.status} />
                  </DialogTitle>
                  <DialogDescription>{formatDateTime(order.createdAt)}</DialogDescription>
                </div>

              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <section>
                <h4 className="mb-1 font-semibold">Người nhận</h4>
                <p>{order.shippingAddress.name} · {order.shippingAddress.phone}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.street}, {order.shippingAddress.ward},{' '}
                  {order.shippingAddress.district}, {order.shippingAddress.city}
                </p>
              </section>

              <Separator />

              <section className="space-y-2">
                <h4 className="font-semibold">Sản phẩm</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="size-12 rounded object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1">{item.productName}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>

                      {item.packagingUnit ? (
                        <p className="text-xs text-muted-foreground">
                          Quy cách: {item.packagingQty} {item.packagingUnit}
                        </p>
                      ) : null}
                      {item.customization ? (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="inline-block rounded bg-secondary px-1.5 py-px font-medium text-foreground/80">
                            {item.customization.type}
                          </span>
                          {item.customization.extraPrice ? (
                            <span className="text-muted-foreground">+{formatCurrency(item.customization.extraPrice)}</span>
                          ) : null}

                          {item.customization.inputType === 'text' && item.customization.text ? (
                            <span className="line-clamp-1 text-muted-foreground">“{item.customization.text}”</span>
                          ) : null}

                          {item.customization.inputType === 'image' && item.customization.text ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={item.customization.text}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block"
                                title="Nhấn để xem ảnh đầy đủ"
                              >
                                <img
                                  src={item.customization.text}
                                  alt="Tùy chỉnh in"
                                  className="h-9 w-9 rounded border border-border object-cover hover:ring-1 hover:ring-primary"
                                />
                              </a>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleDownloadCustomizationImage(item.customization!.text!, item)}
                                title="Tải ảnh về để in ấn"
                              >
                                <Download className="mr-1 size-3" />
                                Tải ảnh
                              </Button>
                            </div>
                          ) : null}
                          {item.customizationStatus ? (
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {CUSTOMIZATION_STATUS_LABELS[item.customizationStatus]}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </section>

              {order.trackingNumber ? (
                <>
                  <Separator />
                  <section className="rounded-lg border bg-muted/20 p-3">
                    <h4 className="mb-1 font-semibold">Theo dõi vận chuyển</h4>
                    {order.shippingCarrier ? (
                      <p>Đơn vị: {SHIPPING_CARRIER_LABELS[order.shippingCarrier]}</p>
                    ) : null}
                    <p className="font-medium">Mã vận đơn: {order.trackingNumber}</p>
                  </section>
                </>
              ) : null}

              <Separator />

              <section className="space-y-1">
                <Row label="Tạm tính" value={formatCurrency(order.subtotal)} />
                <Row label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
                {order.discount > 0 ? <Row label="Giảm giá" value={`−${formatCurrency(order.discount)}`} /> : null}
                <Row label="Tổng cộng" value={formatCurrency(order.total)} bold />
                <Row label="Thanh toán" value={`${PAYMENT_METHOD_LABELS[order.paymentMethod]} · ${PAYMENT_STATUS_LABELS[order.paymentStatus]}`} />
                {order.paymentDueDate ? (
                  <Row label="Hạn thanh toán" value={formatDate(order.paymentDueDate)} />
                ) : null}
                {order.estimatedDeliveryDate ? (
                  <Row label="Dự kiến giao" value={formatDate(order.estimatedDeliveryDate)} />
                ) : null}
                {order.quotationId ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-muted-foreground">Báo giá nguồn</span>
                    <Button asChild variant="link" size="sm" className="h-auto px-0">
                      <Link to="/quotations">{order.quotationId}</Link>
                    </Button>
                  </div>
                ) : null}
              </section>

              {['delivered', 'shipping', 'confirmed', 'processing'].includes(order.status) ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      const data = await invoiceApi.getByOrder(order.id)
                      if (data.invoice) {
                        openVatInvoicePrint(data.order, data.invoice)
                        return
                      }
                      const created = await invoiceApi.createForOrder(order.id, { requestInvoice: true })
                      openVatInvoicePrint(created.order, created.invoice)
                    } catch {
                      toast.error('Không thể xuất hóa đơn VAT')
                    }
                  }}
                >
                  <FileText className="size-4" />
                  Xuất hóa đơn VAT
                </Button>
              ) : null}

              {order.timeline.length > 0 ? (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h4 className="font-semibold">Lịch sử đơn hàng</h4>
                    <ol className="space-y-2 border-l border-border pl-4">
                      {order.timeline.map((t, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-primary" />
                          <p className="font-medium">{ORDER_STATUS_LABELS[t.status]}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(t.date)}
                            {t.note ? ` · ${t.note}` : ''}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              ) : null}

              {order.returnRequest ? (
                <>
                  <Separator />
                  <section className="rounded-lg bg-muted p-3">
                    <h4 className="font-semibold">Yêu cầu hoàn trả</h4>
                    <p className="text-muted-foreground">Lý do: {order.returnRequest.reason}</p>
                    <p className="text-muted-foreground">Trạng thái: {order.returnRequest.status}</p>
                  </section>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold text-primary' : 'font-medium'}>{value}</span>
    </div>
  )
}
