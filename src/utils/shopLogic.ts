import {
  CartItem,
  Customer,
  Expense,
  ExtraIncome,
  Product,
  ProductPurchaseEntry,
  Sale,
  SaleItemSnapshot,
  UnifiedTransaction,
} from '../types/shop';

export const DEFAULT_SECRET_KEY = 'XBANGLDESH';
export const DEFAULT_PRICE_CODE_KEY = DEFAULT_SECRET_KEY;

/**
 * Formats a number into Bangladeshi Taka (৳) with clean English numerals (1, 2, 3...)
 */
export function formatBDT(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `৳ ${safe.toLocaleString('en-IN')}`;
}

/**
 * Normalizes a 10-character cipher key (indices 0..9 -> digits 0..9).
 */
export function normalizeSecretPriceCodeKey(rawKey?: string): string {
  if (!rawKey) return DEFAULT_SECRET_KEY;
  const cleaned = rawKey.trim().toUpperCase().replace(/\s+/g, '');
  if (cleaned.length !== 10) return DEFAULT_SECRET_KEY;
  const uniqueChars = new Set(cleaned.split(''));
  if (uniqueChars.size !== 10) return DEFAULT_SECRET_KEY;
  return cleaned;
}

export const sanitizePriceCodeKey = normalizeSecretPriceCodeKey;
export const normalizePriceCodeKey = normalizeSecretPriceCodeKey;

/**
 * Validates a user-provided 10-character cipher key and returns a Bengali error message if invalid.
 */
export function validateSecretPriceCodeKey(rawKey: string): string | null {
  const cleaned = rawKey.trim().toUpperCase().replace(/\s+/g, '');
  if (cleaned.length !== 10) {
    return `গোপন কোড শব্দটি অবশ্যই ঠিক ১০ অক্ষরের হতে হবে (বর্তমানে ${cleaned.length} অক্ষর আছে, যেমন: XBANGLDESH)।`;
  }
  const uniqueChars = new Set(cleaned.split(''));
  if (uniqueChars.size !== 10) {
    return '১০টি অক্ষরই আলাদা হতে হবে — কোনো অক্ষর দুইবার ব্যবহার করা যাবে না।';
  }
  return null;
}

export const validatePriceCodeKey = validateSecretPriceCodeKey;

/**
 * Encodes a numeric buying price into a secret cipher code string for garment tags.
 */
export function encodeSecretPriceCode(
  price: number,
  rawKey: string = DEFAULT_SECRET_KEY
): string {
  const key = normalizeSecretPriceCodeKey(rawKey);
  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  const digits = String(safePrice).split('');
  return digits
    .map((d) => {
      const idx = Number(d);
      return key[idx] ?? d;
    })
    .join('');
}

export const encodePriceToCode = encodeSecretPriceCode;
export const encodeCostToSecretWord = encodeSecretPriceCode;

/**
 * Decodes a secret cipher code string back into its numeric buying price.
 */
export function decodeSecretPriceCode(
  code: string,
  rawKey: string = DEFAULT_SECRET_KEY
): number | null {
  const key = normalizeSecretPriceCodeKey(rawKey);
  const cleaned = code.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) return null;

  let numStr = '';
  for (const ch of cleaned) {
    const idx = key.indexOf(ch);
    if (idx === -1) return null;
    numStr += String(idx);
  }
  const parsed = Number(numStr);
  return Number.isFinite(parsed) ? parsed : null;
}

export const decodeSecretWordToCost = decodeSecretPriceCode;
export const decodeCodeToPrice = decodeSecretPriceCode;

/**
 * Returns the suggested customer asking price (বলার দাম) for bargaining.
 */
export function getProductAskingPrice(
  product: Pick<Product, 'sellPrice' | 'askingPrice'>
): number {
  const minSell = Math.max(0, Math.round(Number(product.sellPrice) || 0));
  const customAsk = Math.round(Number(product.askingPrice) || 0);
  if (customAsk >= minSell && customAsk > 0) {
    return customAsk;
  }
  if (minSell <= 0) return 0;
  return Math.ceil((minSell * 1.3) / 50) * 50;
}

export const getSuggestedAskingPrice = getProductAskingPrice;

/**
 * Converts a Gmail address into a deterministic, URL-safe Firestore document ID.
 */
export function sanitizeEmailForCloudDoc(email?: string | null): string {
  const cleaned = (email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return cleaned || 'default_shop';
}

export const emailToDocId = sanitizeEmailForCloudDoc;

/**
 * Parses either raw JSON or a full JS snippet copied from Firebase Console.
 */
export function parseSmartFirebaseConfig(
  rawInput: string
): Record<string, string> | null {
  const text = rawInput.trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && parsed.apiKey && parsed.projectId) {
      return parsed;
    }
  } catch {
    // Fallback to regex extraction
  }

  const keys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'measurementId',
    'firestoreDatabaseId',
  ];
  const extracted: Record<string, string> = {};
  for (const key of keys) {
    const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
    const match = text.match(regex);
    if (match && match[1]) {
      extracted[key] = match[1].trim();
    }
  }

  if (extracted.apiKey && extracted.projectId) {
    return extracted;
  }
  return null;
}

export function parseFirebaseConfigSnippet(rawInput: string): {
  config: Record<string, string> | null;
  error: string | null;
} {
  const config = parseSmartFirebaseConfig(rawInput);
  if (!config) {
    return {
      config: null,
      error: 'Firebase Config-এ apiKey, authDomain এবং projectId পাওয়া যায়নি।',
    };
  }
  return { config, error: null };
}

/**
 * Sanitizes and sorts a list of sales so malformed records cannot break renders or metrics.
 */
