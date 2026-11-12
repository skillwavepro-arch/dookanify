import {
  Customer,
  Expense,
  ExpenseCategory,
  GarmentCategory,
  GarmentSize,
  PaymentMethod,
  Product,
  Sale,
  ShopProfile,
} from '../types/shop';

export const SHOP_NAME_PRESETS: string[] = [
  'সোনার বাংলা বস্ত্রালয় অ্যান্ড ফ্যাশন হাউস',
  'বিসমিল্লাহ পাঞ্জাবি ও শাড়ি বিতান',
  'নিউ ঢাকা ফ্যাশন গ্যালারি',
  'আল-মদিনা গার্মেন্টস অ্যান্ড বস্ত্রালয়',
  'রূপসী বাংলা শাড়ি ও থ্রি-পিস হাউস',
  'রয়েল ফ্যাশন অ্যান্ড লাইফস্টাইল',
];

export const POPULAR_SHOP_NAMES = SHOP_NAME_PRESETS;

export const INITIAL_SHOP_PROFILE: ShopProfile = {
  ownerId: 'skillwave_pro_gmail_com',
  ownerEmail: 'skillwave.pro@gmail.com',
  shopName: 'সোনার বাংলা বস্ত্রালয় অ্যান্ড ফ্যাশন হাউস',
  ownerName: 'রাব্বি',
  phone: '01843373523',
  address: 'সীতাকুণ্ড, চট্টগ্রাম',
  workingCapital: 0,
  priceCodeKey: 'XBANGLDESH',
};

export const DEFAULT_SHOP_PROFILE: ShopProfile = INITIAL_SHOP_PROFILE;

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  'পাঞ্জাবি',
  'শাড়ি',
  'থ্রি-পিস',
  'শার্ট',
  'টি-শার্ট',
  'জিন্স ও প্যান্ট',
  'বোরকা ও হিজাব',
  'বাচ্চাদের পোশাক',
];

export const CLOTHING_CATEGORIES = GARMENT_CATEGORIES;

export const GARMENT_SIZES: GarmentSize[] = [
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'ফ্রি সাইজ',
];

export const CLOTHING_SIZES = GARMENT_SIZES;

export const CUSTOM_CATEGORIES_STORAGE_KEY = 'dookanify_custom_categories_v1';
export const CUSTOM_SIZES_STORAGE_KEY = 'dookanify_custom_sizes_v1';
export const CATALOG_OPTIONS_UPDATED_EVENT = 'dookanify-catalog-options-updated';

const notifyCatalogOptionsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATALOG_OPTIONS_UPDATED_EVENT));
  }
};

export const loadPersistedCategories = (): GarmentCategory[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [...GARMENT_CATEGORIES];
  }
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
    if (!raw) return [...GARMENT_CATEGORIES];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = Array.from(
        new Set(
          parsed
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        )
      );
      if (cleaned.length > 0) return cleaned;
    }
  } catch {
    // ignore storage errors
  }
  return [...GARMENT_CATEGORIES];
};

export const savePersistedCategories = (categories: GarmentCategory[]): GarmentCategory[] => {
  const cleaned = Array.from(
    new Set(categories.map((c) => String(c || '').trim()).filter(Boolean))
  );
  const finalCategories = cleaned.length > 0 ? cleaned : [...GARMENT_CATEGORIES];
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(finalCategories));
      notifyCatalogOptionsUpdated();
    } catch {
      // ignore storage errors
    }
  }
  return finalCategories;
};

export const addPersistedCategory = (newCategory: string): GarmentCategory[] => {
  const trimmed = newCategory.trim();
  const current = loadPersistedCategories();
  if (!trimmed) return current;
  if (current.includes(trimmed)) return current;
  return savePersistedCategories([...current, trimmed]);
};

export const deletePersistedCategory = (categoryToDelete: string): GarmentCategory[] => {
  const target = categoryToDelete.trim();
  const current = loadPersistedCategories();
  const next = current.filter((c) => c !== target);
  return savePersistedCategories(next.length > 0 ? next : [...GARMENT_CATEGORIES]);
};

export const loadPersistedSizes = (): GarmentSize[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [...GARMENT_SIZES];
  }
  try {
    const raw = localStorage.getItem(CUSTOM_SIZES_STORAGE_KEY);
    if (!raw) return [...GARMENT_SIZES];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = Array.from(
        new Set(
          parsed
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        )
      );
      if (cleaned.length > 0) return cleaned;
    }
  } catch {
    // ignore storage errors
  }
  return [...GARMENT_SIZES];
};

export const savePersistedSizes = (sizes: GarmentSize[]): GarmentSize[] => {
  const cleaned = Array.from(
    new Set(sizes.map((s) => String(s || '').trim()).filter(Boolean))
  );
  const finalSizes = cleaned.length > 0 ? cleaned : [...GARMENT_SIZES];
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CUSTOM_SIZES_STORAGE_KEY, JSON.stringify(finalSizes));
      notifyCatalogOptionsUpdated();
    } catch {
      // ignore storage errors
    }
  }
  return finalSizes;
};

export const addPersistedSize = (newSize: string): GarmentSize[] => {
  const trimmed = newSize.trim();
  const current = loadPersistedSizes();
  if (!trimmed) return current;
  if (current.includes(trimmed)) return current;
  return savePersistedSizes([...current, trimmed]);
};

export const deletePersistedSize = (sizeToDelete: string): GarmentSize[] => {
  const target = sizeToDelete.trim();
  const current = loadPersistedSizes();
  const next = current.filter((s) => s !== target);
  return savePersistedSizes(next.length > 0 ? next : [...GARMENT_SIZES]);
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  'নগদ (Cash)',
  'বিকাশ (bKash)',
  'নগদ (Nagad)',
  'কার্ড (Card)',
  'বাকি (Due)',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'দোকান ভাড়া',
  'বিদ্যুৎ ও ইন্টারনেট বিল',
  'কর্মচারী বেতন',
  'মাল পরিবহন ও কুরিয়ার',
  'দোকান আপ্যায়ন ও চা-নাস্তা',
  'প্যাকেজিং ও শপিং ব্যাগ',
  'অন্যান্য',
];

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
