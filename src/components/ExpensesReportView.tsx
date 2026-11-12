import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  History,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Banknote,
  Gift,
  Coins,
  FileDown,
  Loader2,
  FolderCheck,
  ExternalLink,
  Percent,
  Sparkles,
} from 'lucide-react';
import {
  DuePaymentReceipt,
  Expense,
  ExpenseCategory,
  ExtraIncome,
  ExtraIncomeCategory,
  Product,
  Sale,
  Customer,
  ShopProfile,
  TransactionEntryType,
} from '../types/shop';
import { EXPENSE_CATEGORIES } from '../data/seedData';
import {
  buildUnifiedTransactions,
  calculateDateSpecificMetrics,
  calculateShopMetrics,
  formatBDT,
  formatDynamicDateTime,
  getTodayISO,
  getYesterdayISO,
} from '../utils/shopLogic';
import {
  exportElementToIdenticalPDF,
  shareOrOpenGeneratedPdf,
  PdfExportResult,
} from '../utils/pdfGenerator';
import { IosSelect } from './IosSelect';

const ROWS_PER_STATEMENT_PAGE = 14;

function toBanglaDigits(num: number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num)
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0) - 48;
      return code >= 0 && code <= 9 ? digits[code] : ch;
    })
    .join('');
}

export type LedgerSubTab =
  | 'transactions'
  | 'memos'
  | 'discounts'
  | 'extra_profit'
  | 'expenses'
  | 'extra_income'
  | 'capital';

const EXTRA_INCOME_CATEGORIES: ExtraIncomeCategory[] = [
  'বকশিস / টিপস',
  'অন্যান্য প্রাপ্ত টাকা',
  'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)',
];

interface ExpensesReportViewProps {
  shopProfile?: ShopProfile;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  extraIncomes?: ExtraIncome[];
  workingCapital: number;
  initialSubTab?: LedgerSubTab;
  onAddExpense: (expense: Omit<Expense, 'id' | 'ownerId'>) => void;
  onRequestDeleteExpense: (expense: Expense) => void;
  onAddExtraIncome?: (income: Omit<ExtraIncome, 'id' | 'ownerId'>) => void;
  onRequestDeleteExtraIncome?: (income: ExtraIncome) => void;
  onSelectSaleReceipt: (sale: Sale) => void;
  onSelectDueReceipt?: (receipt: DuePaymentReceipt) => void;
  onRequestDeleteSale: (sale: Sale) => void;
  onOpenShopSetup: () => void;
  onNotify?: (text: string, tone?: 'emerald' | 'amber' | 'rose') => void;
}

