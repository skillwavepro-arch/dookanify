import React, { useState } from 'react';
import { Tag, Calculator, Search, X, TrendingUp } from 'lucide-react';
import { Product } from '../types/shop';
import {
  decodeSecretPriceCode,
  encodeSecretPriceCode,
  formatBDT,
} from '../utils/shopLogic';

interface PriceCodeDirectoryProps {
  products: Product[];
  priceCodeKey: string;
  onOpenShopSetup: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const PriceCodeDirectory: React.FC<PriceCodeDirectoryProps> = ({
  products,
  priceCodeKey,
  onOpenShopSetup,
  isModal = false,
  onCloseModal,
}) => {
  const [search, setSearch] = useState('');
  const [testPriceInput, setTestPriceInput] = useState('1250');
  const [testCodeInput, setTestCodeInput] = useState('');

  const encodedTest = encodeSecretPriceCode(
    Number(testPriceInput) || 0,
    priceCodeKey
  );
  const decodedTest = testCodeInput.trim()
    ? decodeSecretPriceCode(testCodeInput, priceCodeKey)
    : null;

  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const secretBuyCode = encodeSecretPriceCode(
      p.buyPrice,
      priceCodeKey
    ).toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      secretBuyCode.includes(q)
    );
  });

  const totalCostCapital = filteredProducts.reduce(
    (sum, p) => sum + p.buyPrice * p.stock,
    0
  );
  const totalRetailValue = filteredProducts.reduce(
    (sum, p) => sum + p.sellPrice * p.stock,
    0
  );
  const totalExpectedProfit = totalRetailValue - totalCostCapital;

  const content = (
    <div className="space-y-6">
      {/* Secret Price Code Digit Map & Live Converter */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  গোপন প্রাইস কোড চার্ট (0-9 অক্ষর ম্যাপিং)
                </h2>
                <p className="text-xs text-slate-500">
                  কাপড়ের ট্যাগে ক্রয়মূল্য গোপন রাখার ১০-অক্ষরের কি-ওয়ার্ড:{' '}
                  <strong className="num-clear font-bold tracking-widest text-emerald-800">
                    {priceCodeKey}
                  </strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenShopSetup}
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap shrink-0"
            >
              কোড পরিবর্তন
            </button>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {priceCodeKey.split('').map((char, digit) => (
              <div
                key={digit}
                className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-2.5 text-center"
              >
                <div className="num-clear text-base font-extrabold text-emerald-800">
                  {char}
                </div>
                <div className="num-clear mt-1 border-t border-emerald-200/60 pt-1 text-xs font-bold text-slate-700">
                  {digit}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3.5 text-xs">
            <div>
              <div className="text-slate-500">মোট আইটেম কোড</div>
              <div className="num-clear mt-0.5 text-sm font-extrabold text-slate-900">
                {filteredProducts.length} টি
              </div>
            </div>
            <div>
              <div className="text-slate-500">স্টকের ক্রয় ভ্যালু</div>
              <div className="num-clear mt-0.5 text-sm font-extrabold text-slate-900">
                {formatBDT(totalCostCapital)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">স্টকের বিক্রয় ভ্যালু</div>
              <div className="num-clear mt-0.5 text-sm font-extrabold text-emerald-700">
                {formatBDT(totalRetailValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Live Price-to-Code & Code-to-Price Calculator */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                প্রাইস কোড ও ভ্যালু ক্যালকুলেটর
              </h2>
              <p className="text-xs text-slate-500">
                টাকা থেকে গোপন কোড এবং কোড থেকে আসল দাম বের করুন
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label
                  htmlFor="calc-price-input"
                  className="block font-bold text-slate-700"
                >
                  টাকার পরিমাণ লিখুন (৳)
                </label>
                <input
                  id="calc-price-input"
                  type="number"
                  min="0"
                  value={testPriceInput}
                  onChange={(e) => setTestPriceInput(e.target.value)}
                  className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  গোপন ট্যাগ কোড:
                </div>
                <div className="num-clear text-base font-extrabold tracking-widest text-emerald-800">
                  {encodedTest}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end border-t border-slate-100 pt-3.5">
              <div>
                <label
                  htmlFor="calc-code-input"
                  className="block font-bold text-slate-700"
                >
                  গোপন কোড লিখে ভ্যালু দেখুন
                </label>
                <input
                  id="calc-code-input"
                  type="text"
                  value={testCodeInput}
                  onChange={(e) =>
                    setTestCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder={`যেমন: ${encodedTest}`}
                  className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold uppercase text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  আসল টাকা (ভ্যালু):
                </div>
                <div className="num-clear text-base font-extrabold tabular-nums text-slate-900">
                  {testCodeInput.trim() === ''
                    ? formatBDT(Number(testPriceInput) || 0)
                    : decodedTest !== null
                    ? formatBDT(decodedTest)
                    : 'অকার্যকর কোড'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product SKU Price Code & Stock Valuation Cards */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                সকল পোশাকের প্রাইস কোড ও স্টক ভ্যালু তালিকা
              </h2>
              <p className="text-xs text-slate-500">
                কোন প্রাইস কোডের ক্রয়মূল্য কত, বিক্রয়মূল্য কত এবং সম্ভাব্য মুনাফা:{' '}
                <strong className="num-clear font-bold text-emerald-700">
                  +{formatBDT(totalExpectedProfit)}
                </strong>
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="প্রাইস কোড (PNJ-101) বা নাম..."
              aria-label="প্রাইস কোড খুঁজুন"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-500">
              কোনো পোশাক বা প্রাইস কোড পাওয়া যায়নি।
            </div>
          ) : (
            filteredProducts.map((p) => {
              const secretBuy = encodeSecretPriceCode(p.buyPrice, priceCodeKey);
              const unitProfit = p.sellPrice - p.buyPrice;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="mt-0.5 text-slate-500">
                        {p.category} · সাইজ:{' '}
                        <span className="num-clear font-bold">{p.size}</span>
                      </div>
                    </div>
                    <span className="num-clear rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {p.sku}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white p-2.5 border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-500">গোপন কোড</div>
                      <div className="num-clear font-extrabold text-emerald-800 tracking-wider">
                        {secretBuy}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">বিক্রয় দর</div>
                      <div className="num-clear font-bold text-slate-900">
                        {formatBDT(p.sellPrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">একক লাভ</div>
                      <div className="num-clear font-bold text-emerald-700">
                        +{formatBDT(unitProfit)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="গোপন প্রাইস কোড ও ভ্যালু ক্যালকুলেটর"
    >
      <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            গোপন প্রাইস কোড ও ভ্যালু ক্যালকুলেটর
          </h2>
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              aria-label="ক্যালকুলেটর বন্ধ করুন"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-xs hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {content}
      </div>
    </div>
  );
};
