import {
  Customer,
  DeveloperAccessRegistry,
  DeveloperProfile,
  Expense,
  ExtraIncome,
  OfflineSyncQueueItem,
  Product,
  Sale,
  ShopProfile,
  StaffMember,
} from '../types/shop';
import {
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_SHOP_PROFILE,
} from '../data/seedData';
import {
  normalizeSecretPriceCodeKey,
  sanitizeEmailForCloudDoc,
  sanitizeSalesList,
} from './shopLogic';

export interface ShopVaultPayload {
  version?: number;
  accountEmail?: string;
  email: string;
  authPassword?: string;
  isDefaultFallback?: boolean;
  updatedAtISO: string;
  lastModifiedAt?: number;
  shopProfile: ShopProfile;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  staff: StaffMember[];
  deletedIds?: Record<string, string>;
}

const KEY_ACTIVE_ACCOUNT_EMAIL = 'dookanify_active_account_email_v3';
const KEY_LOGGED_OUT_STATE = 'dookanify_logged_out_state_v1';
const KEY_LAST_LOGGED_OUT_EMAIL = 'dookanify_last_logged_out_email_v1';
const KEY_MASTER_PREFIX = 'dookanify_master_vault_v3_';
const KEY_BACKUP_PREFIX = 'dookanify_backup_vault_v3_';

const KEY_DEVICE_ACTIVATED = 'dookanify_device_activated_v1';
const KEY_ACTIVATED_GMAIL = 'dookanify_activated_gmail_v1';
const KEY_DEV_REGISTRY = 'dookanify_developer_registry_v1';
const KEY_DEV_MODE_UNLOCKED = 'dookanify_dev_mode_unlocked_v1';
const KEY_STANDALONE_ADMIN_UNLOCKED = 'dookanify_standalone_admin_unlocked_v1';

export const DEFAULT_MASTER_ACTIVATION_CODE = 'rabbysir';
export const DEFAULT_ADMIN_PASSWORD = 'rabbysir';

export const DEFAULT_DEVELOPER_PROFILE: DeveloperProfile = {
  name: 'MD Golam Rabby',
  initials: 'GR',
  title: 'Lead Software Engineer & Full-Stack Developer',
  tagline: 'কাস্টম পস সফটওয়্যার, ওয়েব অ্যাপ্লিকেশন এবং অটোমেশন সলিউশন নির্মাতা',
  bio: 'আমি আপনার ব্যবসা, দোকান বা প্রতিষ্ঠানের জন্য আধুনিক, দ্রুত এবং শতভাগ নিরাপদ ওয়েব ও মোবাইল অ্যাপ্লিকেশন তৈরি করি। যেকোনো নতুন সফটওয়্যার বানানো বা টেকনিক্যাল সাপোর্টের জন্য সরাসরি যোগাযোগ করুন।',
  whatsappDisplay: '01843373523',
  whatsappUrl:
    'https://wa.me/8801843373523?text=%E0%A6%86%E0%A6%B8%E0%A6%B8%E0%A6%BE%E0%A6%B2%E0%A6%BE%E0%A6%AE%E0%A7%81%20%E0%A6%86%E0%A6%B2%E0%A6%BE%E0%A6%87%E0%A6%95%E0%A7%81%E0%A6%AE%20MD%20Golam%20Rabby%20%E0%A6%AD%E0%A6%BE%E0%A6%87,%20%E0%A6%86%E0%A6%AE%E0%A6%BF%20Dookanify%20%E0%A6%85%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AA%20%E0%A6%A5%E0%A7%87%E0%A6%95%E0%A7%87%20%E0%A6%AF%E0%A7%8B%E0%A6%97%E0%A6%BE%E0%A6%AF%E0%A7%8B%E0%A6%97%20%E0%A6%95%E0%A6%B0%E0%A6%9B%E0%A6%BF%E0%A5%A4',
  callUrl: 'tel:+8801843373523',
  email: 'skillwave.pro@gmail.com',
  mailtoUrl:
    'mailto:skillwave.pro@gmail.com?subject=Dookanify%20Software%20Support%20%26%20Inquiry',
  location: 'Sitakunda, Chattogram, Bangladesh',
  skills: [
    'React & TypeScript',
    'Next.js & Node.js',
    'Firebase & Cloud',
    'POS & ERP Systems',
    'Mobile PWA Apps',
    'UI/UX Architecture',
  ],
  services: [
    'দোকান, শোরুম ও সুপারশপের জন্য কাস্টম পস (POS) ও ইনভেন্টরি সফটওয়্যার',
    'ই-কমার্স ওয়েবসাইট, বিজনেস পোর্টফোলিও এবং ড্যাশবোর্ড ডেভেলপমেন্ট',
    'অ্যান্ড্রয়েড/আইওএস পিডব্লিউএ (PWA) এবং ক্লাউড ডাটাবেস ইন্টিগ্রেশন',
  ],
};

export const INITIAL_DEVELOPER_REGISTRY: DeveloperAccessRegistry = {
  masterActivationCode: DEFAULT_MASTER_ACTIVATION_CODE,
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  isAccessGateEnabled: true,
  requireStrictGmailApproval: false,
  developerProfile: DEFAULT_DEVELOPER_PROFILE,
  approvedUsers: [
    {
      email: 'skillwave.pro@gmail.com',
      passcode: DEFAULT_MASTER_ACTIVATION_CODE,
      shopName: 'সোনার বাংলা বস্ত্রালয় অ্যান্ড ফ্যাশন হাউস',
      ownerName: 'রাব্বি',
      status: 'approved',
      addedAtISO: '2025-01-01T00:00:00.000Z',
      updatedAtISO: '2025-01-01T00:00:00.000Z',
    },
  ],
  deletedUserEmails: [],
  updatedAtISO: '2025-01-01T00:00:00.000Z',
};

