import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserCheck,
  MapPin,
  Phone,
  Zap,
  ChevronRight,
  Gift,
  Users,
  History,
  Percent,
  Sparkles,
  Store,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Cloud,
  Smartphone,
  BadgeCheck,
  MessageCircle,
} from 'lucide-react';
import { DeveloperProfile, ShopProfile } from '../types/shop';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { formatBDT } from '../utils/shopLogic';
import { DEFAULT_DEVELOPER_PROFILE } from '../utils/storageEngine';
import { DookanifyLogo } from './DookanifyLogo';

const SECRET_HOLD_MS = 5000;

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shopProfile: ShopProfile;
  user: {
    uid: string;
    email: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  } | null;
  totalInventoryCostValue: number;
  netProfit: number;
  totalDiscountGiven?: number;
  todayDiscountGiven?: number;
  discountedSalesCount?: number;
  totalExtraBargainingProfit?: number;
  todayExtraBargainingProfit?: number;
  extraBargainingSalesCount?: number;
  totalTransactionsCount?: number;
  staffCount?: number;
  extraIncomeCount?: number;
  developerProfile?: DeveloperProfile;
  onOpenShopSetup: () => void;
  onOpenPriceCodeModal: () => void;
  onOpenAllTransactions: () => void;
  onOpenDiscountLedger?: () => void;
  onOpenExtraProfitLedger?: () => void;
  onOpenQuickEntryModal: () => void;
  onOpenExtraIncomeTab: () => void;
  onOpenStaffSalaryModal: () => void;
  onOpenProfitCapitalModal: () => void;
  onNavigateToExpenses: () => void;
  onOpenCloudSyncModal: () => void;
  onOpenAuthPage: () => void;
  onOpenDeveloperModal: () => void;
  onUnlockDeveloperPanel?: () => void;
  isCloudSyncing?: boolean;
  lastCloudSyncTime?: string;
  onForceCloudSync?: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  shopProfile,
  user,
  netProfit,
  totalDiscountGiven = 0,
  todayDiscountGiven = 0,
  discountedSalesCount = 0,
  totalExtraBargainingProfit = 0,
  todayExtraBargainingProfit = 0,
  extraBargainingSalesCount = 0,
  totalTransactionsCount = 0,
  staffCount = 0,
  extraIncomeCount = 0,
  developerProfile = DEFAULT_DEVELOPER_PROFILE,
  onOpenShopSetup,
  onOpenPriceCodeModal,
  onOpenAllTransactions,
  onOpenDiscountLedger,
  onOpenExtraProfitLedger,
  onOpenQuickEntryModal,
  onOpenExtraIncomeTab,
  onOpenStaffSalaryModal,
  onOpenProfitCapitalModal,
  onNavigateToExpenses,
  onOpenCloudSyncModal,
  onOpenAuthPage,
  onOpenDeveloperModal,
  onUnlockDeveloperPanel,
}) => {
  const { isInstallable, isIOS, isStandalone, installApp } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const didTriggerSecretRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) clearHoldTimer();
    return () => clearHoldTimer();
  }, [isOpen]);

  if (!isOpen) return null;

  const dev = developerProfile || DEFAULT_DEVELOPER_PROFILE;

  const handleHoldStart = () => {
    clearHoldTimer();
    didTriggerSecretRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      didTriggerSecretRef.current = true;
      clearHoldTimer();
      onClose();
      if (onUnlockDeveloperPanel) {
        onUnlockDeveloperPanel();
      }
    }, SECRET_HOLD_MS);
  };

  const handleHoldEnd = () => {
    clearHoldTimer();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="সাইড মেনু ড্রয়ার"
    >
      <div
        className="fixed inset-0 bg-black/60 animate-backdrop-fade"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col justify-between overflow-y-auto bg-white p-4 shadow-xl animate-drawer-slide">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DookanifyLogo size="md" variant="gold-luxury" rounded="2xl" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    Dookanify
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    Smart POS
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  বস্ত্রালয় পস মেনু ও প্রাইস কোড টুলস
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ড্রয়ার বন্ধ করুন"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition active:scale-[0.95]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-3xl bg-royal-forest-silk border border-amber-400/35 p-4 text-white shadow-[0_10px_30px_rgba(5,46,30,0.3)] relative overflow-hidden">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/15 blur-xl" />
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="text-xs font-extrabold text-amber-300">
                লাইসেন্সকৃত ডিজিটাল শপ প্রোফাইল
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShopSetup();
                }}
                className="rounded-full bg-gold-metallic border border-amber-300/60 px-3 py-1 text-[11px] font-extrabold text-slate-950 shadow-2xs hover:brightness-105 transition active:scale-[0.97]"
              >
                পরিবর্তন
              </button>
            </div>

            <h2 className="mt-1 text-base font-extrabold leading-snug text-white relative z-10">
              {shopProfile.shopName}
            </h2>

            <div className="mt-2 space-y-1 text-xs text-emerald-50">
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                <span>
                  প্রোপ্রাইটর:{' '}
                  <strong className="font-bold text-white">
                    {shopProfile.ownerName}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                <span>{shopProfile.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                <span>
                  হটলাইন:{' '}
                  <strong className="num-clear font-bold tracking-wide text-white">
                    {shopProfile.phone}
                  </strong>
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/15 px-3 py-1.5 text-xs">
              <span className="text-emerald-100">গোপন প্রাইস কোড:</span>
              <span className="num-clear font-bold tracking-widest text-white">
                {shopProfile.priceCodeKey}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQuickEntryModal();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50/70 to-emerald-50/60 p-3 text-left shadow-[0_4px_20px_rgb(245,158,11,0.12)] transition-all hover:border-amber-400 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    দ্রুত মোট বিক্রি ও খরচ এন্ট্রি (মেমো ছাড়া হিসাব)
                  </div>
                  <div className="text-xs text-slate-600">
                    ১-ক্লিকে সারাদিনের মোট বিক্রি ও মোট খরচ সরাসরি যোগ করুন
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExtraIncomeTab();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-emerald-200/90 bg-emerald-50/50 p-3 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <span>
                      বকশিস, প্রাপ্ত টাকা ও পুঁজি যোগ (Tips & Extra Cash In)
                    </span>
                    {extraIncomeCount > 0 && (
                      <span className="num-clear rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {extraIncomeCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    বকশিস, অন্যান্য প্রাপ্ত টাকা বা নতুন ক্যাশ পুঁজি যোগ করুন
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStaffSalaryModal();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-indigo-200/90 bg-indigo-50/40 p-3 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <span>কর্মচারী ও বেতন ম্যানেজমেন্ট (Staff & Salary)</span>
                    <span className="num-clear rounded-full bg-indigo-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {staffCount}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    স্টাফ তালিকা, মাসিক বেতন, অগ্রিম (Advance) ও বকেয়া হিসাব
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-indigo-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAllTransactions();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-amber-50/60 p-3 text-left shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all hover:border-emerald-400 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-amber-300 shadow-xs">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <span>সব লেনদেন (তারিখ ও সময় সহ)</span>
                    <span className="num-clear rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {totalTransactionsCount}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    আজ, গতকাল ও সকল তারিখের জমা-খরচ ও পুঁজির পূর্ণাঙ্গ হিসাব
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-emerald-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenDiscountLedger) onOpenDiscountLedger();
                else onNavigateToExpenses();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-rose-200/90 bg-gradient-to-r from-rose-50/85 via-amber-50/55 to-white p-3 text-left shadow-[0_4px_20px_rgb(244,63,94,0.07)] transition-all hover:border-rose-300 hover:bg-rose-50/80 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-xs">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <span>ডিসকাউন্ট ও ছাড়ের হিসাব (ছাড় খাতা)</span>
                    <span className="num-clear rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {discountedSalesCount}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    মোট ছাড়:{' '}
                    <span className="num-clear font-extrabold text-rose-700">
                      {formatBDT(totalDiscountGiven)}
                    </span>{' '}
                    • আজকের ছাড়:{' '}
                    <span className="num-clear font-extrabold text-amber-800">
                      {formatBDT(todayDiscountGiven)}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-rose-600" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenExtraProfitLedger) onOpenExtraProfitLedger();
                else onNavigateToExpenses();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-emerald-300/90 bg-gradient-to-r from-emerald-50/90 via-amber-50/75 to-white p-3 text-left shadow-[0_4px_20px_rgb(16,185,129,0.09)] transition-all hover:border-emerald-400 hover:bg-emerald-50/85 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-amber-600 text-amber-200 shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <span>অতিরিক্ত বিক্রয় মুনাফার হিসাব (বাড়তি লাভ খাতা)</span>
                    <span className="num-clear rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {extraBargainingSalesCount}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    মোট বাড়তি লাভ:{' '}
                    <span className="num-clear font-extrabold text-emerald-700">
                      +{formatBDT(totalExtraBargainingProfit)}
                    </span>{' '}
                    • আজকের বাড়তি লাভ:{' '}
                    <span className="num-clear font-extrabold text-amber-800">
                      +{formatBDT(todayExtraBargainingProfit)}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShopSetup();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    দোকানের নাম ও তথ্য সেটআপ
                  </div>
                  <div className="text-xs text-slate-500">
                    নাম, প্রোপ্রাইটর, হটলাইন ও গোপন কোড এডিট
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPriceCodeModal();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    গোপন প্রাইস কোড ও ভ্যালু ক্যালকুলেটর
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="num-clear font-bold text-teal-800">
                      {shopProfile.priceCodeKey}
                    </span>{' '}
                    (0-9) চার্ট ও কোড কনভার্টার
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfitCapitalModal();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    লাভ ও পুঁজি উসুল বিশ্লেষণ
                  </div>
                  <div className="text-xs text-slate-500">
                    নিট মুনাফা:{' '}
                    <span
                      className={`num-clear font-bold ${
                        netProfit < 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatBDT(netProfit)}
                    </span>{' '}
                    · মোট পুঁজি ও লাভ-লস হিসাব
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToExpenses();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    দৈনিক বা মাসিক খরচ খাতা
                  </div>
                  <div className="text-xs text-slate-500">
                    দোকান ভাড়া, বিদ্যুৎ বিল ও স্টাফ বেতন হিসাব
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuthPage();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:bg-emerald-100/70 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <span>
                      {user
                        ? 'অ্যাকাউন্ট ও লগআউট পেজ'
                        : 'লগইন / নতুন অ্যাকাউন্ট'}
                    </span>
                    {user && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-xs text-slate-600 num-clear">
                    {user
                      ? `লগইনকৃত: ${user.email}`
                      : 'Sign In, Create Account ও Google Login পেজ'}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-emerald-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCloudSyncModal();
              }}
              className="card-interactive flex w-full items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <span>ক্লাউড ব্যাকআপ ও কনফিগ</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    JSON ব্যাকআপ ডাউনলোড, রিস্টোর ও ক্লাউড সেটিংস
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>

            {(isInstallable || (isIOS && !isStandalone)) && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isInstallable) {
                      void installApp();
                    } else {
                      setShowIosGuide((prev) => !prev);
                    }
                  }}
                  className="card-interactive flex w-full items-center justify-between rounded-3xl border border-amber-300/80 bg-amber-50/70 p-3.5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:bg-amber-100/70 active:scale-[0.97]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {isIOS
                          ? 'iPhone / iPad (iOS) অ্যাপ ইনস্টল'
                          : 'Android / Windows PC অ্যাপ ইনস্টল'}
                      </div>
                      <div className="text-xs text-slate-600">
                        {isIOS
                          ? 'হোম স্ক্রিনে ফুল-স্ক্রিন iOS অ্যাপ হিসেবে যুক্ত করুন'
                          : '১-ক্লিকে ডিভাইসে স্ট্যান্ডঅ্যালোন অ্যাপ ইনস্টল করুন'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-700" />
                </button>

                {showIosGuide && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-slate-800 space-y-1.5">
                    <div className="font-extrabold text-amber-950">
                      iPhone / iPad এ ইনস্টল করার নিয়ম:
                    </div>
                    <div>
                      ১. নিচের Safari বারের <strong>Share (শেয়ার)</strong> আইকনে
                      ট্যাপ করুন।
                    </div>
                    <div>
                      ২. নিচে স্ক্রল করে <strong>Add to Home Screen</strong>{' '}
                      বাটনে ট্যাপ করে <strong>Add</strong> দিন।
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            onClick={() => {
              if (didTriggerSecretRef.current) {
                didTriggerSecretRef.current = false;
              } else {
                onClose();
                onOpenDeveloperModal();
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
                onOpenDeveloperModal();
              }
            }}
            className="group relative select-none cursor-pointer overflow-hidden rounded-3xl border border-amber-400/40 bg-royal-forest-silk p-4 text-white shadow-[0_10px_30px_rgba(5,46,30,0.32)] transition hover:shadow-[0_12px_35px_rgba(212,175,55,0.25)] active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-xl" />
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-amber-300">
                <Sparkles className="h-3 w-3" />
                <span>Verified Developer</span>
              </span>
              <span className="num-clear text-[11px] font-bold text-emerald-200">
                WhatsApp: {dev.whatsappDisplay}
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/60 bg-gold-metallic text-sm font-extrabold text-slate-950 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                {dev.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-extrabold text-white">
                  <span className="truncate">Developed by {dev.name}</span>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-amber-400" />
                </div>
                <div className="truncate text-[11px] text-emerald-200/90 num-clear">
                  {dev.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!didTriggerSecretRef.current) {
                  onClose();
                  onOpenDeveloperModal();
                }
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gold-metallic border border-amber-300/60 py-2 text-xs font-extrabold text-slate-950 shadow-sm transition group-hover:brightness-105"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>যোগাযোগ ও সাপোর্ট</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
