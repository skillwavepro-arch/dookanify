import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  KeyRound,
  AlertTriangle,
  PackagePlus,
  Edit3,
  Trash2,
  X,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import { ClothingCategory, ClothingSize, Product } from '../types/shop';
import {
  loadPersistedCategories,
  addPersistedCategory,
  deletePersistedCategory,
  loadPersistedSizes,
  addPersistedSize,
  deletePersistedSize,
  CATALOG_OPTIONS_UPDATED_EVENT,
} from '../data/seedData';
import {
  decodeCodeToPrice,
  encodePriceToCode,
  formatBDT,
  getSuggestedAskingPrice,
  validateProductInput,
} from '../utils/shopLogic';
import { IosSelect } from './IosSelect';

interface InventoryViewProps {
  products: Product[];
  priceCodeKey: string;
  categories?: ClothingCategory[];
  sizes?: ClothingSize[];
  onAddCategory?: (newCategory: string) => void | Promise<void>;
  onDeleteCategory?: (categoryToDelete: string) => void | Promise<void>;
  onAddSize?: (newSize: string) => void | Promise<void>;
  onDeleteSize?: (sizeToDelete: string) => void | Promise<void>;
  onAddProduct: (
    product: Omit<Product, 'id' | 'ownerId'>,
    deductFromCash?: boolean
  ) => void;
  onUpdateProduct: (product: Product) => void;
  onRequestDeleteProduct: (product: Product) => void;
  onRestockProduct: (
    productId: string,
    addedQuantity: number,
    deductFromCash?: boolean
  ) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  priceCodeKey,
  onAddCategory,
  onDeleteCategory,
  onAddSize,
  onDeleteSize,
  onAddProduct,
  onUpdateProduct,
  onRequestDeleteProduct,
  onRestockProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('সকল');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(
    null
  );
  const [restockQty, setRestockQty] = useState('10');
  const [restockDeductCash, setRestockDeductCash] = useState(true);

  const [categoriesList, setCategoriesList] = useState<ClothingCategory[]>(() =>
    loadPersistedCategories()
  );
  const [sizesList, setSizesList] = useState<ClothingSize[]>(() =>
    loadPersistedSizes()
  );

