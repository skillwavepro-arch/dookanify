import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Search, Sparkles, Plus, Trash2 } from 'lucide-react';

export interface IosSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface IosSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: IosSelectOption[];
  placeholder?: string;
  sheetTitle?: string;
  ariaLabel?: string;
  accentTone?: 'emerald' | 'amber';
  className?: string;
  searchableThreshold?: number;
  allowAddOption?: boolean;
  addInputPlaceholder?: string;
  addButtonLabel?: string;
  onAddOption?: (newValue: string) => void;
  allowDeleteOption?: boolean;
  onDeleteOption?: (valueToDelete: string) => void;
}

export const IosSelect: React.FC<IosSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'নির্বাচন করুন',
  sheetTitle = 'অপশন নির্বাচন করুন',
  ariaLabel,
  accentTone = 'emerald',
  className = '',
  searchableThreshold = 6,
  allowAddOption = false,
  addInputPlaceholder = 'নতুন নাম লিখুন...',
  addButtonLabel = '+ যোগ করুন',
  onAddOption,
  allowDeleteOption = false,
  onDeleteOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newOptionInput, setNewOptionInput] = useState('');

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const showSearch = options.length > searchableThreshold;

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setNewOptionInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (nextVal: string) => {
    onChange(nextVal);
    setIsOpen(false);
  };

  const handleCreateOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed || !onAddOption) return;
    onAddOption(trimmed);
    onChange(trimmed);
    setNewOptionInput('');
  };

  const isAmber = accentTone === 'amber';

  return (
    <>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || sheetTitle}
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center justify-between gap-2 text-left transition-all active:scale-[0.99] ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption ? selectedOption.label : value || placeholder}
        </span>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
            isAmber
              ? 'bg-amber-100/80 text-amber-800 group-hover:bg-amber-200/80'
              : 'bg-emerald-100/80 text-emerald-800 group-hover:bg-emerald-200/80'
          }`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
            onClick={() => setIsOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={sheetTitle}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl bg-white/98 backdrop-blur-2xl shadow-[0_-12px_45px_rgba(0,0,0,0.22)] sm:shadow-[0_24px_60px_rgba(0,0,0,0.28)] border-t sm:border border-slate-200/90 overflow-hidden animate-scale-in"
            >
              {/* iPhone Bottom Sheet Grabber Handle */}
              <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
                <div className="h-1.5 w-11 rounded-full bg-slate-300/90" />
              </div>

              {/* Luxury Header */}
              <div
                className={`px-5 py-3.5 flex items-center justify-between border-b ${
                  isAmber
                    ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border-amber-200/70'
                    : 'bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border-emerald-200/70'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
                      isAmber
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : 'bg-gradient-to-br from-emerald-600 to-teal-700'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate">
                      {sheetTitle}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500">
                      তালিকা থেকে যেকোনো একটি অপশনে ট্যাপ করুন
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="মেনু বন্ধ করুন"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-300/80 active:scale-95 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Add New Option Bar (for Categories / Sizes) */}
              {allowAddOption && onAddOption && (
                <div className="px-4 pt-3 pb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateOption();
                        }
                      }}
                      placeholder={addInputPlaceholder}
                      aria-label={addInputPlaceholder}
                      className="min-w-0 flex-1 rounded-2xl border border-emerald-300 bg-emerald-50/40 px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateOption}
                      disabled={!newOptionInput.trim()}
                      className="inline-flex shrink-0 items-center gap-1 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:opacity-95 active:scale-95 disabled:opacity-45 whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{addButtonLabel}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Instant Search Bar for Larger Lists */}
              {showSearch && (
                <div className="px-4 pt-2 pb-1">
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="দ্রুত খুঁজুন..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* iPhone-Style Option List */}
              <div
                role="listbox"
                className="max-h-[55vh] overflow-y-auto p-3 space-y-1.5"
              >
                {filteredOptions.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-slate-400">
                    কোনো অপশন পাওয়া যায়নি
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <div
                        key={opt.value || '__empty__'}
                        className={`w-full flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 transition-all border ${
                          isSelected
                            ? isAmber
                              ? 'bg-gradient-to-r from-amber-50 to-orange-50/70 border-amber-400 text-amber-950 shadow-xs'
                              : 'bg-gradient-to-r from-emerald-50 to-teal-50/70 border-emerald-400 text-emerald-950 shadow-xs'
                            : 'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/70 text-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(opt.value)}
                          className="min-w-0 flex-1 flex items-center justify-between gap-3 text-left py-0.5 active:scale-[0.99]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-sm leading-snug ${
                                  isSelected
                                    ? 'font-extrabold text-slate-950'
                                    : 'font-bold text-slate-800'
                                }`}
                              >
                                {opt.label}
                              </span>
                              {opt.badge && (
                                <span
                                  className={`num-clear rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    isSelected
                                      ? isAmber
                                        ? 'bg-amber-200/80 text-amber-950'
                                        : 'bg-emerald-200/80 text-emerald-950'
                                      : 'bg-slate-200/80 text-slate-700'
                                  }`}
                                >
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            {opt.sublabel && (
                              <p className="num-clear text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                                {opt.sublabel}
                              </p>
                            )}
                          </div>

                          {/* iPhone Custom Radio / Checkmark Indicator */}
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              isSelected
                                ? isAmber
                                  ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                                  : 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            )}
                          </div>
                        </button>

                        {allowDeleteOption && onDeleteOption && options.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteOption(opt.value);
                            }}
                            aria-label={`${opt.label} ডিলিট করুন`}
                            title={`${opt.label} মুছে ফেলুন`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-rose-50/80 text-rose-600 hover:bg-rose-100 hover:text-rose-700 active:scale-95 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Cancel Button for Mobile Ergonomics */}
              <div className="px-3 pb-4 pt-1 sm:hidden">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-extrabold text-slate-700 transition active:scale-[0.99]"
                >
                  বাতিল করুন
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
