import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Landmark,
  Building2,
  PlusCircle,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  FileSpreadsheet,
  Printer,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Coins,
  Loader2,
  Layers,
  HelpCircle,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { exportBankTransactionsExcelCSV } from '../services/storage';

export default function BankManagementModal({
  isOpen = false,
  onClose,
  embedded = false,
  bankAccounts = [],
  bankTransactions = [],
  currencySymbol = '৳',
  activeUser = null,
  activeRegister = null,
  storeSettings = {},
  onSaveBankTransaction,
  onAddBankAccount,
  onUpdateBankAccount
}) {
  // ১. সকল স্টেট ও রেফারেন্স ডিক্লারেশন
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'transactions' | 'deposit'
  const [toast, setToast] = useState(null); // { id, message, type }
  const [inlineError, setInlineError] = useState(null); // { message, onRetry }

  // লেনদেন সার্চ ও ফিল্টার স্টেট
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | '7_DAYS' | 'THIS_MONTH'

  // নতুন লেনদেন ফর্ম স্টেট
  const [txType, setTxType] = useState('DEPOSIT'); // 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER'
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [source, setSource] = useState('দোকানের ক্যাশ ড্রয়ার (Shop Cash)');
  const [sourceType, setSourceType] = useState('cash_register'); // 'cash_register' | 'external'
  const [txNotes, setTxNotes] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // নতুন ব্যাংক অ্যাকাউন্ট তৈরি সাব-মডাল স্টেট
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newAccountType, setNewAccountType] = useState('Current');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  // স্টেটমেন্ট প্রিন্ট প্রিভিউ
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  const searchInputRef = useRef(null);

  // ডিফল্ট নির্বাচিত ব্যাংক অ্যাকাউন্ট সেটআপ
  useEffect(() => {
    if (!selectedAccountId && bankAccounts && bankAccounts.length > 0) {
      setSelectedAccountId(bankAccounts[0].AccountID);
    }
  }, [bankAccounts, selectedAccountId]);

  // টোস্ট নোটিফিকেশন টাইমার
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // কীবোর্ড শর্টকাট (Esc to close, / to search)
  useEffect(() => {
    if (!isOpen && !embedded) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddAccountModal) {
          e.preventDefault();
          setShowAddAccountModal(false);
        } else if (isPrintPreview) {
          e.preventDefault();
          setIsPrintPreview(false);
        } else if (!embedded && onClose) {
          e.preventDefault();
          onClose();
        }
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, embedded, showAddAccountModal, isPrintPreview, onClose]);

  // ২. হেল্পার ফাংশন
  const showToast = (message, type = 'success') => {
    setToast({
      id: Date.now(),
      message,
      type
    });
  };

  // ৩. মেমোইজড মেট্রিক্স ও ফিল্টারসমূহ
  const totalBankBalance = useMemo(() => {
    return bankAccounts.reduce((sum, a) => sum + (Number(a.CurrentBalance) || 0), 0);
  }, [bankAccounts]);

  const activeAccountsCount = useMemo(() => {
    return bankAccounts.filter(a => a.Status === 'Active').length;
  }, [bankAccounts]);

  // ফিল্টারকৃত লেনদেন তালিকা
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return bankTransactions.filter(t => {
      // অ্যাকাউন্ট ফিল্টার
      if (accountFilter !== 'ALL' && t.AccountID !== accountFilter) return false;

      // টাইপ ফিল্টার
      if (typeFilter !== 'ALL' && t.Type !== typeFilter) return false;

      // তারিখ ফিল্টার
      if (dateFilter !== 'ALL' && t.Date) {
        const itemDate = new Date(t.Date);
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'TODAY' && diffDays > 1) return false;
        if (dateFilter === '7_DAYS' && diffDays > 7) return false;
        if (dateFilter === 'THIS_MONTH' && (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear())) return false;
      }

      // সার্চ ফিল্টার
      if (q) {
        const matchBank = String(t.BankName || '').toLowerCase().includes(q);
        const matchAcc = String(t.AccountNumber || '').toLowerCase().includes(q);
        const matchRef = String(t.ReferenceNo || '').toLowerCase().includes(q);
        const matchNote = String(t.Notes || '').toLowerCase().includes(q);
        const matchSource = String(t.Source || '').toLowerCase().includes(q);
        if (!matchBank && !matchAcc && !matchRef && !matchNote && !matchSource) return false;
      }

      return true;
    });
  }, [bankTransactions, accountFilter, typeFilter, dateFilter, searchQuery]);

  // নির্বাচিত ব্যাংকের বর্তমান ব্যালেন্স
  const selectedAccount = useMemo(() => {
    return bankAccounts.find(a => a.AccountID === selectedAccountId) || null;
  }, [bankAccounts, selectedAccountId]);

  // ট্রানজেকশন সাবমিটের পর প্রত্যাশিত ব্যালেন্স প্রিভিউ
  const previewBalanceAfter = useMemo(() => {
    if (!selectedAccount) return 0;
    const current = Number(selectedAccount.CurrentBalance || 0);
    const amt = Number(txAmount) || 0;
    if (txType === 'DEPOSIT') return current + amt;
    if (txType === 'WITHDRAW') return Math.max(0, current - amt);
    if (txType === 'TRANSFER') return Math.max(0, current - amt);
    return current;
  }, [selectedAccount, txAmount, txType]);

  // ৪. ইভেন্ট হ্যান্ডলারসমূহ

  // লেনদেন সংরক্ষণ হ্যান্ডলার
  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    setInlineError(null);

    const numAmount = Number(txAmount);
    if (!selectedAccountId) {
      setInlineError({ message: 'অনুগ্রহ করে একটি ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।' });
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setInlineError({ message: 'টাকার পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' });
      return;
    }
    if ((txType === 'WITHDRAW' || txType === 'TRANSFER') && selectedAccount && Number(selectedAccount.CurrentBalance || 0) < numAmount) {
      setInlineError({ message: `অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ${Number(selectedAccount.CurrentBalance || 0).toLocaleString('bn-BD')} ${currencySymbol}` });
      return;
    }
    if (txType === 'TRANSFER' && (!destinationAccountId || destinationAccountId === selectedAccountId)) {
      setInlineError({ message: 'ফান্ড স্থানান্তরের জন্য অন্য একটি বৈধ ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।' });
      return;
    }

    try {
      setIsSubmittingTx(true);
      if (onSaveBankTransaction) {
        await onSaveBankTransaction({
          accountId: selectedAccountId,
          type: txType,
          amount: numAmount,
          referenceNo: referenceNo.trim() || `SLIP-${Date.now().toString().slice(-5)}`,
          source: source.trim() || (sourceType === 'cash_register' ? 'দোকানের ক্যাশ ড্রয়ার' : 'বাহ্যিক উৎস'),
          sourceType: txType !== 'TRANSFER' ? sourceType : 'transfer',
          destinationType: txType === 'WITHDRAW' ? sourceType : '',
          notes: txNotes.trim(),
          toAccountId: txType === 'TRANSFER' ? destinationAccountId : '',
          date: txDate,
          performedBy: activeUser?.Name || activeUser?.Email || 'Admin'
        });
      }

      showToast(`ব্যাংক ${txType === 'DEPOSIT' ? 'জমা' : txType === 'WITHDRAW' ? 'উত্তোলন' : 'স্থানান্তর'} সফল হয়েছে!`, 'success');

      // ফর্ম রিসেট
      setTxAmount('');
      setReferenceNo('');
      setTxNotes('');
      setActiveTab('transactions');
    } catch (err) {
      console.error('Bank transaction failed:', err);
      setInlineError({ message: err.message || 'লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে।' });
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // নতুন ব্যাংক অ্যাকাউন্ট তৈরি হ্যান্ডলার
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      showToast('ব্যাংকের নাম প্রদান করা আবশ্যক', 'error');
      return;
    }

    try {
      setIsSubmittingAccount(true);
      if (onAddBankAccount) {
        await onAddBankAccount({
          bankName: newBankName.trim(),
          accountName: newAccountName.trim() || storeSettings?.StoreName || 'Pabna Bostraloy',
          accountNumber: newAccountNumber.trim() || '0000',
          branch: newBranch.trim() || 'Main Branch',
          accountType: newAccountType,
          openingBalance: Number(newOpeningBalance) || 0,
          status: 'Active'
        });
      }

      showToast('নতুন ব্যাংক অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে!', 'success');
      setShowAddAccountModal(false);
      setNewBankName('');
      setNewAccountName('');
      setNewAccountNumber('');
      setNewBranch('');
      setNewOpeningBalance('');
    } catch (err) {
      console.error('Create account failed:', err);
      showToast(err.message || 'ব্যাংক অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent" : "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-900/40 overflow-y-auto"}>
      <div className={embedded ? "relative w-full bg-white rounded-lg border border-neutral-200/80 overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)]" : "relative w-full max-w-5xl bg-white rounded-lg border border-neutral-200/80 overflow-hidden my-auto flex flex-col max-h-[92vh]"}>

        {/* =================================================================== */}
        {/* হেডার ও সেগমেন্টেড ট্যাব */}
        {/* =================================================================== */}
        <div className="px-6 py-3.5 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md border border-neutral-200/80 bg-[#F5F5F5] text-[#0F172A] flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base font-semibold tracking-tight text-[#111111]">
                  ব্যাংক হিসাব ও ডিপোজিট খতিয়ান
                </h2>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums border border-neutral-200/80 bg-[#F5F5F5] text-[#111111]">
                  <span>মোট ব্যালেন্স:</span>
                  <strong className="font-semibold">{currencySymbol}{Math.round(totalBankBalance).toLocaleString('bn-BD')}</strong>
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                একাধিক ব্যাংক ও বিকাশ/নগদ অ্যাকাউন্টের ডিপোজিট ট্র্যাকিং, ব্যালেন্স ও স্টেটমেন্ট
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* ৩টি মূল সেগমেন্টেড ট্যাব */}
            <div className="bg-[#F5F5F5] p-1 rounded-md flex items-center border border-neutral-200/80 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setActiveTab('accounts'); setIsPrintPreview(false); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap ${
                  activeTab === 'accounts'
                    ? 'bg-white text-[#111111] border border-neutral-200/80 font-semibold'
                    : 'text-[#525252] hover:text-[#111111] border border-transparent'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>ব্যাংক অ্যাকাউন্টস</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums bg-[#F5F5F5] border border-neutral-200/80 text-[#111111]">
                  {bankAccounts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('deposit'); setIsPrintPreview(false); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap ${
                  activeTab === 'deposit'
                    ? 'bg-white text-[#111111] border border-neutral-200/80 font-semibold'
                    : 'text-[#525252] hover:text-[#111111] border border-transparent'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ টাকা জমা / উত্তোলন</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('transactions'); setIsPrintPreview(false); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'bg-white text-[#111111] border border-neutral-200/80 font-semibold'
                    : 'text-[#525252] hover:text-[#111111] border border-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>লেনদেন পাসবুক</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums bg-[#F5F5F5] border border-neutral-200/80 text-[#111111]">
                  {bankTransactions.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#737373] hover:text-[#111111] bg-white hover:bg-[#F5F5F5] rounded-md border border-neutral-200/80 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* টোস্ট নোটিফিকেশন */}
        {toast && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200/80 text-[#15803D] text-xs font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-[#15803D] hover:underline cursor-pointer p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* কনটেন্ট বডি */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] space-y-4">

          {/* =============================================================== */}
          {/* ট্যাব ১: ব্যাংক অ্যাকাউন্টস ওভারভিউ (Accounts Grid) */}
          {/* =============================================================== */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              {/* শীর্ষ লিকুইডিটি কার্ড */}
              <div className="p-4 bg-white rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">দোকানের সর্বমোট ব্যাংক তারল্য (Total Bank Liquidity)</span>
                  <div className="text-2xl sm:text-3xl font-semibold font-mono tracking-tight tabular-nums text-[#111111]">
                    {currencySymbol}{Math.round(totalBankBalance).toLocaleString('bn-BD')}
                  </div>
                  <p className="text-xs text-[#525252]">
                    মোট <span className="font-mono tabular-nums">{bankAccounts.length}</span>টি সক্রিয় হিসাবের সমন্বিত ব্যালেন্স
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(true)}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-md text-white bg-[#0F172A] hover:bg-slate-800 transition-colors duration-150 cursor-pointer flex items-center space-x-1.5 min-h-[44px] sm:min-h-[36px]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ নতুন ব্যাংক অ্যাকাউন্ট</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deposit')}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-md text-[#111111] bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] hover:border-neutral-300 transition-colors duration-150 cursor-pointer flex items-center space-x-1.5 min-h-[44px] sm:min-h-[36px]"
                  >
                    <Coins className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>টাকা জমা দিন</span>
                  </button>
                </div>
              </div>

              {/* ব্যাংক অ্যাকাউন্ট কার্ডস গ্রিড */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {bankAccounts.map((acc) => {
                  const bal = Number(acc.CurrentBalance || 0);
                  const isMfs = acc.AccountType === 'MFS Merchant';

                  return (
                    <div
                      key={acc.AccountID}
                      className="p-4 bg-white rounded-lg border border-neutral-200/80 hover:border-neutral-300 transition-colors duration-150 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                              {acc.BankName}
                            </h3>
                            <span className="text-xs text-[#525252] block font-mono tabular-nums">
                              A/C: {acc.AccountNumber}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums border ${
                            isMfs ? 'bg-amber-50 text-[#B45309] border-amber-200/80' : 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80'
                          }`}>
                            {acc.AccountType}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-neutral-200/80">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373] block mb-0.5">বর্তমান জমা ব্যালেন্স</span>
                          <div className="text-xl font-semibold font-mono tracking-tight tabular-nums text-[#111111]">
                            {currencySymbol}{Math.round(bal).toLocaleString('bn-BD')}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between text-xs text-[#737373]">
                        <span className="truncate">{acc.Branch || 'Main Branch'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(acc.AccountID);
                            setActiveTab('deposit');
                          }}
                          className="text-[#0F172A] hover:underline font-medium cursor-pointer min-h-[44px] sm:min-h-[36px] flex items-center"
                        >
                          ডিপোজিট করুন →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ট্যাব ২: টাকা জমা / উত্তোলন এন্ট্রি ফর্ম (Deposit / Withdraw Form) */}
          {/* =============================================================== */}
          {activeTab === 'deposit' && (
            <div className="max-w-2xl mx-auto p-5 bg-white rounded-lg border border-neutral-200/80 space-y-4">
              <div className="border-b border-neutral-200/80 pb-3">
                <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                  ব্যাংকে টাকা জমা, উত্তোলন ও ট্রান্সফার এন্ট্রি
                </h3>
                <p className="text-xs text-[#525252]">
                  দোকানের ক্যাশ ড্রয়ার বা অন্য উৎস থেকে ব্যাংকে টাকা জমা কিংবা চেক উত্তোলন
                </p>
              </div>

              {inlineError && (
                <div className="p-3 bg-red-50 border border-red-200/80 rounded-md text-xs text-[#B91C1C] flex items-center justify-between">
                  <span>{inlineError.message}</span>
                  <button onClick={() => setInlineError(null)} className="text-[#B91C1C] font-semibold p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmitTransaction} className="space-y-4">
                {/* লেনদেনের ধরণ নির্বাচন */}
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1.5">
                    লেনদেনের ধরণ নির্বাচন করুন *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('DEPOSIT')}
                      className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                        txType === 'DEPOSIT'
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white text-[#111111] border-neutral-200/80 hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <ArrowDownRight className={`w-4 h-4 ${txType === 'DEPOSIT' ? 'text-emerald-400' : 'text-[#15803D]'}`} />
                      <span>টাকা জমা (Deposit)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxType('WITHDRAW')}
                      className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                        txType === 'WITHDRAW'
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white text-[#111111] border-neutral-200/80 hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <ArrowUpRight className={`w-4 h-4 ${txType === 'WITHDRAW' ? 'text-red-400' : 'text-[#B91C1C]'}`} />
                      <span>টাকা উত্তোলন (Withdraw)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxType('TRANSFER')}
                      className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                        txType === 'TRANSFER'
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white text-[#111111] border-neutral-200/80 hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <ArrowRightLeft className={`w-4 h-4 ${txType === 'TRANSFER' ? 'text-amber-400' : 'text-[#B45309]'}`} />
                      <span>ব্যাংক ট্রান্সফার</span>
                    </button>
                  </div>
                </div>

                {/* ব্যাংক অ্যাকাউন্ট নির্বাচন */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">
                      {txType === 'TRANSFER' ? 'উৎস ব্যাংক (Source Account) *' : 'ব্যাংক অ্যাকাউন্ট *'}
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                      required
                    >
                      {bankAccounts.map((a) => (
                        <option key={a.AccountID} value={a.AccountID}>
                          {a.BankName} — {a.AccountNumber} (ব্যালেন্স: ৳{Number(a.CurrentBalance || 0).toLocaleString('bn-BD')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {txType === 'TRANSFER' ? (
                    <div>
                      <label className="block text-xs font-medium text-[#111111] mb-1">
                        গন্তব্য ব্যাংক (Destination Account) *
                      </label>
                      <select
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                        required
                      >
                        <option value="">-- গন্তব্য ব্যাংক বেছে নিন --</option>
                        {bankAccounts.filter(a => a.AccountID !== selectedAccountId).map((a) => (
                          <option key={a.AccountID} value={a.AccountID}>
                            {a.BankName} — {a.AccountNumber} (ব্যালেন্স: ৳{Number(a.CurrentBalance || 0).toLocaleString('bn-BD')})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-[#111111] mb-1">
                        জমার তারিখ
                      </label>
                      <input
                        type="date"
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                      />
                    </div>
                  )}
                </div>

                {/* টাকার পরিমাণ ও রেফারেন্স */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">
                      টাকার পরিমাণ (Amount ৳) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="যেমন: ৫০,০০০"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-sm font-semibold font-mono tabular-nums text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">
                      স্লিপ নং / চেক নং / TrxID
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: SLIP-98421"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs font-mono text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    />
                  </div>
                </div>

                {/* উৎস ও মন্তব্য */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#111111]">
                        {txType === 'DEPOSIT' ? 'টাকার উৎস / খাত' : txType === 'WITHDRAW' ? 'টাকা স্থানান্তরের গন্তব্য' : 'লেনদেনের বিবরণ'}
                      </label>
                      {activeRegister && (
                        <span className="text-[10px] text-[#15803D] bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/80 font-mono">
                          ক্যাশ ড্রয়ার সক্রিয়
                        </span>
                      )}
                    </div>
                    {txType !== 'TRANSFER' ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSourceType('cash_register');
                              setSource(txType === 'DEPOSIT' ? 'দোকানের ক্যাশ ড্রয়ার (Shop Cash)' : 'দোকানের ক্যাশ ড্রয়ারে জমা');
                            }}
                            className={`px-2 py-1.5 text-xs text-left rounded-md border transition-colors min-h-[44px] sm:min-h-[36px] ${
                              sourceType === 'cash_register'
                                ? 'bg-[#0F172A] text-white border-[#0F172A] font-medium'
                                : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                            }`}
                          >
                            {txType === 'DEPOSIT' ? 'দোকানের ক্যাশ ড্রয়ার' : 'দোকানের ক্যাশ ড্রয়ার'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSourceType('external');
                              setSource(txType === 'DEPOSIT' ? 'বাহ্যিক তহবিল / মূলধন' : 'ব্যক্তিগত / অন্যান্য খরচ');
                            }}
                            className={`px-2 py-1.5 text-xs text-left rounded-md border transition-colors min-h-[44px] sm:min-h-[36px] ${
                              sourceType === 'external'
                                ? 'bg-[#0F172A] text-white border-[#0F172A] font-medium'
                                : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                            }`}
                          >
                            {txType === 'DEPOSIT' ? 'বাহ্যিক / মালিকের তহবিল' : 'অন্যান্য / ব্যক্তিগত খরচ'}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={txType === 'DEPOSIT' ? 'দোকানের ক্যাশ ড্রয়ার' : 'খরচ বা ব্যবহারের বিবরণ'}
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                        />
                        {sourceType === 'cash_register' && (
                          <p className="text-[11px] text-[#15803D] flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] shrink-0" />
                            <span>
                              {txType === 'DEPOSIT'
                                ? 'এই টাকাটি দৈনিক ক্যাশ ড্রয়ারের ব্যালেন্স থেকে কর্তন হবে (EOD শর্টেজ হবে না)।'
                                : 'এই টাকাটি ক্যাশ ড্রয়ারের ব্যালেন্সে ক্যাশ-ইন হিসাবে জমা হবে।'}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="ফান্ড ট্রান্সফার বিবরণ"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">
                      অতিরিক্ত নোট / বিবরণ
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: সাপ্তাহিক ক্যাশ জমা"
                      value={txNotes}
                      onChange={(e) => setTxNotes(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    />
                  </div>
                </div>

                {/* ব্যালেন্স প্রিভিউ কার্ড */}
                {selectedAccount && Number(txAmount) > 0 && (
                  <div className="p-3 bg-[#F5F5F5] rounded-md border border-neutral-200/80 flex items-center justify-between text-xs">
                    <span className="text-[#525252]">এই লেনদেনের পর অ্যাকাউন্টের প্রত্যাশিত ব্যালেন্স:</span>
                    <strong className="font-mono tabular-nums text-sm text-[#111111]">
                      {currencySymbol}{Math.round(previewBalanceAfter).toLocaleString('bn-BD')}
                    </strong>
                  </div>
                )}

                {/* সাবমিট বোতাম */}
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('accounts')}
                    className="px-4 py-2 text-xs font-medium rounded-md text-[#111111] bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    বাতিল
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingTx}
                    className="px-5 py-2 text-xs font-medium rounded-md text-white bg-[#0F172A] hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 flex items-center space-x-1.5 min-h-[44px] sm:min-h-[36px]"
                  >
                    {isSubmittingTx ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <span>নিশ্চিত করুন ও সেভ করুন</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =============================================================== */}
          {/* ট্যাব ৩: লেনদেন পাসবুক / খতিয়ান (Passbook Ledger) */}
          {/* =============================================================== */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {/* সার্চ ও ফিল্টার বার */}
              <div className="p-3 bg-white rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* সার্চ বক্স */}
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="রেফারেন্স নং, ব্যাংক, মন্তব্য খুঁজুন... (/)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    />
                  </div>

                  {/* ব্যাংক ফিল্টার */}
                  <select
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                  >
                    <option value="ALL">সকল ব্যাংক</option>
                    {bankAccounts.map(a => (
                      <option key={a.AccountID} value={a.AccountID}>{a.BankName}</option>
                    ))}
                  </select>

                  {/* টাইপ ফিল্টার */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                  >
                    <option value="ALL">সকল লেনদেন</option>
                    <option value="DEPOSIT">জমা (Deposit)</option>
                    <option value="WITHDRAW">উত্তোলন (Withdraw)</option>
                    <option value="TRANSFER">স্থানান্তর (Transfer)</option>
                  </select>

                  {/* তারিখ ফিল্টার */}
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                  >
                    <option value="ALL">সকল তারিখ</option>
                    <option value="TODAY">আজকের লেনদেন</option>
                    <option value="7_DAYS">গত ৭ দিন</option>
                    <option value="THIS_MONTH">চলতি মাস</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => exportBankTransactionsExcelCSV(filteredTransactions, bankAccounts)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md text-[#111111] bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] hover:border-neutral-300 transition-colors duration-150 cursor-pointer flex items-center space-x-1.5 min-h-[44px] sm:min-h-[36px]"
                    title="এক্সেল ফাইল ডাউনলোড করুন"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>এক্সেল ডাউনলোড</span>
                  </button>
                </div>
              </div>

              {/* লেনদেন টেবিল */}
              <div className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F5F5F5] text-[#525252] font-medium border-b border-neutral-200/80">
                        <th className="py-2.5 px-3">তারিখ ও সময়</th>
                        <th className="py-2.5 px-3">ব্যাংক ও হিসাব নং</th>
                        <th className="py-2.5 px-3">ধরণ</th>
                        <th className="py-2.5 px-3">রেফারেন্স / স্লিপ নং</th>
                        <th className="py-2.5 px-3 text-right">জমা (+)</th>
                        <th className="py-2.5 px-3 text-right">খরচ / তোলা (-)</th>
                        <th className="py-2.5 px-3 text-right">অবশিষ্ট ব্যালেন্স</th>
                        <th className="py-2.5 px-3">এন্ট্রিকারী</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/80">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-[#737373]">
                            কোনো ব্যাংক লেনদেন রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const isCredit = tx.Type === 'DEPOSIT';

                          return (
                            <tr key={tx.TransactionID} className="hover:bg-[#FAFAFA] transition-colors duration-150">
                              <td className="py-2.5 px-3 font-mono tabular-nums text-[#525252] whitespace-nowrap">
                                {new Date(tx.Date || tx.CreatedAt).toLocaleDateString('bn-BD')}
                                <span className="block text-[10px] text-[#737373]">
                                  {new Date(tx.Date || tx.CreatedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-[#111111]">
                                <div>{tx.BankName}</div>
                                <span className="text-[10px] font-mono tabular-nums text-[#737373]">{tx.AccountNumber}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                                  isCredit
                                    ? 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                                    : 'bg-red-50 text-[#B91C1C] border-red-200/80'
                                }`}>
                                  {isCredit ? '+ ডিপোজিট' : '- উত্তোলন'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-[#111111]">
                                {tx.ReferenceNo || 'N/A'}
                                {tx.Notes && <span className="block text-[10.5px] font-sans text-[#737373]">{tx.Notes}</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#15803D]">
                                {isCredit ? `+${Number(tx.Amount).toLocaleString('bn-BD')}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#B91C1C]">
                                {!isCredit ? `-${Number(tx.Amount).toLocaleString('bn-BD')}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#111111]">
                                {currencySymbol}{Number(tx.BalanceAfter || 0).toLocaleString('bn-BD')}
                              </td>
                              <td className="py-2.5 px-3 text-[#525252]">
                                {tx.PerformedBy || 'Admin'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* সাব-মডাল: নতুন ব্যাংক অ্যাকাউন্ট সংযোজন */}
        {/* =================================================================== */}
        {showAddAccountModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-neutral-900/40">
            <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-md p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2.5">
                <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                  নতুন ব্যাংক অ্যাকাউন্ট যোগ করুন
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="text-[#737373] hover:text-[#111111] p-1.5 rounded-md hover:bg-[#F5F5F5] min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">ব্যাংকের নাম *</label>
                  <input
                    type="text"
                    placeholder="যেমন: Islami Bank Bangladesh Ltd"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">হিসাবধারীর নাম</label>
                    <input
                      type="text"
                      placeholder="Pabna Bostraloy"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">অ্যাকাউন্ট নম্বর *</label>
                    <input
                      type="text"
                      placeholder="2050XXXXXXXXXX"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">শাখার নাম</label>
                    <input
                      type="text"
                      placeholder="Mohammadpur Branch"
                      value={newBranch}
                      onChange={(e) => setNewBranch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111111] mb-1">অ্যাকাউন্টের ধরণ</label>
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                    >
                      <option value="Current">Current (চলতি)</option>
                      <option value="Savings">Savings (সঞ্চয়ী)</option>
                      <option value="MFS Merchant">MFS Merchant (বিকাশ/নগদ)</option>
                      <option value="Other">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">প্রারম্ভিক ব্যালেন্স (Opening Balance ৳)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md text-[#111111] bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] min-h-[44px] sm:min-h-[36px]"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAccount}
                    className="px-4 py-1.5 text-xs font-medium rounded-md text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-40 min-h-[44px] sm:min-h-[36px]"
                  >
                    {isSubmittingAccount ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
