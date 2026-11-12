import React, { useState, useMemo } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Users,
  Database,
  Code2,
  UserPlus,
  Trash2,
  Ban,
  CheckCircle2,
  RefreshCw,
  LogIn,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Store,
  Package,
  Receipt,
  Wallet,
  Save,
  ArrowLeft,
  AlertTriangle,
  Flame,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import {
  DeveloperAccessRegistry,
  ApprovedShopUser,
  UserAccountDataSnapshot,
  Product,
  SaleRecord,
  ExpenseRecord,
} from '../types/shop';
import {
  formatBDT,
  getTodayISO,
  calculateShopFinancialSummary,
  sanitizePriceCodeKey,
  encodeCostToSecretWord,
} from '../utils/shopLogic';
import {
  verifyAdminSecretPassword,
  getFirestoreDocId,
  isDeviceActivated,
  getActivatedUserEmail,
} from '../utils/storageEngine';
import { DookanifyLogo } from './DookanifyLogo';

interface AdminPasswordGateModalProps {
  isOpen: boolean;
  registry: DeveloperAccessRegistry;
  isStandaloneAdminApp?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AdminPasswordGateModal({
  isOpen,
  registry,
  isStandaloneAdminApp = false,
  onSuccess,
  onCancel,
}: AdminPasswordGateModalProps) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminSecretPassword(password, registry)) {
      setPassword('');
      setError(null);
      onSuccess();
    } else {
      setError('পাসওয়ার্ড ভুল হয়েছে! সঠিক অ্যাডমিন পাসওয়ার্ড লিখুন।');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto animate-backdrop-fade"
      role="dialog"
      aria-modal="true"
      aria-label="অ্যাডমিন প্যানেল পাসওয়ার্ড ভেরিফিকেশন"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-slate-900 shadow-[0_24px_60px_rgba(0,0,0,0.22)] animate-modal-spring">
        <div className="relative p-6 space-y-5">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <DookanifyLogo size="lg" variant="gold-luxury" rounded="2xl" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
              <Shield className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {isStandaloneAdminApp
                  ? 'DOOKANIFY ADMIN APK SECURITY GATE'
                  : 'DEVELOPER & ADMIN ACCESS GATE'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              অ্যাডমিন ও ডেভেলপার প্যানেল ভেরিফিকেশন
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              সকল দোকানের ইউজার, পাসওয়ার্ড, শপ প্রোফাইল ও ক্লাউড ডাটা নিয়ন্ত্রণ করতে আপনার গোপন অ্যাডমিন পাসওয়ার্ডটি লিখুন।
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                অ্যাডমিন পাসওয়ার্ড (Admin Master Password)
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="অ্যাডমিন পাসওয়ার্ড লিখুন"
                  autoFocus
                  className="num-clear w-full rounded-2xl border border-emerald-300 bg-slate-50 py-3 pl-10 pr-11 text-sm font-extrabold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="পাসওয়ার্ড দেখুন"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              {onCancel && !isStandaloneAdminApp && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  ফিরে যান
                </button>
              )}
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 py-3 px-4 text-sm font-extrabold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition"
              >
                <Unlock className="h-4 w-4 stroke-[2.4]" />
                <span>অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface SecretDeveloperPanelProps {
  isOpen: boolean;
  registry: DeveloperAccessRegistry;
  activeUserEmail: string;
  cloudUsersMap: Record<string, UserAccountDataSnapshot>;
  localAccountsMap: Record<string, { email: string; password?: string }>;
  isLoadingCloudUsers: boolean;
  isStandaloneAdminApp?: boolean;
  onUpdateRegistry: (next: DeveloperAccessRegistry) => Promise<void>;
  onUpdateUserSnapshotFromDev: (email: string, nextSnapshot: UserAccountDataSnapshot) => Promise<void>;
  onDeleteCloudUserFromDev: (email: string) => Promise<void>;
  onSwitchActiveAccountFromDev: (email: string) => Promise<void>;
  onResetDeviceActivation: (lockDevice: boolean) => void;
  onLockAdminApp: () => void;
  onRefreshCloudUsers: () => Promise<void>;
  onExitDeveloperMode: () => void;
  onNotify: (msg: string, tone?: 'emerald' | 'amber' | 'rose') => void;
}

type DevTab = 'users' | 'firebase_users' | 'user_editor' | 'security' | 'developer_profile';