export const STORAGE_KEYS = {
  PROFILE: 'dookanify_shop_profile_v1',
  PRODUCTS: 'dookanify_products_v1',
  CUSTOMERS: 'dookanify_customers_v1',
  SALES: 'dookanify_sales_v1',
  EXPENSES: 'dookanify_expenses_v1',
  EXTRA_INCOMES: 'dookanify_extra_incomes_v1',
  STAFF: 'dookanify_staff_v1',
  OFFLINE_QUEUE: 'dookanify_offline_sync_queue_v1',
  INSTANT_USER: 'dookanify_instant_gmail_user_v1',
  ACCOUNTS: 'dookanify_email_accounts_v1',
  VAULT_PREFIX: 'dookanify_user_vault_',
};

const IDB_NAME = 'DookanifyPermanentDB';
const IDB_STORE = 'AccountVaults';

function openVaultIDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveToIDB(
  key: string,
  payload: ShopVaultPayload
): Promise<void> {
  const db = await openVaultIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(payload, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadFromIDB(
  key: string
): Promise<ShopVaultPayload | null> {
  const db = await openVaultIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as ShopVaultPayload) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteFromIDB(key: string): Promise<void> {
  const db = await openVaultIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeLoadJSON<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const parsed = safeJsonParse<T>(localStorage.getItem(key));
  return parsed !== null ? parsed : fallback;
}

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export function normalizeVaultPayload(
  raw: unknown,
  fallbackEmail: string
): ShopVaultPayload {
  const cleanEmail = (fallbackEmail || 'skillwave.pro@gmail.com')
    .trim()
    .toLowerCase();
  const docId = sanitizeEmailForCloudDoc(cleanEmail);

  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawProfile =
    obj.shopProfile && typeof obj.shopProfile === 'object'
      ? (obj.shopProfile as Partial<ShopProfile>)
      : {};

  const shopProfile: ShopProfile = {
    ...INITIAL_SHOP_PROFILE,
    ...rawProfile,
    ownerId: rawProfile.ownerId || docId,
    ownerEmail: cleanEmail,
    shopName:
      typeof rawProfile.shopName === 'string' && rawProfile.shopName.trim()
        ? rawProfile.shopName.trim()
        : INITIAL_SHOP_PROFILE.shopName,
    ownerName:
      typeof rawProfile.ownerName === 'string' && rawProfile.ownerName.trim()
        ? rawProfile.ownerName.trim()
        : INITIAL_SHOP_PROFILE.ownerName,
    phone:
      typeof rawProfile.phone === 'string' && rawProfile.phone.trim()
        ? rawProfile.phone.trim()
        : INITIAL_SHOP_PROFILE.phone,
    address:
      typeof rawProfile.address === 'string' && rawProfile.address.trim()
        ? rawProfile.address.trim()
        : INITIAL_SHOP_PROFILE.address,
    workingCapital:
      typeof rawProfile.workingCapital === 'number' &&
      Number.isFinite(rawProfile.workingCapital)
        ? Math.max(0, Math.round(rawProfile.workingCapital))
        : INITIAL_SHOP_PROFILE.workingCapital,
    priceCodeKey: normalizeSecretPriceCodeKey(rawProfile.priceCodeKey),
    ...(Array.isArray(rawProfile.customCategories) &&
    rawProfile.customCategories.length > 0
      ? {
          customCategories: Array.from(
            new Set(
              rawProfile.customCategories
                .filter((c): c is string => typeof c === 'string' && Boolean(c.trim()))
                .map((c) => c.trim())
            )
          ),
        }
      : {}),
    ...(Array.isArray(rawProfile.customSizes) &&
    rawProfile.customSizes.length > 0
      ? {
          customSizes: Array.from(
            new Set(
              rawProfile.customSizes
                .filter((s): s is string => typeof s === 'string' && Boolean(s.trim()))
                .map((s) => s.trim())
            )
          ),
        }
      : {}),
    ...(rawProfile.isProfileCustomized !== undefined
      ? { isProfileCustomized: Boolean(rawProfile.isProfileCustomized) }
      : {}),
    ...(typeof rawProfile.profileUpdatedAt === 'number'
      ? { profileUpdatedAt: rawProfile.profileUpdatedAt }
      : {}),
  };

  const products = Array.isArray(obj.products)
    ? (obj.products as Product[])
    : INITIAL_PRODUCTS;
  const customers = Array.isArray(obj.customers)
    ? (obj.customers as Customer[])
    : INITIAL_CUSTOMERS;
  const sales = Array.isArray(obj.sales)
    ? sanitizeSalesList(obj.sales as Sale[])
    : INITIAL_SALES;
  const expenses = Array.isArray(obj.expenses)
    ? (obj.expenses as Expense[])
    : INITIAL_EXPENSES;
  const extraIncomes = Array.isArray(obj.extraIncomes)
    ? (obj.extraIncomes as ExtraIncome[])
    : [];
  const staff = Array.isArray(obj.staff) ? (obj.staff as StaffMember[]) : [];
  const deletedIds =
    obj.deletedIds && typeof obj.deletedIds === 'object'
      ? (obj.deletedIds as Record<string, string>)
      : {};

  let resolvedTsMs =
    typeof obj.lastModifiedAt === 'number' && obj.lastModifiedAt > 0
      ? obj.lastModifiedAt
      : 0;
  if (!resolvedTsMs && typeof obj.updatedAtISO === 'string') {
    const p = Date.parse(obj.updatedAtISO);
    if (!isNaN(p) && p > 0) resolvedTsMs = p;
  }
  if (!resolvedTsMs && obj.updatedAt && typeof obj.updatedAt === 'object') {
    const fsTs = obj.updatedAt as { seconds?: number; toMillis?: () => number };
    if (typeof fsTs.toMillis === 'function') {
      resolvedTsMs = fsTs.toMillis();
    } else if (typeof fsTs.seconds === 'number') {
      resolvedTsMs = fsTs.seconds * 1000;
    }
  }

  return {
    version: 5,
    accountEmail: cleanEmail,
    email: cleanEmail,
    ...(typeof obj.authPassword === 'string' && obj.authPassword
      ? { authPassword: obj.authPassword }
      : {}),
    ...(obj.isDefaultFallback ? { isDefaultFallback: true } : {}),
    updatedAtISO:
      typeof obj.updatedAtISO === 'string' && obj.updatedAtISO
        ? obj.updatedAtISO
        : resolvedTsMs > 0
        ? new Date(resolvedTsMs).toISOString()
        : new Date().toISOString(),
    lastModifiedAt: resolvedTsMs,
    shopProfile,
    products,
    customers,
    sales,
    expenses,
    extraIncomes,
    staff,
    deletedIds,
  };
}

export function getPayloadTimestampMs(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const obj = raw as Record<string, unknown>;
  if (Boolean(obj.isDefaultFallback)) return 0;

  if (typeof obj.lastModifiedAt === 'number' && obj.lastModifiedAt > 0) {
    return obj.lastModifiedAt;
  }
  if (typeof obj.updatedAtISO === 'string' && obj.updatedAtISO) {
    const parsed = Date.parse(obj.updatedAtISO);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const updatedAt = obj.updatedAt as
    | { seconds?: number; toMillis?: () => number }
    | undefined;
  if (updatedAt && typeof updatedAt === 'object') {
    if (typeof updatedAt.toMillis === 'function') return updatedAt.toMillis();
    if (typeof updatedAt.seconds === 'number') return updatedAt.seconds * 1000;
  }
  return 0;
}

function getItemTimestampMs(item: unknown): number {
  if (!item || typeof item !== 'object') return 0;
  const obj = item as Record<string, unknown>;
  if (typeof obj.updatedAtISO === 'string') {
    const t = Date.parse(obj.updatedAtISO);
    if (!isNaN(t)) return t;
  }
  if (typeof obj.createdAtISO === 'string') {
    const t = Date.parse(obj.createdAtISO);
    if (!isNaN(t)) return t;
  }
  return 0;
}

function mergeEntityArraysById<T extends { id: string }>(
  primaryArr: T[],
  secondaryArr: T[],
  deletedIds: Record<string, string>
): T[] {
  const map = new Map<string, T>();
  for (const item of secondaryArr) {
    if (!item || !item.id || deletedIds[item.id]) continue;
    map.set(item.id, item);
  }
  for (const item of primaryArr) {
    if (!item || !item.id || deletedIds[item.id]) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const tPrimary = getItemTimestampMs(item);
      const tExisting = getItemTimestampMs(existing);
      if (tPrimary >= tExisting) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

export function reconcileMultiPathCloudSnapshots(
  localVault: ShopVaultPayload,
  cloudDocs: Array<Record<string, unknown> | null | undefined>
): {
  merged: ShopVaultPayload;
  cloudFound: boolean;
  needsCloudHeal: boolean;
} {
  const validDocs = cloudDocs.filter((d): d is Record<string, unknown> =>
    Boolean(d && typeof d === 'object')
  );
  if (validDocs.length === 0) {
    return { merged: localVault, cloudFound: false, needsCloudHeal: true };
  }

  validDocs.sort((a, b) => getPayloadTimestampMs(a) - getPayloadTimestampMs(b));

  let combined = localVault;
  for (const docData of validDocs) {
    combined = mergeVaultPayloads(combined, docData, false);
  }

  const oldestCloudTs = getPayloadTimestampMs(validDocs[0]);
  const newestCloudTs = getPayloadTimestampMs(validDocs[validDocs.length - 1]);
  const localTs = getPayloadTimestampMs(localVault);

  const needsCloudHeal =
    validDocs.length < 3 ||
    oldestCloudTs !== newestCloudTs ||
    localTs > newestCloudTs;

  return {
    merged: combined,
    cloudFound: true,
    needsCloudHeal,
  };
}

export function mergeVaultPayloads(
  localVault: ShopVaultPayload,
  incomingRaw: unknown,
  preferLocalOnTie: boolean = false
): ShopVaultPayload {
  const email = localVault.email || localVault.accountEmail || 'skillwave.pro@gmail.com';
  const incoming = normalizeVaultPayload(incomingRaw, email);

  const localTs = getPayloadTimestampMs(localVault);
  const incomingTs = getPayloadTimestampMs(incomingRaw);

  const localHasRealData =
    !localVault.isDefaultFallback &&
    (localVault.products.length > 0 ||
      localVault.sales.length > 0 ||
      localVault.expenses.length > 0 ||
      localVault.customers.length > 0 ||
      localVault.extraIncomes.length > 0 ||
      localVault.staff.length > 0 ||
      (localVault.shopProfile.workingCapital || 0) > 0 ||
      Boolean(localVault.shopProfile.isProfileCustomized));

  const incomingHasRealData =
    !incoming.isDefaultFallback &&
    (incoming.products.length > 0 ||
      incoming.sales.length > 0 ||
      incoming.expenses.length > 0 ||
      incoming.customers.length > 0 ||
      incoming.extraIncomes.length > 0 ||
      incoming.staff.length > 0 ||
      (incoming.shopProfile.workingCapital || 0) > 0 ||
      Boolean(incoming.shopProfile.isProfileCustomized));

  let incomingIsNewer = preferLocalOnTie
    ? incomingTs > localTs
    : incomingTs >= localTs;

  if (!incomingHasRealData && localHasRealData) {
    incomingIsNewer = false;
  } else if (incomingHasRealData && !localHasRealData) {
    incomingIsNewer = true;
  }

  const primary = incomingIsNewer ? incoming : localVault;
  const secondary = incomingIsNewer ? localVault : incoming;

  const mergedDeletedIds: Record<string, string> = {
    ...(secondary.deletedIds || {}),
    ...(primary.deletedIds || {}),
  };

  const mergedProducts = mergeEntityArraysById(
    primary.products,
    secondary.products,
    mergedDeletedIds
  );
  const mergedCustomers = mergeEntityArraysById(
    primary.customers,
    secondary.customers,
    mergedDeletedIds
  );
  const mergedSales = sanitizeSalesList(
    mergeEntityArraysById(primary.sales, secondary.sales, mergedDeletedIds)
  );
  const mergedExpenses = mergeEntityArraysById(
    primary.expenses,
    secondary.expenses,
    mergedDeletedIds
  );
  const mergedExtraIncomes = mergeEntityArraysById(
    primary.extraIncomes,
    secondary.extraIncomes,
    mergedDeletedIds
  );
  const mergedStaff = mergeEntityArraysById(
    primary.staff,
    secondary.staff,
    mergedDeletedIds
  );

  const maxTs = Math.max(localTs, incomingTs, Date.now());
  const resolvedAuthPassword =
    primary.authPassword || secondary.authPassword || undefined;

  const localProfileTs = Number(localVault.shopProfile.profileUpdatedAt) || 0;
  const incomingProfileTs = Number(incoming.shopProfile.profileUpdatedAt) || 0;
  let chosenProfile = primary.shopProfile;
  if (localProfileTs > 0 || incomingProfileTs > 0) {
    chosenProfile =
      incomingProfileTs > localProfileTs
        ? incoming.shopProfile
        : localProfileTs > incomingProfileTs
        ? localVault.shopProfile
        : primary.shopProfile;
  } else if (
    localVault.shopProfile.isProfileCustomized &&
    !incoming.shopProfile.isProfileCustomized
  ) {
    chosenProfile = localVault.shopProfile;
  } else if (
    incoming.shopProfile.isProfileCustomized &&
    !localVault.shopProfile.isProfileCustomized
  ) {
    chosenProfile = incoming.shopProfile;
  }

  const otherProfile =
    chosenProfile === localVault.shopProfile
      ? incoming.shopProfile
      : localVault.shopProfile;

  return {
    version: 5,
    accountEmail: email,
    email,
    ...(resolvedAuthPassword ? { authPassword: resolvedAuthPassword } : {}),
    isDefaultFallback: false,
    updatedAtISO:
      primary.updatedAtISO || new Date(maxTs).toISOString(),
    lastModifiedAt: Math.max(localTs, incomingTs),
    shopProfile: {
      ...chosenProfile,
      ownerEmail: email,
      priceCodeKey: normalizeSecretPriceCodeKey(
        chosenProfile.priceCodeKey
      ),
      ...(chosenProfile.customCategories && chosenProfile.customCategories.length > 0
        ? { customCategories: chosenProfile.customCategories }
        : otherProfile.customCategories && otherProfile.customCategories.length > 0
        ? { customCategories: otherProfile.customCategories }
        : {}),
      ...(chosenProfile.customSizes && chosenProfile.customSizes.length > 0
        ? { customSizes: chosenProfile.customSizes }
        : otherProfile.customSizes && otherProfile.customSizes.length > 0
        ? { customSizes: otherProfile.customSizes }
        : {}),
    },
    products: mergedProducts,
    customers: mergedCustomers,
    sales: mergedSales,
    expenses: mergedExpenses,
    extraIncomes: mergedExtraIncomes,
    staff: mergedStaff,
    deletedIds: mergedDeletedIds,
  };
}

export function getActiveAccountEmail(): string {
  if (typeof localStorage === 'undefined') return 'skillwave.pro@gmail.com';
  const explicit = localStorage.getItem(KEY_ACTIVE_ACCOUNT_EMAIL);
  if (explicit && explicit.trim().includes('@')) {
    return explicit.trim().toLowerCase();
  }
  const instant = safeJsonParse<{ email?: string }>(
    localStorage.getItem(STORAGE_KEYS.INSTANT_USER)
  );
  if (instant?.email && instant.email.trim().includes('@')) {
    return instant.email.trim().toLowerCase();
  }
  const legacyProfile = safeJsonParse<Partial<ShopProfile>>(
    localStorage.getItem(STORAGE_KEYS.PROFILE)
  );
  if (legacyProfile?.ownerEmail && legacyProfile.ownerEmail.trim().includes('@')) {
    return legacyProfile.ownerEmail.trim().toLowerCase();
  }
  return 'skillwave.pro@gmail.com';
}

export function setActiveAccountEmail(email: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!email) {
      localStorage.removeItem(KEY_ACTIVE_ACCOUNT_EMAIL);
    } else {
      const clean = email.trim().toLowerCase();
      localStorage.setItem(KEY_ACTIVE_ACCOUNT_EMAIL, clean);
      localStorage.setItem(KEY_LAST_LOGGED_OUT_EMAIL, clean);
      localStorage.removeItem(KEY_LOGGED_OUT_STATE);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function isLoggedOutState(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(KEY_LOGGED_OUT_STATE) === 'true';
}

export function setLoggedOutState(
  loggedOut: boolean,
  lastEmail?: string
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (loggedOut) {
      localStorage.setItem(KEY_LOGGED_OUT_STATE, 'true');
      if (lastEmail && lastEmail.includes('@')) {
        localStorage.setItem(
          KEY_LAST_LOGGED_OUT_EMAIL,
          lastEmail.trim().toLowerCase()
        );
      }
    } else {
      localStorage.removeItem(KEY_LOGGED_OUT_STATE);
    }
  } catch {
    // Ignore
  }
}

export function getLastLoggedOutEmail(): string {
  if (typeof localStorage === 'undefined') return '';
  return (localStorage.getItem(KEY_LAST_LOGGED_OUT_EMAIL) || '')
    .trim()
    .toLowerCase();
}

export function loadUserVaultFromLocal(
  email: string,
  allowLegacyFallback: boolean = true
): ShopVaultPayload {
  const cleanEmail = (email || 'skillwave.pro@gmail.com').trim().toLowerCase();
  const docId = sanitizeEmailForCloudDoc(cleanEmail);

  if (typeof localStorage === 'undefined') {
    return normalizeVaultPayload({}, cleanEmail);
  }

  const candidateKeys = [
    `${KEY_MASTER_PREFIX}${cleanEmail}`,
    `${KEY_MASTER_PREFIX}${docId}`,
    `${STORAGE_KEYS.VAULT_PREFIX}${docId}`,
    `${STORAGE_KEYS.VAULT_PREFIX}${cleanEmail}`,
    `${KEY_BACKUP_PREFIX}${cleanEmail}`,
    `${KEY_BACKUP_PREFIX}${docId}`,
  ];

  let bestVault: ShopVaultPayload | null = null;
  let bestTimestamp = -1;

  for (const key of candidateKeys) {
    const parsed = safeJsonParse<Record<string, unknown>>(
      localStorage.getItem(key)
    );
    if (parsed && typeof parsed === 'object' && parsed.shopProfile) {
      const normalized = normalizeVaultPayload(parsed, cleanEmail);
      const ts = Date.parse(normalized.updatedAtISO || '') || 0;
      const itemScore =
        normalized.products.length +
        normalized.sales.length +
        normalized.expenses.length +
        normalized.customers.length +
        normalized.extraIncomes.length +
        normalized.staff.length;

      if (
        !bestVault ||
        ts > bestTimestamp ||
        (ts === bestTimestamp &&
          itemScore >
            bestVault.products.length +
              bestVault.sales.length +
              bestVault.expenses.length)
      ) {
        bestVault = normalized;
        bestTimestamp = ts;
      }
    }
  }

  if (bestVault) {
    return bestVault;
  }

  if (allowLegacyFallback) {
    const legacyProfile = safeJsonParse<ShopProfile>(
      localStorage.getItem(STORAGE_KEYS.PROFILE)
    );
    const legacyOwner = legacyProfile?.ownerEmail?.trim().toLowerCase();

    if (
      legacyProfile &&
      (!legacyOwner ||
        legacyOwner === cleanEmail ||
        cleanEmail === 'skillwave.pro@gmail.com')
    ) {
      const legacyProducts = safeJsonParse<Product[]>(
        localStorage.getItem(STORAGE_KEYS.PRODUCTS)
      );
      const legacyCustomers = safeJsonParse<Customer[]>(
        localStorage.getItem(STORAGE_KEYS.CUSTOMERS)
      );
      const legacySales = safeJsonParse<Sale[]>(
        localStorage.getItem(STORAGE_KEYS.SALES)
      );
      const legacyExpenses = safeJsonParse<Expense[]>(
        localStorage.getItem(STORAGE_KEYS.EXPENSES)
      );
      const legacyExtraIncomes = safeJsonParse<ExtraIncome[]>(
        localStorage.getItem(STORAGE_KEYS.EXTRA_INCOMES)
      );
      const legacyStaff = safeJsonParse<StaffMember[]>(
        localStorage.getItem(STORAGE_KEYS.STAFF)
      );

      const migrated = normalizeVaultPayload(
        {
          updatedAtISO: new Date().toISOString(),
          shopProfile: { ...legacyProfile, ownerEmail: cleanEmail },
          products: legacyProducts ?? INITIAL_PRODUCTS,
          customers: legacyCustomers ?? INITIAL_CUSTOMERS,
          sales: legacySales ?? INITIAL_SALES,
          expenses: legacyExpenses ?? INITIAL_EXPENSES,
          extraIncomes: legacyExtraIncomes ?? [],
          staff: legacyStaff ?? [],
        },
        cleanEmail
      );
      saveUserVaultToLocal(cleanEmail, migrated);
      return migrated;
    }
  }

  if (cleanEmail === 'skillwave.pro@gmail.com') {
    return normalizeVaultPayload(
      {
        isDefaultFallback: true,
        updatedAtISO: '1970-01-01T00:00:00.000Z',
        lastModifiedAt: 0,
        shopProfile: INITIAL_SHOP_PROFILE,
        products: INITIAL_PRODUCTS,
        customers: INITIAL_CUSTOMERS,
        sales: INITIAL_SALES,
        expenses: INITIAL_EXPENSES,
        extraIncomes: [],
        staff: [],
      },
      cleanEmail
    );
  }

  return normalizeVaultPayload(
    {
      isDefaultFallback: true,
      updatedAtISO: '1970-01-01T00:00:00.000Z',
      lastModifiedAt: 0,
      shopProfile: {
        ...INITIAL_SHOP_PROFILE,
        ownerId: docId,
        ownerEmail: cleanEmail,
        workingCapital: 0,
      },
      products: [],
      customers: [],
      sales: [],
      expenses: [],
      extraIncomes: [],
      staff: [],
    },
    cleanEmail
  );
}

export function purgeDeletedUserLocalVault(email: string): void {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return;
  const docId = sanitizeEmailForCloudDoc(cleanEmail);

  if (typeof localStorage !== 'undefined') {
    try {
      const keysToDelete = [
        `${KEY_MASTER_PREFIX}${cleanEmail}`,
        `${KEY_MASTER_PREFIX}${docId}`,
        `${STORAGE_KEYS.VAULT_PREFIX}${docId}`,
        `${STORAGE_KEYS.VAULT_PREFIX}${cleanEmail}`,
        `${KEY_BACKUP_PREFIX}${cleanEmail}`,
        `${KEY_BACKUP_PREFIX}${docId}`,
      ];
      for (const k of keysToDelete) {
        localStorage.removeItem(k);
      }

      const accountsRaw = safeJsonParse<
        Record<string, { email: string; password?: string }>
      >(localStorage.getItem(STORAGE_KEYS.ACCOUNTS));
      if (accountsRaw && typeof accountsRaw === 'object') {
        delete accountsRaw[docId];
        delete accountsRaw[cleanEmail];
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accountsRaw));
      }

      const legacyProfile = safeJsonParse<ShopProfile>(
        localStorage.getItem(STORAGE_KEYS.PROFILE)
      );
      if (legacyProfile?.ownerEmail?.trim().toLowerCase() === cleanEmail) {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.EXTRA_INCOMES);
        localStorage.removeItem(STORAGE_KEYS.STAFF);
      }

      const activatedEmail = (localStorage.getItem(KEY_ACTIVATED_GMAIL) || '')
        .trim()
        .toLowerCase();
      if (activatedEmail === cleanEmail) {
        localStorage.removeItem(KEY_DEVICE_ACTIVATED);
        localStorage.removeItem(KEY_ACTIVATED_GMAIL);
      }
    } catch {
      // ignore
    }
  }

  void deleteFromIDB(`dookanify_master_${cleanEmail}`);
  void deleteFromIDB(`dookanify_master_${docId}`);
}

export function saveUserVaultToLocal(
  email: string,
  payload: Partial<ShopVaultPayload> & {
    shopProfile: ShopProfile;
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    expenses: Expense[];
    extraIncomes?: ExtraIncome[];
    staff?: StaffMember[];
    deletedIds?: Record<string, string>;
  }
): ShopVaultPayload {
  const cleanEmail = (
    email ||
    payload.shopProfile?.ownerEmail ||
    'skillwave.pro@gmail.com'
  )
    .trim()
    .toLowerCase();
  const docId = sanitizeEmailForCloudDoc(cleanEmail);

  const nowMs = payload.lastModifiedAt || Date.now();
  const normalized = normalizeVaultPayload(
    {
      ...payload,
      version: 5,
      accountEmail: cleanEmail,
      email: cleanEmail,
      updatedAtISO: payload.updatedAtISO || new Date(nowMs).toISOString(),
      lastModifiedAt: nowMs,
      shopProfile: {
        ...payload.shopProfile,
        ownerId: payload.shopProfile.ownerId || docId,
        ownerEmail: cleanEmail,
        priceCodeKey: normalizeSecretPriceCodeKey(
          payload.shopProfile.priceCodeKey
        ),
      },
      extraIncomes: payload.extraIncomes ?? [],
      staff: payload.staff ?? [],
      deletedIds: payload.deletedIds ?? {},
    },
    cleanEmail
  );

  if (typeof localStorage !== 'undefined') {
    const serialized = JSON.stringify(normalized);
    try {
      localStorage.setItem(KEY_ACTIVE_ACCOUNT_EMAIL, cleanEmail);
      localStorage.setItem(`${KEY_MASTER_PREFIX}${cleanEmail}`, serialized);
      localStorage.setItem(`${KEY_MASTER_PREFIX}${docId}`, serialized);
      localStorage.setItem(`${STORAGE_KEYS.VAULT_PREFIX}${docId}`, serialized);
      localStorage.setItem(`${KEY_BACKUP_PREFIX}${cleanEmail}`, serialized);

      localStorage.setItem(
        STORAGE_KEYS.PROFILE,
        JSON.stringify(normalized.shopProfile)
      );
      localStorage.setItem(
        STORAGE_KEYS.PRODUCTS,
        JSON.stringify(normalized.products)
      );
      localStorage.setItem(
        STORAGE_KEYS.CUSTOMERS,
        JSON.stringify(normalized.customers)
      );
      localStorage.setItem(
        STORAGE_KEYS.SALES,
        JSON.stringify(normalized.sales)
      );
      localStorage.setItem(
        STORAGE_KEYS.EXPENSES,
        JSON.stringify(normalized.expenses)
      );
      localStorage.setItem(
        STORAGE_KEYS.EXTRA_INCOMES,
        JSON.stringify(normalized.extraIncomes)
      );
      localStorage.setItem(
        STORAGE_KEYS.STAFF,
        JSON.stringify(normalized.staff)
      );
    } catch (err) {
      console.error('LocalStorage write warning:', err);
    }
  }

  void saveToIDB(`dookanify_master_${cleanEmail}`, normalized);
  void saveToIDB(`dookanify_master_${docId}`, normalized);

  return normalized;
}

export function loadOfflineQueue(): OfflineSyncQueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  const parsed = safeJsonParse<OfflineSyncQueueItem[]>(
    localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function saveOfflineQueue(queue: OfflineSyncQueueItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch {
    // Ignore
  }
}

export function isDeviceActivated(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(KEY_DEVICE_ACTIVATED) === 'true';
}

export function setDeviceActivated(
  activated: boolean,
  email?: string
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (activated) {
      localStorage.setItem(KEY_DEVICE_ACTIVATED, 'true');
      if (email) {
        localStorage.setItem(KEY_ACTIVATED_GMAIL, email.trim().toLowerCase());
      }
    } else {
      localStorage.removeItem(KEY_DEVICE_ACTIVATED);
      localStorage.removeItem(KEY_ACTIVATED_GMAIL);
    }
  } catch {
    // Ignore
  }
}

export function isStandaloneAdminApp(): boolean {
  const envFlag =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_ADMIN_APP === 'true';
  if (envFlag) return true;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin' || params.get('admin') === '1') {
      return true;
    }
  }
  return false;
}

