import React, { useState, useMemo } from 'react';
import { 
  X, 
  CalendarClock, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search, 
  ShoppingCart, 
  Printer, 
  Trash2, 
  ArrowUpRight,
  TrendingDown,
  Layers,
  Sparkles,
  PackageCheck,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { calculateExpiryStatus } from '../services/storage';

export default function ExpiryAlertModal({
  isOpen,
  onClose,
  embedded = false,
  products = [],
  currencySymbol = '৳',
  onAddToCart,
  onQuickRestock,
  onEditProduct
}) {
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'EXPIRED' | '7_DAYS' | '15_DAYS' | '30_DAYS'
  const [searchQuery, setSearchQuery] = useState('');

  // মেয়াদ তথ্যসহ পণ্য বিশ্লেষণ
  const analyzedProducts = useMemo(() => {
    const list = [];
    (products || []).forEach((p) => {
      if (!p.ExpiryDate) return;
      const expiry = calculateExpiryStatus(p.ExpiryDate);
      list.push({
        ...p,
        expiry
      });
    });

    // সর্টিং: মেয়াদোত্তীর্ণ পণ্য সবার আগে, তারপর যেগুলোর মেয়াদ সবচেয়ে কাছে
    return list.sort((a, b) => {
      const daysA = a.expiry.daysLeft !== null ? a.expiry.daysLeft : 99999;
      const daysB = b.expiry.daysLeft !== null ? b.expiry.daysLeft : 99999;
      return daysA - daysB;
    });
  }, [products]);

  // ফিল্টার করা পণ্য তালিকা
  const filteredProducts = useMemo(() => {
    return analyzedProducts.filter((p) => {
      // সার্চ ফিল্টার
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.Barcode && String(p.Barcode).toLowerCase().includes(q)) ||
        (p.BatchNumber && String(p.BatchNumber).toLowerCase().includes(q)) ||
        (p.Category && p.Category.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const days = p.expiry.daysLeft;

      if (filterTab === 'EXPIRED') {
        return p.expiry.status === 'EXPIRED';
      }
      if (filterTab === '7_DAYS') {
        return days !== null && days >= 0 && days <= 7;
      }
      if (filterTab === '15_DAYS') {
        return days !== null && days >= 0 && days <= 15;
      }
      if (filterTab === '30_DAYS') {
        return days !== null && days >= 0 && days <= 30;
      }

      // 'ALL': শুধুমাত্র মেয়াদোত্তীর্ণ বা ৩০ দিনের মধ্যে মেয়াদ শেষ এমন পণ্য
      return p.expiry.status === 'EXPIRED' || (days !== null && days <= 60);
    });
  }, [analyzedProducts, filterTab, searchQuery]);

  // মেট্রিক্স সামারি হিসাব
  const metrics = useMemo(() => {
    let expiredCount = 0;
    let expiredLoss = 0;
    let within7DaysCount = 0;
    let within30DaysCount = 0;

    analyzedProducts.forEach((p) => {
      const days = p.expiry.daysLeft;
      const stock = Number(p.StockQuantity) || 0;
      const cost = Number(p.CostPrice) || 0;

      if (p.expiry.status === 'EXPIRED') {
        expiredCount++;
        if (stock > 0) {
          expiredLoss += stock * cost;
        }
      } else if (days !== null) {
        if (days <= 7) within7DaysCount++;
        if (days <= 30) within30DaysCount++;
      }
    });

    return {
      expiredCount,
      expiredLoss,
      within7DaysCount,
      within30DaysCount,
      totalAlerts: expiredCount + within30DaysCount
    };
  }, [analyzedProducts]);

  // প্রিন্ট হ্যান্ডলার
  const handlePrintList = () => {
    window.print();
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"}>
      <div 
        className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200/90 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden" : "bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"}
        role="dialog"
        aria-modal="true"
      >
        {/* মোডাল হেডার */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-amber-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  ব্যাচ ও মেয়াদোত্তীর্ণ ট্র্যাকিং ও সতর্কতা
                </h3>
                {metrics.totalAlerts > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white animate-pulse">
                    {metrics.totalAlerts}টি সতর্কতা
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                পণ্যের মেয়াদোত্তীর্ণ তারিখ ও ব্যাচ নম্বর অনুযায়ী ক্লিয়ারেন্স সেল এবং অপচয় নিয়ন্ত্রণ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
              embedded
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 border border-slate-200 shadow-xs'
                : 'w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 justify-center'
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

        {/* সামারি মেট্রিক্স কার্ড */}
        <div className="p-4 sm:p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 border-b border-slate-100">
          {/* মেয়াদ শেষ */}
          <div className="p-3 bg-white rounded-2xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-[11px] font-bold">মেয়াদ শেষ (Expired)</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-700">
              {metrics.expiredCount} <span className="text-xs font-semibold text-rose-500">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ক্ষতির ঝুঁকি: <strong className="text-rose-600">{currencySymbol}{metrics.expiredLoss.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* ৭ দিনের মধ্যে */}
          <div className="p-3 bg-white rounded-2xl border border-red-200 shadow-2xs">
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-[11px] font-bold">জরুরি (≤ ৭ দিন)</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-red-700">
              {metrics.within7DaysCount} <span className="text-xs font-semibold text-red-500">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">দ্রুত ছাড় বা ক্লিয়ারেন্স প্রয়োজন</div>
          </div>

          {/* ৩০ দিনের মধ্যে */}
          <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold">আসন্ন (≤ ৩০ দিন)</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-800">
              {metrics.within30DaysCount} <span className="text-xs font-semibold text-amber-600">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">১ মাসের মধ্যে শেষ হবে</div>
          </div>

          {/* মোট নজরদারিতে */}
          <div className="p-3 bg-white rounded-2xl border border-indigo-200 shadow-2xs">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-[11px] font-bold">মোট নজরদারিতে</span>
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-indigo-700">
              {analyzedProducts.length} <span className="text-xs font-semibold text-indigo-500">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">মেয়াদ তারিখ ট্র্যাক করা হচ্ছে</div>
          </div>
        </div>

        {/* সার্চ ও ফিল্টার ট্যাব বার */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          {/* ট্যাব পিলস */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'সকল সতর্কতা', count: metrics.totalAlerts },
              { id: 'EXPIRED', label: 'মেয়াদ শেষ', count: metrics.expiredCount, badgeColor: 'bg-rose-600' },
              { id: '7_DAYS', label: '৭ দিন বাকি', count: metrics.within7DaysCount, badgeColor: 'bg-red-500' },
              { id: '15_DAYS', label: '১৫ দিন বাকি', badgeColor: 'bg-amber-500' },
              { id: '30_DAYS', label: '৩০ দিন বাকি', count: metrics.within30DaysCount, badgeColor: 'bg-yellow-500' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                  filterTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    filterTab === tab.id ? 'bg-white/20 text-white' : `${tab.badgeColor || 'bg-slate-200'} text-white`
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* সার্চ ইনপুট */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য, ব্যাচ বা বারকোড খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* পণ্যের তালিকা (স্ক্রোলেবল টেবিল/কার্ড) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">কোনো ঝুঁকিপূর্ণ পণ্য পাওয়া যায়নি!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                এই ক্যাটাগরিতে কোনো মেয়াদোত্তীর্ণ বা আসন্ন মেয়াদ শেষ হওয়ার মতো পণ্য নেই। আপনার ইনভেন্টরি নিরাপদ।
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const stock = Number(p.StockQuantity) || 0;
              const isExpired = p.expiry.status === 'EXPIRED';

              return (
                <div
                  key={p.ProductID}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isExpired
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : p.expiry.status === 'CRITICAL'
                      ? 'bg-red-50/30 border-red-200 hover:border-red-300'
                      : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                  }`}
                >
                  {/* বাম অংশ: ছবি ও পণ্যের বিবরণ */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                      {p.ImageUrl ? (
                        <img 
                          src={p.ImageUrl} 
                          alt={p.ProductName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {p.ProductName}
                        </h4>
                        {p.HasVariants && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-700">
                            ভ্যারিয়েন্ট
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        {p.BatchNumber && (
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold">
                            ব্যাচ: {p.BatchNumber}
                          </span>
                        )}
                        <span>ক্যাটাগরি: {p.Category}</span>
                        <span>•</span>
                        <span>মজুদ: <strong className={stock <= 0 ? 'text-rose-600' : 'text-slate-800'}>{stock} {p.Unit || 'Pcs'}</strong></span>
                        <span>•</span>
                        <span>মূল্য: {currencySymbol}{Number(p.SellingPrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* ডান অংশ: এক্সপায়ারি ব্যাজ ও অ্যাকশন বাটন */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* এক্সপায়ারি স্ট্যাটাস ব্যাজ */}
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">মেয়াদ: {p.ExpiryDate}</div>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs ${p.expiry.pillClass}`}>
                        {p.expiry.label}
                      </span>
                    </div>

                    {/* অ্যাকশন বাটনসমূহ */}
                    <div className="flex items-center space-x-1.5">
                      {stock > 0 && onAddToCart && (
                        <button
                          type="button"
                          onClick={() => onAddToCart(p)}
                          title="ক্লিয়ারেন্স বিক্রির জন্য কার্টে যোগ করুন"
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>কার্টে নিন</span>
                        </button>
                      )}

                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          title="পণ্য ও স্টক তথ্য সম্পাদনা করুন"
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ফুটার কন্ট্রোল */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            প্রদর্শিত হচ্ছে: <strong className="text-slate-800">{filteredProducts.length}</strong> টি পণ্য
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrintList}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>রিপোর্ট প্রিন্ট</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

