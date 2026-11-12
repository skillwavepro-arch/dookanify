export type GarmentCategory =
  | 'পাঞ্জাবি'
  | 'শাড়ি'
  | 'থ্রি-পিস'
  | 'শার্ট'
  | 'টি-শার্ট'
  | 'জিন্স ও প্যান্ট'
  | 'বোরকা ও হিজাব'
  | 'বাচ্চাদের পোশাক'
  | (string & {});

export type ClothingCategory = GarmentCategory;

export type GarmentSize =
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | 'ফ্রি সাইজ'
  | 'Free Size'
  | (string & {});

export type ClothingSize = GarmentSize;

export type PaymentMethod =
  | 'নগদ (Cash)'
  | 'বিকাশ (bKash)'
  | 'নগদ (Nagad)'
  | 'কার্ড (Card)'
  | 'বাকি (Due)';

export type ExpenseCategory =
  | 'দোকান ভাড়া'
  | 'বিদ্যুৎ ও ইন্টারনেট বিল'
  | 'কর্মচারী বেতন'
  | 'মাল পরিবহন ও কুরিয়ার'
  | 'দোকান আপ্যায়ন ও চা-নাস্তা'
  | 'প্যাকেজিং ও শপিং ব্যাগ'
  | 'অন্যান্য';

export type ExtraIncomeCategory =
  | 'বকশিস / টিপস'
  | 'অন্যান্য প্রাপ্ত টাকা'
  | 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)';

export type StaffPaymentType =
  | 'মাসিক বেতন'
  | 'অগ্রিম / হাওলাত (Advance)'
  | 'বোনাস / ইদ বোনাস';

export type TransactionEntryType =
  | 'sale'
  | 'quick_sale'
  | 'due_collection'
  | 'expense'
  | 'staff_salary'
  | 'extra_income'
  | 'stock_capital';