export function isStandaloneAdminUnlocked(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(KEY_STANDALONE_ADMIN_UNLOCKED) === 'true';
}

export function setStandaloneAdminUnlocked(unlocked: boolean): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(KEY_STANDALONE_ADMIN_UNLOCKED, 'true');
    } else {
      sessionStorage.removeItem(KEY_STANDALONE_ADMIN_UNLOCKED);
    }
  } catch {
    // ignore
  }
}

export function verifyAdminPassword(
  registry: DeveloperAccessRegistry,
  enteredPassword: string
): boolean {
  const clean = enteredPassword.trim();
  if (!clean) return false;
  const target = (
    registry.adminPassword ||
    registry.masterActivationCode ||
    DEFAULT_ADMIN_PASSWORD
  ).trim();
  return (
    clean === target ||
    clean.toLowerCase() === target.toLowerCase() ||
    clean.toLowerCase() === DEFAULT_ADMIN_PASSWORD.toLowerCase()
  );
}

export function isDeveloperModeUnlocked(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(KEY_DEV_MODE_UNLOCKED) === 'true';
}

export function setDeveloperModeUnlocked(unlocked: boolean): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(KEY_DEV_MODE_UNLOCKED, 'true');
    } else {
      sessionStorage.removeItem(KEY_DEV_MODE_UNLOCKED);
    }
  } catch {
    // Ignore
  }
}