export function sanitizeSalesList(sales: Sale[]): Sale[] {
  if (!Array.isArray(sales)) return [];
  const todayFallback = getTodayISO();

  return sales
    .filter((s): s is Sale => Boolean(s && typeof s === 'object'))
    .map((s, idx) => {
      const grandTotal = Math.max(
        0,
        Math.round(
          Number(
            s.grandTotal ??
              (s as unknown as Record<string, unknown>).totalAmount ??
              (s as unknown as Record<string, unknown>).amount ??
              s.subtotal ??
              s.paidAmount ??
              0
          ) || 0
        )
      );
      const subtotal = Math.max(
        grandTotal,
        Math.round(Number(s.subtotal ?? grandTotal) || grandTotal)
      );
      const discount = Math.max(0, Math.round(Number(s.discount) || 0));
      const extraBargainingProfit = Math.max(
        0,
        Math.round(Number(s.extraBargainingProfit) || 0)
      );
      const dueAmount = Math.max(0, Math.round(Number(s.dueAmount) || 0));
      const paidAmount = Math.max(
        0,
        Math.round(
          Number(s.paidAmount ?? Math.max(0, grandTotal - dueAmount)) || 0
        )
      );
      const profit = Math.round(
        Number(
          s.profit ??
            (s as unknown as Record<string, unknown>).profitAmount ??
            (s as unknown as Record<string, unknown>).netProfit ??
            (s as unknown as Record<string, unknown>).estimatedProfit ??
            0
        ) || 0
      );

      let saleDateISO =
        typeof s.saleDateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.saleDateISO)
          ? s.saleDateISO
          : '';
      if (!saleDateISO && typeof s.createdAtISO === 'string' && s.createdAtISO.length >= 10) {
        const prefix = s.createdAtISO.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) {
          saleDateISO = prefix;
        }
      }
      if (!saleDateISO) {
        saleDateISO = todayFallback;
      }

      const itemsSummary =
        typeof s.itemsSummary === 'string' && s.itemsSummary.trim()
          ? s.itemsSummary.trim()
          : typeof s.note === 'string' && s.note.trim()
          ? s.note.trim()
          : s.isQuickLumpSum
          ? 'দ্রুত খুচরা বিক্রি'
          : 'পোশাক বিক্রয় মেমো';

      return {
        ...s,
        id: s.id || `sale-auto-${idx}-${Date.now()}`,
        ownerId: s.ownerId || 'local-owner',
        invoiceNo: s.invoiceNo || `MEMO-${1000 + idx}`,
        customerName: s.customerName || 'নগদ ক্রেতা',
        customerPhone: s.customerPhone || '',
        itemsSummary,
        totalItemsCount: Math.max(1, Math.round(Number(s.totalItemsCount) || 1)),
        subtotal,
        discount,
        ...(extraBargainingProfit > 0 ? { extraBargainingProfit } : {}),
        grandTotal,
        paidAmount,
        dueAmount,
        profit,
        paymentMethod: s.paymentMethod || 'নগদ (Cash)',
        saleDateISO,
        dateLabel: s.dateLabel || saleDateISO,
        createdAtISO: s.createdAtISO || `${saleDateISO}T12:00:00.000Z`,
      };
    })
    .filter((s) => s.grandTotal > 0 || s.paidAmount > 0 || s.dueAmount > 0)
    .sort((a, b) => {
      if (a.saleDateISO !== b.saleDateISO) {
        return b.saleDateISO.localeCompare(a.saleDateISO);
      }
      return (b.createdAtISO || '').localeCompare(a.createdAtISO || '');
    });
}

export const normalizeSalesList = sanitizeSalesList;
export const sanitizeAndSortSales = sanitizeSalesList;

/**
 * Returns local date in YYYY-MM-DD format.
 */
export function getTodayISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's date in YYYY-MM-DD format relative to a given YYYY-MM-DD string.
 */
export function getYesterdayISO(todayISO: string = getTodayISO()): string {
  const parts = todayISO.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return todayISO;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() - 1);
  return getTodayISO(dt);
}

export const getDateNDaysAgoISO = getYesterdayISO;

const BANGLA_MONTHS_SHORT = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
];

/**
 * Formats a YYYY-MM-DD string into a readable label like "15 মে, 2025"
 */
export function formatDateISOToDisplay(dateISO?: string): string {
  if (!dateISO) return '';
  const parts = dateISO.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateISO;
  const [year, month, day] = parts;
  const monthName = BANGLA_MONTHS_SHORT[month - 1] || String(month);
  return `${day} ${monthName}, ${year}`;
}

/**
 * Extracts time string (e.g., "04:30 PM") from a dateLabel or ISO timestamp.
 */
export function extractTimeLabel(dateLabel?: string, createdAtISO?: string): string {
  if (dateLabel) {
    const commaIdx = dateLabel.indexOf(',');
    if (commaIdx !== -1) {
      const afterComma = dateLabel.slice(commaIdx + 1).trim();
      if (afterComma) return afterComma;
    }
    if (/\d{1,2}:\d{2}/.test(dateLabel)) {
      return dateLabel.trim();
    }
  }
  if (createdAtISO) {
    const dt = new Date(createdAtISO);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return '';
}

/**
 * Dynamically formats any transaction's date & time relative to current todayISO.
 */
export function formatDynamicDateTime(
  dateISO?: string,
  fallbackDateLabel?: string,
  createdAtISO?: string,
  referenceTodayISO: string = getTodayISO()
): {
  relativeBadge: 'আজ' | 'গতকাল' | string;
  dateFormatted: string;
  timeFormatted: string;
  fullLabel: string;
} {
  let resolvedISO = dateISO || '';
  if (!resolvedISO && createdAtISO) {
    const dt = new Date(createdAtISO);
    if (!isNaN(dt.getTime())) {
      resolvedISO = getTodayISO(dt);
    }
  }
  if (!resolvedISO) {
    if (fallbackDateLabel?.includes('গতকাল')) {
      resolvedISO = getYesterdayISO(referenceTodayISO);
    } else {
      resolvedISO = referenceTodayISO;
    }
  }

  const yesterdayISO = getYesterdayISO(referenceTodayISO);
  const dateFormatted = formatDateISOToDisplay(resolvedISO);
  const timeFormatted = extractTimeLabel(fallbackDateLabel, createdAtISO);

  let relativeBadge: string = dateFormatted;
  if (resolvedISO === referenceTodayISO) {
    relativeBadge = 'আজ';
  } else if (resolvedISO === yesterdayISO) {
    relativeBadge = 'গতকাল';
  }

  const prefix =
    relativeBadge === 'আজ' || relativeBadge === 'গতকাল'
      ? `${relativeBadge} (${dateFormatted})`
      : dateFormatted;

  const fullLabel = timeFormatted ? `${prefix}, ${timeFormatted}` : prefix;

  return {
    relativeBadge,
    dateFormatted,
    timeFormatted,
    fullLabel,
  };
}

export const buildSaleDateMetadata = formatDynamicDateTime;

export function formatQuickSaleDefaultNote(
  selectedDateISO: string,
  referenceTodayISO: string = getTodayISO(),
  customNote?: string
): string {
  const trimmed = (customNote || '').trim();
  const isDefaultPlaceholder =
    !trimmed ||
    trimmed === 'আজকের খুচরা মোট বিক্রি' ||
    trimmed === 'গতকালের খুচরা মোট বিক্রি';

  if (!isDefaultPlaceholder) {
    return trimmed;
  }

  const yesterdayISO = getYesterdayISO(referenceTodayISO);
  if (selectedDateISO === referenceTodayISO) {
    return 'আজকের খুচরা মোট বিক্রি';
  }
  if (selectedDateISO === yesterdayISO) {
    return 'গতকালের খুচরা মোট বিক্রি';
  }
  return `${formatDateISOToDisplay(selectedDateISO)} তারিখের খুচরা মোট বিক্রি`;
}

export const buildQuickSaleItemsSummary = formatQuickSaleDefaultNote;

export function distributeExtraProfitToItemsRoundFigure(
  cart: CartItem[],
  extraProfit: number
): SaleItemSnapshot[] {
  const baseItems: SaleItemSnapshot[] = cart.map((item) => {
    const qty = Math.max(1, Math.round(item.quantity));
    const unitPrice =
      typeof item.customUnitPrice === 'number' && !isNaN(item.customUnitPrice)
        ? Math.max(0, Math.round(item.customUnitPrice))
        : item.product.sellPrice;
    return {
      productId: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      size: item.product.size,
      quantity: qty,
      buyPrice: item.product.buyPrice,
      unitPrice,
      lineTotal: unitPrice * qty,
    };
  });

  const safeExtra = Math.max(0, Math.round(extraProfit || 0));
  if (safeExtra <= 0 || baseItems.length === 0) {
    return baseItems;
  }

  let remainingExtra = safeExtra;
  const result = baseItems.map((it) => ({ ...it }));

  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (remainingExtra <= 0) break;

    if (i === result.length - 1) {
      if (remainingExtra % item.quantity === 0) {
        const addPerUnit = remainingExtra / item.quantity;
        item.unitPrice += addPerUnit;
        item.lineTotal = item.unitPrice * item.quantity;
        remainingExtra = 0;
      } else {
        item.lineTotal += remainingExtra;
        item.unitPrice = Math.round(item.lineTotal / item.quantity);
        remainingExtra = 0;
      }
    } else {
      const roundChunk =
        Math.floor(remainingExtra / (item.quantity * 50)) * (item.quantity * 50);
      if (roundChunk > 0 && roundChunk <= remainingExtra) {
        const addPerUnit = roundChunk / item.quantity;
        item.unitPrice += addPerUnit;
        item.lineTotal = item.unitPrice * item.quantity;
        remainingExtra -= roundChunk;
      }
    }
  }

  return result;
}

