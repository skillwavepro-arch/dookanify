import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface ConfirmDeleteTarget {
  type:
    | 'product'
    | 'sale'
    | 'customer'
    | 'expense'
    | 'extra_income'
    | 'staff';
  id: string;
  title: string;
  subtitle?: string;
}

interface IosConfirmDialogProps {
  target: ConfirmDeleteTarget | null;
  onCancel: () => void;
  onConfirm: (target: ConfirmDeleteTarget, restoreStock: boolean) => void;
}

export const IosConfirmDialog: React.FC<IosConfirmDialogProps> = ({
  target,
  onCancel,
  onConfirm,
}) => {
  const [restoreStock, setRestoreStock] = useState(true);

  useEffect(() => {
    if (target) {
      setRestoreStock(true);
    }
  }, [target]);

  if (!target) return null;

  const typeLabelMap: Record<ConfirmDeleteTarget['type'], string> = {
    product: 'পোশাক / স্টক আইটেম',
    sale: 'ক্যাশ মেমো / বিক্রয় হিসাব',
    customer: 'কাস্টমার ও বাকির খাতা',
    expense: 'দোকানের খরচের হিসাব',
    extra_income: 'বকশিস / ক্যাশ পুঁজি জমার হিসাব',
    staff: 'কর্মচারী ও বেতন প্রোফাইল',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md animate-backdrop-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-confirm-title"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/95 p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl animate-ios-modal">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h3
          id="ios-confirm-title"
          className="mt-4 text-lg font-bold text-slate-900"
        >
          আপনি কি নিশ্চিত এটি ডিলিট করতে চান?
        </h3>

        <p className="mt-1.5 text-xs text-slate-500">
          {typeLabelMap[target.type]} স্থায়ীভাবে মুছে ফেলা হবে:
        </p>

        <div className="mt-3 rounded-2xl bg-slate-100/90 px-4 py-3 text-left">
          <div className="text-sm font-bold text-slate-900">{target.title}</div>
          {target.subtitle && (
            <div className="mt-0.5 text-xs font-medium text-slate-600 tabular-nums">
              {target.subtitle}
            </div>
          )}
        </div>

        {target.type === 'sale' && (
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-left text-xs font-medium text-emerald-950">
            <input
              type="checkbox"
              checked={restoreStock}
              onChange={(e) => setRestoreStock(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-700"
            />
            <span>বিক্রিত পোশাকের পরিমাণ পুনরায় স্টকে ফেরত যোগ করুন</span>
          </label>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.97]"
          >
            <X className="h-4 w-4" />
            বাতিল করুন
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target, restoreStock)}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700 active:scale-[0.97]"
          >
            <Trash2 className="h-4 w-4" />
            হ্যাঁ, ডিলিট করুন
          </button>
        </div>
      </div>
    </div>
  );
};
