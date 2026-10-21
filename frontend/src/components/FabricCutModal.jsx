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
        className="bg-white rounded-[24px] shadow-2xl shadow-slate-900/25 border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-auto select-none flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* ================= ১. আল্ট্রা-মডার্ন গ্রেডিয়েন্ট হেডার ================= */}
        <div className="relative px-5 py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shrink-0 overflow-hidden shadow-sm">
          {/* ব্যাকগ্রাউন্ড ডেকোরেটিভ গ্লো */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
                <Scissors className="w-5 h-5 text-white drop-shadow-xs" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    গজ কাপড় কাটিং ও পরিমাপ
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30 shadow-2xs">
                    থান
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
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/25 border border-white/20 transition-all cursor-pointer active:scale-90 shrink-0"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* স্ক্রলেবল কন্টেন্ট বডি (overflow-x-hidden দিয়ে হরিজন্টাল স্ক্রল প্রতিরোধ) */}
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden space-y-3.5 flex-1">
          
          {/* ================= ২. পণ্য পরিচিতি ও স্টক স্ট্যাটাস কার্ড ================= */}
          <div className="p-3 bg-gradient-to-r from-slate-50 to-amber-50/40 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {/* কঠোরভাবে সাইজ নিয়ন্ত্রিত থাম্বনেইল (কখনই বড় হয়ে ছড়াবে না) */}
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
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
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200">
                  {product.ProductID}
                </span>
                <h4 className="text-sm font-black text-slate-900 truncate mt-0.5" title={product.ProductName}>
                  {product.ProductName}
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  একক: <span className="text-slate-800 font-bold">{product.Unit || 'গজ'}</span> (১ গজ = ১৬ গিরা)
                </p>
              </div>
            </div>

            {/* স্টক স্ট্যাটাস চিপ */}
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">অবশিষ্ট স্টক</span>
              <span className={`text-xs sm:text-sm font-black px-2 py-0.5 rounded-lg inline-block mt-0.5 ${
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
          <div className={`p-3.5 rounded-xl border transition-all shadow-2xs space-y-2.5 ${
            isBelowFloor 
              ? 'bg-rose-50/80 border-rose-300' 
              : isBargained 
                ? 'bg-emerald-50/80 border-emerald-300' 
                : 'bg-amber-50/70 border-amber-300/90'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  isBelowFloor ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  <Tag className="w-3 h-3" />
                </div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  প্রতি গজ বিক্রয় দর
                </span>
              </div>

              {/* MRP ও ফ্লোর প্রাইস চিপস */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs">
                  MRP: {currencySymbol}{originalSellingPrice.toFixed(2)}
                </span>
                {floorPrice > 0 && (
                  <span className="text-[10px] font-black text-amber-950 bg-amber-200/90 border border-amber-400 px-1.5 py-0.5 rounded-md shadow-2xs" title="এর নিচে বিক্রি করা যাবে না">
                    ফ্লোর সীমা: {currencySymbol}{floorPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* দরদাম ইনপুট ও কুইক বোতামসমূহ */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-sm font-black text-slate-400 select-none">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={unitPriceInput}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder={originalSellingPrice.toFixed(2)}
                  className={`w-full pl-7 pr-3 py-1.5 bg-white border-2 rounded-xl text-base font-black transition-all shadow-2xs focus:outline-none ${
                    isBelowFloor 
                      ? 'border-rose-500 text-rose-900 focus:ring-2 focus:ring-rose-500/20' 
                      : isBargained 
                        ? 'border-emerald-500 text-emerald-950 focus:ring-2 focus:ring-emerald-500/20' 
                        : 'border-amber-400 text-slate-900 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                  title="কাস্টমারের সাথে দামাদামির দর লিখুন"
                />
              </div>

              {/* কুইক কন্ট্রোল ও প্রিসেট বাটন */}
              <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustPrice(-1)}
                    className="px-2 py-1 text-xs font-black text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-95 transition-all cursor-pointer"
                    title="১ টাকা কমান"
                  >
                    -১
                  </button>
                  <div className="w-px h-4 bg-slate-200"></div>
                  <button
                    type="button"
                    onClick={() => handleQuickAdjustPrice(1)}
                    className="px-2 py-1 text-xs font-black text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg active:scale-95 transition-all cursor-pointer"
                    title="১ টাকা বাড়ান"
                  >
                    +১
                  </button>
                </div>

                {floorPrice > 0 && floorPrice !== originalSellingPrice && (
                  <button
                    type="button"
                    onClick={() => handlePriceChange(String(floorPrice))}
                    className={`px-2.5 py-1 text-xs font-black rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      effectiveUnitPrice === floorPrice
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
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
                    className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="আসল MRP ফিরিয়ে আনুন"
                  >
                    MRP
                  </button>
                )}
              </div>
            </div>

            {/* লাইভ গিরা হিসাব ও ছাড় ইনফরমেশন বার */}
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold flex-wrap gap-1.5">
              <span className="text-slate-600 text-[11px] flex items-center gap-1">
                <span>প্রতি গিরা দর:</span>
                <strong className="text-slate-900 font-black">{currencySymbol}{perGiraPrice.toFixed(2)}</strong>
                <span className="text-slate-400">({currencySymbol}{effectiveUnitPrice.toFixed(2)} ÷ ১৬)</span>
              </span>

              {isBargained && !isBelowFloor && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>গজ প্রতি ছাড়: {currencySymbol}{savingsPerYard.toFixed(2)}</span>
                </span>
              )}
            </div>

            {/* ফ্লোর প্রাইস লঙ্ঘন সতর্কতা */}
            {isBelowFloor && (
              <div className="p-2 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-black flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  দামাদামির সীমা লঙ্ঘন: এই কাপড়ের নূন্যতম বিক্রয়মূল্য {currencySymbol}{floorPrice.toFixed(2)} এর নিচে নামানো যাবে না!
                </span>
              </div>
            )}
          </div>

          {/* ================= ৪. দ্বৈত গজ ও গিরা ইনপুট কন্ট্রোলার ================= */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* গজ (Yard) ইনপুট ডেক */}
            <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus-within:border-amber-500 focus-within:bg-amber-50/20 transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-amber-600" />
                  <span>গজ (Yard)</span>
                </label>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1 py-0.2 rounded">
                  পূর্ণ
                </span>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGoj(Math.max(0, goj - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গজ কমান"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
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
                  className="w-14 text-center font-black text-lg text-slate-900 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setGoj(goj + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গজ বাড়ান"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* গজ কুইক স্টেপার */}
              <div className="flex items-center gap-1 pt-0.5 justify-center flex-wrap">
                {[1, 2, 3, 5].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoj(g)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      goj === g ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {g} গজ
                  </button>
                ))}
              </div>
            </div>

            {/* গিরা (Gira) ইনপুট ডেক */}
            <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus-within:border-amber-500 focus-within:bg-amber-50/20 transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                  <span>গিরা (Gira)</span>
                </label>
                <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded">
                  ০-১৫
                </span>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
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
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গিরা কমান"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
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
                  className="w-14 text-center font-black text-lg text-slate-900 bg-transparent focus:outline-none"
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
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer"
                  title="১ গিরা বাড়ান"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* গিরা কুইক স্টেপার */}
              <div className="flex items-center gap-1 pt-0.5 justify-center flex-wrap">
                {[0, 4, 8, 12].map((gi) => (
                  <button
                    key={gi}
                    type="button"
                    onClick={() => setGira(gi)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      gira === gi ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {gi} গিরা
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ================= ৫. প্রচলিত গিরা ভগ্নাংশ বাটন ================= */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              প্রচলিত ভগ্নাংশ:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setGira(0)}
                className={`py-1.5 px-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                  gira === 0 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ০ (পূর্ণ)
              </button>
              <button
                type="button"
                onClick={() => setGira(4)}
                className={`py-1.5 px-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                  gira === 4 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ৪ (সোয়া)
              </button>
              <button
                type="button"
                onClick={() => setGira(8)}
                className={`py-1.5 px-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                  gira === 8 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ৮ (আধা)
              </button>
              <button
                type="button"
                onClick={() => setGira(12)}
                className={`py-1.5 px-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                  gira === 12 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ১২ (পৌনে)
              </button>
            </div>
          </div>

          {/* ================= ৬. জনপ্রিয় পোশাকের মাপের শর্টকাট ================= */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Shirt className="w-3 h-3 text-slate-600" />
              <span>জনপ্রিয় পোশাকের সাইজ প্রিসেট:</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(3, 8)}
                className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  goj === 3 && gira === 8
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">পাঞ্জাবি</div>
                <div className={`text-[10px] ${goj === 3 && gira === 8 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ৩ গজ ৮ গিরা
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(2, 4)}
                className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  goj === 2 && gira === 4
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">শার্ট</div>
                <div className={`text-[10px] ${goj === 2 && gira === 4 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ২ গজ ৪ গিরা
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(2, 8)}
                className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  goj === 2 && gira === 8
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">সালোয়ার-কামিজ</div>
                <div className={`text-[10px] ${goj === 2 && gira === 8 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ২ গজ ৮ গিরা
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(1, 4)}
                className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  goj === 1 && gira === 4
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-xs font-black">প্যান্ট / ট্রাউজার</div>
                <div className={`text-[10px] ${goj === 1 && gira === 4 ? 'text-amber-100' : 'text-slate-500'}`}>
                  ১ গজ ৪ গিরা
                </div>
              </button>
            </div>
          </div>

          {/* ================= ৭. লাইভ ডিজিটাল রসিদ প্রিভিউ ================= */}
          <div className="p-3.5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-xl shadow-md border border-slate-800">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>লাইভ প্রদেয় বিল সারাংশ:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                নিখুঁত হিসাব
              </span>
            </div>

            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">নির্বাচিত মোট পরিমাণ:</p>
                <p className="text-sm sm:text-base font-black text-white mt-0.5">
                  {formatFabricQuantity(totalYards, 'গজ')}
                </p>
                <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                  দর: {currencySymbol}{effectiveUnitPrice.toFixed(2)} / গজ 
                  {isBargained && <span className="ml-1 text-emerald-400 font-black">• দরদামকৃত</span>}
                </p>
              </div>

              <div className="text-right">
                {isBargained && totalSavings > 0 && (
                  <p className="text-[10px] text-rose-300 line-through font-bold">
                    MRP: {currencySymbol}{originalTotalPrice.toFixed(2)}
                  </p>
                )}
                <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight block">
                  {currencySymbol}{totalPrice.toFixed(2)}
                </span>
                {isBargained && totalSavings > 0 && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1 py-0.2 rounded inline-block mt-0.5">
                    সাশ্রয়: {currencySymbol}{totalSavings.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* স্টক ঘাটতি সতর্কতা */}
          {isOverStock && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-black shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>দোকানের মজুদের চেয়ে বেশি পরিমাণ নির্বাচন করা হয়েছে! (সর্বোচ্চ মজুদ: {maxSelectable} গজ)</span>
            </div>
          )}

        </div>

        {/* ================= ৮. ফুটার অ্যাকশন বাটনসমূহ ================= */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={totalYards <= 0 || (isOverStock && maxSelectable > 0) || isBelowFloor}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 text-white text-xs sm:text-sm font-black shadow-md shadow-amber-600/25 flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>কার্টে যোগ করুন ({currencySymbol}{totalPrice.toFixed(2)})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