export function normalizeDeveloperRegistry(
  raw: unknown
): DeveloperAccessRegistry {
  const obj =
    raw && typeof raw === 'object'
      ? (raw as Partial<DeveloperAccessRegistry>)
      : {};
  const rawDev =
    obj.developerProfile && typeof obj.developerProfile === 'object'
      ? (obj.developerProfile as Partial<DeveloperProfile>)
      : {};

  const developerProfile: DeveloperProfile = {
    ...DEFAULT_DEVELOPER_PROFILE,
    ...rawDev,
    skills: Array.isArray(rawDev.skills)
      ? rawDev.skills
      : DEFAULT_DEVELOPER_PROFILE.skills,
    services: Array.isArray(rawDev.services)
      ? rawDev.services
      : DEFAULT_DEVELOPER_PROFILE.services,
  };

  const approvedUsers = Array.isArray(obj.approvedUsers)
    ? obj.approvedUsers.filter((u) => Boolean(u && u.email))
    : INITIAL_DEVELOPER_REGISTRY.approvedUsers;

  const deletedUserEmails = Array.isArray(obj.deletedUserEmails)
    ? Array.from(
        new Set(
          obj.deletedUserEmails
            .filter((e): e is string => typeof e === 'string' && Boolean(e.trim()))
            .map((e) => e.trim().toLowerCase())
        )
      )
    : [];

  return {
    masterActivationCode:
      typeof obj.masterActivationCode === 'string' &&
      obj.masterActivationCode.trim()
        ? obj.masterActivationCode.trim()
        : DEFAULT_MASTER_ACTIVATION_CODE,
    adminPassword:
      typeof obj.adminPassword === 'string' && obj.adminPassword.trim()
        ? obj.adminPassword.trim()
        : DEFAULT_ADMIN_PASSWORD,
    isAccessGateEnabled:
      typeof obj.isAccessGateEnabled === 'boolean'
        ? obj.isAccessGateEnabled
        : true,
    requireStrictGmailApproval:
      typeof obj.requireStrictGmailApproval === 'boolean'
        ? obj.requireStrictGmailApproval
        : false,
    developerProfile,
    approvedUsers,
    deletedUserEmails,
    updatedAtISO:
      typeof obj.updatedAtISO === 'string' && obj.updatedAtISO
        ? obj.updatedAtISO
        : new Date().toISOString(),
  };
}

