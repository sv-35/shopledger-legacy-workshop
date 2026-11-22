const assert = require('node:assert/strict');
const test = require('node:test');
const { computeInvoiceFigures } = require('../lib/invoice');

const discountedOrder = {
  id: 1002,
  coupon: 'SAVE10',
  items: [
    { name: 'Rice', sku: 'RICE', hsn: '1006', price: 640, qty: 1 },
    { name: 'Sunflower oil', sku: 'OIL', hsn: '1512', price: 190, qty: 2 },
  ],
};

const cappedOrder = {
  id: 1004,
  coupon: 'SAVE10',
  items: [{ name: 'Groundnut oil', hsn: '1508', price: 1120, qty: 2 }],
};

const mixedOrder = {
  id: 1007,
  items: [
    { name: 'Ghee', hsn: '0405', price: 450, qty: 2 },
    { name: 'Sunflower oil', hsn: '1512', price: 190, qty: 2 },
  ],
};

test('SAVE10 reduces the taxable value before 5% HSN GST', () => {
  const { subtotal, discount, tax, total } = computeInvoiceFigures(discountedOrder);
  assert.deepEqual({ subtotal, discount, tax, total }, {
    subtotal: 1020, discount: 102, tax: 45.90, total: 963.90,
  });
});

test('invoice applies the ₹150 SAVE10 cap', () => {
  const { discount, tax, total } = computeInvoiceFigures(cappedOrder);
  assert.deepEqual({ discount, tax, total }, { discount: 150, tax: 104.50, total: 2194.50 });
});

test('invoice uses the 12% and 5% HSN slabs without a coupon', () => {
  const { rows } = computeInvoiceFigures(mixedOrder);
  assert.deepEqual(rows.map(({ gstPercent, lineTax }) => [gstPercent, lineTax]), [
    [12, 108], [5, 19],
  ]);
});

test('all-18% order without a coupon reconciles with its ledger totals', () => {
  const { subtotal, discount, tax, cgst, sgst, total } = computeInvoiceFigures({
    items: [
      { name: 'Tea', hsn: '0902', price: 140, qty: 1 },
      { name: 'Syrup', hsn: '2106', price: 180, qty: 2 },
    ],
  });
  assert.deepEqual({ subtotal, discount, tax, cgst, sgst, total }, {
    subtotal: 500, discount: 0, tax: 90, cgst: 45, sgst: 45, total: 590,
  });
});

test('invoice audit reconciles the discounted order to the recorded bill', () => {
  const { getGstReconciliation } = require('../lib/reports');
  const order = { ...discountedOrder, subtotal: 1020, discount: 102, tax: 45.90, total: 963.90 };
  const { mismatchCount, rows } = getGstReconciliation({ orders: [order] });

  assert.deepEqual(
    [mismatchCount, rows[0].invoiceTotal, rows[0].invoiceTax, rows[0].delta],
    [0, 963.90, 45.90, 0],
  );
});

test('invoice renders GST calculated after allocating the flat coupon across slabs', () => {
  const { render } = require('../lib/invoice');
  const html = render({
    id: 1003,
    coupon: 'FLAT50',
    total: 399.35,
    items: [
      { name: 'Ghee', hsn: '0405', price: 260, qty: 1 },
      { name: 'Tea', hsn: '0902', price: 140, qty: 1 },
    ],
  });

  assert.match(html, /12%<\/td><td class="r">₹27\.30/);
  assert.match(html, /18%<\/td><td class="r">₹22\.05/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹399\.35/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('invoice handles explicit fractional and zero GST rates with per-line rounding', () => {
  const { rows, tax, cgst, sgst } = computeInvoiceFigures({
    items: [
      { name: 'Small taxable line', gstRate: 0.05, price: 0.30, qty: 1 },
      { name: 'Tax-exempt line', gstRate: 0, price: 1, qty: 1 },
      { name: 'Small taxable line', gstRate: 5, price: 0.20, qty: 1 },
    ],
  });

  assert.deepEqual(rows.map(({ gstPercent, lineTax }) => [gstPercent, lineTax]), [
    [5, 0.02], [0, 0], [5, 0.01],
  ]);
  assert.deepEqual({ tax, cgst, sgst }, { tax: 0.03, cgst: 0.02, sgst: 0.01 });
});

test('audit still flags a genuine mismatch with stored billing', () => {
  const { getGstReconciliation } = require('../lib/reports');
  const order = { ...cappedOrder, subtotal: 2240, discount: 150, tax: 104.49, total: 2194.49 };
  const { mismatchCount, rows } = getGstReconciliation({ orders: [order] });
  assert.equal(mismatchCount, 1);
  assert.equal(rows[0].delta, 0.01);
});