export function calculateQuickSaleStockMetrics(
  selections: Array<{ product: Product; quantity: number }>,
  enteredSaleAmount: number,
  manualProfitInput: string,
  defaultProfitPercent: number = 20
): {
  hasSelectedProducts: boolean;
  totalUnits: number;
  totalSelectedPieces: number;
  totalBuyCost: number;
  totalBuyingCost: number;
  totalCatalogSellPrice: number;
  suggestedRetailTotal: number;
  autoSuggestedSaleAmount: number;
  effectiveSaleAmount: number;
  calculatedProfit: number;
  impliedDiscount: number;
  discountGiven: number;
  impliedExtraBargainingProfit: number;
  extraBargainingProfit: number;
  itemsSnapshot: SaleItemSnapshot[];
  itemsSummaryText: string;
} {
  const validSelections = selections.filter(
    (s) => s.product && s.quantity > 0
  );
  const hasSelectedProducts = validSelections.length > 0;

  let totalUnits = 0;
  let totalBuyCost = 0;
  let totalCatalogSellPrice = 0;

  for (const s of validSelections) {
    const qty = Math.max(1, Math.round(s.quantity));
    totalUnits += qty;
    totalBuyCost += Math.round((s.product.buyPrice || 0) * qty);
    totalCatalogSellPrice += Math.round((s.product.sellPrice || 0) * qty);
  }

  const autoSuggestedSaleAmount = totalCatalogSellPrice;
  const effectiveSaleAmount =
    enteredSaleAmount > 0
      ? Math.round(enteredSaleAmount)
      : autoSuggestedSaleAmount;

  const hasManualProfit = manualProfitInput.trim() !== '';
  let calculatedProfit = 0;

  if (hasManualProfit) {
    calculatedProfit = Math.round(Number(manualProfitInput) || 0);
  } else if (hasSelectedProducts) {
    calculatedProfit = effectiveSaleAmount - totalBuyCost;
  } else {
    const safePercent = Math.max(0, Math.min(100, Number(defaultProfitPercent) || 20));
    calculatedProfit = Math.round((effectiveSaleAmount * safePercent) / 100);
  }

  const impliedDiscount =
    hasSelectedProducts && effectiveSaleAmount < totalCatalogSellPrice
      ? totalCatalogSellPrice - effectiveSaleAmount
      : 0;

  const impliedExtraBargainingProfit =
    hasSelectedProducts && effectiveSaleAmount > totalCatalogSellPrice
      ? effectiveSaleAmount - totalCatalogSellPrice
      : 0;

  let remainingSaleToAllocate = effectiveSaleAmount;
  const itemsSnapshot: SaleItemSnapshot[] = validSelections.map((s, idx) => {
    const qty = Math.max(1, Math.round(s.quantity));
    const catalogLine = Math.round((s.product.sellPrice || 0) * qty);
    let lineTotal = catalogLine;

    if (totalCatalogSellPrice > 0) {
      if (idx === validSelections.length - 1) {
        lineTotal = Math.max(0, remainingSaleToAllocate);
      } else {
        lineTotal = Math.round(
          (catalogLine / totalCatalogSellPrice) * effectiveSaleAmount
        );
        remainingSaleToAllocate -= lineTotal;
      }
    }

    const unitPrice = Math.round(lineTotal / qty);
    return {
      productId: s.product.id,
      name: s.product.name,
      sku: s.product.sku,
      size: s.product.size,
      quantity: qty,
      buyPrice: s.product.buyPrice,
      unitPrice,
      lineTotal,
    };
  });

  const itemsSummaryText = validSelections
    .map((s) => `${s.product.name} (${s.product.size}) ×${s.quantity}`)
    .join(', ');

  return {
    hasSelectedProducts,
    totalUnits,
    totalSelectedPieces: totalUnits,
    totalBuyCost,
    totalBuyingCost: totalBuyCost,
    totalCatalogSellPrice,
    suggestedRetailTotal: totalCatalogSellPrice,
    autoSuggestedSaleAmount,
    effectiveSaleAmount,
    calculatedProfit,
    impliedDiscount,
    discountGiven: impliedDiscount,
    impliedExtraBargainingProfit,
    extraBargainingProfit: impliedExtraBargainingProfit,
    itemsSnapshot,
    itemsSummaryText,
  };
}

export function calculateCartTotals(
  cart: CartItem[],
  discount: number,
  paidAmount?: number,
  underpaymentMode: 'discount' | 'due' = 'discount'
): {
  subtotal: number;
  discount: number;
  autoShortfallDiscount: number;
  extraBargainingProfit: number;
  grandTotal: number;
  dueAmount: number;
  estimatedProfit: number;
  isLossSale: boolean;
  lossAmount: number;
  totalItemsCount: number;
} {
  let subtotal = 0;
  let totalCost = 0;
  let totalItemsCount = 0;

  for (const item of cart) {
    const qty = Math.max(0, item.quantity);
    const effectiveUnitPrice =
      typeof item.customUnitPrice === 'number' && !isNaN(item.customUnitPrice)
        ? Math.max(0, Math.round(item.customUnitPrice))
        : item.product.sellPrice;

    subtotal += effectiveUnitPrice * qty;
    totalCost += item.product.buyPrice * qty;
    totalItemsCount += qty;
  }

  const manualDiscount = Math.max(0, Math.min(subtotal, Math.round(discount || 0)));
  const netBeforePayment = Math.max(0, subtotal - manualDiscount);

  const resolvedPaid =
    paidAmount === undefined || isNaN(paidAmount)
      ? netBeforePayment
      : Math.max(0, Math.round(paidAmount));

  let autoShortfallDiscount = 0;
  let extraBargainingProfit = 0;
  let grandTotal = netBeforePayment;
  let dueAmount = 0;

  if (resolvedPaid > netBeforePayment && cart.length > 0) {
    extraBargainingProfit = resolvedPaid - netBeforePayment;
    grandTotal = resolvedPaid;
    dueAmount = 0;
  } else if (resolvedPaid < netBeforePayment && cart.length > 0) {
    const shortfall = netBeforePayment - resolvedPaid;
    if (underpaymentMode === 'discount') {
      autoShortfallDiscount = shortfall;
      grandTotal = resolvedPaid;
      dueAmount = 0;
    } else {
      autoShortfallDiscount = 0;
      grandTotal = netBeforePayment;
      dueAmount = shortfall;
    }
  }

  const totalDiscount = manualDiscount + autoShortfallDiscount;
  const estimatedProfit =
    cart.length === 0 ? 0 : grandTotal - totalCost;
  const isLossSale = cart.length > 0 && estimatedProfit < 0;
  const lossAmount = isLossSale ? Math.abs(estimatedProfit) : 0;

  return {
    subtotal,
    discount: totalDiscount,
    autoShortfallDiscount,
    extraBargainingProfit,
    grandTotal,
    dueAmount,
    estimatedProfit,
    isLossSale,
    lossAmount,
    totalItemsCount,
  };
}

