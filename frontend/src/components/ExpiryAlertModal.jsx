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
  ArrowUpRight,
  Layers,
  PackageCheck,
  ShieldAlert,
  Trash2,
  RotateCcw
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
  onEditProduct,
  onWriteOffDamage,
  onReturnToSupplier
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
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-900/40 animate-in fade-in duration-200"}>
      <div 
        className={embedded ? "bg-white rounded-lg border border-neutral-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden" : "bg-white rounded-lg border border-neutral-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"}
        role="dialog"
        aria-modal="true"
      >
        {/* মোডাল হেডার */}
        <div className="px-6 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA] text-[#111111]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#B91C1C] text-white flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                  ব্যাচ ও মেয়াদোত্তীর্ণ ট্র্যাকিং ও সতর্কতা
                </h3>
                {metrics.totalAlerts > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-semibold bg-red-50 text-[#B91C1C] border border-red-200">
                    {metrics.totalAlerts}টি সতর্কতা
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-[#525252]">
                পণ্যের মেয়াদোত্তীর্ণ তারিখ ও ব্যাচ নম্বর অনুযায়ী ক্লিয়ারেন্স সেল এবং অপচয় নিয়ন্ত্রণ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] sm:min-h-[36px] rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
              embedded
                ? 'bg-white hover:bg-[#F5F5F5] text-[#111111] font-semibold text-xs px-3 py-1.5 border border-neutral-200/80'
                : 'min-w-[44px] sm:min-w-[36px] p-2 text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] justify-center'
            }`}
            title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
          >
            {embedded ? (
              <>
                <span className="text-sm font-semibold">←</span>
                <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
              </>
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* সামারি মেট্রিক্স কার্ড */}
        <div className="p-4 sm:p-6 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAFAFA] border-b border-neutral-200/80">
          {/* মেয়াদ শেষ */}
          <div className="p-3 bg-white rounded-lg border border-red-200">
            <div className="flex items-center justify-between text-[#B91C1C] mb-1">
              <span className="text-[11px] font-semibold">মেয়াদ শেষ (Expired)</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-semibold font-mono tabular-nums text-[#B91C1C]">
              {metrics.expiredCount} <span className="text-xs font-sans font-medium text-[#525252]">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-[#525252] mt-0.5">
              ক্ষতির ঝুঁকি: <strong className="text-[#B91C1C] font-mono tabular-nums">{currencySymbol}{metrics.expiredLoss.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* ৭ দিনের মধ্যে */}
          <div className="p-3 bg-white rounded-lg border border-red-200">
            <div className="flex items-center justify-between text-[#B91C1C] mb-1">
              <span className="text-[11px] font-semibold">জরুরি (≤ ৭ দিন)</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-semibold font-mono tabular-nums text-[#B91C1C]">
              {metrics.within7DaysCount} <span className="text-xs font-sans font-medium text-[#525252]">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-[#525252] mt-0.5">দ্রুত ছাড় বা ক্লিয়ারেন্স প্রয়োজন</div>
          </div>

          {/* ৩০ দিনের মধ্যে */}
          <div className="p-3 bg-white rounded-lg border border-amber-200">
            <div className="flex items-center justify-between text-[#B45309] mb-1">
              <span className="text-[11px] font-semibold">আসন্ন (≤ ৩০ দিন)</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-semibold font-mono tabular-nums text-[#B45309]">
              {metrics.within30DaysCount} <span className="text-xs font-sans font-medium text-[#525252]">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-[#525252] mt-0.5">১ মাসের মধ্যে শেষ হবে</div>
          </div>

          {/* মোট নজরদারিতে */}
          <div className="p-3 bg-white rounded-lg border border-neutral-200/80">
            <div className="flex items-center justify-between text-[#111111] mb-1">
              <span className="text-[11px] font-semibold text-[#525252]">মোট নজরদারিতে</span>
              <PackageCheck className="w-4 h-4 text-[#0F172A]" />
            </div>
            <div className="text-lg sm:text-xl font-semibold font-mono tabular-nums text-[#111111]">
              {analyzedProducts.length} <span className="text-xs font-sans font-medium text-[#525252]">টি পণ্য</span>
            </div>
            <div className="text-[10px] text-[#525252] mt-0.5">মেয়াদ তারিখ ট্র্যাক করা হচ্ছে</div>
          </div>
        </div>

        {/* সার্চ ও ফিল্টার ট্যাব বার */}
        <div className="px-6 py-3 border-b border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          {/* ট্যাব পিলস */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'সকল সতর্কতা', count: metrics.totalAlerts },
              { id: 'EXPIRED', label: 'মেয়াদ শেষ', count: metrics.expiredCount, badgeColor: 'bg-[#B91C1C]' },
              { id: '7_DAYS', label: '৭ দিন বাকি', count: metrics.within7DaysCount, badgeColor: 'bg-[#B91C1C]' },
              { id: '15_DAYS', label: '১৫ দিন বাকি', badgeColor: 'bg-[#B45309]' },
              { id: '30_DAYS', label: '৩০ দিন বাকি', count: metrics.within30DaysCount, badgeColor: 'bg-[#B45309]' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                  filterTab === tab.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:bg-[#F5F5F5] border border-transparent hover:border-neutral-200/80'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-semibold ${
                    filterTab === tab.id ? 'bg-white/20 text-white' : `${tab.badgeColor || 'bg-[#F5F5F5]'} text-white`
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* সার্চ ইনপুট */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য, ব্যাচ বা বারকোড খুঁজুন..."
              className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-1.5 rounded-md border border-neutral-200/80 bg-[#FAFAFA] focus:bg-white text-xs text-[#111111] placeholder-[#737373] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
            />
          </div>
        </div>

        {/* পণ্যের তালিকা */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#FAFAFA]">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-lg border border-neutral-200/80">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-[#111111]">কোনো ঝুঁকিপূর্ণ পণ্য পাওয়া যায়নি!</h4>
              <p className="text-xs text-[#525252] mt-1 max-w-sm mx-auto">
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
                  className={`p-3.5 sm:p-4 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isExpired
                      ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                      : p.expiry.status === 'CRITICAL'
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
                >
                  {/* বাম অংশ: ছবি ও পণ্যের বিবরণ */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-md bg-[#F5F5F5] overflow-hidden shrink-0 border border-neutral-200/80 flex items-center justify-center">
                      {p.ImageUrl ? (
                        <img 
                          src={p.ImageUrl} 
                          alt={p.ProductName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-[#737373]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#111111] truncate">
                          {p.ProductName}
                        </h4>
                        {p.HasVariants && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80">
                            ভ্যারিয়েন্ট
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[#525252]">
                        {p.BatchNumber && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 font-mono tabular-nums font-semibold">
                            ব্যাচ: {p.BatchNumber}
                          </span>
                        )}
                        <span>ক্যাটাগরি: {p.Category}</span>
                        <span>•</span>
                        <span>মজুদ: <strong className={`font-mono tabular-nums ${stock <= 0 ? 'text-[#B91C1C]' : 'text-[#111111]'}`}>{stock} {p.Unit || 'Pcs'}</strong></span>
                        <span>•</span>
                        <span>মূল্য: <span className="font-mono tabular-nums font-semibold text-[#111111]">{currencySymbol}{Number(p.SellingPrice || 0).toLocaleString('en-IN')}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* ডান অংশ: এক্সপায়ারি ব্যাজ ও অ্যাকশন বাটন */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200/80">
                    {/* এক্সপায়ারি স্ট্যাটাস ব্যাজ */}
                    <div className="text-right">
                      <div className="text-[10px] text-[#737373] font-mono tabular-nums font-medium">মেয়াদ: {p.ExpiryDate}</div>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums ${p.expiry.pillClass}`}>
                        {p.expiry.label}
                      </span>
                    </div>

                    {/* অ্যাকশন বাটনসমূহ */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {/* মেয়াদোত্তীর্ণ না হলে এবং স্টক থাকলে ক্লিয়ারেন্স কার্টে নেওয়ার অনুমতি */}
                      {stock > 0 && onAddToCart && !isExpired && (
                        <button
                          type="button"
                          onClick={() => onAddToCart(p)}
                          title="ক্লিয়ারেন্স বিক্রির জন্য কার্টে যোগ করুন"
                          className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>কার্টে নিন</span>
                        </button>
                      )}

                      {/* মেয়াদ শেষ (EXPIRED) পণ্যের জন্য ১-ক্লিক ড্যামেজ রাইট-অফ ও RMA মহাজন রিটার্ন বাটন */}
                      {isExpired && (
                        <>
                          {onWriteOffDamage && (
                            <button
                              type="button"
                              onClick={() => onWriteOffDamage(p)}
                              title="মেয়াদোত্তীর্ণ পণ্য অপচয় ও ড্যামেজ হিসেবে বাতিল করুন"
                              className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md bg-[#B91C1C] hover:bg-red-800 text-white text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ড্যামেজ বাতিল</span>
                            </button>
                          )}
                          {onReturnToSupplier && (
                            <button
                              type="button"
                              onClick={() => onReturnToSupplier(p)}
                              title="মহাজনকে ফেরত পাঠান (RMA Return)"
                              className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md bg-[#B45309] hover:bg-amber-800 text-white text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>মহাজনে ফেরত</span>
                            </button>
                          )}
                        </>
                      )}

                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          title="পণ্য ও স্টক তথ্য সম্পাদনা করুন"
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 rounded-md bg-[#F5F5F5] hover:bg-neutral-200 border border-neutral-200/80 text-[#111111] transition-colors flex items-center justify-center cursor-pointer"
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
        <div className="px-6 py-3.5 border-t border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-between">
          <div className="text-xs text-[#525252] font-medium">
            প্রদর্শিত হচ্ছে: <strong className="text-[#111111] font-mono tabular-nums">{filteredProducts.length}</strong> টি পণ্য
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrintList}
              className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>রিপোর্ট প্রিন্ট</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
