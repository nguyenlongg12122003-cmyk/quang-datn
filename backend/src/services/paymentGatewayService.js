const { VNPay, ignoreLogger } = require('vnpay');
const { PayOS } = require('@payos/node');

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const VNPAY_RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/orders/vnpay-return';
const PAYOS_RETURN_URL = process.env.PAYOS_RETURN_URL || new URL('/payment/payos-return', FRONTEND_BASE_URL).toString();
const PAYOS_CANCEL_URL = process.env.PAYOS_CANCEL_URL || PAYOS_RETURN_URL;

function resolveVNPayHost() {
  const raw = process.env.VNPAY_HOST || process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://sandbox.vnpayment.vn';
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip?.replace('::ffff:', '') || '127.0.0.1';
}

function getVNPayGateway() {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secureSecret = process.env.VNPAY_SECURE_SECRET || process.env.VNPAY_HASH_SECRET;

  if (!tmnCode || !secureSecret) return null;

  return new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost: resolveVNPayHost(),
    testMode: String(process.env.VNPAY_TEST_MODE || 'true') === 'true',
    hashAlgorithm: 'SHA512',
    enableLog: false,
    loggerFn: ignoreLogger,
  });
}

function getPayOSGateway() {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) return null;

  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
    partnerCode: process.env.PAYOS_PARTNER_CODE || undefined,
    baseURL: process.env.PAYOS_BASE_URL || undefined,
  });
}

function getPayOSOrderCode(orderId) {
  const digits = String(orderId || '').replace(/\D/g, '');
  const orderCode = Number(digits);
  if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
    throw new Error('Không thể tạo orderCode hợp lệ cho PayOS');
  }
  return orderCode;
}

async function buildGatewayPaymentFields(req, created, shippingAddress) {
  const normalizedPaymentMethod = created.paymentMethod;

  if (normalizedPaymentMethod === 'vnpay') {
    const vnpay = getVNPayGateway();
    if (!vnpay) {
      throw new Error('VNPay chưa được cấu hình trên server');
    }

    const payableAmount = Math.round(Number(created.total || 0));
    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      throw new Error('Số tiền thanh toán không hợp lệ');
    }

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: payableAmount,
      vnp_IpAddr: getClientIp(req),
      vnp_ReturnUrl: VNPAY_RETURN_URL,
      vnp_TxnRef: created.id,
      vnp_OrderInfo: `Thanh toan don hang ${created.id}`,
    });

    return {
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: 'pending',
      paymentUrl,
    };
  }

  if (normalizedPaymentMethod === 'payos') {
    const payos = getPayOSGateway();
    if (!payos) {
      throw new Error('PayOS chưa được cấu hình trên server');
    }

    const payableAmount = Math.round(Number(created.total || 0));
    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      throw new Error('Số tiền thanh toán không hợp lệ');
    }

    const paymentLink = await payos.paymentRequests.create({
      orderCode: getPayOSOrderCode(created.id),
      amount: payableAmount,
      description: `Thanh toan ${created.id}`.slice(0, 25),
      returnUrl: PAYOS_RETURN_URL,
      cancelUrl: PAYOS_CANCEL_URL,
      buyerName: shippingAddress?.name ? String(shippingAddress.name).slice(0, 100) : undefined,
      buyerPhone: shippingAddress?.phone ? String(shippingAddress.phone).slice(0, 20) : undefined,
      buyerAddress: [shippingAddress?.street, shippingAddress?.ward, shippingAddress?.district, shippingAddress?.city]
        .filter(Boolean)
        .join(', ')
        .slice(0, 255) || undefined,
      items: [{ name: `Don hang ${created.id}`.slice(0, 25), quantity: 1, price: payableAmount }],
    });

    return {
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: 'pending',
      paymentUrl: paymentLink.checkoutUrl,
    };
  }

  return {
    paymentMethod: normalizedPaymentMethod,
    paymentStatus: created.paymentStatus || 'pending',
    paymentUrl: null,
  };
}

module.exports = {
  buildGatewayPaymentFields,
  getVNPayGateway,
  getPayOSGateway,
  getClientIp,
  getPayOSOrderCode,
};