export function deductStockAfterSale(
  products: Product[],
  cart: CartItem[]
): Product[] {
  const soldMap = new Map<string, number>();
  for (const item of cart) {
    soldMap.set(
      item.product.id,
      (soldMap.get(item.product.id) || 0) + item.quantity
    );
  }

  return products.map((p) => {
    const soldQty = soldMap.get(p.id);
    if (!soldQty) return p;
    return {
      ...p,
      stock: Math.max(0, p.stock - soldQty),
    };
  });
}

export function restoreStockAfterSaleDelete(
  products: Product[],
  sale: Sale
): Product[] {
  if (!sale.items || sale.items.length === 0) return products;
  const restoreMap = new Map<string, number>();
  for (const item of sale.items) {
    restoreMap.set(
      item.productId,
      (restoreMap.get(item.productId) || 0) + item.quantity
    );
  }

  return products.map((p) => {
    const addQty = restoreMap.get(p.id);
    if (!addQty) return p;
    return {
      ...p,
      stock: p.stock + addQty,
    };
  });
}

export function ensureProductPurchaseHistory(
  product: Product,
  fallbackTodayISO: string = getTodayISO()
): Product {
  if (product.purchaseHistory && product.purchaseHistory.length > 0) {
    return product;
  }

  const dateISO =
    product.purchaseDateISO ||
    (product.createdAtISO ? product.createdAtISO.slice(0, 10) : fallbackTodayISO);
  const createdAtISO =
    product.createdAtISO || `${dateISO}T09:00:00.000Z`;
  const cashSpent =
    typeof product.cashPurchaseSpent === 'number'
      ? Math.max(0, Math.round(product.cashPurchaseSpent))
      : Math.max(0, Math.round((product.buyPrice || 0) * (product.stock || 0)));

  const initialEntry: ProductPurchaseEntry = {
    id: `init-stock-${product.id}`,
    quantity: Math.max(0, product.stock || 0),
    unitBuyPrice: Math.max(0, product.buyPrice || 0),
    totalCost:
      cashSpent > 0
        ? cashSpent
        : Math.max(0, Math.round((product.buyPrice || 0) * (product.stock || 0))),
    deductedFromCash: cashSpent > 0,
    dateISO,
    createdAtISO,
    note: 'প্রাথমিক স্টক এন্ট্রি',
  };

  return {
    ...product,
    purchaseDateISO: dateISO,
    createdAtISO,
    purchaseHistory: [initialEntry],
  };
}

export const normalizeProductAuditMetadata = ensureProductPurchaseHistory;

export function appendProductRestockEntry(
  product: Product,
  addedQuantity: number,
  deductFromCash: boolean = true,
  nowISO: string = new Date().toISOString(),
  todayISO: string = getTodayISO()
): Product {
  const safeAdded = Math.max(0, Math.round(addedQuantity));
  if (safeAdded <= 0) return product;

  const normalized = ensureProductPurchaseHistory(product, todayISO);
  const addedCost = Math.max(0, Math.round(safeAdded * (product.buyPrice || 0)));

  const newEntry: ProductPurchaseEntry = {
    id: `restock-${product.id}-${Date.now()}`,
    quantity: safeAdded,
    unitBuyPrice: Math.max(0, product.buyPrice || 0),
    totalCost: addedCost,
    deductedFromCash: deductFromCash,
    dateISO: todayISO,
    createdAtISO: nowISO,
    note: `পুনরায় স্টক বৃদ্ধি (+${safeAdded} পিস)`,
  };

  return {
    ...normalized,
    stock: normalized.stock + safeAdded,
    cashPurchaseSpent: deductFromCash
      ? (normalized.cashPurchaseSpent || 0) + addedCost
      : normalized.cashPurchaseSpent || 0,
    updatedAtISO: nowISO,
    purchaseHistory: [newEntry, ...(normalized.purchaseHistory || [])],
  };
}

export const applyRestockPurchaseToProduct = appendProductRestockEntry;

export function applyDueCollection(
  customer: Customer,
  collectedAmount: number
): Customer {
  const safePayment = Math.max(
    0,
    Math.min(customer.totalDue, Math.round(collectedAmount || 0))
  );
  return {
    ...customer,
    totalDue: Math.max(0, customer.totalDue - safePayment),
    lastVisit: 'আজ (বকেয়া পরিশোধ)',
  };
}

export const applyCustomerDuePayment = applyDueCollection;

export type DashboardPeriodMode =
  | 'today'
  | 'yesterday'
  | 'custom'
  | 'range'
  | 'month'
  | 'all';

export type PeriodFilterMode = DashboardPeriodMode;