export interface ProductPurchaseEntry {
  id: string;
  quantity: number;
  unitBuyPrice: number;
  totalCost: number;
  deductedFromCash: boolean;
  dateISO: string;
  createdAtISO: string;
  note: string;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  category: GarmentCategory;
  size: GarmentSize;
  color: string;
  fabric: string;
  buyPrice: number;
  secretCostCode?: string;
  sellPrice: number;
  askingPrice?: number;
  stock: number;
  initialStock?: number;
  soldCount?: number;
  minStockAlert: number;
  cashPurchaseSpent?: number;
  purchaseDateISO?: string;
  stockAddedDateISO?: string;
  createdAtISO?: string;
  updatedAtISO?: string;
  purchaseHistory?: ProductPurchaseEntry[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  customUnitPrice?: number;
}

export interface SaleItemSnapshot {
  productId: string;
  name: string;
  sku: string;
  size: GarmentSize;
  color?: string;
  quantity: number;
  buyPrice: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  ownerId: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
  items?: SaleItemSnapshot[];
  totalItemsCount: number;
  subtotal: number;
  discount: number;
  extraBargainingProfit?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  profit: number;
  paymentMethod: PaymentMethod;
  saleDateISO: string;
  dateLabel: string;
  createdAtISO?: string;
  updatedAtISO?: string;
  isQuickLumpSum?: boolean;
  note?: string;
}

export interface DuePaymentReceipt {
  id: string;
  receiptNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  previousDue: number;
  paidAmount: number;
  remainingDue: number;
  paymentDateISO: string;
  dateLabel: string;
  createdAtISO: string;
}

export interface Customer {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  address: string;
  totalPurchase: number;
  totalDue: number;
  lastVisit?: string;
  updatedAtISO?: string;
  paymentHistory?: DuePaymentReceipt[];
}

export interface Expense {
  id: string;
  ownerId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDateISO?: string;
  dateLabel: string;
  createdAtISO?: string;
  updatedAtISO?: string;
  isQuickLumpSum?: boolean;
  staffId?: string;
  staffName?: string;
  staffPaymentType?: StaffPaymentType;
  salaryMonthNote?: string;
}

export interface ExtraIncome {
  id: string;
  ownerId: string;
  title: string;
  category: ExtraIncomeCategory;
  amount: number;
  incomeDateISO: string;
  dateLabel: string;
  createdAtISO?: string;
  updatedAtISO?: string;
}

export interface StaffMember {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  role: string;
  monthlySalary: number;
  joinedDateISO: string;
  note?: string;
  createdAtISO?: string;
  updatedAtISO?: string;
}

export interface ShopProfile {
  ownerId?: string;
  ownerEmail?: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  workingCapital: number;
  priceCodeKey: string;
  customCategories?: GarmentCategory[];
  customSizes?: GarmentSize[];
  isProfileCustomized?: boolean;
  profileUpdatedAt?: number;
}

export interface OfflineSyncQueueItem {
  id: string;
  collection: 'products' | 'sales' | 'customers' | 'expenses' | 'shops' | 'users';
  action: 'upsert' | 'delete';
  docId: string;
  payload?: Record<string, unknown>;
  queuedAtISO: string;
}

export interface UnifiedTransaction {
  id: string;
  type: TransactionEntryType;
  title: string;
  subtitle: string;
  categoryBadge: string;
  amount: number;
  cashAmount: number;
  profit?: number;
  dueAmount?: number;
  direction: 'in' | 'out';
  dateISO: string;
  createdAtISO: string;
  relativeDayBadge: 'আজ' | 'গতকাল' | string;
  dateFormatted: string;
  timeFormatted: string;
  fullDateTimeLabel: string;
  rawSale?: Sale;
  rawDueReceipt?: DuePaymentReceipt;
  rawExpense?: Expense;
  rawExtraIncome?: ExtraIncome;
  rawProduct?: Product;
}

export type SaleRecord = Sale;
export type ExpenseRecord = Expense;
export type ExtraIncomeRecord = ExtraIncome;
export type OfflineSyncItem = OfflineSyncQueueItem;

export type ActiveTab = 'dashboard' | 'pos' | 'inventory' | 'customers' | 'expenses' | 'auth';

export interface UserAccountSession {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
  mode?: 'firebase-auth' | 'instant-profile';
}

export interface DeveloperProfile {
  name: string;
  initials?: string;
  title: string;
  tagline?: string;
  bio?: string;
  phone?: string;
  whatsapp?: string;
  whatsappDisplay?: string;
  whatsappUrl?: string;
  callUrl?: string;
  email: string;
  mailtoUrl?: string;
  location?: string;
  skills?: string[];
  services?: string[];
}

export interface ApprovedShopUser {
  email: string;
  passcode: string;
  authPassword?: string;
  accessCode?: string;
  shopName: string;
  ownerName: string;
  phone?: string;
  address?: string;
  workingCapital?: number;
  priceCodeKey?: string;
  profileUpdatedAt?: number;
  status: 'approved' | 'blocked';
  addedAtISO: string;
  updatedAtISO: string;
  lastLoginISO?: string;
  notes?: string;
}

export type ApprovedUserEntry = ApprovedShopUser;

export interface DeveloperAccessRegistry {
  masterActivationCode: string;
  adminPassword?: string;
  isAccessGateEnabled: boolean;
  requireStrictGmailApproval: boolean;
  developerProfile: DeveloperProfile;
  approvedUsers: ApprovedShopUser[];
  deletedUserEmails?: string[];
  updatedAtISO: string;
}

export interface UserAccountDataSnapshot {
  version?: number;
  email: string;
  accountEmail?: string;
  authPassword?: string;
  isBlocked?: boolean;
  isDefaultFallback?: boolean;
  shopProfile: ShopProfile;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  staff: StaffMember[];
  deletedIds?: Record<string, string>;
  updatedAtISO: string;
  lastModifiedAt?: number;
}
