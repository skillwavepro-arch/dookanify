import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Banknote,
  CheckCircle2,
  Edit3,
  Trash2,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import { Customer } from '../types/shop';
import { formatBDT } from '../utils/shopLogic';

interface CustomersViewProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'ownerId'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onRequestDeleteCustomer: (customer: Customer) => void;
  onCollectDue: (customerId: string, collectedAmount: number) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onRequestDeleteCustomer,
  onCollectDue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'dueOnly'>('all');
  const [selectedForCollection, setSelectedForCollection] =
    useState<Customer | null>(null);
  const [collectionInput, setCollectionInput] = useState('');

  // Add / Edit Customer Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custTotalPurchase, setCustTotalPurchase] = useState('0');
  const [custTotalDue, setCustTotalDue] = useState('0');
  const [custError, setCustError] = useState<string | null>(null);

  const totalReceivable = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalDue, 0),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterMode === 'dueOnly' && c.totalDue <= 0) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });
  }, [customers, filterMode, searchQuery]);

  const handleOpenCollect = (customer: Customer) => {
    setSelectedForCollection(customer);
    setCollectionInput(String(customer.totalDue));
  };

  const handleConfirmCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForCollection) return;
    const amount = Math.max(0, Number(collectionInput) || 0);
    if (amount > 0) {
      onCollectDue(selectedForCollection.id, amount);
    }
    setSelectedForCollection(null);
  };

  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustTotalPurchase('0');
    setCustTotalDue('0');
    setCustError(null);
    setIsFormModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustName(customer.name);
    setCustPhone(customer.phone);
    setCustAddress(customer.address);
    setCustTotalPurchase(String(customer.totalPurchase));
    setCustTotalDue(String(customer.totalDue));
    setCustError(null);
    setIsFormModalOpen(true);
  };

  const handleCustomerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      setCustError('কাস্টমারের নাম এবং মোবাইল নম্বর লিখুন।');
      return;
    }
    const dueNum = Math.max(0, Math.round(Number(custTotalDue) || 0));
    const purchaseNum = Math.max(
      dueNum,
      Math.round(Number(custTotalPurchase) || 0)
    );

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim() || 'সীতাকুণ্ড',
        totalPurchase: purchaseNum,
        totalDue: dueNum,
      });
    } else {
      onAddCustomer({
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim() || 'সীতাকুণ্ড',
        totalPurchase: purchaseNum,
        totalDue: dueNum,
      });
    }
    setIsFormModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Summary Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              বাকির খাতা ও কাস্টমার তালিকা
            </h2>
            <p className="text-xs text-slate-500">
              মোট বকেয়া পাওনা:{' '}
              <span className="num-clear font-extrabold text-amber-700">
                {formatBDT(totalReceivable)}
              </span>{' '}
              · কাস্টমারদের বাকির হিসাব, কিস্তি আদায় ও এডিট করুন
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম বা মোবাইল নম্বর খুঁজুন..."
                aria-label="কাস্টমার খুঁজুন"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={openAddCustomerModal}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ নতুন কাস্টমার</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            সকল কাস্টমার ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('dueOnly')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              filterMode === 'dueOnly'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xs'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            শুধু বাকি আছে ({customers.filter((c) => c.totalDue > 0).length})
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-sm font-bold text-slate-700">
            কোনো কাস্টমার পাওয়া যায়নি
          </p>
          <p className="mt-1 text-xs text-slate-500">
            &ldquo;+ নতুন কাস্টমার&rdquo; বাটনে ক্লিক করে বাকির খাতায় নাম যুক্ত করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all hover:border-emerald-300"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {customer.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="num-clear font-bold text-slate-800">
                        {customer.phone}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{customer.address}</span>
                    </div>
                  </div>

                  {customer.totalDue > 0 ? (
                    <span className="num-clear rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-800">
                      বাকি: {formatBDT(customer.totalDue)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      পরিশোধিত
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50 p-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500">মোট ক্রয়</div>
                    <div className="num-clear mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">
                      {formatBDT(customer.totalPurchase)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">বর্তমান বাকি</div>
                    <div
                      className={`num-clear mt-0.5 text-sm font-extrabold tabular-nums ${
                        customer.totalDue > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {formatBDT(customer.totalDue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: কিস্তি আদায়, Edit, Delete */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                {customer.totalDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenCollect(customer)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>কিস্তি আদায়</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-400">
                    কোনো বকেয়া নেই
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCustomerModal(customer)}
                    aria-label={`${customer.name} এডিট করুন`}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-teal-700" />
                    <span>এডিট</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteCustomer(customer)}
                    aria-label={`${customer.name} ডিলিট করুন`}
                    className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 p-2 text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collect Due Payment Modal */}
      {selectedForCollection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="due-collect-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.14)] backdrop-blur-xl">
            <h3
              id="due-collect-title"
              className="text-base font-extrabold text-slate-900"
            >
              কিস্তি ও বাকি টাকা আদায়
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              কাস্টমার:{' '}
              <span className="font-bold text-slate-900">
                {selectedForCollection.name}
              </span>{' '}
              · মোট বকেয়া:{' '}
              <span className="num-clear font-extrabold text-amber-700">
                {formatBDT(selectedForCollection.totalDue)}
              </span>
            </p>
            <form
              onSubmit={handleConfirmCollection}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label
                  htmlFor="collect-amount-input"
                  className="block font-bold text-slate-700"
                >
                  জমা গ্রহণের পরিমাণ (৳)
                </label>
                <input
                  id="collect-amount-input"
                  type="number"
                  min="1"
                  max={selectedForCollection.totalDue}
                  value={collectionInput}
                  onChange={(e) => setCollectionInput(e.target.value)}
                  className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForCollection(null)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-4 py-2 font-bold text-white shadow-sm hover:opacity-95"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
        >
          <div className="my-8 w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.14)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
              <h3
                id="customer-modal-title"
                className="text-base font-extrabold text-slate-900"
              >
                {editingCustomer
                  ? 'কাস্টমারের তথ্য এডিট করুন'
                  : 'নতুন কাস্টমার খাতায় যুক্ত করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                aria-label="ফর্ম বন্ধ করুন"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {custError && (
              <div
                role="alert"
                className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700"
              >
                {custError}
              </div>
            )}

            <form
              onSubmit={handleCustomerFormSubmit}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label
                  htmlFor="cust-name"
                  className="block font-bold text-slate-700"
                >
                  কাস্টমারের নাম *
                </label>
                <input
                  id="cust-name"
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="যেমন: মো: কামরুল হাসান"
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="cust-phone"
                  className="block font-bold text-slate-700"
                >
                  মোবাইল নম্বর *
                </label>
                <input
                  id="cust-phone"
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="cust-address"
                  className="block font-bold text-slate-700"
                >
                  ঠিকানা
                </label>
                <input
                  id="cust-address"
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="সীতাকুণ্ড বাজার, চট্টগ্রাম"
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cust-purchase"
                    className="block font-bold text-slate-700"
                  >
                    মোট ক্রয় (৳)
                  </label>
                  <input
                    id="cust-purchase"
                    type="number"
                    min="0"
                    value={custTotalPurchase}
                    onChange={(e) => setCustTotalPurchase(e.target.value)}
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cust-due"
                    className="block font-bold text-slate-700"
                  >
                    বর্তমান বাকি (৳)
                  </label>
                  <input
                    id="cust-due"
                    type="number"
                    min="0"
                    value={custTotalDue}
                    onChange={(e) => setCustTotalDue(e.target.value)}
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 font-bold tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-200/80 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-5 py-2.5 font-bold text-white shadow-sm hover:opacity-95"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