export function calculatePeriodMetrics(params: {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  extraIncomes?: ExtraIncome[];
  mode: DashboardPeriodMode;
  targetDateISO?: string;
  fromDateISO?: string;
  toDateISO?: string;
  monthPrefix?: string;
  referenceTodayISO?: string;
}) {
  const todayISO = params.referenceTodayISO || getTodayISO();
  const yesterdayISO = getYesterdayISO(todayISO);
  const currentMonthPrefix =
    params.monthPrefix && /^\d{4}-\d{2}$/.test(params.monthPrefix)
      ? params.monthPrefix
      : todayISO.slice(0, 7);

  let startISO = params.fromDateISO || todayISO;
  let endISO = params.toDateISO || todayISO;
  if (startISO > endISO) {
    const tmp = startISO;
    startISO = endISO;
    endISO = tmp;
  }

  const matchesDate = (rawISO?: string): boolean => {
    const dateISO = rawISO || todayISO;
    switch (params.mode) {
      case 'today':
        return dateISO === todayISO;
      case 'yesterday':
        return dateISO === yesterdayISO;
      case 'custom':
        return dateISO === (params.targetDateISO || todayISO);
      case 'range':
        return dateISO >= startISO && dateISO <= endISO;
      case 'month':
        return dateISO.startsWith(currentMonthPrefix);
      case 'all':
      default:
        return true;
    }
  };

  let periodLabel = 'আজকের হিসাব';
  if (params.mode === 'today') {
    periodLabel = `আজ (${formatDateISOToDisplay(todayISO)})`;
  } else if (params.mode === 'yesterday') {
    periodLabel = `গতকাল (${formatDateISOToDisplay(yesterdayISO)})`;
  } else if (params.mode === 'custom') {
    periodLabel = formatDateISOToDisplay(params.targetDateISO || todayISO);
  } else if (params.mode === 'range') {
    periodLabel = `${formatDateISOToDisplay(startISO)} — ${formatDateISOToDisplay(endISO)}`;
  } else if (params.mode === 'month') {
    const [y, m] = currentMonthPrefix.split('-').map(Number);
    const mName = BANGLA_MONTHS_SHORT[(m || 1) - 1] || String(m);
    periodLabel = `${mName} ${y} (মাসিক হিসাব)`;
  } else {
    periodLabel = 'সর্বমোট (শুরু থেকে আজ পর্যন্ত)';
  }

  let revenue = 0;
  let cashCollected = 0;
  let dueCreated = 0;
  let discountGiven = 0;
  let discountedSalesCount = 0;
  let extraBargainingProfit = 0;
  let extraBargainingSalesCount = 0;
  let salesProfitOnly = 0;
  let salesLoss = 0;
  let grossProfit = 0;
  let salesCount = 0;
  let itemsSoldCount = 0;

  for (const s of sanitizeSalesList(params.sales)) {
    const sDate = s.saleDateISO || todayISO;
    if (!matchesDate(sDate)) continue;
    const gTotal = Number(s.grandTotal) || 0;
    const pAmount = Number(s.paidAmount) || 0;
    const dAmount = Number(s.dueAmount) || 0;
    const disc = Math.max(0, Number(s.discount) || 0);
    const extraProfit = Math.max(0, Number(s.extraBargainingProfit) || 0);
    const sProfit = Number(s.profit) || 0;

    revenue += gTotal;
    cashCollected += pAmount;
    dueCreated += dAmount;
    discountGiven += disc;
    if (disc > 0) discountedSalesCount += 1;
    extraBargainingProfit += extraProfit;
    if (extraProfit > 0) extraBargainingSalesCount += 1;
    grossProfit += sProfit;
    if (sProfit >= 0) {
      salesProfitOnly += sProfit;
    } else {
      salesLoss += Math.abs(sProfit);
    }
    salesCount += 1;
    itemsSoldCount += Number(s.totalItemsCount) || 1;
  }

  let expenses = 0;
  let staffSalaryPaid = 0;
  let regularExpenses = 0;
  let expensesCount = 0;

  for (const e of params.expenses) {
    const eDate = e.expenseDateISO || todayISO;
    if (!matchesDate(eDate)) continue;
    const amt = Number(e.amount) || 0;
    expenses += amt;
    expensesCount += 1;
    if (e.category === 'কর্মচারী বেতন' || e.staffId) {
      staffSalaryPaid += amt;
    } else {
      regularExpenses += amt;
    }
  }

  let tipsAndExtraProfit = 0;
  let capitalInjected = 0;
  for (const inc of params.extraIncomes || []) {
    const incDate = inc.incomeDateISO || todayISO;
    if (!matchesDate(incDate)) continue;
    const amt = Number(inc.amount) || 0;
    if (inc.category === 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)') {
      capitalInjected += amt;
    } else {
      tipsAndExtraProfit += amt;
    }
  }

  let stockPurchaseSpent = 0;
  let stockUnitsBought = 0;
  for (const p of params.products) {
    const history = p.purchaseHistory || [];
    if (history.length > 0) {
      for (const entry of history) {
        if (matchesDate(entry.dateISO)) {
          stockPurchaseSpent += Number(entry.totalCost) || 0;
          stockUnitsBought += Number(entry.quantity) || 0;
        }
      }
    } else {
      const pDate =
        p.purchaseDateISO ||
        (p.createdAtISO ? p.createdAtISO.slice(0, 10) : todayISO);
      if (matchesDate(pDate)) {
        const spent =
          typeof p.cashPurchaseSpent === 'number'
            ? p.cashPurchaseSpent
            : (p.buyPrice || 0) * (p.stock || 0);
        stockPurchaseSpent += spent;
        stockUnitsBought += p.stock || 0;
      }
    }
  }

  const netProfit = grossProfit + tipsAndExtraProfit - expenses;

  return {
    periodLabel,
    revenue,
    cashCollected,
    dueCreated,
    discountGiven,
    discountedSalesCount,
    extraBargainingProfit,
    extraBargainingSalesCount,
    salesProfitOnly,
    salesLoss,
    grossProfit,
    tipsAndExtraProfit,
    capitalInjected,
    expenses,
    staffSalaryPaid,
    regularExpenses,
    expensesCount,
    stockPurchaseSpent,
    stockUnitsBought,
    netProfit,
    salesCount,
    itemsSoldCount,
  };
}

export const calculatePeriodSummary = calculatePeriodMetrics;

export function calculateDateSpecificMetrics(
  sales: Sale[],
  expenses: Expense[],
  targetDateISO: string,
  extraIncomes: ExtraIncome[] = []
): {
  dateISO: string;
  dateFormatted: string;
  revenue: number;
  cashCollected: number;
  dueCreated: number;
  grossProfit: number;
  salesProfitOnly: number;
  salesLoss: number;
  tipsAndExtraProfit: number;
  capitalInjected: number;
  expenses: number;
  netProfit: number;
  salesCount: number;
  expensesCount: number;
} {
  let revenue = 0;
  let cashCollected = 0;
  let dueCreated = 0;
  let grossProfit = 0;
  let salesProfitOnly = 0;
  let salesLoss = 0;
  let salesCount = 0;

  for (const s of sanitizeSalesList(sales)) {
    const sDate = s.saleDateISO || targetDateISO;
    if (sDate === targetDateISO) {
      const gTotal = Number(s.grandTotal) || 0;
      const pAmount = Number(s.paidAmount) || 0;
      const dAmount = Number(s.dueAmount) || 0;
      const sProfit = Number(s.profit) || 0;
      revenue += gTotal;
      cashCollected += pAmount;
      dueCreated += dAmount;
      grossProfit += sProfit;
      if (sProfit >= 0) {
        salesProfitOnly += sProfit;
      } else {
        salesLoss += Math.abs(sProfit);
      }
      salesCount += 1;
    }
  }

  let dayExpenses = 0;
  let expensesCount = 0;
  for (const e of expenses) {
    const eDate = e.expenseDateISO || targetDateISO;
    if (eDate === targetDateISO) {
      dayExpenses += Number(e.amount) || 0;
      expensesCount += 1;
    }
  }

  let tipsAndExtraProfit = 0;
  let capitalInjected = 0;
  for (const inc of extraIncomes) {
    const incDate = inc.incomeDateISO || targetDateISO;
    if (incDate === targetDateISO) {
      const amt = Number(inc.amount) || 0;
      if (inc.category === 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)') {
        capitalInjected += amt;
      } else {
        tipsAndExtraProfit += amt;
      }
    }
  }

  return {
    dateISO: targetDateISO,
    dateFormatted: formatDateISOToDisplay(targetDateISO),
    revenue,
    cashCollected,
    dueCreated,
    grossProfit,
    salesProfitOnly,
    salesLoss,
    tipsAndExtraProfit,
    capitalInjected,
    expenses: dayExpenses,
    netProfit: grossProfit + tipsAndExtraProfit - dayExpenses,
    salesCount,
    expensesCount,
  };
}

