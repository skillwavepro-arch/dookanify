import React, { useState, useRef } from 'react';
import {
  X,
  BadgeCheck,
  Sparkles,
  MessageCircle,
  ExternalLink,
  PhoneCall,
  Mail,
  Check,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { DeveloperProfile } from '../types/shop';
import { DEFAULT_DEVELOPER_PROFILE } from '../utils/storageEngine';

export const DEVELOPER_PROFILE = DEFAULT_DEVELOPER_PROFILE;

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  developerProfile?: DeveloperProfile;
  onUnlockDeveloperPanel?: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  isOpen,
  onClose,
  developerProfile = DEFAULT_DEVELOPER_PROFILE,
  onUnlockDeveloperPanel,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isOpen) return null;

  const profile = developerProfile || DEFAULT_DEVELOPER_PROFILE;

  const startHold = () => {
    if (!onUnlockDeveloperPanel) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      onUnlockDeveloperPanel();
    }, 5000);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="ডেভেলপার প্রোফাইল ও সাপোর্ট"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.3)] border border-emerald-200/80 overflow-hidden animate-in zoom-in-95 duration-200">
        <div
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          className="relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 px-6 pt-7 pb-6 text-white text-center overflow-hidden select-none"
        >
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex justify-center mb-3.5">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 opacity-75 blur-md animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 p-0.5 shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-900 to-slate-950 flex items-center justify-center border-2 border-amber-300/60">
                  <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
                    {profile.initials}
                  </span>
                </div>
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-emerald-950"
                title="Verified Developer"
              >
                <BadgeCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/35 text-amber-300 text-[11px] font-extrabold tracking-wide">
              <Sparkles className="w-3 h-3" />
              <span>VERIFIED VIP DEVELOPER</span>
            </div>
          </div>

          <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>{profile.name}</span>
            <BadgeCheck className="w-5 h-5 text-amber-400 shrink-0" />
          </h3>
          <p className="text-xs font-semibold text-emerald-200/95 mt-1">
            {profile.title}
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-3.5 bg-gradient-to-b from-white to-slate-50/90">
          <div className="text-center mb-1">
            <p className="text-xs font-bold text-slate-600">
              যেকোনো কাস্টম অ্যাপ, পস সফটওয়্যার বা টেকনিক্যাল সাপোর্টের জন্য
              ১-ক্লিকে যোগাযোগ করুন:
            </p>
          </div>

          <a
            href={profile.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white shadow-[0_8px_20px_rgba(4,120,87,0.25)] flex items-center justify-between gap-3 transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                  1-Click WhatsApp Chat
                </div>
                <div className="text-sm font-extrabold text-white num-clear truncate">
                  WhatsApp: {profile.whatsappDisplay}
                </div>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shrink-0">
              <span>চ্যাট</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          <a
            href={profile.callUrl}
            className="w-full p-3.5 rounded-2xl bg-white hover:bg-emerald-50/70 border border-slate-200/90 hover:border-emerald-300 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-slate-500">
                  সরাসরি কল করুন (Direct Call)
                </div>
                <div className="text-sm font-extrabold text-slate-900 num-clear">
                  {profile.whatsappDisplay}
                </div>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs shrink-0">
              কল করুন
            </span>
          </a>

          <div className="w-full p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex items-center justify-between gap-2">
            <a
              href={profile.mailtoUrl}
              className="flex items-center gap-3 min-w-0 flex-1 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-slate-500">
                  অফিসিয়াল ইমেইল (Email)
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 num-clear truncate group-hover:text-emerald-700 transition">
                  {profile.email}
                </div>
              </div>
            </a>

            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(profile.email);
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2500);
                } catch {
                  const ta = document.createElement('textarea');
                  ta.value = profile.email;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2500);
                }
              }}
              className={`px-3 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 border transition ${
                copiedEmail
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="ইমেইল কপি করুন"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/70">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Dookanify (দুকানিফাই) প্রিমিয়াম এডিশন
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 font-extrabold text-xs transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
