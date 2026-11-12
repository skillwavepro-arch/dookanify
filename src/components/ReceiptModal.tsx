import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  X,
  FolderCheck,
  ExternalLink,
  Loader2,
  FileDown,
  Printer,
  Share2,
} from 'lucide-react';
import { DuePaymentReceipt, Sale } from '../types/shop';
import { formatBDT } from '../utils/shopLogic';
import {
  exportElementToIdenticalPDF,
  PdfExportResult,
  shareOrOpenGeneratedPdf,
} from '../utils/pdfGenerator';

const ITEMS_PER_RECEIPT_PAGE = 8;

function toBanglaDigits(num: number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num)
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0) - 48;
      return code >= 0 && code <= 9 ? digits[code] : ch;
    })
    .join('');
}

interface ReceiptModalProps {
  sale: Sale | null;
  shopName: string;
  ownerName?: string;
  shopAddress: string;
  shopPhone: string;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  shopName,
  ownerName = 'রাব্বি',
  shopAddress,
  shopPhone,
  onClose,
  onNotify,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [lastExportResult, setLastExportResult] =
    useState<PdfExportResult | null>(null);

  const pages = useMemo(() => {
    if (!sale || !sale.items || sale.items.length === 0) return [[]];
    const chunks = [];
    for (let i = 0; i < sale.items.length; i += ITEMS_PER_RECEIPT_PAGE) {
      chunks.push(sale.items.slice(i, i + ITEMS_PER_RECEIPT_PAGE));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [sale]);

  if (!sale) return null;

  const totalPages = pages.length;
  const pdfFileName = `${sale.invoiceNo}-CashMemo.pdf`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2.5 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-amber-400/35 bg-white/98 p-3.5 sm:p-5 shadow-[0_16px_45px_rgb(0,0,0,0.32)] backdrop-blur-xl">
        <div className="shrink-0 mb-3 flex items-center justify-between border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2.5 text-emerald-900 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#052e1e] to-[#0a4d34] text-amber-300 shadow-2xs">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h2
                id="receipt-modal-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 truncate"
              >
                ডিজিটাল ক্যাশ মেমো প্রিভিউ ({toBanglaDigits(totalPages)} পৃষ্ঠা)
              </h2>
              <p className="num-clear text-xs font-semibold text-slate-500 truncate">
                রশিদ নং: {sale.invoiceNo} • মোট {sale.totalItemsCount} পিস পোশাক
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="মেমো বন্ধ করুন"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700 transition active:scale-[0.95]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-4">
          <div id="printable-receipt" className="space-y-5 bg-white">
            {pages.map((pageItems, pageIdx) => {
              const isLastPage = pageIdx === totalPages - 1;
              const startOffset = pageIdx * ITEMS_PER_RECEIPT_PAGE;

              return (
                <div
                  key={pageIdx}
                  data-pdf-page="true"
                  className="rounded-3xl border-2 border-amber-500/45 bg-white p-5 sm:p-6 text-slate-900 shadow-xs"
                >
                  <div
                    className="rounded-2xl px-6 py-5 text-center text-white border border-amber-400/40"
                    style={{
                      backgroundColor: '#052e1e',
                      backgroundImage:
                        'linear-gradient(135deg, #052e1e 0%, #0a4d34 55%, #065f46 100%)',
                    }}
                  >
                    <div
                      className="inline-block rounded-full px-4 py-1 text-[11px] font-extrabold leading-normal text-slate-950 shadow-2xs"
                      style={{
                        backgroundColor: '#d4af37',
                        backgroundImage:
                          'linear-gradient(135deg, #d4af37 0%, #f3cc56 100%)',
                      }}
                    >
                      Dookanify • ডিজিটাল ক্যাশ মেমো / বিক্রয় রশিদ
                    </div>
                    <h3 className="mt-2.5 text-lg sm:text-xl font-extrabold leading-relaxed text-white px-1">
                      {shopName}
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-100 px-1">
                      প্রোপ্রাইটর: {ownerName} • {shopAddress}
                    </p>
                    <p className="num-clear mt-1 text-xs font-extrabold leading-relaxed text-amber-300">
                      হটলাইন / মোবাইল: {shopPhone}
                    </p>
                  </div>

                  <div className="my-3.5 rounded-2xl bg-emerald-50/60 p-3.5 text-xs border border-emerald-200/90">
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        <tr>
                          <td className="py-1 text-left align-middle">
                            <span className="text-slate-500 font-semibold">
                              মেমো নং:{' '}
                            </span>
                            <span className="num-clear font-extrabold text-emerald-950">
                              {sale.invoiceNo}
                            </span>
                          </td>
                          <td className="py-1 text-right align-middle">
                            <span className="text-slate-500 font-semibold">
                              তারিখ:{' '}
                            </span>
                            <span className="num-clear font-bold text-slate-800">
                              {sale.dateLabel} ({sale.saleDateISO})
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-left align-middle">
                            <span className="text-slate-500 font-semibold">
                              ক্রেতার নাম:{' '}
                            </span>
                            <span className="font-extrabold text-slate-900">
                              {sale.customerName}
                            </span>
                          </td>
                          <td className="py-1 text-right align-middle">
                            <span className="text-slate-500 font-semibold">
                              মোবাইল:{' '}
                            </span>
                            <span className="num-clear font-bold text-slate-800">
                              {sale.customerPhone || '—'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {pageItems.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr
                            className="text-white"
                            style={{ backgroundColor: '#052e1e' }}
                          >
                            <th className="py-3 px-3.5 font-extrabold leading-normal align-middle">
                              পোশাকের বিবরণ
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold leading-normal align-middle">
                              পরিমাণ
                            </th>
                            <th className="py-3 px-2.5 text-right font-extrabold leading-normal align-middle">
                              দর
                            </th>
                            <th className="py-3 px-3.5 text-right font-extrabold leading-normal align-middle">
                              মোট
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageItems.map((item, idx) => {
                            const serial = startOffset + idx + 1;
                            return (
                              <tr key={serial} className="bg-white">
                                <td className="py-2.5 px-3.5 align-middle">
                                  <div className="font-extrabold leading-relaxed text-slate-900">
                                    {serial}. {item.name}
                                  </div>
                                  <div className="num-clear text-[11px] font-medium leading-relaxed text-slate-500">
                                    সাইজ: {item.size} • {item.color} • {item.sku}
                                  </div>
                                </td>
                                <td className="num-clear py-2.5 px-2.5 text-center font-extrabold text-slate-800 whitespace-nowrap align-middle">
                                  {item.quantity} পিস
                                </td>
                                <td className="num-clear py-2.5 px-2.5 text-right font-bold text-slate-700 whitespace-nowrap align-middle">
                                  {formatBDT(item.unitPrice)}
                                </td>
                                <td className="num-clear py-2.5 px-3.5 text-right font-extrabold text-emerald-900 whitespace-nowrap align-middle">
                                  {formatBDT(item.lineTotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                      <div className="font-extrabold text-slate-900">
                        ক্রয়কৃত পোশাক ও বিবরণ:
                      </div>
                      <p className="mt-1 font-bold leading-relaxed text-slate-800">
                        {sale.itemsSummary}
                      </p>
                    </div>
                  )}

                  {isLastPage ? (
                    <>
                      <div className="mt-3.5 rounded-2xl border border-emerald-200/90 bg-slate-50/90 p-4 text-xs">
                        <table className="w-full border-collapse text-xs">
                          <tbody>
                            <tr>
                              <td className="py-1 text-left font-bold text-slate-600 align-middle">
                                মোট পোশাক (
                                <strong className="num-clear font-extrabold text-slate-900">
                                  {sale.totalItemsCount}
                                </strong>{' '}
                                পিস)
                              </td>
                              <td className="num-clear py-1 text-right font-extrabold text-slate-900 align-middle">
                                {formatBDT(sale.subtotal)}
                              </td>
                            </tr>
                            <tr>
                              <td
                                className={`py-1 text-left font-bold align-middle ${
                                  sale.discount > 0
                                    ? 'text-rose-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                ডিসকাউন্ট / ছাড় (Discount)
                              </td>
                              <td
                                className={`num-clear py-1 text-right font-extrabold align-middle ${
                                  sale.discount > 0
                                    ? 'text-rose-600'
                                    : 'text-slate-600'
                                }`}
                              >
                                {sale.discount > 0
                                  ? `-${formatBDT(sale.discount)}`
                                  : formatBDT(0)}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="pt-2 pb-1 text-left text-sm font-extrabold text-slate-950 align-middle">
                                সর্বমোট বিল (Net Payable)
                              </td>
                              <td className="num-clear pt-2 pb-1 text-right text-sm font-extrabold text-emerald-800 align-middle">
                                {formatBDT(sale.grandTotal)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 text-left font-bold text-slate-800 align-middle">
                                পরিশোধিত জমা —{' '}
                                {sale.paymentMethod || 'নগদ (Cash)'}
                              </td>
                              <td className="num-clear py-1 text-right font-extrabold text-emerald-700 align-middle">
                                {formatBDT(sale.paidAmount)}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200/80">
                              <td className="pt-2 text-left font-extrabold text-slate-800 align-middle">
                                বাকি (Due Balance)
                              </td>
                              <td className="pt-2 text-right align-middle">
                                <span
                                  className={`num-clear inline-block px-3 py-1 rounded-full font-extrabold leading-normal ${
                                    sale.dueAmount > 0
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {sale.dueAmount > 0
                                    ? `বাকি: ${formatBDT(sale.dueAmount)}`
                                    : 'সম্পূর্ণ পরিশোধিত (৳0)'}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 pt-3 border-t border-dashed border-slate-300 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-3 pt-4">
                          <span className="border-t border-slate-400 pt-1.5 px-3 leading-relaxed">
                            ক্রেতার স্বাক্ষর
                          </span>
                          <span className="border-t border-slate-400 pt-1.5 px-3 leading-relaxed">
                            বিক্রেতা / ক্যাশিয়ার
                          </span>
                        </div>
                        <div className="text-center text-[11px] font-medium leading-relaxed text-slate-500">
                          বিক্রিত পোশাক ৭ দিনের মধ্যে ক্যাশ মেমো সহ পরিবর্তনযোগ্য
                          (ট্যাগ অক্ষত থাকতে হবে)। ধন্যবাদ!
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3.5 rounded-2xl border border-amber-300/80 bg-amber-50/70 px-4 py-2.5 text-center text-xs font-extrabold leading-relaxed text-amber-950">
                      পরবর্তী পৃষ্ঠায় চলমান — সর্বমোট বিল ও স্বাক্ষর পৃষ্ঠা{' '}
                      {toBanglaDigits(totalPages)}-এ দেখুন...
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-extrabold text-slate-500 num-clear">
                    <span className="leading-normal">
                      Dookanify Smart POS • {sale.invoiceNo}
                    </span>
                    <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 leading-normal text-emerald-900">
                      পৃষ্ঠা {toBanglaDigits(pageIdx + 1)} /{' '}
                      {toBanglaDigits(totalPages)} (Page {pageIdx + 1} of{' '}
                      {totalPages})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {lastExportResult && (
          <div className="shrink-0 mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FolderCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              <span className="num-clear font-extrabold text-emerald-950 truncate">
                Saved: {lastExportResult.savedPath}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                void shareOrOpenGeneratedPdf(
                  lastExportResult,
                  `${shopName} - ${sale.invoiceNo}`
                )
              }
              className="inline-flex items-center gap-1 shrink-0 rounded-xl bg-emerald-700 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-emerald-800 transition"
            >
              <ExternalLink className="h-3 w-3" />
              <span>ফাইল ওপেন / শেয়ার</span>
            </button>
          </div>
        )}

        <div className="shrink-0 mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={async () => {
              const el = document.getElementById('printable-receipt');
              if (el) {
                setIsExportingPdf(true);
                try {
                  const res = await exportElementToIdenticalPDF(el, pdfFileName);
                  setLastExportResult(res);
                  if (onNotify) {
                    onNotify(
                      `Saved: ${res.savedPath} — পিডিএফ ডাউনলোড সম্পন্ন হয়েছে!`
                    );
                  }
                } catch {
                  window.print();
                } finally {
                  setIsExportingPdf(false);
                }
              }
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#e6c34a] to-[#f3cc56] border border-amber-400/50 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition-all hover:brightness-105 disabled:opacity-60 active:scale-[0.98]"
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <FileDown className="h-4 w-4 text-slate-950" />
            )}
            <span>পিডিএফ ডাউনলোড করুন (Download PDF)</span>
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={async () => {
              const el = document.getElementById('printable-receipt');
              if (el) {
                setIsExportingPdf(true);
                try {
                  const res =
                    lastExportResult &&
                    lastExportResult.fileName === pdfFileName
                      ? lastExportResult
                      : await exportElementToIdenticalPDF(el, pdfFileName);
                  setLastExportResult(res);
                  if (
                    await shareOrOpenGeneratedPdf(
                      res,
                      `${shopName} - ${sale.invoiceNo}`
                    )
                  ) {
                    if (onNotify) {
                      onNotify(
                        `ক্যাশ মেমো পিডিএফ (${res.savedPath}) ওপেন/শেয়ার করা হয়েছে!`
                      );
                    }
                    return;
                  }
                } catch {
                  // Fallback
                } finally {
                  setIsExportingPdf(false);
                }
              }
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `${shopName} - ${sale.invoiceNo}`,
                    text: `${shopName}\nমেমো নং: ${sale.invoiceNo}\nক্রেতা: ${sale.customerName}\nমোট বিল: ${formatBDT(sale.grandTotal)}\nজমা: ${formatBDT(sale.paidAmount)}\nবাকি: ${formatBDT(sale.dueAmount)}`,
                  });
                  return;
                } catch {
                  // Fallback
                }
              }
              window.print();
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-800/25 bg-gradient-to-br from-[#052e1e] to-[#0a4d34] px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-95 disabled:opacity-60 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4 text-amber-300" />
            <span>প্রিন্ট / পিডিএফ শেয়ার করুন</span>
            <Share2 className="h-3.5 w-3.5 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface DuePaymentReceiptModalProps {
  receipt: DuePaymentReceipt | null;
  shopName: string;
  ownerName?: string;
  shopAddress: string;
  shopPhone: string;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

export const DuePaymentReceiptModal: React.FC<DuePaymentReceiptModalProps> = ({
  receipt,
  shopName,
  ownerName = 'রাব্বি',
  shopAddress,
  shopPhone,
  onClose,
  onNotify,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [lastExportResult, setLastExportResult] =
    useState<PdfExportResult | null>(null);

  if (!receipt) return null;

  const pdfFileName = `${receipt.receiptNo}-DueReceipt.pdf`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2.5 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="due-receipt-modal-title"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-400/35 bg-white/98 p-3.5 sm:p-5 shadow-[0_16px_45px_rgb(0,0,0,0.32)] backdrop-blur-xl">
        <div className="shrink-0 mb-3 flex items-center justify-between border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2.5 text-emerald-900 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#052e1e] to-[#0a4d34] text-amber-300 shadow-2xs">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h2
                id="due-receipt-modal-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 truncate"
              >
                ডিজিটাল বকেয়া আদায় রশিদ (Due Receipt)
              </h2>
              <p className="num-clear text-xs font-semibold text-slate-500 truncate">
                রশিদ নং: {receipt.receiptNo} • কাস্টমার: {receipt.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="রশিদ বন্ধ করুন"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700 transition active:scale-[0.95]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5">
          <div id="printable-due-receipt" className="bg-white">
            <div
              data-pdf-page="true"
              className="rounded-3xl border-2 border-amber-500/45 bg-white p-5 sm:p-6 text-slate-900 shadow-xs space-y-4"
            >
              <div
                className="rounded-2xl px-5 py-4 text-center text-white border border-amber-400/40"
                style={{
                  backgroundColor: '#052e1e',
                  backgroundImage:
                    'linear-gradient(135deg, #052e1e 0%, #0a4d34 55%, #065f46 100%)',
                }}
              >
                <div
                  className="inline-block rounded-full px-4 py-1 text-[11px] font-extrabold text-slate-950"
                  style={{
                    backgroundColor: '#d4af37',
                    backgroundImage:
                      'linear-gradient(135deg, #d4af37 0%, #f3cc56 100%)',
                  }}
                >
                  Dookanify • বকেয়া কিস্তি আদায় রশিদ (Due Payment Receipt)
                </div>
                <h3 className="mt-2 text-lg sm:text-xl font-extrabold text-white">
                  {shopName}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-emerald-100">
                  প্রোপ্রাইটর: {ownerName} • {shopAddress}
                </p>
                <p className="num-clear mt-0.5 text-xs font-extrabold text-amber-300">
                  হটলাইন / মোবাইল: {shopPhone}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50/60 p-3.5 text-xs border border-emerald-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">
                    রশিদ নং:{' '}
                    <strong className="num-clear font-extrabold text-emerald-950">
                      {receipt.receiptNo}
                    </strong>
                  </span>
                  <span className="num-clear font-bold text-slate-800">
                    তারিখ: {receipt.dateLabel} ({receipt.paymentDateISO})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">
                    কাস্টমারের নাম:{' '}
                    <strong className="font-extrabold text-slate-900">
                      {receipt.customerName}
                    </strong>
                  </span>
                  <span className="num-clear font-bold text-slate-800">
                    মোবাইল: {receipt.customerPhone || '—'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 overflow-hidden bg-slate-50/70 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                  <span className="font-bold text-slate-600">
                    পূর্বের বকেয়া (Previous Due)
                  </span>
                  <span className="num-clear text-sm font-extrabold text-slate-900">
                    {formatBDT(receipt.previousDue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                  <span className="font-extrabold text-emerald-800">
                    আজকের নগদ জমা (Paid Today)
                  </span>
                  <span className="num-clear text-base font-extrabold text-emerald-700">
                    +{formatBDT(receipt.paidAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-extrabold text-slate-900 text-sm">
                    বর্তমান অবশিষ্ট বাকি (Remaining Due)
                  </span>
                  <span
                    className={`num-clear inline-block px-3 py-1 rounded-full font-extrabold text-xs ${
                      receipt.remainingDue > 0
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {receipt.remainingDue > 0
                      ? `বাকি: ${formatBDT(receipt.remainingDue)}`
                      : 'সম্পূর্ণ পরিশোধিত (৳0)'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-slate-300 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-3 pt-3">
                  <span className="border-t border-slate-400 pt-1.5 px-3">
                    জমাদানকারীর স্বাক্ষর
                  </span>
                  <span className="border-t border-slate-400 pt-1.5 px-3">
                    বিক্রেতা / ক্যাশিয়ার
                  </span>
                </div>
                <div className="text-center text-[11px] font-medium text-slate-500">
                  বকেয়া পরিশোধের জন্য ধন্যবাদ! • Dookanify Smart POS
                </div>
              </div>
            </div>
          </div>
        </div>

        {lastExportResult && (
          <div className="shrink-0 mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FolderCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              <span className="num-clear font-extrabold text-emerald-950 truncate">
                Saved: {lastExportResult.savedPath}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                void shareOrOpenGeneratedPdf(
                  lastExportResult,
                  `${shopName} - ${receipt.receiptNo}`
                )
              }
              className="inline-flex items-center gap-1 shrink-0 rounded-xl bg-emerald-700 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-emerald-800 transition"
            >
              <ExternalLink className="h-3 w-3" />
              <span>ফাইল ওপেন / শেয়ার</span>
            </button>
          </div>
        )}

        <div className="shrink-0 mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={async () => {
              const el = document.getElementById('printable-due-receipt');
              if (el) {
                setIsExportingPdf(true);
                try {
                  const res = await exportElementToIdenticalPDF(el, pdfFileName);
                  setLastExportResult(res);
                  if (onNotify) {
                    onNotify(
                      `Saved: ${res.savedPath} — বকেয়া আদায় রশিদ ডাউনলোড সম্পন্ন!`
                    );
                  }
                } catch {
                  window.print();
                } finally {
                  setIsExportingPdf(false);
                }
              }
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#e6c34a] to-[#f3cc56] border border-amber-400/50 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition-all hover:brightness-105 disabled:opacity-60 active:scale-[0.98]"
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <FileDown className="h-4 w-4 text-slate-950" />
            )}
            <span>রশিদ PDF ডাউনলোড</span>
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={async () => {
              const el = document.getElementById('printable-due-receipt');
              if (el) {
                setIsExportingPdf(true);
                try {
                  const res =
                    lastExportResult &&
                    lastExportResult.fileName === pdfFileName
                      ? lastExportResult
                      : await exportElementToIdenticalPDF(el, pdfFileName);
                  setLastExportResult(res);
                  if (
                    await shareOrOpenGeneratedPdf(
                      res,
                      `${shopName} - ${receipt.receiptNo}`
                    )
                  ) {
                    if (onNotify) {
                      onNotify(
                        `বকেয়া আদায় রশিদ (${res.savedPath}) ওপেন/শেয়ার করা হয়েছে!`
                      );
                    }
                    return;
                  }
                } catch {
                  // Fallback
                } finally {
                  setIsExportingPdf(false);
                }
              }
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `${shopName} - বকেয়া আদায় রশিদ (${receipt.receiptNo})`,
                    text: `${shopName}\nরশিদ নং: ${receipt.receiptNo}\nকাস্টমার: ${receipt.customerName}\nপূর্বের বকেয়া: ${formatBDT(receipt.previousDue)}\nআজকের জমা: ${formatBDT(receipt.paidAmount)}\nবর্তমান বাকি: ${formatBDT(receipt.remainingDue)}`,
                  });
                  return;
                } catch {
                  // Fallback
                }
              }
              window.print();
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-800/25 bg-gradient-to-br from-[#052e1e] to-[#0a4d34] px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-95 disabled:opacity-60 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4 text-amber-300" />
            <span>প্রিন্ট / শেয়ার করুন</span>
            <Share2 className="h-3.5 w-3.5 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
};
