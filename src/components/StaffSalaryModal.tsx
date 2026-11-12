import React, { useState, useMemo } from 'react';
import {
  Users,
  X,
  Wallet,
  UserPlus,
  CheckCircle2,
  Phone,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Expense, StaffMember, StaffPaymentType } from '../types/shop';
import {
  formatBDT,
  formatDynamicDateTime,
  getTodayISO,
} from '../utils/shopLogic';
import { IosSelect } from './IosSelect';

const PAYMENT_TYPES: StaffPaymentType[] = [
  'মাসিক বেতন',
  'অগ্রিম / হাওলাত (Advance)',
  'বোনাস / ইদ বোনাস',
];

interface StaffSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  expenses: Expense[];
  onAddStaff: (staff: Omit<StaffMember, 'id' | 'ownerId'>) => void;
  onUpdateStaff: (staff: StaffMember) => void;
  onRequestDeleteStaff: (staff: StaffMember) => void;
  onPayStaffSalary: (expense: Omit<Expense, 'id' | 'ownerId'>) => void;
  onRequestDeleteExpense: (expense: Expense) => void;
}

export const StaffSalaryModal: React.FC<StaffSalaryModalProps> = ({
  isOpen,
  onClose,
  staffList,
  expenses,
  onAddStaff,
  onUpdateStaff,
  onRequestDeleteStaff,
  onPayStaffSalary,
  onRequestDeleteExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'staff'>('pay');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffRoleInput, setStaffRoleInput] = useState('সেলসম্যান');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [staffSalaryInput, setStaffSalaryInput] = useState('');

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [paymentType, setPaymentType] =
    useState<StaffPaymentType>('মাসিক বেতন');
  const [payAmountInput, setPayAmountInput] = useState('');
  const [salaryNoteInput, setSalaryNoteInput] = useState('চলতি মাসের বেতন');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const todayISO = getTodayISO();
  const currentMonthPrefix = todayISO.slice(0, 7);

  const salaryExpenses = useMemo(
    () =>
      expenses.filter(
        (exp) => exp.category === 'কর্মচারী বেতন' || !!exp.staffId
      ),
    [expenses]
  );

  const currentMonthPaidByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of salaryExpenses) {
      if ((exp.expenseDateISO || todayISO).startsWith(currentMonthPrefix)) {
        if (exp.staffId) {
          map.set(exp.staffId, (map.get(exp.staffId) || 0) + exp.amount);
        } else {
          const matched = staffList.find((s) => exp.title.includes(s.name));
          if (matched) {
            map.set(matched.id, (map.get(matched.id) || 0) + exp.amount);
          }
        }
      }
    }
    return map;
  }, [salaryExpenses, staffList, currentMonthPrefix, todayISO]);

  if (!isOpen) return null;

  const activeStaffId = selectedStaffId || staffList[0]?.id || '';
  const selectedStaff = staffList.find((s) => s.id === activeStaffId);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-salary-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-amber-300 shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="staff-salary-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900"
              >
                কর্মচারী ও বেতন ম্যানেজমেন্ট (Staff & Salary)
              </h2>
              <p className="text-xs text-slate-500">
                কর্মচারীদের মাসিক বেতন, অগ্রিম/হাওলাত ও বোনাস হিসাব
                (স্বয়ংক্রিয়ভাবে হাতে নগদ ও খরচ খাতায় যুক্ত)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-[0.97] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pay');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition active:scale-[0.97] ${
              activeTab === 'pay'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>বেতন বা অগ্রিম প্রদান ও হিসাব ({staffList.length} জন)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition active:scale-[0.97] ${
              activeTab === 'staff'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            <span>কর্মচারী যোগ / তালিকা সেটআপ</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'pay' ? (
          <div className="mt-4 space-y-5">
            {staffList.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-center space-y-3">
                <p className="text-sm font-extrabold text-slate-800">
                  এখনো কোনো কর্মচারী যোগ করা হয়নি
                </p>
                <p className="text-xs text-slate-500">
                  প্রথমে আপনার দোকানের কর্মচারীর নাম ও মাসিক নির্ধারিত বেতন যোগ
                  করুন।
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-800 active:scale-[0.97] transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>প্রথম কর্মচারী যোগ করুন</span>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {staffList.map((staff) => {
                    const paidThisMonth =
                      currentMonthPaidByStaff.get(staff.id) || 0;
                    const remainingSalary = Math.max(
                      0,
                      staff.monthlySalary - paidThisMonth
                    );
                    const isSelected = staff.id === activeStaffId;

                    return (
                      <div
                        key={staff.id}
                        onClick={() => setSelectedStaffId(staff.id)}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition active:scale-[0.98] ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-sm text-slate-900">
                              {staff.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 num-clear">
                              <span>{staff.role}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Phone className="h-3 w-3" />
                                {staff.phone}
                              </span>
                            </div>
                          </div>
                          <span className="num-clear rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300">
                            বেতন: {formatBDT(staff.monthlySalary)}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/90 p-2 text-[11px] border border-slate-100">
                          <div>
                            <span className="text-slate-500 block">
                              এই মাসে পরিশোধিত:
                            </span>
                            <strong className="num-clear font-extrabold text-emerald-700">
                              {formatBDT(paidThisMonth)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              বাকি বেতন:
                            </span>
                            <strong
                              className={`num-clear font-extrabold ${
                                remainingSalary > 0
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {remainingSalary > 0
                                ? formatBDT(remainingSalary)
                                : 'পরিশোধিত'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    if (!selectedStaff) {
                      setErrorMsg(
                        'বেতন প্রদানের আগে অন্তত একজন কর্মচারী তালিকায় যোগ করুন।'
                      );
                      setActiveTab('staff');
                      return;
                    }
                    const amt = Math.max(
                      0,
                      Math.round(Number(payAmountInput) || 0)
                    );
                    if (amt <= 0) {
                      setErrorMsg('প্রদত্ত টাকার পরিমাণ ০ এর বেশি হতে হবে।');
                      return;
                    }
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const note = salaryNoteInput.trim() || paymentType;
                    onPayStaffSalary({
                      title: `${selectedStaff.name} (${selectedStaff.role}) — ${paymentType}: ${note}`,
                      category: 'কর্মচারী বেতন',
                      amount: amt,
                      expenseDateISO: todayISO,
                      dateLabel: `আজ, ${timeStr}`,
                      staffId: selectedStaff.id,
                      staffName: selectedStaff.name,
                      staffPaymentType: paymentType,
                      salaryMonthNote: note,
                      createdAtISO: now.toISOString(),
                    });
                    setPayAmountInput('');
                    setSuccessMsg(
                      `${selectedStaff.name}-কে ${paymentType} বাবদ ${formatBDT(amt)} প্রদান করা হয়েছে (হাতে নগদ ও নিট লাভ থেকে সমন্বয়কৃত)।`
                    );
                  }}
                  className="rounded-3xl border border-emerald-200/80 bg-slate-50/80 p-4 space-y-3.5 text-xs"
                >
                  <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                    <Wallet className="h-4 w-4 text-emerald-700" />
                    <span>বেতন বা অগ্রিম প্রদান করুন</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-bold text-slate-700">
                        কর্মচারী নির্বাচন করুন *
                      </label>
                      <IosSelect
                        value={activeStaffId}
                        onChange={(val) => setSelectedStaffId(val)}
                        options={staffList.map((s) => ({
                          value: s.id,
                          label: `${s.name} (${s.role})`,
                          sublabel: `মোবাইল: ${s.phone || 'N/A'}`,
                          badge: `বেতন: ${formatBDT(s.monthlySalary)}`,
                        }))}
                        sheetTitle="কর্মচারী নির্বাচন করুন"
                        ariaLabel="কর্মচারী নির্বাচন করুন"
                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        প্রদানের ধরন *
                      </label>
                      <IosSelect
                        value={paymentType}
                        onChange={(val) =>
                          setPaymentType(val as StaffPaymentType)
                        }
                        options={PAYMENT_TYPES.map((p) => ({
                          value: p,
                          label: p,
                        }))}
                        sheetTitle="প্রদানের ধরন নির্বাচন করুন"
                        ariaLabel="প্রদানের ধরন"
                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-bold text-slate-700">
                        টাকার পরিমাণ (৳) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={payAmountInput}
                        onChange={(e) => setPayAmountInput(e.target.value)}
                        placeholder={
                          selectedStaff
                            ? String(
                                Math.max(
                                  0,
                                  selectedStaff.monthlySalary -
                                    (currentMonthPaidByStaff.get(
                                      selectedStaff.id
                                    ) || 0)
                                ) || selectedStaff.monthlySalary
                              )
                            : '3000'
                        }
                        className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">
                        মাসের নাম / নোট
                      </label>
                      <input
                        type="text"
                        value={salaryNoteInput}
                        onChange={(e) => setSalaryNoteInput(e.target.value)}
                        placeholder="যেমন: অক্টোবর মাসের বেতন / অগ্রিম"
                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:opacity-95 active:scale-[0.97] transition"
                    >
                      <Wallet className="h-4 w-4 text-amber-300" />
                      <span>বেতন / অগ্রিম প্রদান নিশ্চিত করুন</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            <div className="space-y-2.5 pt-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                প্রদত্ত বেতন ও অগ্রিম ইতিহাস ({salaryExpenses.length} টি)
              </h3>
              {salaryExpenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
                  এখনো কোনো বেতন বা অগ্রিম প্রদানের রেকর্ড নেই।
                </div>
              ) : (
                <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white px-3.5">
                  {salaryExpenses.map((exp) => {
                    const dt = formatDynamicDateTime(
                      exp.expenseDateISO,
                      exp.dateLabel,
                      exp.createdAtISO
                    );
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between gap-2 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {exp.title}
                          </div>
                          <div className="text-[11px] text-slate-500 num-clear">
                            {dt.fullLabel} •{' '}
                            {exp.staffPaymentType || 'কর্মচারী বেতন'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="num-clear font-extrabold text-rose-600">
                            -{formatBDT(exp.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteExpense(exp)}
                            aria-label="বেতন এন্ট্রি ডিলিট করুন"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.97] transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setErrorMsg(null);
                setSuccessMsg(null);
                const name = staffNameInput.trim();
                const role = staffRoleInput.trim() || 'সেলসম্যান';
                const phone = staffPhoneInput.trim();
                const monthlySalary = Math.max(
                  0,
                  Math.round(Number(staffSalaryInput) || 0)
                );

                if (!name) {
                  setErrorMsg('কর্মচারীর নাম লিখুন।');
                  return;
                }
                if (!phone || phone.length < 5) {
                  setErrorMsg('কর্মচারীর সঠিক মোবাইল নম্বর লিখুন।');
                  return;
                }
                if (monthlySalary <= 0) {
                  setErrorMsg('মাসিক নির্ধারিত বেতনের পরিমাণ লিখুন।');
                  return;
                }

                if (editingStaff) {
                  onUpdateStaff({
                    ...editingStaff,
                    name,
                    role,
                    phone,
                    monthlySalary,
                  });
                  setSuccessMsg(`"${name}"-এর তথ্য আপডেট করা হয়েছে!`);
                  setEditingStaff(null);
                } else {
                  onAddStaff({
                    name,
                    role,
                    phone,
                    monthlySalary,
                    joinedDateISO: todayISO,
                    createdAtISO: new Date().toISOString(),
                  });
                  setSuccessMsg(`নতুন কর্মচারী "${name}" যুক্ত করা হয়েছে!`);
                }
                setStaffNameInput('');
                setStaffRoleInput('সেলসম্যান');
                setStaffPhoneInput('');
                setStaffSalaryInput('');
              }}
              className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5 text-xs"
            >
              <div className="font-extrabold text-sm text-slate-900">
                {editingStaff
                  ? `কর্মচারীর তথ্য এডিট করুন (${editingStaff.name})`
                  : '+ নতুন কর্মচারী যোগ করুন'}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700">
                    কর্মচারীর নাম *
                  </label>
                  <input
                    type="text"
                    value={staffNameInput}
                    onChange={(e) => setStaffNameInput(e.target.value)}
                    placeholder="যেমন: মো: করিম উদ্দিন"
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">
                    পদবী / কাজ *
                  </label>
                  <input
                    type="text"
                    value={staffRoleInput}
                    onChange={(e) => setStaffRoleInput(e.target.value)}
                    placeholder="যেমন: সিনিয়র সেলসম্যান / ক্যাশিয়ার"
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="text"
                    value={staffPhoneInput}
                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">
                    মাসিক নির্ধারিত বেতন (৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={staffSalaryInput}
                    onChange={(e) => setStaffSalaryInput(e.target.value)}
                    placeholder="12000"
                    className="num-clear mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {editingStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStaff(null);
                      setStaffNameInput('');
                      setStaffRoleInput('সেলসম্যান');
                      setStaffPhoneInput('');
                      setStaffSalaryInput('');
                    }}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700"
                  >
                    বাতিল
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 px-5 py-2.5 font-extrabold text-white shadow-sm hover:opacity-95 active:scale-[0.97] transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>
                    {editingStaff
                      ? 'আপডেট সংরক্ষণ করুন'
                      : '+ কর্মচারী যুক্ত করুন'}
                  </span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                দোকানের সকল কর্মচারী ({staffList.length} জন)
              </h3>
              {staffList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
                  কোনো কর্মচারী তালিকাভুক্ত নেই।
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-3.5">
                  {staffList.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between gap-2 py-3 text-xs"
                    >
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">
                          {staff.name}
                        </div>
                        <div className="text-slate-500 num-clear">
                          {staff.role} • মোবাইল: {staff.phone} • মাসিক বেতন:{' '}
                          <strong className="text-emerald-700">
                            {formatBDT(staff.monthlySalary)}
                          </strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaff(staff);
                            setStaffNameInput(staff.name);
                            setStaffRoleInput(staff.role);
                            setStaffPhoneInput(staff.phone);
                            setStaffSalaryInput(String(staff.monthlySalary));
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-[0.97] transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteStaff(staff)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.97] transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