export function buildUnifiedTransactions(
  sales: Sale[],
  expenses: Expense[],
  products: Product[],
  referenceTodayISO: string = getTodayISO(),
  extraIncomes: ExtraIncome[] = [],
  customers: Customer[] = []
): UnifiedTransaction[] {
  const list: UnifiedTransaction[] = [];

  for (const sale of sanitizeSalesList(sales)) {
    const dt = formatDynamicDateTime(
      sale.saleDateISO,
      sale.dateLabel,
      sale.createdAtISO,
      referenceTodayISO
    );
    const isQuick = Boolean(sale.isQuickLumpSum);

    list.push({
      id: `tx-sale-${sale.id}`,
      type: isQuick ? 'quick_sale' : 'sale',
      title: isQuick
        ? `${sale.itemsSummary}`
        : `${sale.invoiceNo} — ${sale.customerName}`,
      subtitle: isQuick
        ? `দ্রুত বিক্রয় এন্ট্রি • পেমেন্ট: ${sale.paymentMethod}`
        : `${sale.itemsSummary} • পেমেন্ট: ${sale.paymentMethod}`,
      categoryBadge: isQuick ? 'দ্রুত বিক্রি' : 'ক্যাশ মেমো বিক্রয়',
      amount: sale.grandTotal,
      cashAmount: sale.paidAmount,
      profit: sale.profit,
      dueAmount: sale.dueAmount,
      direction: 'in',
      dateISO: sale.saleDateISO || referenceTodayISO,
      createdAtISO: sale.createdAtISO || `${sale.saleDateISO || referenceTodayISO}T12:00:00.000Z`,
      relativeDayBadge: dt.relativeBadge,
      dateFormatted: dt.dateFormatted,
      timeFormatted: dt.timeFormatted,
      fullDateTimeLabel: dt.fullLabel,
      rawSale: sale,
    });
  }

  for (const cust of customers) {
    for (const rcpt of cust.paymentHistory || []) {
      const dt = formatDynamicDateTime(
        rcpt.paymentDateISO,
        rcpt.dateLabel,
        rcpt.createdAtISO,
        referenceTodayISO
      );
      list.push({
        id: `tx-due-${rcpt.id}`,
        type: 'due_collection',
        title: `${rcpt.receiptNo} — ${rcpt.customerName} (বকেয়া কিস্তি জমা)`,
        subtitle: `পূর্বের বকেয়া: ${formatBDT(rcpt.previousDue)} • জমা: ${formatBDT(
          rcpt.paidAmount
        )} • বর্তমান বাকি: ${formatBDT(rcpt.remainingDue)}`,
        categoryBadge: 'বকেয়া আদায় (+ক্যাশ)',
        amount: rcpt.paidAmount,
        cashAmount: rcpt.paidAmount,
        profit: 0,
        direction: 'in',
        dateISO: rcpt.paymentDateISO || referenceTodayISO,
        createdAtISO:
          rcpt.createdAtISO ||
          `${rcpt.paymentDateISO || referenceTodayISO}T12:00:00.000Z`,
        relativeDayBadge: dt.relativeBadge,
        dateFormatted: dt.dateFormatted,
        timeFormatted: dt.timeFormatted,
        fullDateTimeLabel: dt.fullLabel,
        rawDueReceipt: rcpt,
      });
    }
  }

  for (const inc of extraIncomes) {
    const dt = formatDynamicDateTime(
      inc.incomeDateISO,
      inc.dateLabel,
      inc.createdAtISO,
      referenceTodayISO
    );
    const isCapital =
      inc.category === 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)';

    list.push({
      id: `tx-inc-${inc.id}`,
      type: 'extra_income',
      title: inc.title,
      subtitle: isCapital
        ? `${inc.category} • ক্যাশ তহবিলে সরাসরি পুঁজি যোগ (+ক্যাশ)`
        : `${inc.category} • অতিরিক্ত আয় ও নিট লাভে যোগ (+লাভ)`,
      categoryBadge: isCapital ? 'ক্যাশ পুঁজি যোগ' : inc.category,
      amount: inc.amount,
      cashAmount: inc.amount,
      profit: isCapital ? 0 : inc.amount,
      direction: 'in',
      dateISO: inc.incomeDateISO || referenceTodayISO,
      createdAtISO:
        inc.createdAtISO ||
        `${inc.incomeDateISO || referenceTodayISO}T11:30:00.000Z`,
      relativeDayBadge: dt.relativeBadge,
      dateFormatted: dt.dateFormatted,
      timeFormatted: dt.timeFormatted,
      fullDateTimeLabel: dt.fullLabel,
      rawExtraIncome: inc,
    });
  }

  for (const exp of expenses) {
    const dt = formatDynamicDateTime(
      exp.expenseDateISO,
      exp.dateLabel,
      exp.createdAtISO,
      referenceTodayISO
    );
    const isSalary = exp.category === 'কর্মচারী বেতন' || Boolean(exp.staffId);

    list.push({
      id: `tx-exp-${exp.id}`,
      type: isSalary ? 'staff_salary' : 'expense',
      title: exp.title,
      subtitle: isSalary
        ? `${exp.staffPaymentType || 'কর্মচারী বেতন'}${exp.salaryMonthNote ? ` (${exp.salaryMonthNote})` : ''} • দোকান খরচ`
        : `${exp.category} • দোকান পরিচালনা খরচ`,
      categoryBadge: isSalary ? 'কর্মচারী বেতন' : exp.category,
      amount: exp.amount,
      cashAmount: exp.amount,
      direction: 'out',
      dateISO: exp.expenseDateISO || referenceTodayISO,
      createdAtISO: exp.createdAtISO || `${exp.expenseDateISO || referenceTodayISO}T11:00:00.000Z`,
      relativeDayBadge: dt.relativeBadge,
      dateFormatted: dt.dateFormatted,
      timeFormatted: dt.timeFormatted,
      fullDateTimeLabel: dt.fullLabel,
      rawExpense: exp,
    });
  }

  for (const prod of products) {
    const history = prod.purchaseHistory || [];
    if (history.length > 0) {
      for (const entry of history) {
        if (entry.totalCost <= 0) continue;
        const dt = formatDynamicDateTime(
          entry.dateISO,
          undefined,
          entry.createdAtISO,
          referenceTodayISO
        );
        list.push({
          id: `tx-stock-batch-${entry.id}`,
          type: 'stock_capital',
          title: `${prod.name} (${prod.sku}) — ${entry.note}`,
          subtitle: `মাল ক্রয়: ${entry.quantity} পিস × ${formatBDT(entry.unitBuyPrice)}${
            entry.deductedFromCash ? ' (হাতে নগদ থেকে কর্তন)' : ' (পূর্বের স্টক পুঁজি)'
          }`,
          categoryBadge: entry.deductedFromCash ? 'নগদ মাল ক্রয়' : 'স্টক পুঁজি এন্ট্রি',
          amount: entry.totalCost,
          cashAmount: entry.deductedFromCash ? entry.totalCost : 0,
          direction: 'out',
          dateISO: entry.dateISO,
          createdAtISO: entry.createdAtISO,
          relativeDayBadge: dt.relativeBadge,
          dateFormatted: dt.dateFormatted,
          timeFormatted: dt.timeFormatted,
          fullDateTimeLabel: dt.fullLabel,
          rawProduct: prod,
        });
      }
    } else {
      const cashSpent =
        typeof prod.cashPurchaseSpent === 'number'
          ? Math.max(0, Math.round(prod.cashPurchaseSpent))
          : 0;
      const currentStockCost = Math.max(0, Math.round(prod.buyPrice * prod.stock));
      const amountToShow = cashSpent > 0 ? cashSpent : currentStockCost;
      if (amountToShow <= 0) continue;

      const dateISO =
        prod.purchaseDateISO ||
        (prod.createdAtISO ? prod.createdAtISO.slice(0, 10) : referenceTodayISO);
      const createdAtISO = prod.createdAtISO || `${dateISO}T09:00:00.000Z`;
      const dt = formatDynamicDateTime(
        dateISO,
        undefined,
        createdAtISO,
        referenceTodayISO
      );

      list.push({
        id: `tx-stock-${prod.id}`,
        type: 'stock_capital',
        title: `${prod.name} (${prod.sku}) — স্টক মাল ক্রয়`,
        subtitle: `বর্তমান স্টক: ${prod.stock} পিস × কেনা দাম ${formatBDT(prod.buyPrice)}${
          cashSpent > 0 ? ' (নগদ ক্যাশ থেকে ক্রয়)' : ' (স্টক পুঁজি)'
        }`,
        categoryBadge: cashSpent > 0 ? 'নগদ মাল ক্রয়' : 'স্টক পুঁজি বিনিয়োগ',
        amount: amountToShow,
        cashAmount: cashSpent,
        direction: 'out',
        dateISO,
        createdAtISO,
        relativeDayBadge: dt.relativeBadge,
        dateFormatted: dt.dateFormatted,
        timeFormatted: dt.timeFormatted,
        fullDateTimeLabel: dt.fullLabel,
        rawProduct: prod,
      });
    }
  }

  return list.sort((a, b) => {
    if (a.dateISO !== b.dateISO) {
      return b.dateISO.localeCompare(a.dateISO);
    }
    return (b.createdAtISO || '').localeCompare(a.createdAtISO || '');
  });
}

