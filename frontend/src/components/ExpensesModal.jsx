import React, { useState, useMemo } from 'react';
import {
  X,
  Receipt,
  PlusCircle,
  Search,
  Building2,
  Zap,
  Users,
  Coffee,
  Truck,
  Package,
  Wrench,
  Megaphone,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Printer,
  Edit2,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  ArrowDownRight,
  Banknote,
  Eye,
  Info
} from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../services/storage';

// ক্যাটাগরি আইকন ম্যাপার
const CATEGORY_ICONS = {
  Rent: Building2,
  Utility: Zap,
  Salary: Users,
  Refreshments: Coffee,
  Transport: Truck,
  Packaging: Package,
  Maintenance: Wrench,
  Marketing: Megaphone,
  Other: FileText
};

export default function ExpensesModal({
  isOpen = false,
  onClose,
  embedded = false,
  expenses = [],
  currencySymbol = '৳',
  activeUser = null,
  onSaveExpense,
  onDeleteExpense,
  storeName = 'দোকানের খরচের খাতা',
  storeAddress = '',
  storePhone = ''
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('month'); // 'today' | 'month' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [quickChip, setQuickChip] = useState('month'); // 'all' | 'today' | 'month' | 'cash' | 'digital'

  // এডিটিং স্টেট
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // ভাউচার স্লিপ ও রসিদ প্রিভিউ স্টেট
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // পেজিনেশন
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // খরচের ফর্ম স্টেট
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Refreshments',
    amount: '',
    paymentMethod: 'Cash',
    payee: '',
    description: '',
    receiptImage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // ফিল্টারকৃত খরচের তালিকা
  const filteredExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    const today = new Date().toISOString().split('T')[0];
    const currentYearMonth = today.slice(0, 7);

    return list.filter(item => {
      const itemDate = String(item.Date || item.date || '');
      const method = String(item.PaymentMethod || item.paymentMethod || 'Cash');

      // কুইক চিপ ফিল্টার
      if (quickChip === 'today' && itemDate !== today) return false;
      if (quickChip === 'month' && !itemDate.startsWith(currentYearMonth)) return false;
      if (quickChip === 'cash' && method !== 'Cash') return false;
      if (quickChip === 'digital' && method === 'Cash') return false;

      // তারিখ ড্রপডাউন ফিল্টার (যদি কুইক চিপ 'all' হয় তবে কাজ করবে)
      if (quickChip === 'all') {
        if (dateRangeFilter === 'today' && itemDate !== today) return false;
        if (dateRangeFilter === 'month' && !itemDate.startsWith(currentYearMonth)) return false;
        if (dateRangeFilter === 'custom') {
          if (customStartDate && itemDate < customStartDate) return false;
          if (customEndDate && itemDate > customEndDate) return false;
        }
      }

      // ক্যাটাগরি ফিল্টার
      if (selectedCategoryFilter !== 'all' && item.Category !== selectedCategoryFilter) {
        return false;
      }

      // পেমেন্ট মেথড ফিল্টার
      if (selectedMethodFilter !== 'all' && method !== selectedMethodFilter) {
        return false;
      }

      // সার্চ ফিল্টার (ভাউচার আইডি, বিবরণ, ক্যাটাগরি, প্রাপক, ইউজার)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const desc = String(item.Description || '').toLowerCase();
        const cat = String(item.Category || '').toLowerCase();
        const by = String(item.CreatedBy || '').toLowerCase();
        const payee = String(item.Payee || '').toLowerCase();
        const id = String(item.ExpenseID || '').toLowerCase();
        const met = method.toLowerCase();

        return (
          desc.includes(query) ||
          cat.includes(query) ||
          by.includes(query) ||
          payee.includes(query) ||
          id.includes(query) ||
          met.includes(query)
        );
      }

      return true;
    }).sort((a, b) => {
      const dateA = String(a.Date || a.date || '');
      const dateB = String(b.Date || b.date || '');
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return String(b.ExpenseID || '').localeCompare(String(a.ExpenseID || ''));
    });
  }, [
    expenses,
    quickChip,
    dateRangeFilter,
    customStartDate,
    customEndDate,
    selectedCategoryFilter,
    selectedMethodFilter,
    searchTerm
  ]);

  // পেজিনেশন স্লাইস
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  // পেজ অ্যাডজাস্টমেন্ট যখন ফিল্টার বদলে যায়
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryFilter, selectedMethodFilter, quickChip, dateRangeFilter]);

  // পরিসংখ্যান হিসাব
  const stats = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    const today = new Date().toISOString().split('T')[0];
    const currentYearMonth = today.slice(0, 7);

    let totalThisMonth = 0;
    let cashThisMonth = 0;
    let digitalThisMonth = 0;

    let totalToday = 0;
    let cashToday = 0;

    const catSums = {};

    list.forEach(item => {
      const amt = Number(item.Amount) || 0;
      const itemDate = String(item.Date || item.date || '');
      const method = String(item.PaymentMethod || item.paymentMethod || 'Cash');

      if (itemDate === today) {
        totalToday += amt;
        if (method === 'Cash') cashToday += amt;
      }

      if (itemDate.startsWith(currentYearMonth)) {
        totalThisMonth += amt;
        if (method === 'Cash') {
          cashThisMonth += amt;
        } else {
          digitalThisMonth += amt;
        }

        const cat = item.Category || 'Other';
        catSums[cat] = (catSums[cat] || 0) + amt;
      }
    });

    let topCat = 'নাই';
    let maxCatAmt = 0;
    Object.entries(catSums).forEach(([c, amt]) => {
      if (amt > maxCatAmt) {
        maxCatAmt = amt;
        const found = EXPENSE_CATEGORIES.find(cat => cat.id === c);
        topCat = found ? found.name.split(' ')[0] : c;
      }
    });

    // ফিল্টারকৃত তালিকার সর্বমোট যোগফল
    const filteredTotalSum = filteredExpenses.reduce((sum, item) => sum + (Number(item.Amount) || 0), 0);
    const filteredCashSum = filteredExpenses
      .filter(i => (i.PaymentMethod || i.paymentMethod || 'Cash') === 'Cash')
      .reduce((sum, item) => sum + (Number(item.Amount) || 0), 0);

    return {
      totalThisMonth,
      cashThisMonth,
      digitalThisMonth,
      totalToday,
      cashToday,
      totalVouchers: list.length,
      topCategory: topCat,
      topCategoryAmount: maxCatAmt,
      filteredTotalSum,
      filteredCashSum
    };
  }, [expenses, filteredExpenses]);

  // ফর্ম এডিটিং সেটআপ
  const handleStartEdit = (expense) => {
    setEditingExpenseId(expense.ExpenseID);
    setFormData({
      date: expense.Date || expense.date || new Date().toISOString().split('T')[0],
      category: expense.Category || expense.category || 'Other',
      amount: String(expense.Amount !== undefined ? expense.Amount : ''),
      paymentMethod: expense.PaymentMethod || expense.paymentMethod || 'Cash',
      payee: expense.Payee || expense.payee || '',
      description: expense.Description || expense.description || '',
      receiptImage: expense.ReceiptImage || expense.receiptImage || ''
    });
    setStatusMessage(null);
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: 'Refreshments',
      amount: '',
      paymentMethod: 'Cash',
      payee: '',
      description: '',
      receiptImage: ''
    });
    setStatusMessage(null);
    setActiveTab('list');
  };

  // ছবি আপলোড হ্যান্ডলার (রসিদ/মেমো)
  const handleReceiptImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('ছবির আকার সর্বোচ্চ ২ মেগাবাইট (2MB) হতে পারবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, receiptImage: event.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  // ফর্ম হ্যান্ডলার
  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(formData.amount);
    if (!numAmount || numAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'অনুগ্রহ করে খরচের সঠিক পরিমাণ লিখুন।' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        ExpenseID: editingExpenseId || undefined,
        Date: formData.date,
        Category: formData.category,
        Amount: numAmount,
        PaymentMethod: formData.paymentMethod,
        Payee: formData.payee.trim(),
        Description: formData.description.trim(),
        ReceiptImage: formData.receiptImage,
        CreatedBy: activeUser?.FullName || activeUser?.UserName || 'Admin'
      };

      if (typeof onSaveExpense === 'function') {
        await onSaveExpense(payload);
      }

      const successText = editingExpenseId
        ? `ভাউচার #${editingExpenseId} সফলভাবে আপডেট হয়েছে!`
        : `৳${numAmount.toLocaleString('en-IN')} খরচ সফলভাবে এন্ট্রি হয়েছে!`;

      setStatusMessage({ type: 'success', text: successText });

      // ফর্ম রিসেট
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Refreshments',
        amount: '',
        paymentMethod: 'Cash',
        payee: '',
        description: '',
        receiptImage: ''
      });
      setEditingExpenseId(null);

      setTimeout(() => {
        setActiveTab('list');
        setStatusMessage(null);
      }, 1200);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `সংরক্ষণে ত্রুটি: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (expenseId) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই খরচের ভাউচারটি ডিলিট করতে চান?')) {
      if (typeof onDeleteExpense === 'function') {
        onDeleteExpense(expenseId);
      }
    }
  };

  // CSV এক্সপোর্ট ফাংশন
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('এক্সপোর্ট করার মতো কোনো খরচের রেকর্ড পাওয়া যায়নি।');
      return;
    }

    const headers = ['ভাউচার আইডি', 'তারিখ', 'ক্যাটাগরি', 'প্রাপক', 'বিবরণ', 'পেমেন্ট মাধ্যম', 'পরিমাণ (টাকা)', 'এন্ট্রি করেছেন'];
    const rows = filteredExpenses.map(item => {
      const catObj = EXPENSE_CATEGORIES.find(c => c.id === item.Category);
      const catName = catObj ? catObj.name : (item.Category || 'Other');
      return [
        `"${item.ExpenseID || ''}"`,
        `"${item.Date || item.date || ''}"`,
        `"${catName.replace(/"/g, '""')}"`,
        `"${(item.Payee || '').replace(/"/g, '""')}"`,
        `"${(item.Description || '').replace(/"/g, '""')}"`,
        `"${item.PaymentMethod || 'Cash'}"`,
        `"${Number(item.Amount) || 0}"`,
        `"${(item.CreatedBy || 'Admin').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `দোকানের_খরচ_রিপোর্ট_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // থার্মাল প্রিন্ট হ্যান্ডলার
  const handlePrintThermal = () => {
    window.print();
  };

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={
        embedded
          ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200"
          : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100] animate-fadeIn"
      }
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div
        className={
          embedded
            ? "bg-white w-full flex-1 min-h-[calc(100vh-6.5rem)] rounded-2xl shadow-sm flex flex-col overflow-hidden border border-slate-200"
            : "bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-100"
        }
      >
        {/* =========================================================================
            ১. আধুনিক হেডার বার
            ========================================================================= */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  দোকানের খরচের খাতা
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  দৈনন্দিন ব্যয় ও হিসাব
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                দোকান ভাড়া, ইউটিলিটি বিল, স্টাফ বেতন, নাস্তা ও দৈনন্দিন ব্যয়ের পূর্ণাঙ্গ খতিয়ান
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* কুইক অ্যাকশন বাটন */}
            {activeTab === 'list' && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-xs"
                  title="ফিল্টারকৃত ডেটা এক্সেল / CSV ফাইলে ডাউনলোড করুন"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>এক্সপোর্ট CSV</span>
                </button>
                <button
                  onClick={() => {
                    handleCancelEdit();
                    setActiveTab('add');
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>নতুন খরচ</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className={`transition-all cursor-pointer flex items-center justify-center ${
                embedded
                  ? 'px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700'
                  : 'w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title={embedded ? "ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-bold mr-1">←</span>
                  <span>ক্যাটালগ</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            ২. স্মার্ট ফাইন্যান্সিয়াল KPI কার্ড
            ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          
          {/* কার্ড ১: চলতি মাসের মোট খরচ */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">চলতি মাসের খরচ</span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-bold text-rose-700 mt-1">
              {currencySymbol}{stats.totalThisMonth.toLocaleString('en-IN')}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
              <span>নগদ: {currencySymbol}{stats.cashThisMonth.toLocaleString('en-IN')}</span>
              <span>অনলাইন: {currencySymbol}{stats.digitalThisMonth.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* কার্ড ২: আজকের খরচ (নগদ সহ) */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">আজকের খরচ</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
              {currencySymbol}{stats.totalToday.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>ক্যাশ ড্রয়ার থেকে:</span>
              <span className="font-semibold text-amber-800">{currencySymbol}{stats.cashToday.toLocaleString('en-IN')}</span>
            </p>
          </div>

          {/* কার্ড ৩: নগদ ক্যাশ ব্যয় (ক্যাশ ড্রয়ার কর্তন) */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">নগদ ক্যাশ ব্যয় (মাসিক)</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
              {currencySymbol}{stats.cashThisMonth.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100 flex items-center space-x-1">
              <ArrowDownRight className="w-3 h-3 text-emerald-600" />
              <span>ক্যাশ ড্রয়ার EOD ক্লোজিংয়ে যুক্ত</span>
            </p>
          </div>

          {/* কার্ড ৪: সর্বোচ্চ ব্যয়ের খাত */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">সর্বোচ্চ ব্যয়ের খাত</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate" title={stats.topCategory}>
              {stats.topCategory}
            </p>
            <p className="text-[11px] text-indigo-700 font-semibold mt-1 pt-1 border-t border-slate-100">
              ব্যয়: {currencySymbol}{stats.topCategoryAmount.toLocaleString('en-IN')}
            </p>
          </div>

        </div>

        {/* =========================================================================
            ৩. ট্যাব নেভিগেশন
            ========================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 bg-white shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('list');
                setEditingExpenseId(null);
              }}
              className={`py-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'list'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>খরচের তালিকা ({filteredExpenses.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('add');
              }}
              className={`py-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'add'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{editingExpenseId ? `ভাউচার সংশোধন (#${editingExpenseId})` : 'নতুন খরচ যোগ করুন'}</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="hidden sm:flex items-center text-xs text-slate-500 space-x-2">
              <span>মোট ভাউচার: <strong className="text-slate-800">{expenses.length}</strong> টি</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            ৪. বডি কন্টেন্ট (ট্যাব ১: তালিকা | ট্যাব ২: যোগ/এডিট ফর্ম)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 bg-slate-50/70">
          
          {/* ট্যাব ১: খরচের তালিকা ভিউ */}
          {activeTab === 'list' && (
            <div className="space-y-3.5">
              
              {/* ফিল্টার কন্ট্রোল বক্স */}
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                
                {/* সার্চ বক্স ও কুইক চিপস */}
                <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                  {/* সার্চ বক্স */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ভাউচার নং, প্রাপক, বিবরণ বা ইউজার দিয়ে খুঁজুন..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50/50"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* কুইক ফিল্টার চিপস */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'month', label: 'চলতি মাস' },
                      { id: 'today', label: 'আজকের' },
                      { id: 'cash', label: 'ক্যাশ খরচ' },
                      { id: 'digital', label: 'ডিজিটাল/ব্যাংক' },
                      { id: 'all', label: 'সকল ভাউচার' }
                    ].map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setQuickChip(chip.id);
                          if (chip.id !== 'all') {
                            setDateRangeFilter(chip.id === 'today' ? 'today' : chip.id === 'month' ? 'month' : 'all');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          quickChip === chip.id
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* অ্যাডভান্সড ড্রপডাউন ফিল্টারসমূহ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                  
                  {/* ক্যাটাগরি ফিল্টার */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ক্যাটাগরি</label>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="all">সকল খাত</option>
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* পেমেন্ট মেথড ফিল্টার */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">পেমেন্ট মাধ্যম</label>
                    <select
                      value={selectedMethodFilter}
                      onChange={(e) => setSelectedMethodFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="all">সকল মাধ্যম</option>
                      <option value="Cash">Cash (ক্যাশ)</option>
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ)</option>
                      <option value="Bank">Bank (ব্যাংক)</option>
                      <option value="Card">Card (কার্ড)</option>
                    </select>
                  </div>

                  {/* কাস্টম তারিখ রেঞ্জ (শুরু) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">তারিখ হতে</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setQuickChip('all');
                        setDateRangeFilter('custom');
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  {/* কাস্টম তারিখ রেঞ্জ (শেষ) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-500">পর্যন্ত</label>
                      {(customStartDate || customEndDate || selectedCategoryFilter !== 'all' || selectedMethodFilter !== 'all' || searchTerm) && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCategoryFilter('all');
                            setSelectedMethodFilter('all');
                            setCustomStartDate('');
                            setCustomEndDate('');
                            setQuickChip('month');
                            setDateRangeFilter('month');
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center space-x-0.5"
                          title="ফিল্টার রিসেট করুন"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>রিসেট</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setQuickChip('all');
                        setDateRangeFilter('custom');
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                </div>

              </div>

              {/* খরচের টেবিল */}
              {filteredExpenses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">কোনো খরচের রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    নির্বাচিত ফিল্টারে কোনো খরচ নেই অথবা নতুন খরচ এন্ট্রি করা হয়নি।
                  </p>
                  <button
                    onClick={() => {
                      handleCancelEdit();
                      setActiveTab('add');
                    }}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>নতুন খরচ এন্ট্রি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800 text-xs">
                          <th className="py-3 px-3.5 whitespace-nowrap">তারিখ ও ভাউচার</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">ক্যাটাগরি</th>
                          <th className="py-3 px-3.5">প্রাপক ও বিবরণ</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">পেমেন্ট মাধ্যম</th>
                          <th className="py-3 px-3.5 text-right whitespace-nowrap">পরিমাণ</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">ইউজার</th>
                          <th className="py-3 px-3.5 text-center whitespace-nowrap">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedExpenses.map((exp) => {
                          const catObj = EXPENSE_CATEGORIES.find(c => c.id === exp.Category) || {
                            name: exp.Category || 'Other',
                            color: 'text-slate-600 bg-slate-50 border-slate-200'
                          };
                          const IconComp = CATEGORY_ICONS[exp.Category] || FileText;
                          const isCash = (exp.PaymentMethod || 'Cash') === 'Cash';

                          return (
                            <tr key={exp.ExpenseID || Math.random()} className="hover:bg-slate-50/80 transition-colors">
                              {/* তারিখ ও ভাউচার */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <p className="font-mono font-semibold text-slate-800 text-xs">
                                  {exp.Date || exp.date || 'N/A'}
                                </p>
                                <p className="font-mono text-[11px] text-slate-400">
                                  #{exp.ExpenseID || 'EXP'}
                                </p>
                              </td>

                              {/* ক্যাটাগরি */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${catObj.color}`}>
                                  <IconComp className="w-3.5 h-3.5" />
                                  <span>{catObj.name.split(' ')[0]}</span>
                                </span>
                              </td>

                              {/* প্রাপক ও বিবরণ */}
                              <td className="py-3 px-3.5 max-w-xs">
                                {exp.Payee ? (
                                  <div className="font-semibold text-slate-900 text-xs flex items-center space-x-1">
                                    <span className="text-slate-500 font-normal">প্রাপক:</span>
                                    <span>{exp.Payee}</span>
                                  </div>
                                ) : null}
                                <div className="text-slate-600 text-xs truncate" title={exp.Description}>
                                  {exp.Description || <span className="text-slate-400 italic">কোনো বিবরণ নেই</span>}
                                </div>
                                {exp.ReceiptImage && (
                                  <button
                                    onClick={() => setPreviewImage(exp.ReceiptImage)}
                                    className="inline-flex items-center space-x-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium mt-0.5 cursor-pointer"
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                    <span>রসিদ দেখুন</span>
                                  </button>
                                )}
                              </td>

                              {/* পেমেন্ট মাধ্যম */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                    isCash
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  }`}
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>{exp.PaymentMethod || 'Cash'}</span>
                                </span>
                              </td>

                              {/* পরিমাণ */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <span className="font-bold text-sm text-rose-700">
                                  {currencySymbol}{(Number(exp.Amount) || 0).toLocaleString('en-IN')}
                                </span>
                              </td>

                              {/* ইউজার */}
                              <td className="py-3 px-3.5 text-slate-500 text-xs whitespace-nowrap">
                                {exp.CreatedBy || 'Admin'}
                              </td>

                              {/* অ্যাকশন বাটনসমূহ */}
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1">
                                  {/* থার্মাল স্লিপ প্রিন্ট */}
                                  <button
                                    onClick={() => setViewingVoucher(exp)}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                    title="ভাউচার স্লিপ দেখুন ও প্রিন্ট করুন"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                                  </button>

                                  {/* এডিট বাটন */}
                                  <button
                                    onClick={() => handleStartEdit(exp)}
                                    className="w-7 h-7 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                                    title="ভাউচার সংশোধন করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* ডিলিট বাটন */}
                                  <button
                                    onClick={() => handleDelete(exp.ExpenseID)}
                                    className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                    title="ভাউচার মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* টেবিল সামারি ও পেজিনেশন বার */}
                  <div className="bg-slate-50 p-3 sm:px-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    
                    {/* ফিল্টারকৃত মোট যোগফল */}
                    <div className="flex items-center space-x-3 text-slate-600">
                      <span className="font-semibold">
                        প্রদর্শিত মোট ব্যয়: <strong className="text-rose-700 text-sm font-bold">{currencySymbol}{stats.filteredTotalSum.toLocaleString('en-IN')}</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>নগদ ক্যাশ: <strong className="text-emerald-700 font-semibold">{currencySymbol}{stats.filteredCashSum.toLocaleString('en-IN')}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>ভাউচার: <strong>{filteredExpenses.length}</strong> টি</span>
                    </div>

                    {/* পেজিনেশন কন্ট্রোল */}
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>পূর্ববর্তী</span>
                        </button>
                        <span className="text-slate-600 font-semibold px-1">
                          পেজ {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <span>পরবর্তী</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ট্যাব ২: নতুন খরচের ভাউচার এন্ট্রি ও এডিট ফর্ম */}
          {activeTab === 'add' && (
            <div className="max-w-3xl mx-auto bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
              
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {editingExpenseId ? `ভাউচার তথ্য সংশোধন করুন (#${editingExpenseId})` : 'নতুন ব্যয়ের ভাউচার তথ্য পূরণ করুন'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      দোকানের সঠিক ব্যয়ের হিসাব রাখতে নির্ভুলভাবে তথ্য ইনপুট দিন
                    </p>
                  </div>
                </div>

                {editingExpenseId && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    এডিট মোড
                  </span>
                )}
              </div>

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs sm:text-sm flex items-center space-x-2 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* ব্যয়ের খাত (Category) নির্বাচন */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    ব্যয়ের খাত (Category) নির্বাচন করুন *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const IconComp = CATEGORY_ICONS[cat.id] || FileText;
                      const isSelected = formData.category === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                          className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-rose-600 bg-rose-50/80 text-rose-900 ring-2 ring-rose-500/20 font-bold shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs truncate">{cat.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* তারিখ ও পরিমাণ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      তারিখ (Date) *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      খরচের পরিমাণ (Amount in {currencySymbol}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder="যেমন: 500"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 text-sm font-bold text-rose-700 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                    {/* কুইক অ্যামাউন্ট বাটন */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[100, 200, 500, 1000, 2000, 5000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, amount: String((Number(prev.amount) || 0) + val) }))}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
                        >
                          +{val}
                        </button>
                      ))}
                      {formData.amount && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, amount: '' }))}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold cursor-pointer transition-colors"
                        >
                          মুছুন
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* পেমেন্ট মেথড */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    টাকা পরিশোধের মাধ্যম (Payment Method) *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {['Cash', 'bKash', 'Nagad', 'Bank', 'Card'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: m }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                          formData.paymentMethod === m
                            ? 'border-rose-600 bg-rose-600 text-white font-bold shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* ক্যাশ খরচ সতর্কবার্তা */}
                  {formData.paymentMethod === 'Cash' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center space-x-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        এই খরচটি <strong>দৈনিক ক্যাশ ড্রয়ারের</strong> ব্যালেন্স থেকে কর্তন হবে এবং EOD ক্লোজিংয়ে ক্যাশ আউট হিসাবে দেখাবে।
                      </span>
                    </div>
                  )}
                </div>

                {/* প্রাপক ও বিস্তারিত বিবরণ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      প্রাপক বা সুবিধাভোগী (Payee / Vendor) - ঐচ্ছিক
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: রহিম (স্টাফ), ডেসকো, আলমগীর স্টোর..."
                      value={formData.payee}
                      onChange={(e) => setFormData(prev => ({ ...prev, payee: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      রসিদ বা মেমোর ছবি (Receipt Photo) - ঐচ্ছিক
                    </label>
                    <div className="flex items-center space-x-2">
                      <label className="flex-1 px-3 py-2 text-xs rounded-xl border border-dashed border-slate-300 hover:border-rose-400 bg-slate-50 text-slate-600 hover:text-rose-700 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formData.receiptImage ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন (Max 2MB)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptImageUpload}
                          className="hidden"
                        />
                      </label>
                      {formData.receiptImage && (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setPreviewImage(formData.receiptImage)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="ছবি প্রিভিউ করুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, receiptImage: '' }))}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="ছবি মুছুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* বিস্তারিত বিবরণ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    খরচের বিস্তারিত বিবরণ বা ভাউচার নোট (Description)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="যেমন: দোকানের জন্য নাস্তা ও চা বাবদ খরচ, অথবা মে মাসের দোকান ভাড়া..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  />
                </div>

                {/* সাবমিট বাটনসমূহ */}
                <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>সংরক্ষণ হচ্ছে...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingExpenseId ? 'আপডেট সম্পন্ন করুন' : 'খরচ সংরক্ষণ করুন'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>

        {/* =========================================================================
            ৫. মোডাল ফুটার
            ========================================================================= */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <p className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>খরচের খাতার এন্ট্রি স্বয়ংক্রিয়ভাবে অ্যানালিটিক্স ড্যাশবোর্ডে নিট প্রফিট ও ক্যাশ ক্লোজিংয়ের সাথে সমন্বিত হয়।</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer shadow-2xs"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* =========================================================================
          ৬. ৮০মিমি থার্মাল ভাউচার স্লিপ প্রিভিউ মডাল (#printable-expense-voucher)
          ========================================================================= */}
      {viewingVoucher && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-sm">ব্যয় ভাউচার রসিদ প্রিভিউ</span>
              </div>
              <button
                onClick={() => setViewingVoucher(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* স্লিপ বডি */}
            <div className="p-4 overflow-y-auto bg-slate-50">
              <div
                id="printable-expense-voucher"
                className="bg-white p-4 rounded-xl border border-dashed border-slate-300 font-mono text-slate-800 text-xs shadow-xs"
              >
                {/* স্টোর হেডার */}
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h3 className="font-bold text-sm uppercase text-slate-900">{storeName}</h3>
                  {storeAddress && <p className="text-[10px] text-slate-600 mt-0.5">{storeAddress}</p>}
                  {storePhone && <p className="text-[10px] text-slate-600">ফোন: {storePhone}</p>}
                  <div className="inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] uppercase tracking-wider text-slate-800">
                    ব্যয় ভাউচার (EXPENSE VOUCHER)
                  </div>
                </div>

                {/* ভাউচার মেটা */}
                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ভাউচার নং:</span>
                    <span className="font-bold text-slate-800">{viewingVoucher.ExpenseID || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">তারিখ:</span>
                    <span>{viewingVoucher.Date || viewingVoucher.date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ব্যয়ের খাত:</span>
                    <span className="font-bold">
                      {EXPENSE_CATEGORIES.find(c => c.id === viewingVoucher.Category)?.name.split(' ')[0] || viewingVoucher.Category || 'Other'}
                    </span>
                  </div>
                  {viewingVoucher.Payee && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">প্রাপক / সুবিধাভোগী:</span>
                      <span className="font-bold text-slate-800">{viewingVoucher.Payee}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                    <span className="font-bold">{viewingVoucher.PaymentMethod || 'Cash'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">এন্ট্রি করেছেন:</span>
                    <span>{viewingVoucher.CreatedBy || 'Admin'}</span>
                  </div>
                </div>

                {/* বিবরণ */}
                {viewingVoucher.Description && (
                  <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px]">
                    <span className="text-slate-500 block mb-0.5">খরচের বিবরণ:</span>
                    <p className="text-slate-800 font-sans leading-relaxed">{viewingVoucher.Description}</p>
                  </div>
                )}

                {/* মোট টাকার পরিমাণ */}
                <div className="py-3 border-b border-dashed border-slate-300 text-center">
                  <span className="text-xs text-slate-500 block">মোট পরিশোধিত টাকা</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {currencySymbol}{(Number(viewingVoucher.Amount) || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* সিগনেচার ব্লক */}
                <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-600">
                  <div>
                    <div className="border-t border-slate-400 pt-1">হিসাবরক্ষক / কর্তৃপক্ষ</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1">প্রাপকের স্বাক্ষর</div>
                  </div>
                </div>

              </div>
            </div>

            {/* প্রিন্ট ও বন্ধ অ্যাকশন */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setViewingVoucher(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={handlePrintThermal}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট স্লিপ</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          ৭. রসিদের ছবি প্রিভিউ মডাল
          ========================================================================= */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm">সংযুক্ত রসিদ / মেমোর কপি</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto flex items-center justify-center bg-slate-100">
              <img
                src={previewImage}
                alt="Receipt Voucher"
                className="max-w-full max-h-[70vh] rounded-lg shadow-xs object-contain"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
