import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  DocumentReference,
  DocumentData,
  DocumentSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Wallet,
  Menu,
  Plus,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Receipt,
  Trash2,
  Shield,
  Zap,
  UserCheck,
  Coins,
} from 'lucide-react';
import { db, auth } from './firebase';
import {
  Product,
  Customer,
  CartItem,
  SaleRecord,
  ExpenseRecord,
  ExtraIncomeRecord,
  StaffMember,
  ShopProfile,
  ActiveTab,
  UserAccountSession,
  DuePaymentReceipt,
  OfflineSyncItem,
  UserAccountDataSnapshot,
  DeveloperAccessRegistry,
} from './types/shop';
import {
  DEFAULT_SHOP_PROFILE,
  CLOTHING_CATEGORIES,
  CLOTHING_SIZES,
} from './data/seedData';
import {
  DEFAULT_PRICE_CODE_KEY,
  sanitizePriceCodeKey,
  formatBDT,
  getTodayISO,
  getDateNDaysAgoISO,
  buildSaleDateMetadata,
  buildQuickSaleItemsSummary,
  deductStockAfterSale,
  restoreStockAfterSaleDelete,
  normalizeProductAuditMetadata,
  applyRestockPurchaseToProduct,
  applyCustomerDuePayment,
  sanitizeAndSortSales,
  calculateShopFinancialSummary,
  calculatePeriodSummary,
  buildUnifiedTransactions,
  PeriodFilterMode,
} from './utils/shopLogic';
import {
  STORAGE_KEYS,
  safeLoadJSON,
  getActiveUserEmail,
  setActiveUserEmail,
  isExplicitlyLoggedOut,
  setExplicitLoggedOutState,
  getLastUsedEmail,
  getFirestoreDocId,
  stripUndefinedDeep,
  loadUserAccountDataSnapshot,
  saveUserAccountDataSnapshot,
  purgeDeletedUserLocalCache,
  readIndexedDBSnapshot,
  computeSnapshotContentSignature,
  getSnapshotTimestampMs,
  normalizeCloudSnapshot,
  mergeTwoAccountSnapshots,
  reconcileLocalWithCloudDocs,
  isDeviceActivated,
  setDeviceActivated,
  isStandaloneAdminMode,
  isAdminSessionAuthenticated,
  setAdminSessionAuthenticated,
  isDeveloperModeUnlocked,
  setDeveloperModeUnlocked,
  loadDeveloperRegistry,
  saveDeveloperRegistry,
  normalizeDeveloperRegistry,
  isUserEmailDeletedInRegistry,
  isUserEmailBlockedInRegistry,
} from './utils/storageEngine';
import { DookanifyLogo } from './components/DookanifyLogo';
import { PosView } from './components/PosView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { ExpensesReportView, LedgerSubTab } from './components/ExpensesReportView';
import { PriceCodeDirectory } from './components/PriceCodeDirectory';
import { ReceiptModal, DuePaymentReceiptModal } from './components/ReceiptModal';
import { ShopSetupModal, ShopBackupPayload } from './components/ShopSetupModal';
import { DeveloperModal } from './components/DeveloperModal';
import { SideDrawer } from './components/SideDrawer';
import { QuickEntryModal } from './components/QuickEntryModal';
import { StaffSalaryModal } from './components/StaffSalaryModal';
import { AuthPage } from './components/AuthPage';
import { IosConfirmDialog, ConfirmDeleteTarget } from './components/IosConfirmDialog';
import { ActivationGateModal } from './components/ActivationGateModal';
import { AdminPasswordGateModal, SecretDeveloperPanel } from './components/SecretDeveloperPanel';