export const ExpensesReportView: React.FC<ExpensesReportViewProps> = ({
  shopProfile,
  products,
  sales,
  customers,
  expenses,
  extraIncomes = [],
  workingCapital,
  initialSubTab = 'transactions',
  onAddExpense,
  onRequestDeleteExpense,
  onAddExtraIncome,
  onRequestDeleteExtraIncome,
  onSelectSaleReceipt,
  onSelectDueReceipt,
  onRequestDeleteSale,
  onOpenShopSetup,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<LedgerSubTab>(initialSubTab);
  const [memoSearch, setMemoSearch] = useState('');
  const [discountSearch, setDiscountSearch] = useState('');
  const [extraProfitSearch, setExtraProfitSearch] = useState('');
  const [showOnlyDiscountedMemos, setShowOnlyDiscountedMemos] = useState(true);
  const [showOnlyExtraProfitMemos, setShowOnlyExtraProfitMemos] =
    useState(true);
  const [isExportingReportPdf, setIsExportingReportPdf] = useState(false);
  const [lastReportPdfResult, setLastReportPdfResult] =
    useState<PdfExportResult | null>(null);

  // All Transactions filter states
  const todayISO = getTodayISO();
  const yesterdayISO = getYesterdayISO(todayISO);
  const [txDayFilter, setTxDayFilter] = useState<
    'all' | 'today' | 'yesterday' | 'custom' | 'month' | 'range'
  >('all');
  const [txCustomDate, setTxCustomDate] = useState<string>(todayISO);
  const [txCustomMonth, setTxCustomMonth] = useState<string>(() =>
    todayISO.slice(0, 7)
  );
  const [txFromDate, setTxFromDate] = useState<string>(yesterdayISO);
  const [txToDate, setTxToDate] = useState<string>(todayISO);
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | TransactionEntryType>(
    'all'
  );
  const [txSearch, setTxSearch] = useState('');

  // Expense form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('দোকান ভাড়া');
  const [amount, setAmount] = useState('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(todayISO);
  const [expError, setExpError] = useState<string | null>(null);

  // Extra Income / Tips / Capital Inject form states
  const [incTitle, setIncTitle] = useState('');
  const [incCategory, setIncCategory] =
    useState<ExtraIncomeCategory>('বকশিস / টিপস');
  const [incAmount, setIncAmount] = useState('');
  const [incDateInput, setIncDateInput] = useState<string>(todayISO);
  const [incError, setIncError] = useState<string | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const metrics = useMemo(
    () =>
      calculateShopMetrics(
        products,
        sales,
        customers,
        expenses,
        workingCapital,
        todayISO,
        extraIncomes
      ),
    [products, sales, customers, expenses, workingCapital, todayISO, extraIncomes]
  );

  const allTransactions = useMemo(
    () =>
      buildUnifiedTransactions(
        sales,
        expenses,
        products,
        todayISO,
        extraIncomes,
        customers
      ),
    [sales, expenses, products, todayISO, extraIncomes, customers]
  );

  const filteredTransactions = useMemo(() => {
    const startISO =
      txFromDate <= txToDate ? txFromDate || todayISO : txToDate || todayISO;
    const endISO =
      txFromDate <= txToDate ? txToDate || todayISO : txFromDate || todayISO;

    return allTransactions.filter((tx) => {
      if (txDayFilter === 'today' && tx.dateISO !== todayISO) return false;
      if (txDayFilter === 'yesterday' && tx.dateISO !== yesterdayISO)
        return false;
      if (txDayFilter === 'custom' && txCustomDate && tx.dateISO !== txCustomDate)
        return false;
      if (
        txDayFilter === 'month' &&
        txCustomMonth &&
        !String(tx.dateISO || '').startsWith(txCustomMonth)
      )
        return false;
      if (
        txDayFilter === 'range' &&
        (tx.dateISO < startISO || tx.dateISO > endISO)
      )
        return false;
      if (txTypeFilter !== 'all') {
        if (txTypeFilter === 'sale') {
          if (tx.type !== 'sale' && tx.type !== 'quick_sale') return false;
        } else if (txTypeFilter === 'expense') {
          if (tx.type !== 'expense' && tx.type !== 'staff_salary') return false;
        } else if (tx.type !== txTypeFilter) {
          return false;
        }
      }
      const q = txSearch.trim().toLowerCase();
      if (q) {
        return (
          tx.title.toLowerCase().includes(q) ||
          tx.subtitle.toLowerCase().includes(q) ||
          tx.categoryBadge.toLowerCase().includes(q) ||
          tx.fullDateTimeLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    allTransactions,
    txDayFilter,
    txCustomDate,
    txCustomMonth,
    txFromDate,
    txToDate,
    txTypeFilter,
    txSearch,
    todayISO,
    yesterdayISO,
  ]);

  const filteredTxSummary = useMemo(() => {
    let cashIn = 0;
    let expenseOut = 0;
    let stockCapitalOut = 0;
    let profitSum = 0;
    for (const tx of filteredTransactions) {
      if (
        tx.type === 'sale' ||
        tx.type === 'quick_sale' ||
        tx.type === 'extra_income' ||
        tx.type === 'due_collection'
      ) {
        cashIn += Number(tx.cashAmount) || 0;
        profitSum += Number(tx.profit) || 0;
      } else if (tx.type === 'expense' || tx.type === 'staff_salary') {
        expenseOut += Number(tx.cashAmount) || 0;
      } else if (tx.type === 'stock_capital') {
        stockCapitalOut += Number(tx.cashAmount) || 0;
      }
    }
    const netProfitForFilter = profitSum - expenseOut;
    return {
      cashIn,
      expenseOut,
      stockCapitalOut,
      profitSum,
      netProfitForFilter,
    };
  }, [filteredTransactions]);

  const activeFilterPeriodLabel = useMemo(() => {
    if (txDayFilter === 'today') return `আজকের হিসাব (${todayISO})`;
    if (txDayFilter === 'yesterday') return `গতকালের হিসাব (${yesterdayISO})`;
    if (txDayFilter === 'custom') return `নির্দিষ্ট তারিখ (${txCustomDate})`;
    if (txDayFilter === 'month') return `মাসিক হিসাব (${txCustomMonth})`;
    if (txDayFilter === 'range')
      return `তারিখ সীমা (${txFromDate} থেকে ${txToDate})`;
    return 'সর্বমোট সব দিনের হিসাব (All Time)';
  }, [
    txDayFilter,
    todayISO,
    yesterdayISO,
    txCustomDate,
    txCustomMonth,
    txFromDate,
    txToDate,
  ]);

  const statementTransactionPages = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return [[]];
    }
    const pages: typeof filteredTransactions[] = [];
    for (
      let i = 0;
      i < filteredTransactions.length;
      i += ROWS_PER_STATEMENT_PAGE
    ) {
      pages.push(
        filteredTransactions.slice(i, i + ROWS_PER_STATEMENT_PAGE)
      );
    }
    return pages.length > 0 ? pages : [[]];
  }, [filteredTransactions]);

  const handleDownloadFullFinancialReportPdf = async () => {
    if (isExportingReportPdf) return;
    setIsExportingReportPdf(true);
    try {
      const targetEl = document.getElementById('printable-financial-statement');
      if (!targetEl) {
        onNotify?.('পিডিএফ রিপোর্ট তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'rose');
        return;
      }
      const periodSlug =
        txDayFilter === 'today'
          ? todayISO
          : txDayFilter === 'yesterday'
          ? yesterdayISO
          : txDayFilter === 'custom'
          ? txCustomDate
          : txDayFilter === 'month'
          ? txCustomMonth
          : txDayFilter === 'range'
          ? `${txFromDate}-to-${txToDate}`
          : 'All-Time';
      const res = await exportElementToIdenticalPDF(
        targetEl,
        `Dookanify-Report-${periodSlug}.pdf`
      );
      setLastReportPdfResult(res);
      onNotify?.(
        `Saved: ${res.savedPath} (${res.pageCount} পৃষ্ঠা) — ডাউনলোড সম্পন্ন!`,
        'emerald'
      );
    } catch {
      onNotify?.('পিডিএফ রিপোর্ট তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'rose');
    } finally {
      setIsExportingReportPdf(false);
    }
  };

  const selectedDayMetrics = useMemo(() => {
    const targetDate =
      txDayFilter === 'yesterday'
        ? yesterdayISO
        : txDayFilter === 'custom' && txCustomDate
        ? txCustomDate
        : todayISO;
    return calculateDateSpecificMetrics(
      sales,
      expenses,
      targetDate,
      extraIncomes
    );
  }, [
    sales,
    expenses,
    extraIncomes,
    txDayFilter,
    txCustomDate,
    todayISO,
    yesterdayISO,
  ]);

  const matchesActiveDateFilter = useMemo(() => {
    const startISO =
      txFromDate <= txToDate ? txFromDate || todayISO : txToDate || todayISO;
    const endISO =
      txFromDate <= txToDate ? txToDate || todayISO : txFromDate || todayISO;

    return (rawDateISO?: string): boolean => {
      const dateStr = (rawDateISO || todayISO).trim();
      if (txDayFilter === 'today') return dateStr === todayISO;
      if (txDayFilter === 'yesterday') return dateStr === yesterdayISO;
      if (txDayFilter === 'custom')
        return !txCustomDate || dateStr === txCustomDate;
      if (txDayFilter === 'month')
        return !txCustomMonth || dateStr.startsWith(txCustomMonth);
      if (txDayFilter === 'range')
        return dateStr >= startISO && dateStr <= endISO;
      return true;
    };
  }, [
    txDayFilter,
    txCustomDate,
    txCustomMonth,
    txFromDate,
    txToDate,
    todayISO,
    yesterdayISO,
  ]);

  const renderPeriodFilterBar = (
    accentColor: 'emerald' | 'rose' | 'amber' = 'emerald'
  ) => {
    const activeBtnClass =
      accentColor === 'rose'
        ? 'bg-rose-600 text-white shadow-2xs'
        : accentColor === 'amber'
        ? 'bg-amber-600 text-white shadow-2xs'
        : 'bg-emerald-700 text-white shadow-2xs';

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500">দিন/মাস:</span>
        <button
          type="button"
          onClick={() => setTxDayFilter('all')}
          className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold transition ${
            txDayFilter === 'all'
              ? activeBtnClass
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          আজ পর্যন্ত সব
        </button>
        <button
          type="button"
          onClick={() => setTxDayFilter('today')}
          className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold transition ${
            txDayFilter === 'today'
              ? activeBtnClass
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          আজকের হিসাব
        </button>
        <button
          type="button"
          onClick={() => setTxDayFilter('yesterday')}
          className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold transition ${
            txDayFilter === 'yesterday'
              ? 'bg-indigo-700 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          গতকালের হিসাব
        </button>
        <button
          type="button"
          onClick={() => setTxDayFilter('month')}
          className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold transition ${
            txDayFilter === 'month'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          পুরো মাসের হিসাব
        </button>
        <button
          type="button"
          onClick={() => setTxDayFilter('range')}
          className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold transition ${
            txDayFilter === 'range'
              ? 'bg-amber-500 text-slate-950 shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          কত থেকে কত তারিখ
        </button>
        <div
          className={`inline-flex items-center gap-1.5 rounded-2xl border px-2.5 py-1 ${
            txDayFilter === 'custom'
              ? 'border-emerald-500 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[10px] font-extrabold text-slate-500">
            নির্দিষ্ট তারিখ:
          </span>
          <input
            type="date"
            value={txCustomDate}
            onChange={(e) => {
              setTxCustomDate(e.target.value);
              setTxDayFilter('custom');
            }}
            aria-label="নির্দিষ্ট তারিখ নির্বাচন করুন"
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none num-clear"
          />
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-2xl border px-2.5 py-1 ${
            txDayFilter === 'month'
              ? 'border-emerald-500 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-extrabold text-slate-500">মাস:</span>
          <input
            type="month"
            value={txCustomMonth}
            onChange={(e) => {
              setTxCustomMonth(e.target.value);
              setTxDayFilter('month');
            }}
            aria-label="মাস নির্বাচন করুন"
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none num-clear"
          />
        </div>
        {txDayFilter === 'range' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-amber-300 bg-amber-50/80 px-2.5 py-1">
              <span className="text-[10px] font-extrabold text-amber-900">
                শুরু:
              </span>
              <input
                type="date"
                value={txFromDate}
                onChange={(e) => setTxFromDate(e.target.value)}
                aria-label="শুরুর তারিখ"
                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none num-clear"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">থেকে</span>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-amber-300 bg-amber-50/80 px-2.5 py-1">
              <span className="text-[10px] font-extrabold text-amber-900">
                শেষ:
              </span>
              <input
                type="date"
                value={txToDate}
                onChange={(e) => setTxToDate(e.target.value)}
                aria-label="শেষ তারিখ"
                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none num-clear"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (!matchesActiveDateFilter(s.saleDateISO)) return false;
      const q = memoSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerPhone.toLowerCase().includes(q) ||
        s.itemsSummary.toLowerCase().includes(q)
      );
    });
  }, [sales, matchesActiveDateFilter, memoSearch]);

  const filteredDiscountSales = useMemo(() => {
    return sales.filter((s) => {
      const disc = Math.max(0, Number(s.discount) || 0);
      if (showOnlyDiscountedMemos && disc <= 0) return false;
      if (!matchesActiveDateFilter(s.saleDateISO)) return false;
      const q = discountSearch.trim().toLowerCase();
      if (q) {
        return (
          s.invoiceNo.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerPhone.toLowerCase().includes(q) ||
          s.itemsSummary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    sales,
    showOnlyDiscountedMemos,
    matchesActiveDateFilter,
    discountSearch,
  ]);

  const filteredDiscountSummary = useMemo(() => {
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalNetBill = 0;
    for (const s of filteredDiscountSales) {
      totalSubtotal += Math.max(0, Number(s.subtotal || s.grandTotal) || 0);
      totalDiscount += Math.max(0, Number(s.discount) || 0);
      totalNetBill += Math.max(0, Number(s.grandTotal) || 0);
    }
    return {
      totalSubtotal,
      totalDiscount,
      totalNetBill,
      count: filteredDiscountSales.length,
    };
  }, [filteredDiscountSales]);

  const filteredExtraProfitSales = useMemo(() => {
    return sales.filter((s) => {
      const extra = Math.max(0, Number(s.extraBargainingProfit) || 0);
      if (showOnlyExtraProfitMemos && extra <= 0) return false;
      if (!matchesActiveDateFilter(s.saleDateISO)) return false;
      const q = extraProfitSearch.trim().toLowerCase();
      if (q) {
        return (
          s.invoiceNo.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerPhone.toLowerCase().includes(q) ||
          s.itemsSummary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    sales,
    showOnlyExtraProfitMemos,
    matchesActiveDateFilter,
    extraProfitSearch,
  ]);

  const filteredExtraProfitSummary = useMemo(() => {
    let totalBaseSubtotal = 0;
    let totalExtraProfit = 0;
    let totalNetBill = 0;
    let totalProfit = 0;
    for (const s of filteredExtraProfitSales) {
      const extra = Math.max(0, Number(s.extraBargainingProfit) || 0);
      const grand = Math.max(0, Number(s.grandTotal) || 0);
      const base = Math.max(0, grand - extra);
      totalBaseSubtotal += base;
      totalExtraProfit += extra;
      totalNetBill += grand;
      totalProfit += Number(s.profit) || 0;
    }
    return {
      totalBaseSubtotal,
      totalExtraProfit,
      totalNetBill,
      totalProfit,
      count: filteredExtraProfitSales.length,
    };
  }, [filteredExtraProfitSales]);

  const filteredExpensesList = useMemo(() => {
    return expenses.filter((exp) => matchesActiveDateFilter(exp.expenseDateISO));
  }, [expenses, matchesActiveDateFilter]);

  const filteredExtraIncomesList = useMemo(() => {
    return extraIncomes.filter((inc) =>
      matchesActiveDateFilter(inc.incomeDateISO)
    );
  }, [extraIncomes, matchesActiveDateFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    const amountNum = Number(amount);
    if (!title.trim()) {
      setExpError('খরচের বিবরণ লিখুন।');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpError('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    const now = new Date();
    const nowTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const chosenDateISO = expenseDateInput || todayISO;
    const dynamicDT = formatDynamicDateTime(
      chosenDateISO,
      nowTime,
      now.toISOString(),
      todayISO
    );

    onAddExpense({
      title: title.trim(),
      category,
      amount: Math.round(amountNum),
      expenseDateISO: chosenDateISO,
      dateLabel: `${dynamicDT.relativeBadge}, ${nowTime}`,
      createdAtISO: now.toISOString(),
    });
    setTitle('');
    setAmount('');
    setExpenseDateInput(todayISO);
  };

  const handleAddExtraIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIncError(null);
    const amountNum = Number(incAmount);
    if (!incTitle.trim()) {
      setIncError('টাকা পাওয়ার বিবরণ লিখুন।');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setIncError('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }
    if (!onAddExtraIncome) return;

    const now = new Date();
    const nowTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const chosenDateISO = incDateInput || todayISO;
    const dynamicDT = formatDynamicDateTime(
      chosenDateISO,
      nowTime,
      now.toISOString(),
      todayISO
    );

    onAddExtraIncome({
      title: incTitle.trim(),
      category: incCategory,
      amount: Math.round(amountNum),
      incomeDateISO: chosenDateISO,
      dateLabel: `${dynamicDT.relativeBadge}, ${nowTime}`,
      createdAtISO: now.toISOString(),
    });
    setIncTitle('');
    setIncAmount('');
    setIncDateInput(todayISO);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Switchable 7 Sub-Tabs Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setSubTab('transactions')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'transactions'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span>সব লেনদেন ({allTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('memos')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'memos'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span>ক্যাশ মেমো ({sales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('discounts')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'discounts'
                ? 'bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="h-4 w-4 shrink-0" />
            <span>ছাড়ের হিসাব ({metrics.discountedSalesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('extra_profit')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'extra_profit'
                ? 'bg-gradient-to-br from-emerald-700 via-teal-700 to-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>বাড়তি মুনাফা ({metrics.extraBargainingSalesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('expenses')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'expenses'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span>খরচের খাতা ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('extra_income')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'extra_income'
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="h-4 w-4 shrink-0" />
            <span>বকশিস ও ক্যাশ যোগ ({extraIncomes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('capital')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-extrabold transition-all active:scale-[0.97] ${
              subTab === 'capital'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>পুঁজি ও লাভ-লস</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 0: সব লেনদেন (তারিখ ও সময় সহ) */}
      {subTab === 'transactions' && (
        <div className="space-y-4 animate-fade-up">
          {/* Header & Filters Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-extrabold text-emerald-800">
                  <Clock className="h-3.5 w-3.5" />
                  <span>আজকের হিসাব আগামীকাল স্বয়ংক্রিয়ভাবে গতকাল হিসেবে সংরক্ষিত থাকে</span>
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                  সব লেনদেন খাতা — তারিখ ও সময় সহ ({filteredTransactions.length} টি)
                </h2>
                <p className="text-xs text-slate-500">
                  বিক্রয় মেমো, দ্রুত এন্ট্রি, বকশিস, দৈনিক খরচ এবং পুঁজি বিনিয়োগের প্রতিটি লেনদেন
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="লেনদেন, মেমো বা খাত খুঁজুন..."
                    aria-label="লেনদেন খুঁজুন"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadFullFinancialReportPdf}
                  disabled={isExportingReportPdf}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#e6c34a] to-[#f3cc56] border border-amber-400/50 hover:brightness-105 disabled:opacity-60 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition active:scale-[0.98] shrink-0"
                >
                  {isExportingReportPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  ) : (
                    <FileDown className="h-4 w-4 text-slate-950" />
                  )}
                  <span>
                    {isExportingReportPdf
                      ? 'পিডিএফ রিপোর্ট তৈরি হচ্ছে...'
                      : 'সম্পূর্ণ পিডিএফ হিসাব বিবরণী ডাউনলোড'}
                  </span>
                </button>
              </div>
            </div>

            {lastReportPdfResult && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="num-clear font-extrabold text-emerald-950 truncate">
                    Saved: {lastReportPdfResult.savedPath} ({toBanglaDigits(lastReportPdfResult.pageCount)} পৃষ্ঠা)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void shareOrOpenGeneratedPdf(
                      lastReportPdfResult,
                      `${shopProfile?.shopName || 'Dookanify'} - হিসাব বিবরণী`
                    )
                  }
                  className="inline-flex items-center gap-1 shrink-0 rounded-xl bg-emerald-700 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-emerald-800 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>ফাইল ওপেন / শেয়ার করুন</span>
                </button>
              </div>
            )}

            {/* Day Filter & Type Filter Pills */}
            <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between border-t border-slate-100">
              {renderPeriodFilterBar('emerald')}

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">ধরণ:</span>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    txTypeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  সব
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('sale')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    txTypeFilter === 'sale'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  বিক্রয় (+জমা)
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('extra_income')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    txTypeFilter === 'extra_income'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  বকশিস/পুঁজি যোগ
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('expense')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    txTypeFilter === 'expense'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  খরচ (-ব্যয়)
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('stock_capital')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    txTypeFilter === 'stock_capital'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  স্টক পুঁজি
                </button>
              </div>
            </div>

            {/* Summary Strip for Selected Filter */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5">
                <div className="text-[11px] font-bold text-emerald-900">
                  নগদ জমা (+In: বিক্রয় ও বকশিস)
                </div>
                <div className="num-clear mt-1 text-lg font-extrabold text-emerald-700">
                  +{formatBDT(filteredTxSummary.cashIn)}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-3.5">
                <div className="text-[11px] font-bold text-rose-900">
                  দোকান ও বেতন খরচ (-Expense)
                </div>
                <div className="num-clear mt-1 text-lg font-extrabold text-rose-600">
                  -{formatBDT(filteredTxSummary.expenseOut)}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5">
                <div className="text-[11px] font-bold text-amber-950">
                  মাল ক্রয় / স্টক বাবদ ব্যয় (-Stock)
                </div>
                <div className="num-clear mt-1 text-lg font-extrabold text-amber-900">
                  -{formatBDT(filteredTxSummary.stockCapitalOut)}
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-3.5">
                <div className="text-[11px] font-bold text-indigo-950">
                  এখন হাতে নগদ টাকা আছে
                </div>
                <div className="num-clear mt-1 text-lg font-extrabold text-indigo-800">
                  {formatBDT(metrics.currentCashInHand)}
                </div>
              </div>
            </div>
          </div>

          {/* Printable Full A4 Financial Statement Template for 1-Click PDF Export (Smart Row-Based Multi-Page Pagination) */}
          <div className="fixed left-[-10000px] top-0 pointer-events-none">
            <div
              id="printable-financial-statement"
              className="w-[820px] bg-white text-slate-900 space-y-6"
            >
              {statementTransactionPages.map((pageRows, pageIdx) => {
                const totalStatementPages = statementTransactionPages.length;
                const isFirstPage = pageIdx === 0;
                const isLastPage = pageIdx === totalStatementPages - 1;
                const rowStartIdx = pageIdx * ROWS_PER_STATEMENT_PAGE;

                return (
                  <div
                    key={pageIdx}
                    data-pdf-page="true"
                    className="w-[820px] rounded-3xl border-2 border-amber-500/45 bg-white p-7 text-slate-900 space-y-4"
                  >
                    {/* Non-Clipping Royal Forest Green & Golden Silk Top Header Banner (px-6 py-5 text-center) */}
                    <div
                      className="rounded-3xl px-6 py-5 text-center text-white border border-amber-400/40"
                      style={{
                        backgroundColor: '#052e1e',
                        backgroundImage:
                          'linear-gradient(135deg, #052e1e 0%, #0a4d34 55%, #065f46 100%)',
                      }}
                    >
                      <div
                        className="inline-block rounded-full px-4 py-1 text-[11px] font-extrabold leading-normal text-slate-950"
                        style={{
                          backgroundColor: '#d4af37',
                          backgroundImage:
                            'linear-gradient(135deg, #d4af37 0%, #f3cc56 100%)',
                        }}
                      >
                        Dookanify • ডিজিটাল হিসাব বিবরণী (Financial Statement)
                      </div>
                      <h1 className="mt-2.5 text-2xl font-extrabold leading-relaxed text-white px-2">
                        {shopProfile?.shopName ||
                          'সোনার বাংলা বস্ত্রালয় অ্যান্ড ফ্যাশন হাউস'}
                      </h1>
                      <p className="text-xs leading-relaxed text-emerald-100 mt-1 px-2">
                        {shopProfile?.ownerName
                          ? `প্রোপ্রাইটর: ${shopProfile.ownerName} • `
                          : ''}
                        {shopProfile?.address || 'সীতাকুণ্ড, চট্টগ্রাম'} • মোবাইল:{' '}
                        {shopProfile?.phone || '01843373523'}
                      </p>
                      <div className="mt-2.5 flex items-center justify-center gap-4 text-xs">
                        <span className="inline-block rounded-full bg-white/15 px-3 py-1 font-extrabold leading-normal text-amber-300 num-clear">
                          রিপোর্ট সময়কাল: {activeFilterPeriodLabel}
                        </span>
                        <span className="inline-block rounded-full bg-white/15 px-3 py-1 font-bold leading-normal text-emerald-100 num-clear">
                          মোট লেনদেন: {filteredTransactions.length} টি
                        </span>
                      </div>
                    </div>

                    {/* 5 KPI Summary Cards on Page 1 */}
                    {isFirstPage && (
                      <div className="grid grid-cols-5 gap-3 text-xs">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                          <div className="text-[10px] font-bold text-emerald-900">
                            নগদ জমা (+In)
                          </div>
                          <div className="num-clear mt-1 text-base font-extrabold text-emerald-700">
                            +{formatBDT(filteredTxSummary.cashIn)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                          <div className="text-[10px] font-bold text-rose-900">
                            দোকান ও বেতন খরচ
                          </div>
                          <div className="num-clear mt-1 text-base font-extrabold text-rose-600">
                            -{formatBDT(filteredTxSummary.expenseOut)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <div className="text-[10px] font-bold text-amber-950">
                            মাল ক্রয় / স্টক ব্যয়
                          </div>
                          <div className="num-clear mt-1 text-base font-extrabold text-amber-900">
                            -{formatBDT(filteredTxSummary.stockCapitalOut)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3">
                          <div className="text-[10px] font-bold text-teal-950">
                            নিট লাভ / ব্যালেন্স
                          </div>
                          <div className="num-clear mt-1 text-base font-extrabold text-teal-800">
                            {filteredTxSummary.netProfitForFilter >= 0
                              ? '+'
                              : ''}
                            {formatBDT(filteredTxSummary.netProfitForFilter)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                          <div className="text-[10px] font-bold text-indigo-950">
                            বর্তমান হাতে নগদ
                          </div>
                          <div className="num-clear mt-1 text-base font-extrabold text-indigo-800">
                            {formatBDT(metrics.currentCashInHand)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transactions Table for this Page */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr
                            className="text-white text-left"
                            style={{ backgroundColor: '#052e1e' }}
                          >
                            <th className="py-2.5 px-3 font-extrabold">#</th>
                            <th className="py-2.5 px-3 font-extrabold">
                              তারিখ ও সময়
                            </th>
                            <th className="py-2.5 px-3 font-extrabold">
                              খাত ও বিবরণ
                            </th>
                            <th className="py-2.5 px-3 font-extrabold">ধরণ</th>
                            <th className="py-2.5 px-3 font-extrabold text-right">
                              লাভ/লস
                            </th>
                            <th className="py-2.5 px-3 font-extrabold text-right">
                              পরিমাণ (৳)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {pageRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-6 text-center text-slate-500"
                              >
                                নির্বাচিত সময়কালে কোনো লেনদেন নেই
                              </td>
                            </tr>
                          ) : (
                            pageRows.map((tx, idx) => {
                              const rowNumber = rowStartIdx + idx + 1;
                              const isSale =
                                tx.type === 'sale' || tx.type === 'quick_sale';
                              return (
                                <tr key={tx.id} className="bg-white">
                                  <td className="py-2 px-3 font-bold text-slate-500 num-clear">
                                    {rowNumber}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-700 num-clear whitespace-nowrap">
                                    {tx.dateFormatted}
                                    {tx.timeFormatted
                                      ? ` • ${tx.timeFormatted}`
                                      : ''}
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="font-extrabold text-slate-900">
                                      {tx.title}
                                    </div>
                                    <div className="text-[10px] text-slate-500 num-clear">
                                      {tx.subtitle}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-700">
                                    {tx.categoryBadge}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold num-clear">
                                    {isSale
                                      ? `${(tx.profit || 0) >= 0 ? '+' : ''}${formatBDT(tx.profit || 0)}`
                                      : '—'}
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right font-extrabold num-clear whitespace-nowrap ${
                                      tx.direction === 'in'
                                        ? 'text-emerald-700'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {tx.direction === 'in' ? '+' : '-'}
                                    {formatBDT(tx.cashAmount)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Continuation Notice on Non-Final Pages vs Summary & Signatures ONLY on Final Page */}
                    {!isLastPage ? (
                      <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 px-4 py-2 text-center text-xs font-extrabold text-amber-950">
                        পরবর্তী পৃষ্ঠায় বাকি লেনদেন চলমান — চূড়ান্ত সারসংক্ষেপ পৃষ্ঠা{' '}
                        {toBanglaDigits(totalStatementPages)}-এ দেখুন...
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-dashed border-slate-300">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 num-clear">
                          <span>
                            মোট স্টক ভ্যালু:{' '}
                            {formatBDT(metrics.totalInventoryCostValue)} •
                            কাস্টমার বকেয়া:{' '}
                            {formatBDT(metrics.totalReceivableDue)} • মোট ব্যবসার
                            পুঁজি: {formatBDT(metrics.totalBusinessWorth)}
                          </span>
                          <span>
                            নিট ব্যালেন্স:{' '}
                            {filteredTxSummary.netProfitForFilter >= 0
                              ? '+'
                              : ''}
                            {formatBDT(filteredTxSummary.netProfitForFilter)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-4 pt-4">
                          <span className="border-t border-slate-400 pt-1 px-3">
                            হিসাব প্রস্তুতকারী / ক্যাশিয়ার
                          </span>
                          <span className="border-t border-slate-400 pt-1 px-3">
                            প্রোপ্রাইটর / স্বত্বাধিকারীর স্বাক্ষর
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Explicit Page Numbering Footer on Every Page */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-extrabold text-slate-500 num-clear">
                      <span>
                        Dookanify Smart POS • অফলাইন ও ক্লাউড ব্যাকআপ সুরক্ষিত
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-emerald-900">
                        পৃষ্ঠা {toBanglaDigits(pageIdx + 1)} /{' '}
                        {toBanglaDigits(totalStatementPages)} (Page{' '}
                        {pageIdx + 1} of {totalStatementPages})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronological Transactions Timeline */}
          {filteredTransactions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <History className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">
                নির্বাচিত ফিল্টারে কোনো লেনদেন পাওয়া যায়নি
              </p>
              <p className="mt-1 text-xs text-slate-500">
                বিক্রয় মেমো কাটলে, দ্রুত বিক্রি/খরচ যোগ করলে বা বকশিস যোগ করলে তারিখ ও সময় সহ এখানে জমা হবে।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const isSale = tx.type === 'sale' || tx.type === 'quick_sale';
                const isDueCollection = tx.type === 'due_collection';
                const isExtraIncome = tx.type === 'extra_income';
                const isExpense =
                  tx.type === 'expense' || tx.type === 'staff_salary';
                return (
                  <div
                    key={tx.id}
                    className="card-interactive flex flex-col justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_6px_25px_rgb(0,0,0,0.04)] sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          isSale || isDueCollection
                            ? 'bg-emerald-50 text-emerald-700'
                            : isExtraIncome
                            ? 'bg-amber-50 text-amber-700'
                            : isExpense
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {isSale || isDueCollection ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : isExtraIncome ? (
                          <Gift className="h-5 w-5" />
                        ) : isExpense ? (
                          <ArrowDownRight className="h-5 w-5" />
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Dynamic Day Badge: আজ / গতকাল / তারিখ */}
                          <span
                            className={`num-clear rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                              tx.relativeDayBadge === 'আজ'
                                ? 'bg-emerald-700 text-white'
                                : tx.relativeDayBadge === 'গতকাল'
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {tx.relativeDayBadge}
                          </span>

                          {/* Exact Date & Time Badge */}
                          <span className="num-clear inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>
                              {tx.dateFormatted}
                              {tx.timeFormatted ? ` • ${tx.timeFormatted}` : ''}
                            </span>
                          </span>

                          {/* Category Badge */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isSale || isDueCollection
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isExtraIncome
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : isExpense
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {tx.categoryBadge}
                          </span>
                        </div>

                        <div className="text-sm sm:text-base font-extrabold text-slate-900">
                          {tx.title}
                        </div>
                        <div className="text-xs text-slate-600 num-clear">
                          {tx.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <div
                          className={`num-clear text-base font-extrabold tabular-nums ${
                            tx.direction === 'in'
                              ? 'text-emerald-700'
                              : isExpense
                              ? 'text-rose-600'
                              : 'text-indigo-700'
                          }`}
                        >
                          {tx.direction === 'in' ? '+' : '-'}
                          {formatBDT(tx.cashAmount)}
                        </div>
                        {isSale && (
                          <div className="num-clear text-[11px] font-bold text-slate-500">
                            বিল: {formatBDT(tx.amount)} •{' '}
                            {(tx.profit || 0) < 0 ? (
                              <span className="text-rose-600">
                                বিক্রয়ে লস: {formatBDT(tx.profit || 0)}
                              </span>
                            ) : (
                              <span>লাভ: +{formatBDT(tx.profit || 0)}</span>
                            )}
                            {tx.dueAmount && tx.dueAmount > 0
                              ? ` • বাকি: ${formatBDT(tx.dueAmount)}`
                              : ''}
                          </div>
                        )}
                        {!isSale && (
                          <div className="num-clear text-[11px] font-semibold text-slate-400">
                            {isDueCollection
                              ? 'বকেয়া আদায় নগদে জমা (+In)'
                              : isExtraIncome
                              ? 'হাতে নগদে সরাসরি যোগ (+In)'
                              : isExpense
                              ? 'দোকান পরিচালনা খরচ (-Out)'
                              : 'মাল ক্রয় / স্টক বাবদ ব্যয় (-Out)'}
                          </div>
                        )}
                      </div>

                      {tx.rawSale && (
                        <div className="flex items-center gap-1.5">
                          {!tx.rawSale.isQuickLumpSum && (
                            <button
                              type="button"
                              onClick={() => onSelectSaleReceipt(tx.rawSale!)}
                              className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                            >
                              মেমো
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onRequestDeleteSale(tx.rawSale!)}
                            aria-label="মেমো বা বিক্রি ডিলিট করুন"
                            className="rounded-2xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {tx.rawDueReceipt && onSelectDueReceipt && (
                        <button
                          type="button"
                          onClick={() => onSelectDueReceipt(tx.rawDueReceipt!)}
                          className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                        >
                          বকেয়া রশিদ
                        </button>
                      )}

                      {tx.rawExpense && (
                        <button
                          type="button"
                          onClick={() => onRequestDeleteExpense(tx.rawExpense!)}
                          aria-label="খরচ ডিলিট করুন"
                          className="rounded-2xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      {tx.rawExtraIncome && onRequestDeleteExtraIncome && (
                        <button
                          type="button"
                          onClick={() =>
                            onRequestDeleteExtraIncome(tx.rawExtraIncome!)
                          }
                          aria-label="বকশিস বা ক্যাশ এন্ট্রি ডিলিট করুন"
                          className="rounded-2xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: ক্যাশ মেমো রেজিস্টার */}
      {subTab === 'memos' && (
        <div className="space-y-4 animate-fade-up">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  ক্যাশ মেমো রেজিস্টার ({filteredSales.length} টি মেমো)
                </h2>
                <p className="text-xs text-slate-500">
                  সকল বিক্রয় রশিদের পিডিএফ ডাউনলোড, প্রিন্ট অথবা ডিলিট করুন (তারিখ ও সময় সহ)
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={memoSearch}
                  onChange={(e) => setMemoSearch(e.target.value)}
                  placeholder="মেমো নং বা ক্রেতার নাম খুঁজুন..."
                  aria-label="ক্যাশ মেমো খুঁজুন"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              {renderPeriodFilterBar('emerald')}
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-700">
                কোনো ক্যাশ মেমো পাওয়া যায়নি
              </p>
              <p className="mt-1 text-xs text-slate-500">
                পস বিলিং কাউন্টার থেকে পোশাক বিক্রি করলে এখানে ক্যাশ মেমো জমা হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredSales.map((sale) => {
                const dt = formatDynamicDateTime(
                  sale.saleDateISO,
                  sale.dateLabel,
                  sale.createdAtISO,
                  todayISO
                );
                return (
                  <div
                    key={sale.id}
                    className="card-interactive flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all hover:border-emerald-300"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="num-clear rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                          {sale.invoiceNo}
                        </span>
                        <span className="num-clear inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{dt.fullLabel}</span>
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-base font-bold text-slate-900">
                          {sale.customerName}
                        </div>
                        {sale.customerPhone && (
                          <div className="num-clear text-xs font-bold text-slate-500">
                            মোবাইল: {sale.customerPhone}
                          </div>
                        )}
                        <div className="mt-1.5 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
                          {sale.itemsSummary}
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                          <div className="text-[10px] text-slate-500">মোট বিল</div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">
                            {formatBDT(sale.grandTotal)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                          <div className="text-[10px] text-slate-500">বাকি</div>
                          <div
                            className={`num-clear mt-0.5 text-sm font-extrabold tabular-nums ${
                              sale.dueAmount > 0
                                ? 'text-amber-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatBDT(sale.dueAmount)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                          <div className="text-[10px] text-slate-500">
                            {sale.profit < 0 ? 'বিক্রয়ে লস' : 'নিট লাভ'}
                          </div>
                          <div
                            className={`num-clear mt-0.5 text-sm font-extrabold tabular-nums ${
                              sale.profit < 0
                                ? 'text-rose-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {sale.profit < 0
                              ? formatBDT(sale.profit)
                              : `+${formatBDT(sale.profit)}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                      <button
                        type="button"
                        onClick={() => onSelectSaleReceipt(sale)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>পিডিএফ ও মেমো দেখুন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRequestDeleteSale(sale)}
                        aria-label={`${sale.invoiceNo} মেমো ডিলিট করুন`}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>ডিলিট</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1B: ডিসকাউন্ট ও ছাড়ের হিসাব (Discount Given Ledger) */}
      {subTab === 'discounts' && (
        <div className="space-y-4 animate-fade-up">
          {/* 4 KPI Summary Cards for Discounts Given */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-3xl border border-rose-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                আজকের প্রদত্ত ছাড় (Today Discount)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-rose-600">
                {formatBDT(metrics.todayDiscountGiven)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                আজ মোট {metrics.todayDiscountedSalesCount} টি মেমোতে ছাড় দেওয়া হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                গতকালের প্রদত্ত ছাড় (Yesterday)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-indigo-700">
                {formatBDT(metrics.yesterdayDiscountGiven)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                গতকাল মোট {metrics.yesterdayDiscountedSalesCount} টি মেমোতে ছাড় দেওয়া হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                চলতি মাসের মোট ছাড় (This Month)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-amber-700">
                {formatBDT(metrics.monthDiscountGiven)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                এই মাসে {metrics.monthDiscountedSalesCount} টি মেমোতে ছাড় দেওয়া হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50/70 to-amber-50/50 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-emerald-950">
                সর্বমোট প্রদত্ত ডিসকাউন্ট / ছাড় (All-Time)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-rose-700">
                {formatBDT(metrics.totalDiscountGiven)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-600">
                মোট {metrics.discountedSalesCount} টি বিক্রয় মেমোতে ছাড় দেওয়া হয়েছে
              </div>
            </div>
          </div>

          {/* Extra Bargaining Profit Summary Banner with 1-Click Jump to Extra Profit Ledger */}
          <div className="rounded-3xl border border-emerald-300/90 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-0.5 text-[11px] font-extrabold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>অতিরিক্ত বিক্রয় মুনাফা (Extra Bargaining Profit)</span>
              </div>
              <p className="mt-1 text-xs text-emerald-100/90">
                কাস্টমারের ক্যাশ মেমোতে পোশাকের দামের সাথে রাউন্ড ফিগারে মিলিয়ে দেওয়া অতিরিক্ত লাভের গোপন হিসাব
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0 num-clear">
              <div className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-2">
                <div className="text-[10px] font-bold text-emerald-200">আজকের অতিরিক্ত মুনাফা</div>
                <div className="text-sm sm:text-base font-extrabold text-amber-300">
                  +{formatBDT(metrics.todayExtraBargainingProfit)} ({metrics.todayExtraBargainingSalesCount} মেমো)
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-2">
                <div className="text-[10px] font-bold text-emerald-200">সর্বমোট অতিরিক্ত মুনাফা</div>
                <div className="text-sm sm:text-base font-extrabold text-white">
                  +{formatBDT(metrics.totalExtraBargainingProfit)} ({metrics.extraBargainingSalesCount} মেমো)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('extra_profit')}
                className="rounded-2xl bg-gold-metallic border border-amber-300/70 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm hover:brightness-105 transition active:scale-95"
              >
                বিস্তারিত বাড়তি লাভ খাতা দেখুন →
              </button>
            </div>
          </div>

          {/* Filter & Search Header */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  ডিসকাউন্ট ও ছাড়ের পূর্ণাঙ্গ হিসাব খাতা ({filteredDiscountSummary.count} টি মেমো)
                </h2>
                <p className="text-xs text-slate-500">
                  কোন ক্রেতাকে কোন মেমোতে কত টাকা ডিসকাউন্ট বা ছাড় দেওয়া হয়েছে তার সম্পূর্ণ হিসাব ({activeFilterPeriodLabel})
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={discountSearch}
                  onChange={(e) => setDiscountSearch(e.target.value)}
                  placeholder="মেমো নং বা ক্রেতার নাম খুঁজুন..."
                  aria-label="ছাড় দেওয়া মেমো খুঁজুন"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {renderPeriodFilterBar('rose')}

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOnlyDiscountedMemos((prev) => !prev)}
                  className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold border transition ${
                    showOnlyDiscountedMemos
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}
                >
                  {showOnlyDiscountedMemos
                    ? '✓ শুধু ছাড় দেওয়া মেমো দেখানো হচ্ছে'
                    : 'সব মেমো দেখানো হচ্ছে (ছাড় সহ ও ছাড়া)'}
                </button>
              </div>
            </div>

            {/* Filtered Discount Totals Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-[11px] font-bold text-slate-600">
                  মোট পোশাকের দাম (Subtotal)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-slate-900">
                  {formatBDT(filteredDiscountSummary.totalSubtotal)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3">
                <div className="text-[11px] font-bold text-rose-900">
                  মোট প্রদত্ত ছাড় / ডিসকাউন্ট (-)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-rose-600">
                  -{formatBDT(filteredDiscountSummary.totalDiscount)}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="text-[11px] font-bold text-emerald-950">
                  ছাড় বাদে নিট বিল (Net Payable)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-emerald-800">
                  {formatBDT(filteredDiscountSummary.totalNetBill)}
                </div>
              </div>
            </div>
          </div>

          {/* Discounted Sales Memos List */}
          {filteredDiscountSales.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                এই ফিল্টারে কোনো ডিসকাউন্ট বা ছাড় দেওয়া মেমো পাওয়া যায়নি
              </p>
              <p className="text-xs text-slate-500">
                পস বিলিং কাউন্টারে ডিসকাউন্ট দিয়ে বিল করলে অথবা সব মেমো দেখতে উপরের বাটনে ক্লিক করুন।
              </p>
              {showOnlyDiscountedMemos && sales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOnlyDiscountedMemos(false)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 transition"
                >
                  <span>সব বিক্রয় মেমো দেখুন ({sales.length} টি)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredDiscountSales.map((sale) => {
                const dt = formatDynamicDateTime(
                  sale.saleDateISO,
                  sale.dateLabel,
                  sale.createdAtISO,
                  todayISO
                );
                const disc = Math.max(0, Number(sale.discount) || 0);
                const sub = Math.max(
                  0,
                  Number(sale.subtotal || sale.grandTotal + disc) || 0
                );
                return (
                  <div
                    key={sale.id}
                    className="card-interactive flex flex-col justify-between rounded-3xl border border-rose-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all hover:border-rose-300"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="num-clear rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                            {sale.invoiceNo}
                          </span>
                          <span
                            className={`num-clear rounded-full px-3 py-1 text-xs font-extrabold ${
                              disc > 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            ছাড়: {disc > 0 ? `-${formatBDT(disc)}` : '৳ 0'}
                          </span>
                        </div>
                        <span className="num-clear inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{dt.fullLabel}</span>
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-base font-bold text-slate-900">
                          {sale.customerName}
                        </div>
                        {sale.customerPhone && (
                          <div className="num-clear text-xs font-bold text-slate-500">
                            মোবাইল: {sale.customerPhone}
                          </div>
                        )}
                        <div className="mt-1.5 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
                          {sale.itemsSummary}
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5">
                          <div className="text-[10px] text-slate-500">
                            মোট দাম
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-slate-900">
                            {formatBDT(sub)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-2.5">
                          <div className="text-[10px] font-bold text-rose-800">
                            প্রদত্ত ছাড় (-)
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-rose-600">
                            {disc > 0 ? `-${formatBDT(disc)}` : formatBDT(0)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                          <div className="text-[10px] font-bold text-emerald-900">
                            নিট বিল
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-emerald-800">
                            {formatBDT(sale.grandTotal)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                      <button
                        type="button"
                        onClick={() => onSelectSaleReceipt(sale)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>রশিদ ও পিডিএফ দেখুন</span>
                      </button>
                      <span className="num-clear text-xs font-bold text-slate-500">
                        জমা: {formatBDT(sale.paidAmount)} • বাকি:{' '}
                        {formatBDT(sale.dueAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1C: অতিরিক্ত বিক্রয় মুনাফার পূর্ণাঙ্গ হিসাব খাতা (Extra Bargaining Profit Ledger) */}
      {subTab === 'extra_profit' && (
        <div className="space-y-4 animate-fade-up">
          {/* 4 KPI Summary Cards for Extra Bargaining Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-3xl border border-emerald-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                আজকের অতিরিক্ত মুনাফা (Today Extra Profit)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-emerald-700">
                +{formatBDT(metrics.todayExtraBargainingProfit)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                আজ মোট {metrics.todayExtraBargainingSalesCount} টি মেমোতে বাড়তি লাভ হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                গতকালের অতিরিক্ত মুনাফা (Yesterday)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-indigo-700">
                +{formatBDT(metrics.yesterdayExtraBargainingProfit)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                গতকাল মোট {metrics.yesterdayExtraBargainingSalesCount} টি মেমোতে বাড়তি লাভ হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200/90 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                চলতি মাসের অতিরিক্ত মুনাফা (This Month)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-amber-700">
                +{formatBDT(metrics.monthExtraBargainingProfit)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                এই মাসে {metrics.monthExtraBargainingSalesCount} টি মেমোতে বাড়তি লাভ হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/80 bg-gradient-to-br from-emerald-50/90 via-amber-50/65 to-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-emerald-950">
                সর্বমোট অতিরিক্ত বিক্রয় মুনাফা (All-Time)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-emerald-800">
                +{formatBDT(metrics.totalExtraBargainingProfit)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-600">
                মোট {metrics.extraBargainingSalesCount} টি বিক্রয় মেমোতে বাড়তি লাভ হয়েছে
              </div>
            </div>
          </div>

          {/* Filter & Search Header for Extra Bargaining Profit */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-extrabold text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>কাস্টমারের মেমোতে রাউন্ড ফিগারে লুকানো বাড়তি মুনাফার বিস্তারিত খাতা</span>
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                  অতিরিক্ত বিক্রয় মুনাফার পূর্ণাঙ্গ হিসাব খাতা ({filteredExtraProfitSummary.count} টি মেমো)
                </h2>
                <p className="text-xs text-slate-500">
                  কোন মেমোতে নির্ধারিত বিক্রয়মূল্যের চেয়ে কত টাকা বেশি দামে বিক্রি করে অতিরিক্ত মুনাফা হয়েছে ({activeFilterPeriodLabel})
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={extraProfitSearch}
                  onChange={(e) => setExtraProfitSearch(e.target.value)}
                  placeholder="মেমো নং বা ক্রেতার নাম খুঁজুন..."
                  aria-label="বাড়তি মুনাফার মেমো খুঁজুন"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {renderPeriodFilterBar('emerald')}

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOnlyExtraProfitMemos((prev) => !prev)}
                  className={`rounded-2xl px-3.5 py-1.5 text-xs font-extrabold border transition ${
                    showOnlyExtraProfitMemos
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}
                >
                  {showOnlyExtraProfitMemos
                    ? '✓ শুধু বাড়তি মুনাফার মেমো দেখানো হচ্ছে'
                    : 'সব মেমো দেখানো হচ্ছে (বাড়তি লাভ সহ ও ছাড়া)'}
                </button>
              </div>
            </div>

            {/* Filtered Extra Profit Totals Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-[11px] font-bold text-slate-600">
                  পোশাকের ডিফল্ট বিক্রয়মূল্য (Base)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-slate-900">
                  {formatBDT(filteredExtraProfitSummary.totalBaseSubtotal)}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3">
                <div className="text-[11px] font-bold text-amber-950">
                  মোট অতিরিক্ত বিক্রয় মুনাফা (+Extra)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-emerald-700">
                  +{formatBDT(filteredExtraProfitSummary.totalExtraProfit)}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="text-[11px] font-bold text-emerald-950">
                  চূড়ান্ত মেমো বিল (Grand Total)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-emerald-800">
                  {formatBDT(filteredExtraProfitSummary.totalNetBill)}
                </div>
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3">
                <div className="text-[11px] font-bold text-teal-950">
                  মোট নিট লাভ (কেনা দাম বাদে)
                </div>
                <div className="num-clear mt-0.5 text-base font-extrabold text-teal-800">
                  +{formatBDT(filteredExtraProfitSummary.totalProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Extra Profit Sales Memos List */}
          {filteredExtraProfitSales.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                এই ফিল্টারে কোনো অতিরিক্ত বিক্রয় মুনাফার মেমো পাওয়া যায়নি
              </p>
              <p className="text-xs text-slate-500">
                পস বিলিং কাউন্টারে নির্ধারিত বিক্রয়মূল্যের চেয়ে বেশি দামে বিল করলে এখানে স্বয়ংক্রিয়ভাবে জমা হবে।
              </p>
              {showOnlyExtraProfitMemos && sales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOnlyExtraProfitMemos(false)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 transition"
                >
                  <span>সব বিক্রয় মেমো দেখুন ({sales.length} টি)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredExtraProfitSales.map((sale) => {
                const dt = formatDynamicDateTime(
                  sale.saleDateISO,
                  sale.dateLabel,
                  sale.createdAtISO,
                  todayISO
                );
                const extra = Math.max(0, Number(sale.extraBargainingProfit) || 0);
                const grand = Math.max(0, Number(sale.grandTotal) || 0);
                const base = Math.max(0, grand - extra);
                return (
                  <div
                    key={sale.id}
                    className="card-interactive flex flex-col justify-between rounded-3xl border border-emerald-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all hover:border-emerald-400"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="num-clear rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                            {sale.invoiceNo}
                          </span>
                          <span
                            className={`num-clear rounded-full px-3 py-1 text-xs font-extrabold ${
                              extra > 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            বাড়তি লাভ: {extra > 0 ? `+${formatBDT(extra)}` : '৳ 0'}
                          </span>
                        </div>
                        <span className="num-clear inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{dt.fullLabel}</span>
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-base font-bold text-slate-900">
                          {sale.customerName}
                        </div>
                        {sale.customerPhone && (
                          <div className="num-clear text-xs font-bold text-slate-500">
                            মোবাইল: {sale.customerPhone}
                          </div>
                        )}
                        <div className="mt-1.5 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
                          {sale.itemsSummary}
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5">
                          <div className="text-[10px] text-slate-500">
                            ডিফল্ট দাম
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-slate-900">
                            {formatBDT(base)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-2.5">
                          <div className="text-[10px] font-bold text-amber-900">
                            বাড়তি মুনাফা (+)
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-emerald-700">
                            {extra > 0 ? `+${formatBDT(extra)}` : formatBDT(0)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                          <div className="text-[10px] font-bold text-emerald-900">
                            চূড়ান্ত মেমো বিল
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-emerald-800">
                            {formatBDT(grand)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-2.5">
                          <div className="text-[10px] font-bold text-teal-900">
                            মোট নিট লাভ
                          </div>
                          <div className="num-clear mt-0.5 text-sm font-extrabold text-teal-800">
                            +{formatBDT(sale.profit)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                      <button
                        type="button"
                        onClick={() => onSelectSaleReceipt(sale)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>রশিদ ও পিডিএফ দেখুন</span>
                      </button>
                      <span className="num-clear text-xs font-bold text-slate-500">
                        জমা: {formatBDT(sale.paidAmount)} • বাকি:{' '}
                        {formatBDT(sale.dueAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: দৈনিক/মাসিক খরচ */}
      {subTab === 'expenses' && (
        <div className="space-y-5 animate-fade-up">
          {/* Expense Dashboard KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-3xl border border-rose-200/80 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                আজকের দোকান ও বেতন খরচ (Today)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-rose-600">
                {formatBDT(metrics.todayExpenses)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                আজ মোট {metrics.todayExpensesCount} টি খরচের এন্ট্রি
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-200/80 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                গতকালের দোকান খরচ (Yesterday)
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-indigo-700">
                {formatBDT(metrics.yesterdayExpenses)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                গতকালের নিট মুনাফা: {formatBDT(metrics.yesterdayNetProfit)}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200/80 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-500">
                খরচ ও মাল ক্রয় বাদে হাতে নগদ
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-emerald-700">
                {formatBDT(metrics.currentCashInHand)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-500">
                মাল ক্রয় ব্যয়: -{formatBDT(metrics.totalCashStockPurchases)}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-xs font-bold text-slate-600">
                আজকের নিট মুনাফা ও বিক্রয়ে লস
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-emerald-800">
                {metrics.todayNetProfit > 0
                  ? `+${formatBDT(metrics.todayNetProfit)}`
                  : formatBDT(metrics.todayNetProfit)}
              </div>
              <div className="num-clear mt-1 text-[11px] font-semibold text-slate-600">
                বিক্রয় লাভ: +{formatBDT(metrics.todaySalesProfitOnly + metrics.todayTipsAndExtraProfit)} • বিক্রয়ে লস: {formatBDT(metrics.todaySalesLoss)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <h2 className="text-base font-extrabold text-slate-900">
                নতুন খরচ যুক্ত করুন (তারিখ ও সময় সহ)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                দোকান ভাড়া, বিদ্যুৎ বিল, কর্মচারী বেতন বা পরিবহন খরচ লিখে রাখুন
              </p>

              {expError && (
                <div
                  role="alert"
                  className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
                >
                  {expError}
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label
                    htmlFor="exp-title"
                    className="block font-bold text-slate-700"
                  >
                    খরচের বিবরণ *
                  </label>
                  <input
                    id="exp-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: দুপুরের চা-নাস্তা বা বিদ্যুৎ বিল"
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="exp-cat"
                      className="block font-bold text-slate-700"
                    >
                      খরচের খাত
                    </label>
                    <IosSelect
                      id="exp-cat"
                      value={category}
                      onChange={(val) => setCategory(val as ExpenseCategory)}
                      options={EXPENSE_CATEGORIES.map((c) => ({
                        value: c,
                        label: c,
                      }))}
                      sheetTitle="খরচের খাত নির্বাচন করুন"
                      ariaLabel="খরচের খাত"
                      accentTone="emerald"
                      className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="exp-amount"
                      className="block font-bold text-slate-700"
                    >
                      টাকার পরিমাণ (৳) *
                    </label>
                    <input
                      id="exp-amount"
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="500"
                      className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="exp-date"
                    className="block font-bold text-slate-700"
                  >
                    খরচের তারিখ (ডিফল্ট: আজ)
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    value={expenseDateInput}
                    onChange={(e) => setExpenseDateInput(e.target.value)}
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>খরচের খাতায় যুক্ত করুন</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="space-y-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      সকল খরচের হিস্ট্রি ({filteredExpensesList.length} টি)
                    </h2>
                    <p className="text-xs text-slate-500">
                      নির্বাচিত সময়কালের খরচ:{' '}
                      <strong className="num-clear font-extrabold text-rose-600">
                        {formatBDT(
                          filteredExpensesList.reduce(
                            (sum, e) => sum + (Number(e.amount) || 0),
                            0
                          )
                        )}
                      </strong>{' '}
                      • সর্বমোট খরচ:{' '}
                      <strong className="num-clear font-extrabold text-slate-700">
                        {formatBDT(metrics.totalExpenses)}
                      </strong>
                    </p>
                  </div>
                </div>
                {renderPeriodFilterBar('rose')}
              </div>

              <div className="mt-4 space-y-3">
                {filteredExpensesList.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    নির্বাচিত সময়কালে কোনো খরচের হিসাব পাওয়া যায়নি।
                  </div>
                ) : (
                  filteredExpensesList.map((exp) => {
                    const dt = formatDynamicDateTime(
                      exp.expenseDateISO,
                      exp.dateLabel,
                      exp.createdAtISO,
                      todayISO
                    );
                    return (
                      <div
                        key={exp.id}
                        className="card-interactive flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`num-clear rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                dt.relativeBadge === 'আজ'
                                  ? 'bg-emerald-700 text-white'
                                  : dt.relativeBadge === 'গতকাল'
                                  ? 'bg-indigo-700 text-white'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {dt.relativeBadge}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 border border-slate-200">
                              {exp.category}
                            </span>
                            <span className="num-clear text-[11px] font-semibold text-slate-500">
                              • {dt.fullLabel}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {exp.title}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="num-clear text-base font-extrabold tabular-nums text-rose-600">
                            -{formatBDT(exp.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteExpense(exp)}
                            aria-label={`${exp.title} খরচ ডিলিট করুন`}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: বকশিস, প্রাপ্ত টাকা ও পুঁজি যোগ (Tips & Extra Cash In) */}
      {subTab === 'extra_income' && (
        <div className="space-y-5 animate-fade-up">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">
                  মোট বকশিস ও অতিরিক্ত আয় (+লাভ)
                </span>
                <Gift className="h-4 w-4 text-amber-600" />
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-amber-700">
                +{formatBDT(metrics.totalTipsAndExtraProfit)}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-amber-800/80">
                সরাসরি হাতে নগদ ও নিট লাভে যোগ হয়েছে
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/50 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">
                  দোকানে অতিরিক্ত ক্যাশ পুঁজি যোগ
                </span>
                <Coins className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-indigo-700">
                +{formatBDT(metrics.totalCapitalInjected)}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-indigo-800/80">
                ক্যাশ তহবিলে নতুন পুঁজি ইনজেকশন
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">
                  এখন হাতে নগদ টাকা (Cash in Hand)
                </span>
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="num-clear mt-1 text-2xl font-extrabold text-emerald-700">
                {formatBDT(metrics.currentCashInHand)}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-800/80">
                বিক্রয় + বকশিস + পুঁজি − খরচ − মাল ক্রয়
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-5 rounded-3xl border border-amber-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-900">
                <Gift className="h-3.5 w-3.5" />
                <span>Tips, Bonus & Extra Cash In</span>
              </div>
              <h2 className="mt-2 text-base font-extrabold text-slate-900">
                বকশিস, প্রাপ্ত টাকা ও পুঁজি যোগ
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                কাস্টমারের বকশিস, মহাজনের কমিশন অথবা দোকানে নতুন ক্যাশ পুঁজি যোগ করুন
              </p>

              {incError && (
                <div
                  role="alert"
                  className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
                >
                  {incError}
                </div>
              )}

              <form
                onSubmit={handleAddExtraIncomeSubmit}
                className="mt-4 space-y-3.5 text-xs"
              >
                <div>
                  <label
                    htmlFor="inc-title"
                    className="block font-bold text-slate-700"
                  >
                    টাকা পাওয়ার বিবরণ *
                  </label>
                  <input
                    id="inc-title"
                    type="text"
                    value={incTitle}
                    onChange={(e) => setIncTitle(e.target.value)}
                    placeholder="যেমন: কাস্টমার বকশিস, পুরাতন কার্টন বিক্রি বা নতুন পুঁজি"
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inc-cat"
                    className="block font-bold text-slate-700"
                  >
                    আয়ের ধরন
                  </label>
                  <IosSelect
                    id="inc-cat"
                    value={incCategory}
                    onChange={(val) =>
                      setIncCategory(val as ExtraIncomeCategory)
                    }
                    options={EXTRA_INCOME_CATEGORIES.map((c) => ({
                      value: c,
                      label: c,
                      sublabel:
                        c === 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)'
                          ? 'দোকানের হাতে থাকা নগদ ক্যাশে সরাসরি পুঁজি যোগ হবে'
                          : c === 'বকশিস / টিপস'
                          ? 'কাস্টমার বকশিস বা উপহার বাবদ অতিরিক্ত আয়'
                          : 'অন্যান্য উৎস থেকে প্রাপ্ত নগদ টাকা',
                    }))}
                    sheetTitle="আয়ের ধরন নির্বাচন করুন"
                    ariaLabel="আয়ের ধরন"
                    accentTone="amber"
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="inc-amount"
                      className="block font-bold text-slate-700"
                    >
                      টাকার পরিমাণ (৳) *
                    </label>
                    <input
                      id="inc-amount"
                      type="number"
                      min="1"
                      value={incAmount}
                      onChange={(e) => setIncAmount(e.target.value)}
                      placeholder="500"
                      className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="inc-date"
                      className="block font-bold text-slate-700"
                    >
                      তারিখ (ডিফল্ট: আজ)
                    </label>
                    <input
                      id="inc-date"
                      type="date"
                      value={incDateInput}
                      onChange={(e) => setIncDateInput(e.target.value)}
                      className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-900 focus:border-amber-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>ক্যাশে যুক্ত করুন</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="space-y-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      বকশিস ও অতিরিক্ত ক্যাশ জমার হিস্ট্রি ({filteredExtraIncomesList.length} টি)
                    </h2>
                    <p className="text-xs text-slate-500">
                      নির্বাচিত সময়কালের জমা:{' '}
                      <strong className="num-clear font-extrabold text-emerald-700">
                        +
                        {formatBDT(
                          filteredExtraIncomesList.reduce(
                            (sum, i) => sum + (Number(i.amount) || 0),
                            0
                          )
                        )}
                      </strong>{' '}
                      • সর্বমোট অতিরিক্ত ক্যাশ জমা:{' '}
                      <strong className="num-clear font-extrabold text-slate-700">
                        +{formatBDT(metrics.totalExtraCashIn)}
                      </strong>
                    </p>
                  </div>
                </div>
                {renderPeriodFilterBar('amber')}
              </div>

              <div className="mt-4 space-y-3">
                {filteredExtraIncomesList.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    নির্বাচিত সময়কালে কোনো বকশিস বা অতিরিক্ত ক্যাশ জমার এন্ট্রি পাওয়া যায়নি।
                  </div>
                ) : (
                  filteredExtraIncomesList.map((inc) => {
                    const dt = formatDynamicDateTime(
                      inc.incomeDateISO,
                      inc.dateLabel,
                      inc.createdAtISO,
                      todayISO
                    );
                    const isCap =
                      inc.category === 'দোকানে ক্যাশ পুঁজি যোগ (Capital Inject)';
                    return (
                      <div
                        key={inc.id}
                        className="card-interactive flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`num-clear rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                dt.relativeBadge === 'আজ'
                                  ? 'bg-emerald-700 text-white'
                                  : dt.relativeBadge === 'গতকাল'
                                  ? 'bg-indigo-700 text-white'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {dt.relativeBadge}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-extrabold border ${
                                isCap
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                            >
                              {inc.category}
                            </span>
                            <span className="num-clear text-[11px] font-semibold text-slate-500">
                              • {dt.fullLabel}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {inc.title}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="num-clear text-base font-extrabold tabular-nums text-emerald-700">
                            +{formatBDT(inc.amount)}
                          </span>
                          {onRequestDeleteExtraIncome && (
                            <button
                              type="button"
                              onClick={() => onRequestDeleteExtraIncome(inc)}
                              aria-label={`${inc.title} ডিলিট করুন`}
                              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: লাভ ও পুঁজি উসুল বিশ্লেষণ */}
      {subTab === 'capital' && (
        <div className="space-y-5 animate-fade-up">
          {/* Capital Outlay vs Recovery Hero Card */}
          <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-5 sm:p-6 text-white shadow-[0_12px_35px_rgba(4,120,87,0.22)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-0.5 text-xs font-extrabold text-amber-300">
                  <Banknote className="h-3.5 w-3.5" />
                  <span>পুঁজি বিনিয়োগ ও উসুল ট্র্যাকার (Capital Recovery)</span>
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold">
                  পুঁজি থেকে কত খরচ গেছে এবং কত টাকা উসুল হয়েছে?
                </h2>
                <p className="text-xs text-emerald-100/90">
                  মাল কেনা ও দোকানের মোট খরচের বিপরীতে বিক্রি থেকে কত টাকা ক্যাশে ফিরে এসেছে তার নিখুঁত হিসাব
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenShopSetup}
                className="self-start lg:self-auto rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2 text-xs font-extrabold text-white transition"
              >
                হাতে নগদ তহবিল এডিট করুন
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md">
                <div className="text-xs font-bold text-emerald-200">
                  ১. পুঁজি থেকে মোট খরচ / বিনিয়োগ
                </div>
                <div className="num-clear mt-1.5 text-2xl font-extrabold text-white">
                  {formatBDT(metrics.totalCapitalOutlay)}
                </div>
                <div className="num-clear mt-1 text-[11px] text-emerald-100/90">
                  মাল ক্রয়: {formatBDT(metrics.totalMerchandiseCapital)} + দোকান খরচ:{' '}
                  {formatBDT(metrics.totalExpenses)}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md">
                <div className="text-xs font-bold text-amber-300">
                  ২. পুঁজি থেকে মোট উসুল হয়েছে
                </div>
                <div className="num-clear mt-1.5 text-2xl font-extrabold text-amber-300">
                  {formatBDT(metrics.totalCapitalRecovered)}
                </div>
                <div className="num-clear mt-1 text-[11px] text-emerald-100/90">
                  বিক্রয় ও অতিরিক্ত আয় থেকে ক্যাশ জমা ({metrics.capitalRecoveryPercent}% উসুল)
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md">
                <div className="text-xs font-bold text-emerald-200">
                  {metrics.capitalSurplusProfit > 0
                    ? '৩. পুঁজি উঠে অতিরিক্ত নগদ লাভ'
                    : '৩. পুঁজি উসুল হতে এখনো বাকি'}
                </div>
                <div className="num-clear mt-1.5 text-2xl font-extrabold text-white">
                  {metrics.capitalSurplusProfit > 0
                    ? `+${formatBDT(metrics.capitalSurplusProfit)}`
                    : formatBDT(metrics.capitalRecoveryRemaining)}
                </div>
                <div className="num-clear mt-1 text-[11px] text-emerald-100/90">
                  স্টকে এখনো মাল আছে: {formatBDT(metrics.totalInventoryCostValue)}
                </div>
              </div>

              <div className="rounded-2xl bg-amber-400 text-slate-950 p-4 shadow-md">
                <div className="text-xs font-extrabold text-slate-800">
                  ৪. খরচ গিয়ে এখন হাতে কত টাকা আছে
                </div>
                <div className="num-clear mt-1.5 text-2xl font-extrabold text-slate-950">
                  {formatBDT(metrics.currentCashInHand)}
                </div>
                <div className="num-clear mt-1 text-[11px] font-bold text-slate-800">
                  মোট ব্যবসার পুঁজি: {formatBDT(metrics.totalBusinessWorth)}
                </div>
              </div>
            </div>

            {/* Capital Recovery Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-100 num-clear">
                <span>পুঁজি উসুল অগ্রগতি (Capital Recovery Progress)</span>
                <span className="text-amber-300 font-extrabold">
                  {metrics.capitalRecoveryPercent}% সম্পন্ন
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/15 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-300 transition-all duration-700"
                  style={{ width: `${metrics.capitalRecoveryPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  সর্বমোট বিক্রয় মুনাফা (Sales Profit)
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="num-clear mt-1.5 text-2xl font-extrabold tabular-nums text-emerald-700">
                +{formatBDT(metrics.totalSalesProfitOnly + metrics.totalTipsAndExtraProfit)}
              </div>
              <div className="mt-1 text-xs text-slate-600 num-clear">
                আজ বিক্রয় লাভ: +{formatBDT(metrics.todaySalesProfitOnly + metrics.todayTipsAndExtraProfit)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="text-xs font-bold text-slate-500">
                দোকান ও বেতন খরচ (Expenses)
              </div>
              <div className="num-clear mt-1.5 text-2xl font-extrabold tabular-nums text-rose-600">
                {formatBDT(metrics.totalExpenses)}
              </div>
              <div className="mt-1 text-xs text-slate-600 num-clear">
                আজ খরচ: {formatBDT(metrics.todayExpenses)} • এ মাসে: {formatBDT(metrics.monthExpenses)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="text-xs font-bold text-slate-500">
                বিক্রয়ে লস (কেনা দামের কমে বিক্রি)
              </div>
              <div
                className={`num-clear mt-1.5 text-2xl font-extrabold tabular-nums ${
                  metrics.totalLossFromLossSales > 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {metrics.totalLossFromLossSales > 0
                  ? `-${formatBDT(metrics.totalLossFromLossSales)}`
                  : formatBDT(0)}
              </div>
              <div className="mt-1 text-xs text-slate-600 num-clear">
                আজ বিক্রয়ে লস: {formatBDT(metrics.todaySalesLoss)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="text-xs font-bold text-slate-500">
                হাতে নিট মুনাফা (Net Balance)
              </div>
              <div
                className={`num-clear mt-1.5 text-2xl font-extrabold tabular-nums ${
                  metrics.netProfit < 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {metrics.netProfit > 0 ? `+${formatBDT(metrics.netProfit)}` : formatBDT(metrics.netProfit)}
              </div>
              <div className="mt-1 text-xs text-slate-600 num-clear">
                বিক্রয় লাভ − (দোকান খরচ + বিক্রয়ে লস)
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <h2 className="text-base font-extrabold text-slate-900">
              দোকানের পুঁজি ও স্টক ভ্যালু বিশ্লেষণ (Capital & Stock Valuation)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              আপনার দোকানে বর্তমানে কোথায় কত টাকা পুঁজি খাটছে এবং স্টকে থাকা মাল বিক্রি হলে কত টাকা লাভ আসবে
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4">
                <div className="font-semibold text-indigo-900">
                  ১. মোট বিনিয়োগকৃত পুঁজি (Injected Capital)
                </div>
                <div className="num-clear mt-1.5 text-xl font-extrabold tabular-nums text-indigo-800">
                  {formatBDT(metrics.totalInjectedCapital)}
                </div>
                <div className="mt-1 text-indigo-700/90 num-clear">
                  শুরুর মূলধন: {formatBDT(metrics.workingCapital)} + ক্যাশ পুঁজি যোগ:{' '}
                  {formatBDT(metrics.totalCapitalInjected)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                <div className="font-semibold text-slate-600">
                  ২. বর্তমান স্টক মালের ভ্যালু (Stock Value)
                </div>
                <div className="num-clear mt-1.5 text-xl font-extrabold tabular-nums text-slate-900">
                  {formatBDT(metrics.totalInventoryCostValue)}
                </div>
                <div className="mt-1 text-slate-500 num-clear">
                  মোট <strong>{metrics.totalInventoryUnits}</strong> পিস পোশাক (নগদ মাল ক্রয়:{' '}
                  {formatBDT(metrics.totalCashStockPurchases)})
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
                <div className="font-semibold text-amber-950">
                  ৩. কাস্টমারের কাছে বকেয়া পুঁজি
                </div>
                <div className="num-clear mt-1.5 text-xl font-extrabold tabular-nums text-amber-800">
                  {formatBDT(metrics.totalReceivableDue)}
                </div>
                <div className="mt-1 text-amber-800/80">
                  বাকির খাতায় মোট পাওনা টাকা
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="font-semibold text-emerald-900">
                  ৪. মোট ব্যবসার পুঁজি / সম্পদ (Total Worth)
                </div>
                <div className="num-clear mt-1.5 text-xl font-extrabold tabular-nums text-emerald-800">
                  {formatBDT(metrics.totalBusinessWorth)}
                </div>
                <div className="num-clear mt-1 font-bold text-emerald-700">
                  স্টকের সম্ভাব্য লাভ: +{formatBDT(metrics.expectedStockProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
