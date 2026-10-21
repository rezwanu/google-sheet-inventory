import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Scissors, 
  Check, 
  ShoppingCart, 
  Tag, 
  Plus, 
  Minus, 
  Sparkles, 
  AlertCircle,
  Ruler,
  Shirt,
  Percent,
  CheckCircle2,
  TrendingDown,
  Layers
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity } from '../utils/fabricUtils';

/**
 * গজ কাপড় কাটার জন্য আধুনিক ও দৃষ্টিনন্দন গজ-গিরা নির্বাচন ও দরদাম মডাল
 * (Modern Interactive Fabric Goj & Gira POS Modal)
 */
export default function FabricCutModal({
  isOpen,
  onClose,
  product,
  currencySymbol = '৳',
  onConfirmAddToCart,
  cartItems = []
}) {
  const [goj, setGoj] = useState(1);
  const [gira, setGira] = useState(0);

  // দামাদামি ও ফ্লোর প্রাইস স্টেট
  const originalSellingPrice = Number(product?.SellingPrice) || 0;
  const floorPrice = Number(product?.MinSellingPrice !== undefined ? product.MinSellingPrice : (product?.minSellingPrice || product?.CostPrice || 0));
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [priceError, setPriceError] = useState('');

  // প্রোডাক্ট পরিবর্তন হলে ডিফল্ট মান রিসেট
  useEffect(() => {
    if (isOpen && product) {
      setGoj(1);
      setGira(0);
      setUnitPriceInput(String(product.SellingPrice || ''));
      setPriceError('');
    }
  }, [isOpen, product]);

  const stockQuantity = Number(product?.StockQuantity) || 0;

  // বর্তমান কার্যকর প্রতি গজ বিক্রয়মূল্য ও গিরা দর
  const effectiveUnitPrice = unitPriceInput !== '' && !isNaN(parseFloat(unitPriceInput))
    ? Math.max(0, parseFloat(unitPriceInput))
    : originalSellingPrice;
  const perGiraPrice = effectiveUnitPrice / 16;
  const isBelowFloor = floorPrice > 0 && effectiveUnitPrice < floorPrice;
  const isBargained = effectiveUnitPrice !== originalSellingPrice;
  const savingsPerYard = Math.max(0, originalSellingPrice - effectiveUnitPrice);

  // কার্টে ইতোমধ্যে কত গজ যোগ করা হয়েছে
  const alreadyInCartQty = useMemo(() => {
    if (!product) return 0;
    const match = (cartItems || []).find((ci) => {
      const matchId = ci.cartItemId || ci.productId;
      const targetId = product.variantId ? `${product.ProductID}__${product.variantId}` : product.ProductID;
      return matchId === targetId || ci.productId === product.ProductID;
    });
    return match ? Number(match.quantity || 0) : 0;
  }, [cartItems, product]);

  const maxSelectable = Math.max(0, stockQuantity - alreadyInCartQty);

  // বর্তমান নির্বাচিত মোট গজ ও টাকার হিসাব
  const totalYards = calculateTotalYards(goj, gira);
  const totalPrice = Math.round(totalYards * effectiveUnitPrice * 100) / 100;
  const originalTotalPrice = Math.round(totalYards * originalSellingPrice * 100) / 100;
  const totalSavings = Math.max(0, originalTotalPrice - totalPrice);
  const isOverStock = totalYards > maxSelectable;

  const handlePriceChange = (valStr) => {
    setUnitPriceInput(valStr);
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) {
      setPriceError('সঠিক বিক্রয়মূল্য লিখুন');
    } else if (floorPrice > 0 && val < floorPrice) {
      setPriceError(`নূন্যতম বিক্রয়মূল্য ${currencySymbol}${floorPrice.toFixed(2)} এর নিচে নামানো যাবে না!`);
    } else {
      setPriceError('');
    }
  };

  const handleQuickAdjustPrice = (delta) => {
    const nextVal = Math.max(0, Math.round((effectiveUnitPrice + delta) * 100) / 100);
    handlePriceChange(String(nextVal));
  };

  if (!isOpen || !product) return null;

  const handleAdd = () => {
    if (totalYards <= 0) return;
    if (isOverStock && maxSelectable > 0) return;
    if (isBelowFloor) {
      alert(`দামাদামির সীমা লঙ্ঘন: এই কাপড়ের নূন্যতম বিক্রয়মূল্য ${currencySymbol}${floorPrice.toFixed(2)} এর নিচে বিক্রি করা যাবে না!`);
      return;
    }

    const customProduct = {
      ...product,
      SellingPrice: effectiveUnitPrice,
      originalSellingPrice: originalSellingPrice,
      isBargained: isBargained,
      minSellingPrice: floorPrice,
    };

    if (onConfirmAddToCart) {
      onConfirmAddToCart(customProduct, totalYards);
    }
    onClose();
  };

  // কমন প্রিসেট নির্বাচন (যেমন: পাঞ্জাবি, শার্ট, কামিজ ইত্যাদি)
  const applyPreset = (presetGoj, presetGira) => {
    setGoj(presetGoj);
    setGira(presetGira);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-[28px] shadow-2xl shadow-slate-900/20 border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-auto select-none flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* ================= ১. আল্ট্রা-মডার্ন গ্রেডিয়েন্ট হেডার ================= */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shrink-0 overflow-hidden shadow-sm">
          {/* ব্যাকগ্রাউন্ড ডেকোরেটিভ গ্লো */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
                <Scissors className="w-6 h-6 text-white drop-shadow-xs" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    গজ কাপড় কাটিং ও পরিমাপ
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30 shadow-2xs">
                    থান রোল
                  </span>
                </div>
                <p className="text-xs text-amber-100 font-medium truncate mt-0.5">
                  ক্রেতার চাহিদা অনুযায়ী গজ-গিরা ও দামাদামির দর নির্ধারণ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/25 border border-white/20 transition-all cursor-pointer active:scale-90 shrink-0"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* স্ক্রলেবল কন্টেন্ট বডি */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* ================= ২. পণ্য পরিচিতি ও স্টক স্ট্যাটাস কার্ড ================= */}
          <div className="p-3.5 bg-gradient-to-r from-slate-50 to-amber-50/40 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                {product.ImageUrl ? (
                  <img 
                    src={product.ImageUrl} 
                    alt={product.ProductName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Ruler className="w-6 h-6 text-amber-600 stroke-[1.5]" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                  {product.ProductID}
                </span>
                <h4 className="text-sm font-black text-slate-900 truncate mt-1">
                  {product.ProductName}
                </h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  একক: <span className="text-slate-800 font-bold">{product.Unit || 'গজ'}</span> (১ গজ = ১৬ গিরা)
                </p>
              </div>
            </div>

            {/* স্টক স্ট্যাটাস চিপ */}
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">অবশিষ্ট স্টক</span>
              <span className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl inline-block mt-0.5 ${
                stockQuantity <= 5 
                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {stockQuantity} গজ
              </span>
              {alreadyInCartQty > 0 && (
                <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                  (কার্টে: {alreadyInCartQty} গজ)
                </span>
              )}
            </div>
          </div>

          {/* ================= ৩. স্মার্ট দরদাম ও বিক্রয়মূল্য কার্ড (Smart Bargaining Hub) ================= */}
          <div className={`p-4 rounded-2xl border transition-all shadow-2xs ${
            isBelowFloor 
              ? 'bg-rose-50/70 border-rose-300' 
              : isBargained 
                ? 'bg-emerald-50/70 border-emerald-300' 
                : 'bg-amber-50/60 border-amber-300/90'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isBelowFloor ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  প্রতি গজ বিক্রয় দর (Bargaining Rate)
                </span>
              </div>

              {/* MRP ও ফ্লোর প্রাইস চিপস */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  MRP: {currencySymbol}{originalSellingPrice.toFixed(2)}
                </span>
                {floorPrice > 0 && (
                  <span className="text-[11px] font-black text-amber-950 bg-amber-200/90 border border-amber-400 px-2 py-0.5 rounded-lg shadow-2xs" title="এর নিচে বিক্রি করা যাবে না">
                    ফ্লোর সীমা: {currencySymbol}{floorPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* দরদাম ইনপুট ও কুইক ট্যাপ কন্ট্রোল */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-400 select-none">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={unitPriceInput}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder={originalSellingPrice.toFixed(2)}
                  className={`w-full pl-8 pr-3 py-2 bg-white border-2 rounded-xl text-base font-black transition-all shadow-2xs focus:outline-none ${
                    isBelowFloor 
                      ? 'border-rose-500 text-rose-900 focus:ring-4 focus:ring-rose-500/10' 
                      : isBargained 
                        ? 'border-emerald-500 text-emerald-950 focus:ring-4 focus:ring-emerald-500/10' 
                        : 'border-amber-400 text-slate-900 focus:ring-4 focus:ring-amber-500/10'
                  }`}
                  title="কাস্টমারের সাথে দামাদামির দর লিখুন"
                />
              </div>

              {/* দ্রুত ১ টাকা কমানো / বাড়ানো বোতাম */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuickAdjustPrice(-1)}
                  className="px-2.5 py-2 text-xs font-black text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-95 transition-all cursor-pointer"
                  title="১ টাকা কমান"
                >
                  -১
                </button>
                <div className="w-px h-5 bg-slate-200"></div>
                <button
                  type="button"
                  onClick={() => handleQuickAdjustPrice(1)}
                  className="px-2.5 py-2 text-xs font-black text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg active:scale-95 transition-all cursor-pointer"
                  title="১ টাকা বাড়ান"
                >
                  +১
                </button>
              </div>

              {/* শর্টকাট প্রিসেট: ফ্লোর দর ও MRP */}
              <div className="flex items-center gap-1 shrink-0">
                {floorPrice > 0 && floorPrice !== originalSellingPrice && (
                  <button
                    type="button"
                    onClick={() => handlePriceChange(String(floorPrice))}
                    className={`px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      effectiveUnitPrice === floorPrice
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 border-amber-300'
                    }`}
                    title="সর্বনিম্ন ফ্লোর প্রাইস সেট করুন"
                  >
                    ফ্লোর ({currencySymbol}{floorPrice})
                  </button>
                )}
                {isBargained && (
                  <button
                    type="button"
                    onClick={() => handlePriceChange(String(originalSellingPrice))}
                    className="px-2.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="আসল MRP ফিরিয়ে আনুন"
                  >
                    MRP ({currencySymbol}{originalSellingPrice})
                  </button>
                )}
              </div>
            </div>

            {/* লাইভ গিরা হিসাব ও ছাড় ইনফরমেশন বার */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
              <span className="text-slate-600 text-[11px] flex items-center gap-1">
                <span>প্রতি গিরা দর:</span>
                <strong className="text-slate-900 font-black">{currencySymbol}{perGiraPrice.toFixed(2)}</strong>
                <span className="text-slate-400">({currencySymbol}{effectiveUnitPrice.toFixed(2)} ÷ ১৬)</span>
              </span>

              {isBargained && !isBelowFloor && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>গজ প্রতি ছাড়: {currencySymbol}{savingsPerYard.toFixed(2)}</span>
                </span>
              )}
            </div>

            {/* ফ্লোর প্রাইস লঙ্ঘন সতর্কতা */}
            {isBelowFloor && (
              <div className="mt-2.5 p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-black flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  দামাদামির সীমা লঙ্ঘন: এই কাপড়ের নূন্যতম বিক্রয়মূল্য {currencySymbol}{floorPrice.toFixed(2)} এর নিচে নামানো যাবে না!
                </span>
              </div>
            )}
          </div>

          {/* ================= ৪. দ্বৈত গজ ও গিরা ইনপুট কন্ট্রোলার ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* গজ (Yard) ইনপুট ডেক */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus-within:border-amber-500 focus-within:bg-amber-50/20 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-amber-600" />
                  <span>গজ (Yard)</span>
                </label>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                  পূর্ণ সংখ্যা
                </span>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGoj(Math.max(0, goj - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গজ কমান"
                >
                  <Minus className="w-4 h-4 stroke-[2.5]" />
                </button>
                <input
                  type="number"
                  min="0"
                  max={stockQuantity || 9999}
                  value={goj}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setGoj(isNaN(val) || val < 0 ? 0 : val);
                  }}
                  className="w-16 text-center font-black text-xl text-slate-900 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setGoj(goj + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গজ বাড়ান"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* গজ কুইক স্টেপার */}
              <div className="flex items-center gap-1 pt-0.5 justify-center">
                {[1, 2, 3, 5].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoj(g)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      goj === g ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {g} গজ
                  </button>
                ))}
              </div>
            </div>

            {/* গিরা (Gira) ইনপুট ডেক */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus-within:border-amber-500 focus-within:bg-amber-50/20 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                  <span>গিরা (Gira)</span>
                </label>
                <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                  ০ - ১৫ গিরা
                </span>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (gira > 0) {
                      setGira(gira - 1);
                    } else if (goj > 0) {
                      setGoj(goj - 1);
                      setGira(15);
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গিরা কমান"
                >
                  <Minus className="w-4 h-4 stroke-[2.5]" />
                </button>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={gira}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    let safeGira = isNaN(val) || val < 0 ? 0 : val;
                    if (safeGira >= 16) {
                      setGoj((prev) => prev + Math.floor(safeGira / 16));
                      safeGira = safeGira % 16;
                    }
                    setGira(safeGira);
                  }}
                  className="w-16 text-center font-black text-xl text-slate-900 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (gira + 1 >= 16) {
                      setGoj((prev) => prev + 1);
                      setGira(0);
                    } else {
                      setGira(gira + 1);
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গিরা বাড়ান"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* গিরা কুইক স্টেপার */}
              <div className="flex items-center gap-1 pt-0.5 justify-center">
                {[0, 4, 8, 12].map((gi) => (
                  <button
                    key={gi}
                    type="button"
                    onClick={() => setGira(gi)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      gira === gi ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {gi} গিরা
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ================= ৫. প্রচলিত গিরা শর্টকাট গ্রিড ================= */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
              প্রচলিত ভগ্নাংশ বাছাই:
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setGira(0)}
                className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  gira === 0 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ০ গিরা (পূর্ণ)
              </button>
              <button
                type="button"
                onClick={() => setGira(4)}
                className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  gira === 4 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ৪ গিরা (সোয়া)
              </button>
              <button
                type="button"
                onClick={() => setGira(8)}
                className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  gira === 8 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ৮ গিরা (আধা)
              </button>
              <button
                type="button"
                onClick={() => setGira(12)}
                className={`py-2 px-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  gira === 12 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ১২ গিরা (পৌনে)
              </button>
            </div>
          </div>

          {/* ================= ৬. জনপ্রিয় পোশাকের মাপের শর্টকাট ================= */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Shirt className="w-3.5 h-3.5 text-slate-600" />
              <span>জনপ্রিয় পোশাকের সাইজ প্রিসেট:</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(3, 8)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  goj === 3 && gira === 8
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">পাঞ্জাবি</div>
                <div className={`text-[10px] ${goj === 3 && gira === 8 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ৩ গজ ৮ গিরা (৩.৫)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(2, 4)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  goj === 2 && gira === 4
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">শার্ট</div>
                <div className={`text-[10px] ${goj === 2 && gira === 4 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ২ গজ ৪ গিরা (২.২৫)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(2, 8)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  goj === 2 && gira === 8
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">সালোয়ার-কামিজ</div>
                <div className={`text-[10px] ${goj === 2 && gira === 8 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ২ গজ ৮ গিরা (২.৫)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(1, 4)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  goj === 1 && gira === 4
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">প্যান্ট / ট্রাউজার</div>
                <div className={`text-[10px] ${goj === 1 && gira === 4 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ১ গজ ৪ গিরা (১.২৫)
                </div>
              </button>
            </div>
          </div>

          {/* ================= ৭. লাইভ ডিজিটাল রসিদ প্রিভিউ (Digital Receipt Preview) ================= */}
          <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>লাইভ প্রদেয় বিল সারাংশ:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                নিখুঁত গাণিতিক হিসাব
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 font-semibold">নির্বাচিত মোট পরিমাণ:</p>
                <p className="text-base sm:text-lg font-black text-white mt-0.5">
                  {formatFabricQuantity(totalYards, 'গজ')}
                </p>
                <p className="text-[11px] text-amber-300 font-bold mt-1">
                  দর: {currencySymbol}{effectiveUnitPrice.toFixed(2)} / গজ 
                  {isBargained && <span className="ml-1 text-emerald-400 font-black">• দরদামকৃত</span>}
                </p>
              </div>

              <div className="text-right">
                {isBargained && totalSavings > 0 && (
                  <p className="text-[11px] text-rose-300 line-through font-bold">
                    MRP: {currencySymbol}{originalTotalPrice.toFixed(2)}
                  </p>
                )}
                <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight block">
                  {currencySymbol}{totalPrice.toFixed(2)}
                </span>
                {isBargained && totalSavings > 0 && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded inline-block mt-0.5">
                    মোট সাশ্রয়: {currencySymbol}{totalSavings.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* স্টক ঘাটতি সতর্কতা */}
          {isOverStock && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-black shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>দোকানের মজুদের চেয়ে বেশি পরিমাণ নির্বাচন করা হয়েছে! (সর্বোচ্চ মজুদ: {maxSelectable} গজ)</span>
            </div>
          )}

        </div>

        {/* ================= ৮. ফুটার অ্যাকশন বাটনসমূহ ================= */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={totalYards <= 0 || (isOverStock && maxSelectable > 0) || isBelowFloor}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 text-white text-xs sm:text-sm font-black shadow-lg shadow-amber-600/25 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>কার্টে যোগ করুন ({currencySymbol}{totalPrice.toFixed(2)})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
