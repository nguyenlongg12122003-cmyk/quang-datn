/**
 * Smoke test: DN approval → email → B2B pricing / cart reprice APIs
 * Run: node scripts/test-b2b-flow.js
 */
const BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login(email, password = '123456') {
  const { status, data } = await request('POST', '/auth/login', {
    body: { email, password },
  });
  if (status !== 200 || !data?.token) {
    throw new Error(`Login failed for ${email}: ${status} ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function pricingForQty(product, qty, customerType = 'retail') {
  const base =
    product.isFlashSale && product.flashSalePrice != null ? product.flashSalePrice : product.price;
  const groupPrices = product.groupPrices || {};
  let tiers = [];
  if (customerType === 'retail') {
    tiers = product.wholesalePrice || [];
  } else if (customerType === 'enterprise' && groupPrices.enterprise?.length) {
    tiers = groupPrices.enterprise;
  } else if (customerType === 'wholesale' && groupPrices.wholesale?.length) {
    tiers = groupPrices.wholesale;
  }
  const applicable = tiers.filter((t) => qty >= t.minQty).map((t) => t.price);
  if (!applicable.length) return base;
  return Math.min(base, ...applicable);
}

async function main() {
  console.log('\n=== B2B flow smoke test ===\n');

  const admin = await login('phanquang@admin.com');
  console.log('Admin logged in');

  // --- A) Approval + customerType (user-5) ---
  console.log('\nA) Approve / upgrade user-5 → wholesale');
  const review = await request('PATCH', '/business/user-5/review', {
    token: admin.token,
    body: { status: 'approved', customerType: 'wholesale', note: 'Smoke test B2B' },
  });
  assert(review.status === 200, 'PATCH /business/user-5/review OK');
  assert(review.data?.profile?.status === 'approved', 'Profile approved');

  const user5 = await login('pendingbiz@company.com');
  assert(user5.user.customerType === 'wholesale', 'user-5 customerType = wholesale after re-approve');

  const me5 = await request('GET', '/business/me', { token: user5.token });
  assert(me5.data?.profile?.status === 'approved', 'user-5 /business/me approved');

  console.log('\nA2) Email service (dev: console log)');
  const { sendBusinessApprovedEmail } = require('../src/services/emailService');
  const emailResult = await sendBusinessApprovedEmail({
    email: me5.data?.profile?.contactEmail,
    name: user5.user.name,
    companyName: me5.data?.profile?.companyName,
    customerType: 'wholesale',
  });
  assert(emailResult.skipped === true, 'Email fallback when SMTP unset');

  // --- B) Existing wholesale account (user-3) ---
  console.log('\nB) Wholesale account abcwholesale@business.com');
  const wholesale = await login('abcwholesale@business.com');
  assert(wholesale.user.customerType === 'wholesale', 'user-3 already wholesale');

  // --- C) Bulk products API ---
  console.log('\nC) POST /catalog/products/by-ids');
  const bulk = await request('POST', '/catalog/products/by-ids', {
    body: { ids: ['prod-001', 'prod-002', 'prod-016', 'not-exist'] },
  });
  assert(bulk.status === 200, 'by-ids returns 200');
  assert(bulk.data.length === 3, 'Returns 3 products');

  // --- D) Cart reprice simulation ---
  console.log('\nD) Cart reprice (wholesale tiers)');
  const scenarios = [
    { id: 'prod-001', qty: 1, expectWholesale: 5000, note: 'flash sale beats tier at low qty' },
    { id: 'prod-001', qty: 50, expectWholesale: 5000, note: 'flash 5000 < tier 5400 → min wins' },
    { id: 'prod-002', qty: 50, expectRetail: 4500, expectWholesale: 5000, note: 'retail=dùng wholesalePrice; B2B cần groupPrices.wholesale' },
    { id: 'prod-016', qty: 99, expectRetailOnly: true },
    { id: 'prod-016', qty: 100, expectWholesale: 2600 },
  ];

  const byId = Object.fromEntries(bulk.data.map((p) => [p.id, p]));
  for (const s of scenarios) {
    const p = byId[s.id];
    const retail = pricingForQty(p, s.qty, 'retail');
    const ws = pricingForQty(p, s.qty, 'wholesale');
    const note = s.note ? ` (${s.note})` : '';
    console.log(`  ${s.id} qty=${s.qty}: retail=${retail}, wholesale=${ws}${note}`);
    if (s.expectRetail != null) assert(retail === s.expectRetail, `${s.id} qty${s.qty} retail=${s.expectRetail}`);
    if (s.expectWholesale != null) assert(ws === s.expectWholesale, `${s.id} qty${s.qty} wholesale=${s.expectWholesale}`);
    if (s.expectRetailOnly) assert(ws === retail, `${s.id} qty${s.qty} no B2B tier`);
  }

  // --- E) Product detail has tiers ---
  console.log('\nE) Product detail tiers');
  const detail = await request('GET', '/catalog/products/prod-001');
  assert(detail.status === 200, 'GET product detail OK');
  assert(detail.data.wholesalePrice?.length >= 2, 'prod-001 has wholesale tiers');
  assert(detail.data.groupPrices?.wholesale?.length >= 2, 'prod-001 groupPrices.wholesale synced');

  // --- F) Checkout backend re-prices (catalog mode) ---
  console.log('\nF) Checkout re-prices for wholesale user');
  const addr = wholesale.user.addresses?.[0];
  assert(addr != null, 'wholesale user has shipping address');

  const orderRes = await request('POST', '/orders', {
    token: wholesale.token,
    body: {
      items: [
        {
          productId: 'prod-016',
          productName: 'Bìa lá A4',
          price: 9999,
          quantity: 100,
        },
      ],
      paymentMethod: 'cod',
      shippingMethod: 'standard',
      shippingFee: 30000,
      discount: 0,
      shippingAddress: addr,
      note: 'B2B smoke test — will cancel',
    },
  });
  assert(orderRes.status === 201, `Create order OK (${orderRes.status}: ${JSON.stringify(orderRes.data)})`);
  const orderId = orderRes.data?.id;
  const myOrders = await request('GET', '/orders/my-orders', { token: wholesale.token });
  const orderDetail = myOrders.data?.find((o) => o.id === orderId);
  assert(orderDetail != null, 'Order visible in /orders/my-orders');
  const line = orderDetail?.items?.[0];
  assert(line?.price === 2600, `Order line price = 2600 (got ${line?.price})`);
  assert(orderDetail.subtotal === 260000, `Subtotal 260000 (got ${orderDetail.subtotal})`);
  console.log(`  Order ${orderId}: ${line.quantity} x ${line.price} = tier wholesale price`);
  const cancelRes = await request('POST', `/orders/${orderId}/cancel`, {
    token: wholesale.token,
    body: { reason: 'Smoke test cleanup' },
  });
  assert(cancelRes.status === 200, 'Order cancelled for cleanup');

  console.log('\n=== All API checks passed ===');
  console.log('\nUI manual test:');
  console.log('  1. http://localhost:5173 — login abcwholesale@business.com / 123456');
  console.log('  2. Open prod-001 → tier table highlighted, badge on card');
  console.log('  3. prod-002: add 50 sp → cart ~4500/sp; prod-016: 100 sp → 2600/sp');
  console.log('  4. Admin approve another DN → check terminal for [email] log\n');
}

main().catch((err) => {
  console.error('\n' + err.message + '\n');
  process.exit(1);
});