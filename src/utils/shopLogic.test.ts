import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeSecretPriceCode,
  decodeSecretPriceCode,
  validateSecretPriceCodeKey,
  calculateCartTotals,
  calculateShopMetrics,
  calculatePeriodMetrics,
} from './shopLogic';
import {
  addPersistedCategory,
  deletePersistedCategory,
  addPersistedSize,
  deletePersistedSize,
} from '../data/seedData';
import { Product } from '../types/shop';

const sampleProduct: Product = {
  id: 'prod-1',
  ownerId: 'owner-1',
  name: 'প্রিমিয়াম পাঞ্জাবি',
  sku: 'PNJ-101',
  category: 'পাঞ্জাবি',
  size: 'L',
  color: 'মেরুন',
  fabric: '১০০% সুতি',
  buyPrice: 800,
  sellPrice: 1200,
  askingPrice: 1500,
  stock: 10,
  minStockAlert: 3,
  cashPurchaseSpent: 8000,
  purchaseDateISO: '2025-05-15',
};

describe('shopLogic core unit tests', () => {
  it('encodes and decodes secret price codes round-trip', () => {
    const code = encodeSecretPriceCode(1250, 'XBANGLDESH');
    assert.equal(decodeSecretPriceCode(code, 'XBANGLDESH'), 1250);
    assert.equal(validateSecretPriceCodeKey('XBANGLDESH'), null);
    assert.notEqual(validateSecretPriceCodeKey('SHORT'), null);
  });

  it('calculates cart totals with discount, due, and extra bargaining profit', () => {
    const cart = [{ product: sampleProduct, quantity: 2, customUnitPrice: 1200 }];
    const normal = calculateCartTotals(cart, 100, 2300, 'discount');
    assert.equal(normal.subtotal, 2400);
    assert.equal(normal.discount, 100);
    assert.equal(normal.grandTotal, 2300);
    assert.equal(normal.estimatedProfit, 700);

    const extra = calculateCartTotals(cart, 0, 2600, 'discount');
    assert.equal(extra.extraBargainingProfit, 200);
    assert.equal(extra.grandTotal, 2600);
    assert.equal(extra.estimatedProfit, 1000);
  });

  it('calculates shop financial summary and period summary consistently', () => {
    const sales = [
      {
        id: 'sale-1',
        ownerId: 'owner-1',
        invoiceNo: 'MEMO-1001',
        customerName: 'করিম সাহেব',
        customerPhone: '01700000000',
        itemsSummary: 'প্রিমিয়াম পাঞ্জাবি (L) ×1',
        totalItemsCount: 1,
        subtotal: 1300,
        discount: 0,
        extraBargainingProfit: 100,
        grandTotal: 1300,
        paidAmount: 1300,
        dueAmount: 0,
        profit: 500,
        paymentMethod: 'নগদ (Cash)' as const,
        saleDateISO: '2025-05-15',
        dateLabel: 'আজ, 10:00 AM',
      },
    ];
    const expenses = [
      {
        id: 'exp-1',
        ownerId: 'owner-1',
        title: 'চা-নাস্তা',
        category: 'দোকান আপ্যায়ন ও চা-নাস্তা' as const,
        amount: 100,
        expenseDateISO: '2025-05-15',
        dateLabel: 'আজ, 11:00 AM',
      },
    ];

    const summary = calculateShopMetrics(
      [sampleProduct],
      sales,
      [],
      expenses,
      10000,
      '2025-05-15',
      []
    );
    assert.equal(summary.totalSalesRevenue, 1300);
    assert.equal(summary.totalExpenses, 100);
    assert.equal(summary.netProfit, 400);
    assert.equal(summary.totalExtraBargainingProfit, 100);

    const period = calculatePeriodMetrics({
      sales,
      expenses,
      products: [sampleProduct],
      mode: 'today',
      referenceTodayISO: '2025-05-15',
    });
    assert.equal(period.revenue, 1300);
    assert.equal(period.netProfit, 400);
  });

  it('adds and deletes custom categories and sizes', () => {
    const withNewCat = addPersistedCategory('শেরওয়ানি');
    assert.ok(withNewCat.includes('শেরওয়ানি'));
    const afterDeleteCat = deletePersistedCategory('শেরওয়ানি');
    assert.ok(!afterDeleteCat.includes('শেরওয়ানি'));

    const withNewSize = addPersistedSize('46');
    assert.ok(withNewSize.includes('46'));
    const afterDeleteSize = deletePersistedSize('46');
    assert.ok(!afterDeleteSize.includes('46'));
  });
});

