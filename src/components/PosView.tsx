import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Receipt,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  CartItem,
  Customer,
  GarmentCategory,
  PaymentMethod,
  Product,
  Sale,
} from '../types/shop';
import {
  loadPersistedCategories,
  CATALOG_OPTIONS_UPDATED_EVENT,
  PAYMENT_METHODS,
} from '../data/seedData';
import {
  calculateCartTotals,
  distributeExtraProfitToItemsRoundFigure,
  encodeSecretPriceCode,
  formatBDT,
  formatDynamicDateTime,
  formatItemsSummary,
  getProductAskingPrice,
  getTodayISO,
} from '../utils/shopLogic';
import { IosSelect } from './IosSelect';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  priceCodeKey: string;
  categories?: GarmentCategory[];
  onCompleteSale: (
    saleData: Omit<Sale, 'id' | 'ownerId'>,
    cart: CartItem[],
    selectedCustomerId?: string,
    newCustomerData?: { name: string; phone: string; address: string }
  ) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  customers,
  priceCodeKey,
  categories,
  onCompleteSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesList, setCategoriesList] = useState<GarmentCategory[]>(() =>
    categories && categories.length > 0 ? categories : loadPersistedCategories()
  );
  const [selectedCategory, setSelectedCategory] = useState<
    GarmentCategory | 'সকল'
  >('সকল');

  useEffect(() => {
    const syncOptions = () => setCategoriesList(loadPersistedCategories());
    window.addEventListener(CATALOG_OPTIONS_UPDATED_EVENT, syncOptions);
    return () =>
      window.removeEventListener(CATALOG_OPTIONS_UPDATED_EVENT, syncOptions);
  }, []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('নগদ (Cash)');
  const [saleDateInput, setSaleDateInput] = useState<string>(() =>
    getTodayISO()
  );
  const [customerMode, setCustomerMode] = useState<
    'walkin' | 'existing' | 'new'
  >('walkin');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ''
  );
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [customPaidInput, setCustomPaidInput] = useState<string>('');
  const [underpaymentMode, setUnderpaymentMode] = useState<'discount' | 'due'>(
    'discount'
  );
  const [posError, setPosError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === 'সকল' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const discountNum = Math.max(0, Number(discountInput) || 0);
  const rawSubtotal = cart.reduce((sum, item) => {
    const unitPrice =
      typeof item.customUnitPrice === 'number' && !isNaN(item.customUnitPrice)
        ? Math.max(0, Math.round(item.customUnitPrice))
        : item.product.sellPrice;
    return sum + unitPrice * item.quantity;
  }, 0);
  const netPayable = Math.max(
    0,
    rawSubtotal - Math.min(rawSubtotal, discountNum)
  );

  const hasCustomPaid = customPaidInput.trim() !== '';
  const effectivePaidAmount =
    paymentMethod === 'বাকি (Due)'
      ? !hasCustomPaid
        ? 0
        : Math.max(0, Math.round(Number(customPaidInput) || 0))
      : !hasCustomPaid
      ? netPayable
      : Math.max(0, Math.round(Number(customPaidInput) || 0));

  const effectiveUnderpaymentMode: 'discount' | 'due' =
    paymentMethod === 'বাকি (Due)' && !hasCustomPaid
      ? 'due'
      : underpaymentMode;

  const totals = useMemo(
    () =>
      calculateCartTotals(
        cart,
        discountNum,
        effectivePaidAmount,
        effectiveUnderpaymentMode
      ),
    [cart, discountNum, effectivePaidAmount, effectiveUnderpaymentMode]
  );

  const shortfallAmount =
    cart.length > 0 && effectivePaidAmount < netPayable
      ? netPayable - effectivePaidAmount
      : 0;

  const handleAddToCart = (product: Product) => {
    setPosError(null);
    if (product.stock <= 0) {
      setPosError(`"${product.name}" স্টকে নেই!`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        if (currentQty >= product.stock) {
          setPosError(
            `"${product.name}" এর সর্বোচ্চ স্টক (${product.stock} পিস) কার্টে যোগ করা হয়েছে।`
          );
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1,
        };
        return updated;
      }
      return [
        ...prev,
        { product, quantity: 1, customUnitPrice: product.sellPrice },
      ];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setPosError(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty > item.product.stock) {
            setPosError(`স্টকে মাত্র ${item.product.stock} পিস রয়েছে।`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleUpdateUnitPrice = (productId: string, newPriceRaw: string) => {
    const parsed = Number(newPriceRaw);
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        if (newPriceRaw.trim() === '' || isNaN(parsed)) {
          return { ...item, customUnitPrice: 0 };
        }
        return { ...item, customUnitPrice: Math.max(0, Math.round(parsed)) };
      })
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setPosError(null);

    if (cart.length === 0) {
      setPosError('বিক্রয় সম্পন্ন করতে অন্তত ১টি পোশাক কার্টে যোগ করুন।');
      return;
    }

    let resolvedCustomerName = 'নগদ ক্রেতা (Walk-in)';
    let resolvedCustomerPhone = '';
    let resolvedCustomerId: string | undefined = undefined;
    let newCustPayload:
      | { name: string; phone: string; address: string }
      | undefined = undefined;

    if (customerMode === 'existing') {
      const found = customers.find((c) => c.id === selectedCustomerId);
      if (!found) {
        setPosError('একজন কাস্টমার নির্বাচন করুন।');
        return;
      }
      resolvedCustomerName = found.name;
      resolvedCustomerPhone = found.phone;
      resolvedCustomerId = found.id;
    } else if (customerMode === 'new') {
      if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
        setPosError('নতুন কাস্টমারের নাম এবং মোবাইল নম্বর আবশ্যক।');
        return;
      }
      resolvedCustomerName = newCustomerName.trim();
      resolvedCustomerPhone = newCustomerPhone.trim();
      newCustPayload = {
        name: resolvedCustomerName,
        phone: resolvedCustomerPhone,
        address: newCustomerAddress.trim() || 'সীতাকুণ্ড',
      };
    } else if (totals.dueAmount > 0) {
      setPosError(
        'বাকিতে বিক্রির জন্য "নিয়মিত কাস্টমার" বা "নতুন কাস্টমার" নির্বাচন করে নাম ও মোবাইল নম্বর দিন।'
      );
      return;
    }

    const invoiceNo = `MEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const todayISO = getTodayISO();
    const chosenDateISO = saleDateInput || todayISO;
    const nowLabel = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dynamicDT = formatDynamicDateTime(
      chosenDateISO,
      nowLabel,
      now.toISOString(),
      todayISO
    );

    const distributedItems = distributeExtraProfitToItemsRoundFigure(
      cart,
      totals.extraBargainingProfit
    );

    const defaultCatalogSubtotal = cart.reduce(
      (sum, item) => sum + item.product.sellPrice * item.quantity,
      0
    );
    const totalExtraProfitOnSale = Math.max(
      totals.extraBargainingProfit,
      Math.max(0, totals.grandTotal - defaultCatalogSubtotal)
    );

    const salePayload: Omit<Sale, 'id' | 'ownerId'> = {
      invoiceNo,
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      itemsSummary: formatItemsSummary(cart),
      items: distributedItems,
      totalItemsCount: totals.totalItemsCount,
      subtotal: totals.subtotal + totals.extraBargainingProfit,
      discount: totals.discount,
      extraBargainingProfit: totalExtraProfitOnSale,
      grandTotal: totals.grandTotal,
      paidAmount: totals.grandTotal - totals.dueAmount,
      dueAmount: totals.dueAmount,
      profit: totals.estimatedProfit,
      paymentMethod,
      saleDateISO: chosenDateISO,
      dateLabel: `${dynamicDT.relativeBadge}, ${nowLabel}`,
      createdAtISO: now.toISOString(),
    };

    onCompleteSale(salePayload, cart, resolvedCustomerId, newCustPayload);

    setCart([]);
    setDiscountInput('0');
    setCustomPaidInput('');
    setUnderpaymentMode('discount');
    setSaleDateInput(todayISO);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start animate-fade-up">
      {/* Left 7 Columns: Garment Catalog & Barcode/SKU Search */}
      <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              পস বিলিং ও ক্যাশ মেমো কাউন্টার
            </h2>
            <p className="text-xs text-slate-500">
              পোশাকে ট্যাপ করে মেমোতে যুক্ত করুন — সর্বনিম্ন দাম ও কাস্টমারকে বলার দাম দেখুন
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, কোড (PNJ-101) বা রঙ..."
              aria-label="পোশাক খুঁজুন"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Rounded Category Filter Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {(['সকল', ...categoriesList] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-150 ease-out active:scale-[0.97] whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Selection Cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">
                এই ক্যাটাগরিতে কোনো পোশাক পাওয়া যায়নি
              </p>
              <p className="mt-1 text-xs text-slate-500">
                অন্য নাম বা SKU কোড দিয়ে পুনরায় অনুসন্ধান করুন
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const inCartQty =
                cart.find((c) => c.product.id === product.id)?.quantity || 0;
              const isOutOfStock = product.stock <= 0;
              const secretCode = encodeSecretPriceCode(
                product.buyPrice,
                priceCodeKey
              );
              const askingPrice = getProductAskingPrice(product);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(product)}
                  className={`group flex flex-col justify-between rounded-3xl border p-4 text-left transition-all duration-150 ease-out active:scale-[0.97] ${
                    isOutOfStock
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : inCartQty > 0
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200/80 bg-white hover:border-emerald-400 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-800">
                        {product.name}
                      </span>
                      <span className="num-clear text-sm font-extrabold tabular-nums text-emerald-800 shrink-0">
                        সর্বনিম্ন: {formatBDT(product.sellPrice)}
                      </span>
                    </div>

                    {/* Suggested Customer Asking Price Pill */}
                    <div className="mt-1.5 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200/70 px-2.5 py-1 text-[11px]">
                      <span className="font-bold text-amber-900">
                        কাস্টমারকে বলার দাম:
                      </span>
                      <span className="num-clear font-extrabold text-amber-950">
                        {formatBDT(askingPrice)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="num-clear font-bold text-slate-800">
                        {product.sku}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="num-clear font-bold text-emerald-700">
                        কোড: {secretCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        সাইজ:{' '}
                        <strong className="num-clear font-bold">
                          {product.size}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <span
                      className={`num-clear font-bold tabular-nums ${
                        isOutOfStock
                          ? 'text-rose-600'
                          : product.stock <= product.minStockAlert
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {isOutOfStock
                        ? 'স্টক শেষ (0)'
                        : `মজুদ: ${product.stock} পিস`}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-800">
                      {inCartQty > 0
                        ? `যুক্ত: ${inCartQty} পিস`
                        : '+ মেমোতে যোগ'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right 5 Columns: Active Cash Memo / Cart */}
      <form
        onSubmit={handleCheckout}
        className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                চলমান ক্যাশ মেমো (বিলিং)
              </h2>
              <p className="text-xs text-slate-500">
                মোট আইটেম:{' '}
                <strong className="num-clear font-bold text-slate-800">
                  {totals.totalItemsCount}
                </strong>{' '}
                পিস • বিক্রয়মূল্য কাস্টমাইজযোগ্য
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-[0.97] transition whitespace-nowrap shrink-0"
            >
              সব মুছুন
            </button>
          )}
        </div>

        {posError && (
          <div
            role="alert"
            className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
          >
            {posError}
          </div>
        )}

        {/* Cart Line Items with Flexible Unit Price & Loss Sale Detection */}
        <div className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-600">
                ক্যাশ মেমোতে কোনো পোশাক নেই
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                তালিকা থেকে পোশাকের ওপর ক্লিক করে যোগ করুন
              </p>
            </div>
          ) : (
            cart.map(({ product, quantity, customUnitPrice }) => {
              const effectiveUnitPrice =
                typeof customUnitPrice === 'number' && !isNaN(customUnitPrice)
                  ? Math.max(0, Math.round(customUnitPrice))
                  : product.sellPrice;
              const askingPrice = getProductAskingPrice(product);
              const lineProfit =
                (effectiveUnitPrice - product.buyPrice) * quantity;
              const isItemLoss = effectiveUnitPrice < product.buyPrice;
              const extraAboveMin =
                (effectiveUnitPrice - product.sellPrice) * quantity;

              return (
                <div
                  key={product.id}
                  className="py-3 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-900">
                        {product.name} ({product.size})
                      </div>
                      <div className="num-clear text-[11px] text-slate-500">
                        সর্বনিম্ন: {formatBDT(product.sellPrice)} • বলার দাম:{' '}
                        <strong className="text-amber-800">
                          {formatBDT(askingPrice)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        aria-label={`${product.name} পরিমাণ কমান`}
                        onClick={() => handleUpdateQty(product.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-[0.95]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="num-clear w-6 text-center font-extrabold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`${product.name} পরিমাণ বাড়ান`}
                        onClick={() => handleUpdateQty(product.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-[0.95]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${product.name} মেমো থেকে সরান`}
                        onClick={() => handleRemoveFromCart(product.id)}
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 active:scale-[0.95]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Flexible Unit Selling Price Input Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 border border-slate-200/70">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-bold text-slate-600">
                        বিক্রয় দর (৳):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={effectiveUnitPrice}
                        onChange={(e) =>
                          handleUpdateUnitPrice(product.id, e.target.value)
                        }
                        aria-label={`${product.name} একক বিক্রয় দর`}
                        className="num-clear w-24 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateUnitPrice(
                            product.id,
                            String(askingPrice)
                          )
                        }
                        className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-900 hover:bg-amber-200 active:scale-[0.97]"
                        title="কাস্টমারকে বলার দাম বসান"
                      >
                        বলার দাম
                      </button>
                    </div>

                    <div className="num-clear font-extrabold text-slate-900">
                      মোট: {formatBDT(effectiveUnitPrice * quantity)}
                    </div>
                  </div>

                  {/* Loss Sale Badge OR Extra Profit Above Minimum Badge */}
                  {isItemLoss ? (
                    <div className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-extrabold text-rose-700 num-clear">
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          লস সেল (Loss: -{formatBDT(Math.abs(lineProfit))})
                        </span>
                      </span>
                      <span>ক্রয়মূল্য: {formatBDT(product.buyPrice)}</span>
                    </div>
                  ) : extraAboveMin > 0 ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-[11px] font-bold text-emerald-800 num-clear">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        <span>
                          সর্বনিম্ন দামের চেয়ে অতিরিক্ত লাভ: +
                          {formatBDT(extraAboveMin)}
                        </span>
                      </span>
                      <span>মোট লাভ: +{formatBDT(lineProfit)}</span>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Customer Selection Mode */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="block text-xs font-bold text-slate-700">
            ক্রেতার তথ্য (Customer Type)
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setCustomerMode('walkin')}
              className={`rounded-xl py-2 text-xs font-bold transition-all whitespace-nowrap ${
                customerMode === 'walkin'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              নগদ ক্রেতা
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('existing')}
              className={`rounded-xl py-2 text-xs font-bold transition-all whitespace-nowrap ${
                customerMode === 'existing'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              নিয়মিত কাস্টমার
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('new')}
              className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-all whitespace-nowrap ${
                customerMode === 'new'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              নতুন কাস্টমার
            </button>
          </div>

          {customerMode === 'existing' && (
            <div className="mt-2.5">
              <label htmlFor="pos-customer-select" className="sr-only">
                কাস্টমার নির্বাচন করুন
              </label>
              <IosSelect
                id="pos-customer-select"
                value={selectedCustomerId}
                onChange={(val) => setSelectedCustomerId(val)}
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.phone})`,
                  sublabel: `পূর্বের বাকি: ${formatBDT(c.totalDue)} • মোট কেনাকাটা: ${formatBDT(c.totalPurchase)}`,
                  badge: c.totalDue > 0 ? `বাকি ${formatBDT(c.totalDue)}` : 'পরিশোধিত',
                }))}
                sheetTitle="কাস্টমার নির্বাচন করুন"
                ariaLabel="কাস্টমার নির্বাচন করুন"
                className="num-clear w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {customerMode === 'new' && (
            <div className="mt-2.5 space-y-2">
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="কাস্টমারের নাম *"
                aria-label="নতুন কাস্টমারের নাম"
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="মোবাইল নম্বর *"
                  aria-label="নতুন কাস্টমারের মোবাইল নম্বর"
                  className="num-clear w-full rounded-2xl border border-slate-300 px-3.5 py-2 font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="ঠিকানা (ঐচ্ছিক)"
                  aria-label="নতুন কাস্টমারের ঠিকানা"
                  className="w-full rounded-2xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Discount, Payment Mode & Totals */}
        <div className="mt-4 space-y-3.5 border-t border-slate-100 pt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="pos-discount-input"
                className="block font-bold text-slate-700"
              >
                ডিসকাউন্ট ছাড় (৳)
              </label>
              <input
                id="pos-discount-input"
                type="number"
                min="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="pos-paid-input"
                className="block font-bold text-slate-700"
              >
                নগদ জমা (৳)
              </label>
              <input
                id="pos-paid-input"
                type="number"
                min="0"
                placeholder={String(netPayable)}
                value={customPaidInput}
                onChange={(e) => setCustomPaidInput(e.target.value)}
                className="num-clear mt-1 w-full rounded-2xl border border-emerald-400 bg-emerald-50/30 px-3.5 py-2 font-extrabold tabular-nums text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Paid Amount < Subtotal: Auto Discount vs Due Toggle */}
          {cart.length > 0 && shortfallAmount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-900">
                <span>
                  মোট বিলের চেয়ে কম জমা দেওয়া হয়েছে:
                </span>
                <span className="num-clear text-rose-700">
                  অবশিষ্ট {formatBDT(shortfallAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUnderpaymentMode('discount')}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition-all active:scale-[0.98] ${
                    effectiveUnderpaymentMode === 'discount'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'border border-amber-300 bg-white text-slate-700 hover:bg-amber-100/50'
                  }`}
                >
                  ডিসকাউন্ট / ছাড়
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnderpaymentMode('due');
                    if (customerMode === 'walkin' && customers.length > 0) {
                      setCustomerMode('existing');
                    }
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition-all active:scale-[0.98] ${
                    effectiveUnderpaymentMode === 'due'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'border border-amber-300 bg-white text-slate-700 hover:bg-amber-100/50'
                  }`}
                >
                  বাকির খাতায় যোগ
                </button>
              </div>
              <p className="text-[11px] font-semibold text-amber-900">
                {effectiveUnderpaymentMode === 'discount'
                  ? `অবশিষ্ট ${formatBDT(shortfallAmount)} অটোমেটিক ডিসকাউন্ট ছাড় হিসেবে বাদ যাবে এবং বিল ১০০% পরিশোধিত হবে।`
                  : `অবশিষ্ট ${formatBDT(shortfallAmount)} কাস্টমারের বাকির খাতায় বকেয়া (Due) হিসেবে যোগ হবে।`}
              </p>
            </div>
          )}

          {/* Paid Amount > Subtotal: Auto Extra Bargaining Profit Banner */}
          {cart.length > 0 && totals.extraBargainingProfit > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-extrabold text-emerald-900">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>অতিরিক্ত বিক্রয় মুনাফা (Extra Bargaining Profit):</span>
              </span>
              <span className="num-clear text-emerald-700">
                +{formatBDT(totals.extraBargainingProfit)}
              </span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700">
              পেমেন্ট মাধ্যম
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                    if (method === 'বাকি (Due)') {
                      setCustomPaidInput('0');
                      setUnderpaymentMode('due');
                      if (customerMode === 'walkin' && customers.length > 0) {
                        setCustomerMode('existing');
                      }
                    } else {
                      setCustomPaidInput('');
                    }
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-150 ease-out active:scale-[0.97] whitespace-nowrap shrink-0 ${
                    paymentMethod === method
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Backdated Sale Date Picker (Default: Today) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5">
            <label
              htmlFor="pos-sale-date-input"
              className="flex items-center gap-1.5 font-bold text-slate-700"
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>বিক্রয়ের তারিখ (ডিফল্ট: আজ / আগের তারিখ):</span>
            </label>
            <input
              id="pos-sale-date-input"
              type="date"
              value={saleDateInput}
              onChange={(e) => setSaleDateInput(e.target.value)}
              className="num-clear rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5">
            <div className="flex justify-between text-slate-600">
              <span>
                মোট পোশাক (
                <strong className="num-clear font-bold">
                  {totals.totalItemsCount}
                </strong>{' '}
                পিস)
              </span>
              <span className="num-clear font-bold tabular-nums">
                {formatBDT(totals.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ডিসকাউন্ট ছাড়</span>
              <span className="num-clear font-bold tabular-nums text-rose-600">
                -{formatBDT(totals.discount)}
              </span>
            </div>
            {totals.extraBargainingProfit > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>অতিরিক্ত বিক্রয় মুনাফা</span>
                <span className="num-clear tabular-nums">
                  +{formatBDT(totals.extraBargainingProfit)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-extrabold text-slate-900">
              <span>সর্বমোট বিল</span>
              <span className="num-clear tabular-nums text-emerald-800">
                {formatBDT(totals.grandTotal)}
              </span>
            </div>

            {cart.length > 0 && (
              <div className="flex justify-between pt-1 text-xs font-extrabold">
                <span>এই মেমোতে লাভ / লস:</span>
                {totals.isLossSale ? (
                  <span className="num-clear rounded-full bg-rose-100 px-2.5 py-0.5 text-rose-700">
                    লস সেল (Loss: -{formatBDT(totals.lossAmount)})
                  </span>
                ) : (
                  <span className="num-clear text-emerald-700">
                    লাভ: +{formatBDT(totals.estimatedProfit)}
                  </span>
                )}
              </div>
            )}

            {totals.dueAmount > 0 && (
              <div className="flex justify-between font-bold text-amber-800">
                <span>কাস্টমারের খাতায় বাকি যোগ হবে</span>
                <span className="num-clear tabular-nums">
                  {formatBDT(totals.dueAmount)}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-3 text-sm font-bold text-white shadow-md transition-all duration-150 ease-out hover:opacity-95 active:scale-[0.97] whitespace-nowrap"
          >
            বিক্রয় সম্পন্ন ও ক্যাশ মেমো তৈরি করুন ({formatBDT(totals.grandTotal)})
          </button>
        </div>
      </form>
    </div>
  );
};