export function isUserEmailDeleted(
  registry: DeveloperAccessRegistry,
  email?: string | null
): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  return (registry.deletedUserEmails || []).some(
    (e) => e.trim().toLowerCase() === clean
  );
}

export function loadDeveloperRegistry(): DeveloperAccessRegistry {
  if (typeof localStorage === 'undefined') return INITIAL_DEVELOPER_REGISTRY;
  const parsed = safeJsonParse<DeveloperAccessRegistry>(
    localStorage.getItem(KEY_DEV_REGISTRY)
  );
  return parsed
    ? normalizeDeveloperRegistry(parsed)
    : INITIAL_DEVELOPER_REGISTRY;
}

export function saveDeveloperRegistry(
  registry: DeveloperAccessRegistry
): DeveloperAccessRegistry {
  const normalized = normalizeDeveloperRegistry({
    ...registry,
    updatedAtISO: registry.updatedAtISO || new Date().toISOString(),
  });
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KEY_DEV_REGISTRY, JSON.stringify(normalized));
    } catch {
      // Ignore
    }
  }
  return normalized;
}

export function isUserEmailBlocked(
  registry: DeveloperAccessRegistry,
  email?: string | null
): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const found = registry.approvedUsers.find(
    (u) => u.email.trim().toLowerCase() === clean
  );
  return found?.status === 'blocked';
}

