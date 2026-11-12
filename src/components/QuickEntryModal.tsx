import React, { useState, useMemo } from 'react';
import {
  Zap,
  X,
  TrendingUp,
  Wallet,
  Trash2,
  CheckCircle2,
  Sparkles,
  Package,
  Plus,
  Minus,
  Calendar,
} from 'lucide-react';
import {
  CartItem,
  Expense,
  PaymentMethod,
  Product,
  Sale,
  SaleItemSnapshot,
} from '../types/shop';
import {
  calculateQuickSaleStockMetrics,
  formatBDT,
  formatDynamicDateTime,
  formatQuickSaleDefaultNote,
  getTodayISO,
} from '../utils/shopLogic';
import { IosSelect } from './IosSelect';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  onAddQuickSale: (
    saleData: Omit<Sale, 'id' | 'ownerId'> & Record<string, unknown>,
    deductedCartItems?: CartItem[]
  ) => void;
  onAddQuickExpense: (expenseData: Omit<Expense, 'id' | 'ownerId'>) => void;
  onRequestDeleteSale: (sale: Sale) => void;
  onRequestDeleteExpense: (expense: Expense) => void;
}

const QUICK_PAYMENT_METHODS: PaymentMethod[] = [
  'নগদ (Cash)',
  'বিকাশ (bKash)',
  'নগদ (Nagad)',
  'কার্ড (Card)',
];

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  isOpen,
  onClose,
  products,
  sales,
  expenses,
  onAddQuickSale,
  onAddQuickExpense,
  onRequestDeleteSale,
  onRequestDeleteExpense,
}) => {
  const [entryDateInput, setEntryDateInput] = useState<string>(() =>
    getTodayISO()
  );
  const [saleAmountInput, setSaleAmountInput] = useState('');
  const [saleProfitInput, setSaleProfitInput] = useState('');
  const [defaultProfitPercent, setDefaultProfitPercent] = useState('20');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('নগদ (Cash)');
  const [saleNote, setSaleNote] = useState('আজকের খুচরা মোট বিক্রি');

  // Stock item selection state for Quick Sale
  const [selectedStockItems, setSelectedStockItems] = useState<
    Array<{ productId: string; quantityInput: string }>
  >([]);
  const [pickerProductId, setPickerProductId] = useState<string>('');
  const [pickerQtyInput, setPickerQtyInput] = useState<string>('1');

  const [expenseAmountInput, setExpenseAmountInput] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('সারাদিনের খুচরা খরচ');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableProducts = useMemo(
    () => products.filter((p) => p.stock > 0),
    [products]
  );

  const resolvedSelections = useMemo(() => {
    return selectedStockItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const qty = Math.max(
          0,
          Math.min(product.stock, Math.round(Number(item.quantityInput) || 0))
        );
        return {
          product,
          quantity: qty,
          quantityInput: item.quantityInput,
        };
      })
      .filter(
        (
          x
        ): x is {
          product: Product;
          quantity: number;
          quantityInput: string;
        } => x !== null
      );
  }, [selectedStockItems, products]);

  const parsedSaleAmount = Math.max(
    0,
    Math.round(Number(saleAmountInput) || 0)
  );
  const parsedProfitPercent = Math.max(
    0,
    Math.min(100, Number(defaultProfitPercent) || 20)
  );

  const stockMetrics = useMemo(
    () =>
      calculateQuickSaleStockMetrics(
        resolvedSelections.map((s) => ({
          product: s.product,
          quantity: s.quantity,
        })),
        parsedSaleAmount,
        saleProfitInput,
        parsedProfitPercent
      ),
    [
      resolvedSelections,
      parsedSaleAmount,
      saleProfitInput,
      parsedProfitPercent,
    ]
  );

  if (!isOpen) return null;

  const calculatedProfit = stockMetrics.calculatedProfit;

  const handleAddProductToQuickList = (targetProdId?: string, rawQty?: string) => {
    setErrorMsg(null);
    const idToUse = targetProdId ?? pickerProductId;
    if (!idToUse) return;
    const prod = products.find((p) => p.id === idToUse);
    if (!prod) return;
    if (prod.stock <= 0) {
      setErrorMsg(`"${prod.name}" বর্তমানে স্টকে নেই (0 পিস)।`);
      return;
    }

    const addQty = Math.max(
      1,
      Math.min(prod.stock, Math.round(Number(rawQty ?? pickerQtyInput) || 1))
    );

    setSelectedStockItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === idToUse);
      if (existingIdx > -1) {
        const currentQty = Math.round(Number(prev[existingIdx].quantityInput) || 0);
        const nextQty = Math.min(prod.stock, currentQty + addQty);
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantityInput: String(nextQty),
        };
        return copy;
      }
      return [...prev, { productId: idToUse, quantityInput: String(addQty) }];
    });
    setPickerProductId('');
    setPickerQtyInput('1');
  };

  const handleUpdateSelectedItemQty = (productId: string, newQtyRaw: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (newQtyRaw === '') {
      setSelectedStockItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantityInput: '' } : item
        )
      );
      return;
    }
    const clamped = Math.max(
      1,
      Math.min(prod.stock, Math.round(Number(newQtyRaw) || 1))
    );
    setSelectedStockItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantityInput: String(clamped) }
          : item
      )
    );
  };

  const handleRemoveSelectedItem = (productId: string) => {
    setSelectedStockItems((prev) =>
      prev.filter((item) => item.productId !== productId)
    );
  };

  const quickSalesList = sales.filter(
    (s) => s.isQuickLumpSum && (Number(s.grandTotal) || 0) > 0
  );
  const quickExpensesList = expenses.filter(
    (e) =>
      (e.isQuickLumpSum || e.category === 'অন্যান্য') &&
      (Number(e.amount) || 0) > 0
  );

  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const activeSelections = resolvedSelections.filter((s) => s.quantity > 0);

    const finalSaleAmount = Math.max(
      0,
      Math.round(Number(saleAmountInput.trim()) || 0)
    );
    const finalExpenseAmount = Math.max(
      0,
      Math.round(Number(expenseAmountInput.trim()) || 0)
    );

    if (finalSaleAmount <= 0 && finalExpenseAmount <= 0) {
      setErrorMsg(
        'অন্তত আজকের মোট বিক্রির টাকা অথবা মোট খরচের টাকার পরিমাণ (০ এর বেশি) লিখুন।'
      );
      return;
    }

    const finalMetrics = calculateQuickSaleStockMetrics(
      activeSelections.map((s) => ({
        product: s.product,
        quantity: s.quantity,
      })),
      finalSaleAmount,
      saleProfitInput,
      Number(defaultProfitPercent) || 20
    );
    const finalProfitAmount = finalMetrics.calculatedProfit;

    const now = new Date();
    const todayISO = getTodayISO();
    const targetDateISO = entryDateInput || todayISO;
    const timeLabel = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dynamicDT = formatDynamicDateTime(
      targetDateISO,
      timeLabel,
      now.toISOString(),
      todayISO
    );

    const addedParts: string[] = [];

    if (finalSaleAmount > 0) {
      const selectedSummaryPrefix =
        activeSelections.length > 0
          ? activeSelections
              .map(
                (s) =>
                  `${s.product.name} (${s.product.size}) x${s.quantity}`
              )
              .join(', ')
          : '';
      const baseNote = formatQuickSaleDefaultNote(
        targetDateISO,
        todayISO,
        saleNote
      );
      const cleanSummary = selectedSummaryPrefix
        ? `${selectedSummaryPrefix} — ${baseNote}`.slice(0, 490)
        : baseNote;

      const deductedCartItems: CartItem[] = activeSelections.map((s) => ({
        product: s.product,
        quantity: s.quantity,
        customUnitPrice: s.product.sellPrice,
      }));

      const saleItems: SaleItemSnapshot[] = activeSelections.map((s) => ({
        productId: s.product.id,
        name: s.product.name,
        sku: s.product.sku,
        size: s.product.size,
        color: s.product.color,
        quantity: s.quantity,
        unitPrice: s.product.sellPrice,
        buyPrice: s.product.buyPrice,
        lineTotal: s.product.sellPrice * s.quantity,
      }));

      const resolvedSubtotal =
        finalMetrics.suggestedRetailTotal > 0
          ? finalMetrics.suggestedRetailTotal
          : finalSaleAmount;

      const quickSalePayload: Omit<Sale, 'id' | 'ownerId'> &
        Record<string, unknown> = {
        invoiceNo: `QUICK-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: 'দ্রুত খুচরা বিক্রি (মেমো ছাড়া)',
        customerPhone: '',
        itemsSummary: cleanSummary,
        items: saleItems.length > 0 ? saleItems : undefined,
        totalItemsCount:
          finalMetrics.totalSelectedPieces > 0
            ? finalMetrics.totalSelectedPieces
            : 1,
        subtotal: resolvedSubtotal,
        discount: finalMetrics.discountGiven,
        ...(finalMetrics.extraBargainingProfit > 0
          ? { extraBargainingProfit: finalMetrics.extraBargainingProfit }
          : {}),
        grandTotal: finalSaleAmount,
        paidAmount: finalSaleAmount,
        dueAmount: 0,
        profit: finalProfitAmount,
        totalAmount: finalSaleAmount,
        amount: finalSaleAmount,
        total: finalSaleAmount,
        netAmount: finalSaleAmount,
        netTotal: finalSaleAmount,
        profitAmount: finalProfitAmount,
        netProfit: finalProfitAmount,
        estimatedProfit: finalProfitAmount,
        paymentMethod,
        saleDateISO: targetDateISO,
        dateLabel: `${dynamicDT.relativeBadge}, ${timeLabel}`,
        isQuickLumpSum: true,
        note: cleanSummary,
        createdAtISO: now.toISOString(),
      };

      onAddQuickSale(
        quickSalePayload,
        deductedCartItems.length > 0 ? deductedCartItems : undefined
      );

      const stockDeductNote =
        finalMetrics.totalSelectedPieces > 0
          ? `, স্টক -${finalMetrics.totalSelectedPieces} পিস`
          : '';
      const extraProfitNote =
        finalMetrics.extraBargainingProfit > 0
          ? `, অতিরিক্ত মুনাফা: +${formatBDT(finalMetrics.extraBargainingProfit)}`
          : '';
      const discountNote =
        finalMetrics.discountGiven > 0
          ? `, ডিসকাউন্ট ছাড়: -${formatBDT(finalMetrics.discountGiven)}`
          : '';
      addedParts.push(
        `বিক্রি ${formatBDT(finalSaleAmount)} (লাভ: ${finalProfitAmount >= 0 ? '+' : ''}${formatBDT(finalProfitAmount)}${extraProfitNote}${discountNote}${stockDeductNote})`
      );
      setSaleAmountInput('');
      setSaleProfitInput('');
      setSelectedStockItems([]);
      setSaleNote(formatQuickSaleDefaultNote(targetDateISO, todayISO, ''));
    }

    if (finalExpenseAmount > 0) {
      const cleanExpTitle = expenseTitle.trim() || 'সারাদিনের খুচরা খরচ';
      onAddQuickExpense({
        title: cleanExpTitle,
        category: 'অন্যান্য',
        amount: finalExpenseAmount,
        expenseDateISO: targetDateISO,
        dateLabel: `${dynamicDT.relativeBadge}, ${timeLabel}`,
        isQuickLumpSum: true,
        createdAtISO: now.toISOString(),
      });
      addedParts.push(`খরচ ${formatBDT(finalExpenseAmount)}`);
      setExpenseAmountInput('');
    }

    setSuccessMsg(
      `${dynamicDT.relativeBadge} (${dynamicDT.dateFormatted}) তারিখে ${addedParts.join(' এবং ')} সফলভাবে যুক্ত হয়েছে!`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-entry-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="quick-entry-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                দ্রুত মোট বিক্রি ও খরচ এন্ট্রি (মেমো ছাড়া হিসাব)
              </h2>
              <p className="text-xs text-slate-500">
                স্টক থেকে বিক্রিত পণ্য ও পিস সিলেক্ট করে অটো লাভ ও স্টক মাইনাস করুন অথবা সরাসরি মোট বিক্রি ও খরচ যোগ করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-[0.97] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dual Entry Form */}
        <form onSubmit={handleSubmitAll} className="mt-4 space-y-4">
          {/* Backdated Entry Date Picker Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs">
            <label
              htmlFor="quick-entry-date-input"
              className="flex items-center gap-2 font-extrabold text-amber-950"
            >
              <Calendar className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                হিসাবের তারিখ নির্বাচন করুন (ডিফল্ট: আজ — আগের তারিখের বিক্রি বা খরচও যোগ করা যাবে):
              </span>
            </label>
            <input
              id="quick-entry-date-input"
              type="date"
              value={entryDateInput}
              onChange={(e) => {
                const nextDate = e.target.value;
                setEntryDateInput(nextDate);
                setSaleNote((prev) =>
                  formatQuickSaleDefaultNote(nextDate, getTodayISO(), prev)
                );
              }}
              className="num-clear rounded-xl border border-amber-400 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
            {/* Section 1: Quick Lump-Sum Sale (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-emerald-200/90 bg-emerald-50/40 p-4 space-y-3.5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>১. দ্রুত মোট বিক্রি যোগ (Quick Sale)</span>
                </div>
                {resolvedSelections.length > 0 && (
                  <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10px] font-extrabold text-white num-clear">
                    স্টক মাইনাস হবে: {stockMetrics.totalSelectedPieces} পিস
                  </span>
                )}
              </div>

              {/* Optional Stock Product & Quantity Selector */}
              <div className="rounded-2xl border border-emerald-200 bg-white p-3 space-y-2.5 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label
                    htmlFor="quick-stock-product-select"
                    className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5"
                  >
                    <Package className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>
                      স্টক থেকে বিক্রিত পণ্য ও পিস সিলেক্ট করুন (ঐচ্ছিক)
                    </span>
                  </label>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    পণ্য ছাড়াও সাধারণ বিক্রি করা যাবে
                  </span>
                </div>

                {/* Contained Flex Row: w-0 flex-1 guarantees <select> never overflows parent */}
                <div className="flex items-center gap-2 w-full min-w-0 overflow-hidden">
                  <IosSelect
                    id="quick-stock-product-select"
                    ariaLabel="স্টক থেকে পণ্য সিলেক্ট করুন"
                    sheetTitle="স্টক থেকে বিক্রিত পণ্য সিলেক্ট করুন"
                    value={pickerProductId}
                    onChange={(val) => {
                      setPickerProductId(val);
                      if (val) {
                        handleAddProductToQuickList(val, pickerQtyInput);
                      }
                    }}
                    placeholder={`+ স্টক থেকে পণ্য সিলেক্ট করুন (${availableProducts.length} টি মজুদ)`}
                    options={[
                      {
                        value: '',
                        label: `+ স্টক থেকে পণ্য সিলেক্ট করুন (${availableProducts.length} টি মজুদ)`,
                      },
                      ...availableProducts.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.size})`,
                        sublabel: `ক্রয়মূল্য: ${formatBDT(p.buyPrice)} • বিক্রয়মূল্য: ${formatBDT(p.sellPrice)}`,
                        badge: `মজুদ: ${p.stock} পিস`,
                      })),
                    ]}
                    className="w-0 flex-1 min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />

                  <input
                    type="number"
                    min="1"
                    value={pickerQtyInput}
                    onChange={(e) => setPickerQtyInput(e.target.value)}
                    aria-label="বিক্রিত পিস সংখ্যা"
                    placeholder="পিস"
                    className="num-clear w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-extrabold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddProductToQuickList()}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-2 text-xs font-extrabold text-white transition active:scale-[0.97]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>যোগ</span>
                  </button>
                </div>

                {/* Selected Stock Products List with Quantity Stepper & Boxes */}
                {resolvedSelections.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {resolvedSelections.map(({ product, quantity, quantityInput }) => (
                      <div
                        key={product.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/60 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 truncate">
                            {product.name}{' '}
                            <span className="text-[11px] font-bold text-slate-500">
                              ({product.size} • মজুদ: {product.stock} পিস)
                            </span>
                          </div>
                          <div className="text-[11px] text-emerald-800 num-clear font-semibold">
                            ক্রয়মূল্য: {formatBDT(product.buyPrice)} × {quantity} পিস = মোট ক্রয়{' '}
                            <strong className="font-extrabold">
                              {formatBDT(product.buyPrice * quantity)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                          <span className="text-[11px] font-bold text-slate-700">
                            বিক্রিত পিস:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSelectedItemQty(
                                  product.id,
                                  String(Math.max(1, quantity - 1))
                                )
                              }
                              aria-label={`${product.name} পিস কমান`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-300 bg-white text-slate-700 hover:bg-emerald-100 active:scale-[0.95]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={product.stock}
                              value={quantityInput}
                              onChange={(e) =>
                                handleUpdateSelectedItemQty(
                                  product.id,
                                  e.target.value
                                )
                              }
                              aria-label={`${product.name} বিক্রিত পিস`}
                              className="num-clear w-14 rounded-lg border border-emerald-400 bg-white px-1.5 py-1 text-center text-xs font-extrabold text-slate-900 focus:border-emerald-700 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSelectedItemQty(
                                  product.id,
                                  String(Math.min(product.stock, quantity + 1))
                                )
                              }
                              aria-label={`${product.name} পিস বাড়ান`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-300 bg-white text-slate-700 hover:bg-emerald-100 active:scale-[0.95]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedItem(product.id)}
                            aria-label={`${product.name} তালিকা থেকে সরান`}
                            className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white num-clear">
                      <span>
                        মোট নির্বাচিত: {stockMetrics.totalSelectedPieces} পিস • মোট ক্রয়মূল্য: {formatBDT(stockMetrics.totalBuyingCost)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSaleAmountInput(
                            String(stockMetrics.suggestedRetailTotal)
                          )
                        }
                        className="rounded-lg bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 hover:bg-amber-300 transition active:scale-[0.97]"
                      >
                        বিক্রয় দর বসান ({formatBDT(stockMetrics.suggestedRetailTotal)})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="quick-sale-amount-input"
                  className="block text-xs font-bold text-slate-700"
                >
                  আজকের মোট বিক্রির টাকা (৳) *
                </label>
                <input
                  id="quick-sale-amount-input"
                  type="number"
                  min="0"
                  value={saleAmountInput}
                  onChange={(e) => setSaleAmountInput(e.target.value)}
                  placeholder="যেমন: 5500"
                  className="num-clear mt-1 w-full rounded-2xl border border-emerald-300 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                <div className="flex flex-col justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {resolvedSelections.length > 0
                      ? 'আসল লাভ (৳) (ক্রয়মূল্য বাদে অটো)'
                      : 'আনুমানিক লাভ (৳) (ঐচ্ছিক)'}
                  </label>
                  <input
                    type="number"
                    value={saleProfitInput}
                    onChange={(e) => setSaleProfitInput(e.target.value)}
                    placeholder={
                      parsedSaleAmount > 0
                        ? `অটো: ${calculatedProfit}`
                        : 'যেমন: 1100'
                    }
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    ডিফল্ট লাভ (%) (পণ্য না বাছলে)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={defaultProfitPercent}
                    onChange={(e) => setDefaultProfitPercent(e.target.value)}
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  পেমেন্ট মাধ্যম
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {QUICK_PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition active:scale-[0.97] ${
                        paymentMethod === pm
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  নোট / বিবরণ
                </label>
                <input
                  type="text"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  placeholder="যেমন: আজকের খুচরা মোট বিক্রি"
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {parsedSaleAmount > 0 && (
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[11px] font-bold num-clear space-y-1.5 ${
                    calculatedProfit < 0
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-emerald-100/80 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>হাতে নগদ + নিট মুনাফায় যোগ হবে:</span>
                    <span className="font-extrabold">
                      বিক্রি {formatBDT(parsedSaleAmount)} (লাভ:{' '}
                      {calculatedProfit >= 0 ? '+' : ''}
                      {formatBDT(calculatedProfit)})
                    </span>
                  </div>
                  {resolvedSelections.length > 0 && (
                    <>
                      <div className="text-[10px] opacity-90">
                        সূত্র: মোট বিক্রি ({formatBDT(parsedSaleAmount)}) − নির্বাচিত {stockMetrics.totalSelectedPieces} পিস পণ্যের ক্রয়মূল্য ({formatBDT(stockMetrics.totalBuyingCost)}) ={' '}
                        {calculatedProfit >= 0 ? '+' : ''}
                        {formatBDT(calculatedProfit)} (নির্ধারিত বিক্রয় দর: {formatBDT(stockMetrics.suggestedRetailTotal)})
                      </div>
                      {stockMetrics.extraBargainingProfit > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-teal-900/90 px-2.5 py-1 text-[10px] font-extrabold text-amber-300">
                          <span>✨ অতিরিক্ত মুনাফা (বিক্রয় দরের চেয়ে বেশি):</span>
                          <span>+{formatBDT(stockMetrics.extraBargainingProfit)}</span>
                        </div>
                      )}
                      {stockMetrics.discountGiven > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-amber-100 border border-amber-300 px-2.5 py-1 text-[10px] font-extrabold text-amber-950">
                          <span>🏷️ ডিসকাউন্ট ছাড় (বিক্রয় দরের চেয়ে কম):</span>
                          <span>-{formatBDT(stockMetrics.discountGiven)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Quick Lump-Sum Expense (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-rose-200/90 bg-rose-50/40 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                  <Wallet className="h-4 w-4 text-rose-600" />
                  <span>২. একসাথে মোট খরচ যোগ (Quick Expense)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    মোট খরচের টাকা (৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expenseAmountInput}
                    onChange={(e) => setExpenseAmountInput(e.target.value)}
                    placeholder="যেমন: 450"
                    className="num-clear mt-1 w-full rounded-2xl border border-rose-300 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-rose-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    খরচের বিবরণ
                  </label>
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="যেমন: সারাদিনের খুচরা খরচ"
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 border border-rose-200/60 p-3 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>স্বয়ংক্রিয় স্টক ও লাভ সমন্বয়:</span>
                </div>
                <p>
                  • স্টক থেকে পণ্য সিলেক্ট করলে বিক্রিত পিস স্টক থেকে অটো মাইনাস হবে এবং ক্রয়মূল্য বাদ দিয়ে আসল লাভ হিসাব হবে।
                </p>
                <p>
                  • পণ্য ছাড়াও শুধুমাত্র মোট বিক্রির টাকা লিখে সাধারণ খুচরা বিক্রি যোগ করা যাবে।
                </p>
                <p>
                  • দ্রুত খরচ সরাসরি হাতে নগদ ও নিট মুনাফা থেকে বিয়োগ হয়।
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition"
            >
              বন্ধ করুন
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-md hover:opacity-95 active:scale-[0.97] transition"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>হিসাবে যুক্ত করুন (Save Entry)</span>
            </button>
          </div>
        </form>

        {/* History of Quick Entries */}
        <div className="mt-6 border-t border-slate-200/80 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              সাম্প্রতিক দ্রুত এন্ট্রি তালিকা ({quickSalesList.length + quickExpensesList.length} টি)
            </h3>
            <span className="text-[11px] text-slate-500">
              ক্লাউড ও লোকাল স্টোরেজে অটো-সিঙ্ককৃত
            </span>
          </div>

          {quickSalesList.length === 0 && quickExpensesList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
              এখনো কোনো দ্রুত বিক্রি বা দ্রুত খরচ যোগ করা হয়নি।
            </div>
          ) : (
            <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5">
              {quickSalesList.map((s) => {
                const dt = formatDynamicDateTime(
                  s.saleDateISO,
                  s.dateLabel,
                  s.createdAtISO
                );
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          দ্রুত বিক্রি
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {s.itemsSummary}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 num-clear mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>
                          {dt.fullLabel} • {s.paymentMethod} • লাভ:{' '}
                          <strong
                            className={
                              s.profit < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }
                          >
                            {s.profit >= 0 ? '+' : ''}
                            {formatBDT(s.profit)}
                          </strong>
                        </span>
                        {(s.extraBargainingProfit || 0) > 0 && (
                          <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-[10px] font-extrabold text-teal-900">
                            +অতিরিক্ত মুনাফা: {formatBDT(s.extraBargainingProfit || 0)}
                          </span>
                        )}
                        {(s.discount || 0) > 0 && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                            ছাড়: {formatBDT(s.discount || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="num-clear font-extrabold text-emerald-700 text-sm">
                        +{formatBDT(s.grandTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteSale(s)}
                        aria-label="দ্রুত বিক্রি ডিলিট করুন"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.97] transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {quickExpensesList.map((exp) => {
                const dt = formatDynamicDateTime(
                  exp.expenseDateISO,
                  exp.dateLabel,
                  exp.createdAtISO
                );
                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between gap-2 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                          দ্রুত খরচ
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {exp.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 num-clear mt-0.5">
                        {dt.fullLabel}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="num-clear font-extrabold text-rose-600 text-sm">
                        -{formatBDT(exp.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteExpense(exp)}
                        aria-label="দ্রুত খরচ ডিলিট করুন"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.97] transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

