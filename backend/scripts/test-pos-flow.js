/**
 * Smoke test POS flow (cash sale):
 *   node scripts/test-pos-flow.js
 *
 * Requires backend running on PORT (default 5000) and admin login.
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `${method} ${path} → ${res.status}`);
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function loginAdmin() {
  const candidates = [
    { email: 'phanquang@admin.com', password: '123456' },
    { email: 'quang@admin.com', password: '123456' },
  ];
  for (const cred of candidates) {
    try {
      const res = await request('POST', '/auth/login', { body: cred });
      if (res.token) return res;
    } catch {
      // try next
    }
  }
  throw new Error('Không đăng nhập được admin. Chạy seed hoặc createAdmin trước.');
}

async function main() {
  console.log('POS flow smoke test\n');

  const admin = await loginAdmin();
  console.log(`✓ Admin: ${admin.user.email}`);

  const product = await request('GET', '/inventory/by-barcode/8850001234567', {
    token: admin.token,
  });
  assert(product.id, 'Barcode lookup returns product');
  console.log(`✓ Barcode → ${product.name} (tồn ${product.stock})`);

  const beforeStock = product.stock;

  const created = await request('POST', '/orders/pos', {
    token: admin.token,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'cash',
      customerName: 'Test POS',
      note: 'Smoke test POS',
    },
  });

  assert(created.id, 'POS order created');
  assert(created.salesChannel === 'pos', 'salesChannel = pos');
  assert(created.paymentMethod === 'cash', 'paymentMethod = cash');
  assert(created.paymentStatus === 'paid', 'cash → paid immediately');
  assert(created.status === 'delivered', 'cash → delivered immediately');
  console.log(`✓ Cash POS order ${created.id} — total ${created.total}`);

  const order = await request('GET', `/orders/${created.id}`, { token: admin.token });
  assert(order.salesChannel === 'pos', 'Order detail has salesChannel pos');
  assert(order.items.length === 1, 'Order has 1 line');
  console.log('✓ Order detail OK');

  const after = await request('GET', `/inventory/by-barcode/8850001234567`, {
    token: admin.token,
  });
  assert(after.stock === beforeStock - 1, `Stock deducted (${beforeStock} → ${after.stock})`);
  console.log(`✓ Stock deducted: ${beforeStock} → ${after.stock}`);

  const list = await request('GET', '/orders?salesChannel=pos&limit=5', { token: admin.token });
  assert(list.items.some((o) => o.id === created.id), 'POS order appears in filtered list');
  console.log('✓ POS filter on orders list OK');

  // Cancel validation: cash/delivered order cannot be cancelled via POS PayOS cancel
  try {
    await request('POST', `/orders/pos/${created.id}/cancel`, { token: admin.token, body: {} });
    throw new Error('Expected cancel to fail for completed cash order');
  } catch (err) {
    assert(String(err.message).includes('chờ thanh toán') || String(err.message).includes('PayOS'), 'cash order cancel rejected');
    console.log('✓ Cancel guard rejects non-pending PayOS orders');
  }

  console.log('\nAll POS smoke checks passed.');
}

main().catch((err) => {
  console.error('\n✗', err.message);
  process.exit(1);
});