export function verifyUserAccessGate(
  registry: DeveloperAccessRegistry,
  email: string,
  passcode: string
): { allowed: boolean; reason?: string; matchedUser?: DeveloperAccessRegistry['approvedUsers'][0] } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = passcode.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { allowed: false, reason: 'সঠিক জিমেইল (Gmail) অ্যাড্রেস লিখুন।' };
  }
  if (!cleanPass) {
    return { allowed: false, reason: 'অ্যাক্সেস পাসওয়ার্ড বা গোপন কোড লিখুন।' };
  }

  const foundUser = registry.approvedUsers.find(
    (u) => u.email.trim().toLowerCase() === cleanEmail
  );

  if (foundUser?.status === 'blocked') {
    return {
      allowed: false,
      reason:
        'আপনার অ্যাকাউন্টটি সাময়িকভাবে ব্লক করা হয়েছে। ডেভেলপার MD Golam Rabby-এর সাথে যোগাযোগ করুন।',
    };
  }

  const matchesMaster =
    cleanPass.toLowerCase() ===
      registry.masterActivationCode.trim().toLowerCase() ||
    cleanPass.toLowerCase() === DEFAULT_MASTER_ACTIVATION_CODE.toLowerCase();

  if (foundUser) {
    const matchesUserPass =
      cleanPass.toLowerCase() === foundUser.passcode.trim().toLowerCase();
    if (matchesUserPass || matchesMaster) {
      return { allowed: true, matchedUser: foundUser };
    }
    return {
      allowed: false,
      reason: 'পাসওয়ার্ড বা অ্যাক্সেস কোড সঠিক নয়। ডেভেলপারের দেওয়া সঠিক পাসওয়ার্ড দিন।',
    };
  }

  if (registry.requireStrictGmailApproval) {
    return {
      allowed: false,
      reason:
        'এই জিমেইলটি এখনো অনুমোদিত নয়। অ্যাক্সেস পেতে নিচে WhatsApp বাটনে ক্লিক করে ডেভেলপারের সাথে যোগাযোগ করুন।',
    };
  }

  if (matchesMaster) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason:
      'অ্যাক্সেস পাসওয়ার্ড সঠিক নয়। অ্যাক্টিভেশন পাসওয়ার্ড পেতে নিচে ডেভেলপারের সাথে যোগাযোগ করুন।',
  };
}

