import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  EyeOff,
  Eye,
  Mail,
  Lock,
  Sparkles,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { DeveloperAccessRegistry } from '../types/shop';
import {
  isUserEmailBlocked,
  verifyUserAccessGate,
} from '../utils/storageEngine';
import { DookanifyLogo } from './DookanifyLogo';

interface ActivationGateModalProps {
  isOpen: boolean;
  registry: DeveloperAccessRegistry;
  onActivated: (
    email: string,
    shopName?: string,
    ownerName?: string,
    passcodeUsed?: string
  ) => void;
}

export const ActivationGateModal: React.FC<ActivationGateModalProps> = ({
  isOpen,
  registry,
  onActivated,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const dev = registry.developerProfile;
  const isBlocked = isUserEmailBlocked(registry, emailInput);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-gate-title"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-amber-400/35 bg-white p-5 sm:p-7 shadow-xl animate-scale-in">
        <div className="flex flex-col items-center text-center">
          <div className="select-none">
            <DookanifyLogo size="lg" variant="gold-luxury" rounded="2xl" />
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>সুরক্ষিত ওয়ান-টাইম অ্যাপ অ্যাক্সেস পাস (One-Time Pass)</span>
          </div>
          <h1
            id="activation-gate-title"
            className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900"
          >
            অ্যাপ অ্যাক্সেস পাসওয়ার্ড ভেরিফিকেশন
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            একবার সঠিক অ্যাপ অ্যাক্সেস পাসওয়ার্ড দিলে এই ডিভাইসে স্থায়ীভাবে
            আনলক হয়ে যাবে — ডেভেলপার ব্লক না করা পর্যন্ত দ্বিতীয়বার আর পাসওয়ার্ড
            চাইবে না।
          </p>
        </div>

        {isBlocked && !errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-xs font-extrabold text-rose-700"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>
              আপনার অ্যাকাউন্টটি ডেভেলপার অপশন থেকে ব্যান / ব্লক (Banned) করা
              হয়েছে। পুনরায় অ্যাক্সেস পেতে ডেভেলপারের সাথে যোগাযোগ করুন।
            </span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMsg(null);
            const cleanedEmail = emailInput.trim().toLowerCase();
            if (
              !cleanedEmail ||
              !cleanedEmail.includes('@') ||
              !cleanedEmail.includes('.')
            ) {
              setErrorMsg(
                'অনুগ্রহ করে আপনার সঠিক জিমেইল অ্যাড্রেস লিখুন (যেমন: example@gmail.com)।'
              );
              return;
            }
            const res = verifyUserAccessGate(
              registry,
              cleanedEmail,
              passcodeInput
            );
            if (res.allowed) {
              setEmailInput('');
              setPasscodeInput('');
              onActivated(
                cleanedEmail,
                res.matchedUser?.shopName,
                res.matchedUser?.ownerName,
                passcodeInput.trim()
              );
            } else {
              setErrorMsg(
                res.reason ||
                  'অ্যাপ অ্যাক্সেস পাসওয়ার্ড সঠিক নয়! সঠিক পাসওয়ার্ড দিন।'
              );
            }
          }}
          className="mt-4 space-y-3.5"
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="activation-code-input"
              className="block text-xs font-extrabold text-slate-800 mb-1"
            >
              অ্যাপ অ্যাক্সেস পাসওয়ার্ড (App Access Pass) *
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
              <input
                id="activation-code-input"
                type={showPasscode ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="new-password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="অ্যাক্সেস পাসওয়ার্ড লিখুন"
                className="num-clear w-full rounded-2xl border border-emerald-400 bg-emerald-50/30 py-3 pl-10 pr-10 text-xs sm:text-sm font-extrabold tracking-wider text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label="পাসওয়ার্ড দেখুন"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPasscode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="activation-email-input"
              className="block text-xs font-extrabold text-slate-800 mb-1"
            >
              আপনার জিমেইল (Shop Gmail)
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="activation-email-input"
                type="email"
                required
                autoComplete="off"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="example@gmail.com"
                className="num-clear w-full rounded-2xl border border-slate-300 bg-slate-50/70 py-3 pl-10 pr-3.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 py-3.5 px-5 text-sm font-extrabold text-white shadow-[0_8px_25px_rgba(4,120,87,0.3)] hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Lock className="h-4 w-4 text-amber-300" />
            <span>পাসওয়ার্ড ভেরিফাই ও অ্যাপ আনলক করুন</span>
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-slate-200/90 bg-slate-50 p-3.5 space-y-2.5 select-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>অ্যাক্সেস পাসওয়ার্ড প্রয়োজন?</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-800">
              Dev: {dev.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            আপনার অ্যাকাউন্ট অনুমোদন (Approve) করতে বা অ্যাক্সেস পাসওয়ার্ড পেতে
            ডেভেলপারের সাথে যোগাযোগ করুন:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={dev.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-2 text-xs font-extrabold text-white transition"
            >
              <MessageCircle className="h-3.5 w-3.5 text-amber-300" />
              <span>WhatsApp</span>
            </a>
            <a
              href={dev.callUrl}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-800 transition num-clear"
            >
              <PhoneCall className="h-3.5 w-3.5 text-emerald-700" />
              <span>{dev.whatsappDisplay}</span>
            </a>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>ট্রিপল-লেয়ার ডাটা সুরক্ষা ও ক্লাউড ব্যাকআপ সক্রিয়</span>
        </div>
      </div>
    </div>
  );
};
