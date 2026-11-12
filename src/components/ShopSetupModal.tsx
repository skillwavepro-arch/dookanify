import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  Mail,
  LogOut,
  Sparkles,
  CheckCircle2,
  Loader2,
  CloudUpload,
  CloudDownload,
  AlertTriangle,
  Download,
  Upload,
  Settings2,
  RotateCcw,
} from 'lucide-react';
import {
  Customer,
  Expense,
  ExtraIncome,
  Product,
  Sale,
  ShopProfile,
  StaffMember,
} from '../types/shop';
import { POPULAR_SHOP_NAMES } from '../data/seedData';
import { CUSTOM_FIREBASE_CONFIG_STORAGE_KEY } from '../firebase';
import {
  emailToDocId,
  encodePriceToCode,
  parseFirebaseConfigSnippet,
  validatePriceCodeKey,
} from '../utils/shopLogic';
import { DookanifyLogo } from './DookanifyLogo';

export interface ShopBackupPayload {
  shopProfile?: ShopProfile;
  products?: Product[];
  customers?: Customer[];
  sales?: Sale[];
  expenses?: Expense[];
  extraIncomes?: ExtraIncome[];
  staff?: StaffMember[];
}

interface ShopSetupModalProps {
  isOpen: boolean;
  shopProfile: ShopProfile;
  currentUser?: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
  } | null;
  isSigningIn?: boolean;
  isCloudSyncing?: boolean;
  authError?: string | null;
  cloudStatusNotice?: string | null;
  backupPayload?: ShopBackupPayload;
  onClose: () => void;
  onSaveProfile: (profile: ShopProfile) => void;
  onGoogleLogin?: () => void;
  onInstantGmailConnect?: (email: string) => void;
  onGoogleLogout?: () => void;
  onPushToCloud?: () => void;
  onPullFromCloud?: () => void;
  onRestoreBackup?: (payload: ShopBackupPayload) => void;
  onClearAuthError?: () => void;
  onClearCloudNotice?: () => void;
  onOpenDeveloperModal?: () => void;
}