export const getActiveUserEmail = getActiveAccountEmail;
export const setActiveUserEmail = setActiveAccountEmail;
export const isExplicitlyLoggedOut = isLoggedOutState;
export const setExplicitLoggedOutState = setLoggedOutState;
export const getLastUsedEmail = getLastLoggedOutEmail;
export const getFirestoreDocId = sanitizeEmailForCloudDoc;
export const stripUndefinedDeep = sanitizeForFirestore;
export const loadUserAccountDataSnapshot = loadUserVaultFromLocal;
export const saveUserAccountDataSnapshot = saveUserVaultToLocal;
export const purgeDeletedUserLocalCache = purgeDeletedUserLocalVault;
export const readIndexedDBSnapshot = loadFromIDB;
export const getSnapshotTimestampMs = getPayloadTimestampMs;
export const normalizeCloudSnapshot = normalizeVaultPayload;
export const mergeTwoAccountSnapshots = mergeVaultPayloads;
export const reconcileLocalWithCloudDocs = reconcileMultiPathCloudSnapshots;
export const isStandaloneAdminMode = isStandaloneAdminApp;
export const isAdminSessionAuthenticated = isStandaloneAdminUnlocked;
export const setAdminSessionAuthenticated = setStandaloneAdminUnlocked;
export const isUserEmailDeletedInRegistry = isUserEmailDeleted;
export const isUserEmailBlockedInRegistry = isUserEmailBlocked;

export function verifyAdminSecretPassword(
  passwordInput: string,
  registry: DeveloperAccessRegistry
): boolean {
  return verifyAdminPassword(registry, passwordInput);
}

export function getActivatedUserEmail(): string {
  if (typeof localStorage === 'undefined') return '';
  return (localStorage.getItem(KEY_ACTIVATED_GMAIL) || '').trim().toLowerCase();
}

export function computeSnapshotContentSignature(state: {
  shopProfile: ShopProfile;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  staffList: StaffMember[];
  deletedIds?: Record<string, string>;
}): string {
  try {
    return JSON.stringify({
      p: state.shopProfile,
      pr: state.products,
      cu: state.customers,
      sa: state.sales,
      ex: state.expenses,
      in: state.extraIncomes,
      st: state.staffList,
      dl: state.deletedIds || {},
    });
  } catch {
    return String(Date.now());
  }
}
