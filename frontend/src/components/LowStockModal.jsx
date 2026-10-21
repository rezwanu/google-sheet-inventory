import React, { useState, useMemo } from 'react';
import {
  X,
  PackageX,
  PlusCircle,
  Search,
  Barcode,
  CheckCircle2,
  Filter,
  ShoppingCart,
  Sparkles,
  Coins,
  ShieldAlert
} from 'lucide-react';

export default function LowStockModal({
  isOpen,
  onClose,
  embedded = false,
  products = [],
  currencySymbol = '৳',
  onQuickRestock,
  onAddToCart
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('STOCK_ASC'); // 'STOCK_ASC' | 'DEFICIT_DESC' | 'PRICE_DESC' | 'NAME_ASC'

  // কম স্টক ও স্টক শেষ পণ্যের তালিকা ফিল্টার করা (StockQuantity <= MinStockAlert)
  const lowStockItems = useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      return stock <= minAlert;
    });
  }, [products]);

  // ফিল্টার করা আইটেমসমূহের মধ্য থেকে উপলব্ধ ক্যাটাগরি তালিকা
  const availableCategories = useMemo(() => {
    const set = new Set();
    lowStockItems.forEach((p) => {
      if (p.Category) set.add(p.Category);
    });
    return ['ALL', ...Array.from(set)];
  }, [lowStockItems]);

  // পরিসংখ্যান ও ফাইন্যান্সিয়াল ঘাটতি হিসাব
  const { outOfStockCount, criticalLowCount, totalDeficitUnits, totalRestockBudget } = useMemo(() => {
    let outCount = 0;
    let critCount = 0;
    let deficitUnits = 0;
    let restockBudget = 0;

    lowStockItems.forEach((p) => {
      const stock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      const cost = Number(p.CostPrice || 0);

      if (stock === 0) {
        outCount += 1;
      } else {
        critCount += 1;
      }

      // ঘাটতি গণনা (মিনিমাম সীমার দ্বিগুণ পরিমাণ সেফ স্টকে নেওয়ার হিসেব)
      const targetStock = Math.max(minAlert * 2, minAlert + 5);
      const needed = Math.max(0, targetStock - stock);
      deficitUnits += needed;
      restockBudget += needed * cost;
    });

    return {
      outOfStockCount: outCount,
      criticalLowCount: critCount,
      totalDeficitUnits: deficitUnits,
      totalRestockBudget: restockBudget
    };
  }, [lowStockItems]);

  // সার্চ, ফিল্টার এবং সর্টিং অনুযায়ী প্রদর্শিত আইটেম তালিকা
  const displayedItems = useMemo(() => {
    const filtered = lowStockItems.filter((p) => {
      const stock = Number(p.StockQuantity || 0);

      // টাইপ ফিল্টার
      if (filterType === 'OUT_OF_STOCK' && stock > 0) return false;
      if (filterType === 'LOW_STOCK' && stock === 0) return false;

      // ক্যাটাগরি ফিল্টার
      if (selectedCategory !== 'ALL' && p.Category !== selectedCategory) return false;

      // সার্চ কুয়েরি
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.Barcode && String(p.Barcode).toLowerCase().includes(q)) ||
        (p.ProductID && p.ProductID.toLowerCase().includes(q)) ||
        (p.Category && p.Category.toLowerCase().includes(q)) ||
        (p.SubCategory && p.SubCategory.toLowerCase().includes(q))
      );
    });

    // সর্টিং লজিক
    return filtered.sort((a, b) => {
      const stockA = Number(a.StockQuantity || 0);
      const stockB = Number(b.StockQuantity || 0);
      const minAlertA = Number(a.MinStockAlert || 5);
      const minAlertB = Number(b.MinStockAlert || 5);
      const deficitA = Math.max(0, minAlertA - stockA);
      const deficitB = Math.max(0, minAlertB - stockB);

      switch (sortBy) {
        case 'STOCK_ASC':
          return stockA - stockB;
        case 'DEFICIT_DESC':
          return deficitB - deficitA;
        case 'PRICE_DESC':
          return Number(b.SellingPrice || 0) - Number(a.SellingPrice || 0);
        case 'NAME_ASC':
          return (a.ProductName || '').localeCompare(b.ProductName || '');
        default:
          return stockA - stockB;
      }
    });
  }, [lowStockItems, filterType, selectedCategory, searchQuery, sortBy]);

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 sm:py-6 animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] overflow-hidden flex flex-col transition-all" : "bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh] transition-all animate-in zoom-in-95 duration-200"}>
        
        {/* মডাল হেডার (Header Bar) */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-amber-50/80 via-rose-50/40 to-white relative select-none">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 ring-4 ring-amber-50">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  কম স্টক পণ্যের তালিকা (Low Stock Alert)
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs">
                  {lowStockItems.length} টি পণ্য
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                যেসব পণ্যের বর্তমান মজুদ নির্ধারিত সতর্কতা সীমার সমান বা নিচে রয়েছে
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 border border-slate-200 shadow-xs'
                  : 'w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 justify-center'
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

        {/* কেপিআই সামারি ও ফিল্টার কার্ডসমূহ (Interactive Filter Cards) */}
        <div className="p-4 sm:px-8 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* কার্ড ১: মোট অ্যালার্ট */}
          <div 
            onClick={() => setFilterType('ALL')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              filterType === 'ALL'
                ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                মোট অ্যালার্ট তালিকা
              </span>
              <span className={`w-2 h-2 rounded-full ${filterType === 'ALL' ? 'bg-amber-500' : 'bg-slate-300'}`} />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-amber-600">
                {lowStockItems.length}
              </span>
              <span className="text-xs text-slate-500 font-semibold">টি পণ্য</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">সবগুলো কম স্টক ও স্টক শেষ আইটেম</p>
          </div>

          {/* কার্ড ২: সম্পূর্ণ স্টক আউট */}
          <div 
            onClick={() => setFilterType('OUT_OF_STOCK')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              filterType === 'OUT_OF_STOCK'
                ? 'bg-white border-rose-500 shadow-md ring-2 ring-rose-500/20'
                : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                স্টক শেষ (০)
              </span>
              {outOfStockCount > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
              )}
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-rose-600">
                {outOfStockCount}
              </span>
              <span className="text-xs text-rose-600 font-semibold">টি পণ্য শূন্য</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">জরুরি ভিত্তিতে নতুন চালান প্রয়োজন</p>
          </div>

          {/* কার্ড ৩: সীমিত মজুত */}
          <div 
            onClick={() => setFilterType('LOW_STOCK')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              filterType === 'LOW_STOCK'
                ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20'
                : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                সীমিত মজুত (সতর্কতা)
              </span>
              <span className={`w-2 h-2 rounded-full ${filterType === 'LOW_STOCK' ? 'bg-teal-500' : 'bg-slate-300'}`} />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-teal-700">
                {criticalLowCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">টি পণ্য ঝুঁকিতে</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">মজুদ অ্যালার্ট সীমার নিচে নেমে গেছে</p>
          </div>

        </div>

        {/* ফাইন্যান্সিয়াল ঘাটতি ও রিস্টক বাজেট রিবন */}
        {lowStockItems.length > 0 && (
          <div className="px-5 sm:px-8 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5" />
                <span>ঘাটতি পূরণে সম্ভাব্য বাজেট:</span>
                <span className="text-white text-sm font-black underline decoration-amber-400">
                  {currencySymbol}{totalRestockBudget.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <div className="text-slate-300 hidden sm:inline">
                প্রয়োজনীয় ন্যূনতম রিফিল: <strong className="text-teal-400 font-bold">+{totalDeficitUnits}</strong> ইউনিট
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>পণ্যভিত্তিক <strong className="text-slate-200 font-semibold">স্টক ইনপুট</strong> বাটনে ক্লিক করে সহজে রিস্টক করুন</span>
            </div>
          </div>
        )}

        {/* সার্চ, ক্যাটাগরি এবং সর্টিং কন্ট্রোল বার */}
        <div className="px-5 sm:px-8 py-3.5 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* সার্চ বক্স */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য, বারকোড বা ক্যাটাগরি..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium placeholder-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ক্যাটাগরি ও সর্ট সিলেক্টর */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end text-xs">
            
            {/* ক্যাটাগরি ফিল্টার */}
            {availableCategories.length > 2 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              >
                <option value="ALL">সব ক্যাটাগরি ({lowStockItems.length})</option>
                {availableCategories.filter(c => c !== 'ALL').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {/* সর্ট সিলেক্টর */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-400 hidden sm:inline">সাজান:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              >
                <option value="STOCK_ASC">স্টক: কম থেকে বেশি</option>
                <option value="DEFICIT_DESC">ঘাটতি: সর্বোচ্চ ঘাটতি</option>
                <option value="PRICE_DESC">বিক্রয়মূল্য: বেশি থেকে কম</option>
                <option value="NAME_ASC">নাম: বর্ণানুক্রমিক</option>
              </select>
            </div>

          </div>
        </div>

        {/* কম স্টক পণ্যের তালিকা (কার্ড লিস্ট) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 bg-slate-50/50 space-y-3">
          {displayedItems.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {lowStockItems.length === 0 
                  ? 'সব পণ্যের পর্যাপ্ত স্টক রয়েছে!' 
                  : 'এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {lowStockItems.length === 0 
                  ? 'আপনার কোনো পণ্যের মজুদ বর্তমানে সতর্কসীমার নিচে নেই। ইনভেন্টরি সম্পূর্ণ সুরক্ষিত রয়েছে।' 
                  : 'অন্য কোনো সার্চ বা ক্যাটাগরি ফিল্টার দিয়ে পুনরায় চেষ্টা করুন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayedItems.map((prod) => {
                const stock = Number(prod.StockQuantity || 0);
                const minAlert = Number(prod.MinStockAlert || 5);
                const isZero = stock === 0;
                const cost = Number(prod.CostPrice || 0);
                const sell = Number(prod.SellingPrice || 0);
                const unit = prod.Unit || 'Pcs';
                
                // ঘাটতি ও প্রোগ্রেস লেভেল হিসাব
                const deficit = Math.max(0, minAlert - stock);
                const targetSafeStock = Math.max(minAlert * 2, minAlert + 5);
                const refillNeeded = Math.max(1, targetSafeStock - stock);
                const estimatedCostForRefill = refillNeeded * cost;
                const stockRatioPercent = Math.min(100, Math.round((stock / targetSafeStock) * 100));

                return (
                  <div
                    key={prod.ProductID}
                    className={`p-4 bg-white rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-md ${
                      isZero 
                        ? 'border-rose-200 hover:border-rose-400 bg-rose-50/20' 
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {/* বাম পাশ: পণ্যের ছবি ও পরিচয় */}
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                      
                      {/* ছবি বা আইকন ফ্রেম */}
                      <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                        {prod.ImageUrl ? (
                          <img
                            src={prod.ImageUrl}
                            alt={prod.ProductName}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${
                            isZero ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
                          }`}>
                            <PackageX className="w-6 h-6 stroke-[1.5]" />
                          </div>
                        )}
                      </div>

                      {/* টেক্সট তথ্য */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {prod.Category || 'General'}
                          </span>
                          {prod.SubCategory && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                              {prod.SubCategory}
                            </span>
                          )}
                          {prod.Barcode && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              #{prod.Barcode}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 truncate" title={prod.ProductName}>
                          {prod.ProductName}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            বিক্রয়: <strong className="text-slate-900 font-bold">{currencySymbol}{sell.toFixed(2)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            ক্রয়: <strong className="text-slate-600 font-semibold">{currencySymbol}{cost.toFixed(2)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* মাঝের অংশ: স্টক লেভেল ও ঘাটতি মিটার */}
                    <div className="w-full md:w-56 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 shrink-0">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500 text-[11px]">স্টক পরিস্থিতি:</span>
                        {isZero ? (
                          <span className="text-rose-600 font-black text-[11px] flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
                            <span>স্টক শেষ (০ {unit})</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-black text-[11px]">
                            {stock} / সতর্কবার্তা ≤ {minAlert} {unit}
                          </span>
                        )}
                      </div>

                      {/* মিনি স্টক প্রোগ্রেস বার */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isZero ? 'bg-rose-500 w-0' : stockRatioPercent <= 30 ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${stockRatioPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>রিফিল প্রয়োজন: <strong className="text-slate-700">+{refillNeeded} {unit}</strong></span>
                        <span>বাজেট: <strong className="text-teal-700 font-bold">{currencySymbol}{estimatedCostForRefill.toFixed(0)}</strong></span>
                      </div>
                    </div>

                    {/* ডান পাশ: অ্যাকশন বাটনসমূহ */}
                    <div className="flex items-center justify-end space-x-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      
                      {/* দ্রুত কার্টে যোগ বাটন (যদি স্টক থাকে) */}
                      {onAddToCart && !isZero && (
                        <button
                          type="button"
                          onClick={() => onAddToCart(prod)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 active:scale-95"
                          title="কার্টে ১টি যোগ করুন"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">কার্ট</span>
                        </button>
                      )}

                      {/* দ্রুত স্টক ইনপুট অ্যাকশন বাটন (প্রধান কল-টু-অ্যাকশন) */}
                      <button
                        type="button"
                        onClick={() => {
                          onQuickRestock(prod);
                          onClose();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center space-x-1.5 active:scale-95 shrink-0"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>স্টক ইনপুট</span>
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* মডাল ফুটার */}
        <div className="px-5 sm:px-8 py-3.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>প্রদর্শিত পণ্য: <strong className="text-slate-800">{displayedItems.length}</strong> / {lowStockItems.length} টি</span>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
