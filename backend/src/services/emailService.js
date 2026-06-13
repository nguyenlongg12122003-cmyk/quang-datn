const nodemailer = require('nodemailer');

const CUSTOMER_TYPE_LABELS = {
  retail: 'Giá lẻ',
  wholesale: 'Giá sỉ',
  enterprise: 'Giá đại lý',
};

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  if (!to) {
    return { skipped: true, reason: 'no-recipient' };
  }

  if (!isSmtpConfigured()) {
    console.log('[email] SMTP not configured — would send:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text || html}`);
    return { skipped: true, reason: 'smtp-not-configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = createTransport();
  const info = await transport.sendMail({ from, to, subject, html, text });
  return { messageId: info.messageId };
}

async function sendBusinessApprovedEmail({ email, name, companyName, customerType }) {
  const storeUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  const priceLabel = CUSTOMER_TYPE_LABELS[customerType] || CUSTOMER_TYPE_LABELS.wholesale;
  const displayName = name || companyName || 'Quý khách';

  const subject = `[Quang VPP] Hồ sơ doanh nghiệp đã được duyệt`;
  const text = [
    `Xin chào ${displayName},`,
    '',
    `Hồ sơ doanh nghiệp "${companyName}" đã được admin phê duyệt.`,
    `Nhóm giá áp dụng: ${priceLabel}.`,
    '',
    `Bạn có thể đăng nhập và mua hàng với giá B2B tại: ${storeUrl}`,
    '',
    'Trân trọng,',
    'Quang VPP',
  ].join('\n');

  const html = `
    <p>Xin chào <strong>${displayName}</strong>,</p>
    <p>Hồ sơ doanh nghiệp <strong>${companyName}</strong> đã được admin phê duyệt.</p>
    <p>Nhóm giá áp dụng: <strong>${priceLabel}</strong>.</p>
    <p><a href="${storeUrl}">Đăng nhập và mua hàng</a> — giá B2B sẽ tự động áp dụng khi thêm vào giỏ.</p>
    <p>Trân trọng,<br/>Quang VPP</p>
  `;

  return sendMail({ to: email, subject, html, text });
}

module.exports = {
  sendMail,
  sendBusinessApprovedEmail,
};