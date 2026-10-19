import React, { useState, useMemo } from 'react';
import {
  X,
  Receipt,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Building2,
  Zap,
  Users,
  Coffee,
  Truck,
  Package,
  Wrench,
  Megaphone,
  FileText,
  DollarSign,
  TrendingDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Download,
  Image as ImageIcon
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
  expenses = [],
  currencySymbol = '৳',
  activeUser = null,
  onSaveExpense,
  onDeleteExpense
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('month'); // 'today' | 'month' | 'all'

  // নতুন খরচের ফর্ম স্টেট
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Refreshments',
    amount: '',
    paymentMethod: 'Cash',
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
      // তারিখ ফিল্টার
      const itemDate = String(item.Date || item.date || '');
      if (dateRangeFilter === 'today' && itemDate !== today) {
        return false;
      }
      if (dateRangeFilter === 'month' && !itemDate.startsWith(currentYearMonth)) {
        return false;
      }

      // ক্যাটাগরি ফিল্টার
      if (selectedCategoryFilter !== 'all' && item.Category !== selectedCategoryFilter) {
        return false;
      }

      // পেমেন্ট মেথড ফিল্টার
      if (selectedMethodFilter !== 'all' && item.PaymentMethod !== selectedMethodFilter) {
        return false;
      }

      // সার্চ ফিল্টার
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const desc = String(item.Description || '').toLowerCase();
        const cat = String(item.Category || '').toLowerCase();
        const by = String(item.CreatedBy || '').toLowerCase();
        return desc.includes(query) || cat.includes(query) || by.includes(query);
      }

      return true;
    });
  }, [expenses, dateRangeFilter, selectedCategoryFilter, selectedMethodFilter, searchTerm]);

  // পরিসংখ্যান হিসাব
  const stats = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    const today = new Date().toISOString().split('T')[0];
    const currentYearMonth = today.slice(0, 7);

    let totalThisMonth = 0;
    let totalToday = 0;
    const catSums = {};

    list.forEach(item => {
      const amt = Number(item.Amount) || 0;
      const itemDate = String(item.Date || item.date || '');

      if (itemDate === today) {
        totalToday += amt;
      }
      if (itemDate.startsWith(currentYearMonth)) {
        totalThisMonth += amt;
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

    return {
      totalThisMonth,
      totalToday,
      totalVouchers: list.length,
      topCategory: topCat
    };
  }, [expenses]);

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
        Date: formData.date,
        Category: formData.category,
        Amount: numAmount,
        PaymentMethod: formData.paymentMethod,
        Description: formData.description.trim(),
        ReceiptImage: formData.receiptImage,
        CreatedBy: activeUser?.FullName || activeUser?.UserName || 'Admin'
      };

      if (typeof onSaveExpense === 'function') {
        await onSaveExpense(payload);
      }

      setStatusMessage({ type: 'success', text: `৳${numAmount.toLocaleString('en-IN')} খরচ সফলভাবে এন্ট্রি হয়েছে!` });
      // ফর্ম রিসেট
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Refreshments',
        amount: '',
        paymentMethod: 'Cash',
        description: '',
        receiptImage: ''
      });

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[100] animate-fadeIn"
      style={{ zIndex: 100 }}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100">
        
        {/* মোডাল হেডার */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-pink-800 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Receipt className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">দোকানের দৈনন্দিন খরচের খাতা</h2>
              <p className="text-xs text-rose-200">দোকান ভাড়া, বিল, স্টাফ বেতন ও অন্যান্য ব্যয় ব্যবস্থাপনা</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কেপিআই সামারি স্ট্রিপ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">চলতি মাসের খরচ</p>
            <p className="text-lg font-bold text-rose-700 mt-0.5">
              {currencySymbol}{stats.totalThisMonth.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">আজকের খরচ</p>
            <p className="text-lg font-bold text-amber-700 mt-0.5">
              {currencySymbol}{stats.totalToday.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">মোট ভাউচার সংখ্যা</p>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">
              {stats.totalVouchers} টি
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">সর্বোচ্চ ব্যয়ের খাত</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5 truncate" title={stats.topCategory}>
              {stats.topCategory}
            </p>
          </div>
        </div>

        {/* ট্যাব নেভিগেশন */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>খরচের তালিকা ({filteredExpenses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === 'add'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>নতুন খরচ যোগ করুন</span>
          </button>
        </div>

        {/* বডি কন্টেন্ট */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* ট্যাব ১: খরচের তালিকা ভিউ */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* ফিল্টার কন্ট্রোল বার */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5 items-center justify-between">
                
                {/* সার্চ বক্স */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="বিবরণ, ক্যাটাগরি বা ইউজার দিয়ে খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                {/* তারিখ ফিল্টার */}
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                >
                  <option value="month">চলতি মাস</option>
                  <option value="today">শুধুমাত্র আজকের</option>
                  <option value="all">সর্বমোট (সকল সময়)</option>
                </select>

                {/* ক্যাটাগরি ফিল্টার */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                >
                  <option value="all">সকল ক্যাটাগরি</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* পেমেন্ট মেথড ফিল্টার */}
                <select
                  value={selectedMethodFilter}
                  onChange={(e) => setSelectedMethodFilter(e.target.value)}
                  className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                >
                  <option value="all">সকল পেমেন্ট</option>
                  <option value="Cash">Cash (ক্যাশ)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                  <option value="Bank">Bank (ব্যাংক)</option>
                  <option value="Card">Card (কার্ড)</option>
                </select>
              </div>

              {/* খরচের টেবিল */}
              {filteredExpenses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">কোনো খরচের রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    আপনার দোকানের দৈনন্দিন খরচ নিখুঁতভাবে ট্র্যাক করতে উপরের "নতুন খরচ যোগ করুন" বাটনে ক্লিক করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>খরচ এন্ট্রি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-3 px-4">তারিখ</th>
                          <th className="py-3 px-4">ক্যাটাগরি</th>
                          <th className="py-3 px-4">বিবরণ</th>
                          <th className="py-3 px-4">পেমেন্ট মেথড</th>
                          <th className="py-3 px-4 text-right">পরিমাণ</th>
                          <th className="py-3 px-4">ইউজার</th>
                          <th className="py-3 px-4 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((exp) => {
                          const catObj = EXPENSE_CATEGORIES.find(c => c.id === exp.Category) || {
                            name: exp.Category || 'Other',
                            color: 'text-slate-600 bg-slate-50 border-slate-200'
                          };
                          const IconComp = CATEGORY_ICONS[exp.Category] || FileText;

                          return (
                            <tr key={exp.ExpenseID || Math.random()} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                                {exp.Date || 'N/A'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${catObj.color}`}>
                                  <IconComp className="w-3.5 h-3.5" />
                                  <span>{catObj.name.split(' ')[0]}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-800 max-w-xs truncate" title={exp.Description}>
                                {exp.Description || <span className="text-slate-400 italic">বিবরণ নেই</span>}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                                  <Wallet className="w-3 h-3 text-slate-500" />
                                  <span>{exp.PaymentMethod || 'Cash'}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-rose-700 whitespace-nowrap">
                                {currencySymbol}{(Number(exp.Amount) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                                {exp.CreatedBy || 'Admin'}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDelete(exp.ExpenseID)}
                                  className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                                  title="ভাউচার মুছুন"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ২: নতুন খরচের ভাউচার এন্ট্রি ফর্ম */}
          {activeTab === 'add' && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <span>নতুন ব্যয়ের ভাউচার তথ্য পূরণ করুন</span>
              </h3>

              {statusMessage && (
                <div className={`p-3 rounded-xl mb-4 text-xs sm:text-sm flex items-center space-x-2 ${
                  statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* ক্যাটাগরি গ্রিড সিলেকশন */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
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
                          className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-rose-600 bg-rose-50/80 text-rose-900 ring-2 ring-rose-500/20 font-bold shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <IconComp className={`w-4 h-4 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span className="text-xs truncate">{cat.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* তারিখ ও পরিমাণ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      খরচের পরিমাণ (Amount in {currencySymbol}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
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
                        className="w-full pl-8 pr-3 py-2 text-sm font-bold text-rose-700 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>
                    {/* কুইক অ্যামাউন্ট বাটন */}
                    <div className="flex gap-1.5 mt-1.5">
                      {[100, 200, 500, 1000, 2000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, amount: String((Number(prev.amount) || 0) + val) }))}
                          className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* পেমেন্ট মেথড */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                </div>

                {/* বিস্তারিত বিবরণ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    খরচের বিবরণ বা ভাউচার নোট (Description)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="যেমন: দোকানের জন্য নাস্তা ও চা বাবদ খরচ, অথবা মে মাসের দোকান ভাড়া..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  />
                </div>

                {/* সাবমিট বাটন */}
                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>সংরক্ষণ হচ্ছে...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>খরচ সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* মোডাল ফুটার */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <p>খরচের খাতার এন্ট্রি স্বয়ংক্রিয়ভাবে অ্যানালিটিক্স ড্যাশবোর্ডে নিট প্রফিট থেকে বাদ যাবে।</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