export function SecretDeveloperPanel({
  isOpen,
  registry,
  activeUserEmail,
  cloudUsersMap,
  localAccountsMap,
  isLoadingCloudUsers,
  isStandaloneAdminApp = false,
  onUpdateRegistry,
  onUpdateUserSnapshotFromDev,
  onDeleteCloudUserFromDev,
  onSwitchActiveAccountFromDev,
  onResetDeviceActivation,
  onLockAdminApp,
  onRefreshCloudUsers,
  onExitDeveloperMode,
  onNotify,
}: SecretDeveloperPanelProps) {
  const [activeTab, setActiveTab] = useState<DevTab>('users');
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPasscode, setNewPasscode] = useState('rabbysir');
  const [newAuthPass, setNewAuthPass] = useState('rabbysir');
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('সীতাকুণ্ড, চট্টগ্রাম');
  const [newWorkingCapital, setNewWorkingCapital] = useState('0');
  const [newNotes, setNewNotes] = useState('');

  const [fbEmail, setFbEmail] = useState('');
  const [fbPassword, setFbPassword] = useState('rabbysir');
  const [fbShopName, setFbShopName] = useState('নতুন ফ্যাশন হাউস');
  const [fbOwnerName, setFbOwnerName] = useState('');
  const [fbPhone, setFbPhone] = useState('');
  const [fbAddress, setFbAddress] = useState('সীতাকুণ্ড, চট্টগ্রাম');
  const [fbCapital, setFbCapital] = useState('0');

  const [masterCodeInput, setMasterCodeInput] = useState(registry.masterActivationCode || 'rabbysir');
  const [adminPasswordInput, setAdminPasswordInput] = useState(registry.adminPassword || 'rabbysir');
  const [gateEnabled, setGateEnabled] = useState(registry.isAccessGateEnabled !== false);
  const [strictGmailMode, setStrictGmailMode] = useState(!!registry.requireStrictGmailApproval);

  const [devName, setDevName] = useState(registry.developerProfile.name || '');
  const [devTitle, setDevTitle] = useState(registry.developerProfile.title || '');
  const [devTagline, setDevTagline] = useState(registry.developerProfile.tagline || '');
  const [devBio, setDevBio] = useState(registry.developerProfile.bio || '');
  const [devPhone, setDevPhone] = useState(registry.developerProfile.phone || '');
  const [devWhatsapp, setDevWhatsapp] = useState(registry.developerProfile.whatsapp || '');
  const [devEmail, setDevEmail] = useState(registry.developerProfile.email || '');
  const [devLocation, setDevLocation] = useState(registry.developerProfile.location || '');
  const [devSkillsText, setDevSkillsText] = useState((registry.developerProfile.skills || []).join('\n'));
  const [devServicesText, setDevServicesText] = useState((registry.developerProfile.services || []).join('\n'));

  const [selectedUserEmail, setSelectedUserEmail] = useState<string>(
    activeUserEmail || registry.approvedUsers[0]?.email || 'skillwave.pro@gmail.com'
  );
  const [editShopName, setEditShopName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWorkingCapital, setEditWorkingCapital] = useState('0');
  const [editPriceCode, setEditPriceCode] = useState('XBANGLDESH');
  const [editUserPasscode, setEditUserPasscode] = useState('');
  const [editUserAuthPassword, setEditUserAuthPassword] = useState('');

  const [devProdName, setDevProdName] = useState('');
  const [devProdCategory, setDevProdCategory] = useState('পাঞ্জাবি');
  const [devProdBuyPrice, setDevProdBuyPrice] = useState('');
  const [devProdSellPrice, setDevProdSellPrice] = useState('');
  const [devProdStock, setDevProdStock] = useState('5');

  const todayISO = getTodayISO();

  const combinedUsersMap = useMemo(() => {
    const map: Record<string, UserAccountDataSnapshot> = { ...cloudUsersMap };
    const deletedSet = new Set(
      (registry.deletedUserEmails || []).map((item) => item.trim().toLowerCase())
    );
    for (const approved of registry.approvedUsers) {
      const emailKey = approved.email.trim().toLowerCase();
      if (deletedSet.has(emailKey)) {
        delete map[emailKey];
        continue;
      }
      if (!map[emailKey]) {
        map[emailKey] = {
          version: 5,
          email: emailKey,
          accountEmail: emailKey,
          authPassword: approved.authPassword || approved.passcode,
          updatedAtISO: approved.updatedAtISO,
          shopProfile: {
            shopName: approved.shopName || 'দোকান প্রোফাইল',
            ownerName: approved.ownerName || emailKey.split('@')[0],
            ownerEmail: emailKey,
            address: approved.address || 'সীতাকুণ্ড, চট্টগ্রাম',
            phone: approved.phone || '01800000000',
            priceCodeKey: sanitizePriceCodeKey(approved.priceCodeKey),
            workingCapital: approved.workingCapital || 0,
            isProfileCustomized: true,
          },
          products: [],
          customers: [],
          sales: [],
          expenses: [],
          extraIncomes: [],
          staff: [],
        };
      }
    }
    for (const delEmail of deletedSet) {
      delete map[delEmail];
    }
    return map;
  }, [cloudUsersMap, registry.approvedUsers, registry.deletedUserEmails]);

  const allEmailsList = useMemo(() => {
    const set = new Set<string>();
    const deletedSet = new Set(
      (registry.deletedUserEmails || []).map((item) => item.trim().toLowerCase())
    );
    registry.approvedUsers.forEach((u) => {
      const clean = u.email.trim().toLowerCase();
      if (!deletedSet.has(clean)) set.add(clean);
    });
    Object.keys(combinedUsersMap).forEach((e) => {
      const clean = e.trim().toLowerCase();
      if (!deletedSet.has(clean)) set.add(clean);
    });
    return Array.from(set);
  }, [registry.approvedUsers, registry.deletedUserEmails, combinedUsersMap]);

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allEmailsList;
    return allEmailsList.filter((email) => {
      const regUser = registry.approvedUsers.find((u) => u.email.toLowerCase() === email);
      const snap = combinedUsersMap[email];
      return (
        email.includes(q) ||
        (regUser?.shopName || '').toLowerCase().includes(q) ||
        (regUser?.ownerName || '').toLowerCase().includes(q) ||
        (regUser?.phone || '').toLowerCase().includes(q) ||
        (snap?.shopProfile.shopName || '').toLowerCase().includes(q) ||
        (snap?.shopProfile.ownerName || '').toLowerCase().includes(q)
      );
    });
  }, [allEmailsList, searchQuery, registry.approvedUsers, combinedUsersMap]);

  if (!isOpen) return null;

  const toggleShowPassword = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyText = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
    onNotify('কপি করা হয়েছে!', 'emerald');
  };

  const openUserInEditor = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setSelectedUserEmail(cleanEmail);
    const snap = combinedUsersMap[cleanEmail];
    const regUser = registry.approvedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const docId = getFirestoreDocId(cleanEmail);
    const localAcc = localAccountsMap[docId];

    setEditShopName(snap?.shopProfile.shopName || regUser?.shopName || 'সোনার বাংলা বস্ত্রালয়');
    setEditOwnerName(snap?.shopProfile.ownerName || regUser?.ownerName || 'দোকান মালিক');
    setEditPhone(snap?.shopProfile.phone || regUser?.phone || '');
    setEditAddress(snap?.shopProfile.address || regUser?.address || '');
    setEditWorkingCapital(String(snap?.shopProfile.workingCapital ?? regUser?.workingCapital ?? 0));
    setEditPriceCode(sanitizePriceCodeKey(snap?.shopProfile.priceCodeKey || regUser?.priceCodeKey));
    setEditUserPasscode(regUser?.passcode || registry.masterActivationCode || 'rabbysir');
    setEditUserAuthPassword(
      snap?.authPassword || localAcc?.password || regUser?.authPassword || regUser?.passcode || 'rabbysir'
    );
    setActiveTab('user_editor');
  };

  const handleAddOrUpdateApprovedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify('সঠিক জিমেইল অ্যাড্রেস লিখুন', 'rose');
      return;
    }

    const nowISO = new Date().toISOString();
    const existing = registry.approvedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const entry: ApprovedShopUser = {
      email: cleanEmail,
      passcode: newPasscode.trim() || 'rabbysir',
      authPassword: newAuthPass.trim() || newPasscode.trim() || 'rabbysir',
      shopName: newShopName.trim() || existing?.shopName || 'নতুন বস্ত্রালয় ও ফ্যাশন হাউস',
      ownerName: newOwnerName.trim() || existing?.ownerName || cleanEmail.split('@')[0],
      phone: newPhone.trim() || existing?.phone || '01800000000',
      address: newAddress.trim() || existing?.address || 'সীতাকুণ্ড, চট্টগ্রাম',
      workingCapital: Math.max(0, Number(newWorkingCapital) || 0),
      priceCodeKey: existing?.priceCodeKey || 'XBANGLDESH',
      status: 'approved',
      addedAtISO: existing?.addedAtISO || nowISO,
      updatedAtISO: nowISO,
      notes: newNotes.trim() || existing?.notes,
    };

    const nextUsers = existing
      ? registry.approvedUsers.map((u) => (u.email.toLowerCase() === cleanEmail ? entry : u))
      : [entry, ...registry.approvedUsers];

    const nextDeletedEmails = (registry.deletedUserEmails || []).filter(
      (item) => item.trim().toLowerCase() !== cleanEmail
    );

    await onUpdateRegistry({
      ...registry,
      approvedUsers: nextUsers,
      deletedUserEmails: nextDeletedEmails,
      updatedAtISO: nowISO,
    });

    const existingSnap = combinedUsersMap[cleanEmail];
    const nowMs = Date.now();
    const nextSnap: UserAccountDataSnapshot = {
      version: 5,
      email: cleanEmail,
      accountEmail: cleanEmail,
      authPassword: entry.authPassword,
      updatedAtISO: new Date(nowMs).toISOString(),
      lastModifiedAt: nowMs,
      shopProfile: {
        shopName: entry.shopName,
        ownerName: entry.ownerName,
        ownerEmail: cleanEmail,
        phone: entry.phone || '',
        address: entry.address || '',
        workingCapital: entry.workingCapital || 0,
        priceCodeKey: sanitizePriceCodeKey(entry.priceCodeKey),
        isProfileCustomized: true,
        profileUpdatedAt: nowMs,
      },
      products: existingSnap?.products || [],
      customers: existingSnap?.customers || [],
      sales: existingSnap?.sales || [],
      expenses: existingSnap?.expenses || [],
      extraIncomes: existingSnap?.extraIncomes || [],
      staff: existingSnap?.staff || [],
      deletedIds: existingSnap?.deletedIds || {},
    };
    await onUpdateUserSnapshotFromDev(cleanEmail, nextSnap);

    setNewEmail('');
    setNewShopName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewWorkingCapital('0');
    setNewNotes('');
    onNotify(`"${cleanEmail}" ইউজার ও পাসওয়ার্ড সফলভাবে যুক্ত হয়েছে!`, 'emerald');
  };

  const handleToggleBlockUser = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();
    const existing = registry.approvedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const snap = combinedUsersMap[cleanEmail];

    let nextUsers: ApprovedShopUser[];
    let isBlocking = false;
    if (existing) {
      isBlocking = existing.status !== 'blocked';
      const nextStatus = isBlocking ? 'blocked' : 'approved';
      nextUsers = registry.approvedUsers.map((u) =>
        u.email.toLowerCase() === cleanEmail ? { ...u, status: nextStatus, updatedAtISO: nowISO } : u
      );
      onNotify(
        !isBlocking
          ? `${cleanEmail} আনব্লক করা হয়েছে!`
          : `${cleanEmail} ব্লক করা হয়েছে!`,
        !isBlocking ? 'emerald' : 'rose'
      );
    } else {
      isBlocking = true;
      nextUsers = [
        {
          email: cleanEmail,
          passcode: registry.masterActivationCode || 'rabbysir',
          authPassword: snap?.authPassword || 'rabbysir',
          shopName: snap?.shopProfile.shopName || 'দোকান প্রোফাইল',
          ownerName: snap?.shopProfile.ownerName || cleanEmail.split('@')[0],
          phone: snap?.shopProfile.phone || '',
          address: snap?.shopProfile.address || '',
          workingCapital: snap?.shopProfile.workingCapital || 0,
          status: 'blocked',
          addedAtISO: nowISO,
          updatedAtISO: nowISO,
        },
        ...registry.approvedUsers,
      ];
      onNotify(`${cleanEmail} ব্লক করা হয়েছে!`, 'rose');
    }

    const nextDeletedEmails = (registry.deletedUserEmails || []).filter(
      (item) => item.trim().toLowerCase() !== cleanEmail
    );

    await onUpdateRegistry({
      ...registry,
      approvedUsers: nextUsers,
      deletedUserEmails: nextDeletedEmails,
      updatedAtISO: nowISO,
    });
  };

  const handleDeleteApprovedUser = async (email: string, alsoDeleteCloudData = true) => {
    const cleanEmail = email.trim().toLowerCase();
    const nowISO = new Date().toISOString();
    const nextUsers = registry.approvedUsers.filter((u) => u.email.toLowerCase() !== cleanEmail);
    const existingDeleted = registry.deletedUserEmails || [];
    const nextDeletedEmails = existingDeleted.some((item) => item.trim().toLowerCase() === cleanEmail)
      ? existingDeleted
      : [cleanEmail, ...existingDeleted];

    await onUpdateRegistry({
      ...registry,
      approvedUsers: nextUsers,
      deletedUserEmails: nextDeletedEmails,
      updatedAtISO: nowISO,
    });
    if (alsoDeleteCloudData) {
      await onDeleteCloudUserFromDev(cleanEmail);
      onNotify(`${cleanEmail} ইউজার এবং তার ফায়ারবেস ক্লাউড ও লোকাল ডাটা সম্পূর্ণ মুছে ফেলা হয়েছে`, 'amber');
    } else {
      onNotify(`${cleanEmail} অ্যাপ্রুভাল লিস্ট থেকে মুছে ফেলা হয়েছে`, 'amber');
    }
  };

  const handleCreateFirebaseUserDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = fbEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify('সঠিক ফায়ারবেস ইমেইল অ্যাড্রেস লিখুন', 'rose');
      return;
    }
    const cleanPass = fbPassword.trim() || 'rabbysir';
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();
    const existingSnap = combinedUsersMap[cleanEmail];
    const existingReg = registry.approvedUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    const entry: ApprovedShopUser = {
      email: cleanEmail,
      passcode: cleanPass,
      authPassword: cleanPass,
      shopName: fbShopName.trim() || existingReg?.shopName || 'নতুন ফ্যাশন হাউস',
      ownerName: fbOwnerName.trim() || existingReg?.ownerName || cleanEmail.split('@')[0],
      phone: fbPhone.trim() || existingReg?.phone || '01800000000',
      address: fbAddress.trim() || existingReg?.address || 'সীতাকুণ্ড, চট্টগ্রাম',
      workingCapital: Math.max(0, Number(fbCapital) || 0),
      priceCodeKey: existingReg?.priceCodeKey || 'XBANGLDESH',
      status: 'approved',
      addedAtISO: existingReg?.addedAtISO || nowISO,
      updatedAtISO: nowISO,
    };

    const nextUsers = existingReg
      ? registry.approvedUsers.map((u) => (u.email.toLowerCase() === cleanEmail ? entry : u))
      : [entry, ...registry.approvedUsers];

    const nextDeletedEmails = (registry.deletedUserEmails || []).filter(
      (item) => item.trim().toLowerCase() !== cleanEmail
    );

    await onUpdateRegistry({
      ...registry,
      approvedUsers: nextUsers,
      deletedUserEmails: nextDeletedEmails,
      updatedAtISO: nowISO,
    });

    const nextSnap: UserAccountDataSnapshot = {
      version: 5,
      email: cleanEmail,
      accountEmail: cleanEmail,
      authPassword: cleanPass,
      updatedAtISO: nowISO,
      lastModifiedAt: nowMs,
      shopProfile: {
        shopName: entry.shopName,
        ownerName: entry.ownerName,
        ownerEmail: cleanEmail,
        phone: entry.phone || '',
        address: entry.address || '',
        workingCapital: entry.workingCapital || 0,
        priceCodeKey: sanitizePriceCodeKey(entry.priceCodeKey),
        isProfileCustomized: true,
        profileUpdatedAt: nowMs,
      },
      products: existingSnap?.products || [],
      customers: existingSnap?.customers || [],
      sales: existingSnap?.sales || [],
      expenses: existingSnap?.expenses || [],
      extraIncomes: existingSnap?.extraIncomes || [],
      staff: existingSnap?.staff || [],
      deletedIds: existingSnap?.deletedIds || {},
    };

    await onUpdateUserSnapshotFromDev(cleanEmail, nextSnap);
    setFbEmail('');
    setFbOwnerName('');
    setFbPhone('');
    setFbCapital('0');
    onNotify(`ফায়ারবেস ক্লাউডে "${cleanEmail}" ইউজার ও পাসওয়ার্ড সরাসরি তৈরি হয়েছে!`, 'emerald');
  };

  const handleSaveMasterSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = masterCodeInput.trim() || 'rabbysir';
    const cleanAdminPass = adminPasswordInput.trim() || 'rabbysir';
    await onUpdateRegistry({
      ...registry,
      masterActivationCode: cleanCode,
      adminPassword: cleanAdminPass,
      isAccessGateEnabled: gateEnabled,
      requireStrictGmailApproval: strictGmailMode,
      updatedAtISO: new Date().toISOString(),
    });
    onNotify('মাস্টার পাসওয়ার্ড, অ্যাডমিন পাসওয়ার্ড ও সিকিউরিটি সেটিংস ক্লাউডে সেভ হয়েছে!', 'emerald');
  };

  const handleSaveDeveloperProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateRegistry({
      ...registry,
      developerProfile: {
        name: devName.trim() || 'তন্ময় নাথ (Tonmoy Nath)',
        title: devTitle.trim() || 'Full-Stack Web, Software & AI Developer',
        tagline: devTagline.trim(),
        bio: devBio.trim(),
        phone: devPhone.trim() || '01865215762',
        whatsapp: devWhatsapp.trim() || '8801865215762',
        email: devEmail.trim() || 'tonmoynath1971@gmail.com',
        location: devLocation.trim() || 'সীতাকুণ্ড, চট্টগ্রাম, বাংলাদেশ',
        skills: devSkillsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        services: devServicesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      },
      updatedAtISO: new Date().toISOString(),
    });
    onNotify('ডেভেলপার প্রোফাইল সম্পূর্ণ আপডেট ও ক্লাউডে সিঙ্ক হয়েছে!', 'emerald');
  };

  const selectedSnapshot: UserAccountDataSnapshot = combinedUsersMap[selectedUserEmail] || {
    version: 5,
    email: selectedUserEmail,
    accountEmail: selectedUserEmail,
    updatedAtISO: new Date().toISOString(),
    shopProfile: {
      shopName: editShopName || 'সোনার বাংলা বস্ত্রালয়',
      ownerName: editOwnerName || 'দোকান মালিক',
      ownerEmail: selectedUserEmail,
      address: editAddress || 'সীতাকুণ্ড, চট্টগ্রাম',
      phone: editPhone || '01800000000',
      priceCodeKey: sanitizePriceCodeKey(editPriceCode),
      workingCapital: Math.max(0, Number(editWorkingCapital) || 0),
    },
    products: [],
    customers: [],
    sales: [],
    expenses: [],
    extraIncomes: [],
    staff: [],
  };

  const selectedUserSummary = calculateShopFinancialSummary(
    selectedSnapshot.products || [],
    selectedSnapshot.sales || [],
    selectedSnapshot.customers || [],
    selectedSnapshot.expenses || [],
    selectedSnapshot.shopProfile.workingCapital || 0,
    todayISO,
    selectedSnapshot.extraIncomes || []
  );

  const handleSaveSelectedUserProfileAndPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = selectedUserEmail.trim().toLowerCase();
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();

    const nextSnap: UserAccountDataSnapshot = {
      ...selectedSnapshot,
      email: cleanEmail,
      accountEmail: cleanEmail,
      authPassword: editUserAuthPassword.trim() || 'rabbysir',
      updatedAtISO: nowISO,
      lastModifiedAt: nowMs,
      shopProfile: {
        ...selectedSnapshot.shopProfile,
        shopName: editShopName.trim() || 'সোনার বাংলা বস্ত্রালয়',
        ownerName: editOwnerName.trim() || 'দোকান মালিক',
        ownerEmail: cleanEmail,
        phone: editPhone.trim(),
        address: editAddress.trim(),
        workingCapital: Math.max(0, Math.round(Number(editWorkingCapital) || 0)),
        priceCodeKey: sanitizePriceCodeKey(editPriceCode),
        isProfileCustomized: true,
        profileUpdatedAt: nowMs,
      },
    };

    await onUpdateUserSnapshotFromDev(cleanEmail, nextSnap);

    const existing = registry.approvedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const updatedRegEntry: ApprovedShopUser = {
      email: cleanEmail,
      passcode: editUserPasscode.trim() || 'rabbysir',
      authPassword: editUserAuthPassword.trim() || 'rabbysir',
      shopName: nextSnap.shopProfile.shopName,
      ownerName: nextSnap.shopProfile.ownerName,
      phone: nextSnap.shopProfile.phone,
      address: nextSnap.shopProfile.address,
      workingCapital: nextSnap.shopProfile.workingCapital,
      priceCodeKey: nextSnap.shopProfile.priceCodeKey,
      profileUpdatedAt: nowMs,
      status: existing?.status || 'approved',
      addedAtISO: existing?.addedAtISO || nowISO,
      updatedAtISO: nowISO,
      notes: existing?.notes,
    };

    const nextUsers = existing
      ? registry.approvedUsers.map((u) => (u.email.toLowerCase() === cleanEmail ? updatedRegEntry : u))
      : [updatedRegEntry, ...registry.approvedUsers];

    const nextDeletedEmails = (registry.deletedUserEmails || []).filter(
      (item) => item.trim().toLowerCase() !== cleanEmail
    );

    await onUpdateRegistry({
      ...registry,
      approvedUsers: nextUsers,
      deletedUserEmails: nextDeletedEmails,
      updatedAtISO: nowISO,
    });

    onNotify(`${cleanEmail} ইউজারের প্রোফাইল, পুঁজি ও পাসওয়ার্ড আপডেট হয়েছে!`, 'emerald');
  };

  const handleAddProductToSelectedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const buy = Math.max(0, Math.round(Number(devProdBuyPrice) || 0));
    const sell = Math.max(0, Math.round(Number(devProdSellPrice) || 0));
    const stk = Math.max(0, Math.round(Number(devProdStock) || 0));
    if (!devProdName.trim() || sell <= 0) return;

    const cleanKey = sanitizePriceCodeKey(selectedSnapshot.shopProfile.priceCodeKey);
    const newProd: Product = {
      id: `prod-dev-${Date.now()}`,
      ownerId: getFirestoreDocId(selectedUserEmail),
      name: devProdName.trim(),
      sku: `SKU-${String(Date.now()).slice(-4)}`,
      category: (devProdCategory as Product['category']) || 'পাঞ্জাবি',
      size: 'Free Size',
      color: 'স্ট্যান্ডার্ড',
      fabric: 'সুতি / মিক্সড',
      buyPrice: buy,
      secretCostCode: encodeCostToSecretWord(buy, cleanKey),
      sellPrice: sell,
      stock: stk,
      initialStock: stk,
      soldCount: 0,
      minStockAlert: 2,
      cashPurchaseSpent: buy * stk,
      stockAddedDateISO: todayISO,
      createdAtISO: new Date().toISOString(),
    };

    const nowMs = Date.now();
    const nextSnap: UserAccountDataSnapshot = {
      ...selectedSnapshot,
      products: [newProd, ...(selectedSnapshot.products || [])],
      updatedAtISO: new Date(nowMs).toISOString(),
      lastModifiedAt: nowMs,
    };
    await onUpdateUserSnapshotFromDev(selectedUserEmail, nextSnap);
    setDevProdName('');
    setDevProdBuyPrice('');
    setDevProdSellPrice('');
    onNotify(`"${newProd.name}" ইউজারের স্টকে যোগ হয়েছে!`, 'emerald');
  };

  const handleDeleteItemFromSelectedUser = async (
    type: 'product' | 'sale' | 'expense' | 'customer',
    id: string
  ) => {
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();
    const nextSnap: UserAccountDataSnapshot = {
      ...selectedSnapshot,
      products:
        type === 'product'
          ? (selectedSnapshot.products || []).filter((p) => p.id !== id)
          : selectedSnapshot.products || [],
      sales:
        type === 'sale'
          ? (selectedSnapshot.sales || []).filter((s) => s.id !== id)
          : selectedSnapshot.sales || [],
      expenses:
        type === 'expense'
          ? (selectedSnapshot.expenses || []).filter((ex) => ex.id !== id)
          : selectedSnapshot.expenses || [],
      customers:
        type === 'customer'
          ? (selectedSnapshot.customers || []).filter((c) => c.id !== id)
          : selectedSnapshot.customers || [],
      deletedIds: {
        ...(selectedSnapshot.deletedIds || {}),
        [id]: nowISO,
      },
      updatedAtISO: nowISO,
      lastModifiedAt: nowMs,
    };
    await onUpdateUserSnapshotFromDev(selectedUserEmail, nextSnap);
    onNotify('এন্ট্রিটি ইউজারের অ্যাকাউন্ট থেকে মুছে ফেলা হয়েছে', 'rose');
  };

  const handleWipeUserAccountData = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const snap = combinedUsersMap[cleanEmail] || selectedSnapshot;
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();
    const wipedDeletedIds: Record<string, string> = { ...(snap.deletedIds || {}) };
    (snap.products || []).forEach((p) => {
      wipedDeletedIds[p.id] = nowISO;
    });
    (snap.sales || []).forEach((s) => {
      wipedDeletedIds[s.id] = nowISO;
    });
    (snap.expenses || []).forEach((ex) => {
      wipedDeletedIds[ex.id] = nowISO;
    });
    (snap.customers || []).forEach((c) => {
      wipedDeletedIds[c.id] = nowISO;
    });
    (snap.extraIncomes || []).forEach((inc) => {
      wipedDeletedIds[inc.id] = nowISO;
    });
    (snap.staff || []).forEach((st) => {
      wipedDeletedIds[st.id] = nowISO;
    });

    const resetSnap: UserAccountDataSnapshot = {
      ...snap,
      products: [],
      customers: [],
      sales: [],
      expenses: [],
      extraIncomes: [],
      staff: [],
      deletedIds: wipedDeletedIds,
      shopProfile: {
        ...snap.shopProfile,
        workingCapital: 0,
        profileUpdatedAt: nowMs,
      },
      updatedAtISO: nowISO,
      lastModifiedAt: nowMs,
    };
    await onUpdateUserSnapshotFromDev(cleanEmail, resetSnap);
    onNotify(`${cleanEmail} অ্যাকাউন্টের সকল হিসাব জিরো (Reset) করা হয়েছে!`, 'amber');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-[#f1f5f9] text-slate-900 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Developer Control Panel"
    >
      {/* Top Taskbar — 100% Identical Structure & Styling to Main App Header */}
      <header className="shrink-0 z-30 bg-royal-forest-silk text-white shadow-[0_10px_30px_rgba(5,46,30,0.28)] border-b border-amber-400/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsAdminDrawerOpen(true)}
              aria-label="অ্যাডমিন সাইডবার ওপেন করুন"
              title="অ্যাডমিন ড্রয়ার মেনু খুলুন"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-[0.95] flex items-center justify-center border border-amber-400/35 transition shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5 text-amber-300" />
            </button>

            <DookanifyLogo
              size="sm"
              variant="gold-luxury"
              rounded="2xl"
              className="inline-flex shrink-0"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-metallic text-slate-950 border border-amber-300/60 shrink-0 shadow-2xs">
                  <span>Dookanify</span>
                </span>
                <h1 className="text-xs sm:text-lg font-extrabold tracking-tight truncate text-white">
                  {isStandaloneAdminApp
                    ? 'Dookanify Admin — মাস্টার ড্যাশবোর্ড'
                    : 'তন্ময় নাথ — অ্যাডমিন ও ডেভেলপার ড্যাশবোর্ড'}
                </h1>
              </div>

              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-emerald-100/90 truncate num-clear">
                <span className="truncate">
                  মাস্টার পাস: &quot;{registry.masterActivationCode}&quot; • অ্যাডমিন পাস: &quot;{registry.adminPassword || 'rabbysir'}&quot;
                </span>

                <span className="hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border bg-emerald-400/20 text-emerald-100 border-emerald-300/40 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>ক্লাউড সিঙ্ক সচল ({allEmailsList.length} শপ)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefreshCloudUsers}
              disabled={isLoadingCloudUsers}
              title="ফায়ারবেস ক্লাউড থেকে সকল ইউজার রিফ্রেশ করুন"
              className="px-2.5 sm:px-3.5 py-2 rounded-full bg-amber-400/15 hover:bg-amber-400/25 active:scale-[0.95] text-amber-200 border border-amber-400/35 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isLoadingCloudUsers ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">ক্লাউড রিফ্রেশ</span>
            </button>

            <button
              type="button"
              onClick={onLockAdminApp}
              title="অ্যাডমিন প্যানেল পুনরায় পাসওয়ার্ড দিয়ে লক করুন"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full font-extrabold text-xs transition active:scale-[0.95] bg-white/10 hover:bg-white/20 text-white border border-amber-400/30 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden xs:inline sm:inline">অ্যাডমিন লক</span>
            </button>

            <button
              type="button"
              onClick={onExitDeveloperMode}
              className="px-3 sm:px-3.5 py-2 rounded-full bg-gold-metallic hover:brightness-105 active:scale-[0.95] text-slate-950 border border-amber-300/60 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>অ্যাপে ফিরে যান</span>
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Main Content Container */}
      <div className="flex-1 overflow-y-auto pb-28">
        <main className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 pt-5 pb-12 space-y-5 animate-fade-up">
          {/* Top Royal Forest Silk Hero Card — Matching Main App Dashboard Hero */}
          <div className="bg-royal-forest-silk rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-[0_14px_38px_rgba(5,46,30,0.28)] border border-amber-400/35 relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <DookanifyLogo
                  size="lg"
                  variant="gold-luxury"
                  rounded="2xl"
                  className="hidden sm:inline-flex shrink-0 mt-0.5"
                />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-200 px-3 py-1 rounded-full border border-amber-300/35">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Dookanify • মাস্টার অ্যাডমিন কন্ট্রোল</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-400/20 text-emerald-100 px-3 py-1 rounded-full border border-emerald-300/35 num-clear">
                      <Shield className="w-3.5 h-3.5 text-emerald-300" />
                      <span>
                        {registry.isAccessGateEnabled !== false
                          ? 'পাসওয়ার্ড গেট সচল'
                          : 'পাসওয়ার্ড গেট বন্ধ'}
                      </span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    অ্যাডমিন ও ইউজার অ্যাক্সেস কন্ট্রোল ড্যাশবোর্ড
                  </h2>
                  <p className="text-emerald-100/90 text-xs sm:text-sm">
                    সকল দোকান ইউজার, ফায়ারবেস ক্লাউড অ্যাকাউন্ট, ইউজার ডাটা এডিটর এবং মাস্টার সিকিউরিটি সেটিংস এক জায়গা থেকে নিয়ন্ত্রণ করুন
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[24px] border border-amber-400/35 bg-white/10 px-4 py-3 text-left min-w-[230px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-200 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                      মাস্টার অ্যাক্টিভেশন ও অ্যাডমিন কোড
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('security')}
                      className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                    >
                      পরিবর্তন
                    </button>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5 num-clear">
                    {registry.masterActivationCode || 'rabbysir'}
                  </div>
                  <p className="text-[10px] text-emerald-200/80 mt-0.5 num-clear">
                    বর্তমান লগইন শপ: {activeUserEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Bottom Quick Action Pills — Matching Main App Dashboard */}
            <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-emerald-100/90 num-clear">
                <span>
                  মোট শপ ইউজার: <strong className="text-amber-300">{allEmailsList.length} জন</strong>
                </span>
                <span>•</span>
                <span>
                  ক্লাউড সিঙ্কড: <strong className="text-white">{Object.keys(cloudUsersMap).length} জন</strong>
                </span>
                <span>•</span>
                <span>
                  নির্বাচিত শপ: <strong className="text-emerald-200">{selectedUserEmail}</strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold-metallic hover:brightness-105 text-slate-950 border border-amber-300/70 px-3.5 py-1.5 font-extrabold transition shadow-2xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-950" />
                  <span>+ নতুন ইউজার</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('firebase_users')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/35 px-3 py-1.5 font-bold transition cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>ফায়ারবেস ক্লাউড</span>
                </button>
                <button
                  type="button"
                  onClick={() => openUserInEditor(selectedUserEmail)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3 py-1.5 font-bold transition cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-amber-300" />
                  <span>ডাটা এডিটর</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3 py-1.5 font-bold transition cursor-pointer"
                >
                  <Menu className="w-3.5 h-3.5 text-amber-300" />
                  <span>সাইডবার মেনু</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Luxury KPI Cards — Matching Main App Dashboard KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`card-luxury p-4 sm:p-5 text-left transition cursor-pointer ${
                activeTab === 'users'
                  ? 'ring-2 ring-emerald-600/70 bg-emerald-50/40'
                  : 'hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-600">সকল দোকান ইউজার</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 num-clear">
                {allEmailsList.length} জন
              </div>
              <div className="mt-1.5 text-[11px] text-emerald-700 font-semibold num-clear">
                অ্যাপ্রুভড ও রেজিস্টার্ড শপ অ্যাকাউন্ট
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('firebase_users')}
              className={`card-luxury p-4 sm:p-5 text-left transition cursor-pointer ${
                activeTab === 'firebase_users'
                  ? 'ring-2 ring-teal-600/70 bg-teal-50/40'
                  : 'hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-600">ফায়ারবেস ক্লাউড ইউজার</span>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-teal-800 num-clear">
                {Object.keys(cloudUsersMap).length} জন
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500 font-medium num-clear">
                লাইভ ফায়ারবেস ডাটাবেসে সিঙ্কড
              </div>
            </button>

            <button
              type="button"
              onClick={() => openUserInEditor(selectedUserEmail)}
              className={`card-luxury p-4 sm:p-5 text-left transition cursor-pointer ${
                activeTab === 'user_editor'
                  ? 'ring-2 ring-amber-500/70 bg-amber-50/40'
                  : 'hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-600">ইউজার ডাটা এডিটর</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate num-clear">
                {selectedUserEmail}
              </div>
              <div className="mt-1.5 text-[11px] text-amber-800 font-semibold truncate num-clear">
                পণ্য: {selectedSnapshot.products.length}টি • মেমো: {selectedSnapshot.sales.length}টি
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`card-luxury p-4 sm:p-5 text-left transition cursor-pointer ${
                activeTab === 'security'
                  ? 'ring-2 ring-emerald-600/70 bg-emerald-50/40'
                  : 'hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-600">মাস্টার ও অ্যাডমিন পাসওয়ার্ড</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-800 truncate num-clear">
                {registry.masterActivationCode || 'rabbysir'}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500 font-medium">
                {registry.isAccessGateEnabled !== false ? 'গেট লক সচল আছে' : 'গেট লক বন্ধ'}
              </div>
            </button>
          </div>

          {/* Section Filter / Tab Bar Card — Matching Main App Date Filter Bar */}
          <div className="card-luxury p-4 sm:p-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    অ্যাডমিন কন্ট্রোল সেকশন নির্বাচন করুন
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ইউজার পাসওয়ার্ড, ফায়ারবেস ক্লাউড, শপ ডাটা এডিটর অথবা মাস্টার সিকিউরিটি সেটিংস পরিবর্তন করুন
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1.5 rounded-3xl lg:rounded-full border border-slate-200/70">
                {(
                  [
                    { id: 'users', label: `সকল ইউজার (${allEmailsList.length})`, icon: Users },
                    {
                      id: 'firebase_users',
                      label: `ফায়ারবেস (${Object.keys(cloudUsersMap).length})`,
                      icon: Flame,
                    },
                    {
                      id: 'user_editor',
                      label: `ডাটা এডিটর (${selectedUserEmail.split('@')[0]})`,
                      icon: Database,
                    },
                    { id: 'security', label: 'মাস্টার পাসওয়ার্ড', icon: KeyRound },
                    { id: 'developer_profile', label: 'ডেভেলপার পরিচিতি', icon: Code2 },
                  ] as { id: DevTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
                ).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        item.id === 'user_editor'
                          ? openUserInEditor(selectedUserEmail)
                          : setActiveTab(item.id)
                      }
                      className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-800 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-300' : 'text-emerald-700'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TAB 1: ALL USERS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <form
                onSubmit={handleAddOrUpdateApprovedUser}
                className="lg:col-span-4 card-luxury p-5 space-y-4 self-start"
              >
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      নতুন দোকান ইউজার ও পাসওয়ার্ড যোগ করুন
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      জিমেইল, পাসওয়ার্ড ও দোকানের নাম সেট করে অ্যাক্সেস দিন
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      দোকানদারের জিমেইল (Gmail Address) *
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="shopowner@gmail.com"
                      className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        অ্যাপ অ্যাক্সেস পাসওয়ার্ড *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="rabbysir"
                        className="num-clear w-full rounded-2xl border border-amber-300 bg-amber-50/60 px-3 py-2 font-extrabold text-amber-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        লগইন পাসওয়ার্ড *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAuthPass}
                        onChange={(e) => setNewAuthPass(e.target.value)}
                        placeholder="rabbysir"
                        className="num-clear w-full rounded-2xl border border-emerald-300 bg-emerald-50/60 px-3 py-2 font-extrabold text-emerald-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      দোকানের নাম (Shop Name)
                    </label>
                    <input
                      type="text"
                      value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      placeholder="যেমন: মায়ের দোয়া বস্ত্রালয়"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">মালিকের নাম</label>
                      <input
                        type="text"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        placeholder="মালিকের নাম"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="018..."
                        className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ঠিকানা</label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="সীতাকুণ্ড, চট্টগ্রাম"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">প্রাথমিক পুঁজি (৳)</label>
                      <input
                        type="number"
                        min={0}
                        value={newWorkingCapital}
                        onChange={(e) => setNewWorkingCapital(e.target.value)}
                        className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">নোট (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="মাসিক সাবস্ক্রিপশন বা বিশেষ নোট..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 py-3 px-4 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>ইউজার ও পাসওয়ার্ড সেভ করুন</span>
                  </button>
                </div>
              </form>

              <div className="lg:col-span-8 space-y-4">
                <div className="card-luxury p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        সকল দোকান ইউজার, জিমেইল, পাসওয়ার্ড ও হিসাব তালিকা ({filteredEmails.length})
                      </h2>
                      <p className="text-xs text-slate-500">
                        যেকোনো ইউজারের পাসওয়ার্ড দেখুন, ব্লক/আনব্লক করুন অথবা ১-ক্লিকে তার অ্যাকাউন্টে ঢুকে সব ডাটা এডিট করুন
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="জিমেইল বা দোকানের নাম খুঁজুন..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredEmails.map((email) => {
                      const regUser = registry.approvedUsers.find(
                        (u) => u.email.toLowerCase() === email
                      );
                      const snap = combinedUsersMap[email];
                      const docId = getFirestoreDocId(email);
                      const localAcc = localAccountsMap[docId];
                      const accessPass =
                        regUser?.passcode || registry.masterActivationCode || 'rabbysir';
                      const loginPass =
                        snap?.authPassword ||
                        localAcc?.password ||
                        regUser?.authPassword ||
                        regUser?.passcode ||
                        'rabbysir';
                      const isCurrentActive = activeUserEmail.toLowerCase() === email;
                      const isBlocked = regUser?.status === 'blocked' || !!snap?.isBlocked;
                      const isPassVisible = !!showPasswords[email];

                      const summary = snap
                        ? calculateShopFinancialSummary(
                            snap.products || [],
                            snap.sales || [],
                            snap.customers || [],
                            snap.expenses || [],
                            snap.shopProfile.workingCapital || 0,
                            todayISO,
                            snap.extraIncomes || []
                          )
                        : null;

                      return (
                        <div
                          key={email}
                          className={`rounded-3xl border p-4 transition ${
                            isBlocked
                              ? 'border-rose-300 bg-rose-50/50'
                              : isCurrentActive
                              ? 'border-emerald-500/60 bg-emerald-50/40 shadow-xs'
                              : 'border-slate-200/90 bg-slate-50/60 hover:bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-extrabold text-slate-900">
                                  {snap?.shopProfile.shopName || regUser?.shopName || 'দোকান প্রোফাইল'}
                                </span>
                                {isCurrentActive && (
                                  <span className="rounded-full bg-gold-metallic px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                                    বর্তমান লগইন
                                  </span>
                                )}
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                    isBlocked
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {isBlocked ? 'ব্লকড (Blocked)' : 'সচল (Approved)'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 num-clear">
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                                  <Mail className="h-3.5 w-3.5" />
                                  {email}
                                </span>
                                <span>
                                  মালিক:{' '}
                                  <strong className="text-slate-900">
                                    {snap?.shopProfile.ownerName || regUser?.ownerName || '—'}
                                  </strong>
                                </span>
                                {(snap?.shopProfile.phone || regUser?.phone) && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-emerald-600" />
                                    {snap?.shopProfile.phone || regUser?.phone}
                                  </span>
                                )}
                                {(snap?.shopProfile.address || regUser?.address) && (
                                  <span className="inline-flex items-center gap-1 text-slate-500">
                                    <MapPin className="h-3 w-3" />
                                    {snap?.shopProfile.address || regUser?.address}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px]">
                                  <KeyRound className="h-3 w-3 text-amber-700" />
                                  <span className="text-slate-600">অ্যাক্সেস পাস:</span>
                                  <span className="num-clear font-extrabold text-amber-900">
                                    {isPassVisible ? accessPass : '••••••••'}
                                  </span>
                                </div>

                                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px]">
                                  <Lock className="h-3 w-3 text-emerald-700" />
                                  <span className="text-slate-600">লগইন পাসওয়ার্ড:</span>
                                  <span className="num-clear font-extrabold text-emerald-900">
                                    {isPassVisible ? loginPass : '••••••••'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleShowPassword(email)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  {isPassVisible ? (
                                    <>
                                      <EyeOff className="h-3 w-3" /> লুকান
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3 w-3" /> পাসওয়ার্ড দেখুন
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => copyText(email, `${email} | Pass: ${loginPass}`)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  {copiedId === email ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-600" /> কপি হয়েছে
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" /> কপি
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openUserInEditor(email)}
                                className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>হিসাব ও ডাটা এডিট</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onSwitchActiveAccountFromDev(email)}
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-800 px-3 py-1.5 text-xs font-extrabold text-white hover:opacity-95 transition cursor-pointer"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                <span>অ্যাকাউন্টে ঢুকুন</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleBlockUser(email)}
                                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                  isBlocked
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" /> আনব্লক
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3.5 w-3.5" /> ব্লক
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteApprovedUser(email, true)}
                                aria-label="ইউজার ডিলিট করুন"
                                title="ইউজার ও তার ক্লাউড ডাটা ডিলিট করুন"
                                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {summary && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-slate-200/80 pt-2.5 text-[11px]">
                              <div className="rounded-xl bg-white border border-slate-200/70 px-2.5 py-1.5">
                                <span className="text-slate-500 block">স্টক পণ্য</span>
                                <span className="num-clear font-extrabold text-slate-900">
                                  {snap?.products.length || 0} আইটেম ({formatBDT(summary.totalInventoryCostValue)})
                                </span>
                              </div>
                              <div className="rounded-xl bg-white border border-slate-200/70 px-2.5 py-1.5">
                                <span className="text-slate-500 block">মোট বিক্রি</span>
                                <span className="num-clear font-extrabold text-emerald-700">
                                  {formatBDT(summary.totalRevenue)} ({snap?.sales.length || 0} মেমো)
                                </span>
                              </div>
                              <div className="rounded-xl bg-white border border-slate-200/70 px-2.5 py-1.5">
                                <span className="text-slate-500 block">মোট খরচ</span>
                                <span className="num-clear font-extrabold text-rose-600">
                                  {formatBDT(summary.totalExpenses)}
                                </span>
                              </div>
                              <div className="rounded-xl bg-white border border-slate-200/70 px-2.5 py-1.5">
                                <span className="text-slate-500 block">হাতে নগদ</span>
                                <span className="num-clear font-extrabold text-amber-700">
                                  {formatBDT(summary.currentCashInHand)}
                                </span>
                              </div>
                              <div className="rounded-xl bg-white border border-slate-200/70 px-2.5 py-1.5">
                                <span className="text-slate-500 block">নিট মুনাফা</span>
                                <span className="num-clear font-extrabold text-emerald-800">
                                  {formatBDT(summary.netProfit)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIREBASE USERS */}
          {activeTab === 'firebase_users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <form
                onSubmit={handleCreateFirebaseUserDirect}
                className="lg:col-span-4 card-luxury p-5 space-y-4 self-start"
              >
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/70 shadow-2xs">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      ফায়ারবেস ক্লাউডে সরাসরি ইউজার তৈরি করুন
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      সরাসরি ফায়ারবেস ডাটাবেসে ইমেইল, পাসওয়ার্ড ও শপ অ্যাকাউন্ট তৈরি হবে
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ফায়ারবেস ইমেইল (User Email) *
                    </label>
                    <input
                      type="email"
                      required
                      value={fbEmail}
                      onChange={(e) => setFbEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ফায়ারবেস লগইন পাসওয়ার্ড (Password) *
                    </label>
                    <input
                      type="text"
                      required
                      value={fbPassword}
                      onChange={(e) => setFbPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন"
                      className="num-clear w-full rounded-2xl border border-emerald-300 bg-emerald-50/50 px-3.5 py-2.5 font-extrabold text-emerald-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      দোকানের নাম (Shop Name)
                    </label>
                    <input
                      type="text"
                      value={fbShopName}
                      onChange={(e) => setFbShopName(e.target.value)}
                      placeholder="দোকানের নাম"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">মালিকের নাম</label>
                      <input
                        type="text"
                        value={fbOwnerName}
                        onChange={(e) => setFbOwnerName(e.target.value)}
                        placeholder="মালিকের নাম"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                      <input
                        type="text"
                        value={fbPhone}
                        onChange={(e) => setFbPhone(e.target.value)}
                        placeholder="018..."
                        className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ঠিকানা</label>
                      <input
                        type="text"
                        value={fbAddress}
                        onChange={(e) => setFbAddress(e.target.value)}
                        placeholder="সীতাকুণ্ড, চট্টগ্রাম"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">প্রাথমিক পুঁজি (৳)</label>
                      <input
                        type="number"
                        min={0}
                        value={fbCapital}
                        onChange={(e) => setFbCapital(e.target.value)}
                        className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 py-3 px-4 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>ফায়ারবেসে ইউজার তৈরি ও সিঙ্ক করুন</span>
                  </button>
                </div>
              </form>

              <div className="lg:col-span-8 space-y-4">
                <div className="card-luxury p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        ফায়ারবেস ক্লাউড ইউজার কন্ট্রোল ({allEmailsList.length} জন)
                      </h2>
                      <p className="text-xs text-slate-500">
                        ফায়ারবেস ডাটাবেসে থাকা সকল ইউজারের ইমেইল, পাসওয়ার্ড, ডকুমেন্ট আইডি, ডাটা কাউন্ট এবং সরাসরি লগইন/ব্লক/ডিলিট কন্ট্রোল
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onRefreshCloudUsers}
                      disabled={isLoadingCloudUsers}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 text-xs font-extrabold text-emerald-800 transition cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCloudUsers ? 'animate-spin' : ''}`} />
                      <span>ফায়ারবেস সিঙ্ক</span>
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {allEmailsList.map((email) => {
                      const snap = combinedUsersMap[email];
                      const isSyncedInCloud = !!cloudUsersMap[email];
                      const regUser = registry.approvedUsers.find(
                        (u) => u.email.toLowerCase() === email
                      );
                      const isBlocked = regUser?.status === 'blocked' || !!snap?.isBlocked;
                      getFirestoreDocId(activeUserEmail);
                      const docId = getFirestoreDocId(email);
                      const password =
                        snap?.authPassword ||
                        localAccountsMap[docId]?.password ||
                        regUser?.authPassword ||
                        regUser?.passcode ||
                        'rabbysir';
                      const passKey = `fb_${email}`;
                      const isPassShown = !!showPasswords[passKey];

                      const summary = snap
                        ? calculateShopFinancialSummary(
                            snap.products || [],
                            snap.sales || [],
                            snap.customers || [],
                            snap.expenses || [],
                            snap.shopProfile?.workingCapital || 0,
                            todayISO,
                            snap.extraIncomes || []
                          )
                        : null;

                      return (
                        <div
                          key={email}
                          className={`rounded-3xl border p-4 sm:p-5 transition space-y-3.5 ${
                            isBlocked
                              ? 'border-rose-300 bg-rose-50/40'
                              : 'border-slate-200/90 bg-slate-50/60 hover:bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                    isSyncedInCloud
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  {isSyncedInCloud ? 'FIREBASE CLOUD SYNCED' : 'LOCAL + CLOUD READY'}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                    isBlocked
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                </span>
                                <span className="num-clear rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] font-mono text-slate-600">
                                  Doc ID: users/{docId}
                                </span>
                              </div>

                              <h3 className="text-base font-extrabold text-slate-900 truncate">
                                {snap?.shopProfile.shopName || regUser?.shopName || 'ফায়ারবেস শপ অ্যাকাউন্ট'}
                              </h3>

                              <div className="rounded-2xl border border-slate-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs num-clear">
                                <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/80">
                                  <div className="min-w-0">
                                    <div className="text-[10px] text-slate-500">
                                      ফায়ারবেস ইমেইল (Email)
                                    </div>
                                    <div className="font-extrabold text-emerald-800 truncate">
                                      {email}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyText(`email_${email}`, email)}
                                    className="text-slate-400 hover:text-slate-800 shrink-0 cursor-pointer"
                                    title="ইমেইল কপি করুন"
                                  >
                                    {copiedId === `email_${email}` ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/80">
                                  <div className="min-w-0">
                                    <div className="text-[10px] text-slate-500">
                                      ফায়ারবেস পাসওয়ার্ড (Password)
                                    </div>
                                    <div className="font-extrabold text-amber-800 truncate">
                                      {isPassShown ? password : '••••••••'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleShowPassword(passKey)}
                                      className="text-slate-500 hover:text-slate-900 cursor-pointer"
                                      title="পাসওয়ার্ড দেখুন"
                                    >
                                      {isPassShown ? (
                                        <EyeOff className="h-3.5 w-3.5" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => copyText(passKey, password)}
                                      className="text-slate-500 hover:text-emerald-700 cursor-pointer"
                                      title="পাসওয়ার্ড কপি করুন"
                                    >
                                      {copiedId === passKey ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 num-clear pt-1">
                                <span>
                                  মালিক:{' '}
                                  <strong className="text-slate-900">
                                    {snap?.shopProfile.ownerName || regUser?.ownerName || '—'}
                                  </strong>
                                </span>
                                <span>
                                  • ফোন:{' '}
                                  <strong className="text-slate-900">
                                    {snap?.shopProfile.phone || regUser?.phone || '—'}
                                  </strong>
                                </span>
                                <span>
                                  • ঠিকানা:{' '}
                                  <strong className="text-slate-700">
                                    {snap?.shopProfile.address || regUser?.address || '—'}
                                  </strong>
                                </span>
                                <span>
                                  • প্রাইস কোড:{' '}
                                  <strong className="text-amber-800">
                                    {snap?.shopProfile.priceCodeKey || 'XBANGLDESH'}
                                  </strong>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] num-clear">
                                <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                  পণ্য: <strong>{snap?.products.length || 0}</strong>
                                </span>
                                <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                  বিক্রয় মেমো: <strong>{snap?.sales.length || 0}</strong>
                                </span>
                                <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                  কাস্টমার: <strong>{snap?.customers.length || 0}</strong>
                                </span>
                                <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                  খরচ এন্ট্রি: <strong>{snap?.expenses.length || 0}</strong>
                                </span>
                                <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                  এক্সট্রা ইনকাম: <strong>{snap?.extraIncomes.length || 0}</strong>
                                </span>
                                <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                  স্টাফ: <strong>{snap?.staff.length || 0}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onSwitchActiveAccountFromDev(email)}
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-800 hover:opacity-95 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition cursor-pointer"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                <span>অ্যাকাউন্টে ঢুকুন</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openUserInEditor(email)}
                                className="inline-flex items-center gap-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 text-xs font-extrabold text-amber-900 transition cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>পাসওয়ার্ড ও ডাটা এডিট</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleBlockUser(email)}
                                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                                  isBlocked
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                    : 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>আনব্লক</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>ব্লক</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteApprovedUser(email, true)}
                                aria-label="ফায়ারবেস থেকে ইউজার ডিলিট করুন"
                                title="ফায়ারবেস ক্লাউড থেকে ইউজার ডিলিট করুন"
                                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 text-xs font-extrabold text-rose-700 border border-rose-200 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>ফায়ারবেস ডিলিট</span>
                              </button>
                            </div>
                          </div>

                          {summary && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
                              <div className="rounded-2xl bg-white p-2.5 border border-slate-200/70">
                                <div className="text-[10px] text-slate-500">মোট বিক্রি</div>
                                <div className="num-clear font-extrabold text-emerald-700 mt-0.5">
                                  {formatBDT(summary.totalRevenue)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white p-2.5 border border-slate-200/70">
                                <div className="text-[10px] text-slate-500">
                                  স্টক ভ্যালু ({summary.totalInventoryUnits} পিস)
                                </div>
                                <div className="num-clear font-extrabold text-slate-900 mt-0.5">
                                  {formatBDT(summary.totalInventoryCostValue)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white p-2.5 border border-slate-200/70">
                                <div className="text-[10px] text-slate-500">হাতে নগদ</div>
                                <div className="num-clear font-extrabold text-amber-700 mt-0.5">
                                  {formatBDT(summary.currentCashInHand)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white p-2.5 border border-slate-200/70">
                                <div className="text-[10px] text-slate-500">নিট মুনাফা</div>
                                <div className="num-clear font-extrabold text-emerald-800 mt-0.5">
                                  {formatBDT(summary.netProfit)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white p-2.5 border border-slate-200/70">
                                <div className="text-[10px] text-slate-500">বকেয়া পাওনা</div>
                                <div className="num-clear font-extrabold text-rose-600 mt-0.5">
                                  {formatBDT(summary.totalReceivableDue)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER DATA EDITOR */}
          {activeTab === 'user_editor' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 card-luxury p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-extrabold text-emerald-900">
                    ইউজারের অ্যাকাউন্ট নির্বাচন করুন:
                  </span>
                  <select
                    value={selectedUserEmail}
                    onChange={(e) => openUserInEditor(e.target.value)}
                    className="num-clear rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  >
                    {allEmailsList.map((email) => (
                      <option key={email} value={email}>
                        {email} ({combinedUsersMap[email]?.shopProfile.shopName || 'দোকান'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSwitchActiveAccountFromDev(selectedUserEmail)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-800 px-4 py-2 text-xs font-extrabold text-white hover:opacity-95 transition cursor-pointer shadow-xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>এই অ্যাকাউন্টে সরাসরি লগইন করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWipeUserAccountData(selectedUserEmail)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>সকল হিসাব জিরো (Reset) করুন</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <form
                  onSubmit={handleSaveSelectedUserProfileAndPass}
                  className="lg:col-span-5 card-luxury p-5 space-y-4 self-start"
                >
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Store className="h-4 w-4 text-emerald-700" />
                    <span>শপ প্রোফাইল, পুঁজি ও পাসওয়ার্ড পরিবর্তন ({selectedUserEmail})</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">দোকানের নাম</label>
                      <input
                        type="text"
                        value={editShopName}
                        onChange={(e) => setEditShopName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">মালিকের নাম</label>
                        <input
                          type="text"
                          value={editOwnerName}
                          onChange={(e) => setEditOwnerName(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ঠিকানা</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-amber-800 mb-1">
                          দোকানের পুঁজি / ক্যাশ (৳)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editWorkingCapital}
                          onChange={(e) => setEditWorkingCapital(e.target.value)}
                          className="num-clear w-full rounded-2xl border border-amber-300 bg-amber-50/50 px-3 py-2 font-extrabold text-amber-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-amber-800 mb-1">
                          ১০-অক্ষরের গোপন কোড
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={editPriceCode}
                          onChange={(e) => setEditPriceCode(e.target.value.toUpperCase())}
                          className="num-clear w-full rounded-2xl border border-amber-300 bg-amber-50/50 px-3 py-2 font-extrabold text-amber-900 uppercase focus:border-amber-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block font-bold text-emerald-800 mb-1">
                          অ্যাপ অ্যাক্সেস পাসওয়ার্ড
                        </label>
                        <input
                          type="text"
                          value={editUserPasscode}
                          onChange={(e) => setEditUserPasscode(e.target.value)}
                          className="num-clear w-full rounded-2xl border border-emerald-300 bg-emerald-50/50 px-3 py-2 font-extrabold text-emerald-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-emerald-800 mb-1">
                          ইমেইল লগইন পাসওয়ার্ড
                        </label>
                        <input
                          type="text"
                          value={editUserAuthPassword}
                          onChange={(e) => setEditUserAuthPassword(e.target.value)}
                          className="num-clear w-full rounded-2xl border border-emerald-300 bg-emerald-50/50 px-3 py-2 font-extrabold text-emerald-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 py-3 px-4 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>ইউজারের প্রোফাইল ও পাসওয়ার্ড সেভ করুন</span>
                    </button>
                  </div>
                </form>

                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card-luxury p-3.5">
                      <span className="text-[11px] text-slate-500">স্টক ভ্যালু (কেনা)</span>
                      <div className="num-clear text-sm font-extrabold text-slate-900 mt-0.5">
                        {formatBDT(selectedUserSummary.totalInventoryCostValue)}
                      </div>
                    </div>
                    <div className="card-luxury p-3.5">
                      <span className="text-[11px] text-slate-500">মোট বিক্রি</span>
                      <div className="num-clear text-sm font-extrabold text-emerald-700 mt-0.5">
                        {formatBDT(selectedUserSummary.totalRevenue)}
                      </div>
                    </div>
                    <div className="card-luxury p-3.5">
                      <span className="text-[11px] text-slate-500">হাতে নগদ</span>
                      <div className="num-clear text-sm font-extrabold text-amber-700 mt-0.5">
                        {formatBDT(selectedUserSummary.currentCashInHand)}
                      </div>
                    </div>
                    <div className="card-luxury p-3.5">
                      <span className="text-[11px] text-slate-500">নিট মুনাফা</span>
                      <div className="num-clear text-sm font-extrabold text-emerald-800 mt-0.5">
                        {formatBDT(selectedUserSummary.netProfit)}
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={handleAddProductToSelectedUser}
                    className="card-luxury p-4 space-y-3"
                  >
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-emerald-700" />
                      <span>এই ইউজারের স্টকে সরাসরি নতুন পণ্য যোগ করুন</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <input
                        type="text"
                        required
                        value={devProdName}
                        onChange={(e) => setDevProdName(e.target.value)}
                        placeholder="পণ্যের নাম"
                        className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                      <input
                        type="number"
                        required
                        value={devProdBuyPrice}
                        onChange={(e) => setDevProdBuyPrice(e.target.value)}
                        placeholder="কেনা দাম"
                        className="num-clear rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                      <input
                        type="number"
                        required
                        value={devProdSellPrice}
                        onChange={(e) => setDevProdSellPrice(e.target.value)}
                        placeholder="বিক্রয় দাম"
                        className="num-clear rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-800 px-3 py-2 font-extrabold text-white hover:opacity-95 cursor-pointer"
                      >
                        + স্টক যোগ
                      </button>
                    </div>
                  </form>

                  <div className="card-luxury p-4 space-y-2.5">
                    <h4 className="text-xs font-extrabold text-slate-900">
                      ইউজারের স্টক পণ্য তালিকা ({selectedSnapshot.products.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {selectedSnapshot.products.length === 0 ? (
                        <p className="text-xs text-slate-500">কোনো পণ্য নেই।</p>
                      ) : (
                        selectedSnapshot.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{prod.name}</span>
                              <span className="num-clear text-slate-600 ml-2">
                                কেনা: {formatBDT(prod.buyPrice)} • বিক্রয়: {formatBDT(prod.sellPrice)} • স্টক: {prod.stock} পিস
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteItemFromSelectedUser('product', prod.id)}
                              className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card-luxury p-4 space-y-2.5">
                      <h4 className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5" />
                        <span>বিক্রয় মেমো ({selectedSnapshot.sales.length})</span>
                      </h4>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {selectedSnapshot.sales.length === 0 ? (
                          <p className="text-xs text-slate-500">কোনো বিক্রয় রেকর্ড নেই।</p>
                        ) : (
                          selectedSnapshot.sales.map((sale: SaleRecord) => (
                            <div
                              key={sale.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-[11px]"
                            >
                              <div className="truncate">
                                <span className="font-bold text-slate-900">{sale.invoiceNo}</span> •{' '}
                                <span className="num-clear text-emerald-700 font-bold">
                                  {formatBDT(sale.grandTotal)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteItemFromSelectedUser('sale', sale.id)}
                                className="text-rose-600 hover:text-rose-700 shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="card-luxury p-4 space-y-2.5">
                      <h4 className="text-xs font-extrabold text-rose-700 flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" />
                        <span>খরচ তালিকা ({selectedSnapshot.expenses.length})</span>
                      </h4>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {selectedSnapshot.expenses.length === 0 ? (
                          <p className="text-xs text-slate-500">কোনো খরচ রেকর্ড নেই।</p>
                        ) : (
                          selectedSnapshot.expenses.map((exp: ExpenseRecord) => (
                            <div
                              key={exp.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-[11px]"
                            >
                              <div className="truncate">
                                <span className="font-bold text-slate-900">{exp.title}</span> •{' '}
                                <span className="num-clear text-rose-600 font-bold">
                                  {formatBDT(exp.amount)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteItemFromSelectedUser('expense', exp.id)}
                                className="text-rose-600 hover:text-rose-700 shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & MASTER PASSWORD */}
          {activeTab === 'security' && (
            <div className="max-w-2xl mx-auto card-luxury p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    মাস্টার অ্যাক্টিভেশন পাসওয়ার্ড ও সিকিউরিটি গেট
                  </h2>
                  <p className="text-xs text-slate-500">
                    নতুন ব্যবহারকারীরা প্রথমবার অ্যাপে ঢুকতে কোন পাসওয়ার্ড ব্যবহার করবে তা নিয়ন্ত্রণ করুন
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveMasterSecurity} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-extrabold text-amber-900 mb-1.5">
                      মাস্টার অ্যাপ অ্যাক্টিভেশন পাসওয়ার্ড (User Access Code)
                    </label>
                    <input
                      type="text"
                      required
                      value={masterCodeInput}
                      onChange={(e) => setMasterCodeInput(e.target.value)}
                      placeholder="rabbysir"
                      className="num-clear w-full rounded-2xl border border-amber-300 bg-amber-50/50 px-4 py-3 text-base font-extrabold text-amber-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      ডিফল্ট মাস্টার পাসওয়ার্ড: <strong className="text-slate-900">rabbysir</strong> (যেকোনো ইউজার এই কোড বা তার নিজস্ব কোড দিয়ে প্রথমবার ভেরিফাই করতে পারবে)
                    </p>
                  </div>

                  <div>
                    <label className="block font-extrabold text-emerald-900 mb-1.5">
                      অ্যাডমিন ও ডেভেলপার মাস্টার পাসওয়ার্ড (Admin Password)
                    </label>
                    <input
                      type="text"
                      required
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="rabbysir"
                      className="num-clear w-full rounded-2xl border border-emerald-300 bg-emerald-50/50 px-4 py-3 text-base font-extrabold text-emerald-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      অ্যাডমিন অ্যাপ (`Dookanify Admin APK`) ও ডেভেলপার প্যানেলে ঢোকার পাসওয়ার্ড (ডিফল্ট: <strong className="text-slate-900">rabbysir</strong>)
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gateEnabled}
                    onChange={(e) => setGateEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-emerald-700"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">
                      প্রথমবার প্রবেশে পাসওয়ার্ড ভেরিফিকেশন গেট চালু রাখুন (Recommended)
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      চালু থাকলে প্রথমবার অ্যাপ ওপেন করলে পাসওয়ার্ড ছাড়া কেউ ভেতরে ঢুকতে পারবে না। একবার সঠিক পাসওয়ার্ড দিলে সেই ফোনে চিরস্থায়ীভাবে আনলক থাকবে।
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strictGmailMode}
                    onChange={(e) => setStrictGmailMode(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-emerald-700"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">
                      শুধুমাত্র আপনার অ্যাপ্রুভ করা জিমেইল ছাড়া অন্য কেউ ঢুকতে পারবে না (Strict Whitelist Mode)
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      চালু করলে আপনি যে জিমেইলগুলো অ্যাপ্রুভ লিস্টে যুক্ত করেছেন শুধুমাত্র তারাই অ্যাপে ঢুকতে পারবে।
                    </span>
                  </div>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResetDeviceActivation(true)}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>এই ডিভাইস পুনরায় লক করুন (Test Gate)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetDeviceActivation(false)}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>এই ডিভাইস আনলক করুন</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 px-5 py-3 text-xs font-extrabold text-white shadow-md hover:opacity-95 cursor-pointer"
                  >
                    সিকিউরিটি সেটিংস সেভ করুন
                  </button>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 text-[11px] text-slate-600 border border-slate-200">
                  বর্তমান ডিভাইস স্ট্যাটাস:{' '}
                  <strong className="text-emerald-800">
                    {isDeviceActivated()
                      ? `ভেরিফাইড (Unlocked — ${getActivatedUserEmail() || 'Active'})`
                      : 'লকড (পাসওয়ার্ড লাগবে)'}
                  </strong>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: DEVELOPER PROFILE */}
          {activeTab === 'developer_profile' && (
            <form
              onSubmit={handleSaveDeveloperProfile}
              className="max-w-3xl mx-auto card-luxury p-6 space-y-4 text-xs"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    ডেভেলপার পরিচিতি ও পোর্টফোলিও কাস্টমাইজেশন
                  </h2>
                  <p className="text-xs text-slate-500">
                    এখানে যা লিখবেন অ্যাপের &quot;ডেভেলপার পরিচিতি&quot; পপআপে সাথে সাথে তাই দেখাবে
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ডেভেলপারের নাম</label>
                  <input
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পদবী / Title</label>
                  <input
                    type="text"
                    value={devTitle}
                    onChange={(e) => setDevTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ট্যাগলাইন (Tagline)</label>
                <input
                  type="text"
                  value={devTagline}
                  onChange={(e) => setDevTagline(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সংক্ষিপ্ত পরিচিতি (Bio)</label>
                <textarea
                  rows={3}
                  value={devBio}
                  onChange={(e) => setDevBio(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={devPhone}
                    onChange={(e) => setDevPhone(e.target.value)}
                    className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp নম্বর (880 সহ)</label>
                  <input
                    type="text"
                    value={devWhatsapp}
                    onChange={(e) => setDevWhatsapp(e.target.value)}
                    className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ইমেইল অ্যাড্রেস</label>
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    className="num-clear w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ঠিকানা / Location</label>
                  <input
                    type="text"
                    value={devLocation}
                    onChange={(e) => setDevLocation(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    দক্ষতা ও টেকনোলজি (প্রতি লাইনে একটি)
                  </label>
                  <textarea
                    rows={5}
                    value={devSkillsText}
                    onChange={(e) => setDevSkillsText(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    সার্ভিসসমূহ (প্রতি লাইনে একটি)
                  </label>
                  <textarea
                    rows={5}
                    value={devServicesText}
                    onChange={(e) => setDevServicesText(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 py-3 px-4 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>ডেভেলপার প্রোফাইল সেভ ও পাবলিশ করুন</span>
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Floating Bottom Taskbar / Navigation Dock — 100% Identical to Main App */}
      <nav
        aria-label="অ্যাডমিন নেভিগেশন"
        className="fixed bottom-2.5 sm:bottom-3.5 inset-x-0 z-30 px-2.5 sm:px-4 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-xl mx-auto rounded-[28px] bg-white/95 border border-slate-200/90 shadow-[0_14px_40px_rgba(5,46,30,0.16),0_2px_10px_rgba(0,0,0,0.06)] p-1.5 grid grid-cols-5 gap-1">
          {[
            { id: 'users' as DevTab, label: 'সকল ইউজার', icon: Users },
            { id: 'firebase_users' as DevTab, label: 'ফায়ারবেস', icon: Flame },
            { id: 'user_editor' as DevTab, label: 'ডাটা এডিটর', icon: Database },
            { id: 'security' as DevTab, label: 'সিকিউরিটি', icon: KeyRound },
            { id: 'developer_profile' as DevTab, label: 'ডেভেলপার', icon: Code2 },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.id === 'user_editor'
                    ? openUserInEditor(selectedUserEmail)
                    : setActiveTab(item.id)
                }
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white font-extrabold shadow-[0_6px_16px_rgba(5,150,105,0.28)]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-semibold'
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isActive ? 'stroke-[2.5] text-amber-300' : 'stroke-[2]'
                  }`}
                />
                <span className="text-[10px] sm:text-[11px] mt-1 leading-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-out Side Drawer — 100% Identical Structure & Styling to Main App's SideDrawer */}
      {isAdminDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity animate-backdrop-fade"
            onClick={() => setIsAdminDrawerOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="অ্যাডমিন নেভিগেশন ড্রয়ার"
            className="relative z-10 flex h-full w-full max-w-sm flex-col justify-between overflow-y-auto bg-white p-4 shadow-xl animate-drawer-slide"
          >
            <div className="space-y-3.5">
              {/* Top Brand Header — Matching SideDrawer.tsx */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <DookanifyLogo size="md" variant="gold-luxury" rounded="2xl" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                        Dookanify
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        Admin Panel
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">
                      মাস্টার অ্যাডমিন ও ক্লাউড কন্ট্রোল
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminDrawerOpen(false)}
                  aria-label="ড্রয়ার বন্ধ করুন"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition active:scale-[0.95] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Royal Forest Silk Admin Card — Matching SideDrawer.tsx Shop Profile Card */}
              <div className="rounded-3xl bg-royal-forest-silk border border-amber-400/35 p-4 text-white shadow-[0_10px_30px_rgba(5,46,30,0.3)] relative overflow-hidden">
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/15 blur-xl" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-xs font-extrabold text-amber-300">
                    মাস্টার অ্যাডমিন প্রোফাইল
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('security');
                      setIsAdminDrawerOpen(false);
                    }}
                    className="rounded-full bg-gold-metallic border border-amber-300/60 px-3 py-1 text-[11px] font-extrabold text-slate-950 shadow-2xs hover:brightness-105 transition active:scale-[0.97] cursor-pointer"
                  >
                    পাসওয়ার্ড সেটিংস
                  </button>
                </div>

                <h3 className="mt-1 text-base font-extrabold leading-snug text-white relative z-10">
                  অ্যাডমিন ও ইউজার অ্যাক্সেস কন্ট্রোল
                </h3>

                <div className="mt-2 space-y-1 text-xs text-emerald-50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                    <span>
                      কন্ট্রোলার:{' '}
                      <strong className="font-bold text-white">তন্ময় নাথ (Master Admin)</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                    <span>সীতাকুণ্ড, চট্টগ্রাম</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                    <span>
                      রেজিস্টার্ড শপ:{' '}
                      <strong className="num-clear font-bold text-white">
                        {allEmailsList.length}টি দোকান
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/15 px-3 py-1.5 text-xs">
                  <span className="text-emerald-100">মাস্টার অ্যাক্টিভেশন কোড:</span>
                  <span className="num-clear font-bold tracking-widest text-amber-300">
                    {registry.masterActivationCode || 'rabbysir'}
                  </span>
                </div>
              </div>

              {/* Menu List — Matching SideDrawer.tsx .card-interactive rounded-3xl items */}
              <div className="space-y-1.5">
                {[
                  {
                    id: 'users' as DevTab,
                    label: 'সকল দোকান ইউজার ও পাসওয়ার্ড',
                    sub: `মোট ${allEmailsList.length} জন রেজিস্টার্ড শপ অ্যাকাউন্ট`,
                    icon: Users,
                    iconBox: 'bg-emerald-50 text-emerald-600',
                  },
                  {
                    id: 'firebase_users' as DevTab,
                    label: 'ফায়ারবেস ক্লাউড ইউজার কন্ট্রোল',
                    sub: `${Object.keys(cloudUsersMap).length} জন ক্লাউড ডাটাবেসে সিঙ্কড`,
                    icon: Flame,
                    iconBox: 'bg-teal-50 text-teal-700',
                  },
                  {
                    id: 'user_editor' as DevTab,
                    label: 'ইউজার ডাটা ও হিসাব এডিটর',
                    sub: `নির্বাচিত শপ: ${selectedUserEmail}`,
                    icon: Database,
                    iconBox: 'bg-amber-50 text-amber-600',
                  },
                  {
                    id: 'security' as DevTab,
                    label: 'মাস্টার পাসওয়ার্ড ও অ্যাক্সেস গেট',
                    sub: 'অ্যাক্টিভেশন কোড ও হোয়াইটলিস্ট সেটিংস',
                    icon: KeyRound,
                    iconBox: 'bg-indigo-50 text-indigo-600',
                  },
                  {
                    id: 'developer_profile' as DevTab,
                    label: 'ডেভেলপার পরিচিতি এডিট',
                    sub: 'তন্ময় নাথ পোর্টফোলিও তথ্য পরিবর্তন',
                    icon: Code2,
                    iconBox: 'bg-purple-50 text-purple-600',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'user_editor') {
                          openUserInEditor(selectedUserEmail);
                        } else {
                          setActiveTab(item.id);
                        }
                        setIsAdminDrawerOpen(false);
                      }}
                      className={`card-interactive flex w-full items-center justify-between rounded-3xl border p-3 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] cursor-pointer ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50/70'
                          : 'border-slate-200/80 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.iconBox}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {item.label}
                          </div>
                          <div className="text-xs text-slate-500 truncate num-clear">{item.sub}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    onRefreshCloudUsers();
                    setIsAdminDrawerOpen(false);
                  }}
                  className="card-interactive flex w-full items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-3 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-teal-200 hover:bg-teal-50/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">ক্লাউড ডাটা রিফ্রেশ করুন</div>
                      <div className="text-xs text-slate-500">ফায়ারবেস থেকে সর্বশেষ ইউজার লোড</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAdminDrawerOpen(false);
                    onLockAdminApp();
                  }}
                  className="card-interactive flex w-full items-center justify-between rounded-3xl border border-rose-200/80 bg-white p-3 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-rose-800">অ্যাডমিন প্যানেল লক করুন</div>
                      <div className="text-xs text-rose-500">পুনরায় পাসওয়ার্ড গেট সক্রিয় হবে</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-rose-400" />
                </button>
              </div>
            </div>

            {/* Bottom Verified Developer Card — Matching SideDrawer.tsx */}
            <div className="mt-3">
              <div className="rounded-3xl border border-amber-400/40 bg-royal-forest-silk p-4 text-white shadow-[0_10px_30px_rgba(5,46,30,0.32)] relative overflow-hidden">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-xl" />
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    <span>Verified Developer</span>
                  </span>
                  <span className="num-clear text-[11px] font-bold text-emerald-200">
                    হটলাইন: 01869362221
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/60 bg-gold-metallic text-sm font-extrabold text-slate-950 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                    তন্ময়
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-extrabold text-white">
                      <span className="truncate">Developed by তন্ময় নাথ (Tonmoy Nath)</span>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-amber-400" />
                    </div>
                    <div className="truncate text-[11px] text-emerald-200/90 num-clear">
                      সীতাকুণ্ড, চট্টগ্রাম • Full-Stack App Developer
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAdminDrawerOpen(false);
                    onExitDeveloperMode();
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gold-metallic border border-amber-300/60 py-2 text-xs font-extrabold text-slate-950 shadow-sm transition hover:brightness-105 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-slate-950" />
                  <span>মূল শপ অ্যাপে ফিরে যান</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


