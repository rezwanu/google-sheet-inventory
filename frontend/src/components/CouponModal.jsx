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
  Calendar,
  AlertCircle,
  Percent,
  Package,
  Layers,
  Sparkles,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  Wand2,
  Tag,
  ShieldCheck,
  Zap,
  Gift,
  Flame,
  Award,
  Info,
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
  currencySymbol = '৳',
  onSaveCoupon,
  onDeleteCoupon,
  onRefreshCoupons,
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SPECIFIC' | 'STOREWIDE'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [productSearch, setProductSearch] = useState('');

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
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200/90 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden" : "bg-white rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-200/90 w-full max-w-6xl flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 ring-1 ring-slate-900/5"}>
        
        {/* ========================================================= */}
        {/* ১. প্রিমিয়াম হেডার বার (Balanced Spacing & Ambient Light) */}
        {/* ========================================================= */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100/90 bg-gradient-to-r from-slate-50 via-orange-50/30 to-amber-50/40 relative">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 ring-4 ring-orange-100 shrink-0 transition-transform duration-300 hover:scale-105">
                <Ticket className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    কুপন তৈরি ও অফার ব্যবস্থাপনা
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-900 text-white shadow-2xs">
                      মোট {stats.total}টি
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {stats.active}টি সক্রিয়
                    </span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
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
                  className="p-2.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50/80 rounded-2xl transition-all duration-200 cursor-pointer border border-slate-200/80 hover:border-orange-200 active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`transition-all duration-200 cursor-pointer active:scale-95 flex items-center space-x-1 ${
                  embedded
                    ? 'px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs'
                    : 'p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl'
                }`}
                title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
              >
                {embedded ? (
                  <>
                    <span className="text-sm font-bold">←</span>
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
        {/* ২. সেগমেন্টেড ট্যাব ও ফিল্টার কন্ট্রোলার (Spacious & Tactile) */}
        {/* ========================================================= */}
        <div className="px-6 sm:px-8 py-3.5 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* ট্যাব পিলস */}
          <div className="inline-flex p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-sm shadow-slate-200 scale-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Ticket className="w-4 h-4 text-orange-600" />
              <span>কুপন তালিকা ({stats.total})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setActiveTab('create');
              }}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-orange-600 via-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 scale-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{formData.CouponID ? 'কুপন সম্পাদনা' : 'নতুন কুপন তৈরি'}</span>
            </button>
          </div>

          {/* কুইক ফিল্টার চিপস (তালিকা ট্যাবে) */}
          {activeTab === 'list' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
              <span className="text-slate-400 font-bold text-[11px] mr-1 hidden lg:inline">ফিল্টার:</span>
              <button
                type="button"
                onClick={() => setFilterScope('ALL')}
                className={`px-3.5 py-1.5 rounded-xl font-black transition-all duration-200 cursor-pointer ${
                  filterScope === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70 hover:border-slate-300'
                }`}
              >
                সব ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('ACTIVE')}
                className={`px-3.5 py-1.5 rounded-xl font-black transition-all duration-200 cursor-pointer ${
                  filterScope === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70 hover:border-slate-300'
                }`}
              >
                🟢 সক্রিয় ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('SPECIFIC')}
                className={`px-3.5 py-1.5 rounded-xl font-black transition-all duration-200 cursor-pointer ${
                  filterScope === 'SPECIFIC'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70 hover:border-slate-300'
                }`}
              >
                📦 পণ্যভিত্তিক ({stats.specific})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('STOREWIDE')}
                className={`px-3.5 py-1.5 rounded-xl font-black transition-all duration-200 cursor-pointer ${
                  filterScope === 'STOREWIDE'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70 hover:border-slate-300'
                }`}
              >
                🌐 সকল পণ্য ({stats.storewide})
              </button>
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* ৩. মূল বডি কনটেন্ট (Generous Padding & Flow) */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/70">
          
          {/* ========================================================= */}
          {/* ট্যাব ১: কুপন তালিকা ভিউ (List View with Real Ticket Vibe) */}
          {/* ========================================================= */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              
              {/* সার্চ ও নিউ কুপন একশন বার */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কুপন কোড, পণ্যের নাম বা আইডি দিয়ে খুঁজুন..."
                    className="w-full pl-11 pr-8 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab('create');
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-orange-600/20 flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer shrink-0 active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>নতুন কুপন জেনারেট করুন</span>
                </button>
              </div>

              {/* কুপন কার্ড গ্রিড */}
              {filteredCoupons.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 sm:p-16 text-center shadow-xs">
                  <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-inner ring-4 ring-orange-50/50">
                    <Ticket className="w-10 h-10 stroke-[1.8]" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">কোনো কুপন পাওয়া যায়নি</h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
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
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-orange-600/25 inline-flex items-center space-x-2 transition-all duration-200 cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>প্রথম কুপনটি তৈরি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        className={`bg-white rounded-3xl border transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 ${
                          isInactive || expiry.isExpired || isLimitReached
                            ? 'border-slate-200/90 bg-slate-50/70 opacity-85'
                            : 'border-orange-100 hover:border-orange-300 shadow-sm'
                        }`}
                      >
                        {/* কার্ডের ডান কোণায় ওয়াটারমার্ক আইকন */}
                        <div className="absolute -right-4 -bottom-4 text-slate-100 pointer-events-none group-hover:text-orange-50/70 transition-colors duration-300">
                          <Ticket className="w-28 h-28 stroke-[0.7] rotate-12" />
                        </div>

                        <div>
                          {/* টপ হেডার: কোড পিল + স্কোপ ব্যাজ + স্ট্যাটাস */}
                          <div className="flex items-start justify-between gap-2.5 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* কুপন কোড পিল */}
                              <div className="inline-flex items-center gap-1.5 bg-slate-950 text-white px-3.5 py-1.5 rounded-xl text-xs font-mono font-black tracking-wider shadow-sm ring-1 ring-white/10">
                                <span>{coupon.CouponCode}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(coupon.CouponCode)}
                                  title="কোড কপি করুন"
                                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer ml-1 p-0.5 rounded-md hover:bg-white/10 active:scale-90"
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
                                <span className="px-3 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1 shadow-2xs">
                                  <Package className="w-3 h-3 text-emerald-600" />
                                  <span className="truncate max-w-[130px]">
                                    {coupon.ProductName || 'পণ্যভিত্তিক'}
                                  </span>
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center space-x-1 shadow-2xs">
                                  <Layers className="w-3 h-3 text-indigo-600" />
                                  <span>সকল পণ্য</span>
                                </span>
                              )}
                            </div>

                            {/* স্ট্যাটাস ব্যাজ */}
                            <div className="shrink-0">
                              {expiry.isExpired ? (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                  মেয়াদোত্তীর্ণ
                                </span>
                              ) : isLimitReached ? (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                  সীমা পূর্ণ
                                </span>
                              ) : isInactive ? (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  নিষ্ক্রিয়
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  সক্রিয়
                                </span>
                              )}
                            </div>
                          </div>

                          {/* মূল ডিসকাউন্ট সংখ্যা */}
                          <div className="my-3">
                            <div className="flex items-baseline space-x-2">
                              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                {isPercentage ? `${coupon.DiscountValue}% ছাড়` : `${currencySymbol}${coupon.DiscountValue} ছাড়`}
                              </span>
                              {isPercentage && Number(coupon.MaxDiscountAmount) > 0 && (
                                <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                                  সর্বোচ্চ {currencySymbol}{coupon.MaxDiscountAmount}
                                </span>
                              )}
                            </div>

                            {/* নির্দিষ্ট পণ্য প্রিভিউ বক্স (যদি SpecificProduct হয়) */}
                            {isSpecific && (
                              <div className="mt-3 flex items-center space-x-3 text-xs text-slate-700 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
                                {targetProduct?.ImageUrl ? (
                                  <img
                                    src={targetProduct.ImageUrl}
                                    alt={coupon.ProductName}
                                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-900 truncate text-xs">
                                    {coupon.ProductName || targetProduct?.ProductName || 'নির্দিষ্ট পণ্য'}
                                  </p>
                                  {targetProduct && (
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                      মূল্য: {currencySymbol}{targetProduct.SellingPrice}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* শর্ত ও ব্যবহার ট্র্যাকিং গ্রিড */}
                            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 pt-3.5 mt-2 border-t border-dashed border-slate-200">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-slate-400">সর্বনিম্ন ক্রয়:</span>
                                <span className="font-black text-slate-800">
                                  {Number(coupon.MinPurchaseAmount) > 0 ? `${currencySymbol}${coupon.MinPurchaseAmount}` : 'যেকোনো'}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 justify-end sm:justify-start">
                                <span className="font-semibold text-slate-400">ব্যবহার:</span>
                                <span className="font-black text-slate-800">
                                  {coupon.UsedCount || 0} / {coupon.UsageLimit > 0 ? coupon.UsageLimit : 'সীমাহীন'}
                                </span>
                              </div>

                              {/* ব্যবহার প্রোগ্রেস বার (যদি UsageLimit থাকে) */}
                              {coupon.UsageLimit > 0 && (
                                <div className="col-span-2 pt-0.5">
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${usagePercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {coupon.ExpiryDate && (
                                <div className="flex items-center space-x-1.5 col-span-2 pt-1">
                                  <Clock className={`w-3.5 h-3.5 shrink-0 ${expiry.isUrgent ? 'text-amber-500' : expiry.isExpired ? 'text-rose-500' : 'text-slate-400'}`} />
                                  <span className="font-semibold text-slate-400">মেয়াদ:</span>
                                  <span className={`font-black ${expiry.isExpired ? 'text-rose-600' : expiry.isUrgent ? 'text-amber-600 font-black' : 'text-slate-800'}`}>
                                    {new Date(coupon.ExpiryDate).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    <span className="text-[10px] ml-1.5 font-bold opacity-80">
                                      ({expiry.text})
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* কার্ড ফুটার ও সম্পাদনা বাটন */}
                        <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between relative z-10">
                          <div className="text-[10px] text-slate-400 font-mono font-medium">
                            ID: {coupon.CouponID ? coupon.CouponID.slice(-8) : '-'}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditCoupon(coupon)}
                              title="সম্পাদনা করুন"
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
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
                              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ফর্ম কলাম (৭ কলাম) */}
              <div className="lg:col-span-7">
                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
                  
                  {/* ফর্ম হেডার */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900">
                          {formData.CouponID ? 'কুপন সম্পাদনা করুন' : 'নতুন কুপন কনফিগারেশন'}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          প্রয়োজনীয় ফিল্ডগুলো পূরণ করুন ও স্বয়ংক্রিয় প্রিভিউ দেখুন
                        </p>
                      </div>
                    </div>
                    {formData.CouponID && (
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                      >
                        নতুন তৈরিতে ফিরুন
                      </button>
                    )}
                  </div>

                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center space-x-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* ১. কুপন কোড ও স্মার্ট জেনারেটর */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      কুপন কোড <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Ticket className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.CouponCode}
                          onChange={(e) => setFormData({ ...formData, CouponCode: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                          placeholder="যেমন: EID2026, SUMMER10, PROMO50"
                          className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm font-mono font-black uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateRandomCode()}
                        className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 text-orange-800 text-xs font-black rounded-2xl border border-orange-200/80 flex items-center space-x-1.5 transition-all duration-200 cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                        title="র‍্যান্ডম কোড তৈরি করুন"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-orange-600 animate-spin-once" />
                        <span>স্মার্ট কোড</span>
                      </button>
                    </div>

                    {/* কুইক কোড প্রিসেট বাটনসমূহ */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">দ্রুত টেমপ্লেট:</span>
                      {['EID20', 'DISC10', 'SAVE50', 'VIP15', 'MEGA100'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, CouponCode: preset }))}
                          className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ২. প্রযোজ্য ক্ষেত্র (Applicability Scope) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      প্রযোজ্য পণ্যের ক্ষেত্র <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      
                      {/* সার্বজনীন / সকল পণ্য */}
                      <label
                        className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                          formData.ApplicableType === 'AllProducts'
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
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
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <div className="ml-3">
                          <div className="flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-xs sm:text-sm font-black text-slate-900">সকল পণ্যে প্রযোজ্য</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                            পুরো স্টোরের যেকোনো পণ্য বা মোট অর্ডারের বিলের ওপর এই ছাড় কার্যকর হবে
                          </p>
                        </div>
                      </label>

                      {/* নির্দিষ্ট পণ্য */}
                      <label
                        className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                          formData.ApplicableType === 'SpecificProduct'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
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
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <div className="ml-3">
                          <div className="flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs sm:text-sm font-black text-slate-900">নির্দিষ্ট পণ্যে প্রযোজ্য</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                            শুধুমাত্র একটি নির্বাচিত নির্দিষ্ট পণ্যের কেনাকাটার ক্ষেত্রে এই ছাড় প্রযোজ্য হবে
                          </p>
                        </div>
                      </label>

                    </div>
                  </div>

                  {/* ২.১ নির্দিষ্ট পণ্য নির্বাচন ড্রপডাউন ও সার্চ (যখন SpecificProduct সিলেক্টেড) */}
                  {formData.ApplicableType === 'SpecificProduct' && (
                    <div className="p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-emerald-950 flex items-center space-x-1.5">
                          <Package className="w-4 h-4 text-emerald-600" />
                          <span>পণ্যটি নির্বাচন করুন <span className="text-rose-500">*</span></span>
                        </label>
                        {formData.ProductID && (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            নির্বাচিত: {formData.ProductName}
                          </span>
                        )}
                      </div>

                      {/* পণ্য খোঁজার ইনপুট */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="পণ্যের নাম, বারকোড বা আইডি সার্চ করুন..."
                          className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-semibold"
                        />
                      </div>

                      {/* পণ্যের তালিকা স্ক্রোল বক্স */}
                      <div className="max-h-52 overflow-y-auto space-y-1.5 bg-white p-2 rounded-2xl border border-emerald-200/80 scrollbar-thin">
                        {filteredProductsList.length === 0 ? (
                          <p className="text-xs text-slate-400 p-4 text-center">কোনো পণ্য পাওয়া যায়নি</p>
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
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  {p.ImageUrl ? (
                                    <img
                                      src={p.ImageUrl}
                                      alt={p.ProductName}
                                      className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200"
                                    />
                                  ) : (
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate leading-tight">{p.ProductName}</p>
                                    <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                      আইডি: {p.ProductID} | মজুত: {p.StockQuantity || 0} {p.Unit || 'Pcs'}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 pl-3">
                                  <span className="text-xs font-black">
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
                      <label className="block text-xs font-bold text-slate-700">
                        ছাড়ের ধরন <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.DiscountType}
                        onChange={(e) => setFormData({ ...formData, DiscountType: e.target.value })}
                        className="w-full px-4 py-3 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                      >
                        <option value="Percentage">শতাংশ (%) / Percentage</option>
                        <option value="Fixed">নির্দিষ্ট টাকা ({currencySymbol}) / Fixed Amount</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        ছাড়ের পরিমাণ {formData.DiscountType === 'Percentage' ? '(%)' : `(${currencySymbol})`} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">
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
                          className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* ৪. শর্তাবলী: সর্বনিম্ন ক্রয়, সর্বোচ্চ ছাড় সীমা */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        সর্বনিম্ন ক্রয়ের পরিমাণ ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.MinPurchaseAmount}
                        onChange={(e) => setFormData({ ...formData, MinPurchaseAmount: e.target.value })}
                        placeholder="ঐচ্ছিক (ডিফল্ট: ০)"
                        className="w-full px-4 py-3 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">০ দিলে যেকোনো পরিমাণের অর্ডারে কার্যকর হবে</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        সর্বোচ্চ ছাড়ের সিলিং/ক্যাপ ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={formData.DiscountType !== 'Percentage'}
                        value={formData.MaxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, MaxDiscountAmount: e.target.value })}
                        placeholder={formData.DiscountType === 'Percentage' ? 'ঐচ্ছিক (যেমন: 200)' : 'শুধুমাত্র শতাংশে প্রযোজ্য'}
                        className={`w-full px-4 py-3 text-xs sm:text-sm font-bold border rounded-2xl transition-all duration-200 focus:outline-hidden ${
                          formData.DiscountType === 'Percentage'
                            ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                      <p className="text-[10px] text-slate-400 font-medium">শতাংশ ছাড়ের ক্ষেত্রে সর্বোচ্চ ছাড়ের সীমা</p>
                    </div>
                  </div>

                  {/* ৫. ব্যবহারের সীমা ও মেয়াদ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        ব্যবহারের সর্বোচ্চ মোট সীমা
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.UsageLimit}
                        onChange={(e) => setFormData({ ...formData, UsageLimit: e.target.value })}
                        placeholder="০ দিলে সীমাহীন ব্যবহার"
                        className="w-full px-4 py-3 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        মেয়াদ উত্তীর্ণের তারিখ
                      </label>
                      <input
                        type="date"
                        value={formData.ExpiryDate}
                        onChange={(e) => setFormData({ ...formData, ExpiryDate: e.target.value })}
                        className="w-full px-4 py-3 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* ৬. স্ট্যাটাস নির্বাচন */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      কুপন স্ট্যাটাস
                    </label>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2.5 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer">
                        <input
                          type="radio"
                          name="Status"
                          value="Active"
                          checked={formData.Status === 'Active'}
                          onChange={() => setFormData({ ...formData, Status: 'Active' })}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>সক্রিয় (Active)</span>
                      </label>
                      <label className="flex items-center space-x-2.5 text-xs sm:text-sm font-bold text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="Status"
                          value="Inactive"
                          checked={formData.Status === 'Inactive'}
                          onChange={() => setFormData({ ...formData, Status: 'Inactive' })}
                          className="w-4 h-4 text-slate-600 focus:ring-slate-500"
                        />
                        <span>নিষ্ক্রিয় (Inactive)</span>
                      </label>
                    </div>
                  </div>

                  {/* সাবমিট অ্যাকশন বাটনসমূহ */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetForm();
                        setActiveTab('list');
                      }}
                      className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-bold hover:bg-slate-50 transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-orange-600/25 transition-all duration-200 flex items-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>সংরক্ষণ হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                          <span>{formData.CouponID ? 'আপডেট সংরক্ষণ করুন' : 'কুপন তৈরি করুন'}</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>

              {/* ডান কলাম: লাইভ প্রিভিউ ভাউচার (৫ কলাম - Luxury SaaS Ticket) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="sticky top-6">
                  
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <span>লাইভ ভাউচার টিকেট প্রিভিউ</span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      রিয়েল-টাইম
                    </span>
                  </div>

                  {/* পারফোরেটেড টিকেট প্রিভিউ কার্ড */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-white p-6 shadow-2xl border border-slate-800">
                    
                    {/* ডেকোরেশন অ্যাম্বিয়েন্ট গ্লো */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-500/25 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-10 -top-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-4.5">
                      
                      {/* টপ ব্যাজ ও ভেরিফাইড অফার রিং */}
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30 shadow-2xs">
                          {formData.ApplicableType === 'SpecificProduct' ? '🏷️ পণ্যভিত্তিক কুপন' : '🌐 স্টোরওয়াইড কুপন'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>VIP ভাউচার</span>
                        </div>
                      </div>

                      {/* ডিসকাউন্ট হেডার */}
                      <div className="pt-1">
                        <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-white tracking-tight">
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
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                          {selectedProductObj.ImageUrl ? (
                            <img
                              src={selectedProductObj.ImageUrl}
                              alt={selectedProductObj.ProductName}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-orange-300" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 text-xs">
                            <p className="font-bold truncate text-white">{selectedProductObj.ProductName}</p>
                            <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                              মূল্য: {currencySymbol}{selectedProductObj.SellingPrice}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* পারফোরেটেড ড্যাশড কাট-আউট লাইন */}
                      <div className="relative my-3">
                        <div className="border-t border-dashed border-slate-700/80" />
                        <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 shadow-inner" />
                        <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 shadow-inner" />
                      </div>

                      {/* কুপন কোড বক্স */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">কুপন কোড</div>
                          <div className="text-lg font-mono font-black text-amber-300 tracking-widest mt-0.5">
                            {formData.CouponCode || 'CODE123'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(formData.CouponCode)}
                          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer active:scale-95"
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
                      <div className="text-[11px] text-slate-400 space-y-1.5 pt-1">
                        {Number(formData.MinPurchaseAmount) > 0 && (
                          <div className="flex justify-between">
                            <span>সর্বনিম্ন কেনাকাটা:</span>
                            <span className="text-slate-200 font-bold">{currencySymbol}{formData.MinPurchaseAmount}</span>
                          </div>
                        )}
                        {formData.DiscountType === 'Percentage' && Number(formData.MaxDiscountAmount) > 0 && (
                          <div className="flex justify-between">
                            <span>সর্বোচ্চ ছাড়ের সিলিং:</span>
                            <span className="text-slate-200 font-bold">{currencySymbol}{formData.MaxDiscountAmount}</span>
                          </div>
                        )}
                        {formData.ExpiryDate && (
                          <div className="flex justify-between">
                            <span>মেয়াদ উত্তীর্ণ:</span>
                            <span className="text-slate-200 font-bold">{formData.ExpiryDate}</span>
                          </div>
                        )}
                        {Number(formData.UsageLimit) > 0 && (
                          <div className="flex justify-between">
                            <span>মোট ব্যবহার সীমা:</span>
                            <span className="text-slate-200 font-bold">{formData.UsageLimit} বার</span>
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
                  <div className="p-4 bg-orange-50/80 border border-orange-200/90 rounded-2xl text-[11px] text-orange-950 font-medium space-y-1.5 mt-4 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-black text-orange-900">
                      <Zap className="w-4 h-4 text-orange-600" />
                      <span>ক্লাউড ডাটাবেস অটো-সিঙ্ক:</span>
                    </div>
                    <p className="leading-relaxed text-orange-900/90">
                      কুপন সংরক্ষণ করলেই তা সরাসরি গুগল শিটের <span className="font-bold underline">Coupons</span> ট্যাবে সেভ হবে এবং কার্ট ও চেকআউট পেজে গ্রাহকরা স্বয়ংক্রিয়ভাবে ডিসকাউন্ট পাবেন।
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
