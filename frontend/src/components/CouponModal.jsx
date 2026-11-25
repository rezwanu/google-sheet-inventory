import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Search,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  X,
  RefreshCw,
  Clock,
  Wand2,
  Zap,
  Award,
  BarChart3,
  TrendingUp
} from 'lucide-react';

/**
 * কুপন তৈরি ও অফার ব্যবস্থাপনা মডাল (Enterprise Modern UI/UX Coupon & Offer Management)
 */
export default function CouponModal({
  isOpen,
  onClose,
  embedded = false,
  coupons = [],
  products = [],
  salesHistory = [],
  currencySymbol = '৳',
  onSaveCoupon,
  onDeleteCoupon,
  onRefreshCoupons,
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SPECIFIC' | 'STOREWIDE'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [productSearch, setProductSearch] = useState('');

  // GAP 9: কুপন ব্যবহারের পূর্ণাঙ্গ অ্যানালিটিক্স হিসাব
  const couponAnalytics = useMemo(() => {
    const statsMap = {};
    (Array.isArray(coupons) ? coupons : []).forEach((c) => {
      const code = String(c.CouponCode || '').trim().toUpperCase();
      if (!code) return;
      statsMap[code] = {
        code,
        coupon: c,
        usageCount: Number(c.UsedCount) || 0,
        totalDiscount: 0,
        totalRevenue: 0,
        lastUsed: null
      };
    });

    (Array.isArray(salesHistory) ? salesHistory : []).forEach((s) => {
      const saleCoupon = String(s.CouponCode || s.couponCode || s.Coupon || s.coupon || '').trim().toUpperCase();
      if (!saleCoupon) return;
      if (!statsMap[saleCoupon]) {
        statsMap[saleCoupon] = {
          code: saleCoupon,
          coupon: null,
          usageCount: 0,
          totalDiscount: 0,
          totalRevenue: 0,
          lastUsed: null
        };
      }
      const stat = statsMap[saleCoupon];
      stat.usageCount += 1;
      stat.totalDiscount += Number(s.CouponDiscount || s.couponDiscount || s.DiscountAmount || s.discountAmount || 0);
      stat.totalRevenue += Number(s.GrandTotal || s.grandTotal || 0);
      const saleTime = s.Timestamp || s.Date || s.timestamp || s.createdAt;
      if (saleTime) {
        if (!stat.lastUsed || new Date(saleTime) > new Date(stat.lastUsed)) {
          stat.lastUsed = saleTime;
        }
      }
    });

    const list = Object.values(statsMap);
    const totalUsage = list.reduce((sum, item) => sum + item.usageCount, 0);
    const totalDiscountGiven = list.reduce((sum, item) => sum + item.totalDiscount, 0);
    const totalSalesGenerated = list.reduce((sum, item) => sum + item.totalRevenue, 0);

    return {
      list: list.sort((a, b) => b.usageCount - a.usageCount),
      totalUsage,
      totalDiscountGiven,
      totalSalesGenerated
    };
  }, [coupons, salesHistory]);

  // ফর্ম প্রাথমিক স্টেট
  const initialFormState = {
    CouponID: '',
    CouponCode: '',
    DiscountType: 'Percentage', // 'Percentage' | 'Fixed'
    DiscountValue: '',
    ApplicableType: 'AllProducts', // 'AllProducts' | 'SpecificProduct'
    ProductID: '',
    ProductName: '',
    MinPurchaseAmount: '',
    MaxDiscountAmount: '',
    UsageLimit: '',
    UsedCount: 0,
    ExpiryDate: '',
    Status: 'Active',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  // মেট্রিক্স হিসাব (Live Analytics Counters)
  const stats = useMemo(() => {
    if (!Array.isArray(coupons)) {
      return { total: 0, active: 0, specific: 0, storewide: 0 };
    }
    const now = new Date().setHours(0, 0, 0, 0);
    let active = 0;
    let specific = 0;
    let storewide = 0;

    coupons.forEach((c) => {
      const isExpired = c.ExpiryDate && new Date(c.ExpiryDate) < now;
      const isLimitReached = c.UsageLimit > 0 && Number(c.UsedCount) >= Number(c.UsageLimit);
      const isInactive = c.Status === 'Inactive';
      if (!isExpired && !isLimitReached && !isInactive) {
        active += 1;
      }
      if (c.ApplicableType === 'SpecificProduct') {
        specific += 1;
      } else {
        storewide += 1;
      }
    });

    return {
      total: coupons.length,
      active,
      specific,
      storewide,
    };
  }, [coupons]);

  // মেয়াদ উত্তীর্ণের বাকি দিন হিসাব করার হেল্পার
  const getExpiryLabel = (dateStr) => {
    if (!dateStr) return { text: 'অনির্দিষ্টকাল কার্যকর', isExpired: false, isUrgent: false };
    const target = new Date(dateStr);
    target.setHours(23, 59, 59, 999);
    const today = new Date();
    const diffMs = target - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'মেয়াদ শেষ হয়ে গেছে', isExpired: true, isUrgent: false };
    }
    if (diffDays === 0) {
      return { text: 'আজই মেয়াদ শেষ হবে!', isExpired: false, isUrgent: true };
    }
    if (diffDays <= 3) {
      return { text: `মাত্র ${diffDays} দিন বাকি`, isExpired: false, isUrgent: true };
    }
    return { text: `${diffDays} দিন বাকি`, isExpired: false, isUrgent: false };
  };

  // স্মার্ট কোড জেনারেটর
  const handleGenerateRandomCode = (customPrefix = null) => {
    let prefix = customPrefix || 'SAVE';
    if (!customPrefix) {
      if (formData.ApplicableType === 'SpecificProduct' && formData.ProductID) {
        const prod = products.find((p) => p.ProductID === formData.ProductID);
        if (prod && prod.ProductName) {
          prefix = prod.ProductName.slice(0, 4).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'ITEM';
        }
      } else if (formData.DiscountType === 'Percentage') {
        prefix = 'DISC';
      }
    }
    const val = formData.DiscountValue ? Math.round(Number(formData.DiscountValue)) : '10';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generated = `${prefix}${val}-${randomSuffix}`;
    setFormData((prev) => ({ ...prev, CouponCode: generated }));
    setFormError('');
  };

  // ফর্ম সম্পাদনা শুরু করা
  const handleEditCoupon = (coupon) => {
    setFormData({
      CouponID: coupon.CouponID || '',
      CouponCode: coupon.CouponCode || '',
      DiscountType: coupon.DiscountType || 'Percentage',
      DiscountValue: coupon.DiscountValue !== undefined ? String(coupon.DiscountValue) : '',
      ApplicableType: coupon.ApplicableType || 'AllProducts',
      ProductID: coupon.ProductID || '',
      ProductName: coupon.ProductName || '',
      MinPurchaseAmount: coupon.MinPurchaseAmount ? String(coupon.MinPurchaseAmount) : '',
      MaxDiscountAmount: coupon.MaxDiscountAmount ? String(coupon.MaxDiscountAmount) : '',
      UsageLimit: coupon.UsageLimit ? String(coupon.UsageLimit) : '',
      UsedCount: Number(coupon.UsedCount) || 0,
      ExpiryDate: coupon.ExpiryDate || '',
      Status: coupon.Status || 'Active',
    });
    setFormError('');
    setActiveTab('create');
  };

  // ফর্ম রিসেট
  const handleResetForm = () => {
    setFormData(initialFormState);
    setFormError('');
  };

  // কোড ক্লিপবোর্ডে কপি
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // ফর্ম সাবমিট হ্যান্ডলার
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = String(formData.CouponCode || '').trim().toUpperCase();
    if (!cleanCode) {
      setFormError('অনুগ্রহ করে একটি কুপন কোড লিখুন বা তৈরি করুন।');
      return;
    }

    const discValue = Number(formData.DiscountValue);
    if (isNaN(discValue) || discValue <= 0) {
      setFormError('সঠিক ডিসকাউন্ট বা ছাড়ের পরিমাণ লিখুন (০ এর বেশি হতে হবে)।');
      return;
    }

    if (formData.DiscountType === 'Percentage' && discValue > 100) {
      setFormError('শতাংশ ডিসকাউন্ট সর্বোচ্চ ১০০% হতে পারবে।');
      return;
    }

    if (formData.ApplicableType === 'SpecificProduct' && !formData.ProductID) {
      setFormError('নির্দিষ্ট পণ্যের ক্ষেত্রে তালিকা থেকে একটি পণ্য নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        CouponCode: cleanCode,
        DiscountValue: discValue,
        MinPurchaseAmount: Number(formData.MinPurchaseAmount) || 0,
        MaxDiscountAmount: Number(formData.MaxDiscountAmount) || 0,
        UsageLimit: Number(formData.UsageLimit) || 0,
      };

      if (typeof onSaveCoupon === 'function') {
        await onSaveCoupon(payload);
      }

      handleResetForm();
      setActiveTab('list');
    } catch (err) {
      setFormError(err.message || 'কুপন সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // পণ্য ফিল্টার ড্রপডাউন
  const filteredProductsList = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 40);
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) =>
      (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
      (p.ProductID && p.ProductID.toLowerCase().includes(q)) ||
      (p.Barcode && p.Barcode.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [products, productSearch]);

  // কুপন তালিকা ফিল্টারিং
  const filteredCoupons = useMemo(() => {
    let list = Array.isArray(coupons) ? [...coupons] : [];

    // স্কোপ ফিল্টার
    if (filterScope === 'ACTIVE') {
      const now = new Date().setHours(0, 0, 0, 0);
      list = list.filter((c) => {
        if (c.Status === 'Inactive') return false;
        if (c.ExpiryDate && new Date(c.ExpiryDate) < now) return false;
        if (c.UsageLimit > 0 && Number(c.UsedCount) >= Number(c.UsageLimit)) return false;
        return true;
      });
    } else if (filterScope === 'SPECIFIC') {
      list = list.filter((c) => c.ApplicableType === 'SpecificProduct');
    } else if (filterScope === 'STOREWIDE') {
      list = list.filter((c) => c.ApplicableType === 'AllProducts' || !c.ApplicableType);
    }

    // সার্চ ফিল্টার
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        (c.CouponCode && c.CouponCode.toLowerCase().includes(q)) ||
        (c.ProductName && c.ProductName.toLowerCase().includes(q)) ||
        (c.ProductID && c.ProductID.toLowerCase().includes(q))
      );
    }

    return list;
  }, [coupons, filterScope, searchQuery]);

  // নির্বাচিত নির্দিষ্ট পণ্য অবজেক্ট
  const selectedProductObj = useMemo(() => {
    if (formData.ApplicableType !== 'SpecificProduct' || !formData.ProductID) return null;
    return products.find((p) => String(p.ProductID).trim() === String(formData.ProductID).trim()) || null;
  }, [formData.ApplicableType, formData.ProductID, products]);

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-neutral-900/40"}>
      <div className={embedded ? "bg-white rounded-lg border border-neutral-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden" : "bg-white rounded-lg border border-neutral-200/80 w-full max-w-6xl flex flex-col max-h-[92vh] overflow-hidden"}>
        
        {/* ========================================================= */}
        {/* ১. হেডার বার */}
        {/* ========================================================= */}
        <div className="px-6 sm:px-8 py-4 border-b border-neutral-200/80 bg-[#FAFAFA] relative">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-md bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-semibold text-[#111111] tracking-tight">
                    কুপন তৈরি ও অফার ব্যবস্থাপনা
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono tabular-nums font-medium px-2.5 py-0.5 rounded-md bg-[#0F172A] text-white">
                      মোট {stats.total}টি
                    </span>
                    <span className="text-[11px] font-mono tabular-nums font-medium px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#15803D] border border-emerald-200/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                      {stats.active}টি সক্রিয়
                    </span>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#525252] mt-0.5">
                  পণ্যভিত্তিক ও সার্বজনীন ডিসকাউন্ট কুপন তৈরি করুন এবং গুগল শিট ডাটাবেসের সাথে রিয়েল-টাইম সিঙ্ক রাখুন
                </p>
              </div>
            </div>

            {/* হেডার ডান অ্যাকশন বাটনসমূহ */}
            <div className="flex items-center space-x-2 shrink-0">
              {onRefreshCoupons && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefreshCoupons();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  title="গুগল শিট থেকে রিফ্রেশ সিঙ্ক করুন"
                  className="p-2 text-[#525252] hover:text-[#111111] bg-white hover:bg-[#F5F5F5] rounded-md transition-colors cursor-pointer border border-neutral-200/80 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0F172A]' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`transition-colors cursor-pointer flex items-center space-x-1 rounded-md min-h-[44px] sm:min-h-[36px] border border-neutral-200/80 ${
                  embedded
                    ? 'px-3 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium text-xs'
                    : 'min-w-[44px] sm:min-w-[36px] bg-white text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] justify-center'
                }`}
                title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
              >
                {embedded ? (
                  <>
                    <span className="text-sm font-semibold">←</span>
                    <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                  </>
                ) : (
                  <X className="w-5 h-5 stroke-[2.2]" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* ২. সেগমেন্টেড ট্যাব ও ফিল্টার কন্ট্রোলার */}
        {/* ========================================================= */}
        <div className="px-6 sm:px-8 py-3 border-b border-neutral-200/80 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* ট্যাব পিলস */}
          <div className="inline-flex p-1 bg-[#F5F5F5] rounded-lg border border-neutral-200/80 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[36px] ${
                activeTab === 'list'
                  ? 'bg-white text-[#111111] border border-neutral-200/80 font-semibold'
                  : 'text-[#525252] hover:text-[#111111] border border-transparent'
              }`}
            >
              <Ticket className="w-4 h-4 text-[#0F172A]" />
              <span>কুপন তালিকা (<span className="font-mono tabular-nums">{stats.total}</span>)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setActiveTab('create');
              }}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[36px] ${
                activeTab === 'create'
                  ? 'bg-white text-[#111111] border border-neutral-200/80 font-semibold'
                  : 'text-[#525252] hover:text-[#111111] border border-transparent'
              }`}
            >
              <Plus className="w-4 h-4 text-[#0F172A]" />
              <span>{formData.CouponID ? 'কুপন সম্পাদনা' : 'নতুন কুপন তৈরি'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[36px] ${
                activeTab === 'analytics'
                  ? 'bg-white text-[#111111] border border-neutral-200/80 font-semibold'
                  : 'text-[#525252] hover:text-[#111111] border border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#0F172A]" />
              <span>কুপন অ্যানালিটিক্স (<span className="font-mono tabular-nums">{couponAnalytics.list.length}</span>)</span>
            </button>
          </div>

          {/* কুইক ফিল্টার চিপস (তালিকা ট্যাবে) */}
          {activeTab === 'list' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
              <span className="text-[#737373] font-medium text-[11px] mr-1 hidden lg:inline">ফিল্টার:</span>
              <button
                type="button"
                onClick={() => setFilterScope('ALL')}
                className={`px-3 py-1.5 rounded-md font-medium font-mono tabular-nums transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap border ${
                  filterScope === 'ALL'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white hover:bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                }`}
              >
                সব ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('ACTIVE')}
                className={`px-3 py-1.5 rounded-md font-medium font-mono tabular-nums transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap border flex items-center gap-1.5 ${
                  filterScope === 'ACTIVE'
                    ? 'bg-[#15803D] text-white border-[#15803D]'
                    : 'bg-white hover:bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>সক্রিয় ({stats.active})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('SPECIFIC')}
                className={`px-3 py-1.5 rounded-md font-medium font-mono tabular-nums transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap border flex items-center gap-1.5 ${
                  filterScope === 'SPECIFIC'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white hover:bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>পণ্যভিত্তিক ({stats.specific})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('STOREWIDE')}
                className={`px-3 py-1.5 rounded-md font-medium font-mono tabular-nums transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap border flex items-center gap-1.5 ${
                  filterScope === 'STOREWIDE'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white hover:bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>সকল পণ্য ({stats.storewide})</span>
              </button>
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* ৩. মূল বডি কনটেন্ট */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#FAFAFA]">
          
          {/* ========================================================= */}
          {/* ট্যাব ১: কুপন তালিকা ভিউ */}
          {/* ========================================================= */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              
              {/* সার্চ ও নিউ কুপন একশন বার */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-neutral-200/80">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কুপন কোড, পণ্যের নাম বা আইডি দিয়ে খুঁজুন..."
                    className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm font-medium bg-[#F5F5F5] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab('create');
                  }}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[36px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন কুপন জেনারেট করুন</span>
                </button>
              </div>

              {/* কুপন কার্ড গ্রিড */}
              {filteredCoupons.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-neutral-200/80 p-12 text-center">
                  <div className="w-16 h-16 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-8 h-8 stroke-[1.8]" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-[#111111] mb-1">কোনো কুপন পাওয়া যায়নি</h3>
                  <p className="text-xs sm:text-sm text-[#525252] max-w-md mx-auto mb-5 leading-relaxed">
                    {searchQuery
                      ? `'${searchQuery}' এর সাথে মিল রেখে কোনো কুপন পাওয়া যায়নি। অন্য কোনো কোড বা নাম দিয়ে চেষ্টা করুন।`
                      : 'এখনও কোনো কুপন তৈরি করা হয়নি। কাস্টমারদের আকর্ষণ করতে ও সেলস বাড়াতে এখনই নতুন কুপন তৈরি করুন।'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleResetForm();
                      setActiveTab('create');
                    }}
                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs sm:text-sm font-medium inline-flex items-center space-x-2 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>প্রথম কুপনটি তৈরি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCoupons.map((coupon) => {
                    const isSpecific = coupon.ApplicableType === 'SpecificProduct';
                    const isPercentage = coupon.DiscountType === 'Percentage';
                    const targetProduct = isSpecific ? products.find((p) => p.ProductID === coupon.ProductID) : null;
                    const expiry = getExpiryLabel(coupon.ExpiryDate);
                    const isLimitReached = coupon.UsageLimit > 0 && Number(coupon.UsedCount) >= Number(coupon.UsageLimit);
                    const isInactive = coupon.Status === 'Inactive';
                    const usagePercent = coupon.UsageLimit > 0 ? Math.min(100, Math.round((Number(coupon.UsedCount) / Number(coupon.UsageLimit)) * 100)) : 0;

                    return (
                      <div
                        key={coupon.CouponID || coupon.CouponCode}
                        className={`bg-white rounded-lg border transition-colors p-5 flex flex-col justify-between relative overflow-hidden group ${
                          isInactive || expiry.isExpired || isLimitReached
                            ? 'border-neutral-200/80 bg-[#FAFAFA] opacity-85'
                            : 'border-neutral-200/80 hover:border-neutral-300'
                        }`}
                      >
                        {/* কার্ডের ডান কোণায় ওয়াটারমার্ক আইকন */}
                        <div className="absolute -right-4 -bottom-4 text-neutral-100 pointer-events-none">
                          <Ticket className="w-24 h-24 stroke-[0.7] rotate-12" />
                        </div>

                        <div>
                          {/* টপ হেডার: কোড পিল + স্কোপ ব্যাজ + স্ট্যাটাস */}
                          <div className="flex items-start justify-between gap-2.5 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* কুপন কোড পিল */}
                              <div className="inline-flex items-center gap-1.5 bg-[#0F172A] text-white px-3 py-1.5 rounded-md text-xs font-mono tabular-nums font-semibold tracking-wider">
                                <span>{coupon.CouponCode}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(coupon.CouponCode)}
                                  title="কোড কপি করুন"
                                  className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer ml-1 p-0.5 rounded-md hover:bg-white/10"
                                >
                                  {copiedCode === coupon.CouponCode ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              {/* কুপনের স্কোপ ব্যাজ */}
                              {isSpecific ? (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-50 text-[#15803D] border border-emerald-200/80 flex items-center space-x-1">
                                  <Package className="w-3 h-3 text-[#15803D]" />
                                  <span className="truncate max-w-[130px]">
                                    {coupon.ProductName || 'পণ্যভিত্তিক'}
                                  </span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 flex items-center space-x-1">
                                  <Layers className="w-3 h-3 text-[#0F172A]" />
                                  <span>সকল পণ্য</span>
                                </span>
                              )}
                            </div>

                            {/* স্ট্যাটাস ব্যাজ */}
                            <div className="shrink-0">
                              {expiry.isExpired ? (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-red-50 text-[#B91C1C] border border-red-200/80">
                                  মেয়াদোত্তীর্ণ
                                </span>
                              ) : isLimitReached ? (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-amber-50 text-[#B45309] border border-amber-200/80">
                                  সীমা পূর্ণ
                                </span>
                              ) : isInactive ? (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                                  নিষ্ক্রিয়
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-50 text-[#15803D] border border-emerald-200/80 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                                  সক্রিয়
                                </span>
                              )}
                            </div>
                          </div>

                          {/* মূল ডিসকাউন্ট সংখ্যা */}
                          <div className="my-3">
                            <div className="flex items-baseline space-x-2">
                              <span className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#111111] tracking-tight">
                                {isPercentage ? `${coupon.DiscountValue}% ছাড়` : `${currencySymbol}${coupon.DiscountValue} ছাড়`}
                              </span>
                              {isPercentage && Number(coupon.MaxDiscountAmount) > 0 && (
                                <span className="text-[11px] font-mono tabular-nums font-medium text-[#525252] bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-neutral-200/80">
                                  সর্বোচ্চ {currencySymbol}{coupon.MaxDiscountAmount}
                                </span>
                              )}
                            </div>

                            {/* নির্দিষ্ট পণ্য প্রিভিউ বক্স (যদি SpecificProduct হয়) */}
                            {isSpecific && (
                              <div className="mt-3 flex items-center space-x-3 text-xs text-[#525252] bg-[#FAFAFA] p-3 rounded-lg border border-neutral-200/80">
                                {targetProduct?.ImageUrl ? (
                                  <img
                                    src={targetProduct.ImageUrl}
                                    alt={coupon.ProductName}
                                    className="w-9 h-9 rounded-md object-cover shrink-0 border border-neutral-200/80"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200/80 text-[#15803D] flex items-center justify-center shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-[#111111] truncate text-xs">
                                    {coupon.ProductName || targetProduct?.ProductName || 'নির্দিষ্ট পণ্য'}
                                  </p>
                                  {targetProduct && (
                                    <p className="text-[10px] text-[#525252] font-mono tabular-nums mt-0.5">
                                      মূল্য: {currencySymbol}{targetProduct.SellingPrice}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* শর্ত ও ব্যবহার ট্র্যাকিং গ্রিড */}
                            <div className="grid grid-cols-2 gap-3 text-[11px] text-[#525252] pt-3.5 mt-2 border-t border-dashed border-neutral-200/80">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-medium text-[#737373]">সর্বনিম্ন ক্রয়:</span>
                                <span className="font-mono tabular-nums font-semibold text-[#111111]">
                                  {Number(coupon.MinPurchaseAmount) > 0 ? `${currencySymbol}${coupon.MinPurchaseAmount}` : 'যেকোনো'}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 justify-end sm:justify-start">
                                <span className="font-medium text-[#737373]">ব্যবহার:</span>
                                <span className="font-mono tabular-nums font-semibold text-[#111111]">
                                  {coupon.UsedCount || 0} / {coupon.UsageLimit > 0 ? coupon.UsageLimit : 'সীমাহীন'}
                                </span>
                              </div>

                              {/* ব্যবহার প্রোগ্রেস বার (যদি UsageLimit থাকে) */}
                              {coupon.UsageLimit > 0 && (
                                <div className="col-span-2 pt-0.5">
                                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        usagePercent >= 90 ? 'bg-[#B91C1C]' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-[#15803D]'
                                      }`}
                                      style={{ width: `${usagePercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {coupon.ExpiryDate && (
                                <div className="flex items-center space-x-1.5 col-span-2 pt-1">
                                  <Clock className={`w-3.5 h-3.5 shrink-0 ${expiry.isUrgent ? 'text-[#B45309]' : expiry.isExpired ? 'text-[#B91C1C]' : 'text-[#737373]'}`} />
                                  <span className="font-medium text-[#737373]">মেয়াদ:</span>
                                  <span className={`font-mono tabular-nums font-semibold ${expiry.isExpired ? 'text-[#B91C1C]' : expiry.isUrgent ? 'text-[#B45309]' : 'text-[#111111]'}`}>
                                    {new Date(coupon.ExpiryDate).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    <span className="text-[10px] ml-1.5 font-medium opacity-80">
                                      ({expiry.text})
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* কার্ড ফুটার ও সম্পাদনা বাটন */}
                        <div className="pt-3.5 mt-2 border-t border-neutral-200/80 flex items-center justify-between relative z-10">
                          <div className="text-[10px] text-[#737373] font-mono tabular-nums font-medium">
                            ID: {coupon.CouponID ? coupon.CouponID.slice(-8) : '-'}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditCoupon(coupon)}
                              title="সম্পাদনা করুন"
                              className="p-2 text-[#525252] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center border border-transparent hover:border-neutral-200/80"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`আপনি কি নিশ্চিত যে '${coupon.CouponCode}' কুপনটি মুছে ফেলতে চান?`)) {
                                  onDeleteCoupon(coupon.CouponID, coupon.CouponCode);
                                }
                              }}
                              title="মুছে ফেলুন"
                              className="p-2 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center border border-transparent hover:border-red-200/80"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ট্যাব ২: নতুন কুপন তৈরি বা সম্পাদনা ফর্ম (Live Ticket Preview) */}
          {/* ========================================================= */}
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ফর্ম কলাম (৭ কলাম) */}
              <div className="lg:col-span-7">
                <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border border-neutral-200/80">
                  
                  {/* ফর্ম হেডার */}
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold tracking-tight text-[#111111]">
                          {formData.CouponID ? 'কুপন সম্পাদনা করুন' : 'নতুন কুপন কনফিগারেশন'}
                        </h3>
                        <p className="text-[11px] text-[#525252] font-medium">
                          প্রয়োজনীয় ফিল্ডগুলো পূরণ করুন ও স্বয়ংক্রিয় প্রিভিউ দেখুন
                        </p>
                      </div>
                    </div>
                    {formData.CouponID && (
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="text-xs font-medium text-[#0F172A] hover:underline cursor-pointer"
                      >
                        নতুন তৈরিতে ফিরুন
                      </button>
                    )}
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200/80 text-[#B91C1C] text-xs font-medium rounded-md flex items-center space-x-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* ১. কুপন কোড ও স্মার্ট জেনারেটর */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#111111]">
                      কুপন কোড <span className="text-[#B91C1C]">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Ticket className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.CouponCode}
                          onChange={(e) => setFormData({ ...formData, CouponCode: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                          placeholder="যেমন: EID2026, SUMMER10, PROMO50"
                          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold uppercase tracking-wider bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateRandomCode()}
                        className="px-4 py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] text-xs font-medium rounded-md border border-neutral-200/80 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[36px]"
                        title="র‍্যান্ডম কোড তৈরি করুন"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-[#0F172A]" />
                        <span>স্মার্ট কোড</span>
                      </button>
                    </div>

                    {/* কুইক কোড প্রিসেট বাটনসমূহ */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[10px] font-medium text-[#737373] mr-1">দ্রুত টেমপ্লেট:</span>
                      {['EID20', 'DISC10', 'SAVE50', 'VIP15', 'MEGA100'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, CouponCode: preset }))}
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono tabular-nums font-medium bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#111111] transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ২. প্রযোজ্য ক্ষেত্র (Applicability Scope) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#111111]">
                      প্রযোজ্য পণ্যের ক্ষেত্র <span className="text-[#B91C1C]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      
                      {/* সার্বজনীন / সকল পণ্য */}
                      <label
                        className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                          formData.ApplicableType === 'AllProducts'
                            ? 'border-[#0F172A] bg-[#F5F5F5]'
                            : 'border-neutral-200/80 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ApplicableType"
                          value="AllProducts"
                          checked={formData.ApplicableType === 'AllProducts'}
                          onChange={() => setFormData({
                            ...formData,
                            ApplicableType: 'AllProducts',
                            ProductID: '',
                            ProductName: 'সকল পণ্য',
                          })}
                          className="mt-0.5 text-[#0F172A] focus:ring-[#0F172A] shrink-0"
                        />
                        <div className="ml-3">
                          <div className="flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#0F172A]" />
                            <span className="text-xs sm:text-sm font-semibold text-[#111111]">সকল পণ্যে প্রযোজ্য</span>
                          </div>
                          <p className="text-[11px] text-[#525252] mt-1 font-medium leading-relaxed">
                            পুরো স্টোরের যেকোনো পণ্য বা মোট অর্ডারের বিলের ওপর এই ছাড় কার্যকর হবে
                          </p>
                        </div>
                      </label>

                      {/* নির্দিষ্ট পণ্য */}
                      <label
                        className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                          formData.ApplicableType === 'SpecificProduct'
                            ? 'border-[#15803D] bg-emerald-50/50'
                            : 'border-neutral-200/80 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ApplicableType"
                          value="SpecificProduct"
                          checked={formData.ApplicableType === 'SpecificProduct'}
                          onChange={() => setFormData({
                            ...formData,
                            ApplicableType: 'SpecificProduct',
                            ProductName: '',
                          })}
                          className="mt-0.5 text-[#15803D] focus:ring-[#15803D] shrink-0"
                        />
                        <div className="ml-3">
                          <div className="flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-[#15803D]" />
                            <span className="text-xs sm:text-sm font-semibold text-[#111111]">নির্দিষ্ট পণ্যে প্রযোজ্য</span>
                          </div>
                          <p className="text-[11px] text-[#525252] mt-1 font-medium leading-relaxed">
                            শুধুমাত্র একটি নির্বাচিত নির্দিষ্ট পণ্যের কেনাকাটার ক্ষেত্রে এই ছাড় প্রযোজ্য হবে
                          </p>
                        </div>
                      </label>

                    </div>
                  </div>

                  {/* ২.১ নির্দিষ্ট পণ্য নির্বাচন ড্রপডাউন ও সার্চ (যখন SpecificProduct সিলেক্টেড) */}
                  {formData.ApplicableType === 'SpecificProduct' && (
                    <div className="p-4 sm:p-5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 space-y-3.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-semibold text-[#111111] flex items-center space-x-1.5">
                          <Package className="w-4 h-4 text-[#15803D]" />
                          <span>পণ্যটি নির্বাচন করুন <span className="text-[#B91C1C]">*</span></span>
                        </label>
                        {formData.ProductID && (
                          <span className="text-[11px] font-medium text-[#15803D] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
                            নির্বাচিত: {formData.ProductName}
                          </span>
                        )}
                      </div>

                      {/* পণ্য খোঁজার ইনপুট */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="পণ্যের নাম, বারকোড বা আইডি সার্চ করুন..."
                          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A] font-medium min-h-[44px] sm:min-h-[36px] text-[#111111]"
                        />
                      </div>

                      {/* পণ্যের তালিকা স্ক্রোল বক্স */}
                      <div className="max-h-52 overflow-y-auto space-y-1.5 bg-white p-2 rounded-lg border border-neutral-200/80 scrollbar-thin">
                        {filteredProductsList.length === 0 ? (
                          <p className="text-xs text-[#737373] p-4 text-center">কোনো পণ্য পাওয়া যায়নি</p>
                        ) : (
                          filteredProductsList.map((p) => {
                            const isSelected = formData.ProductID === p.ProductID;
                            return (
                              <button
                                key={p.ProductID}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    ProductID: p.ProductID,
                                    ProductName: p.ProductName,
                                  });
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-md text-left transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                                  isSelected
                                    ? 'bg-[#0F172A] text-white font-semibold'
                                    : 'hover:bg-[#F5F5F5] text-[#111111]'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  {p.ImageUrl ? (
                                    <img
                                      src={p.ImageUrl}
                                      alt={p.ProductName}
                                      className="w-9 h-9 rounded-md object-cover shrink-0 border border-neutral-200/80"
                                    />
                                  ) : (
                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-800' : 'bg-[#F5F5F5]'}`}>
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold truncate leading-tight">{p.ProductName}</p>
                                    <p className={`text-[10px] mt-0.5 font-mono tabular-nums ${isSelected ? 'text-slate-300' : 'text-[#737373]'}`}>
                                      আইডি: {p.ProductID} | মজুত: {p.StockQuantity || 0} {p.Unit || 'Pcs'}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 pl-3">
                                  <span className="text-xs font-mono tabular-nums font-semibold">
                                    {currencySymbol}{p.SellingPrice}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* ৩. ছাড়ের ধরন ও পরিমাণ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">
                        ছাড়ের ধরন <span className="text-[#B91C1C]">*</span>
                      </label>
                      <select
                        value={formData.DiscountType}
                        onChange={(e) => setFormData({ ...formData, DiscountType: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                      >
                        <option value="Percentage">শতাংশ (%) / Percentage</option>
                        <option value="Fixed">নির্দিষ্ট টাকা ({currencySymbol}) / Fixed Amount</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">
                        ছাড়ের পরিমাণ {formData.DiscountType === 'Percentage' ? '(%)' : `(${currencySymbol})`} <span className="text-[#B91C1C]">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] font-mono font-semibold text-xs sm:text-sm">
                          {formData.DiscountType === 'Percentage' ? '%' : currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          max={formData.DiscountType === 'Percentage' ? '100' : undefined}
                          value={formData.DiscountValue}
                          onChange={(e) => setFormData({ ...formData, DiscountValue: e.target.value })}
                          placeholder={formData.DiscountType === 'Percentage' ? 'যেমন: 10' : 'যেমন: 100'}
                          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* ৪. শর্তাবলী: সর্বনিম্ন ক্রয়, সর্বোচ্চ ছাড় সীমা */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">
                        সর্বনিম্ন ক্রয়ের পরিমাণ ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.MinPurchaseAmount}
                        onChange={(e) => setFormData({ ...formData, MinPurchaseAmount: e.target.value })}
                        placeholder="ঐচ্ছিক (ডিফল্ট: ০)"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                      />
                      <p className="text-[10px] text-[#737373] font-medium">০ দিলে যেকোনো পরিমাণের অর্ডারে কার্যকর হবে</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">
                        সর্বোচ্চ ছাড়ের সিলিং/ক্যাপ ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={formData.DiscountType !== 'Percentage'}
                        value={formData.MaxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, MaxDiscountAmount: e.target.value })}
                        placeholder={formData.DiscountType === 'Percentage' ? 'ঐচ্ছিক (যেমন: 200)' : 'শুধুমাত্র শতাংশে প্রযোজ্য'}
                        className={`w-full px-3.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold border rounded-md transition-colors focus:outline-none min-h-[44px] sm:min-h-[36px] ${
                          formData.DiscountType === 'Percentage'
                            ? 'bg-[#FAFAFA] border-neutral-200/80 focus:bg-white focus:border-[#0F172A] text-[#111111]'
                            : 'bg-[#F5F5F5] border-neutral-200/80 text-[#737373] cursor-not-allowed'
                        }`}
                      />
                      <p className="text-[10px] text-[#737373] font-medium">শতাংশ ছাড়ের ক্ষেত্রে সর্বোচ্চ ছাড়ের সীমা</p>
                    </div>
                  </div>

                  {/* ৫. ব্যবহারের সীমা ও মেয়াদ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">
                        ব্যবহারের সর্বোচ্চ মোট সীমা
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.UsageLimit}
                        onChange={(e) => setFormData({ ...formData, UsageLimit: e.target.value })}
                        placeholder="০ দিলে সীমাহীন ব্যবহার"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">
                        মেয়াদ উত্তীর্ণের তারিখ
                      </label>
                      <input
                        type="date"
                        value={formData.ExpiryDate}
                        onChange={(e) => setFormData({ ...formData, ExpiryDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-semibold bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors min-h-[44px] sm:min-h-[36px] text-[#111111]"
                      />
                    </div>
                  </div>

                  {/* ৬. স্ট্যাটাস নির্বাচন */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#111111]">
                      কুপন স্ট্যাটাস
                    </label>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2.5 text-xs sm:text-sm font-medium text-[#111111] cursor-pointer min-h-[36px]">
                        <input
                          type="radio"
                          name="Status"
                          value="Active"
                          checked={formData.Status === 'Active'}
                          onChange={() => setFormData({ ...formData, Status: 'Active' })}
                          className="w-4 h-4 text-[#15803D] focus:ring-[#15803D]"
                        />
                        <span>সক্রিয় (Active)</span>
                      </label>
                      <label className="flex items-center space-x-2.5 text-xs sm:text-sm font-medium text-[#525252] cursor-pointer min-h-[36px]">
                        <input
                          type="radio"
                          name="Status"
                          value="Inactive"
                          checked={formData.Status === 'Inactive'}
                          onChange={() => setFormData({ ...formData, Status: 'Inactive' })}
                          className="w-4 h-4 text-[#525252] focus:ring-[#0F172A]"
                        />
                        <span>নিষ্ক্রিয় (Inactive)</span>
                      </label>
                    </div>
                  </div>

                  {/* সাবমিট অ্যাকশন বাটনসমূহ */}
                  <div className="pt-4 border-t border-neutral-200/80 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetForm();
                        setActiveTab('list');
                      }}
                      className="px-4 py-2 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#525252] text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50 min-h-[44px] sm:min-h-[36px]"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>সংরক্ষণ হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{formData.CouponID ? 'আপডেট সংরক্ষণ করুন' : 'কুপন তৈরি করুন'}</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>

              {/* ডান কলাম: লাইভ প্রিভিউ ভাউচার (৫ কলাম) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-6">
                  
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#111111] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0F172A]" />
                      <span>লাইভ ভাউচার টিকেট প্রিভিউ</span>
                    </span>
                    <span className="text-[10px] font-medium text-[#15803D] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
                      রিয়েল-টাইম
                    </span>
                  </div>

                  {/* পারফোরেটেড টিকেট প্রিভিউ কার্ড */}
                  <div className="relative overflow-hidden rounded-lg bg-[#0F172A] text-white p-6 border border-slate-800">
                    <div className="relative z-10 space-y-4">
                      
                      {/* টপ ব্যাজ ও ভেরিফাইড অফার রিং */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                          {formData.ApplicableType === 'SpecificProduct' ? 'পণ্যভিত্তিক কুপন' : 'স্টোরওয়াইড কুপন'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>VIP ভাউচার</span>
                        </div>
                      </div>

                      {/* ডিসকাউন্ট হেডার */}
                      <div className="pt-1">
                        <div className="text-3xl sm:text-4xl font-semibold font-mono tabular-nums text-white tracking-tight">
                          {formData.DiscountValue
                            ? formData.DiscountType === 'Percentage'
                              ? `${formData.DiscountValue}% ছাড়`
                              : `${currencySymbol}${formData.DiscountValue} ছাড়`
                            : 'ছাড় নির্ধারণ করুন'}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                          {formData.ApplicableType === 'SpecificProduct'
                            ? formData.ProductName
                              ? `'${formData.ProductName}' পণ্যে প্রযোজ্য`
                              : 'নির্দিষ্ট পণ্য নির্বাচন করুন'
                            : 'স্টোরের সকল পণ্যে অর্ডার মূল্যে প্রযোজ্য'}
                        </p>
                      </div>

                      {/* নির্দিষ্ট পণ্য স্ন্যাপশট */}
                      {selectedProductObj && (
                        <div className="flex items-center gap-3 p-3 rounded-md bg-slate-800/80 border border-slate-700">
                          {selectedProductObj.ImageUrl ? (
                            <img
                              src={selectedProductObj.ImageUrl}
                              alt={selectedProductObj.ProductName}
                              className="w-10 h-10 rounded-md object-cover shrink-0 border border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-slate-700 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-slate-200" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 text-xs">
                            <p className="font-semibold truncate text-white">{selectedProductObj.ProductName}</p>
                            <p className="text-[10px] text-slate-300 font-mono tabular-nums mt-0.5">
                              মূল্য: {currencySymbol}{selectedProductObj.SellingPrice}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* পারফোরেটেড ড্যাশড কাট-আউট লাইন */}
                      <div className="relative my-3">
                        <div className="border-t border-dashed border-slate-700" />
                        <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FAFAFA]" />
                        <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FAFAFA]" />
                      </div>

                      {/* কুপন কোড বক্স */}
                      <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-800/70 border border-slate-700">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">কুপন কোড</div>
                          <div className="text-lg font-mono tabular-nums font-semibold text-amber-300 tracking-widest mt-0.5">
                            {formData.CouponCode || 'CODE123'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(formData.CouponCode)}
                          className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
                          title="কোড কপি করুন"
                        >
                          {copiedCode === formData.CouponCode ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* শর্তাবলীর সারসংক্ষেপ */}
                      <div className="text-[11px] text-slate-300 space-y-1.5 pt-1">
                        {Number(formData.MinPurchaseAmount) > 0 && (
                          <div className="flex justify-between">
                            <span>সর্বনিম্ন কেনাকাটা:</span>
                            <span className="text-white font-mono tabular-nums font-semibold">{currencySymbol}{formData.MinPurchaseAmount}</span>
                          </div>
                        )}
                        {formData.DiscountType === 'Percentage' && Number(formData.MaxDiscountAmount) > 0 && (
                          <div className="flex justify-between">
                            <span>সর্বোচ্চ ছাড়ের সিলিং:</span>
                            <span className="text-white font-mono tabular-nums font-semibold">{currencySymbol}{formData.MaxDiscountAmount}</span>
                          </div>
                        )}
                        {formData.ExpiryDate && (
                          <div className="flex justify-between">
                            <span>মেয়াদ উত্তীর্ণ:</span>
                            <span className="text-white font-mono tabular-nums font-semibold">{formData.ExpiryDate}</span>
                          </div>
                        )}
                        {Number(formData.UsageLimit) > 0 && (
                          <div className="flex justify-between">
                            <span>মোট ব্যবহার সীমা:</span>
                            <span className="text-white font-mono tabular-nums font-semibold">{formData.UsageLimit} বার</span>
                          </div>
                        )}
                      </div>

                      {/* বারকোড স্টাইল ডেকোরেশন লাইন */}
                      <div className="pt-2 flex items-center justify-between opacity-30 select-none">
                        <div className="h-6 flex items-center gap-1 w-full justify-between">
                          {[12, 24, 8, 16, 28, 14, 20, 10, 26, 18, 8, 22, 14, 30, 12, 24, 16, 8, 20, 14, 28].map((h, i) => (
                            <div key={i} className="bg-white rounded-full w-0.5" style={{ height: `${h}px` }} />
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* টিপস কার্ড */}
                  <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-[#B45309] font-medium space-y-1.5 mt-4">
                    <div className="flex items-center gap-1.5 font-semibold text-[#B45309]">
                      <Zap className="w-4 h-4 text-[#B45309]" />
                      <span>ক্লাউড ডাটাবেস অটো-সিঙ্ক:</span>
                    </div>
                    <p className="leading-relaxed">
                      কুপন সংরক্ষণ করলেই তা সরাসরি গুগল শিটের <span className="font-semibold underline">Coupons</span> ট্যাবে সেভ হবে এবং কার্ট ও চেকআউট পেজে গ্রাহকরা স্বয়ংক্রিয়ভাবে ডিসকাউন্ট পাবেন।
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ৪. কুপন অ্যানালিটিক্স ও ব্যবহার রিপোর্ট (GAP 9 সমাধান) */}
          {/* ========================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* ৩টি মূল মেট্রিক্স কার্ড */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 sm:p-5 bg-white rounded-lg border border-neutral-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#525252]">মোট কুপন ব্যবহার</span>
                    <div className="w-8 h-8 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-semibold text-[#111111] font-mono tabular-nums block mt-2">
                    {couponAnalytics.totalUsage} বার
                  </span>
                  <span className="text-[11px] text-[#737373] font-medium mt-0.5 block font-mono tabular-nums">
                    সর্বমোট {couponAnalytics.list.length}টি কুপনের মধ্যে
                  </span>
                </div>

                <div className="p-4 sm:p-5 bg-white rounded-lg border border-neutral-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#525252]">মোট ছাড় দেওয়া হয়েছে</span>
                    <div className="w-8 h-8 rounded-md bg-red-50 border border-red-200/80 text-[#B91C1C] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-semibold text-[#B91C1C] font-mono tabular-nums block mt-2">
                    {currencySymbol}{couponAnalytics.totalDiscountGiven.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-[#737373] font-medium mt-0.5 block">
                    গ্রাহকদের দেওয়া মোট ডিসকাউন্ট মূল্য
                  </span>
                </div>

                <div className="p-4 sm:p-5 bg-white rounded-lg border border-neutral-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#525252]">কুপনের মাধ্যমে মোট বিক্রয়</span>
                    <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200/80 text-[#15803D] flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-semibold text-[#15803D] font-mono tabular-nums block mt-2">
                    {currencySymbol}{couponAnalytics.totalSalesGenerated.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-[#737373] font-medium mt-0.5 block">
                    কুপন ব্যবহার করে অর্জিত মোট রেভেনিউ
                  </span>
                </div>
              </div>

              {/* কুপন পারফরম্যান্স বিশ্লেষণ টেবিল */}
              <div className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-[#0F172A]" />
                    <h3 className="text-sm font-semibold tracking-tight text-[#111111]">কুপনভিত্তিক বিস্তারিত কার্যকারিতা তালিকা</h3>
                  </div>
                  <span className="text-xs font-medium text-[#525252] font-mono tabular-nums">
                    মোট {couponAnalytics.list.length}টি কুপন বিশ্লেষিত
                  </span>
                </div>

                {couponAnalytics.list.length === 0 ? (
                  <div className="p-8 text-center text-[#737373] text-xs font-medium">
                    এখনও কোনো কুপন তৈরি বা ব্যবহার করা হয়নি।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F5F5F5] text-[#525252] text-[11px] font-semibold uppercase tracking-wider border-b border-neutral-200/80">
                        <tr>
                          <th className="py-3 px-4">কুপন কোড</th>
                          <th className="py-3 px-4">অফার টাইপ</th>
                          <th className="py-3 px-4 text-center">ব্যবহার সংখ্যা</th>
                          <th className="py-3 px-4 text-right">মোট ছাড়</th>
                          <th className="py-3 px-4 text-right">মোট বিক্রয়</th>
                          <th className="py-3 px-4 text-center">শেষ ব্যবহারের তারিখ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/80">
                        {couponAnalytics.list.map((item, idx) => (
                          <tr key={item.code} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono tabular-nums font-semibold text-xs px-2.5 py-1 rounded-md bg-[#F5F5F5] text-[#111111] border border-neutral-200/80">
                                  {item.code}
                                </span>
                                {idx === 0 && item.usageCount > 0 && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-[#B45309] border border-amber-200/80 flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    <span>সেরা জনপ্রিয়</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#525252]">
                              {item.coupon ? (
                                item.coupon.DiscountType === 'Percentage'
                                  ? `${item.coupon.DiscountValue}% ছাড়`
                                  : `${currencySymbol}${item.coupon.DiscountValue} ফ্ল্যাট ছাড়`
                              ) : (
                                'পূর্বের কুপন'
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono tabular-nums font-semibold text-[#111111]">
                              {item.usageCount} বার
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#B91C1C]">
                              {currencySymbol}{item.totalDiscount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#15803D]">
                              {currencySymbol}{item.totalRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center text-[#525252] font-mono tabular-nums text-[11px]">
                              {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString() : 'ব্যবহার হয়নি'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