export function calculateShopMetrics(
  products: Product[],
  sales: Sale[],
  customers: Customer[],
  expenses: Expense[],
  workingCapital: number = 0,
  referenceTodayISO: string = getTodayISO(),
  extraIncomes: ExtraIncome[] = []
) {
  const yesterdayISO = getYesterdayISO(referenceTodayISO);
  const currentMonthPrefix = referenceTodayISO.slice(0, 7);

  let totalInventoryCostValue = 0;
  let totalInventoryRetailValue = 0;
  let totalInventoryUnits = 0;
  let totalCashStockPurchases = 0;
  let lowStockCount = 0;

  for (const p of products) {
    const stock = Math.max(0, Number(p.stock) || 0);
    const buyPrice = Math.max(0, Number(p.buyPrice) || 0);
    const sellPrice = Math.max(0, Number(p.sellPrice) || 0);
    totalInventoryCostValue += buyPrice * stock;
    totalInventoryRetailValue += sellPrice * stock;
    totalInventoryUnits += stock;

    const history = p.purchaseHistory || [];
    if (history.length > 0) {
      for (const h of history) {
        if (h.deductedFromCash) {
          totalCashStockPurchases += Math.max(0, Math.round(Number(h.totalCost) || 0));
        }
      }
    } else if (typeof p.cashPurchaseSpent === 'number' && p.cashPurchaseSpent > 0) {
      totalCashStockPurchases += Math.round(p.cashPurchaseSpent);
    }

    if (stock <= (Number(p.minStockAlert) || 0)) {
      lowStockCount += 1;
    }
  }

  const expectedStockProfit = Math.max(
    0,
    totalInventoryRetailValue - totalInventoryCostValue
  );

  let totalSalesRevenue = 0;
  let totalCashCollectedFromSales = 0;
  let totalGrossProfit = 0;
  let totalSalesProfitOnly = 0;
  let totalLossFromLossSales = 0;

  let totalDiscountGiven = 0;
  let todayDiscountGiven = 0;
  let yesterdayDiscountGiven = 0;
  let monthDiscountGiven = 0;
  let discountedSalesCount = 0;
  let todayDiscountedSalesCount = 0;
  let yesterdayDiscountedSalesCount = 0;
  let monthDiscountedSalesCount = 0;

  let totalExtraBargainingProfit = 0;
  let todayExtraBargainingProfit = 0;
  let yesterdayExtraBargainingProfit = 0;
  let monthExtraBargainingProfit = 0;
  let extraBargainingSalesCount = 0;
  let todayExtraBargainingSalesCount = 0;
  let yesterdayExtraBargainingSalesCount = 0;
  let monthExtraBargainingSalesCount = 0;

  let todayRevenue = 0;
  let todayCashCollected = 0;
  let todayDueCreated = 0;
  let todayGrossProfit = 0;
  let todaySalesProfitOnly = 0;
  let todaySalesLoss = 0;
  let todaySalesCount = 0;

  let yesterdayRevenue = 0;
  let yesterdayCashCollected = 0;
  let yesterdayGrossProfit = 0;
  let yesterdaySalesProfitOnly = 0;
  let yesterdaySalesLoss = 0;
  let yesterdaySalesCount = 0;

  let monthRevenue = 0;
  let monthGrossProfit = 0;
  let monthSalesProfitOnly = 0;
  let monthSalesLoss = 0;
  let monthSalesCount = 0;

  for (const s of sanitizeSalesList(sales)) {
    const sDate = s.saleDateISO || referenceTodayISO;
    const grandTotal = Number(s.grandTotal) || 0;
    const paidAmount = Number(s.paidAmount) || 0;
    const dueAmount = Number(s.dueAmount) || 0;
    const disc = Math.max(0, Number(s.discount) || 0);
    const extraProfit = Math.max(0, Number(s.extraBargainingProfit) || 0);
    const profit = Number(s.profit) || 0;

    totalSalesRevenue += grandTotal;
    totalCashCollectedFromSales += paidAmount;
    totalGrossProfit += profit;
    totalDiscountGiven += disc;
    if (disc > 0) {
      discountedSalesCount += 1;
    }
    totalExtraBargainingProfit += extraProfit;
    if (extraProfit > 0) {
      extraBargainingSalesCount += 1;
    }

    if (profit >= 0) {
      totalSalesProfitOnly += profit;
    } else {
      totalLossFromLossSales += Math.abs(profit);
    }

    if (sDate === referenceTodayISO) {
      todayRevenue += grandTotal;
      todayCashCollected += paidAmount;
      todayDueCreated += dueAmount;
      todayDiscountGiven += disc;
      if (disc > 0) todayDiscountedSalesCount += 1;
      todayExtraBargainingProfit += extraProfit;
      if (extraProfit > 0) todayExtraBargainingSalesCount += 1;
      todayGrossProfit += profit;
      if (profit >= 0) {
        todaySalesProfitOnly += profit;
      } else {
        todaySalesLoss += Math.abs(profit);
      }
      todaySalesCount += 1;
    } else if (sDate === yesterdayISO) {
      yesterdayRevenue += grandTotal;
      yesterdayCashCollected += paidAmount;
      yesterdayDiscountGiven += disc;
      if (disc > 0) yesterdayDiscountedSalesCount += 1;
      yesterdayExtraBargainingProfit += extraProfit;
      if (extraProfit > 0) yesterdayExtraBargainingSalesCount += 1;
      yesterdayGrossProfit += profit;
      if (profit >= 0) {
        yesterdaySalesProfitOnly += profit;
      } else {
        yesterdaySalesLoss += Math.abs(profit);
      }
      yesterdaySalesCount += 1;
    }

    if (sDate.startsWith(currentMonthPrefix)) {
      monthRevenue += grandTotal;
      monthDiscountGiven += disc;
      if (disc > 0) monthDiscountedSalesCount += 1;
      monthExtraBargainingProfit += extraProfit;
      if (extraProfit > 0) monthExtraBargainingSalesCount += 1;
      monthGrossProfit += profit;
      if (profit >= 0) {
        monthSalesProfitOnly += profit;
      } else {
        monthSalesLoss += Math.abs(profit);
      }
      monthSalesCount += 1;
    }
  }

  const totalReceivableDue = customers.reduce(
    (sum, c) => sum + (Number(c.totalDue) || 0),
    0
  );

  let totalExpenses = 0;
  let totalStaffSalariesPaid = 0;
  let todayExpenses = 0;
  let todayExpensesCount = 0;
  let yesterdayExpenses = 0;
  let monthExpenses = 0;

  for (const e of expenses) {
    const eDate = e.expenseDateISO || referenceTodayISO;
    const amount = Number(e.amount) || 0;
    totalExpenses += amount;

    if (e.category === 'কর্মচারী বেতন' || e.staffId) {
      totalStaffSalariesPaid += amount;
    }

    if (eDate === referenceTodayISO) {
      todayExpenses += amount;
      todayExpensesCount += 1;
    } else if (eDate === yesterdayISO) {
      yesterdayExpenses += amount;
    }

    if (eDate.startsWith(currentMonthPrefix)) {
      monthExpenses += amount;
    }
  }

  let totalTipsAndExtraProfit = 0;
  let totalCapitalInjected = 0;
  let todayTipsAndExtraProfit = 0;
  let yesterdayTipsAndExtraProfit = 0;
  let monthTipsAndExtraProfit = 0;

  for (const inc of extraIncomes) {
    const incDate = inc.incomeDateISO || referenceTodayISO;
    const amt = Number(inc.amount) || 0;
    const isCap =
      inc.category === 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)';

    if (isCap) {
      totalCapitalInjected += amt;
    } else {
      totalTipsAndExtraProfit += amt;
      if (incDate === referenceTodayISO) {
        todayTipsAndExtraProfit += amt;
      } else if (incDate === yesterdayISO) {
        yesterdayTipsAndExtraProfit += amt;
      }
      if (incDate.startsWith(currentMonthPrefix)) {
        monthTipsAndExtraProfit += amt;
      }
    }
  }

  const totalExtraCashIn = totalTipsAndExtraProfit + totalCapitalInjected;

  const netProfit = totalGrossProfit + totalTipsAndExtraProfit - totalExpenses;
  const totalOperationalAndSalesLoss = totalExpenses + totalLossFromLossSales;
  const todayNetProfit =
    todayGrossProfit + todayTipsAndExtraProfit - todayExpenses;
  const yesterdayNetProfit =
    yesterdayGrossProfit + yesterdayTipsAndExtraProfit - yesterdayExpenses;
  const monthNetProfit =
    monthGrossProfit + monthTipsAndExtraProfit - monthExpenses;

  const safeWorkingCapital = Math.max(0, Math.round(Number(workingCapital) || 0));
  const totalInjectedCapital = safeWorkingCapital + totalCapitalInjected;

  const currentCashInHand =
    totalInjectedCapital +
    totalCashCollectedFromSales +
    totalTipsAndExtraProfit -
    totalExpenses -
    totalCashStockPurchases;

  const totalCostOfGoodsSold = Math.max(
    0,
    totalSalesRevenue - totalGrossProfit
  );
  const totalMerchandiseCapital =
    totalCashStockPurchases > 0
      ? Math.max(
          totalCashStockPurchases,
          totalInventoryCostValue + totalCostOfGoodsSold
        )
      : totalInventoryCostValue + totalCostOfGoodsSold;
  const totalCapitalOutlay = totalMerchandiseCapital + totalExpenses;
  const totalCapitalRecovered =
    totalCashCollectedFromSales + totalTipsAndExtraProfit;
  const capitalRecoveryRemaining = Math.max(
    0,
    totalCapitalOutlay - totalCapitalRecovered
  );
  const capitalSurplusProfit = Math.max(
    0,
    totalCapitalRecovered - totalCapitalOutlay
  );
  const capitalRecoveryPercent =
    totalCapitalOutlay > 0
      ? Math.min(
          100,
          Math.round((totalCapitalRecovered / totalCapitalOutlay) * 100)
        )
      : 100;

  const totalBusinessWorth =
    currentCashInHand + totalInventoryCostValue + totalReceivableDue;

  return {
    totalInventoryCostValue,
    totalInventoryRetailValue,
    expectedStockProfit,
    totalInventoryUnits,
    totalCashStockPurchases,
    lowStockCount,
    totalSalesRevenue,
    totalRevenue: totalSalesRevenue,
    totalCashCollectedFromSales,
    totalGrossProfit,
    totalSalesProfitOnly,
    totalLossFromLossSales,
    totalDiscountGiven,
    todayDiscountGiven,
    yesterdayDiscountGiven,
    monthDiscountGiven,
    discountedSalesCount,
    todayDiscountedSalesCount,
    yesterdayDiscountedSalesCount,
    monthDiscountedSalesCount,
    totalExtraBargainingProfit,
    todayExtraBargainingProfit,
    yesterdayExtraBargainingProfit,
    monthExtraBargainingProfit,
    extraBargainingSalesCount,
    todayExtraBargainingSalesCount,
    yesterdayExtraBargainingSalesCount,
    monthExtraBargainingSalesCount,
    totalOperationalAndSalesLoss,
    totalReceivableDue,
    totalExpenses,
    totalStaffSalariesPaid,
    totalTipsAndExtraProfit,
    totalCapitalInjected,
    totalExtraCashIn,
    netProfit,
    todayRevenue,
    todayCashCollected,
    todayDueCreated,
    todayGrossProfit,
    todaySalesProfitOnly,
    todaySalesLoss,
    todayTipsAndExtraProfit,
    todayExpenses,
    todayExpensesCount,
    todayNetProfit,
    todaySalesCount,
    yesterdayRevenue,
    yesterdayCashCollected,
    yesterdayGrossProfit,
    yesterdaySalesProfitOnly,
    yesterdaySalesLoss,
    yesterdayTipsAndExtraProfit,
    yesterdayExpenses,
    yesterdayNetProfit,
    yesterdaySalesCount,
    monthRevenue,
    monthGrossProfit,
    monthSalesProfitOnly,
    monthSalesLoss,
    monthTipsAndExtraProfit,
    monthExpenses,
    monthNetProfit,
    monthSalesCount,
    workingCapital: safeWorkingCapital,
    totalInjectedCapital,
    currentCashInHand,
    totalBusinessWorth,
    totalCostOfGoodsSold,
    totalMerchandiseCapital,
    totalCapitalOutlay,
    totalCapitalRecovered,
    capitalRecoveryRemaining,
    capitalSurplusProfit,
    capitalRecoveryPercent,
  };
}

export const calculateShopFinancialSummary = calculateShopMetrics;

export function formatItemsSummary(cart: CartItem[]): string {
  return cart
    .map(
      (item) =>
        `${item.product.name} (${item.product.size}) ×${item.quantity}`
    )
    .join(', ');
}

export function validateProductInput(input: {
  name: string;
  sku: string;
  color: string;
  fabric: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
}): string | null {
  if (!input.name.trim()) return 'পোশাকের নাম লিখুন।';
  if (!input.sku.trim()) return 'পোশাকের কোড (SKU) লিখুন।';
  if (input.buyPrice <= 0) return 'কেনা দাম ০ এর বেশি হতে হবে।';
  if (input.sellPrice <= 0) return 'বিক্রয়মূল্য ০ এর বেশি হতে হবে।';
  if (input.stock < 0) return 'স্টক সংখ্যা ঋণাত্মক হতে পারবে না।';
  return null;
}
