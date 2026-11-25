import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  X,
  CheckCircle,
  Filter,
  RefreshCw,
  Trash2,
  Crown,
  Building2,
  Sparkles,
  TrendingUp,
  Copy,
  Check,
  Calendar,
  Eye,
  LayoutGrid,
  List,
  Landmark,
  User,
  BookOpen,
  MessageCircle,
  Award,
  AlertTriangle
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
          label: 'VIP চ্যাম্পিয়ন',
          class: 'bg-amber-50 text-[#B45309] border-amber-200/80'
        };
      case 'At-Risk':
        return {
          label: 'ঝুঁকিপূর্ণ (>৪৫ দিন)',
          class: 'bg-red-50 text-[#B91C1C] border-red-200/80'
        };
      case 'New':
        return {
          label: 'নতুন গ্রাহক',
          class: 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
        };
      case 'Regular':
      default:
        return {
          label: 'নিয়মিত ক্রেতা',
          class: 'bg-[#F5F5F5] text-[#0F172A] border-neutral-200/80'
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
          badgeClass: 'bg-amber-50 text-[#B45309] border-amber-200/80',
          avatarBg: 'bg-amber-50 text-[#B45309] border border-amber-200/80',
          icon: <Crown className="w-3.5 h-3.5 text-[#B45309]" />,
        };
      case 'Wholesale':
        return {
          label: 'পাইকারি ক্রেতা',
          badgeClass: 'bg-[#F5F5F5] text-[#0F172A] border-neutral-200/80',
          avatarBg: 'bg-[#0F172A] text-white',
          icon: <Building2 className="w-3.5 h-3.5 text-[#0F172A]" />,
        };
      case 'Corporate':
        return {
          label: 'কর্পোরেট',
          badgeClass: 'bg-slate-100 text-[#0F172A] border-slate-200/80',
          avatarBg: 'bg-slate-800 text-white',
          icon: <Landmark className="w-3.5 h-3.5 text-[#0F172A]" />,
        };
      case 'Regular':
      default:
        return {
          label: 'সাধারণ গ্রাহক',
          badgeClass: 'bg-emerald-50 text-[#15803D] border-emerald-200/80',
          avatarBg: 'bg-emerald-50 text-[#15803D] border border-emerald-200/80',
          icon: <User className="w-3.5 h-3.5 text-[#15803D]" />,
        };
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4"}>
      <div className={embedded ? "bg-white rounded-lg w-full border border-neutral-200/80 overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)] relative" : "bg-white rounded-lg max-w-5xl w-full border border-neutral-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 relative"}>
        
        {/* ================= হেডার সেকশন ================= */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-md bg-white border border-neutral-200/80 text-[#0F172A] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-[#111111] tracking-tight">
                  গ্রাহক ডাটাবেস ব্যবস্থাপনা
                </h2>
                <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                  CRM সিস্টেম
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
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
                className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs font-medium rounded-md transition-colors flex items-center space-x-1.5 border border-neutral-200/80 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0F172A]' : 'text-[#525252]'}`} />
                <span className="hidden sm:inline">রিফ্রেশ</span>
              </button>
            )}

            {/* নতুন গ্রাহক টগল বাটন */}
            <button
              type="button"
              onClick={() => setIsAddingNew((prev) => !prev)}
              className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer border ${
                isAddingNew
                  ? 'bg-red-50 text-[#B91C1C] hover:bg-red-100 border-red-200/80'
                  : 'bg-[#0F172A] hover:bg-slate-800 text-white border-[#0F172A]'
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
              className={`min-h-[44px] sm:min-h-[36px] rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium text-xs px-3 py-1.5 border border-neutral-200/80'
                  : 'min-w-[44px] sm:min-w-[36px] p-2 text-[#525252] hover:text-[#111111] hover:bg-neutral-200/60 justify-center'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-medium">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ================= টপ এক্সিকিউটিভ CRM স্ট্রিপ (৫টি মেট্রিক কার্ড) ================= */}
        <div className="p-3 sm:p-4 bg-[#F5F5F5] border-b border-neutral-200/80 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* ১. মোট গ্রাহক */}
            <div
              onClick={() => setFilterType('ALL')}
              className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center space-x-3 ${
                filterType === 'ALL'
                  ? 'bg-white border-[#0F172A] ring-1 ring-[#0F172A]'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
              }`}
            >
              <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-[#525252] block truncate">মোট গ্রাহক</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-semibold text-[#111111] font-mono tabular-nums">{stats.totalCount}</span>
                  <span className="text-[10px] text-[#737373] font-medium">জন</span>
                </div>
              </div>
            </div>

            {/* ২. ভিআইপি গ্রাহক */}
            <div
              onClick={() => setFilterType('VIP')}
              className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center space-x-3 ${
                filterType === 'VIP'
                  ? 'bg-amber-50 border-[#0F172A] ring-1 ring-[#0F172A]'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
              }`}
            >
              <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-200/80 text-[#B45309] flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-[#525252] block truncate">ভিআইপি গ্রাহক</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-semibold text-[#B45309] font-mono tabular-nums">{stats.vipCount}</span>
                  <span className="text-[10px] text-[#B45309] font-medium">জন</span>
                </div>
              </div>
            </div>

            {/* ৩. পাইকারি ক্রেতা */}
            <div
              onClick={() => setFilterType('Wholesale')}
              className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center space-x-3 ${
                filterType === 'Wholesale'
                  ? 'bg-[#FAFAFA] border-[#0F172A] ring-1 ring-[#0F172A]'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
              }`}
            >
              <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-[#525252] block truncate">পাইকারি ক্রেতা</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-semibold text-[#111111] font-mono tabular-nums">{stats.wholesaleCount}</span>
                  <span className="text-[10px] text-[#737373] font-medium">জন</span>
                </div>
              </div>
            </div>

            {/* ৪. মোট গ্রাহক ব্যয় ও রাজস্ব */}
            <div className="p-3 rounded-lg border border-neutral-200/80 bg-white flex items-center space-x-3">
              <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200/80 text-[#15803D] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-[#525252] block truncate">সর্বমোট গ্রাহক ক্রয়</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-sm sm:text-base font-semibold text-[#15803D] font-mono tabular-nums truncate">
                    {formatCurrency(stats.totalRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* ৫. সার্বিক গ্রাহক বকেয়া */}
            <div
              onClick={() => onOpenCustomerLedgerModal && onOpenCustomerLedgerModal()}
              title="কাস্টমারদের কাছে মোট পাওনা বকেয়া - বাকির খাতা দেখতে ক্লিক করুন"
              className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center space-x-3 ${
                stats.totalDue > 0
                  ? 'bg-amber-50 border-amber-200/80 hover:border-amber-300'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
              }`}
            >
              <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 border ${
                stats.totalDue > 0 ? 'bg-white border-amber-200/80 text-[#B45309]' : 'bg-[#F5F5F5] border-neutral-200/80 text-[#525252]'
              }`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-[#525252] block truncate">মোট বকেয়া পাওনা</span>
                <div className="flex items-baseline space-x-1">
                  <span className={`text-sm sm:text-base font-semibold font-mono tabular-nums truncate ${stats.totalDue > 0 ? 'text-[#B45309]' : 'text-[#111111]'}`}>
                    {formatCurrency(stats.totalDue)}
                  </span>
                  {stats.dueCount > 0 && (
                    <span className="text-[10px] text-[#B45309] font-medium font-mono tabular-nums shrink-0">({stats.dueCount} জন)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= নতুন গ্রাহক অ্যাড করার ইন্টারঅ্যাক্টিভ প্যানেল ================= */}
        {isAddingNew && (
          <div className="p-4 sm:p-5 bg-[#FAFAFA] border-b border-neutral-200/80 shrink-0 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-[#111111]">
                    নতুন গ্রাহক নিবন্ধন ফরম (New Customer Registration)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="min-h-[44px] sm:min-h-[36px] text-xs text-[#525252] hover:text-[#111111] font-medium px-2.5 py-1 rounded-md hover:bg-neutral-200/60 flex items-center gap-1 cursor-pointer"
                >
                  <span>বাতিল করুন</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* বাম পাশের ইনপুট ফরম */}
                <form onSubmit={handleSubmitNewCustomer} className="lg:col-span-2 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* নাম */}
                    <div>
                      <label className="block text-[11px] font-medium text-[#525252] mb-1">
                        গ্রাহকের পূর্ণ নাম <span className="text-[#B91C1C]">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                        <input
                          type="text"
                          required
                          placeholder="গ্রাহকের নাম লিখুন..."
                          value={newCustomer.CustomerName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, CustomerName: e.target.value })}
                          className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium text-[#111111]"
                        />
                      </div>
                    </div>

                    {/* মোবাইল নম্বর */}
                    <div>
                      <label className="block text-[11px] font-medium text-[#525252] mb-1">
                        মোবাইল নম্বর <span className="text-[#737373] font-normal">(ঐচ্ছিক কিন্তু বাঞ্ছনীয়)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                        <input
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={newCustomer.Phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, Phone: e.target.value })}
                          className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-mono tabular-nums font-medium text-[#111111]"
                        />
                      </div>
                    </div>

                    {/* ইমেইল */}
                    <div>
                      <label className="block text-[11px] font-medium text-[#525252] mb-1">
                        ইমেইল ঠিকানা <span className="text-[#737373] font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                        <input
                          type="email"
                          placeholder="customer@example.com"
                          value={newCustomer.Email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, Email: e.target.value })}
                          className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium text-[#111111]"
                        />
                      </div>
                    </div>

                    {/* ঠিকানা */}
                    <div>
                      <label className="block text-[11px] font-medium text-[#525252] mb-1">
                        ঠিকানা / এলাকা <span className="text-[#737373] font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                        <input
                          type="text"
                          placeholder="বাসা নং, রোড, থানা, জেলা..."
                          value={newCustomer.Address}
                          onChange={(e) => setNewCustomer({ ...newCustomer, Address: e.target.value })}
                          className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium text-[#111111]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ক্যাটাগরি পিলস / সিলেক্টর */}
                  <div>
                    <label className="block text-[11px] font-medium text-[#525252] mb-1.5">
                      গ্রাহকের ধরণ / প্রিভিলেজ ক্যাটাগরি
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'Regular', label: 'সাধারণ', icon: <User className="w-3.5 h-3.5" /> },
                        { id: 'VIP', label: 'ভিআইপি', icon: <Crown className="w-3.5 h-3.5" /> },
                        { id: 'Wholesale', label: 'পাইকারি', icon: <Building2 className="w-3.5 h-3.5" /> },
                        { id: 'Corporate', label: 'কর্পোরেট', icon: <Landmark className="w-3.5 h-3.5" /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewCustomer({ ...newCustomer, CustomerType: item.id })}
                          className={`min-h-[44px] sm:min-h-[36px] py-2 px-2.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors border cursor-pointer ${
                            newCustomer.CustomerType === item.id
                              ? 'border-[#0F172A] bg-[#0F172A] text-white'
                              : 'bg-white hover:bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
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
                      className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 text-xs font-medium text-[#111111] bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md transition-colors cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] sm:min-h-[36px] px-5 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>গ্রাহক সংরক্ষণ করুন</span>
                    </button>
                  </div>
                </form>

                {/* ডান পাশের লাইভ প্রিভিউ কার্ড */}
                <div className="bg-white rounded-lg border border-neutral-200/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80 mb-3">
                      <span className="text-[10px] font-semibold uppercase text-[#525252] tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> লাইভ কার্ড প্রিভিউ
                      </span>
                      <span className="text-[10px] font-mono font-medium text-[#737373]">
                        CUST-PREVIEW
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-md ${getCategoryConfig(newCustomer.CustomerType).avatarBg} flex items-center justify-center font-semibold text-base shrink-0`}>
                        {newCustomer.CustomerName.trim()
                          ? newCustomer.CustomerName.trim().charAt(0).toUpperCase()
                          : 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-sm font-semibold text-[#111111] truncate">
                          {newCustomer.CustomerName.trim() || 'গ্রাহকের নাম...'}
                        </h5>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${getCategoryConfig(newCustomer.CustomerType).badgeClass}`}>
                            {getCategoryConfig(newCustomer.CustomerType).label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#525252] bg-[#F5F5F5] p-2.5 rounded-md border border-neutral-200/80">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                        <span className="truncate font-mono tabular-nums">{newCustomer.Phone.trim() || 'ফোন নম্বর লিখুন'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                        <span className="truncate">{newCustomer.Email.trim() || 'ইমেইল লিখুন'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                        <span className="truncate">{newCustomer.Address.trim() || 'ঠিকানা লিখুন'}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#737373] mt-3 text-center">
                    সংরক্ষণ করলে স্বয়ংক্রিয়ভাবে ক্লাউড ডাটাবেসে সিঙ্ক হবে
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= সার্চ, ক্যাটাগরি ফিল্টার ও সর্টিং বার ================= */}
        <div className="p-3 sm:p-4 border-b border-neutral-200/80 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
          {/* সার্চ বক্স */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="গ্রাহকের নাম, মোবাইল নম্বর, ইমেইল বা আইডি দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[36px] pl-10 pr-8 py-2 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium text-[#111111]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] p-1 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {/* ক্যাটাগরি ফিল্টার পিলস */}
            <div className="flex items-center space-x-1 bg-[#F5F5F5] border border-neutral-200/80 p-1 rounded-md shrink-0">
              {[
                { id: 'ALL', label: 'সকল', count: stats.totalCount },
                { id: 'Regular', label: 'সাধারণ', count: stats.regularCount },
                { id: 'VIP', label: 'VIP', count: stats.vipCount },
                { id: 'Wholesale', label: 'পাইকারি', count: stats.wholesaleCount },
                { id: 'Corporate', label: 'কর্পোরেট', count: stats.corporateCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                    filterType === tab.id
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-transparent text-[#525252] hover:text-[#111111]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                    filterType === tab.id ? 'bg-white/20 text-white' : 'bg-white text-[#525252] border border-neutral-200/80'
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
                className="min-h-[44px] sm:min-h-[36px] text-xs bg-white border border-neutral-200/80 font-medium text-[#111111] py-1.5 px-3 rounded-md focus:outline-none focus:border-[#0F172A] cursor-pointer"
              >
                <option value="spent-desc">সর্বোচ্চ ব্যয় (Top Spender)</option>
                <option value="orders-desc">সর্বোচ্চ অর্ডার (Most Orders)</option>
                <option value="name-asc">নাম অনুযায়ী (A-Z)</option>
                <option value="newest">সর্বশেষ নিবন্ধিত (Newest)</option>
              </select>
            </div>

            {/* ভিউ মোড টগল (গ্রিড / লিস্ট) */}
            <div className="flex items-center border border-neutral-200/80 rounded-md bg-[#F5F5F5] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:text-[#111111]'
                }`}
                title="গ্রিড কার্ড ভিউ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
                  viewMode === 'table'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:text-[#111111]'
                }`}
                title="কমপ্যাক্ট টেবিল ভিউ"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= RFM সেগমেন্টেশন কুইক ফিল্টার স্ট্রিপ ================= */}
        <div className="px-4 py-2.5 bg-[#F5F5F5] border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-0.5">
            <span className="font-medium text-[#525252] text-[11px] flex items-center gap-1 shrink-0 mr-1">
              <Award className="w-3.5 h-3.5 text-[#0F172A]" />
              CRM সেগমেন্ট:
            </span>
            {[
              { id: 'ALL', label: 'সকল গ্রাহক', count: stats.totalCount },
              { id: 'VIP', label: 'VIP চ্যাম্পিয়ন', count: stats.vipCount },
              { id: 'Regular', label: 'নিয়মিত', count: stats.regularCount },
              { id: 'At-Risk', label: 'ঝুঁকিপূর্ণ (>৪৫ দিন)', count: stats.atRiskCount },
              { id: 'New', label: 'নতুন', count: stats.newCount },
            ].map((seg) => (
              <button
                key={seg.id}
                onClick={() => setRfmFilter(seg.id)}
                className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap border cursor-pointer ${
                  rfmFilter === seg.id
                    ? 'border-[#0F172A] bg-[#0F172A] text-white'
                    : 'bg-white text-[#525252] border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <span>{seg.label}</span>
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                  rfmFilter === seg.id ? 'bg-white/20 text-white' : 'bg-[#F5F5F5] text-[#525252]'
                }`}>
                  {seg.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] font-medium text-[#111111] bg-white border border-neutral-200/80 px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
            <span>মোট অর্জিত লয়ালটি:</span>
            <span className="font-mono tabular-nums text-[#111111] font-semibold">{stats.totalLoyaltyPoints.toLocaleString()}</span>
            <span className="text-[#737373] font-normal">পয়েন্ট</span>
          </div>
        </div>

        {/* ================= গ্রাহক তালিকা বডি (গ্রিড / টেবিল) ================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 bg-[#FAFAFA]">
          {filteredCustomers.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-md mx-auto bg-white rounded-lg border border-neutral-200/80">
              <div className="w-14 h-14 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center mx-auto mb-3.5">
                <Users className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-semibold tracking-tight text-[#111111] mb-1">
                কোনো গ্রাহক খুঁজে পাওয়া যায়নি
              </h4>
              <p className="text-xs text-[#525252] leading-relaxed mb-4">
                {searchQuery
                  ? `'${searchQuery}' অনুসন্ধানের সাথে মিল রেখে কোনো গ্রাহক মেলেনি। ফিল্টার বা কীওয়ার্ড পরিবর্তন করে দেখুন।`
                  : 'এখনও কোনো গ্রাহক ডাটাবেসে নিবন্ধিত হয়নি। উপরে "নতুন গ্রাহক যোগ" বাটনে ক্লিক করে গ্রাহক যোগ করুন।'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
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
                    className="bg-white rounded-lg border border-neutral-200/80 hover:border-neutral-300 transition-colors p-4 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* টপ সেকশন: প্রোফাইল ও ক্যাটাগরি */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* অ্যাভাটার */}
                          <div className={`w-10 h-10 rounded-md ${conf.avatarBg} flex items-center justify-center font-semibold text-sm shrink-0`}>
                            {cust.CustomerName ? cust.CustomerName.charAt(0).toUpperCase() : 'C'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <h4 className="text-sm font-semibold text-[#111111] truncate">
                                {cust.CustomerName || 'নামহীন গ্রাহক'}
                              </h4>
                              {(() => {
                                const rfm = getRfmBadge(cust);
                                return (
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${rfm.class}`}>
                                    {rfm.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] font-mono tabular-nums text-[#737373] mt-0.5">
                              <span>{cust.CustomerID || 'CUST-ID'}</span>
                              {cust.Status && (
                                <span className="inline-flex items-center gap-1 text-[#15803D] font-sans font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                                  সক্রিয়
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ক্যাটাগরি ব্যাজ */}
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-md border flex items-center space-x-1 shrink-0 ${conf.badgeClass}`}>
                          {conf.icon}
                          <span>{conf.label}</span>
                        </span>
                      </div>

                      {/* যোগাযোগ তথ্য লিস্ট */}
                      <div className="space-y-1.5 py-2.5 border-y border-neutral-200/80 text-xs text-[#525252]">
                        {cust.Phone && (
                          <div className="flex items-center justify-between">
                            <a
                              href={`tel:${cust.Phone}`}
                              className="flex items-center space-x-2 text-[#111111] hover:text-[#0F172A] font-medium font-mono tabular-nums group/link"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                              <span>{cust.Phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(cust.CustomerID || cust.Phone, cust.Phone)}
                              title="ফোন নম্বর কপি করুন"
                              className="text-[10px] font-medium text-[#525252] hover:text-[#111111] px-2 py-1 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 flex items-center space-x-1 cursor-pointer"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-[#15803D]" />
                                  <span className="text-[#15803D]">কপি হয়েছে!</span>
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
                            <Mail className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                            <a
                              href={`mailto:${cust.Email}`}
                              className="text-[#525252] hover:text-[#111111] truncate font-medium"
                            >
                              {cust.Email}
                            </a>
                          </div>
                        )}

                        {cust.Address && (
                          <div className="flex items-center space-x-2 text-[#525252]">
                            <MapPin className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                            <span className="truncate">{cust.Address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* নিচের আর্থিক মেট্রিক্স রিবন ও অ্যাকশন */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5 bg-[#F5F5F5] px-3 py-1.5 rounded-md border border-neutral-200/80">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-medium text-[#737373] block">
                            মোট অর্ডার
                          </span>
                          <span className="text-xs font-semibold text-[#111111] font-mono tabular-nums">
                            {ordersCount} টি
                          </span>
                        </div>
                        <div className="h-6 w-px bg-neutral-200" />
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-medium text-[#737373] block">
                            সর্বমোট ব্যয়
                          </span>
                          <span className="text-xs font-semibold text-[#15803D] font-mono tabular-nums">
                            {formatCurrency(spentAmount)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-neutral-200" />
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-medium text-[#737373] block">
                            লয়ালটি
                          </span>
                          <span className="text-xs font-semibold text-[#111111] font-mono tabular-nums">
                            {Number(cust.LoyaltyPoints || 0).toLocaleString()} pt
                          </span>
                        </div>
                        {Number(cust.CurrentDue || 0) > 0 && (
                          <>
                            <div className="h-6 w-px bg-amber-200" />
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-medium text-[#B45309] block">
                                বকেয়া পাওনা
                              </span>
                              <span className="text-xs font-semibold text-[#B45309] font-mono tabular-nums">
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
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#15803D] bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200/80 cursor-pointer flex items-center justify-center"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {onOpenCustomerLedgerModal && (
                          <button
                            type="button"
                            onClick={() => onOpenCustomerLedgerModal(cust)}
                            title="বাকির খাতা ও লেজার খুলুন"
                            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#B45309] bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-200/80 cursor-pointer flex items-center justify-center"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForView(cust)}
                          title="বিস্তারিত CRM প্রোফাইল দেখুন"
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#525252] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors border border-neutral-200/80 cursor-pointer flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onDeleteCustomer && (
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            title="গ্রাহক মুছে ফেলুন"
                            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors border border-neutral-200/80 hover:border-red-200/80 cursor-pointer flex items-center justify-center"
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
            <div className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F5F5F5] border-b border-neutral-200/80 text-[#525252] font-medium uppercase text-[10px]">
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
                  <tbody className="divide-y divide-neutral-200/80">
                    {filteredCustomers.map((cust) => {
                      const conf = getCategoryConfig(cust.CustomerType);
                      const rfm = getRfmBadge(cust);
                      return (
                        <tr
                          key={cust.CustomerID || cust.Phone}
                          className="hover:bg-[#FAFAFA] transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-8 h-8 rounded-md ${conf.avatarBg} flex items-center justify-center font-semibold text-xs shrink-0`}>
                                {cust.CustomerName ? cust.CustomerName.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#111111] truncate">
                                  {cust.CustomerName || 'নামহীন'}
                                </div>
                                <div className="text-[10px] font-mono tabular-nums text-[#737373]">
                                  {cust.CustomerID || 'CUST-ID'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border whitespace-nowrap ${rfm.class}`}>
                              {rfm.label}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-md border inline-flex items-center space-x-1 whitespace-nowrap ${conf.badgeClass}`}>
                              {conf.icon}
                              <span>{conf.label}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              {cust.Phone && (
                                <div className="text-[#111111] font-medium font-mono tabular-nums">{cust.Phone}</div>
                              )}
                              {cust.Email && (
                                <div className="text-[#737373] text-[11px] truncate max-w-xs">{cust.Email}</div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-semibold font-mono tabular-nums text-[#111111]">
                            {cust.TotalOrders || 0} টি
                          </td>

                          <td className="py-3 px-3 text-right font-semibold font-mono tabular-nums text-[#15803D]">
                            {formatCurrency(cust.TotalSpent)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#111111]">
                            {Number(cust.LoyaltyPoints || 0).toLocaleString()} pt
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {Number(cust.CurrentDue || 0) > 0 ? (
                              <span className="font-semibold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 text-xs">
                                {formatCurrency(cust.CurrentDue)}
                              </span>
                            ) : (
                              <span className="text-[#737373] font-normal">০.০০</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {/* টার্গেটেড WhatsApp অফার বাটন */}
                              <button
                                type="button"
                                onClick={() => handleTargetedOffer(cust)}
                                title="টার্গেটেড WhatsApp অফার বা রিওয়ার্ড মেসেজ পাঠান"
                                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#15803D] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {onOpenCustomerLedgerModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCustomerLedgerModal(cust)}
                                  title="বাকির খাতা ও লেজার খুলুন"
                                  className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#B45309] hover:bg-amber-50 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                                >
                                  <BookOpen className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedCustomerForView(cust)}
                                title="প্রোফাইল দেখুন"
                                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#525252] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {onDeleteCustomer && (
                                <button
                                  type="button"
                                  onClick={() => setCustomerToDelete(cust)}
                                  title="মুছে ফেলুন"
                                  className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors cursor-pointer flex items-center justify-center"
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
        <div className="p-3.5 sm:p-4 bg-[#FAFAFA] border-t border-neutral-200/80 text-xs text-[#525252] flex justify-between items-center px-5 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-[#525252]">প্রদর্শিত গ্রাহক:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-neutral-200/80 font-semibold font-mono tabular-nums text-[#111111]">
              {filteredCustomers.length} / {customers.length} জন
            </span>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

        {/* ================= ডিলিট নিশ্চিতকরণ পপআপ (Delete Confirmation Modal) ================= */}
        {customerToDelete && (
          <div className="fixed inset-0 z-60 bg-neutral-900/40 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-lg max-w-sm w-full p-5 border border-neutral-200/80 text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-md bg-red-50 border border-red-200/80 text-[#B91C1C] flex items-center justify-center mx-auto mb-3.5">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold tracking-tight text-[#111111] mb-1">
                গ্রাহক মুছে ফেলার নিশ্চিতকরণ
              </h4>
              <p className="text-xs text-[#525252] leading-relaxed mb-4">
                আপনি কি নিশ্চিত যে <strong className="text-[#111111] font-semibold">'{customerToDelete.CustomerName || customerToDelete.Phone}'</strong> কে ডাটাবেস থেকে মুছে ফেলতে চান?
              </p>
              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCustomer(customerToDelete);
                    setCustomerToDelete(null);
                  }}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#B91C1C] hover:bg-red-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  হ্যাঁ, মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= গ্রাহক বিস্তারিত CRM প্রোফাইল মডাল (Customer Details Drawer) ================= */}
        {selectedCustomerForView && (
          <div className="fixed inset-0 z-60 bg-neutral-900/40 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-lg max-w-md w-full p-5 sm:p-6 border border-neutral-200/80 animate-in zoom-in-95 duration-150 relative">
              <button
                type="button"
                onClick={() => setSelectedCustomerForView(null)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] absolute right-3 top-3 text-[#525252] hover:text-[#111111] p-1.5 rounded-md hover:bg-[#F5F5F5] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center pb-4 border-b border-neutral-200/80">
                <div className={`w-14 h-14 rounded-lg ${getCategoryConfig(selectedCustomerForView.CustomerType).avatarBg} flex items-center justify-center font-semibold text-2xl mx-auto mb-3`}>
                  {selectedCustomerForView.CustomerName ? selectedCustomerForView.CustomerName.charAt(0).toUpperCase() : 'C'}
                </div>
                <h4 className="text-base font-semibold tracking-tight text-[#111111]">
                  {selectedCustomerForView.CustomerName || 'নামহীন গ্রাহক'}
                </h4>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${getCategoryConfig(selectedCustomerForView.CustomerType).badgeClass}`}>
                    {getCategoryConfig(selectedCustomerForView.CustomerType).label}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-[#737373]">
                    {selectedCustomerForView.CustomerID}
                  </span>
                </div>
              </div>

              {/* বিস্তারিত মেট্রিক্স */}
              <div className="grid grid-cols-2 gap-2.5 my-4">
                <div className="p-3 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 text-center">
                  <span className="text-[10px] font-medium text-[#737373] uppercase block">মোট অর্ডার</span>
                  <span className="text-sm font-semibold text-[#111111] font-mono tabular-nums">
                    {selectedCustomerForView.TotalOrders || 0} টি
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 text-center">
                  <span className="text-[10px] font-medium text-[#15803D] uppercase block">সর্বমোট ব্যয়</span>
                  <span className="text-sm font-semibold text-[#15803D] font-mono tabular-nums">
                    {formatCurrency(selectedCustomerForView.TotalSpent)}
                  </span>
                </div>
              </div>

              {/* কন্টাক্ট লিঙ্কস */}
              <div className="space-y-2 text-xs text-[#525252] bg-[#FAFAFA] p-3.5 rounded-lg border border-neutral-200/80 mb-4">
                {selectedCustomerForView.Phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#737373] flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5" /> ফোন:
                    </span>
                    <a
                      href={`tel:${selectedCustomerForView.Phone}`}
                      className="font-semibold font-mono tabular-nums text-[#0F172A] hover:underline"
                    >
                      {selectedCustomerForView.Phone}
                    </a>
                  </div>
                )}
                {selectedCustomerForView.Email && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#737373] flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5" /> ইমেইল:
                    </span>
                    <a
                      href={`mailto:${selectedCustomerForView.Email}`}
                      className="font-medium text-[#0F172A] hover:underline truncate max-w-[200px]"
                    >
                      {selectedCustomerForView.Email}
                    </a>
                  </div>
                )}
                {selectedCustomerForView.Address && (
                  <div className="flex items-start justify-between">
                    <span className="text-[#737373] flex items-center gap-1.5 font-medium shrink-0">
                      <MapPin className="w-3.5 h-3.5" /> ঠিকানা:
                    </span>
                    <span className="font-medium text-[#111111] text-right ml-2">
                      {selectedCustomerForView.Address}
                    </span>
                  </div>
                )}
                {selectedCustomerForView.CreatedAt && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/80 text-[10px] text-[#737373]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> নিবন্ধনের সময়:
                    </span>
                    <span className="font-mono tabular-nums">
                      {new Date(selectedCustomerForView.CreatedAt).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForView(null)}
                  className="w-full min-h-[44px] sm:min-h-[36px] py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
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
