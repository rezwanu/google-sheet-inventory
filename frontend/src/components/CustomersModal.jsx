import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  CreditCard,
  X,
  CheckCircle,
  Clock,
  Filter,
  DollarSign,
  RefreshCw,
  Trash2,
  Crown,
  Building2,
  Sparkles,
  TrendingUp,
  ArrowUpDown,
  Copy,
  Check,
  Calendar,
  Eye,
  LayoutGrid,
  List,
  AlertCircle,
  Landmark,
  User,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  MessageCircle,
  Award
} from 'lucide-react';
import { classifyCustomerSegment } from '../services/storage';

export default function CustomersModal({
  isOpen,
  onClose,
  embedded = false,
  customers = [],
  currencySymbol = '৳',
  settings = {},
  onAddCustomer,
  onDeleteCustomer,
  onRefreshCustomers,
  onOpenCustomerLedgerModal,
  showToast
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [rfmFilter, setRfmFilter] = useState('ALL'); // 'ALL' | 'VIP' | 'Regular' | 'At-Risk' | 'New'
  const [sortBy, setSortBy] = useState('spent-desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState(null);

  // নতুন গ্রাহক ফর্ম স্টেট
  const [newCustomer, setNewCustomer] = useState({
    CustomerName: '',
    Phone: '',
    Email: '',
    Address: '',
    CustomerType: 'Regular',
  });

  // এক্সিকিউটিভ CRM পরিসংখ্যান হিসাব
  const stats = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const totalCount = list.length;
    const vipCount = list.filter((c) => c?.CustomerType === 'VIP' || classifyCustomerSegment(c) === 'VIP').length;
    const wholesaleCount = list.filter((c) => c?.CustomerType === 'Wholesale').length;
    const corporateCount = list.filter((c) => c?.CustomerType === 'Corporate').length;
    const regularCount = list.filter((c) => classifyCustomerSegment(c) === 'Regular').length;
    const atRiskCount = list.filter((c) => classifyCustomerSegment(c) === 'At-Risk').length;
    const newCount = list.filter((c) => classifyCustomerSegment(c) === 'New').length;
    const totalRevenue = list.reduce((sum, c) => sum + (Number(c?.TotalSpent) || 0), 0);
    const totalOrders = list.reduce((sum, c) => sum + (Number(c?.TotalOrders) || 0), 0);
    const totalLoyaltyPoints = list.reduce((sum, c) => sum + (Number(c?.LoyaltyPoints) || 0), 0);
    const avgSpent = totalCount > 0 ? totalRevenue / totalCount : 0;
    const totalDue = list.reduce((sum, c) => sum + (Number(c?.CurrentDue) || 0), 0);
    const dueCount = list.filter((c) => (Number(c?.CurrentDue) || 0) > 0).length;

    return {
      totalCount,
      vipCount,
      wholesaleCount,
      corporateCount,
      regularCount,
      atRiskCount,
      newCount,
      totalLoyaltyPoints,
      totalRevenue,
      totalOrders,
      avgSpent,
      totalDue,
      dueCount,
    };
  }, [customers]);

  // ফিল্টার ও সাজানো (Filter & Sorting)
  const filteredCustomers = useMemo(() => {
    let list = Array.isArray(customers) ? customers : [];

    // ক্যাটাগরি ফিল্টার
    if (filterType !== 'ALL') {
      list = list.filter((c) => c.CustomerType === filterType);
    }

    // RFM সেগমেন্ট ফিল্টার
    if (rfmFilter !== 'ALL') {
      list = list.filter((c) => classifyCustomerSegment(c) === rfmFilter);
    }

    // সার্চ কিউরি ফিল্টার
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.CustomerName && String(c.CustomerName).toLowerCase().includes(q)) ||
          (c.Phone && String(c.Phone).includes(q)) ||
          (c.Email && String(c.Email).toLowerCase().includes(q)) ||
          (c.Address && String(c.Address).toLowerCase().includes(q)) ||
          (c.CustomerID && String(c.CustomerID).toLowerCase().includes(q))
      );
    }

    // সর্টিং লজিক
    const sorted = [...list];
    if (sortBy === 'spent-desc') {
      sorted.sort((a, b) => (Number(b.TotalSpent) || 0) - (Number(a.TotalSpent) || 0));
    } else if (sortBy === 'orders-desc') {
      sorted.sort((a, b) => (Number(b.TotalOrders) || 0) - (Number(a.TotalOrders) || 0));
    } else if (sortBy === 'points-desc') {
      sorted.sort((a, b) => (Number(b.LoyaltyPoints) || 0) - (Number(a.LoyaltyPoints) || 0));
    } else if (sortBy === 'name-asc') {
      sorted.sort((a, b) => String(a.CustomerName || '').localeCompare(String(b.CustomerName || '')));
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0));
    }

    return sorted;
  }, [customers, searchQuery, filterType, rfmFilter, sortBy]);

  // টার্গেটেড WhatsApp অফার হ্যান্ডলার
  const handleTargetedOffer = (cust) => {
    const rawPhone = String(cust.Phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      if (showToast) showToast('গ্রাহকের মোবাইল নম্বর পাওয়া যায়নি।', 'error');
      return;
    }
    let phone = rawPhone;
    if (phone.startsWith('01')) phone = '88' + phone;
    else if (!phone.startsWith('880')) phone = '880' + phone;

    const rfm = classifyCustomerSegment(cust);
    const storeName = settings?.StoreName || settings?.storeName || 'আমাদের স্টোর';
    const points = Number(cust.LoyaltyPoints || 0);

    let message = '';
    if (rfm === 'At-Risk') {
      message = `আসসালামু আলাইকুম ${cust.CustomerName || 'সম্মানিত গ্রাহক'},\n${storeName} থেকে অনেকদিন আপনাকে কাছে পাইনি! আপনার জন্য আমাদের নতুন কালেকশনে রয়েছে বিশেষ ছাড়। আপনার জমানো লয়ালটি ব্যালেন্স: ${points} পয়েন্ট। কেনাকাটা করতে আজই ভিজিট করুন!`;
    } else if (rfm === 'VIP') {
      message = `আসসালামু আলাইকুম প্রিয় VIP গ্রাহক ${cust.CustomerName || ''},\n${storeName}-এর সাথে থাকার জন্য আন্তরিক ধন্যবাদ! আপনার জমাকৃত ${points} লয়ালটি পয়েন্ট দিয়ে পরবর্তী অর্ডারে বিশেষ ডিসকাউন্ট উপভোগ করুন।`;
    } else {
      message = `আসসালামু আলাইকুম ${cust.CustomerName || 'গ্রাহক'},\n${storeName}-এ আপনার বর্তমান রিওয়ার্ড ব্যালেন্স: ${points} পয়েন্ট। যে কোনো কেনাকাটায় এই পয়েন্ট ব্যবহার করতে পারেন। ধন্যবাদ!`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // RFM সেগমেন্ট ব্যাজ কনফিগ
  const getRfmBadge = (cust) => {
    const segment = classifyCustomerSegment(cust);
    switch (segment) {
      case 'VIP':
        return {
          label: '👑 VIP চ্যাম্পিয়ন',
          class: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'At-Risk':
        return {
          label: '⚠️ ঝুঁকিপূর্ণ (>৪৫ দিন)',
          class: 'bg-rose-100 text-rose-800 border-rose-300'
        };
      case 'New':
        return {
          label: '🟢 নতুন গ্রাহক',
          class: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'Regular':
      default:
        return {
          label: '🌟 নিয়মিত ক্রেতা',
          class: 'bg-blue-100 text-blue-800 border-blue-300'
        };
    }
  };

  // কারেন্সি ফরম্যাট হেল্পার
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // ফোন নম্বর কপি করার হ্যান্ডলার
  const handleCopyPhone = (id, phone) => {
    if (!phone) return;
    try {
      navigator.clipboard?.writeText?.(phone);
      setCopiedPhoneId(id);
      setTimeout(() => setCopiedPhoneId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // নতুন গ্রাহক সাবমিট হ্যান্ডলার
  const handleSubmitNewCustomer = (e) => {
    e.preventDefault();
    if (!newCustomer.CustomerName.trim()) {
      alert('অনুগ্রহ করে গ্রাহকের নাম লিখুন!');
      return;
    }

    const newCustomerId = `CUST-${Date.now().toString().slice(-6)}`;
    onAddCustomer({
      ...newCustomer,
      CustomerID: newCustomerId,
      TotalOrders: 0,
      TotalSpent: 0,
      Status: 'Active',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    });

    setIsAddingNew(false);
    setNewCustomer({
      CustomerName: '',
      Phone: '',
      Email: '',
      Address: '',
      CustomerType: 'Regular',
    });
  };

  // গ্রাহকের ক্যাটাগরি কনফিগ (রঙ, আইকন ও লেবেল)
  const getCategoryConfig = (type) => {
    switch (type) {
      case 'VIP':
        return {
          label: 'VIP সদস্য',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-xs',
          avatarGrad: 'from-amber-500 to-yellow-600',
          icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'Wholesale':
        return {
          label: 'পাইকারি ক্রেতা',
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80 shadow-xs',
          avatarGrad: 'from-sky-500 to-blue-600',
          icon: <Building2 className="w-3.5 h-3.5 text-sky-600" />,
        };
      case 'Corporate':
        return {
          label: 'কর্পোরেট',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-xs',
          avatarGrad: 'from-purple-500 to-indigo-600',
          icon: <Landmark className="w-3.5 h-3.5 text-purple-600" />,
        };
      case 'Regular':
      default:
        return {
          label: 'সাধারণ গ্রাহক',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs',
          avatarGrad: 'from-emerald-500 to-teal-600',
          icon: <User className="w-3.5 h-3.5 text-emerald-600" />,
        };
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"}>
      <div className={embedded ? "bg-white rounded-2xl w-full shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)] relative" : "bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 relative"}>
        
        {/* ================= হেডার সেকশন ================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  গ্রাহক ডাটাবেস ব্যবস্থাপনা
                </h2>
                <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  CRM সিস্টেম
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                সকল নিবন্ধিত গ্রাহক, তাদের ক্রয়ের ইতিহাস, মোট খরচ ও ক্যাটাগরি পর্যবেক্ষণ করুন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ক্লাউড রিফ্রেশ বাটন */}
            {onRefreshCustomers && (
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await onRefreshCustomers();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                title="গুগল শিট থেকে সর্বশেষ গ্রাহক ডাটা রিফ্রেশ করুন"
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs border border-slate-200 active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">রিফ্রেশ</span>
              </button>
            )}

            {/* নতুন গ্রাহক টগল বাটন */}
            <button
              type="button"
              onClick={() => setIsAddingNew((prev) => !prev)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer ${
                isAddingNew
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-500/20'
              }`}
            >
              {isAddingNew ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>ফর্ম বন্ধ করুন</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>নতুন গ্রাহক যোগ</span>
                </>
              )}
            </button>

            {/* মডাল ক্লোজ বা ক্যাটালগ ব্যাক বাটন */}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 border border-slate-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-bold">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ================= টপ এক্সিকিউটিভ CRM স্ট্রিপ (৫টি মেট্রিক কার্ড) ================= */}
        <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* ১. মোট গ্রাহক */}
            <div
              onClick={() => setFilterType('ALL')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                filterType === 'ALL'
                  ? 'bg-white border-indigo-300 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">মোট গ্রাহক</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-black text-slate-900">{stats.totalCount}</span>
                  <span className="text-[10px] text-slate-400 font-bold">জন</span>
                </div>
              </div>
            </div>

            {/* ২. ভিআইপি গ্রাহক */}
            <div
              onClick={() => setFilterType('VIP')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                filterType === 'VIP'
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-md'
                  : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-amber-200 shadow-xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">ভিআইপি গ্রাহক</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-black text-amber-700">{stats.vipCount}</span>
                  <span className="text-[10px] text-amber-600 font-bold">জন</span>
                </div>
              </div>
            </div>

            {/* ৩. পাইকারি ক্রেতা */}
            <div
              onClick={() => setFilterType('Wholesale')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                filterType === 'Wholesale'
                  ? 'bg-sky-50/60 border-sky-300 ring-2 ring-sky-500/20 shadow-md'
                  : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-sky-200 shadow-xs'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-500 block truncate">পাইকারি ক্রেতা</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-black text-sky-700">{stats.wholesaleCount}</span>
                  <span className="text-[10px] text-sky-600 font-bold">জন</span>
                </div>
              </div>
            </div>

            {/* ৪. মোট গ্রাহক ব্যয় ও রাজস্ব */}
            <div className="p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-emerald-800 block truncate">সর্বমোট গ্রাহক ক্রয়</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-sm sm:text-base font-black text-emerald-700 truncate">
                    {formatCurrency(stats.totalRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* ৫. সার্বিক গ্রাহক বকেয়া */}
            <div
              onClick={() => onOpenCustomerLedgerModal && onOpenCustomerLedgerModal()}
              title="কাস্টমারদের কাছে মোট পাওনা বকেয়া - বাকির খাতা দেখতে ক্লিক করুন"
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                stats.totalDue > 0
                  ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-xs'
                  : 'bg-white/80 border-slate-200/80 hover:bg-white shadow-xs'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                stats.totalDue > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
              }`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-amber-800 block truncate">মোট বকেয়া পাওনা</span>
                <div className="flex items-baseline space-x-1">
                  <span className={`text-sm sm:text-base font-black truncate ${stats.totalDue > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                    {formatCurrency(stats.totalDue)}
                  </span>
                  {stats.dueCount > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold shrink-0">({stats.dueCount} জন)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= নতুন গ্রাহক অ্যাড করার ইন্টারঅ্যাক্টিভ প্যানেল ================= */}
        {isAddingNew && (
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 border-b border-indigo-100 shrink-0 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    নতুন গ্রাহক নিবন্ধন ফরম (New Customer Registration)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded-md hover:bg-slate-200/60"
                >
                  বাতিল করুন ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* বাম পাশের ইনপুট ফরম */}
                <form onSubmit={handleSubmitNewCustomer} className="lg:col-span-2 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* নাম */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        গ্রাহকের পূর্ণ নাম <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="গ্রাহকের নাম লিখুন..."
                          value={newCustomer.CustomerName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, CustomerName: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* মোবাইল নম্বর */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        মোবাইল নম্বর <span className="text-slate-400 font-normal">(ঐচ্ছিক কিন্তু বাঞ্ছনীয়)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={newCustomer.Phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, Phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* ইমেইল */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ইমেইল ঠিকানা <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="email"
                          placeholder="customer@example.com"
                          value={newCustomer.Email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, Email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* ঠিকানা */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ঠিকানা / এলাকা <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="বাসা নং, রোড, থানা, জেলা..."
                          value={newCustomer.Address}
                          onChange={(e) => setNewCustomer({ ...newCustomer, Address: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ক্যাটাগরি পিলস / সিলেক্টর */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      গ্রাহকের ধরণ / প্রিভিলেজ ক্যাটাগরি
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'Regular', label: 'সাধারণ', icon: <User className="w-3.5 h-3.5" />, color: 'emerald' },
                        { id: 'VIP', label: 'ভিআইপি ⭐', icon: <Crown className="w-3.5 h-3.5" />, color: 'amber' },
                        { id: 'Wholesale', label: 'পাইকারি 🏢', icon: <Building2 className="w-3.5 h-3.5" />, color: 'sky' },
                        { id: 'Corporate', label: 'কর্পোরেট 🏛️', icon: <Landmark className="w-3.5 h-3.5" />, color: 'purple' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewCustomer({ ...newCustomer, CustomerType: item.id })}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border cursor-pointer ${
                            newCustomer.CustomerType === item.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* বাটন গ্রুপ */}
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>গ্রাহক সংরক্ষণ করুন</span>
                    </button>
                  </div>
                </form>

                {/* ডান পাশের লাইভ প্রিভিউ কার্ড */}
                <div className="bg-white rounded-2xl border border-indigo-200/90 p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> লাইভ কার্ড প্রিভিউ
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        CUST-PREVIEW
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${getCategoryConfig(newCustomer.CustomerType).avatarGrad} text-white flex items-center justify-center font-black text-base shadow-sm shrink-0`}>
                        {newCustomer.CustomerName.trim()
                          ? newCustomer.CustomerName.trim().charAt(0).toUpperCase()
                          : 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-sm font-black text-slate-900 truncate">
                          {newCustomer.CustomerName.trim() || 'গ্রাহকের নাম...'}
                        </h5>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryConfig(newCustomer.CustomerType).badgeClass}`}>
                            {getCategoryConfig(newCustomer.CustomerType).label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{newCustomer.Phone.trim() || 'ফোন নম্বর লিখুন'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{newCustomer.Email.trim() || 'ইমেইল লিখুন'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{newCustomer.Address.trim() || 'ঠিকানা লিখুন'}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 text-center">
                    সংরক্ষণ করলে স্বয়ংক্রিয়ভাবে ক্লাউড ডাটাবেসে সিঙ্ক হবে
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= সার্চ, ক্যাটাগরি ফিল্টার ও সর্টিং বার ================= */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
          {/* সার্চ বক্স */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="গ্রাহকের নাম, মোবাইল নম্বর, ইমেইল বা আইডি দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {/* ক্যাটাগরি ফিল্টার পিলস */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {[
                { id: 'ALL', label: 'সকল', count: stats.totalCount },
                { id: 'Regular', label: 'সাধারণ', count: stats.regularCount },
                { id: 'VIP', label: 'VIP ⭐', count: stats.vipCount },
                { id: 'Wholesale', label: 'পাইকারি', count: stats.wholesaleCount },
                { id: 'Corporate', label: 'কর্পোরেট', count: stats.corporateCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterType === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* সর্টিং ড্রপডাউন */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white border border-slate-200 font-bold text-slate-700 py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                <option value="spent-desc">সর্বোচ্চ ব্যয় (Top Spender)</option>
                <option value="orders-desc">সর্বোচ্চ অর্ডার (Most Orders)</option>
                <option value="name-asc">নাম অনুযায়ী (A-Z)</option>
                <option value="newest">সর্বশেষ নিবন্ধিত (Newest)</option>
              </select>
            </div>

            {/* ভিউ মোড টগল (গ্রিড / লিস্ট) */}
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="গ্রিড কার্ড ভিউ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="কমপ্যাক্ট টেবিল ভিউ"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= RFM সেগমেন্টেশন কুইক ফিল্টার স্ট্রিপ ================= */}
        <div className="px-4 py-2 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-purple-50/30 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-0.5">
            <span className="font-bold text-slate-500 text-[11px] flex items-center gap-1 shrink-0 mr-1">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              CRM সেগমেন্ট:
            </span>
            {[
              { id: 'ALL', label: 'সকল গ্রাহক', count: stats.totalCount },
              { id: 'VIP', label: '👑 VIP চ্যাম্পিয়ন', count: stats.vipCount },
              { id: 'Regular', label: '🌟 নিয়মিত', count: stats.regularCount },
              { id: 'At-Risk', label: '⚠️ ঝুঁকিপূর্ণ (>৪৫ দিন)', count: stats.atRiskCount },
              { id: 'New', label: '🟢 নতুন', count: stats.newCount },
            ].map((seg) => (
              <button
                key={seg.id}
                onClick={() => setRfmFilter(seg.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                  rfmFilter === seg.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{seg.label}</span>
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  rfmFilter === seg.id ? 'bg-white/20 text-white font-mono' : 'bg-slate-100 text-slate-600 font-mono'
                }`}>
                  {seg.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] font-bold text-purple-700 bg-white border border-purple-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 shadow-2xs">
            <span>🪙 মোট অর্জিত লয়ালটি:</span>
            <span className="font-mono text-purple-900 font-black">{stats.totalLoyaltyPoints.toLocaleString()}</span>
            <span className="text-slate-400 font-normal">পয়েন্ট</span>
          </div>
        </div>

        {/* ================= গ্রাহক তালিকা বডি (গ্রিড / টেবিল) ================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 bg-slate-50/50">
          {filteredCustomers.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Users className="w-8 h-8 stroke-1.5" />
              </div>
              <h4 className="text-sm font-black text-slate-800 mb-1">
                কোনো গ্রাহক খুঁজে পাওয়া যায়নি
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {searchQuery
                  ? `'${searchQuery}' অনুসন্ধানের সাথে মিল রেখে কোনো গ্রাহক মেলেনি। ফিল্টার বা কীওয়ার্ড পরিবর্তন করে দেখুন।`
                  : 'এখনও কোনো গ্রাহক ডাটাবেসে নিবন্ধিত হয়নি। উপরে "নতুন গ্রাহক যোগ" বাটনে ক্লিক করে গ্রাহক যোগ করুন।'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                >
                  সার্চ রিসেট করুন
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= ভিউ ১: প্রিমিয়াম কার্ড গ্রিড ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCustomers.map((cust) => {
                const conf = getCategoryConfig(cust.CustomerType);
                const ordersCount = Number(cust.TotalOrders || 0);
                const spentAmount = Number(cust.TotalSpent || 0);
                const aov = ordersCount > 0 ? spentAmount / ordersCount : 0;
                const isCopied = copiedPhoneId === (cust.CustomerID || cust.Phone);

                return (
                  <div
                    key={cust.CustomerID || cust.Phone}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* টপ সেকশন: প্রোফাইল ও ক্যাটাগরি */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* অ্যাভাটার */}
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${conf.avatarGrad} text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0`}>
                            {cust.CustomerName ? cust.CustomerName.charAt(0).toUpperCase() : 'C'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900 truncate">
                                {cust.CustomerName || 'নামহীন গ্রাহক'}
                              </h4>
                              {(() => {
                                const rfm = getRfmBadge(cust);
                                return (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rfm.class}`}>
                                    {rfm.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 mt-0.5">
                              <span>{cust.CustomerID || 'CUST-ID'}</span>
                              {cust.Status && (
                                <span className="inline-flex items-center text-emerald-600 font-sans font-bold">
                                  ● সক্রিয়
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ক্যাটাগরি ব্যাজ */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center space-x-1 shrink-0 ${conf.badgeClass}`}>
                          {conf.icon}
                          <span>{conf.label}</span>
                        </span>
                      </div>

                      {/* যোগাযোগ তথ্য লিস্ট */}
                      <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs text-slate-600">
                        {cust.Phone && (
                          <div className="flex items-center justify-between">
                            <a
                              href={`tel:${cust.Phone}`}
                              className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 font-semibold group/link"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-indigo-600 shrink-0" />
                              <span>{cust.Phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(cust.CustomerID || cust.Phone, cust.Phone)}
                              title="ফোন নম্বর কপি করুন"
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">কপি হয়েছে!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>কপি</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {cust.Email && (
                          <div className="flex items-center space-x-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`mailto:${cust.Email}`}
                              className="text-slate-600 hover:text-indigo-600 truncate font-medium"
                            >
                              {cust.Email}
                            </a>
                          </div>
                        )}

                        {cust.Address && (
                          <div className="flex items-center space-x-2 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.Address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                      {/* নিচের আর্থিক মেট্রিক্স রিবন ও অ্যাকশন */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                            মোট অর্ডার
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {ordersCount} টি
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                            সর্বমোট ব্যয়
                          </span>
                          <span className="text-xs font-black text-emerald-600">
                            {formatCurrency(spentAmount)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-purple-200" />
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-purple-700 block">
                            লয়ালটি
                          </span>
                          <span className="text-xs font-black text-purple-700 font-mono">
                            🪙 {Number(cust.LoyaltyPoints || 0).toLocaleString()}
                          </span>
                        </div>
                        {Number(cust.CurrentDue || 0) > 0 && (
                          <>
                            <div className="h-6 w-px bg-amber-200" />
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 block">
                                বকেয়া পাওনা
                              </span>
                              <span className="text-xs font-black text-amber-600">
                                {formatCurrency(cust.CurrentDue)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* অ্যাকশন বাটনস */}
                      <div className="flex items-center space-x-1.5">
                        {/* টার্গেটেড WhatsApp অফার বাটন */}
                        <button
                          type="button"
                          onClick={() => handleTargetedOffer(cust)}
                          title="টার্গেটেড WhatsApp অফার বা রিওয়ার্ড মেসেজ পাঠান"
                          className="p-2 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200 cursor-pointer shadow-2xs"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {onOpenCustomerLedgerModal && (
                          <button
                            type="button"
                            onClick={() => onOpenCustomerLedgerModal(cust)}
                            title="বাকির খাতা ও লেজার খুলুন"
                            className="p-2 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all border border-amber-200 cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForView(cust)}
                          title="বিস্তারিত CRM প্রোফাইল দেখুন"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 hover:border-indigo-200 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onDeleteCustomer && (
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            title="গ্রাহক মুছে ফেলুন"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= ভিউ ২: কমপ্যাক্ট টেবিল ভিউ ================= */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">গ্রাহকের নাম ও আইডি</th>
                      <th className="py-3 px-3">CRM সেগমেন্ট</th>
                      <th className="py-3 px-3">ক্যাটাগরি</th>
                      <th className="py-3 px-3">যোগাযোগ</th>
                      <th className="py-3 px-3 text-right">মোট অর্ডার</th>
                      <th className="py-3 px-3 text-right">সর্বমোট ব্যয়</th>
                      <th className="py-3 px-3 text-right">লয়ালটি</th>
                      <th className="py-3 px-3 text-right">বকেয়া পাওনা</th>
                      <th className="py-3 px-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((cust) => {
                      const conf = getCategoryConfig(cust.CustomerType);
                      const rfm = getRfmBadge(cust);
                      return (
                        <tr
                          key={cust.CustomerID || cust.Phone}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${conf.avatarGrad} text-white flex items-center justify-center font-black text-xs shrink-0`}>
                                {cust.CustomerName ? cust.CustomerName.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">
                                  {cust.CustomerName || 'নামহীন'}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {cust.CustomerID || 'CUST-ID'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${rfm.class}`}>
                              {rfm.label}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1 ${conf.badgeClass}`}>
                              {conf.icon}
                              <span>{conf.label}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              {cust.Phone && (
                                <div className="text-slate-800 font-semibold">{cust.Phone}</div>
                              )}
                              {cust.Email && (
                                <div className="text-slate-400 text-[11px] truncate max-w-xs">{cust.Email}</div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-black text-slate-800">
                            {cust.TotalOrders || 0} টি
                          </td>

                          <td className="py-3 px-3 text-right font-black text-emerald-600">
                            {formatCurrency(cust.TotalSpent)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                            🪙 {Number(cust.LoyaltyPoints || 0).toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {Number(cust.CurrentDue || 0) > 0 ? (
                              <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                                {formatCurrency(cust.CurrentDue)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">০.০০</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* টার্গেটেড WhatsApp অফার বাটন */}
                              <button
                                type="button"
                                onClick={() => handleTargetedOffer(cust)}
                                title="টার্গেটেড WhatsApp অফার বা রিওয়ার্ড মেসেজ পাঠান"
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {onOpenCustomerLedgerModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCustomerLedgerModal(cust)}
                                  title="বাকির খাতা ও লেজার খুলুন"
                                  className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <BookOpen className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedCustomerForView(cust)}
                                title="প্রোফাইল দেখুন"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {onDeleteCustomer && (
                                <button
                                  type="button"
                                  onClick={() => setCustomerToDelete(cust)}
                                  title="মুছে ফেলুন"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

        {/* ================= ফুটার সেকশন ================= */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex justify-between items-center px-5 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-500">প্রদর্শিত গ্রাহক:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 font-black text-slate-800">
              {filteredCustomers.length} / {customers.length} জন
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            বন্ধ করুন
          </button>
        </div>

        {/* ================= ডিলিট নিশ্চিতকরণ পপআপ (Delete Confirmation Modal) ================= */}
        {customerToDelete && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">
                গ্রাহক মুছে ফেলার নিশ্চিতকরণ
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                আপনি কি নিশ্চিত যে <strong className="text-slate-800 font-bold">'{customerToDelete.CustomerName || customerToDelete.Phone}'</strong> কে ডাটাবেস থেকে মুছে ফেলতে চান?
              </p>
              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCustomer(customerToDelete);
                    setCustomerToDelete(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  হ্যাঁ, মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= গ্রাহক বিস্তারিত CRM প্রোফাইল মডাল (Customer Details Drawer) ================= */}
        {selectedCustomerForView && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative">
              <button
                type="button"
                onClick={() => setSelectedCustomerForView(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center pb-4 border-b border-slate-100">
                <div className={`w-16 h-16 rounded-3xl bg-gradient-to-tr ${getCategoryConfig(selectedCustomerForView.CustomerType).avatarGrad} text-white flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-md`}>
                  {selectedCustomerForView.CustomerName ? selectedCustomerForView.CustomerName.charAt(0).toUpperCase() : 'C'}
                </div>
                <h4 className="text-base font-black text-slate-900">
                  {selectedCustomerForView.CustomerName || 'নামহীন গ্রাহক'}
                </h4>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryConfig(selectedCustomerForView.CustomerType).badgeClass}`}>
                    {getCategoryConfig(selectedCustomerForView.CustomerType).label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedCustomerForView.CustomerID}
                  </span>
                </div>
              </div>

              {/* বিস্তারিত মেট্রিক্স */}
              <div className="grid grid-cols-2 gap-2.5 my-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">মোট অর্ডার</span>
                  <span className="text-sm font-black text-slate-800">
                    {selectedCustomerForView.TotalOrders || 0} টি
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">সর্বমোট ব্যয়</span>
                  <span className="text-sm font-black text-emerald-700">
                    {formatCurrency(selectedCustomerForView.TotalSpent)}
                  </span>
                </div>
              </div>

              {/* কন্টাক্ট লিঙ্কস */}
              <div className="space-y-2 text-xs text-slate-700 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 mb-4">
                {selectedCustomerForView.Phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5" /> ফোন:
                    </span>
                    <a
                      href={`tel:${selectedCustomerForView.Phone}`}
                      className="font-bold text-indigo-600 hover:underline"
                    >
                      {selectedCustomerForView.Phone}
                    </a>
                  </div>
                )}
                {selectedCustomerForView.Email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5" /> ইমেইল:
                    </span>
                    <a
                      href={`mailto:${selectedCustomerForView.Email}`}
                      className="font-bold text-indigo-600 hover:underline truncate max-w-[200px]"
                    >
                      {selectedCustomerForView.Email}
                    </a>
                  </div>
                )}
                {selectedCustomerForView.Address && (
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium shrink-0">
                      <MapPin className="w-3.5 h-3.5" /> ঠিকানা:
                    </span>
                    <span className="font-semibold text-slate-800 text-right ml-2">
                      {selectedCustomerForView.Address}
                    </span>
                  </div>
                )}
                {selectedCustomerForView.CreatedAt && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> নিবন্ধনের সময়:
                    </span>
                    <span>
                      {new Date(selectedCustomerForView.CreatedAt).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForView(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