async function safeGetDocWithTimeout(
  ref: DocumentReference<DocumentData>,
  timeoutMs = 4500
): Promise<DocumentSnapshot<DocumentData> | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    return await Promise.race([
      (async () => {
        try {
          return await getDocFromServer(ref);
        } catch {
          return await getDoc(ref);
        }
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export default function App() {
  const isHydratedRef = useRef(false);
  const isLoggedOutRef = useRef<boolean>(isExplicitlyLoggedOut());
  const isSwitchingAccountRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastUsedEmail, setLastUsedEmail] = useState<string>(() => getLastUsedEmail());

  const initialSnapshotRef = useRef<UserAccountDataSnapshot | null>(null);
  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = isLoggedOutRef.current
      ? {
          version: 5,
          email: '',
          accountEmail: '',
          updatedAtISO: '1970-01-01T00:00:00.000Z',
          isDefaultFallback: true,
          shopProfile: { ...DEFAULT_SHOP_PROFILE, ownerEmail: '', workingCapital: 0 },
          products: [],
          customers: [],
          sales: [],
          expenses: [],
          extraIncomes: [],
          staff: [],
          deletedIds: {},
        }
      : loadUserAccountDataSnapshot(getActiveUserEmail());
  }
  const initialSnap = initialSnapshotRef.current;

  const isStandaloneAdminApp = useMemo(() => isStandaloneAdminMode(), []);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(() =>
    isAdminSessionAuthenticated()
  );
  const [showAdminPasswordGate, setShowAdminPasswordGate] = useState<boolean>(false);
  const [isAdminViewingUserShop, setIsAdminViewingUserShop] = useState<boolean>(false);
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);

  const [deviceActivated, setDeviceActivatedState] = useState<boolean>(() =>
    isDeviceActivated()
  );
  const [isDeveloperPanelOpen, setIsDeveloperPanelOpen] = useState<boolean>(
    () => isDeveloperModeUnlocked() || (isStandaloneAdminMode() && isAdminSessionAuthenticated())
  );
  const [developerRegistry, setDeveloperRegistry] = useState<DeveloperAccessRegistry>(() =>
    loadDeveloperRegistry()
  );
  const [cloudUsersMap, setCloudUsersMap] = useState<Record<string, UserAccountDataSnapshot>>({});
  const [isLoadingCloudUsers, setIsLoadingCloudUsers] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    isExplicitlyLoggedOut() ? 'auth' : 'dashboard'
  );
  const [ledgerSubTab, setLedgerSubTab] = useState<LedgerSubTab>('transactions');
  const [periodMode, setPeriodMode] = useState<PeriodFilterMode>('today');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(() => getTodayISO());
  const [selectedMonthPrefix, setSelectedMonthPrefix] = useState<string>(() =>
    getTodayISO().slice(0, 7)
  );
  const [fromDateISO, setFromDateISO] = useState<string>(() => getDateNDaysAgoISO(getTodayISO()));
  const [toDateISO, setToDateISO] = useState<string>(() => getTodayISO());

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPriceCodeModalOpen, setIsPriceCodeModalOpen] = useState(false);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState(false);
  const [isQuickEntryModalOpen, setIsQuickEntryModalOpen] = useState(false);
  const [isStaffSalaryModalOpen, setIsStaffSalaryModalOpen] = useState(false);

  const [toastNotice, setToastNotice] = useState<{
    text: string;
    tone: 'emerald' | 'amber' | 'rose';
  } | null>(null);

  const notify = useCallback((text: string, tone: 'emerald' | 'amber' | 'rose' = 'emerald') => {
    setToastNotice({ text, tone });
  }, []);

  useEffect(() => {
    if (!toastNotice) return;
    const t = setTimeout(() => setToastNotice(null), 3200);
    return () => clearTimeout(t);
  }, [toastNotice]);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowSplashScreen(false);
    }, 1350);
    return () => clearTimeout(t);
  }, []);

  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => initialSnap.shopProfile);
  const [products, setProducts] = useState<Product[]>(() => initialSnap.products);
  const [customers, setCustomers] = useState<Customer[]>(() => initialSnap.customers);
  const [sales, setSales] = useState<SaleRecord[]>(() => sanitizeAndSortSales(initialSnap.sales));
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => initialSnap.expenses);
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncomeRecord[]>(
    () => initialSnap.extraIncomes
  );
  const [staffList, setStaffList] = useState<StaffMember[]>(() => initialSnap.staff);
  const [deletedIds, setDeletedIds] = useState<Record<string, string>>(
    () => initialSnap.deletedIds || {}
  );

  const [isEditingWorkingCapital, setIsEditingWorkingCapital] = useState(false);
  const [workingCapitalInput, setWorkingCapitalInput] = useState('');

  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncItem[]>(() =>
    safeLoadJSON<OfflineSyncItem[]>(STORAGE_KEYS.OFFLINE_QUEUE, [])
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [activeReceiptSale, setActiveReceiptSale] = useState<SaleRecord | null>(null);
  const [activeDueReceipt, setActiveDueReceipt] = useState<DuePaymentReceipt | null>(null);
  const [isShopSetupOpen, setIsShopSetupOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConfirmDeleteTarget | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  const [instantUser, setInstantUser] = useState<UserAccountSession | null>(() =>
    safeLoadJSON<UserAccountSession | null>(STORAGE_KEYS.INSTANT_USER, null)
  );
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudStatusNotice, setCloudStatusNotice] = useState<string | null>(null);

  const currentUser: UserAccountSession | null = useMemo(() => {
    if (instantUser && instantUser.email) return instantUser;
    if (firebaseUser && firebaseUser.email) {
      const cleanEmail = firebaseUser.email.trim().toLowerCase();
      return {
        uid: getFirestoreDocId(cleanEmail),
        email: cleanEmail,
        displayName: firebaseUser.displayName || shopProfile.ownerName,
        photoURL: firebaseUser.photoURL,
        mode: 'firebase-auth',
      };
    }
    return null;
  }, [firebaseUser, instantUser, shopProfile.ownerName]);

  const activeAccountEmail = useMemo(
    () =>
      (
        currentUser?.email ||
        shopProfile.ownerEmail ||
        getActiveUserEmail() ||
        'skillwave.pro@gmail.com'
      )
        .trim()
        .toLowerCase(),
    [currentUser?.email, shopProfile.ownerEmail]
  );

  const lastTimestampISORef = useRef<string>(
    initialSnap.isDefaultFallback
      ? '1970-01-01T00:00:00.000Z'
      : initialSnap.updatedAtISO || '1970-01-01T00:00:00.000Z'
  );
  const lastModifiedMsRef = useRef<number>(
    initialSnap.isDefaultFallback ? 0 : getSnapshotTimestampMs(initialSnap)
  );
  const lastSavedSignatureRef = useRef<string>(
    computeSnapshotContentSignature({
      shopProfile,
      products,
      customers,
      sales,
      expenses,
      extraIncomes,
      staffList,
      deletedIds,
    })
  );

  const liveStateRef = useRef({
    shopProfile,
    products,
    customers,
    sales,
    expenses,
    extraIncomes,
    staffList,
    deletedIds,
  });

  useEffect(() => {
    liveStateRef.current = {
      shopProfile,
      products,
      customers,
      sales,
      expenses,
      extraIncomes,
      staffList,
      deletedIds,
    };
  }, [shopProfile, products, customers, sales, expenses, extraIncomes, staffList, deletedIds]);

  const applyAccountSnapshotToState = useCallback(
    (snap: UserAccountDataSnapshot, targetEmail?: string) => {
      const cleanEmail = (
        targetEmail ||
        snap.email ||
        snap.accountEmail ||
        'skillwave.pro@gmail.com'
      )
        .trim()
        .toLowerCase();
      const docId = getFirestoreDocId(cleanEmail);
      const cleanSales = sanitizeAndSortSales(snap.sales);
      const nextProfile: ShopProfile = {
        ...snap.shopProfile,
        ownerId: snap.shopProfile.ownerId || docId,
        ownerEmail: cleanEmail,
        priceCodeKey: sanitizePriceCodeKey(snap.shopProfile.priceCodeKey),
      };
      const tsMs = snap.isDefaultFallback ? 0 : getSnapshotTimestampMs(snap);
      const nowISO =
        tsMs > 0
          ? new Date(tsMs).toISOString()
          : snap.updatedAtISO || '1970-01-01T00:00:00.000Z';
      lastTimestampISORef.current = nowISO;
      lastModifiedMsRef.current = tsMs;

      const nextLive = {
        shopProfile: nextProfile,
        products: snap.products,
        customers: snap.customers,
        sales: cleanSales,
        expenses: snap.expenses,
        extraIncomes: snap.extraIncomes,
        staffList: snap.staff,
        deletedIds: snap.deletedIds || {},
      };
      liveStateRef.current = nextLive;
      lastSavedSignatureRef.current = computeSnapshotContentSignature(nextLive);

      setShopProfile(nextProfile);
      setProducts(snap.products);
      setCustomers(snap.customers);
      setSales(cleanSales);
      setExpenses(snap.expenses);
      setExtraIncomes(snap.extraIncomes);
      setStaffList(snap.staff);
      setDeletedIds(snap.deletedIds || {});

      return { nextProfile, cleanSales, nowISO };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isLoggedOutRef.current) return;
        const email = getActiveUserEmail().trim().toLowerCase();
        if (isUserEmailDeletedInRegistry(loadDeveloperRegistry(), email)) {
          purgeDeletedUserLocalCache(email);
          return;
        }
        const docId = getFirestoreDocId(email);
        let mergedSnap: UserAccountDataSnapshot = {
          version: 5,
          email,
          accountEmail: email,
          isDefaultFallback: !!initialSnap.isDefaultFallback,
          updatedAtISO: initialSnap.updatedAtISO || lastTimestampISORef.current,
          lastModifiedAt: lastModifiedMsRef.current,
          shopProfile: liveStateRef.current.shopProfile,
          products: liveStateRef.current.products,
          customers: liveStateRef.current.customers,
          sales: liveStateRef.current.sales,
          expenses: liveStateRef.current.expenses,
          extraIncomes: liveStateRef.current.extraIncomes,
          staff: liveStateRef.current.staffList,
          deletedIds: liveStateRef.current.deletedIds,
        };

        try {
          const idbSnap = await readIndexedDBSnapshot(`dookanify_master_${email}`);
          if (idbSnap && !cancelled) {
            mergedSnap = mergeTwoAccountSnapshots(mergedSnap, idbSnap);
          }
        } catch {
          // ignore
        }

        let needsHeal = false;
        if (typeof navigator === 'undefined' || navigator.onLine) {
          setIsCloudSyncing(true);
          try {
            const [shopEmailDoc, shopIdDoc, userDoc] = await Promise.all([
              safeGetDocWithTimeout(doc(db, 'shops', email), 5000),
              safeGetDocWithTimeout(doc(db, 'shops', docId), 5000),
              safeGetDocWithTimeout(doc(db, 'users', docId), 5000),
            ]);
            const { merged, cloudFound, needsCloudHeal } = reconcileLocalWithCloudDocs(
              mergedSnap,
              [
                userDoc?.exists() ? userDoc.data() : null,
                shopIdDoc?.exists() ? shopIdDoc.data() : null,
                shopEmailDoc?.exists() ? shopEmailDoc.data() : null,
              ]
            );
            mergedSnap = merged;
            needsHeal = needsCloudHeal;
            if (cloudFound && !cancelled) {
              setIsOnline(true);
              setLastCloudSyncTime(
                new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              );
            }
          } catch {
            // ignore
          } finally {
            if (!cancelled) setIsCloudSyncing(false);
          }
        }

        if (!cancelled && !isLoggedOutRef.current && !isSwitchingAccountRef.current) {
          applyAccountSnapshotToState(mergedSnap, email);
          const saved = saveUserAccountDataSnapshot(email, mergedSnap);
          if (
            needsHeal &&
            !saved.isDefaultFallback &&
            (typeof navigator === 'undefined' || navigator.onLine)
          ) {
            const cloudPayload = {
              ...stripUndefinedDeep(saved),
              updatedAt: serverTimestamp(),
            };
            Promise.all([
              setDoc(doc(db, 'users', docId), cloudPayload, { merge: true }),
              setDoc(doc(db, 'shops', docId), cloudPayload, { merge: true }),
              setDoc(doc(db, 'shops', email), cloudPayload, { merge: true }),
            ]).catch(() => {});
          }

          setInstantUser((prev) => {
            if (prev && prev.email.trim().toLowerCase() === email) {
              return { ...prev, displayName: mergedSnap.shopProfile.ownerName || prev.displayName };
            }
            const nextSession: UserAccountSession = {
              uid: docId,
              email,
              displayName: mergedSnap.shopProfile.ownerName || 'রাব্বি',
              mode: 'instant-profile',
            };
            try {
              localStorage.setItem(STORAGE_KEYS.INSTANT_USER, JSON.stringify(nextSession));
            } catch {
              // ignore
            }
            return nextSession;
          });
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          isHydratedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyAccountSnapshotToState, initialSnap.isDefaultFallback, initialSnap.updatedAtISO]);

  useEffect(() => {
    let unsub1: (() => void) | undefined;
    let unsub2: (() => void) | undefined;
    const applyRegistryData = (data: Record<string, unknown>, hasPendingWrites: boolean) => {
      setDeveloperRegistry((prev) => {
        const incomingTs = Date.parse((data.updatedAtISO as string) || '') || 0;
        const currentTs = Date.parse(prev.updatedAtISO || '') || 0;
        if (hasPendingWrites && incomingTs < currentTs) return prev;
        return saveDeveloperRegistry({
          ...prev,
          ...(data as Partial<DeveloperAccessRegistry>),
          masterActivationCode:
            (data.masterActivationCode as string) || prev.masterActivationCode,
          adminPassword: (data.adminPassword as string) || prev.adminPassword || 'rabbysir',
          isAccessGateEnabled:
            data.isAccessGateEnabled === undefined
              ? prev.isAccessGateEnabled
              : Boolean(data.isAccessGateEnabled),
          requireStrictGmailApproval:
            data.requireStrictGmailApproval === undefined
              ? prev.requireStrictGmailApproval
              : Boolean(data.requireStrictGmailApproval),
          developerProfile:
            (data.developerProfile as DeveloperAccessRegistry['developerProfile']) ||
            prev.developerProfile,
          approvedUsers: Array.isArray(data.approvedUsers)
            ? (data.approvedUsers as DeveloperAccessRegistry['approvedUsers'])
            : prev.approvedUsers,
          deletedUserEmails: Array.isArray(data.deletedUserEmails)
            ? (data.deletedUserEmails as string[])
            : prev.deletedUserEmails || [],
          updatedAtISO: (data.updatedAtISO as string) || new Date().toISOString(),
        });
      });
    };

    try {
      unsub1 = onSnapshot(
        doc(db, 'admin_registry', 'approved_users'),
        (snap) => {
          if (snap.exists()) applyRegistryData(snap.data(), snap.metadata.hasPendingWrites);
        },
        () => {}
      );
      unsub2 = onSnapshot(
        doc(db, 'users', '_developer_registry_'),
        (snap) => {
          if (snap.exists()) applyRegistryData(snap.data(), snap.metadata.hasPendingWrites);
        },
        () => {}
      );
    } catch {
      // ignore
    }

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, []);

  useEffect(() => {
    const deletedList = developerRegistry.deletedUserEmails || [];
    for (const delEmail of deletedList) {
      if (delEmail && delEmail.trim()) {
        purgeDeletedUserLocalCache(delEmail);
      }
    }

    if (!isLoggedOutRef.current && activeAccountEmail) {
      const isDeleted = isUserEmailDeletedInRegistry(developerRegistry, activeAccountEmail);
      const isBlocked = isUserEmailBlockedInRegistry(developerRegistry, activeAccountEmail);
      if (isDeleted || isBlocked) {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
        if (isDeleted) {
          purgeDeletedUserLocalCache(activeAccountEmail);
        }
        isLoggedOutRef.current = true;
        setExplicitLoggedOutState(true, '');
        setActiveUserEmail(null);
        setInstantUser(null);
        setIsAdminViewingUserShop(false);
        if (isDeleted) {
          setDeviceActivated(false);
          setDeviceActivatedState(false);
          setOfflineQueue((prev) =>
            prev.filter((item) => item.docId !== getFirestoreDocId(activeAccountEmail))
          );
        }
        try {
          localStorage.removeItem(STORAGE_KEYS.INSTANT_USER);
        } catch {
          // ignore
        }
        signOut(auth).catch(() => {});
        setProducts([]);
        setCustomers([]);
        setSales([]);
        setExpenses([]);
        setExtraIncomes([]);
        setStaffList([]);
        setDeletedIds({});
        setShopProfile({ ...DEFAULT_SHOP_PROFILE, ownerEmail: '', workingCapital: 0 });
        const msg = isBlocked
          ? 'আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে'
          : 'আপনার অ্যাকাউন্টটি অ্যাডমিন কর্তৃক মুছে ফেলা হয়েছে।';
        setAuthError(msg);
        setCloudStatusNotice(null);
        notify(msg, 'rose');
        setActiveTab('auth');
      }
    }
  }, [developerRegistry, activeAccountEmail, notify]);

  const handleUpdateDeveloperRegistry = useCallback(
    async (next: DeveloperAccessRegistry) => {
      const saved = saveDeveloperRegistry({
        ...next,
        updatedAtISO: new Date().toISOString(),
      });
      setDeveloperRegistry(saved);
      try {
        const payload = { ...stripUndefinedDeep(saved), updatedAt: serverTimestamp() };
        await Promise.all([
          setDoc(doc(db, 'admin_registry', 'approved_users'), payload, { merge: true }),
          setDoc(doc(db, 'users', '_developer_registry_'), payload, { merge: true }),
        ]);
      } catch {
        // ignore
      }
    },
    []
  );

  const enqueueOfflineSync = useCallback(
    (
      collectionName: OfflineSyncItem['collection'],
      action: OfflineSyncItem['action'],
      docId: string,
      payload?: Record<string, unknown>
    ) => {
      setOfflineQueue((prev) => [
        ...prev.filter((i) => i.collection !== collectionName || i.docId !== docId),
        {
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          collection: collectionName,
          action,
          docId,
          payload: payload ? stripUndefinedDeep(payload) : undefined,
          queuedAtISO: new Date().toISOString(),
        },
      ]);
    },
    []
  );

  useEffect(() => {
    if (isHydratedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
      } catch {
        // ignore
      }
    }
  }, [offlineQueue]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsub();
  }, []);

  const persistUserSnapshotEverywhere = useCallback(
    async (
      email: string,
      data: {
        shopProfile: ShopProfile;
        products: Product[];
        customers: Customer[];
        sales: SaleRecord[];
        expenses: ExpenseRecord[];
        extraIncomes?: ExtraIncomeRecord[];
        staff?: StaffMember[];
        deletedIds?: Record<string, string>;
      }
    ) => {
      if (!isHydratedRef.current || isLoggedOutRef.current) return;
      const cleanEmail = (email || 'skillwave.pro@gmail.com').trim().toLowerCase();
      if (isUserEmailDeletedInRegistry(developerRegistry, cleanEmail)) {
        purgeDeletedUserLocalCache(cleanEmail);
        return;
      }

      const docId = getFirestoreDocId(cleanEmail);
      const nowMs = Date.now();
      const nowISO = new Date(nowMs).toISOString();
      lastTimestampISORef.current = nowISO;
      lastModifiedMsRef.current = nowMs;

      const nextProfile: ShopProfile = {
        ...data.shopProfile,
        ownerId: data.shopProfile.ownerId || docId,
        ownerEmail: cleanEmail,
        priceCodeKey: sanitizePriceCodeKey(data.shopProfile.priceCodeKey),
      };
      const cleanSales = sanitizeAndSortSales(data.sales);
      const nextExtraIncomes = data.extraIncomes ?? liveStateRef.current.extraIncomes;
      const nextStaff = data.staff ?? liveStateRef.current.staffList;
      const nextDeletedIds = data.deletedIds ?? liveStateRef.current.deletedIds;

      const nextLive = {
        shopProfile: nextProfile,
        products: data.products,
        customers: data.customers,
        sales: cleanSales,
        expenses: data.expenses,
        extraIncomes: nextExtraIncomes,
        staffList: nextStaff,
        deletedIds: nextDeletedIds,
      };
      liveStateRef.current = nextLive;
      lastSavedSignatureRef.current = computeSnapshotContentSignature(nextLive);

      const accountsMap = safeLoadJSON<Record<string, { email: string; password?: string }>>(
        STORAGE_KEYS.ACCOUNTS,
        {}
      );
      const regUser = developerRegistry.approvedUsers.find(
        (u) => u.email.trim().toLowerCase() === cleanEmail
      );
      const knownPassword =
        accountsMap[docId]?.password || regUser?.authPassword || regUser?.passcode;

      const snapshotToSave: UserAccountDataSnapshot = stripUndefinedDeep({
        version: 5,
        email: cleanEmail,
        accountEmail: cleanEmail,
        ...(knownPassword ? { authPassword: knownPassword } : {}),
        updatedAtISO: nowISO,
        lastModifiedAt: nowMs,
        shopProfile: nextProfile,
        products: data.products,
        customers: data.customers,
        sales: cleanSales,
        expenses: data.expenses,
        extraIncomes: nextExtraIncomes,
        staff: nextStaff,
        deletedIds: nextDeletedIds,
      });

      saveUserAccountDataSnapshot(cleanEmail, snapshotToSave);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineSync(
          'users',
          'upsert',
          docId,
          snapshotToSave as unknown as Record<string, unknown>
        );
        enqueueOfflineSync(
          'shops',
          'upsert',
          docId,
          snapshotToSave as unknown as Record<string, unknown>
        );
        return;
      }

      try {
        const cloudPayload = { ...snapshotToSave, updatedAt: serverTimestamp() };
        await Promise.all([
          setDoc(doc(db, 'users', docId), cloudPayload, { merge: true }),
          setDoc(doc(db, 'shops', docId), cloudPayload, { merge: true }),
          setDoc(doc(db, 'shops', cleanEmail), cloudPayload, { merge: true }),
        ]);
        setIsOnline(true);
        setLastCloudSyncTime(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
        setOfflineQueue((prev) =>
          prev.length === 0
            ? prev
            : prev.filter(
                (item) =>
                  (item.collection !== 'users' && item.collection !== 'shops') ||
                  (item.docId !== docId && item.docId !== cleanEmail)
              )
        );
      } catch {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          enqueueOfflineSync(
            'users',
            'upsert',
            docId,
            snapshotToSave as unknown as Record<string, unknown>
          );
          enqueueOfflineSync(
            'shops',
            'upsert',
            docId,
            snapshotToSave as unknown as Record<string, unknown>
          );
        }
      }
    },
    [developerRegistry, enqueueOfflineSync]
  );

  useEffect(() => {
    if (!isHydratedRef.current || isLoggedOutRef.current || isSwitchingAccountRef.current) return;
    const ownerEmail = (shopProfile.ownerEmail || '').trim().toLowerCase();
    if (
      !ownerEmail ||
      ownerEmail !== activeAccountEmail ||
      isUserEmailDeletedInRegistry(developerRegistry, activeAccountEmail)
    ) {
      return;
    }

    const sanitizedKey = sanitizePriceCodeKey(shopProfile.priceCodeKey);
    if (sanitizedKey !== shopProfile.priceCodeKey) {
      setShopProfile((prev) => ({ ...prev, priceCodeKey: sanitizedKey }));
      return;
    }

    const docId = getFirestoreDocId(activeAccountEmail);
    const nextProfile: ShopProfile = {
      ...shopProfile,
      ownerId: shopProfile.ownerId || docId,
      ownerEmail: activeAccountEmail,
      priceCodeKey: sanitizedKey,
    };

    const nextSig = computeSnapshotContentSignature({
      shopProfile: nextProfile,
      products,
      customers,
      sales,
      expenses,
      extraIncomes,
      staffList,
      deletedIds,
    });
    if (nextSig === lastSavedSignatureRef.current) return;
    lastSavedSignatureRef.current = nextSig;

    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();
    lastTimestampISORef.current = nowISO;
    lastModifiedMsRef.current = nowMs;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (
        !isHydratedRef.current ||
        isLoggedOutRef.current ||
        isSwitchingAccountRef.current ||
        isUserEmailDeletedInRegistry(developerRegistry, activeAccountEmail)
      ) {
        return;
      }

      const accountsMap = safeLoadJSON<Record<string, { email: string; password?: string }>>(
        STORAGE_KEYS.ACCOUNTS,
        {}
      );
      const regUser = developerRegistry.approvedUsers.find(
        (u) => u.email.trim().toLowerCase() === activeAccountEmail
      );
      const knownPassword =
        accountsMap[docId]?.password || regUser?.authPassword || regUser?.passcode;

      const snapshotToSave: UserAccountDataSnapshot = stripUndefinedDeep({
        version: 5,
        email: activeAccountEmail,
        accountEmail: activeAccountEmail,
        ...(knownPassword ? { authPassword: knownPassword } : {}),
        updatedAtISO: nowISO,
        lastModifiedAt: nowMs,
        shopProfile: nextProfile,
        products,
        customers,
        sales,
        expenses,
        extraIncomes,
        staff: staffList,
        deletedIds,
      });

      const saved = saveUserAccountDataSnapshot(activeAccountEmail, snapshotToSave);
      if (saved.isDefaultFallback && activeAccountEmail !== 'skillwave.pro@gmail.com') return;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineSync(
          'users',
          'upsert',
          docId,
          snapshotToSave as unknown as Record<string, unknown>
        );
        enqueueOfflineSync(
          'shops',
          'upsert',
          docId,
          snapshotToSave as unknown as Record<string, unknown>
        );
        return;
      }

      const cloudPayload = { ...snapshotToSave, updatedAt: serverTimestamp() };
      Promise.all([
        setDoc(doc(db, 'users', docId), cloudPayload, { merge: true }),
        setDoc(doc(db, 'shops', docId), cloudPayload, { merge: true }),
        setDoc(doc(db, 'shops', activeAccountEmail), cloudPayload, { merge: true }),
      ])
        .then(() => {
          setIsOnline(true);
          setLastCloudSyncTime(
            new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
          setOfflineQueue((prev) =>
            prev.length === 0
              ? prev
              : prev.filter(
                  (item) =>
                    (item.collection !== 'users' && item.collection !== 'shops') ||
                    (item.docId !== docId && item.docId !== activeAccountEmail)
                )
          );
        })
        .catch(() => {});
    }, 120);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    developerRegistry,
    activeAccountEmail,
    shopProfile,
    products,
    customers,
    sales,
    expenses,
    extraIncomes,
    staffList,
    deletedIds,
    enqueueOfflineSync,
  ]);

  const flushOfflineQueue = useCallback(async () => {
    if (
      (typeof navigator === 'undefined' || navigator.onLine) &&
      isHydratedRef.current &&
      !isLoggedOutRef.current
    ) {
      setIsCloudSyncing(true);
      try {
        const email =
          currentUser?.email ||
          liveStateRef.current.shopProfile.ownerEmail ||
          'skillwave.pro@gmail.com';
        if (!isUserEmailDeletedInRegistry(developerRegistry, email)) {
          await persistUserSnapshotEverywhere(email, {
            shopProfile: liveStateRef.current.shopProfile,
            products: liveStateRef.current.products,
            customers: liveStateRef.current.customers,
            sales: liveStateRef.current.sales,
            expenses: liveStateRef.current.expenses,
            extraIncomes: liveStateRef.current.extraIncomes,
            staff: liveStateRef.current.staffList,
            deletedIds: liveStateRef.current.deletedIds,
          });
        }
        if (offlineQueue.length > 0) {
          for (const item of offlineQueue) {
            try {
              if (item.action === 'delete') {
                await deleteDoc(doc(db, item.collection, item.docId));
              } else if (item.payload) {
                await setDoc(
                  doc(db, item.collection, item.docId),
                  { ...item.payload, updatedAt: serverTimestamp() },
                  { merge: true }
                );
              }
            } catch {
              // ignore
            }
          }
          setOfflineQueue([]);
        }
      } finally {
        setIsCloudSyncing(false);
      }
    }
  }, [currentUser, developerRegistry, offlineQueue, persistUserSnapshotEverywhere]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && isHydratedRef.current && !isLoggedOutRef.current) {
      const t = setTimeout(() => {
        flushOfflineQueue();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isOnline, offlineQueue.length, flushOfflineQueue]);

  useEffect(() => {
    let active = true;
    const probeConnectivity = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (active) setIsOnline(false);
        return;
      }
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3500);
        await fetch('https://www.gstatic.com/generate_204', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (active) setIsOnline(true);
      } catch {
        if (active && typeof navigator !== 'undefined') {
          setIsOnline(navigator.onLine);
        }
      }
    };
    probeConnectivity();
    const interval = setInterval(() => {
      probeConnectivity();
    }, 25000);

    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      notify('অফলাইন মোড চালু — আপনার সকল এন্ট্রি লোকাল মেমরিতে সেভ হচ্ছে', 'amber');
    };
    const handleFocus = () => {
      probeConnectivity();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [flushOfflineQueue, notify]);

  useEffect(() => {
    const flushLocalImmediate = () => {
      if (!isHydratedRef.current || isLoggedOutRef.current || isSwitchingAccountRef.current) return;
      const cur = liveStateRef.current;
      const email = (cur.shopProfile.ownerEmail || '').trim().toLowerCase();
      if (!email || !email.includes('@') || isUserEmailDeletedInRegistry(loadDeveloperRegistry(), email)) {
        return;
      }
      const ts = lastModifiedMsRef.current || Date.now();
      saveUserAccountDataSnapshot(email, {
        version: 5,
        email,
        accountEmail: email,
        updatedAtISO: new Date(ts).toISOString(),
        lastModifiedAt: ts,
        shopProfile: {
          ...cur.shopProfile,
          ownerEmail: email,
          priceCodeKey: sanitizePriceCodeKey(cur.shopProfile.priceCodeKey),
        },
        products: cur.products,
        customers: cur.customers,
        sales: sanitizeAndSortSales(cur.sales),
        expenses: cur.expenses,
        extraIncomes: cur.extraIncomes,
        staff: cur.staffList,
        deletedIds: cur.deletedIds,
      });
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushLocalImmediate();
      }
    };
    window.addEventListener('pagehide', flushLocalImmediate);
    window.addEventListener('beforeunload', flushLocalImmediate);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flushLocalImmediate);
      window.removeEventListener('beforeunload', flushLocalImmediate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const cleanEmail = (activeAccountEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || isLoggedOutRef.current) {
      setIsCloudSyncing(false);
      return;
    }

    const docId = getFirestoreDocId(cleanEmail);
    let unsubUser: (() => void) | undefined;
    let unsubShopId: (() => void) | undefined;
    let unsubShopEmail: (() => void) | undefined;

    const applyIncomingCloudData = (raw: Record<string, unknown>) => {
      if (!raw || isLoggedOutRef.current || isSwitchingAccountRef.current) return;
      setIsOnline(true);
      const incomingTs = getSnapshotTimestampMs(raw);
      const isRecentLocalWrite = Date.now() - lastModifiedMsRef.current < 1500;
      if (
        (lastModifiedMsRef.current > 0 && incomingTs > 0 && incomingTs < lastModifiedMsRef.current) ||
        (isRecentLocalWrite && incomingTs > 0 && incomingTs <= lastModifiedMsRef.current)
      ) {
        return;
      }

      const merged = mergeTwoAccountSnapshots(
        {
          version: 5,
          email: cleanEmail,
          accountEmail: cleanEmail,
          updatedAtISO: lastTimestampISORef.current,
          lastModifiedAt: lastModifiedMsRef.current,
          shopProfile: liveStateRef.current.shopProfile,
          products: liveStateRef.current.products,
          customers: liveStateRef.current.customers,
          sales: liveStateRef.current.sales,
          expenses: liveStateRef.current.expenses,
          extraIncomes: liveStateRef.current.extraIncomes,
          staff: liveStateRef.current.staffList,
          deletedIds: liveStateRef.current.deletedIds,
        },
        raw,
        isRecentLocalWrite
      );

      const cleanSales = sanitizeAndSortSales(merged.sales);
      const nextProfile: ShopProfile = {
        ...merged.shopProfile,
        ownerId: merged.shopProfile.ownerId || docId,
        ownerEmail: cleanEmail,
        priceCodeKey: sanitizePriceCodeKey(merged.shopProfile.priceCodeKey),
      };

      if (
        JSON.stringify(nextProfile) === JSON.stringify(liveStateRef.current.shopProfile) &&
        JSON.stringify(merged.products) === JSON.stringify(liveStateRef.current.products) &&
        JSON.stringify(cleanSales) === JSON.stringify(liveStateRef.current.sales) &&
        JSON.stringify(merged.expenses) === JSON.stringify(liveStateRef.current.expenses) &&
        JSON.stringify(merged.customers) === JSON.stringify(liveStateRef.current.customers) &&
        JSON.stringify(merged.extraIncomes) === JSON.stringify(liveStateRef.current.extraIncomes) &&
        JSON.stringify(merged.staff) === JSON.stringify(liveStateRef.current.staffList)
      ) {
        if (merged.lastModifiedAt && merged.lastModifiedAt > lastModifiedMsRef.current) {
          lastModifiedMsRef.current = merged.lastModifiedAt;
          lastTimestampISORef.current =
            merged.updatedAtISO || new Date(merged.lastModifiedAt).toISOString();
        }
        return;
      }

      if (merged.lastModifiedAt && merged.lastModifiedAt > 0) {
        lastModifiedMsRef.current = merged.lastModifiedAt;
      }
      if (merged.updatedAtISO) {
        lastTimestampISORef.current = merged.updatedAtISO;
      }
      setLastCloudSyncTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      const nextLive = {
        shopProfile: nextProfile,
        products: merged.products,
        customers: merged.customers,
        sales: cleanSales,
        expenses: merged.expenses,
        extraIncomes: merged.extraIncomes,
        staffList: merged.staff,
        deletedIds: merged.deletedIds || {},
      };
      liveStateRef.current = nextLive;
      lastSavedSignatureRef.current = computeSnapshotContentSignature(nextLive);

      setShopProfile(nextProfile);
      setProducts(merged.products);
      setCustomers(merged.customers);
      setSales(cleanSales);
      setExpenses(merged.expenses);
      setExtraIncomes(merged.extraIncomes);
      setStaffList(merged.staff);
      setDeletedIds(merged.deletedIds || {});

      saveUserAccountDataSnapshot(cleanEmail, {
        ...merged,
        shopProfile: nextProfile,
        sales: cleanSales,
      });
    };

    try {
      unsubUser = onSnapshot(
        doc(db, 'users', docId),
        (snap) => {
          if (snap.exists()) applyIncomingCloudData(snap.data());
        },
        () => {}
      );
      unsubShopId = onSnapshot(
        doc(db, 'shops', docId),
        (snap) => {
          if (snap.exists()) applyIncomingCloudData(snap.data());
        },
        () => {}
      );
      unsubShopEmail = onSnapshot(
        doc(db, 'shops', cleanEmail),
        (snap) => {
          if (snap.exists()) applyIncomingCloudData(snap.data());
        },
        () => {}
      );
    } catch {
      // ignore
    }

    const pollCloudMirror = async () => {
      if (
        isLoggedOutRef.current ||
        isSwitchingAccountRef.current ||
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        Date.now() - lastModifiedMsRef.current < 1500
      ) {
        return;
      }
      try {
        const [uDoc, sIdDoc, sEmailDoc] = await Promise.all([
          safeGetDocWithTimeout(doc(db, 'users', docId), 3500),
          safeGetDocWithTimeout(doc(db, 'shops', docId), 3500),
          safeGetDocWithTimeout(doc(db, 'shops', cleanEmail), 3500),
        ]);
        const validDocs = [
          uDoc?.exists() ? uDoc.data() : null,
          sIdDoc?.exists() ? sIdDoc.data() : null,
          sEmailDoc?.exists() ? sEmailDoc.data() : null,
        ].filter((d): d is Record<string, unknown> => Boolean(d));
        if (validDocs.length === 0) return;

        validDocs.sort((a, b) => getSnapshotTimestampMs(a) - getSnapshotTimestampMs(b));
        const newest = validDocs[validDocs.length - 1];
        const oldest = validDocs[0];
        applyIncomingCloudData(newest);

        const newestTs = getSnapshotTimestampMs(newest);
        const oldestTs = getSnapshotTimestampMs(oldest);
        if (
          newestTs > 0 &&
          (validDocs.length < 3 || newestTs !== oldestTs) &&
          !isUserEmailDeletedInRegistry(loadDeveloperRegistry(), cleanEmail)
        ) {
          const cur = liveStateRef.current;
          const healPayload = stripUndefinedDeep({
            version: 5,
            email: cleanEmail,
            accountEmail: cleanEmail,
            updatedAtISO: lastTimestampISORef.current,
            lastModifiedAt: lastModifiedMsRef.current,
            shopProfile: cur.shopProfile,
            products: cur.products,
            customers: cur.customers,
            sales: cur.sales,
            expenses: cur.expenses,
            extraIncomes: cur.extraIncomes,
            staff: cur.staffList,
            deletedIds: cur.deletedIds,
            updatedAt: serverTimestamp(),
          });
          Promise.all([
            setDoc(doc(db, 'users', docId), healPayload, { merge: true }),
            setDoc(doc(db, 'shops', docId), healPayload, { merge: true }),
            setDoc(doc(db, 'shops', cleanEmail), healPayload, { merge: true }),
          ]).catch(() => {});
        }
      } catch {
        // ignore
      }
    };

    const pollInterval = setInterval(() => {
      pollCloudMirror();
    }, 2000);
    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        pollCloudMirror();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (unsubUser) unsubUser();
      if (unsubShopId) unsubShopId();
      if (unsubShopEmail) unsubShopEmail();
    };
  }, [activeAccountEmail]);

  const ensureUserInApprovedRegistry = useCallback(
    async (params: {
      email: string;
      passcode?: string;
      authPassword?: string;
      shopName?: string;
      ownerName?: string;
      phone?: string;
      address?: string;
      workingCapital?: number;
      priceCodeKey?: string;
    }) => {
      const cleanEmail = (params.email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) return;

      setDeveloperRegistry((prev) => {
        const existing = prev.approvedUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        const nowISO = new Date().toISOString();
        const code =
          params.passcode ||
          params.authPassword ||
          existing?.passcode ||
          prev.masterActivationCode ||
          'rabbysir';
        const curProfile = liveStateRef.current.shopProfile;
        const isCurrentOwner =
          (curProfile.ownerEmail || '').trim().toLowerCase() === cleanEmail;
        const curProfileTs = (isCurrentOwner && Number(curProfile.profileUpdatedAt)) || 0;
        const regProfileTs = Number(existing?.profileUpdatedAt) || 0;
        const preferCurrentProfile =
          isCurrentOwner && curProfileTs >= regProfileTs && curProfileTs > 0;

        const updatedEntry = {
          email: cleanEmail,
          passcode: code,
          authPassword: params.authPassword || existing?.authPassword || code,
          shopName:
            (preferCurrentProfile ? curProfile.shopName : params.shopName) ||
            params.shopName ||
            existing?.shopName ||
            (isCurrentOwner ? curProfile.shopName : '') ||
            'দোকান প্রোফাইল',
          ownerName:
            (preferCurrentProfile ? curProfile.ownerName : params.ownerName) ||
            params.ownerName ||
            existing?.ownerName ||
            (isCurrentOwner ? curProfile.ownerName : '') ||
            cleanEmail.split('@')[0],
          phone:
            (preferCurrentProfile ? curProfile.phone : params.phone) ||
            params.phone ||
            existing?.phone ||
            (isCurrentOwner ? curProfile.phone : '') ||
            '01800000000',
          address:
            (preferCurrentProfile ? curProfile.address : params.address) ||
            params.address ||
            existing?.address ||
            (isCurrentOwner ? curProfile.address : '') ||
            'সীতাকুণ্ড, চট্টগ্রাম',
          workingCapital:
            params.workingCapital ??
            existing?.workingCapital ??
            (isCurrentOwner ? curProfile.workingCapital : 0) ??
            0,
          priceCodeKey:
            params.priceCodeKey ||
            existing?.priceCodeKey ||
            (isCurrentOwner ? curProfile.priceCodeKey : '') ||
            'XBANGLDESH',
          ...(Math.max(curProfileTs, regProfileTs) > 0
            ? { profileUpdatedAt: Math.max(curProfileTs, regProfileTs) }
            : {}),
          status:
            existing?.status === 'blocked'
              ? ('blocked' as const)
              : ('approved' as const),
          addedAtISO: existing?.addedAtISO || nowISO,
          updatedAtISO: nowISO,
          lastLoginISO: nowISO,
        };

        const nextUsers = existing
          ? prev.approvedUsers.map((u) =>
              u.email.toLowerCase() === cleanEmail ? updatedEntry : u
            )
          : [updatedEntry, ...prev.approvedUsers];
        const nextDeleted = (prev.deletedUserEmails || []).filter(
          (item) => item.trim().toLowerCase() !== cleanEmail
        );
        const saved = saveDeveloperRegistry({
          ...prev,
          approvedUsers: nextUsers,
          deletedUserEmails: nextDeleted,
          updatedAtISO: nowISO,
        });
        const cloudPayload = { ...stripUndefinedDeep(saved), updatedAt: serverTimestamp() };
        setDoc(doc(db, 'admin_registry', 'approved_users'), cloudPayload, { merge: true }).catch(
          () => {}
        );
        setDoc(doc(db, 'users', '_developer_registry_'), cloudPayload, { merge: true }).catch(
          () => {}
        );
        return saved;
      });
    },
    []
  );

  const handleGoogleQuickAuth = async (email: string): Promise<boolean> => {
    setIsSigningIn(true);
    setAuthError(null);
    setCloudStatusNotice(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('সঠিক ইমেইল অ্যাড্রেস লিখুন।');
      setIsSigningIn(false);
      return false;
    }

    isSwitchingAccountRef.current = true;
    try {
      const prevOwner = (liveStateRef.current.shopProfile.ownerEmail || '')
        .trim()
        .toLowerCase();
      if (
        !isLoggedOutRef.current &&
        prevOwner &&
        prevOwner === activeAccountEmail &&
        !isUserEmailDeletedInRegistry(developerRegistry, prevOwner)
      ) {
        saveUserAccountDataSnapshot(prevOwner, {
          version: 5,
          email: prevOwner,
          accountEmail: prevOwner,
          updatedAtISO: new Date().toISOString(),
          shopProfile: liveStateRef.current.shopProfile,
          products: liveStateRef.current.products,
          customers: liveStateRef.current.customers,
          sales: liveStateRef.current.sales,
          expenses: liveStateRef.current.expenses,
          extraIncomes: liveStateRef.current.extraIncomes,
          staff: liveStateRef.current.staffList,
          deletedIds: liveStateRef.current.deletedIds,
        });
      }

      const docId = getFirestoreDocId(cleanEmail);
      let activeRegistry = developerRegistry;
      const [regDoc1, regDoc2, userDoc, shopIdDoc, shopEmailDoc] = await Promise.all([
        safeGetDocWithTimeout(doc(db, 'admin_registry', 'approved_users'), 3500),
        safeGetDocWithTimeout(doc(db, 'users', '_developer_registry_'), 3500),
        safeGetDocWithTimeout(doc(db, 'users', docId), 4500),
        safeGetDocWithTimeout(doc(db, 'shops', docId), 4500),
        safeGetDocWithTimeout(doc(db, 'shops', cleanEmail), 4500),
      ]);
      const cloudRegRaw =
        (regDoc1 && regDoc1.exists() ? regDoc1.data() : null) ||
        (regDoc2 && regDoc2.exists() ? regDoc2.data() : null);
      if (cloudRegRaw) {
        activeRegistry = saveDeveloperRegistry(normalizeDeveloperRegistry(cloudRegRaw));
        setDeveloperRegistry(activeRegistry);
      }

      const regUser = activeRegistry.approvedUsers.find(
        (u) => u.email.trim().toLowerCase() === cleanEmail
      );
      if (regUser && regUser.status === 'blocked') {
        setAuthError('আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে');
        notify('আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে', 'rose');
        return false;
      }

      const wasDeleted = isUserEmailDeletedInRegistry(activeRegistry, cleanEmail);
      let targetSnap: UserAccountDataSnapshot;
      if (wasDeleted) {
        purgeDeletedUserLocalCache(cleanEmail);
        const nowMs = Date.now();
        targetSnap = {
          version: 5,
          email: cleanEmail,
          accountEmail: cleanEmail,
          isDefaultFallback: false,
          updatedAtISO: new Date(nowMs).toISOString(),
          lastModifiedAt: nowMs,
          shopProfile: {
            ...DEFAULT_SHOP_PROFILE,
            ownerId: docId,
            ownerEmail: cleanEmail,
            shopName: 'নতুন দোকান',
            ownerName: cleanEmail.split('@')[0] || 'দোকানদার',
            workingCapital: 0,
            profileUpdatedAt: nowMs,
          },
          products: [],
          customers: [],
          sales: [],
          expenses: [],
          extraIncomes: [],
          staff: [],
          deletedIds: {},
        };
        try {
          const freshPayload = { ...stripUndefinedDeep(targetSnap), updatedAt: serverTimestamp() };
          await Promise.all([
            setDoc(doc(db, 'users', docId), freshPayload),
            setDoc(doc(db, 'shops', docId), freshPayload),
            setDoc(doc(db, 'shops', cleanEmail), freshPayload),
          ]);
        } catch {
          // ignore
        }
      } else {
        targetSnap = loadUserAccountDataSnapshot(cleanEmail, false);
        try {
          const idbSnap = await readIndexedDBSnapshot(`dookanify_master_${cleanEmail}`);
          if (idbSnap) {
            targetSnap = mergeTwoAccountSnapshots(targetSnap, idbSnap);
          }
        } catch {
          // ignore
        }
        setIsCloudSyncing(true);
        const { merged } = reconcileLocalWithCloudDocs(targetSnap, [
          userDoc?.exists() ? userDoc.data() : null,
          shopIdDoc?.exists() ? shopIdDoc.data() : null,
          shopEmailDoc?.exists() ? shopEmailDoc.data() : null,
        ]);
        targetSnap = merged;
      }

      let nextProfile: ShopProfile = {
        ...targetSnap.shopProfile,
        ownerId: docId,
        ownerEmail: cleanEmail,
        priceCodeKey: sanitizePriceCodeKey(targetSnap.shopProfile.priceCodeKey),
      };
      if (!wasDeleted && targetSnap.isDefaultFallback && regUser) {
        nextProfile = {
          ...nextProfile,
          shopName: regUser.shopName || nextProfile.shopName,
          ownerName: regUser.ownerName || nextProfile.ownerName,
          phone: regUser.phone || nextProfile.phone,
          address: regUser.address || nextProfile.address,
          workingCapital:
            typeof regUser.workingCapital === 'number' && regUser.workingCapital > 0
              ? regUser.workingCapital
              : nextProfile.workingCapital,
          priceCodeKey: sanitizePriceCodeKey(regUser.priceCodeKey || nextProfile.priceCodeKey),
          ...(regUser.profileUpdatedAt ? { profileUpdatedAt: regUser.profileUpdatedAt } : {}),
        };
      }

      const tsMs = getSnapshotTimestampMs(targetSnap) || Date.now();
      const finalSnap: UserAccountDataSnapshot = {
        ...targetSnap,
        isDefaultFallback: false,
        email: cleanEmail,
        accountEmail: cleanEmail,
        updatedAtISO: new Date(tsMs).toISOString(),
        lastModifiedAt: tsMs,
        shopProfile: nextProfile,
      };

      applyAccountSnapshotToState(finalSnap, cleanEmail);
      saveUserAccountDataSnapshot(cleanEmail, finalSnap);

      const nextSession: UserAccountSession = {
        uid: docId,
        email: cleanEmail,
        displayName: nextProfile.ownerName || 'রাব্বি',
        mode: 'instant-profile',
      };
      setInstantUser(nextSession);
      try {
        localStorage.setItem(STORAGE_KEYS.INSTANT_USER, JSON.stringify(nextSession));
      } catch {
        // ignore
      }

      setActiveUserEmail(cleanEmail);
      setExplicitLoggedOutState(false, cleanEmail);
      setLastUsedEmail(cleanEmail);
      isLoggedOutRef.current = false;
      isSwitchingAccountRef.current = false;

      await persistUserSnapshotEverywhere(cleanEmail, {
        shopProfile: finalSnap.shopProfile,
        products: finalSnap.products,
        customers: finalSnap.customers,
        sales: finalSnap.sales,
        expenses: finalSnap.expenses,
        extraIncomes: finalSnap.extraIncomes,
        staff: finalSnap.staff,
        deletedIds: finalSnap.deletedIds,
      });

      await ensureUserInApprovedRegistry({
        email: cleanEmail,
        passcode: regUser?.passcode || activeRegistry.masterActivationCode || 'rabbysir',
        authPassword: regUser?.authPassword || regUser?.passcode || 'rabbysir',
        shopName: finalSnap.shopProfile.shopName,
        ownerName: finalSnap.shopProfile.ownerName,
        phone: finalSnap.shopProfile.phone,
        address: finalSnap.shopProfile.address,
        workingCapital: finalSnap.shopProfile.workingCapital,
        priceCodeKey: finalSnap.shopProfile.priceCodeKey,
      });

      setCloudStatusNotice(
        `${cleanEmail} সফলভাবে লগইন হয়েছে এবং সম্পূর্ণ হিসাব পুনরুদ্ধার করা হয়েছে!`
      );
      notify(`${cleanEmail} অ্যাকাউন্ট সংযুক্ত হয়েছে`, 'emerald');
      setActiveTab('dashboard');
      return true;
    } finally {
      isSwitchingAccountRef.current = false;
      setIsCloudSyncing(false);
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (params: {
    mode: 'signin' | 'signup';
    email: string;
    password: string;
    shopName?: string;
    ownerName?: string;
  }): Promise<boolean> => {
    setIsSigningIn(true);
    setAuthError(null);
    setCloudStatusNotice(null);
    const cleanEmail = (params.email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('সঠিক ইমেইল অ্যাড্রেস লিখুন।');
      setIsSigningIn(false);
      return false;
    }

    const docId = getFirestoreDocId(cleanEmail);
    isSwitchingAccountRef.current = true;
    try {
      const prevOwner = (liveStateRef.current.shopProfile.ownerEmail || '')
        .trim()
        .toLowerCase();
      if (
        !isLoggedOutRef.current &&
        prevOwner &&
        prevOwner === activeAccountEmail &&
        !isUserEmailDeletedInRegistry(developerRegistry, prevOwner)
      ) {
        saveUserAccountDataSnapshot(prevOwner, {
          version: 5,
          email: prevOwner,
          accountEmail: prevOwner,
          updatedAtISO: new Date().toISOString(),
          shopProfile: liveStateRef.current.shopProfile,
          products: liveStateRef.current.products,
          customers: liveStateRef.current.customers,
          sales: liveStateRef.current.sales,
          expenses: liveStateRef.current.expenses,
          extraIncomes: liveStateRef.current.extraIncomes,
          staff: liveStateRef.current.staffList,
          deletedIds: liveStateRef.current.deletedIds,
        });
      }

      let activeRegistry = developerRegistry;
      const [regDoc1, regDoc2, userDoc, shopIdDoc, shopEmailDoc] = await Promise.all([
        safeGetDocWithTimeout(doc(db, 'admin_registry', 'approved_users'), 3500),
        safeGetDocWithTimeout(doc(db, 'users', '_developer_registry_'), 3500),
        safeGetDocWithTimeout(doc(db, 'users', docId), 4500),
        safeGetDocWithTimeout(doc(db, 'shops', docId), 4500),
        safeGetDocWithTimeout(doc(db, 'shops', cleanEmail), 4500),
      ]);
      const cloudRegRaw =
        (regDoc1 && regDoc1.exists() ? regDoc1.data() : null) ||
        (regDoc2 && regDoc2.exists() ? regDoc2.data() : null);
      if (cloudRegRaw) {
        activeRegistry = saveDeveloperRegistry(normalizeDeveloperRegistry(cloudRegRaw));
        setDeveloperRegistry(activeRegistry);
      }

      const regUser = activeRegistry.approvedUsers.find(
        (u) => u.email.trim().toLowerCase() === cleanEmail
      );
      if (regUser && regUser.status === 'blocked') {
        setAuthError('আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে');
        notify('আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে', 'rose');
        return false;
      }

      const wasDeleted = isUserEmailDeletedInRegistry(activeRegistry, cleanEmail);
      if (wasDeleted) {
        purgeDeletedUserLocalCache(cleanEmail);
      }

      const accountsMap = safeLoadJSON<Record<string, { email: string; password?: string }>>(
        STORAGE_KEYS.ACCOUNTS,
        {}
      );
      const cloudDocs = wasDeleted
        ? []
        : [
            userDoc?.exists() ? userDoc.data() : null,
            shopIdDoc?.exists() ? shopIdDoc.data() : null,
            shopEmailDoc?.exists() ? shopEmailDoc.data() : null,
          ];
      const cloudAuthPass = cloudDocs.find(
        (d) => d && typeof d.authPassword === 'string' && d.authPassword
      )?.authPassword as string | undefined;

      if (params.mode === 'signin') {
        const localSnap: UserAccountDataSnapshot = wasDeleted
          ? {
              version: 5,
              email: cleanEmail,
              accountEmail: cleanEmail,
              isDefaultFallback: true,
              shopProfile: {
                ...DEFAULT_SHOP_PROFILE,
                ownerId: docId,
                ownerEmail: cleanEmail,
                shopName: 'নতুন দোকান',
                ownerName: cleanEmail.split('@')[0] || 'দোকানদার',
                workingCapital: 0,
                profileUpdatedAt: Date.now(),
              },
              products: [],
              customers: [],
              sales: [],
              expenses: [],
              extraIncomes: [],
              staff: [],
              deletedIds: {},
              updatedAtISO: new Date().toISOString(),
              lastModifiedAt: Date.now(),
            }
          : loadUserAccountDataSnapshot(cleanEmail, false);

        const expectedPassword = wasDeleted
          ? undefined
          : cloudAuthPass ||
            accountsMap[docId]?.password ||
            localSnap.authPassword ||
            regUser?.authPassword ||
            regUser?.passcode ||
            regUser?.accessCode;

        if (
          expectedPassword &&
          expectedPassword !== params.password &&
          params.password.toLowerCase() !== activeRegistry.masterActivationCode.toLowerCase() &&
          params.password.toLowerCase() !== 'rabbysir'
        ) {
          setAuthError('পাসওয়ার্ড সঠিক নয়। সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।');
          return false;
        }

        accountsMap[docId] = { email: cleanEmail, password: params.password };
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accountsMap));
        } catch {
          // ignore
        }

        let mergedSnap = localSnap;
        if (!wasDeleted) {
          try {
            const idbSnap = await readIndexedDBSnapshot(`dookanify_master_${cleanEmail}`);
            if (idbSnap) {
              mergedSnap = mergeTwoAccountSnapshots(mergedSnap, idbSnap);
            }
          } catch {
            // ignore
          }
          const { merged } = reconcileLocalWithCloudDocs(mergedSnap, cloudDocs);
          mergedSnap = merged;
        }

        let nextProfile: ShopProfile = {
          ...mergedSnap.shopProfile,
          ownerId: docId,
          ownerEmail: cleanEmail,
          priceCodeKey: sanitizePriceCodeKey(mergedSnap.shopProfile.priceCodeKey),
        };
        if (!wasDeleted && mergedSnap.isDefaultFallback && regUser) {
          nextProfile = {
            ...nextProfile,
            shopName: regUser.shopName || nextProfile.shopName,
            ownerName: regUser.ownerName || nextProfile.ownerName,
            phone: regUser.phone || nextProfile.phone,
            address: regUser.address || nextProfile.address,
            workingCapital:
              typeof regUser.workingCapital === 'number' && regUser.workingCapital > 0
                ? regUser.workingCapital
                : nextProfile.workingCapital,
            priceCodeKey: sanitizePriceCodeKey(regUser.priceCodeKey || nextProfile.priceCodeKey),
            ...(regUser.profileUpdatedAt ? { profileUpdatedAt: regUser.profileUpdatedAt } : {}),
          };
        }

        const tsMs = getSnapshotTimestampMs(mergedSnap) || Date.now();
        const finalSnap: UserAccountDataSnapshot = {
          ...mergedSnap,
          isDefaultFallback: false,
          email: cleanEmail,
          accountEmail: cleanEmail,
          authPassword: params.password,
          updatedAtISO: new Date(tsMs).toISOString(),
          lastModifiedAt: tsMs,
          shopProfile: nextProfile,
        };

        applyAccountSnapshotToState(finalSnap, cleanEmail);
        saveUserAccountDataSnapshot(cleanEmail, finalSnap);

        const nextSession: UserAccountSession = {
          uid: docId,
          email: cleanEmail,
          displayName: nextProfile.ownerName || 'রাব্বি',
          mode: 'instant-profile',
        };
        setInstantUser(nextSession);
        try {
          localStorage.setItem(STORAGE_KEYS.INSTANT_USER, JSON.stringify(nextSession));
        } catch {
          // ignore
        }

        setActiveUserEmail(cleanEmail);
        setExplicitLoggedOutState(false, cleanEmail);
        setLastUsedEmail(cleanEmail);
        isLoggedOutRef.current = false;
        isSwitchingAccountRef.current = false;

        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const cloudPayload = stripUndefinedDeep({
              version: 5,
              email: cleanEmail,
              accountEmail: cleanEmail,
              authPassword: params.password,
              shopProfile: nextProfile,
              products: finalSnap.products,
              customers: finalSnap.customers,
              sales: sanitizeAndSortSales(finalSnap.sales),
              expenses: finalSnap.expenses,
              extraIncomes: finalSnap.extraIncomes,
              staff: finalSnap.staff,
              deletedIds: finalSnap.deletedIds || {},
              updatedAtISO: new Date(tsMs).toISOString(),
              lastModifiedAt: tsMs,
              updatedAt: serverTimestamp(),
            });
            await Promise.all([
              setDoc(doc(db, 'users', docId), cloudPayload, { merge: !wasDeleted }),
              setDoc(doc(db, 'shops', docId), cloudPayload, { merge: !wasDeleted }),
              setDoc(doc(db, 'shops', cleanEmail), cloudPayload, { merge: !wasDeleted }),
            ]);
          } catch {
            // ignore
          }
        } else {
          enqueueOfflineSync(
            'users',
            'upsert',
            docId,
            finalSnap as unknown as Record<string, unknown>
          );
        }

        await ensureUserInApprovedRegistry({
          email: cleanEmail,
          authPassword: params.password,
          passcode: params.password,
          shopName: nextProfile.shopName,
          ownerName: nextProfile.ownerName,
          phone: nextProfile.phone,
          address: nextProfile.address,
          workingCapital: nextProfile.workingCapital,
          priceCodeKey: nextProfile.priceCodeKey,
        });

        setCloudStatusNotice(`${cleanEmail} অ্যাকাউন্টে সফলভাবে লগইন হয়েছে!`);
        notify(`${cleanEmail} অ্যাকাউন্টে লগইন সম্পন্ন`, 'emerald');
        setActiveTab('dashboard');
        return true;
      } else {
        const isDeletedUser = isUserEmailDeletedInRegistry(activeRegistry, cleanEmail);
        if (isDeletedUser) {
          purgeDeletedUserLocalCache(cleanEmail);
        }
        let existingSnap: UserAccountDataSnapshot = isDeletedUser
          ? {
              version: 5,
              email: cleanEmail,
              accountEmail: cleanEmail,
              isDefaultFallback: true,
              shopProfile: { ...DEFAULT_SHOP_PROFILE, workingCapital: 0 },
              products: [],
              customers: [],
              sales: [],
              expenses: [],
              extraIncomes: [],
              staff: [],
              deletedIds: {},
              updatedAtISO: '1970-01-01T00:00:00.000Z',
            }
          : loadUserAccountDataSnapshot(cleanEmail, false);

        if (!isDeletedUser) {
          try {
            const idbSnap = await readIndexedDBSnapshot(`dookanify_master_${cleanEmail}`);
            if (idbSnap) {
              existingSnap = mergeTwoAccountSnapshots(existingSnap, idbSnap);
            }
          } catch {
            // ignore
          }
          const { merged } = reconcileLocalWithCloudDocs(existingSnap, cloudDocs);
          existingSnap = merged;
        }

        const hasExistingData =
          !isDeletedUser &&
          (!existingSnap.isDefaultFallback ||
            existingSnap.products.length > 0 ||
            existingSnap.sales.length > 0 ||
            existingSnap.expenses.length > 0 ||
            existingSnap.customers.length > 0 ||
            existingSnap.extraIncomes.length > 0 ||
            existingSnap.staff.length > 0 ||
            (existingSnap.shopProfile.workingCapital || 0) > 0 ||
            (existingSnap.shopProfile.profileUpdatedAt || 0) > 0);

        const nowMs = Date.now();
        const customShop = (params.shopName || '').trim();
        const customOwner = (params.ownerName || '').trim();
        const nextProfile: ShopProfile = {
          ...DEFAULT_SHOP_PROFILE,
          ...(hasExistingData ? existingSnap.shopProfile : {}),
          ownerId: docId,
          ownerEmail: cleanEmail,
          shopName:
            customShop ||
            (hasExistingData ? existingSnap.shopProfile.shopName : '') ||
            'সোনার বাংলা বস্ত্রালয় অ্যান্ড ফ্যাশন হাউস',
          ownerName:
            customOwner ||
            (hasExistingData ? existingSnap.shopProfile.ownerName : '') ||
            'রাব্বি',
          phone: (hasExistingData ? existingSnap.shopProfile.phone : '') || '01843373523',
          address:
            (hasExistingData ? existingSnap.shopProfile.address : '') || 'সীতাকুণ্ড, চট্টগ্রাম',
          priceCodeKey: sanitizePriceCodeKey(
            hasExistingData ? existingSnap.shopProfile.priceCodeKey : DEFAULT_PRICE_CODE_KEY
          ),
          workingCapital: hasExistingData ? existingSnap.shopProfile.workingCapital : 0,
          profileUpdatedAt: nowMs,
        };

        accountsMap[docId] = { email: cleanEmail, password: params.password };
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accountsMap));
        } catch {
          // ignore
        }

        const nextProds = hasExistingData ? existingSnap.products : [];
        const nextCusts = hasExistingData ? existingSnap.customers : [];
        const nextSales = hasExistingData ? sanitizeAndSortSales(existingSnap.sales) : [];
        const nextExps = hasExistingData ? existingSnap.expenses : [];
        const nextIncs = hasExistingData ? existingSnap.extraIncomes : [];
        const nextStaff = hasExistingData ? existingSnap.staff : [];
        const nextDeleted = (hasExistingData && existingSnap.deletedIds) || {};

        const finalSnap: UserAccountDataSnapshot = {
          version: 5,
          isDefaultFallback: false,
          email: cleanEmail,
          accountEmail: cleanEmail,
          authPassword: params.password,
          updatedAtISO: new Date(nowMs).toISOString(),
          lastModifiedAt: nowMs,
          shopProfile: nextProfile,
          products: nextProds,
          customers: nextCusts,
          sales: nextSales,
          expenses: nextExps,
          extraIncomes: nextIncs,
          staff: nextStaff,
          deletedIds: nextDeleted,
        };

        applyAccountSnapshotToState(finalSnap, cleanEmail);
        saveUserAccountDataSnapshot(cleanEmail, finalSnap);

        const nextSession: UserAccountSession = {
          uid: docId,
          email: cleanEmail,
          displayName: nextProfile.ownerName,
          mode: 'instant-profile',
        };
        setInstantUser(nextSession);
        try {
          localStorage.setItem(STORAGE_KEYS.INSTANT_USER, JSON.stringify(nextSession));
        } catch {
          // ignore
        }

        setActiveUserEmail(cleanEmail);
        setExplicitLoggedOutState(false, cleanEmail);
        setLastUsedEmail(cleanEmail);
        isLoggedOutRef.current = false;
        isSwitchingAccountRef.current = false;

        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const cloudPayload = stripUndefinedDeep({
              version: 5,
              email: cleanEmail,
              accountEmail: cleanEmail,
              authPassword: params.password,
              shopProfile: nextProfile,
              products: nextProds,
              customers: nextCusts,
              sales: nextSales,
              expenses: nextExps,
              extraIncomes: nextIncs,
              staff: nextStaff,
              deletedIds: nextDeleted,
              updatedAtISO: new Date(nowMs).toISOString(),
              lastModifiedAt: nowMs,
              updatedAt: serverTimestamp(),
            });
            await Promise.all([
              setDoc(doc(db, 'users', docId), cloudPayload, { merge: !isDeletedUser }),
              setDoc(doc(db, 'shops', docId), cloudPayload, { merge: !isDeletedUser }),
              setDoc(doc(db, 'shops', cleanEmail), cloudPayload, { merge: !isDeletedUser }),
            ]);
          } catch {
            // ignore
          }
        } else {
          enqueueOfflineSync(
            'users',
            'upsert',
            docId,
            finalSnap as unknown as Record<string, unknown>
          );
        }

        await ensureUserInApprovedRegistry({
          email: cleanEmail,
          authPassword: params.password,
          passcode: params.password,
          shopName: nextProfile.shopName,
          ownerName: nextProfile.ownerName,
          phone: nextProfile.phone,
          address: nextProfile.address,
          workingCapital: nextProfile.workingCapital,
          priceCodeKey: nextProfile.priceCodeKey,
        });

        setCloudStatusNotice(`নতুন অ্যাকাউন্ট (${cleanEmail}) সফলভাবে তৈরি হয়েছে!`);
        notify('নতুন দোকান অ্যাকাউন্ট তৈরি হয়েছে', 'emerald');
        setActiveTab('dashboard');
        return true;
      }
    } finally {
      isSwitchingAccountRef.current = false;
      setIsSigningIn(false);
    }
  };

  const handleGoogleLoginFromSetup = async () => {
    const email =
      currentUser?.email ||
      (shopProfile.ownerEmail && shopProfile.ownerEmail.includes('@')
        ? shopProfile.ownerEmail
        : '') ||
      lastUsedEmail;
    if (email) {
      await handleGoogleQuickAuth(email);
    } else {
      setIsShopSetupOpen(false);
      setActiveTab('auth');
    }
  };

  const handleLogout = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const emailToSave = (
      currentUser?.email ||
      liveStateRef.current.shopProfile.ownerEmail ||
      activeAccountEmail ||
      ''
    )
      .trim()
      .toLowerCase();
    const curOwner = (liveStateRef.current.shopProfile.ownerEmail || '').trim().toLowerCase();
    if (
      !isLoggedOutRef.current &&
      emailToSave &&
      emailToSave.includes('@') &&
      (!curOwner || curOwner === emailToSave)
    ) {
      const ts = lastModifiedMsRef.current || Date.now();
      saveUserAccountDataSnapshot(emailToSave, {
        version: 5,
        email: emailToSave,
        accountEmail: emailToSave,
        updatedAtISO: new Date(ts).toISOString(),
        lastModifiedAt: ts,
        shopProfile: { ...liveStateRef.current.shopProfile, ownerEmail: emailToSave },
        products: liveStateRef.current.products,
        customers: liveStateRef.current.customers,
        sales: sanitizeAndSortSales(liveStateRef.current.sales),
        expenses: liveStateRef.current.expenses,
        extraIncomes: liveStateRef.current.extraIncomes,
        staff: liveStateRef.current.staffList,
        deletedIds: liveStateRef.current.deletedIds,
      });
    }

    isLoggedOutRef.current = true;
    setExplicitLoggedOutState(true, emailToSave);
    if (emailToSave) setLastUsedEmail(emailToSave);
    setActiveUserEmail(null);
    setAuthError(null);
    setCloudStatusNotice(
      'লগআউট সম্পন্ন — আপনার সকল হিসাব সুরক্ষিত আছে। পুনরায় একই জিমেইল দিয়ে লগইন করলে ১০০% ডাটা ফিরে আসবে।'
    );
    setInstantUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.INSTANT_USER);
    } catch {
      // ignore
    }
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    const blankProfile: ShopProfile = {
      ...DEFAULT_SHOP_PROFILE,
      ownerEmail: '',
      workingCapital: 0,
    };
    liveStateRef.current = {
      shopProfile: blankProfile,
      products: [],
      customers: [],
      sales: [],
      expenses: [],
      extraIncomes: [],
      staffList: [],
      deletedIds: {},
    };
    setProducts([]);
    setCustomers([]);
    setSales([]);
    setExpenses([]);
    setExtraIncomes([]);
    setStaffList([]);
    setDeletedIds({});
    setShopProfile(blankProfile);
    notify(
      'লগআউট সম্পন্ন — স্ক্রিন ক্লিয়ার করা হয়েছে (আপনার ডাটা সুরক্ষিত আছে)',
      'amber'
    );
    setActiveTab('auth');
  };

  const handlePushToCloud = async () => {
    setIsCloudSyncing(true);
    setAuthError(null);
    setCloudStatusNotice(null);
    try {
      const email =
        currentUser?.email || shopProfile.ownerEmail || 'skillwave.pro@gmail.com';
      isLoggedOutRef.current = false;
      if (!currentUser) {
        await handleGoogleQuickAuth(email);
      }
      const cur = {
        shopProfile: {
          ...liveStateRef.current.shopProfile,
          priceCodeKey: sanitizePriceCodeKey(liveStateRef.current.shopProfile.priceCodeKey),
        },
        products: liveStateRef.current.products,
        customers: liveStateRef.current.customers,
        sales: liveStateRef.current.sales,
        expenses: liveStateRef.current.expenses,
        extraIncomes: liveStateRef.current.extraIncomes,
        staff: liveStateRef.current.staffList,
      };
      await persistUserSnapshotEverywhere(email, {
        ...cur,
        deletedIds: liveStateRef.current.deletedIds,
      });
      setCloudStatusNotice(
        `সকল ডেটা সফলভাবে ক্লাউডে (users/${getFirestoreDocId(email)}) সেভ করা হয়েছে!`
      );
      notify('ক্লাউডে ব্যাকআপ সেভ সম্পন্ন', 'emerald');
    } catch {
      setAuthError('ক্লাউডে সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsCloudSyncing(true);
    setAuthError(null);
    setCloudStatusNotice(null);
    try {
      const email = (
        currentUser?.email ||
        shopProfile.ownerEmail ||
        'skillwave.pro@gmail.com'
      )
        .trim()
        .toLowerCase();
      const docId = getFirestoreDocId(email);
      isLoggedOutRef.current = false;

      let localSnap = loadUserAccountDataSnapshot(email, false);
      try {
        const idbSnap = await readIndexedDBSnapshot(`dookanify_master_${email}`);
        if (idbSnap) {
          localSnap = mergeTwoAccountSnapshots(localSnap, idbSnap);
        }
      } catch {
        // ignore
      }

      const [uDoc, sIdDoc, sEmailDoc] = await Promise.all([
        safeGetDocWithTimeout(doc(db, 'users', docId), 4500),
        safeGetDocWithTimeout(doc(db, 'shops', docId), 4500),
        safeGetDocWithTimeout(doc(db, 'shops', email), 4500),
      ]);
      const { merged, cloudFound } = reconcileLocalWithCloudDocs(localSnap, [
        uDoc?.exists() ? uDoc.data() : null,
        sIdDoc?.exists() ? sIdDoc.data() : null,
        sEmailDoc?.exists() ? sEmailDoc.data() : null,
      ]);

      if (
        cloudFound ||
        !merged.isDefaultFallback ||
        merged.products.length > 0 ||
        merged.sales.length > 0 ||
        merged.expenses.length > 0
      ) {
        applyAccountSnapshotToState(merged, email);
        saveUserAccountDataSnapshot(email, merged);
        await persistUserSnapshotEverywhere(email, {
          shopProfile: merged.shopProfile,
          products: merged.products,
          customers: merged.customers,
          sales: merged.sales,
          expenses: merged.expenses,
          extraIncomes: merged.extraIncomes,
          staff: merged.staff,
          deletedIds: merged.deletedIds,
        });
        setLastCloudSyncTime(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
        setCloudStatusNotice(
          `ক্লাউড ও লোকাল ভল্ট (shops/${email}) থেকে সকল ডেটা সফলভাবে সিঙ্ক ও রিস্টোর করা হয়েছে!`
        );
        notify(`ক্লাউড সিঙ্ক সম্পন্ন (${merged.shopProfile.shopName})`, 'emerald');
      } else {
        setCloudStatusNotice(
          'ক্লাউডে এখনো কোনো ব্যাকআপ নেই। বর্তমান ডেটা ক্লাউডে সেভ করা হলো!'
        );
        await persistUserSnapshotEverywhere(email, {
          ...liveStateRef.current,
          extraIncomes: liveStateRef.current.extraIncomes,
          staff: liveStateRef.current.staffList,
          deletedIds: liveStateRef.current.deletedIds,
        });
        notify('বর্তমান ডেটা ক্লাউডে সিঙ্ক হয়েছে', 'emerald');
      }
    } catch {
      setAuthError('ক্লাউড থেকে রিস্টোর করতে সমস্যা হয়েছে।');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleSaveShopProfile = async (next: ShopProfile) => {
    const email = (
      currentUser?.email ||
      activeAccountEmail ||
      next.ownerEmail ||
      'skillwave.pro@gmail.com'
    )
      .trim()
      .toLowerCase();
    const docId = getFirestoreDocId(email);
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();
    const updatedProfile: ShopProfile = {
      ...next,
      ownerId: next.ownerId || docId,
      ownerEmail: email,
      shopName: (next.shopName || '').trim() || 'সোনার বাংলা বস্ত্রালয়',
      ownerName: (next.ownerName || '').trim() || 'দোকান মালিক',
      phone: (next.phone || '').trim(),
      address: (next.address || '').trim(),
      workingCapital: Math.max(0, Math.round(Number(next.workingCapital) || 0)),
      priceCodeKey: sanitizePriceCodeKey(next.priceCodeKey),
      isProfileCustomized: true,
      profileUpdatedAt: nowMs,
    };

    lastTimestampISORef.current = nowISO;
    lastModifiedMsRef.current = nowMs;

    const nextLive = { ...liveStateRef.current, shopProfile: updatedProfile };
    liveStateRef.current = nextLive;
    lastSavedSignatureRef.current = computeSnapshotContentSignature(nextLive);
    setShopProfile(updatedProfile);

    saveUserAccountDataSnapshot(email, {
      version: 5,
      email,
      accountEmail: email,
      updatedAtISO: nowISO,
      lastModifiedAt: nowMs,
      shopProfile: updatedProfile,
      products: liveStateRef.current.products,
      customers: liveStateRef.current.customers,
      sales: sanitizeAndSortSales(liveStateRef.current.sales),
      expenses: liveStateRef.current.expenses,
      extraIncomes: liveStateRef.current.extraIncomes,
      staff: liveStateRef.current.staffList,
      deletedIds: liveStateRef.current.deletedIds,
    });

    if (instantUser) {
      const updatedSession = { ...instantUser, displayName: updatedProfile.ownerName };
      setInstantUser(updatedSession);
      try {
        localStorage.setItem(STORAGE_KEYS.INSTANT_USER, JSON.stringify(updatedSession));
      } catch {
        // ignore
      }
    }

    setDeveloperRegistry((prev) => {
      if (!prev.approvedUsers.some((u) => u.email.trim().toLowerCase() === email)) {
        return prev;
      }
      const nextUsers = prev.approvedUsers.map((u) =>
        u.email.trim().toLowerCase() === email
          ? {
              ...u,
              shopName: updatedProfile.shopName,
              ownerName: updatedProfile.ownerName,
              phone: updatedProfile.phone,
              address: updatedProfile.address,
              workingCapital: updatedProfile.workingCapital,
              priceCodeKey: updatedProfile.priceCodeKey,
              profileUpdatedAt: nowMs,
              updatedAtISO: nowISO,
            }
          : u
      );
      const saved = saveDeveloperRegistry({
        ...prev,
        approvedUsers: nextUsers,
        updatedAtISO: nowISO,
      });
      const cloudPayload = { ...stripUndefinedDeep(saved), updatedAt: serverTimestamp() };
      setDoc(doc(db, 'admin_registry', 'approved_users'), cloudPayload, { merge: true }).catch(
        () => {}
      );
      setDoc(doc(db, 'users', '_developer_registry_'), cloudPayload, { merge: true }).catch(
        () => {}
      );
      return saved;
    });

    notify('দোকানের তথ্য সফলভাবে সংরক্ষিত হয়েছে!', 'emerald');
    await persistUserSnapshotEverywhere(email, {
      shopProfile: updatedProfile,
      products: liveStateRef.current.products,
      customers: liveStateRef.current.customers,
      sales: liveStateRef.current.sales,
      expenses: liveStateRef.current.expenses,
      extraIncomes: liveStateRef.current.extraIncomes,
      staff: liveStateRef.current.staffList,
      deletedIds: liveStateRef.current.deletedIds,
    });
  };

  const activeCategories = useMemo(
    () =>
      shopProfile.customCategories && shopProfile.customCategories.length > 0
        ? shopProfile.customCategories
        : [...CLOTHING_CATEGORIES],
    [shopProfile.customCategories]
  );

  const activeSizes = useMemo(
    () =>
      shopProfile.customSizes && shopProfile.customSizes.length > 0
        ? shopProfile.customSizes
        : [...CLOTHING_SIZES],
    [shopProfile.customSizes]
  );

  const handleAddCategory = async (newCategory: string) => {
    const clean = newCategory.trim();
    if (!clean) return;
    if (activeCategories.includes(clean)) return;
    const nextCategories = [...activeCategories, clean];
    await handleSaveShopProfile({
      ...liveStateRef.current.shopProfile,
      customCategories: nextCategories,
    });
    notify(`নতুন ক্যাটাগরি "${clean}" সংরক্ষিত হয়েছে!`, 'emerald');
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    const nextCategories = activeCategories.filter((c) => c !== categoryToDelete);
    if (nextCategories.length === 0) return;
    await handleSaveShopProfile({
      ...liveStateRef.current.shopProfile,
      customCategories: nextCategories,
    });
    notify(`ক্যাটাগরি "${categoryToDelete}" ডিলিট করা হয়েছে`, 'rose');
  };

  const handleAddSize = async (newSize: string) => {
    const clean = newSize.trim();
    if (!clean) return;
    if (activeSizes.includes(clean)) return;
    const nextSizes = [...activeSizes, clean];
    await handleSaveShopProfile({
      ...liveStateRef.current.shopProfile,
      customSizes: nextSizes,
    });
    notify(`নতুন সাইজ "${clean}" সংরক্ষিত হয়েছে!`, 'emerald');
  };

  const handleDeleteSize = async (sizeToDelete: string) => {
    const nextSizes = activeSizes.filter((s) => s !== sizeToDelete);
    if (nextSizes.length === 0) return;
    await handleSaveShopProfile({
      ...liveStateRef.current.shopProfile,
      customSizes: nextSizes,
    });
    notify(`সাইজ "${sizeToDelete}" ডিলিট করা হয়েছে`, 'rose');
  };

  const handleRestoreBackup = async (backup: ShopBackupPayload) => {
    const nowMs = Date.now();
    const email = (
      currentUser?.email ||
      activeAccountEmail ||
      backup.shopProfile?.ownerEmail ||
      shopProfile.ownerEmail ||
      'skillwave.pro@gmail.com'
    )
      .trim()
      .toLowerCase();
    const nextProfile: ShopProfile = backup.shopProfile
      ? {
          ...backup.shopProfile,
          ownerEmail: email,
          priceCodeKey: sanitizePriceCodeKey(backup.shopProfile.priceCodeKey),
          profileUpdatedAt: nowMs,
        }
      : { ...shopProfile, ownerEmail: email, profileUpdatedAt: nowMs };
    const nextProds = backup.products ?? products;
    const nextCusts = backup.customers ?? customers;
    const nextSales = sanitizeAndSortSales(backup.sales ?? sales);
    const nextExps = backup.expenses ?? expenses;
    const nextIncs = backup.extraIncomes ?? extraIncomes;
    const nextStaff = backup.staff ?? staffList;

    const snap: UserAccountDataSnapshot = {
      version: 5,
      isDefaultFallback: false,
      email,
      accountEmail: email,
      updatedAtISO: new Date(nowMs).toISOString(),
      lastModifiedAt: nowMs,
      shopProfile: nextProfile,
      products: nextProds,
      customers: nextCusts,
      sales: nextSales,
      expenses: nextExps,
      extraIncomes: nextIncs,
      staff: nextStaff,
      deletedIds,
    };

    applyAccountSnapshotToState(snap, email);
    saveUserAccountDataSnapshot(email, snap);
    await persistUserSnapshotEverywhere(email, {
      shopProfile: nextProfile,
      products: nextProds,
      customers: nextCusts,
      sales: nextSales,
      expenses: nextExps,
      extraIncomes: nextIncs,
      staff: nextStaff,
      deletedIds,
    });
  };

  const todayISO = getTodayISO();
  getDateNDaysAgoISO(todayISO);

  const financialSummary = useMemo(
    () =>
      calculateShopFinancialSummary(
        products,
        sales,
        customers,
        expenses,
        shopProfile.workingCapital,
        todayISO,
        extraIncomes
      ),
    [products, sales, customers, expenses, shopProfile.workingCapital, todayISO, extraIncomes]
  );

  const periodSummary = useMemo(
    () =>
      calculatePeriodSummary({
        sales,
        expenses,
        products,
        extraIncomes,
        mode: periodMode,
        targetDateISO: selectedDateISO,
        fromDateISO,
        toDateISO,
        monthPrefix: selectedMonthPrefix,
        referenceTodayISO: todayISO,
      }),
    [
      sales,
      expenses,
      products,
      extraIncomes,
      periodMode,
      selectedDateISO,
      fromDateISO,
      toDateISO,
      selectedMonthPrefix,
      todayISO,
    ]
  );

  const periodLabel = periodSummary.periodLabel;

  const totalTransactionsCount = useMemo(
    () =>
      buildUnifiedTransactions(sales, expenses, products, todayISO, extraIncomes, customers).length,
    [sales, expenses, products, todayISO, extraIncomes, customers]
  );

  const handleCompleteSale = async (
    newSale: Omit<SaleRecord, 'id' | 'ownerId'>,
    cart: CartItem[],
    customerIdToUpdate?: string,
    newCustomerData?: { name: string; phone: string; address: string }
  ) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const saleRecord: SaleRecord = {
      ...newSale,
      id: `sale-${Date.now()}`,
      ownerId,
      createdAtISO: newSale.createdAtISO || new Date().toISOString(),
    };
    const nextProds = deductStockAfterSale(products, cart);
    const nextSales = [saleRecord, ...sales];
    setProducts(nextProds);
    setSales(nextSales);

    let nextCusts = customers;
    if (newCustomerData) {
      nextCusts = [
        {
          id: `cust-${Date.now()}`,
          ownerId,
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          address: newCustomerData.address,
          totalPurchase: saleRecord.grandTotal,
          totalDue: saleRecord.dueAmount,
        },
        ...customers,
      ];
      setCustomers(nextCusts);
    } else if (customerIdToUpdate) {
      nextCusts = customers.map((c) =>
        c.id === customerIdToUpdate
          ? {
              ...c,
              totalPurchase: c.totalPurchase + saleRecord.grandTotal,
              totalDue: c.totalDue + saleRecord.dueAmount,
            }
          : c
      );
      setCustomers(nextCusts);
    }

    setActiveReceiptSale(saleRecord);
    notify(
      `ক্যাশ মেমো ${saleRecord.invoiceNo} তৈরি হয়েছে (${formatBDT(saleRecord.grandTotal)})`,
      'emerald'
    );
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products: nextProds,
        customers: nextCusts,
        sales: nextSales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleAddQuickSale = async (
    rawSale: Omit<SaleRecord, 'id' | 'ownerId'> & Record<string, unknown>,
    soldItems?: CartItem[]
  ) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const grandTotal = Math.max(
      0,
      Math.round(
        Number(
          rawSale.grandTotal ??
            rawSale.totalAmount ??
            rawSale.amount ??
            rawSale.subtotal ??
            rawSale.paidAmount ??
            0
        ) || 0
      )
    );
    if (grandTotal <= 0) return;

    const profit = Math.round(
      Number(
        rawSale.profit ??
          rawSale.profitAmount ??
          rawSale.netProfit ??
          rawSale.estimatedProfit ??
          Math.round(grandTotal * 0.2)
      ) || 0
    );
    const saleDateISO = String(rawSale.saleDateISO || todayISO);
    const dateMeta = buildSaleDateMetadata(saleDateISO, timeStr, now.toISOString(), todayISO);
    const rawSummary = String(rawSale.itemsSummary || rawSale.note || '').trim();
    const itemsSummary = buildQuickSaleItemsSummary(saleDateISO, todayISO, rawSummary);
    const subtotal = Math.max(grandTotal, Math.round(Number(rawSale.subtotal ?? grandTotal) || grandTotal));
    const discount = Math.max(0, Math.round(Number(rawSale.discount) || 0));
    const extraProfit = Math.max(0, Math.round(Number(rawSale.extraBargainingProfit) || 0));

    let nextProds = products;
    if (soldItems && soldItems.length > 0) {
      nextProds = deductStockAfterSale(products, soldItems);
      setProducts(nextProds);
    }

    const nextSales: SaleRecord[] = [
      {
        id: `qsale-${Date.now()}`,
        ownerId,
        invoiceNo: String(rawSale.invoiceNo || `QUICK-${String(Date.now()).slice(-4)}`),
        customerName: String(rawSale.customerName || 'দ্রুত খুচরা বিক্রি (মেমো ছাড়া)'),
        customerPhone: String(rawSale.customerPhone || ''),
        itemsSummary,
        items: Array.isArray(rawSale.items) ? rawSale.items : undefined,
        totalItemsCount: Math.max(1, Number(rawSale.totalItemsCount) || 1),
        subtotal,
        discount,
        ...(extraProfit > 0 ? { extraBargainingProfit: extraProfit } : {}),
        grandTotal,
        paidAmount: grandTotal,
        dueAmount: 0,
        profit,
        paymentMethod: rawSale.paymentMethod || 'নগদ (Cash)',
        saleDateISO,
        dateLabel: `${dateMeta.relativeBadge}, ${timeStr}`,
        createdAtISO: now.toISOString(),
        isQuickLumpSum: true,
        note: itemsSummary,
      },
      ...sanitizeAndSortSales(sales),
    ];

    setSales(nextSales);
    notify(
      soldItems && soldItems.length > 0
        ? `দ্রুত বিক্রি +${formatBDT(grandTotal)} (লাভ: ${profit >= 0 ? '+' : '-'}${formatBDT(Math.abs(profit))}${extraProfit > 0 ? `, অতিরিক্ত মুনাফা: +${formatBDT(extraProfit)}` : ''}${discount > 0 ? `, ছাড়: -${formatBDT(discount)}` : ''}) এবং স্টক মাইনাস হয়েছে`
        : `দ্রুত মোট বিক্রি +${formatBDT(grandTotal)} (লাভ: +${formatBDT(profit)}) যোগ হয়েছে`,
      'emerald'
    );
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products: nextProds,
        customers,
        sales: nextSales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleAddQuickExpense = async (rawExp: Omit<ExpenseRecord, 'id' | 'ownerId'>) => {
    const amount = Math.max(0, Math.round(Number(rawExp.amount) || 0));
    if (amount <= 0) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const expenseDateISO = String(rawExp.expenseDateISO || todayISO);
    const dateMeta = buildSaleDateMetadata(expenseDateISO, timeStr, now.toISOString(), todayISO);
    await handleAddExpense({
      title: String(rawExp.title || 'সারাদিনের খুচরা খরচ').trim(),
      category: rawExp.category || 'অন্যান্য',
      amount,
      expenseDateISO,
      dateLabel: `${dateMeta.relativeBadge}, ${timeStr}`,
      isQuickLumpSum: true,
      createdAtISO: now.toISOString(),
    });
  };

  const handleAddExtraIncome = async (rawInc: Omit<ExtraIncomeRecord, 'id' | 'ownerId'>) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const newInc: ExtraIncomeRecord = {
      ...rawInc,
      id: `inc-${Date.now()}`,
      ownerId,
      createdAtISO: rawInc.createdAtISO || new Date().toISOString(),
    };
    const nextIncs = [newInc, ...extraIncomes];
    setExtraIncomes(nextIncs);
    notify(`${newInc.category}: +${formatBDT(newInc.amount)} ক্যাশে যুক্ত হয়েছে`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers,
        sales,
        expenses,
        extraIncomes: nextIncs,
        staff: staffList,
      });
    }
  };

  const handleAddStaff = async (rawStaff: Omit<StaffMember, 'id' | 'ownerId'>) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const newStaff: StaffMember = {
      ...rawStaff,
      id: `staff-${Date.now()}`,
      ownerId,
      createdAtISO: new Date().toISOString(),
    };
    const nextStaff = [newStaff, ...staffList];
    setStaffList(nextStaff);
    notify(`কর্মচারী "${newStaff.name}" যুক্ত হয়েছেন`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers,
        sales,
        expenses,
        extraIncomes,
        staff: nextStaff,
      });
    }
  };

  const handleUpdateStaff = async (updated: StaffMember) => {
    const email = currentUser?.email || activeAccountEmail;
    const withTs = { ...updated, updatedAtISO: new Date().toISOString() };
    const nextStaff = staffList.map((s) => (s.id === withTs.id ? withTs : s));
    setStaffList(nextStaff);
    notify(`কর্মচারী "${withTs.name}" আপডেট হয়েছে`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers,
        sales,
        expenses,
        extraIncomes,
        staff: nextStaff,
      });
    }
  };

  const handlePayStaffSalary = async (rawExp: Omit<ExpenseRecord, 'id' | 'ownerId'>) => {
    const amount = Math.max(0, Math.round(Number(rawExp.amount) || 0));
    if (amount <= 0) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const expenseDateISO = String(rawExp.expenseDateISO || todayISO);
    const dateMeta = buildSaleDateMetadata(expenseDateISO, timeStr, now.toISOString(), todayISO);
    await handleAddExpense({
      title: String(rawExp.title || 'কর্মচারী বেতন').trim(),
      category: 'কর্মচারী বেতন',
      amount,
      expenseDateISO,
      dateLabel:
        String(rawExp.dateLabel || '').trim() || `${dateMeta.relativeBadge}, ${timeStr}`,
      createdAtISO: rawExp.createdAtISO ? String(rawExp.createdAtISO) : now.toISOString(),
      staffId: rawExp.staffId ? String(rawExp.staffId) : undefined,
      staffName: rawExp.staffName ? String(rawExp.staffName) : undefined,
      staffPaymentType: rawExp.staffPaymentType,
      salaryMonthNote: rawExp.salaryMonthNote ? String(rawExp.salaryMonthNote) : undefined,
    });
  };

  const handleAddProduct = async (rawProd: Omit<Product, 'id' | 'ownerId'>) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const nowISO = new Date().toISOString();
    const newProd = normalizeProductAuditMetadata(
      {
        ...rawProd,
        cashPurchaseSpent:
          rawProd.cashPurchaseSpent === undefined
            ? Math.max(0, Math.round((rawProd.buyPrice || 0) * (rawProd.stock || 0)))
            : rawProd.cashPurchaseSpent,
        id: `prod-${Date.now()}`,
        ownerId,
        createdAtISO: nowISO,
      },
      todayISO
    );
    const nextProds = [newProd, ...products];
    setProducts(nextProds);
    notify(`"${newProd.name}" স্টকে যুক্ত হয়েছে`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products: nextProds,
        customers,
        sales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleUpdateProduct = async (updated: Product) => {
    const email = currentUser?.email || activeAccountEmail;
    const normalized = {
      ...normalizeProductAuditMetadata(updated, todayISO),
      updatedAtISO: new Date().toISOString(),
    };
    const nextProds = products.map((p) => (p.id === normalized.id ? normalized : p));
    setProducts(nextProds);
    notify(`"${normalized.name}" আপডেট হয়েছে`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products: nextProds,
        customers,
        sales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleQuickRestock = async (
    productId: string,
    addedQty: number,
    deductFromCash = true
  ) => {
    const email = currentUser?.email || activeAccountEmail;
    const nowISO = new Date().toISOString();
    const nextProds = products.map((p) =>
      p.id === productId
        ? applyRestockPurchaseToProduct(p, addedQty, deductFromCash, nowISO, todayISO)
        : p
    );
    setProducts(nextProds);
    notify(
      `স্টক +${addedQty} পিস বৃদ্ধি ও নতুন মাল ক্রয় রেকর্ড সংরক্ষিত হয়েছে`,
      'emerald'
    );
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products: nextProds,
        customers,
        sales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleAddCustomer = async (rawCust: Omit<Customer, 'id' | 'ownerId'>) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const newCust: Customer = {
      ...rawCust,
      id: `cust-${Date.now()}`,
      ownerId,
    };
    const nextCusts = [newCust, ...customers];
    setCustomers(nextCusts);
    notify(`কাস্টমার "${newCust.name}" যুক্ত হয়েছেন`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers: nextCusts,
        sales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleUpdateCustomer = async (updated: Customer) => {
    const email = currentUser?.email || activeAccountEmail;
    const withTs = { ...updated, updatedAtISO: new Date().toISOString() };
    const nextCusts = customers.map((c) => (c.id === withTs.id ? withTs : c));
    setCustomers(nextCusts);
    notify(`কাস্টমার "${withTs.name}" আপডেট হয়েছে`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers: nextCusts,
        sales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleCollectDue = async (customerId: string, amountPaid: number) => {
    const email = currentUser?.email || activeAccountEmail;
    let generatedReceipt: DuePaymentReceipt | null = null;
    let custName = '';
    const now = new Date();
    const nowISO = now.toISOString();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateMeta = buildSaleDateMetadata(todayISO, timeStr, nowISO, todayISO);

    const nextCusts = customers.map((c) => {
      if (c.id !== customerId) return c;
      custName = c.name;
      const prevDue = Math.max(0, Math.round(c.totalDue || 0));
      const paid = Math.max(0, Math.min(prevDue, Math.round(amountPaid || 0)));
      const updated = applyCustomerDuePayment(c, amountPaid);
      const remDue = Math.max(0, Math.round(updated.totalDue || 0));
      const receipt: DuePaymentReceipt = {
        id: `due-rcpt-${Date.now()}`,
        receiptNo: `DUE-${String(Date.now()).slice(-5)}`,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        customerAddress: c.address,
        previousDue: prevDue,
        paidAmount: paid,
        remainingDue: remDue,
        paymentDateISO: todayISO,
        dateLabel: `${dateMeta.relativeBadge}, ${timeStr}`,
        createdAtISO: nowISO,
      };
      generatedReceipt = receipt;
      return {
        ...updated,
        paymentHistory: [receipt, ...(c.paymentHistory || [])],
        updatedAtISO: nowISO,
      };
    });
    setCustomers(nextCusts);

    let remainingToApply = Math.max(0, Math.round(amountPaid || 0));
    const nextSales = sales.map((s) => {
      if (
        remainingToApply <= 0 ||
        s.dueAmount <= 0 ||
        !(s.customerId === customerId || (custName && s.customerName === custName))
      ) {
        return s;
      }
      const deduction = Math.min(s.dueAmount, remainingToApply);
      remainingToApply -= deduction;
      return {
        ...s,
        paidAmount: (s.paidAmount || 0) + deduction,
        dueAmount: Math.max(0, s.dueAmount - deduction),
        updatedAtISO: nowISO,
      };
    });
    if (nextSales !== sales) setSales(nextSales);
    if (generatedReceipt) setActiveDueReceipt(generatedReceipt);
    notify(`বকেয়া কিস্তি +${formatBDT(amountPaid)} আদায় হয়েছে ও রশিদ তৈরি হয়েছে`, 'emerald');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers: nextCusts,
        sales: nextSales,
        expenses,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleAddExpense = async (rawExp: Omit<ExpenseRecord, 'id' | 'ownerId'>) => {
    const email = currentUser?.email || activeAccountEmail;
    const ownerId = currentUser?.uid || getFirestoreDocId(email);
    const newExp: ExpenseRecord = {
      ...rawExp,
      id: `exp-${Date.now()}`,
      ownerId,
      createdAtISO: rawExp.createdAtISO || new Date().toISOString(),
    };
    const nextExps = [newExp, ...expenses];
    setExpenses(nextExps);
    notify(`খরচ -${formatBDT(newExp.amount)} (${newExp.title}) যোগ হয়েছে`, 'amber');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products,
        customers,
        sales,
        expenses: nextExps,
        extraIncomes,
        staff: staffList,
      });
    }
  };

  const handleConfirmDelete = async (target: ConfirmDeleteTarget, restoreStockOnSaleDelete: boolean) => {
    const email = currentUser?.email || activeAccountEmail;
    let nextProds = products;
    let nextCusts = customers;
    let nextSales = sales;
    let nextExps = expenses;
    let nextIncs = extraIncomes;
    let nextStaff = staffList;

    if (target.type === 'product') {
      nextProds = products.filter((p) => p.id !== target.id);
      setProducts(nextProds);
    } else if (target.type === 'sale') {
      const deletedSale = sales.find((s) => s.id === target.id);
      nextSales = sales.filter((s) => s.id !== target.id);
      setSales(nextSales);
      if (activeReceiptSale?.id === target.id) setActiveReceiptSale(null);
      if (
        deletedSale &&
        restoreStockOnSaleDelete &&
        (!deletedSale.isQuickLumpSum || (deletedSale.items && deletedSale.items.length > 0))
      ) {
        nextProds = restoreStockAfterSaleDelete(products, deletedSale);
        setProducts(nextProds);
      }
    } else if (target.type === 'customer') {
      nextCusts = customers.filter((c) => c.id !== target.id);
      setCustomers(nextCusts);
    } else if (target.type === 'expense') {
      nextExps = expenses.filter((ex) => ex.id !== target.id);
      setExpenses(nextExps);
    } else if (target.type === 'extra_income') {
      nextIncs = extraIncomes.filter((inc) => inc.id !== target.id);
      setExtraIncomes(nextIncs);
    } else if (target.type === 'staff') {
      nextStaff = staffList.filter((st) => st.id !== target.id);
      setStaffList(nextStaff);
    }

    const nextDeleted = { ...deletedIds, [target.id]: new Date().toISOString() };
    setDeletedIds(nextDeleted);
    notify(`"${target.title}" ডিলিট করা হয়েছে`, 'rose');
    if (email) {
      await persistUserSnapshotEverywhere(email, {
        shopProfile,
        products: nextProds,
        customers: nextCusts,
        sales: nextSales,
        expenses: nextExps,
        extraIncomes: nextIncs,
        staff: nextStaff,
        deletedIds: nextDeleted,
      });
    }
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (
      isHydratedRef.current &&
      !isLoggedOutRef.current &&
      activeAccountEmail &&
      !isUserEmailDeletedInRegistry(developerRegistry, activeAccountEmail)
    ) {
      if (
        !developerRegistry.approvedUsers.some(
          (u) => u.email.trim().toLowerCase() === activeAccountEmail
        )
      ) {
        ensureUserInApprovedRegistry({
          email: activeAccountEmail,
          shopName: shopProfile.shopName,
          ownerName: shopProfile.ownerName,
          phone: shopProfile.phone,
          address: shopProfile.address,
          workingCapital: shopProfile.workingCapital,
          priceCodeKey: shopProfile.priceCodeKey,
        });
      }
    }
  }, [
    developerRegistry,
    activeAccountEmail,
    ensureUserInApprovedRegistry,
    shopProfile.address,
    shopProfile.ownerName,
    shopProfile.phone,
    shopProfile.priceCodeKey,
    shopProfile.shopName,
    shopProfile.workingCapital,
  ]);

  const refreshCloudUsersList = useCallback(async () => {
    setIsLoadingCloudUsers(true);
    try {
      const [usersSnap, shopsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'shops')),
      ]);
      const deletedSet = new Set(
        (developerRegistry.deletedUserEmails || []).map((e) => e.trim().toLowerCase())
      );
      const map: Record<string, UserAccountDataSnapshot> = {};
      const processDoc = (data: Record<string, unknown>, id: string) => {
        if (id === '_developer_registry_') return;
        const email =
          (data.email as string) ||
          (data.accountEmail as string) ||
          ((data.shopProfile as ShopProfile | undefined)?.ownerEmail as string) ||
          (id.includes('@') ? id : '');
        if (email && email.includes('@') && data.shopProfile) {
          const clean = email.trim().toLowerCase();
          if (!deletedSet.has(clean)) {
            const norm = normalizeCloudSnapshot(data, clean);
            const existing = map[clean];
            if (!existing) {
              map[clean] = norm;
            } else {
              const t1 = getSnapshotTimestampMs(existing);
              const t2 = getSnapshotTimestampMs(norm);
              map[clean] =
                t2 >= t1
                  ? mergeTwoAccountSnapshots(existing, norm)
                  : mergeTwoAccountSnapshots(norm, existing);
            }
          }
        }
      };
      usersSnap.forEach((d) => processDoc(d.data(), d.id));
      shopsSnap.forEach((d) => processDoc(d.data(), d.id));
      setCloudUsersMap(map);
    } catch {
      // ignore
    } finally {
      setIsLoadingCloudUsers(false);
    }
  }, [developerRegistry.deletedUserEmails]);

  useEffect(() => {
    if (!isDeveloperPanelOpen && !isStandaloneAdminApp) return;
    refreshCloudUsersList();
    let unsub1: (() => void) | undefined;
    let unsub2: (() => void) | undefined;
    try {
      const handleSnap = (snap: {
        forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) => void;
      }) => {
        const deletedSet = new Set(
          (developerRegistry.deletedUserEmails || []).map((e) => e.trim().toLowerCase())
        );
        setCloudUsersMap((prev) => {
          const next = { ...prev };
          snap.forEach((d) => {
            if (d.id === '_developer_registry_') return;
            const data = d.data();
            const email =
              (data.email as string) ||
              (data.accountEmail as string) ||
              ((data.shopProfile as ShopProfile | undefined)?.ownerEmail as string) ||
              (String(d.id).includes('@') ? String(d.id) : '');
            if (email && email.includes('@') && data.shopProfile) {
              const clean = email.trim().toLowerCase();
              if (!deletedSet.has(clean)) {
                const norm = normalizeCloudSnapshot(data, clean);
                const existing = next[clean];
                if (!existing) {
                  next[clean] = norm;
                } else {
                  const t1 = getSnapshotTimestampMs(existing);
                  const t2 = getSnapshotTimestampMs(norm);
                  next[clean] =
                    t2 >= t1
                      ? mergeTwoAccountSnapshots(existing, norm)
                      : mergeTwoAccountSnapshots(norm, existing);
                }
              }
            }
          });
          return next;
        });
      };
      unsub1 = onSnapshot(collection(db, 'users'), handleSnap, () => {});
      unsub2 = onSnapshot(collection(db, 'shops'), handleSnap, () => {});
    } catch {
      // ignore
    }
    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [
    isDeveloperPanelOpen,
    isStandaloneAdminApp,
    developerRegistry.deletedUserEmails,
    refreshCloudUsersList,
  ]);

  const handleOpenAdminPasswordGate = useCallback(() => {
    setIsDrawerOpen(false);
    setIsDeveloperModalOpen(false);
    setShowAdminPasswordGate(true);
  }, []);

  const handleAdminPasswordVerified = useCallback(() => {
    setAdminSessionAuthenticated(true);
    setIsAdminVerified(true);
    setShowAdminPasswordGate(false);
    setDeveloperModeUnlocked(true);
    setIsDeveloperPanelOpen(true);
    notify('অ্যাডমিন ও ডেভেলপার কন্ট্রোল প্যানেল আনলক হয়েছে!', 'emerald');
  }, [notify]);

  const handleLockAdminApp = useCallback(() => {
    setAdminSessionAuthenticated(false);
    setIsAdminVerified(false);
    setIsAdminViewingUserShop(false);
    setDeveloperModeUnlocked(false);
    setIsDeveloperPanelOpen(false);
    if (!isStandaloneAdminApp) setShowAdminPasswordGate(false);
    notify('অ্যাডমিন প্যানেল লক করা হয়েছে — পুনরায় পাসওয়ার্ড লাগবে', 'amber');
  }, [isStandaloneAdminApp, notify]);

  const handleExitDeveloperMode = useCallback(() => {
    setDeveloperModeUnlocked(false);
    setIsDeveloperPanelOpen(false);
    if (!isStandaloneAdminApp) {
      setAdminSessionAuthenticated(false);
      setIsAdminVerified(false);
      setIsAdminViewingUserShop(false);
    }
    notify('শপ ড্যাশবোর্ডে প্রবেশ করা হয়েছে', 'emerald');
  }, [isStandaloneAdminApp, notify]);

  const handleActivationGateUnlocked = useCallback(
    async (email: string, shopName?: string, ownerName?: string, passcodeUsed?: string) => {
      const cleanEmail = (email || activeAccountEmail).trim().toLowerCase();
      setDeviceActivated(true, cleanEmail);
      setDeviceActivatedState(true);
      setActiveUserEmail(cleanEmail);
      await ensureUserInApprovedRegistry({
        email: cleanEmail,
        passcode: passcodeUsed || developerRegistry.masterActivationCode || 'rabbysir',
        shopName,
        ownerName,
      });
      await handleGoogleQuickAuth(cleanEmail);
      notify(
        'অ্যাপ অ্যাক্সেস পাসওয়ার্ড ভেরিফাই সম্পন্ন — ক্লাউড ডাটা সিঙ্ক ও আনলক হয়েছে!',
        'emerald'
      );
    },
    [
      developerRegistry.masterActivationCode,
      activeAccountEmail,
      handleGoogleQuickAuth,
      ensureUserInApprovedRegistry,
      notify,
    ]
  );

  const handleResetDeviceActivation = useCallback(
    (lockDevice: boolean) => {
      if (lockDevice) {
        setDeviceActivated(false);
        setDeviceActivatedState(false);
        notify('ডিভাইস অ্যাক্টিভেশন লক করা হয়েছে — পুনরায় অ্যাক্সেস পাসওয়ার্ড লাগবে', 'amber');
      } else {
        setDeviceActivated(true, activeAccountEmail);
        setDeviceActivatedState(true);
        notify('ডিভাইস স্থায়ীভাবে ভেরিফাইড (Unlocked) করা হয়েছে!', 'emerald');
      }
    },
    [activeAccountEmail, notify]
  );

  const handleUpdateUserSnapshotFromDev = useCallback(
    async (email: string, nextSnap: UserAccountDataSnapshot) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleaned = stripUndefinedDeep(nextSnap);
      saveUserAccountDataSnapshot(cleanEmail, cleaned);
      setCloudUsersMap((prev) => ({ ...prev, [cleanEmail]: cleaned }));
      if (cleanEmail === activeAccountEmail) {
        setShopProfile(cleaned.shopProfile);
        setProducts(cleaned.products);
        setCustomers(cleaned.customers);
        setSales(sanitizeAndSortSales(cleaned.sales));
        setExpenses(cleaned.expenses);
        setExtraIncomes(cleaned.extraIncomes);
        setStaffList(cleaned.staff);
      }
      try {
        const docId = getFirestoreDocId(cleanEmail);
        const cloudPayload = { ...cleaned, updatedAt: serverTimestamp() };
        await Promise.all([
          setDoc(doc(db, 'users', docId), cloudPayload, { merge: true }),
          setDoc(doc(db, 'shops', docId), cloudPayload, { merge: true }),
          setDoc(doc(db, 'shops', cleanEmail), cloudPayload, { merge: true }),
        ]);
      } catch {
        // ignore
      }
    },
    [activeAccountEmail]
  );

  const handleDeleteCloudUserFromDev = useCallback(
    async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const docId = getFirestoreDocId(cleanEmail);
      if (autoSaveTimerRef.current && cleanEmail === activeAccountEmail) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setCloudUsersMap((prev) => {
        const next = { ...prev };
        delete next[cleanEmail];
        return next;
      });
      purgeDeletedUserLocalCache(cleanEmail);
      try {
        await Promise.all([
          deleteDoc(doc(db, 'users', docId)),
          deleteDoc(doc(db, 'shops', docId)),
          deleteDoc(doc(db, 'shops', cleanEmail)),
        ]);
      } catch {
        // ignore
      }
    },
    [activeAccountEmail]
  );

  const handleSwitchActiveAccountFromDev = useCallback(
    async (email: string) => {
      await handleGoogleQuickAuth(email);
      setIsAdminViewingUserShop(true);
      setDeveloperModeUnlocked(false);
      setIsDeveloperPanelOpen(false);
    },
    [handleGoogleQuickAuth]
  );

  useMemo(
    () => isUserEmailBlockedInRegistry(developerRegistry, activeAccountEmail),
    [developerRegistry, activeAccountEmail]
  );

  const isAdminGateActive = (isStandaloneAdminApp && !isAdminVerified) || showAdminPasswordGate;
  const isUserGateActive =
    !isStandaloneAdminApp &&
    !isDeveloperPanelOpen &&
    !isAdminGateActive &&
    developerRegistry.isAccessGateEnabled !== false &&
    !deviceActivated;
  const hasAnyShopData = products.length > 0 || sales.length > 0;
  const activePriceCodeKey = sanitizePriceCodeKey(shopProfile.priceCodeKey);
  const connectionStatusBadge = useMemo(
    () =>
      isOnline
        ? {
            label: 'অনলাইন (Online)',
            shortLabel: 'অনলাইন (Online)',
            tone: 'emerald' as const,
          }
        : {
            label: 'অফলাইন (Offline)',
            shortLabel: 'অফলাইন (Offline)',
            tone: 'amber' as const,
          },
    [isOnline]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/90 text-slate-900 pb-24">
      {toastNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[110] px-4 py-2.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] border backdrop-blur-xl flex items-center gap-2 text-xs font-extrabold animate-toast-spring max-w-[92vw]"
          style={{
            background:
              toastNotice.tone === 'emerald'
                ? 'rgba(6, 95, 70, 0.95)'
                : toastNotice.tone === 'amber'
                ? 'rgba(180, 83, 9, 0.95)'
                : 'rgba(190, 18, 60, 0.95)',
            color: '#ffffff',
            borderColor: 'rgba(255,255,255,0.25)',
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="truncate">{toastNotice.text}</span>
        </div>
      )}

      {showSplashScreen && (
        <div
          onClick={() => setShowSplashScreen(false)}
          role="status"
          aria-label="Dookanify Loading Screen"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 select-none cursor-pointer transition-opacity duration-300"
        >
          <div className="relative flex flex-col items-center text-center max-w-xs w-full space-y-5 animate-scale-in">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
              <DookanifyLogo
                size="2xl"
                variant="gold-luxury"
                rounded="3xl"
                className="animate-float animate-pulse-aura"
              />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/35 text-amber-300 text-[11px] font-extrabold tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                <span>Smart Fashion POS</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Dookanify</h1>
              <p className="text-xs text-emerald-200/90 font-medium">{shopProfile.shopName}</p>
            </div>

            <div className="w-48 h-2 rounded-full bg-white/15 overflow-hidden p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-300 animate-splash-bar" />
            </div>

            <p className="text-[11px] text-emerald-300/80 font-semibold">
              হিসাব ও স্টক প্রস্তুত হচ্ছে...
            </p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-royal-forest-silk text-white shadow-[0_10px_30px_rgba(5,46,30,0.28)] border-b border-amber-400/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="ড্রয়ার মেনু খুলুন"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-[0.95] flex items-center justify-center border border-amber-400/35 transition shrink-0"
            >
              <Menu className="w-5 h-5 text-amber-300" />
            </button>

            <DookanifyLogo size="sm" variant="gold-luxury" rounded="2xl" className="inline-flex shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-metallic text-slate-950 border border-amber-300/60 shrink-0 shadow-2xs">
                  <span>Dookanify</span>
                </span>
                <h1 className="text-xs sm:text-lg font-extrabold tracking-tight truncate text-white">
                  {currentUser ? shopProfile.shopName : 'Dookanify Smart POS'}
                </h1>
              </div>

              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-emerald-100/90 truncate num-clear">
                <span className="truncate">
                  {currentUser ? (
                    <>
                      {shopProfile.ownerName ? `প্রোঃ ${shopProfile.ownerName} • ` : ''}
                      {shopProfile.address}
                    </>
                  ) : (
                    'আপনার দোকান অ্যাকাউন্টে লগইন করুন'
                  )}
                </span>

                <span
                  title={connectionStatusBadge.label}
                  className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                    connectionStatusBadge.tone === 'amber'
                      ? 'bg-amber-400/20 text-amber-200 border-amber-300/40'
                      : 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connectionStatusBadge.tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span>{connectionStatusBadge.label}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsQuickEntryModalOpen(true)}
              title="দ্রুত মোট বিক্রি ও খরচ এন্ট্রি (মেমো ছাড়া)"
              className="px-2.5 sm:px-3.5 py-2 rounded-full bg-amber-400/15 hover:bg-amber-400/25 active:scale-[0.95] text-amber-200 border border-amber-400/35 font-extrabold text-xs flex items-center gap-1 transition"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">দ্রুত হিসাব</span>
            </button>

            <button
              onClick={() => setActiveTab('auth')}
              title={currentUser ? connectionStatusBadge.label : 'লগইন / সাইনআপ পেজ'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full font-extrabold text-xs transition active:scale-[0.95] ${
                currentUser
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-amber-400/30'
                  : 'bg-gold-metallic hover:brightness-105 text-slate-950 border border-amber-300/60 shadow-sm'
              }`}
            >
              {currentUser ? (
                <>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden xs:inline sm:inline max-w-[76px] truncate num-clear">
                    {currentUser.email.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Login</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pos')}
              className="px-3 sm:px-3.5 py-2 rounded-full bg-gold-metallic hover:brightness-105 active:scale-[0.95] text-slate-950 border border-amber-300/60 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>মেমো</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 pt-5 pb-32">
        {activeTab === 'auth' && (
          <AuthPage
            currentUser={currentUser}
            shopProfile={{ ...shopProfile, priceCodeKey: activePriceCodeKey }}
            isSigningIn={isSigningIn}
            isCloudSyncing={isCloudSyncing}
            authError={authError}
            cloudStatusNotice={cloudStatusNotice}
            onEmailAuth={handleEmailAuth}
            onGoogleQuickAuth={handleGoogleQuickAuth}
            onLogout={handleLogout}
            onPushToCloud={handlePushToCloud}
            onPullFromCloud={handlePullFromCloud}
            onGoToDashboard={() => setActiveTab('dashboard')}
            onOpenShopSetup={() => setIsShopSetupOpen(true)}
            onClearMessages={() => {
              setAuthError(null);
              setCloudStatusNotice(null);
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-fade-up">
            <div className="bg-royal-forest-silk rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-[0_14px_38px_rgba(5,46,30,0.28)] border border-amber-400/35 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-amber-400/12 blur-2xl pointer-events-none" />
              <div className="absolute right-8 -bottom-14 w-44 h-44 rounded-full border border-amber-400/15 pointer-events-none" />

              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <DookanifyLogo
                      size="lg"
                      variant="gold-luxury"
                      rounded="2xl"
                      className="animate-float shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-amber-400/35 text-amber-300 text-xs font-extrabold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Dookanify • গোপন কোড: {activePriceCodeKey}</span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold ${
                            connectionStatusBadge.tone === 'amber'
                              ? 'bg-amber-400/20 border-amber-300/40 text-amber-100'
                              : 'bg-white/15 border-emerald-300/40 text-emerald-50'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              connectionStatusBadge.tone === 'amber'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          <span>{connectionStatusBadge.label}</span>
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white break-words">
                        {shopProfile.shopName}
                      </h2>
                      <p className="text-xs sm:text-sm text-emerald-100/95 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {shopProfile.ownerName && (
                          <span>প্রোপ্রাইটর: {shopProfile.ownerName}</span>
                        )}
                        <span>• ঠিকানা: {shopProfile.address}</span>
                        <span className="num-clear font-extrabold text-amber-300">
                          • মোবাইল: {shopProfile.phone}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-[24px] border border-amber-400/35 bg-white/10 px-4 py-3 shadow-[0_8px_25px_rgba(0,0,0,0.18)] shrink-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-metallic text-slate-950 border border-amber-300/70 shadow-sm">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 divide-x divide-amber-400/25 text-xs">
                      <div className="pr-1">
                        <div className="text-[10px] font-bold text-amber-200/90 uppercase tracking-wide">
                          আজকের বিক্রি
                        </div>
                        <div className="num-clear text-sm sm:text-base font-extrabold text-amber-300 mt-0.5">
                          {formatBDT(periodSummary.revenue)}
                        </div>
                      </div>
                      <div className="pl-3.5">
                        <div className="text-[10px] font-bold text-emerald-100/90 uppercase tracking-wide">
                          মোট স্টক আইটেম
                        </div>
                        <div className="num-clear text-sm sm:text-base font-extrabold text-white mt-0.5">
                          {products.reduce((acc, p) => acc + p.stock, 0)} পিস ({products.length}{' '}
                          ডিজাইন)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-amber-400/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsQuickEntryModalOpen(true)}
                      className="px-4 py-2.5 rounded-full bg-gold-metallic hover:brightness-105 text-slate-950 border border-amber-300/60 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-[0.97]"
                    >
                      <Zap className="w-4 h-4" />
                      <span>দ্রুত মোট বিক্রি ও খরচ</span>
                    </button>

                    <button
                      onClick={() => {
                        setLedgerSubTab('extra_income');
                        setActiveTab('expenses');
                      }}
                      className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-amber-400/30 transition active:scale-[0.97]"
                    >
                      <Coins className="w-4 h-4 text-amber-300" />
                      <span>বকশিস ও ক্যাশ যোগ</span>
                    </button>

                    <button
                      onClick={() => setIsStaffSalaryModalOpen(true)}
                      className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-amber-400/30 transition active:scale-[0.97]"
                    >
                      <Users className="w-4 h-4 text-amber-300" />
                      <span>কর্মচারী ও বেতন ({staffList.length})</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab('pos')}
                    className="px-4 py-2.5 rounded-full bg-gold-metallic hover:brightness-105 text-slate-950 border border-amber-300/60 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-[0.97]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>+ নতুন ক্যাশ মেমো</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`rounded-[28px] sm:rounded-[32px] p-4 sm:p-5 border shadow-[0_10px_32px_rgba(5,46,30,0.16)] flex flex-col gap-4 transition-all ${
                financialSummary.totalLossFromLossSales > 0
                  ? 'bg-gradient-to-r from-rose-700 via-rose-800 to-red-900 text-white border-rose-400/50'
                  : 'bg-royal-forest-silk text-white border-amber-400/35'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                    {financialSummary.totalLossFromLossSales > 0 ? (
                      <AlertCircle className="w-6 h-6 text-amber-300" />
                    ) : (
                      <TrendingUp className="w-6 h-6 text-amber-300" />
                    )}
                  </div>
                  <div>
                    <span className="inline-block px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-extrabold text-amber-300">
                      দোকানের সামগ্রিক মুনাফা, খরচ ও পুঁজি বিশ্লেষণ
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold mt-1 num-clear">
                      হাতে নিট মুনাফা (Net Balance):{' '}
                      {financialSummary.netProfit > 0 ? '+' : ''}
                      {formatBDT(financialSummary.netProfit)}
                    </h3>
                    <p className="text-xs text-white/90 mt-0.5 num-clear">
                      মোট বিক্রয় মুনাফা (+
                      {formatBDT(
                        financialSummary.totalSalesProfitOnly +
                          financialSummary.totalTipsAndExtraProfit
                      )}
                      ) − দোকান ও বেতন খরচ ({formatBDT(financialSummary.totalExpenses)})
                      {financialSummary.totalLossFromLossSales > 0
                        ? ` − বিক্রয়ে লস (${formatBDT(financialSummary.totalLossFromLossSales)})`
                        : ' • কেনা দামের কমে কোনো বিক্রয় লস নেই (৳0)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                  <div className="rounded-2xl bg-white/10 px-3.5 py-2.5 border border-amber-400/30">
                    <div className="text-[10px] font-bold text-white/85">
                      ১. হাতে নগদ (Cash in Hand)
                    </div>
                    <div className="num-clear text-sm sm:text-base font-extrabold text-amber-300">
                      {formatBDT(financialSummary.currentCashInHand)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3.5 py-2.5 border border-amber-400/30">
                    <div className="text-[10px] font-bold text-white/85">
                      ২. স্টকে মালের ভ্যালু (Stock Cost)
                    </div>
                    <div className="num-clear text-sm sm:text-base font-extrabold text-white">
                      {formatBDT(financialSummary.totalInventoryCostValue)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gold-metallic border border-amber-300/70 text-slate-950 px-3.5 py-2.5 shadow-sm">
                    <div className="text-[10px] font-extrabold text-slate-800">
                      ৩. মোট ব্যবসার পুঁজি (Total Worth)
                    </div>
                    <div className="num-clear text-sm sm:text-base font-extrabold text-slate-950">
                      {formatBDT(financialSummary.totalBusinessWorth)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/15">
                <div className="rounded-2xl bg-white/10 px-3.5 py-2 border border-white/15">
                  <div className="text-[10px] font-bold text-emerald-100">
                    মোট বিক্রয় মুনাফা (Sales Profit)
                  </div>
                  <div className="num-clear text-xs sm:text-sm font-extrabold text-amber-300 mt-0.5">
                    +
                    {formatBDT(
                      financialSummary.totalSalesProfitOnly +
                        financialSummary.totalTipsAndExtraProfit
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 px-3.5 py-2 border border-amber-300/35">
                  <div className="text-[10px] font-bold text-amber-200">
                    অতিরিক্ত বিক্রয় মুনাফা (Extra)
                  </div>
                  <div className="num-clear text-xs sm:text-sm font-extrabold text-amber-300 mt-0.5">
                    +{formatBDT(financialSummary.totalExtraBargainingProfit)}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 px-3.5 py-2 border border-white/15">
                  <div className="text-[10px] font-bold text-emerald-100">
                    মোট ছাড় (Discount Given)
                  </div>
                  <div className="num-clear text-xs sm:text-sm font-extrabold text-amber-200 mt-0.5">
                    {financialSummary.totalDiscountGiven > 0
                      ? `-${formatBDT(financialSummary.totalDiscountGiven)}`
                      : formatBDT(0)}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 px-3.5 py-2 border border-white/15">
                  <div className="text-[10px] font-bold text-emerald-100">
                    দোকান ও বেতন খরচ (Expenses)
                  </div>
                  <div className="num-clear text-xs sm:text-sm font-extrabold text-white mt-0.5">
                    {formatBDT(financialSummary.totalExpenses)}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 px-3.5 py-2 border border-white/15">
                  <div className="text-[10px] font-bold text-emerald-100">
                    বিক্রয়ে লস (কেনা দামের কমে বিক্রি)
                  </div>
                  <div className="num-clear text-xs sm:text-sm font-extrabold text-white mt-0.5">
                    {financialSummary.totalLossFromLossSales > 0
                      ? `-${formatBDT(financialSummary.totalLossFromLossSales)}`
                      : formatBDT(0)}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 px-3.5 py-2 border border-white/15">
                  <div className="text-[10px] font-bold text-emerald-100">
                    মাল ক্রয় / স্টক বাবদ ব্যয়
                  </div>
                  <div className="num-clear text-xs sm:text-sm font-extrabold text-amber-200 mt-0.5">
                    {financialSummary.totalCashStockPurchases > 0
                      ? `-${formatBDT(financialSummary.totalCashStockPurchases)}`
                      : formatBDT(0)}
                  </div>
                </div>
              </div>
            </div>

            {!hasAnyShopData && (
              <div className="card-luxury p-4 sm:p-5 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-scale-in">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      আপনার দোকান সম্পূর্ণ প্রস্তুত! নতুন হিসাব শুরু করুন
                    </h4>
                    <p className="text-xs text-slate-500">
                      সকল ডেমো ডেটা পরিষ্কার করে সম্পূর্ণ জিরো (৳০) ব্যালেন্স থেকে আপনার আসল হিসাব শুরু হয়েছে।
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsQuickEntryModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-gold-metallic text-slate-950 font-extrabold text-xs hover:brightness-105 transition shadow-xs"
                  >
                    + দ্রুত বিক্রি যোগ করুন
                  </button>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="px-4 py-2 rounded-full bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition"
                  >
                    + স্টকে মাল তুলুন
                  </button>
                </div>
              </div>
            )}

            <div className="card-luxury p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      তারিখ ও সময় অনুযায়ী বিক্রি, মুনাফা ও লস ফিল্টার
                    </h3>
                    <p className="text-xs text-slate-500">
                      নির্বাচিত সময়কাল:{' '}
                      <strong className="text-emerald-700 font-extrabold">{periodLabel}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-full border border-slate-200/70">
                  {[
                    { id: 'today', label: 'আজকের হিসাব' },
                    { id: 'yesterday', label: 'গতকাল' },
                    { id: 'custom', label: 'নির্দিষ্ট তারিখ' },
                    { id: 'range', label: 'তারিখ থেকে তারিখ' },
                    { id: 'month', label: 'মাসিক হিসাব' },
                    { id: 'all', label: 'সর্বমোট (All Time)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPeriodMode(tab.id as PeriodFilterMode)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
                        periodMode === tab.id
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-800 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {periodMode === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700">তারিখ নির্বাচন করুন:</label>
                  <input
                    type="date"
                    value={selectedDateISO}
                    onChange={(e) => setSelectedDateISO(e.target.value)}
                    className="num-clear px-3.5 py-2 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50"
                  />
                </div>
              )}

              {periodMode === 'range' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">শুরু:</label>
                    <input
                      type="date"
                      value={fromDateISO}
                      onChange={(e) => setFromDateISO(e.target.value)}
                      className="num-clear px-3.5 py-2 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">শেষ:</label>
                    <input
                      type="date"
                      value={toDateISO}
                      onChange={(e) => setToDateISO(e.target.value)}
                      className="num-clear px-3.5 py-2 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {periodMode === 'month' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700">মাস নির্বাচন করুন:</label>
                  <input
                    type="month"
                    value={selectedMonthPrefix}
                    onChange={(e) => setSelectedMonthPrefix(e.target.value)}
                    className="num-clear px-3.5 py-2 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="card-luxury p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">বিক্রি ({periodLabel})</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="num-clear text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                  {formatBDT(periodSummary.revenue)}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 mt-1 num-clear">
                  নগদ আদায়: {formatBDT(periodSummary.cashCollected)} • মেমো:{' '}
                  {periodSummary.salesCount}টি
                </div>
              </div>

              <div className="card-luxury p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    নিট মুনাফা ({periodLabel})
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`num-clear text-xl sm:text-2xl font-extrabold mt-2 ${
                    periodSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {periodSummary.netProfit > 0 ? '+' : ''}
                  {formatBDT(periodSummary.netProfit)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-1 num-clear">
                  বিক্রয় লাভ: +{formatBDT(periodSummary.salesProfitOnly)} • খরচ:{' '}
                  {formatBDT(periodSummary.expenses)}
                </div>
              </div>

              <div
                onClick={() => setActiveTab('inventory')}
                className="card-luxury p-4 sm:p-5 cursor-pointer hover:border-emerald-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">স্টকে মালের কেনা ভ্যালু</span>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="num-clear text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                  {formatBDT(financialSummary.totalInventoryCostValue)}
                </div>
                <div className="text-[11px] font-semibold text-indigo-700 mt-1 num-clear">
                  বিক্রয় ভ্যালু: {formatBDT(financialSummary.totalInventoryRetailValue)} (
                  {financialSummary.totalInventoryUnits} পিস)
                </div>
              </div>

              <div
                onClick={() => setActiveTab('customers')}
                className="card-luxury p-4 sm:p-5 cursor-pointer hover:border-rose-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">মোট বকেয়া পাওনা (বাকি)</span>
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="num-clear text-xl sm:text-2xl font-extrabold text-rose-600 mt-2">
                  {formatBDT(financialSummary.totalReceivableDue)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-1 num-clear">
                  বাকি কাস্টমার: {customers.filter((c) => c.totalDue > 0).length} জন
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 card-luxury p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span>সাম্প্রতিক ক্যাশ মেমো ও দ্রুত বিক্রি ({sales.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      যেকোনো মেমোতে ক্লিক করে প্রিন্ট বা ডিলিট করতে পারবেন
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setLedgerSubTab('transactions');
                      setActiveTab('expenses');
                    }}
                    className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    সব দেখুন →
                  </button>
                </div>

                {sales.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-8 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-600">এখনো কোনো বিক্রি রেকর্ড নেই</p>
                    <p className="text-xs text-slate-400">
                      &quot;+ নতুন ক্যাশ মেমো&quot; বা &quot;দ্রুত হিসাব&quot; বাটনে ক্লিক করে বিক্রি যোগ করুন
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {sales.slice(0, 8).map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white p-3.5 transition"
                      >
                        <div
                          onClick={() => setActiveReceiptSale(sale)}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="num-clear text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                              {sale.invoiceNo}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {sale.customerName}
                            </span>
                            <span className="text-[11px] text-slate-400 num-clear">
                              {sale.dateLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-1">
                            {sale.itemsSummary}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right num-clear">
                            <div className="text-sm font-extrabold text-slate-900">
                              {formatBDT(sale.grandTotal)}
                            </div>
                            <div
                              className={`text-[11px] font-bold ${
                                sale.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              লাভ: {sale.profit >= 0 ? '+' : ''}
                              {formatBDT(sale.profit)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'sale',
                                id: sale.id,
                                title: `${sale.invoiceNo} (${sale.customerName})`,
                                subtitle: `মোট বিল: ${formatBDT(sale.grandTotal)}`,
                              })
                            }
                            className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="মেমো ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-5">
                <div className="card-luxury p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shrink-0">
                        <Coins className="w-4 h-4" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        দোকানের প্রাথমিক নগদ পুঁজি (Working Capital)
                      </h3>
                    </div>
                    {!isEditingWorkingCapital && (
                      <button
                        type="button"
                        onClick={() => {
                          setWorkingCapitalInput(String(shopProfile.workingCapital || 0));
                          setIsEditingWorkingCapital(true);
                        }}
                        className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        পরিবর্তন করুন
                      </button>
                    )}
                  </div>

                  {isEditingWorkingCapital ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const val = Math.max(0, Math.round(Number(workingCapitalInput) || 0));
                        await handleSaveShopProfile({ ...shopProfile, workingCapital: val });
                        setIsEditingWorkingCapital(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        min={0}
                        value={workingCapitalInput}
                        onChange={(e) => setWorkingCapitalInput(e.target.value)}
                        className="num-clear flex-1 rounded-2xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900"
                        placeholder="পুঁজির পরিমাণ (৳)"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white"
                      >
                        সেভ
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingWorkingCapital(false)}
                        className="rounded-full bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600"
                      >
                        বাতিল
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="num-clear text-2xl font-extrabold text-slate-900">
                        {formatBDT(shopProfile.workingCapital)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 num-clear">
                        হাতে নগদ: {formatBDT(financialSummary.currentCashInHand)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="card-luxury p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">
                          স্টক ও বাকির খাতা কুইক ওভারভিউ
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          প্রাইস কোড কি-ওয়ার্ড:{' '}
                          <strong className="num-clear font-extrabold text-emerald-700">
                            {activePriceCodeKey}
                          </strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPriceCodeModalOpen(true)}
                      className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 transition shrink-0"
                    >
                      কোড চার্ট পপআপ
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div
                      onClick={() => setActiveTab('inventory')}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/80 hover:bg-emerald-50/60 p-2.5 cursor-pointer transition"
                    >
                      <div className="text-[11px] font-semibold text-slate-500">মোট ডিজাইন</div>
                      <div className="num-clear text-sm font-extrabold text-slate-900 mt-0.5">
                        {products.length} টি
                      </div>
                    </div>
                    <div
                      onClick={() => setActiveTab('inventory')}
                      className="rounded-2xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 p-2.5 cursor-pointer transition"
                    >
                      <div className="text-[11px] font-semibold text-amber-800">স্টক কম</div>
                      <div className="num-clear text-sm font-extrabold text-amber-700 mt-0.5">
                        {products.filter((p) => p.stock <= p.minStockAlert).length} টি
                      </div>
                    </div>
                    <div
                      onClick={() => setActiveTab('customers')}
                      className="rounded-2xl border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 p-2.5 cursor-pointer transition"
                    >
                      <div className="text-[11px] font-semibold text-rose-700">বাকি কাস্টমার</div>
                      <div className="num-clear text-sm font-extrabold text-rose-600 mt-0.5">
                        {customers.filter((c) => c.totalDue > 0).length} জন
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width Secret Price Code Directory & Live Calculator */}
            <div className="pt-1">
              <PriceCodeDirectory
                products={products}
                priceCodeKey={activePriceCodeKey}
                onOpenShopSetup={() => setIsShopSetupOpen(true)}
              />
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <PosView
            products={products}
            customers={customers}
            priceCodeKey={activePriceCodeKey}
            categories={activeCategories}
            onCompleteSale={handleCompleteSale}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            priceCodeKey={activePriceCodeKey}
            categories={activeCategories}
            sizes={activeSizes}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSize={handleAddSize}
            onDeleteSize={handleDeleteSize}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onRestockProduct={handleQuickRestock}
            onRequestDeleteProduct={(prod) =>
              setDeleteTarget({
                type: 'product',
                id: prod.id,
                title: `${prod.name} (${prod.category})`,
                subtitle: `কেনা: ${formatBDT(prod.buyPrice)} • বিক্রয়: ${formatBDT(prod.sellPrice)} • স্টক: ${prod.stock} পিস`,
              })
            }
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onCollectDue={handleCollectDue}
            onRequestDeleteCustomer={(cust) =>
              setDeleteTarget({
                type: 'customer',
                id: cust.id,
                title: `${cust.name} (${cust.phone})`,
                subtitle: `মোট বকেয়া: ${formatBDT(cust.totalDue)}`,
              })
            }
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesReportView
            shopProfile={shopProfile}
            expenses={expenses}
            sales={sales}
            products={products}
            customers={customers}
            extraIncomes={extraIncomes}
            workingCapital={shopProfile.workingCapital}
            initialSubTab={ledgerSubTab}
            onAddExpense={handleAddExpense}
            onAddExtraIncome={handleAddExtraIncome}
            onSelectSaleReceipt={(sale) => setActiveReceiptSale(sale)}
            onSelectDueReceipt={(r) => setActiveDueReceipt(r)}
            onOpenShopSetup={() => setIsShopSetupOpen(true)}
            onNotify={notify}
            onRequestDeleteExpense={(exp) =>
              setDeleteTarget({
                type: 'expense',
                id: exp.id,
                title: `${exp.title} (${exp.category})`,
                subtitle: `খরচ: ${formatBDT(exp.amount)}`,
              })
            }
            onRequestDeleteSale={(sale) =>
              setDeleteTarget({
                type: 'sale',
                id: sale.id,
                title: `${sale.invoiceNo} (${sale.customerName})`,
                subtitle: `মোট বিল: ${formatBDT(sale.grandTotal)}`,
              })
            }
            onRequestDeleteExtraIncome={(inc) =>
              setDeleteTarget({
                type: 'extra_income',
                id: inc.id,
                title: `${inc.title} (${inc.category})`,
                subtitle: `পরিমাণ: ${formatBDT(inc.amount)}`,
              })
            }
          />
        )}
      </main>

      <nav
        aria-label="প্রধান নেভিগেশন"
        className="fixed bottom-2.5 sm:bottom-3.5 inset-x-0 z-30 px-2.5 sm:px-4 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-xl mx-auto rounded-[28px] bg-white/95 border border-slate-200/90 shadow-[0_14px_40px_rgba(5,46,30,0.16),0_2px_10px_rgba(0,0,0,0.06)] p-1.5 grid grid-cols-5 gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition active:scale-[0.95] ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white font-extrabold shadow-[0_6px_16px_rgba(5,150,105,0.28)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold'
            }`}
          >
            <LayoutDashboard
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                activeTab === 'dashboard' ? 'stroke-[2.5] text-amber-300' : 'stroke-2'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] mt-1 leading-tight whitespace-nowrap">
              ড্যাশবোর্ড
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition active:scale-[0.95] ${
              activeTab === 'pos'
                ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white font-extrabold shadow-[0_6px_16px_rgba(5,150,105,0.28)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold'
            }`}
          >
            <ShoppingBag
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                activeTab === 'pos' ? 'stroke-[2.5] text-amber-300' : 'stroke-2'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] mt-1 leading-tight whitespace-nowrap">
              ক্যাশ মেমো
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition active:scale-[0.95] ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white font-extrabold shadow-[0_6px_16px_rgba(5,150,105,0.28)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold'
            }`}
          >
            <Package
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                activeTab === 'inventory' ? 'stroke-[2.5] text-amber-300' : 'stroke-2'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] mt-1 leading-tight whitespace-nowrap">
              স্টক ও কোড
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition active:scale-[0.95] ${
              activeTab === 'customers'
                ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white font-extrabold shadow-[0_6px_16px_rgba(5,150,105,0.28)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold'
            }`}
          >
            <Users
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                activeTab === 'customers' ? 'stroke-[2.5] text-amber-300' : 'stroke-2'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] mt-1 leading-tight whitespace-nowrap">
              বাকির খাতা
            </span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition active:scale-[0.95] ${
              activeTab === 'expenses'
                ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white font-extrabold shadow-[0_6px_16px_rgba(5,150,105,0.28)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold'
            }`}
          >
            <Wallet
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                activeTab === 'expenses' ? 'stroke-[2.5] text-amber-300' : 'stroke-2'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] mt-1 leading-tight whitespace-nowrap">
              হিসাব ও মেমো
            </span>
          </button>
        </div>
      </nav>

      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        shopProfile={{ ...shopProfile, priceCodeKey: activePriceCodeKey }}
        user={currentUser}
        developerProfile={developerRegistry.developerProfile}
        totalInventoryCostValue={financialSummary.totalInventoryCostValue}
        netProfit={financialSummary.netProfit}
        totalDiscountGiven={financialSummary.totalDiscountGiven}
        todayDiscountGiven={financialSummary.todayDiscountGiven}
        discountedSalesCount={financialSummary.discountedSalesCount}
        totalExtraBargainingProfit={financialSummary.totalExtraBargainingProfit}
        todayExtraBargainingProfit={financialSummary.todayExtraBargainingProfit}
        extraBargainingSalesCount={financialSummary.extraBargainingSalesCount}
        totalTransactionsCount={totalTransactionsCount}
        staffCount={staffList.length}
        extraIncomeCount={extraIncomes.length}
        onOpenShopSetup={() => setIsShopSetupOpen(true)}
        onOpenPriceCodeModal={() => setIsPriceCodeModalOpen(true)}
        onOpenAllTransactions={() => {
          setLedgerSubTab('transactions');
          setActiveTab('expenses');
        }}
        onOpenDiscountLedger={() => {
          setLedgerSubTab('discounts');
          setActiveTab('expenses');
        }}
        onOpenExtraProfitLedger={() => {
          setLedgerSubTab('extra_profit');
          setActiveTab('expenses');
        }}
        onOpenQuickEntryModal={() => setIsQuickEntryModalOpen(true)}
        onOpenExtraIncomeTab={() => {
          setLedgerSubTab('extra_income');
          setActiveTab('expenses');
        }}
        onOpenStaffSalaryModal={() => setIsStaffSalaryModalOpen(true)}
        onOpenProfitCapitalModal={() => {
          setLedgerSubTab('capital');
          setActiveTab('expenses');
        }}
        onNavigateToExpenses={() => {
          setLedgerSubTab('expenses');
          setActiveTab('expenses');
        }}
        onOpenCloudSyncModal={() => setIsShopSetupOpen(true)}
        onOpenAuthPage={() => setActiveTab('auth')}
        onOpenDeveloperModal={() => setIsDeveloperModalOpen(true)}
        onUnlockDeveloperPanel={handleOpenAdminPasswordGate}
        isCloudSyncing={isCloudSyncing}
        lastCloudSyncTime={lastCloudSyncTime}
        onForceCloudSync={() => void handlePullFromCloud()}
      />

      <QuickEntryModal
        isOpen={isQuickEntryModalOpen}
        onClose={() => setIsQuickEntryModalOpen(false)}
        products={products}
        sales={sales}
        expenses={expenses}
        onAddQuickSale={handleAddQuickSale}
        onAddQuickExpense={handleAddQuickExpense}
        onRequestDeleteSale={(sale) =>
          setDeleteTarget({
            type: 'sale',
            id: sale.id,
            title: `${sale.invoiceNo} (${sale.itemsSummary})`,
            subtitle: `মোট বিক্রি: ${formatBDT(sale.grandTotal)}`,
          })
        }
        onRequestDeleteExpense={(exp) =>
          setDeleteTarget({
            type: 'expense',
            id: exp.id,
            title: `${exp.title} (${exp.category})`,
            subtitle: `খরচের পরিমাণ: ${formatBDT(exp.amount)}`,
          })
        }
      />

      <StaffSalaryModal
        isOpen={isStaffSalaryModalOpen}
        onClose={() => setIsStaffSalaryModalOpen(false)}
        staffList={staffList}
        expenses={expenses}
        onAddStaff={handleAddStaff}
        onUpdateStaff={handleUpdateStaff}
        onRequestDeleteStaff={(st) =>
          setDeleteTarget({
            type: 'staff',
            id: st.id,
            title: `${st.name} (${st.role})`,
            subtitle: `মাসিক বেতন: ${formatBDT(st.monthlySalary)}`,
          })
        }
        onPayStaffSalary={handlePayStaffSalary}
        onRequestDeleteExpense={(exp) =>
          setDeleteTarget({
            type: 'expense',
            id: exp.id,
            title: `${exp.title}`,
            subtitle: `প্রদত্ত বেতন: ${formatBDT(exp.amount)}`,
          })
        }
      />

      {isPriceCodeModalOpen && (
        <PriceCodeDirectory
          products={products}
          priceCodeKey={activePriceCodeKey}
          onOpenShopSetup={() => {
            setIsPriceCodeModalOpen(false);
            setIsShopSetupOpen(true);
          }}
          isModal={true}
          onCloseModal={() => setIsPriceCodeModalOpen(false)}
        />
      )}

      <ReceiptModal
        sale={activeReceiptSale}
        shopName={shopProfile.shopName}
        ownerName={shopProfile.ownerName}
        shopAddress={shopProfile.address}
        shopPhone={shopProfile.phone}
        onClose={() => setActiveReceiptSale(null)}
      />

      <DuePaymentReceiptModal
        receipt={activeDueReceipt}
        shopName={shopProfile.shopName}
        ownerName={shopProfile.ownerName}
        shopAddress={shopProfile.address}
        shopPhone={shopProfile.phone}
        onClose={() => setActiveDueReceipt(null)}
      />

      <ShopSetupModal
        isOpen={isShopSetupOpen}
        shopProfile={{ ...shopProfile, priceCodeKey: activePriceCodeKey }}
        currentUser={currentUser}
        isSigningIn={isSigningIn}
        isCloudSyncing={isCloudSyncing}
        authError={authError}
        cloudStatusNotice={cloudStatusNotice}
        backupPayload={{
          shopProfile: { ...shopProfile, priceCodeKey: activePriceCodeKey },
          products,
          customers,
          sales,
          expenses,
          extraIncomes,
          staff: staffList,
        }}
        onClose={() => setIsShopSetupOpen(false)}
        onSaveProfile={handleSaveShopProfile}
        onGoogleLogin={handleGoogleLoginFromSetup}
        onInstantGmailConnect={handleGoogleQuickAuth}
        onGoogleLogout={handleLogout}
        onPushToCloud={handlePushToCloud}
        onPullFromCloud={handlePullFromCloud}
        onRestoreBackup={handleRestoreBackup}
        onClearAuthError={() => setAuthError(null)}
        onClearCloudNotice={() => setCloudStatusNotice(null)}
        onOpenDeveloperModal={() => {
          setIsShopSetupOpen(false);
          setIsDeveloperModalOpen(true);
        }}
      />

      <DeveloperModal
        isOpen={isDeveloperModalOpen}
        developerProfile={developerRegistry.developerProfile}
        onClose={() => setIsDeveloperModalOpen(false)}
        onUnlockDeveloperPanel={handleOpenAdminPasswordGate}
      />

      <ActivationGateModal
        isOpen={isUserGateActive}
        registry={developerRegistry}
        onActivated={handleActivationGateUnlocked}
      />

      <AdminPasswordGateModal
        isOpen={isAdminGateActive}
        registry={developerRegistry}
        isStandaloneAdminApp={isStandaloneAdminApp}
        onSuccess={handleAdminPasswordVerified}
        onCancel={isStandaloneAdminApp ? undefined : () => setShowAdminPasswordGate(false)}
      />

      {(isStandaloneAdminApp || isAdminViewingUserShop) &&
        !isDeveloperPanelOpen &&
        !isAdminGateActive && (
          <button
            type="button"
            onClick={() => {
              setDeveloperModeUnlocked(true);
              setIsDeveloperPanelOpen(true);
            }}
            className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-royal-forest-silk px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_12px_32px_rgba(5,46,30,0.38)] hover:brightness-110 active:scale-95 transition"
          >
            <Shield className="h-4 w-4 text-amber-300" />
            <span>অ্যাডমিন প্যানেলে ফিরুন</span>
          </button>
        )}

      <SecretDeveloperPanel
        isOpen={isDeveloperPanelOpen && !isAdminGateActive}
        registry={developerRegistry}
        activeUserEmail={activeAccountEmail}
        cloudUsersMap={cloudUsersMap}
        localAccountsMap={safeLoadJSON(STORAGE_KEYS.ACCOUNTS, {})}
        isLoadingCloudUsers={isLoadingCloudUsers}
        isStandaloneAdminApp={isStandaloneAdminApp}
        onUpdateRegistry={handleUpdateDeveloperRegistry}
        onUpdateUserSnapshotFromDev={handleUpdateUserSnapshotFromDev}
        onDeleteCloudUserFromDev={handleDeleteCloudUserFromDev}
        onSwitchActiveAccountFromDev={handleSwitchActiveAccountFromDev}
        onResetDeviceActivation={handleResetDeviceActivation}
        onLockAdminApp={handleLockAdminApp}
        onRefreshCloudUsers={refreshCloudUsersList}
        onExitDeveloperMode={handleExitDeveloperMode}
        onNotify={notify}
      />

      <IosConfirmDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