  useEffect(() => {
    const syncOptions = () => {
      setCategoriesList(loadPersistedCategories());
      setSizesList(loadPersistedSizes());
    };
    window.addEventListener(CATALOG_OPTIONS_UPDATED_EVENT, syncOptions);
    return () =>
      window.removeEventListener(CATALOG_OPTIONS_UPDATED_EVENT, syncOptions);
  }, []);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ClothingCategory>(
    () => loadPersistedCategories()[0] || 'পাঞ্জাবি'
  );
  const [size, setSize] = useState<ClothingSize>(
    () => loadPersistedSizes()[0] || 'L'
  );
  const [color, setColor] = useState('');
  const [fabric, setFabric] = useState('১০০% সুতি');
  const [buyPriceInput, setBuyPriceInput] = useState('');
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [askingPriceInput, setAskingPriceInput] = useState('');
  const [stockInput, setStockInput] = useState('');
  const [minStockAlertInput, setMinStockAlertInput] = useState('5');
  const [deductFromCash, setDeductFromCash] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          product.color.toLowerCase().includes(q) ||
          product.fabric.toLowerCase().includes(q);
        if (selectedCategory === 'স্টক কম') {
          return matchesSearch && product.stock <= product.minStockAlert;
        }
        if (selectedCategory === 'সকল') {
          return matchesSearch;
        }
        return matchesSearch && product.category === selectedCategory;
      }),
    [products, searchQuery, selectedCategory]
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`CL-${Math.floor(100 + Math.random() * 900)}`);
    setCategory('পাঞ্জাবি');
    setSize('L');
    setColor('');
    setFabric('১০০% সুতি');
    setBuyPriceInput('');
    setSecretCodeInput('');
    setSellPriceInput('');
    setAskingPriceInput('');
    setStockInput('12');
    setMinStockAlertInput('5');
    setDeductFromCash(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setCategory(product.category);
    setSize(product.size);
    setColor(product.color);
    setFabric(product.fabric);
    setBuyPriceInput(String(product.buyPrice));
    setSecretCodeInput(encodePriceToCode(product.buyPrice, priceCodeKey));
    setSellPriceInput(String(product.sellPrice));
    setAskingPriceInput(String(getSuggestedAskingPrice(product)));
    setStockInput(String(product.stock));
    setMinStockAlertInput(String(product.minStockAlert));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleBuyPriceChange = (val: string) => {
    setBuyPriceInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setSecretCodeInput('');
      return;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && num >= 0) {
      setSecretCodeInput(encodePriceToCode(num, priceCodeKey));
    }
  };

  const handleSecretCodeChange = (val: string) => {
    const clean = val.toUpperCase().replace(/\s+/g, '');
    setSecretCodeInput(clean);
    if (!clean) {
      setBuyPriceInput('');
      return;
    }
    const decoded = decodeCodeToPrice(clean, priceCodeKey);
    if (decoded !== null) {
      setBuyPriceInput(String(decoded));
      setFormError(null);
    }
  };

  const handleSellPriceChange = (val: string) => {
    setSellPriceInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setAskingPriceInput(String(getSuggestedAskingPrice({ sellPrice: num })));
    } else if (!val.trim()) {
      setAskingPriceInput('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buyPrice = Number(buyPriceInput);
    const sellPrice = Number(sellPriceInput);
    const askingPrice =
      Number(askingPriceInput) > 0
        ? Math.round(Number(askingPriceInput))
        : getSuggestedAskingPrice({ sellPrice });
    const stock = Number(stockInput);
    const minStockAlert = Math.max(0, Number(minStockAlertInput) || 5);

    const err = validateProductInput({
      name,
      sku,
      color,
      fabric,
      buyPrice,
      sellPrice,
      stock,
    });
    if (err) {
      setFormError(err);
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: name.trim(),
        sku: sku.trim(),
        category,
        size,
        color: color.trim(),
        fabric: fabric.trim(),
        buyPrice,
        sellPrice,
        askingPrice,
        stock,
        minStockAlert,
      });
    } else {
      onAddProduct(
        {
          name: name.trim(),
          sku: sku.trim(),
          category,
          size,
          color: color.trim(),
          fabric: fabric.trim(),
          buyPrice,
          sellPrice,
          askingPrice,
          stock,
          minStockAlert,
          cashPurchaseSpent: deductFromCash ? buyPrice * stock : 0,
        },
        deductFromCash
      );
    }
    setIsModalOpen(false);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct) return;
    const added = Math.max(1, Math.round(Number(restockQty) || 0));
    onRestockProduct(restockingProduct.id, added, restockDeductCash);
    setRestockingProduct(null);
  };

  const livePreviewCode = buyPriceInput
    ? encodePriceToCode(Number(buyPriceInput) || 0, priceCodeKey)
    : secretCodeInput || '—';
  const totalInitialStockCost =
    (Number(buyPriceInput) || 0) * (Number(stockInput) || 0);

  return (
    <>
      <div className="space-y-5 animate-fade-up">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                স্টক ও পোশাক তালিকা ({filteredProducts.length} টি)
              </h2>
              <p className="text-xs text-slate-500">
                দ্বিমুখী গোপন ক্রয় কোড ({priceCodeKey}), সর্বনিম্ন বিক্রয়মূল্য ও
                কাস্টমারকে বলার দাম (প্রস্তাবিত দর) সহ স্টক
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="পোশাকের নাম, কোড বা কাপড় খুঁজুন..."
                  aria-label="স্টকে পোশাক খুঁজুন"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-150 ease-out hover:opacity-95 active:scale-[0.97] whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>+ নতুন পণ্য যোগ করুন</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {(['সকল', 'স্টক কম', ...categoriesList] as string[]).map(
              (cat) => (
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
              )
            )}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="text-sm font-bold text-slate-700">
              কোনো পোশাক পাওয়া যায়নি
            </p>
            <p className="mt-1 text-xs text-slate-500">
              “+ নতুন পণ্য যোগ করুন” বাটনে ক্লিক করে স্টকে পোশাক তুলুন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const unitProfit = product.sellPrice - product.buyPrice;
              const askingPrice = getSuggestedAskingPrice(product);
              const isLowStock = product.stock <= product.minStockAlert;
              const secretCode = encodePriceToCode(
                product.buyPrice,
                priceCodeKey
              );

              return (
                <div
                  key={product.id}
                  className="card-interactive flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all hover:border-emerald-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="num-clear rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-white">
                          {product.sku}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200/70">
                          <KeyRound className="h-3 w-3" />
                          <span className="num-clear tracking-widest">
                            {secretCode}
                          </span>
                        </span>
                      </div>
                      <span
                        className={`num-clear inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold tabular-nums ${
                          product.stock === 0
                            ? 'bg-rose-50 text-rose-700'
                            : isLowStock
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {isLowStock && (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {product.stock} পিস
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span>{product.category}</span>
                      <span>·</span>
                      <span>
                        সাইজ:{' '}
                        <strong className="num-clear font-bold text-slate-800">
                          {product.size}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>{product.color}</span>
                      <span>·</span>
                      <span>{product.fabric}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-50/90 border border-amber-200/80 px-3.5 py-2 text-xs">
                      <span className="font-bold text-amber-950">
                        কাস্টমারকে বলার দাম (প্রস্তাবিত দর):
                      </span>
                      <span className="num-clear font-extrabold text-amber-900 text-sm">
                        {formatBDT(askingPrice)}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-3 text-xs">
                      <div>
                        <div className="text-[11px] text-slate-500">
                          সর্বনিম্ন দাম
                        </div>
                        <div className="num-clear mt-0.5 text-sm font-extrabold tabular-nums text-emerald-800">
                          {formatBDT(product.sellPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">ক্রয়মূল্য</div>
                        <div className="num-clear mt-0.5 text-sm font-bold tabular-nums text-slate-700">
                          {formatBDT(product.buyPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">একক লাভ</div>
                        <div className="num-clear mt-0.5 text-sm font-extrabold tabular-nums text-emerald-700">
                          +{formatBDT(unitProfit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">স্টক ভ্যালু</div>
                        <div className="num-clear mt-0.5 text-sm font-extrabold tabular-nums text-indigo-700">
                          {formatBDT(product.buyPrice * product.stock)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRestockingProduct(product);
                        setRestockQty('10');
                        setRestockDeductCash(true);
                      }}
                      aria-label={`${product.name} স্টক বাড়ান`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-[0.97] transition"
                    >
                      <PackagePlus className="h-3.5 w-3.5" />
                      <span>+স্টক যোগ</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        aria-label={`${product.name} সম্পাদনা করুন`}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-teal-700" />
                        <span>এডিট</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRequestDeleteProduct(product)}
                        aria-label={`${product.name} ডিলিট করুন`}
                        className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 p-2 text-rose-600 hover:bg-rose-100 active:scale-[0.97] transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/55 px-3 py-6 pb-28 sm:p-6 backdrop-blur-md animate-backdrop-fade"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="my-auto w-full max-w-xl rounded-3xl bg-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-ios-modal">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3
                id="product-modal-title"
                className="text-base font-extrabold text-slate-900"
              >
                {editingProduct
                  ? 'পোশাকের তথ্য আপডেট করুন'
                  : 'নতুন পোশাক স্টকে যোগ করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="ফর্ম বন্ধ করুন"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-[0.97] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
              >
                {formError}
              </div>
            )}

            <form
              onSubmit={handleFormSubmit}
              className="mt-4 space-y-3.5 pb-10 text-xs"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="prod-name"
                    className="block font-bold text-slate-700"
                  >
                    পোশাকের নাম *
                  </label>
                  <input
                    id="prod-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: প্রিমিয়াম সুতি পাঞ্জাবি"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prod-sku"
                    className="block font-bold text-slate-700"
                  >
                    কোড / SKU *
                  </label>
                  <input
                    id="prod-sku"
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PNJ-105"
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label
                    htmlFor="prod-category"
                    className="block font-bold text-slate-700"
                  >
                    ক্যাটাগরি
                  </label>
                  <IosSelect
                    id="prod-category"
                    value={category}
                    onChange={(v) => setCategory(v as ClothingCategory)}
                    options={categoriesList.map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    sheetTitle="পোশাকের ক্যাটাগরি নির্বাচন করুন"
                    ariaLabel="ক্যাটাগরি"
                    allowAddOption={true}
                    addInputPlaceholder="নতুন ক্যাটাগরি লিখুন..."
                    addButtonLabel="+ ক্যাটাগরি যোগ"
                    onAddOption={(newCat) => {
                      const next = addPersistedCategory(newCat);
                      setCategoriesList(next);
                      setCategory(newCat);
                      onAddCategory?.(newCat);
                    }}
                    allowDeleteOption={true}
                    onDeleteOption={(catToDel) => {
                      const next = deletePersistedCategory(catToDel);
                      setCategoriesList(next);
                      if (category === catToDel) {
                        setCategory(next[0] || 'পাঞ্জাবি');
                      }
                      if (selectedCategory === catToDel) {
                        setSelectedCategory('সকল');
                      }
                      onDeleteCategory?.(catToDel);
                    }}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-size"
                    className="block font-bold text-slate-700"
                  >
                    সাইজ
                  </label>
                  <IosSelect
                    id="prod-size"
                    value={size}
                    onChange={(v) => setSize(v as ClothingSize)}
                    options={sizesList.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    sheetTitle="পোশাকের সাইজ নির্বাচন করুন"
                    ariaLabel="সাইজ"
                    allowAddOption={true}
                    addInputPlaceholder="নতুন সাইজ লিখুন (যেমন: 3XL, 42)..."
                    addButtonLabel="+ সাইজ যোগ"
                    onAddOption={(newSz) => {
                      const next = addPersistedSize(newSz);
                      setSizesList(next);
                      setSize(newSz);
                      onAddSize?.(newSz);
                    }}
                    allowDeleteOption={true}
                    onDeleteOption={(szToDel) => {
                      const next = deletePersistedSize(szToDel);
                      setSizesList(next);
                      if (size === szToDel) {
                        setSize(next[0] || 'L');
                      }
                      onDeleteSize?.(szToDel);
                    }}
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-color"
                    className="block font-bold text-slate-700"
                  >
                    রঙ *
                  </label>
                  <input
                    id="prod-color"
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="নেভি ব্লু"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-fabric"
                    className="block font-bold text-slate-700"
                  >
                    কাপড়ের ধরন *
                  </label>
                  <input
                    id="prod-fabric"
                    type="text"
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    placeholder="১০০% সুতি"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-700" />
                    <span>দ্বিমুখী ক্রয়মূল্য ও গোপন কোড ({priceCodeKey})</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    যেকোনো একটিতে লিখলে অপরটি অটো-ফিল হবে
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="prod-buy"
                      className="block font-bold text-slate-700"
                    >
                      ক্রয়মূল্য (৳) * (যেমন: 1250)
                    </label>
                    <input
                      id="prod-buy"
                      type="number"
                      min="0"
                      value={buyPriceInput}
                      onChange={(e) => handleBuyPriceChange(e.target.value)}
                      placeholder="1250"
                      className="num-clear mt-1 w-full rounded-2xl border border-emerald-300 bg-white px-3.5 py-2.5 font-extrabold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="prod-secret-code"
                      className="block font-bold text-slate-700"
                    >
                      গোপন ক্রয় কোড ({priceCodeKey}) (যেমন: BALX)
                    </label>
                    <input
                      id="prod-secret-code"
                      type="text"
                      value={secretCodeInput}
                      onChange={(e) => handleSecretCodeChange(e.target.value)}
                      placeholder="BALX"
                      className="num-clear mt-1 w-full rounded-2xl border border-emerald-300 bg-white px-3.5 py-2.5 font-extrabold uppercase tracking-widest text-emerald-800 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="prod-sell"
                    className="block font-bold text-slate-700"
                  >
                    সর্বনিম্ন বিক্রয়মূল্য (৳) *
                  </label>
                  <input
                    id="prod-sell"
                    type="number"
                    min="1"
                    value={sellPriceInput}
                    onChange={(e) => handleSellPriceChange(e.target.value)}
                    placeholder="1450"
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 font-extrabold tabular-nums text-emerald-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-asking"
                    className="block font-bold text-amber-900"
                  >
                    কাস্টমারকে বলার দাম (প্রস্তাবিত দর ৳)
                  </label>
                  <input
                    id="prod-asking"
                    type="number"
                    min="1"
                    value={askingPriceInput}
                    onChange={(e) => setAskingPriceInput(e.target.value)}
                    placeholder="1800 (+25%)"
                    className="num-clear mt-1 w-full rounded-2xl border border-amber-300 bg-amber-50/40 px-3.5 py-2.5 font-extrabold tabular-nums text-amber-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-stock"
                    className="block font-bold text-slate-700"
                  >
                    স্টক পরিমাণ (পিস) *
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    placeholder="15"
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {!editingProduct && (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="h-4 w-4 text-indigo-700 shrink-0" />
                    <div>
                      <span className="block font-extrabold text-indigo-950">
                        হাতে নগদ / পুঁজি থেকে মাল ক্রয় বাবদ ব্যয় বিয়োগ
                      </span>
                      <span className="text-[11px] text-indigo-700 num-clear">
                        মাল ক্রয় / স্টক বাবদ ব্যয় ({formatBDT(totalInitialStockCost)})
                        হাতে নগদ থেকে বিয়োগ হবে
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={deductFromCash}
                    onChange={(e) => setDeductFromCash(e.target.checked)}
                    className="h-5 w-5 accent-emerald-700 rounded-md"
                  />
                </label>
              )}

              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-2 text-xs">
                <span className="text-slate-600">
                  গোপন প্রাইস কোড প্রিভিউ ({priceCodeKey}):
                </span>
                <span className="num-clear font-extrabold tracking-widest text-emerald-800">
                  {livePreviewCode}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-5 py-2.5 font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.97] transition"
                >
                  {editingProduct ? 'সেভ করুন' : 'পণ্য যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restockingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md animate-backdrop-fade"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restock-modal-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl animate-ios-modal">
            <h3
              id="restock-modal-title"
              className="text-base font-extrabold text-slate-900"
            >
              নতুন স্টক যোগ করুন
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {restockingProduct.name} (বর্তমান স্টক:{' '}
              <strong className="num-clear font-bold">
                {restockingProduct.stock}
              </strong>{' '}
              পিস • ক্রয়মূল্য: {formatBDT(restockingProduct.buyPrice)})
            </p>

            <form
              onSubmit={handleRestockSubmit}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label
                  htmlFor="restock-qty-input"
                  className="block font-bold text-slate-700"
                >
                  নতুন কত পিস যোগ করতে চান?
                </label>
                <input
                  id="restock-qty-input"
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5">
                <div>
                  <span className="block font-extrabold text-indigo-950">
                    নগদ ক্যাশ থেকে মাল ক্রয় (হাতে নগদ থেকে বিয়োগ হবে)
                  </span>
                  <span className="text-[11px] text-indigo-700 num-clear">
                    মোট ক্রয় খরচ:{' '}
                    {formatBDT(
                      restockingProduct.buyPrice *
                        Math.max(1, Math.round(Number(restockQty) || 0))
                    )}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={restockDeductCash}
                  onChange={(e) => setRestockDeductCash(e.target.checked)}
                  className="h-5 w-5 accent-emerald-700 rounded-md"
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2 font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.97] transition"
                >
                  স্টক আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