export const ShopSetupModal: React.FC<ShopSetupModalProps> = ({
  isOpen,
  shopProfile,
  currentUser,
  isSigningIn = false,
  isCloudSyncing = false,
  authError = null,
  cloudStatusNotice = null,
  backupPayload,
  onClose,
  onSaveProfile,
  onGoogleLogin,
  onInstantGmailConnect,
  onGoogleLogout,
  onPushToCloud,
  onPullFromCloud,
  onRestoreBackup,
  onClearAuthError,
  onClearCloudNotice,
}) => {
  const [formState, setFormState] = useState<ShopProfile>(shopProfile);
  const [capitalInput, setCapitalInput] = useState<string>(() =>
    String(shopProfile.workingCapital ?? 0)
  );
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);
  const [gmailInput, setGmailInput] = useState(
    currentUser?.email || shopProfile.ownerEmail || 'skillwave.pro@gmail.com'
  );
  const [firebaseSnippet, setFirebaseSnippet] = useState('');
  const [hasCustomFirebase, setHasCustomFirebase] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [priceCodeError, setPriceCodeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setFormState(shopProfile);
      setCapitalInput(String(shopProfile.workingCapital ?? 0));
      setPriceCodeError(null);
      setLocalError(null);
      setLocalNotice(null);
      if (currentUser?.email) {
        setGmailInput(currentUser.email);
      } else if (shopProfile.ownerEmail) {
        setGmailInput(shopProfile.ownerEmail);
      } else if (!gmailInput) {
        setGmailInput('skillwave.pro@gmail.com');
      }
      try {
        const savedCfg = localStorage.getItem(
          CUSTOM_FIREBASE_CONFIG_STORAGE_KEY
        );
        if (savedCfg) {
          setFirebaseSnippet(savedCfg);
          setHasCustomFirebase(true);
        } else {
          setHasCustomFirebase(false);
        }
      } catch {
        // Ignore
      }
    }
    wasOpenRef.current = isOpen;
  }, [shopProfile, isOpen, currentUser, gmailInput]);

  if (!isOpen) return null;

  const handlePriceCodeChange = (val: string) => {
    const clean = val.toUpperCase().replace(/\s+/g, '');
    setFormState((prev) => ({ ...prev, priceCodeKey: clean }));
    if (clean.length === 10) {
      setPriceCodeError(validatePriceCodeKey(clean));
    } else {
      setPriceCodeError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formState.shopName.trim();
    if (!trimmedName) {
      setLocalError('দোকানের নাম অবশ্যই লিখতে হবে।');
      return;
    }
    const cleanCode = (formState.priceCodeKey || 'XBANGLDESH')
      .trim()
      .toUpperCase();
    const codeErr = validatePriceCodeKey(cleanCode);
    if (codeErr) {
      setPriceCodeError(codeErr);
      return;
    }
    const workingCapital = Math.max(0, Math.round(Number(capitalInput) || 0));
    onSaveProfile({
      ...formState,
      shopName: trimmedName,
      ownerName: formState.ownerName.trim() || 'দোকান মালিক',
      phone: formState.phone.trim(),
      address: formState.address.trim(),
      workingCapital,
      priceCodeKey: cleanCode,
    });
    onClose();
  };

  const handleInstantConnect = () => {
    setLocalError(null);
    const cleaned = gmailInput.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) {
      setLocalError(
        'সঠিক জিমেইল অ্যাড্রেস লিখুন (যেমন: skillwave.pro@gmail.com)'
      );
      return;
    }
    if (onInstantGmailConnect) {
      onInstantGmailConnect(cleaned);
    }
  };

  const handleExportJson = () => {
    if (!backupPayload) return;
    const json = JSON.stringify(
      {
        version: 3,
        exportedAt: new Date().toISOString(),
        ...backupPayload,
      },
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bostraloy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLocalNotice('ব্যাকআপ JSON ফাইল সফলভাবে ডাউনলোড হয়েছে!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRestoreBackup) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        const nextProfile = parsed.shopProfile
          ? { ...parsed.shopProfile, profileUpdatedAt: Date.now() }
          : undefined;
        onRestoreBackup({
          shopProfile: nextProfile,
          products: Array.isArray(parsed.products) ? parsed.products : undefined,
          customers: Array.isArray(parsed.customers)
            ? parsed.customers
            : undefined,
          sales: Array.isArray(parsed.sales) ? parsed.sales : undefined,
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : undefined,
          extraIncomes: Array.isArray(parsed.extraIncomes)
            ? parsed.extraIncomes
            : undefined,
          staff: Array.isArray(parsed.staff) ? parsed.staff : undefined,
        });
        if (nextProfile) {
          setFormState(nextProfile);
          setCapitalInput(String(nextProfile.workingCapital ?? 0));
        }
        setLocalNotice(
          'ফাইল থেকে দোকানের সকল ডেটা (পোশাক, ক্যাশ মেমো, বাকি ও খরচ) সফলভাবে রিস্টোর হয়েছে!'
        );
      } catch {
        setLocalError('ব্যাকআপ ফাইলটি সঠিক JSON ফরম্যাটে নেই।');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSaveFirebaseConfig = () => {
    setLocalError(null);
    setLocalNotice(null);
    if (!firebaseSnippet.trim()) {
      localStorage.removeItem(CUSTOM_FIREBASE_CONFIG_STORAGE_KEY);
      setHasCustomFirebase(false);
      setLocalNotice('ডিফল্ট ক্লাউড কনফিগারেশন পুনরায় সক্রিয় করা হয়েছে।');
      return;
    }
    const { config, error } = parseFirebaseConfigSnippet(firebaseSnippet);
    if (error || !config) {
      setLocalError(
        error || 'Firebase Config-এ apiKey, authDomain এবং projectId পাওয়া যায়নি।'
      );
      return;
    }
    const formatted = JSON.stringify(config, null, 2);
    localStorage.setItem(CUSTOM_FIREBASE_CONFIG_STORAGE_KEY, formatted);
    setFirebaseSnippet(formatted);
    setHasCustomFirebase(true);
    setLocalNotice(
      `Firebase প্রজেক্ট (${config.projectId}) সফলভাবে সংরক্ষিত হয়েছে!`
    );
  };

  const sample1250 = encodePriceToCode(1250, formState.priceCodeKey);
  const sample1000 = encodePriceToCode(1000, formState.priceCodeKey);
  const sample1850 = encodePriceToCode(1850, formState.priceCodeKey);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="দোকান সেটআপ ও ক্লাউড সিঙ্ক"
        className="bg-white w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl shadow-xl border border-slate-200/80"
      >
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DookanifyLogo size="md" variant="emerald-gold" rounded="2xl" />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Dookanify (দুকানিফাই) • ক্লাউড ও দোকান সেটআপ
              </h3>
              <p className="text-xs text-emerald-100/90">
                ১-ক্লিক জিমেইল সিঙ্ক, ক্লাউড সেভ/রিস্টোর, ফাইল ব্যাকআপ এবং গোপন
                প্রাইস কোড
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto"
        >
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-amber-50/60 border border-emerald-200/80 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    জিমেইল ক্লাউড সিঙ্ক ও ১-ক্লিক রিস্টোর
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    আপনার জিমেইল কানেক্ট করলে সকল হিসাব ক্লাউডে (
                    <span className="num-clear font-bold text-emerald-800">
                      users/{emailToDocId(currentUser?.email || gmailInput)}
                    </span>
                    ) সুরক্ষিত থাকবে।
                  </p>
                </div>
              </div>

              {currentUser && (
                <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-emerald-200 shadow-xs">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-7 h-7 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-800 leading-none">
                      {formState.ownerName ||
                        currentUser.displayName ||
                        'দোকান মালিক'}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 num-clear">
                      {currentUser.email}
                    </p>
                  </div>
                  {onGoogleLogout && (
                    <button
                      type="button"
                      onClick={onGoogleLogout}
                      title="লগআউট করুন"
                      className="ml-2 p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {!currentUser && (
              <div className="space-y-3 bg-white/90 p-4 rounded-2xl border border-emerald-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      জিমেইল ইমেইল দিয়ে সরাসরি কানেক্ট করুন (1-Click Instant
                      Login)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      কোনো পপ-আপ ব্লক বা Invalid Request ছাড়াই ১ ক্লিকে জিমেইল
                      সিঙ্ক চালু করুন:
                    </p>
                  </div>
                  {onGoogleLogin && (
                    <button
                      type="button"
                      onClick={onGoogleLogin}
                      disabled={isSigningIn}
                      className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition disabled:opacity-50"
                    >
                      <Cloud className="w-3.5 h-3.5 text-amber-300" />
                      {isSigningIn ? 'সংযুক্ত হচ্ছে...' : 'One-Click Google Login'}
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={gmailInput}
                      onChange={(e) => setGmailInput(e.target.value)}
                      placeholder="skillwave.pro@gmail.com"
                      aria-label="জিমেইল অ্যাড্রেস লিখুন"
                      className="num-clear w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-emerald-300 bg-emerald-50/30 text-xs sm:text-sm font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleInstantConnect}
                    disabled={isSigningIn}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>জিমেইল দিয়ে সরাসরি কানেক্ট করুন</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {onPushToCloud && (
                <button
                  type="button"
                  onClick={onPushToCloud}
                  disabled={isCloudSyncing}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60"
                >
                  {isCloudSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>ক্লাউডে সেভ করুন (Push to Cloud)</span>
                </button>
              )}

              {onPullFromCloud && (
                <button
                  type="button"
                  onClick={onPullFromCloud}
                  disabled={isCloudSyncing}
                  className="px-4 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 shadow-2xs transition disabled:opacity-60"
                >
                  {isCloudSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  ) : (
                    <CloudDownload className="w-4 h-4 text-emerald-700" />
                  )}
                  <span>ক্লাউড থেকে রিস্টোর করুন (Pull from Cloud)</span>
                </button>
              )}
            </div>

            {currentUser && (
              <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-100/80 px-3.5 py-2.5 rounded-2xl font-bold">
                {isCloudSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 shrink-0" />
                    <span>ক্লাউডে ডেটা সিঙ্ক হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="num-clear">
                      ক্লাউড সিঙ্ক সক্রিয় ({currentUser.email} → users/
                      {emailToDocId(currentUser.email || undefined)})! অন্য ডিভাইসে একই
                      জিমেইল দিলে সব ডেটা চলে আসবে।
                    </span>
                  </>
                )}
              </div>
            )}

            {(authError || localError) && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{localError || authError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    if (onClearAuthError) onClearAuthError();
                  }}
                  className="text-amber-700 hover:text-amber-950"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {(cloudStatusNotice || localNotice) && (
              <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-900 text-white text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{localNotice || cloudStatusNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocalNotice(null);
                    if (onClearCloudNotice) onClearCloudNotice();
                  }}
                  className="text-emerald-200 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  ডেটা ব্যাকআপ ডাউনলোড (JSON)
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  ফাইল থেকে রিস্টোর (JSON)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowFirebaseConfig(!showFirebaseConfig)}
                className="px-3 py-2 rounded-2xl bg-white/90 hover:bg-white text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Settings2 className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {hasCustomFirebase
                    ? 'Firebase Config (কানেক্টেড)'
                    : 'Firebase Config সেটআপ'}
                </span>
              </button>
            </div>

            {showFirebaseConfig && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">
                    Firebase Console থেকে পাওয়া JSON অথবা সম্পূর্ণ{' '}
                    <code className="font-mono text-emerald-700">
                      const firebaseConfig = {'{ ... }'};
                    </code>{' '}
                    কোড পেস্ট করুন:
                  </p>
                </div>
                <textarea
                  rows={5}
                  value={firebaseSnippet}
                  onChange={(e) => setFirebaseSnippet(e.target.value)}
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "your-app.firebaseapp.com",\n  projectId: "your-app"\n};`}
                  className="w-full p-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    স্মার্ট পার্সার স্বয়ংক্রিয়ভাবে JS কোড ও JSON থেকে apiKey,
                    authDomain ও projectId যাচাই করবে।
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveFirebaseConfig}
                    className="px-4 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shrink-0"
                  >
                    কনফিগ যাচাই ও সেভ করুন
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              তালিকা থেকে দোকানের নাম সিলেক্ট করুন (অথবা নিচে নিজের দোকানের নাম
              লিখুন):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SHOP_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFormState({ ...formState, shopName: name })}
                  className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition ${
                    formState.shopName === name
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                দোকানের নাম (ক্যাশ মেমো ও অ্যাপের উপরে দেখাবে) *
              </label>
              <input
                type="text"
                required
                value={formState.shopName}
                onChange={(e) =>
                  setFormState({ ...formState, shopName: e.target.value })
                }
                placeholder="যেমন: সোনার বাংলা বস্ত্রালয় অ্যান্ড ফ্যাশন হাউস"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                প্রোপ্রাইটর / মালিকের নাম
              </label>
              <input
                type="text"
                value={formState.ownerName}
                onChange={(e) =>
                  setFormState({ ...formState, ownerName: e.target.value })
                }
                placeholder="যেমন: রাব্বি"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                দোকানের মোবাইল নম্বর
              </label>
              <input
                type="text"
                value={formState.phone}
                onChange={(e) =>
                  setFormState({ ...formState, phone: e.target.value })
                }
                placeholder="যেমন: 01843373523"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-sm num-clear"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                দোকানের ঠিকানা
              </label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) =>
                  setFormState({ ...formState, address: e.target.value })
                }
                placeholder="যেমন: সীতাকুণ্ড, চট্টগ্রাম"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                নগদ কার্যকরী পুঁজি (Working Capital ৳)
              </label>
              <input
                type="number"
                min="0"
                value={capitalInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCapitalInput(val);
                  setFormState((prev) => ({
                    ...prev,
                    workingCapital: Math.max(0, Math.round(Number(val) || 0)),
                  }));
                }}
                placeholder="50000"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-sm num-clear font-bold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  গোপন প্রাইস কোড কি-ওয়ার্ড (১০টি ভিন্ন অক্ষর, ০ থেকে ৯ পর্যন্ত)
                </label>
                {formState.priceCodeKey !== 'XBANGLDESH' && (
                  <button
                    type="button"
                    onClick={() => handlePriceCodeChange('XBANGLDESH')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    ডিফল্ট XBANGLDESH রিসেট
                  </button>
                )}
              </div>
              <input
                type="text"
                maxLength={10}
                value={formState.priceCodeKey}
                onChange={(e) => handlePriceCodeChange(e.target.value)}
                placeholder="XBANGLDESH"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-emerald-300 bg-emerald-50/40 focus:border-emerald-600 focus:outline-none text-sm font-mono font-bold text-emerald-950 tracking-widest num-clear"
              />
              {priceCodeError ? (
                <p className="text-xs font-bold text-rose-600 mt-1.5">
                  {priceCodeError}
                </p>
              ) : (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 num-clear">
                  <span>
                    ডিফল্ট: <strong>XBANGLDESH</strong> (0=X, 1=B, 2=A, 3=N,
                    4=G, 5=L, 6=D, 7=E, 8=S, 9=H)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                    চেক: 1250 = {sample1250} • 1000 = {sample1000} • 1850 ={' '}
                    {sample1850}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              তথ্য সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
