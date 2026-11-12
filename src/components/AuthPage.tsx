import React, { useState, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  CheckCircle2,
  Loader2,
  CloudUpload,
  CloudDownload,
  LayoutDashboard,
  Settings,
  LogOut,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Store,
  User,
  Mail,
  Lock,
  EyeOff,
  Eye,
  LogIn,
  Zap,
  Check,
  HeartHandshake,
} from 'lucide-react';
import { ShopProfile } from '../types/shop';
import { auth, googleProvider } from '../firebase';
import { emailToDocId } from '../utils/shopLogic';

export interface EmailAuthPayload {
  mode: 'signin' | 'signup';
  email: string;
  password: string;
  shopName?: string;
  ownerName?: string;
}

interface AuthPageProps {
  currentUser: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  } | null;
  shopProfile: ShopProfile;
  isSigningIn: boolean;
  isCloudSyncing: boolean;
  authError: string | null;
  cloudStatusNotice: string | null;
  onEmailAuth: (payload: EmailAuthPayload) => Promise<boolean>;
  onGoogleQuickAuth: (email: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
  onPushToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  onGoToDashboard: () => void;
  onOpenShopSetup: () => void;
  onClearMessages: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  shopProfile,
  isSigningIn,
  isCloudSyncing,
  authError,
  cloudStatusNotice,
  onEmailAuth,
  onGoogleQuickAuth,
  onLogout,
  onPushToCloud,
  onPullFromCloud,
  onGoToDashboard,
  onOpenShopSetup,
  onClearMessages,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const isBusy = isSigningIn || isLocalSubmitting;

  const withTimeout = async <T,>(
    promise: Promise<T>,
    ms = 8000,
    fallback: T
  ): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearMessages();
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail || !cleanedEmail.includes('@') || !cleanedEmail.includes('.')) {
      setLocalError('সঠিক ইমেইল অ্যাড্রেস লিখুন (যেমন: example@gmail.com)');
      return;
    }
    if (!password || password.trim().length < 4) {
      setLocalError('কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।');
      return;
    }
    if (mode === 'signup' && !shopName.trim()) {
      setLocalError('নতুন অ্যাকাউন্টের জন্য আপনার দোকানের নাম লিখুন।');
      return;
    }

    setIsLocalSubmitting(true);
    try {
      const ok = await withTimeout(
        onEmailAuth({
          mode,
          email: cleanedEmail,
          password: password.trim(),
          shopName: shopName.trim() || undefined,
          ownerName: ownerName.trim() || undefined,
        }),
        8000,
        false
      );
      if (ok) {
        setEmail('');
        setPassword('');
      }
    } catch {
      setLocalError('লগইন সম্পন্ন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setLocalError(null);
    onClearMessages();

    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const isAndroidWebView =
      /; wv\)/i.test(ua) ||
      /Version\/\d+\.\d+.*Chrome/i.test(ua) ||
      /Android/i.test(ua);
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (!isAndroidWebView && !isInIframe && typeof window !== 'undefined' && navigator.onLine) {
      try {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        const result = await Promise.race([
          signInWithPopup(auth, googleProvider),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
        ]);
        if (result && result.user?.email) {
          setIsLocalSubmitting(true);
          try {
            await withTimeout(
              onGoogleQuickAuth(result.user.email.trim().toLowerCase()),
              8000,
              false
            );
          } finally {
            setIsLocalSubmitting(false);
          }
          return;
        }
      } catch {
        // Fallback to manual email/password focus below
      }
    }

    if (email.trim() && email.includes('@')) {
      passwordInputRef.current?.focus();
    } else {
      emailInputRef.current?.focus();
    }
    setLocalError(
      'নিরাপত্তার স্বার্থে নিচের বক্সে আপনার নিজস্ব Gmail এবং পাসওয়ার্ড লিখে Sign In করুন।'
    );
  };

  if (currentUser) {
    const docId = emailToDocId(currentUser.email);
    return (
      <div className="max-w-md mx-auto py-2 sm:py-4">
        <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="rounded-3xl bg-emerald-50 border border-emerald-200/80 p-4 sm:p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm text-xl font-extrabold">
              {(currentUser.email[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Account Connected</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {shopProfile.shopName}
              </h2>
              <p className="text-xs font-bold text-emerald-700 truncate num-clear">
                {currentUser.email}
              </p>
            </div>
          </div>

          {cloudStatusNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cloudStatusNotice}</span>
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">প্রোপ্রাইটর:</span>
              <span className="font-extrabold text-slate-900">
                {shopProfile.ownerName || 'রাব্বি'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">মোবাইল নম্বর:</span>
              <span className="font-extrabold text-slate-900 num-clear">
                {shopProfile.phone}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">ক্লাউড আইডি:</span>
              <span className="font-mono font-bold text-emerald-700 num-clear">
                shops/{docId} • users/{docId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onPushToCloud}
              disabled={isCloudSyncing}
              className="py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60"
            >
              {isCloudSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>ক্লাউডে ব্যাকআপ সেভ</span>
            </button>

            <button
              type="button"
              onClick={onPullFromCloud}
              disabled={isCloudSyncing}
              className="py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {isCloudSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              ) : (
                <CloudDownload className="w-4 h-4 text-emerald-700" />
              )}
              <span>ক্লাউড থেকে রিস্টোর</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-300" />
              <span>ড্যাশবোর্ডে ফিরে যান</span>
            </button>

            <button
              type="button"
              onClick={onOpenShopSetup}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>দোকানের তথ্য এডিট</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out • লগআউট করুন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-1 sm:py-3">
      <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="rounded-3xl bg-emerald-50/90 border border-emerald-200/70 p-4 sm:p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {mode === 'signin' ? 'Sign in to continue' : 'Create an account'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {mode === 'signin'
                ? 'Access your account securely'
                : 'আপনার দোকানের নতুন অ্যাকাউন্ট খুলুন'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleContinue}
          disabled={isBusy}
          className="w-full rounded-2xl border border-slate-200/90 bg-white hover:bg-emerald-50/40 hover:border-emerald-300 p-3.5 flex items-center justify-between gap-3 transition shadow-2xs active:scale-[0.99] text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.275c0-.85-.075-1.665-.215-2.45H12v4.635h6.445c-.28 1.495-1.125 2.765-2.395 3.615v3.005h3.875c2.265-2.085 3.565-5.16 3.565-8.805z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.955-1.075 7.94-2.92l-3.875-3.005c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.775-2.11-6.72-4.945H1.275v3.1C3.25 21.305 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.275c-.24-.72-.38-1.49-.38-2.275s.14-1.555.38-2.275v-3.1H1.275C.465 8.24 0 10.065 0 12s.465 3.76 1.275 5.375l4.005-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.775c1.76 0 3.34.605 4.585 1.795l3.435-3.435C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.695 1.275 6.625l4.005 3.1c.945-2.835 3.595-4.95 6.72-4.95z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900">
                Continue with Google
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Sign in with your Google account
              </div>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
            OR CONTINUE WITH EMAIL
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {(localError || authError) && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{localError || authError}</span>
          </div>
        )}

        {cloudStatusNotice && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cloudStatusNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
          {mode === 'signup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Shop Name (দোকানের নাম)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="আপনার দোকানের নাম লিখুন"
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:outline-none text-sm font-semibold text-slate-900 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Owner Name (আপনার নাম)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="প্রোপ্রাইটরের নাম লিখুন"
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:outline-none text-sm font-semibold text-slate-900 transition"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                ref={emailInputRef}
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:outline-none text-sm font-semibold text-slate-900 tracking-normal transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="অ্যাক্সেস পাসওয়ার্ড লিখুন"
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-600 focus:outline-none text-sm font-semibold text-slate-900 tracking-normal transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>
              {isBusy
                ? 'অপেক্ষা করুন...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </span>
          </button>
        </form>

        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-slate-900">Fast</span>
            <span className="text-[11px] text-slate-400">Instant access</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-slate-900">Secure</span>
            <span className="text-[11px] text-slate-400">Safe login</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-1.5">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-slate-900">
              Trusted
            </span>
            <span className="text-[11px] text-slate-400">Easy & reliable</span>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/70 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-emerald-900">
              Your data is safe
            </div>
            <div className="text-[11px] text-slate-500">
              Secure authentication protects your account.
            </div>
          </div>
        </div>

        <div className="pt-1 text-center text-xs font-medium text-slate-500">
          {mode === 'signin' ? (
            <>
              New user to Dookanify?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                }}
                className="font-extrabold text-emerald-700 hover:underline ml-1"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                }}
                className="font-extrabold text-emerald-700 hover:underline ml-1"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
        Secure login • Stay connected with Dookanify POS
      </p>
    </div>
  );
};
