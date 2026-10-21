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
  Layers,
  Ruler
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity, parseGojGira } from '../utils/fabricUtils';

/**
 * গজ কাপড় কাটার জন্য গজ ও গিরা নির্বাচন মডাল (Fabric Goj & Gira Measurement Modal)
 * ক্রেতার চাহিদা অনুযায়ী গজ এবং গিরা আলাদা আলাদা ইনপুট নিয়ে নিখুঁত মূল্যে কার্টে যোগ করে।
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

  // কমন প্রিসেট নির্বাচন (যেমন: দেড় গজ, আড়াই গজ ইত্যাদি)
  const applyPreset = (presetGoj, presetGira) => {
    setGoj(presetGoj);
    setGira(presetGira);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* হেডার */}
        <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>গজ ও গিরা নির্বাচন</span>
                <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-bold">কাপড় থান</span>
              </h3>
              <p className="text-xs text-amber-100 font-medium truncate">
                প্রয়োজনীয় গজ ও গিরা লিখুন (১ গজ = ১৬ গিরা)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* পণ্য পরিচিতি ও রেট কার্ড */}
        <div className="p-4 bg-amber-50/40 border-b border-amber-100/80">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
              {product.ImageUrl ? (
                <img 
                  src={product.ImageUrl} 
                  alt={product.ProductName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Ruler className="w-6 h-6 text-amber-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                {product.ProductName}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                <span className="font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200/80">
                  {currencySymbol}{effectiveUnitPrice.toFixed(2)} / গজ
                </span>
                <span className="text-slate-500 font-semibold text-[11px]">
                  (প্রতি গিরা: {currencySymbol}{perGiraPrice.toFixed(2)})
                </span>
                {isBargained && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    দরদামে নির্ধারিত
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* মজুদ স্ট্যাটাস */}
          <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>দোকানে মজুদ আছে: <strong className="text-slate-900">{stockQuantity} গজ</strong></span>
            {alreadyInCartQty > 0 && (
              <span className="text-indigo-600 font-semibold">কার্টে আছে: {alreadyInCartQty} গজ</span>
            )}
          </div>
        </div>

        {/* দামাদামি ও প্রতি গজ দর নির্ধারণ (Bargaining Rate Control) */}
        <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>প্রতি গজ বিক্রয়মূল্য / দরদাম:</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded" title="সাধারণ বিক্রয়মূল্য">
                MRP: {currencySymbol}{originalSellingPrice.toFixed(2)}
              </span>
              {floorPrice > 0 && (
                <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded" title="কাস্টমার দামাদামি করলেও এর নিচে বিক্রি করা যাবে না">
                  ফ্লোর সীমা: {currencySymbol}{floorPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs font-black text-amber-600 select-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPriceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder={originalSellingPrice.toFixed(2)}
                className={`w-full pl-7 pr-3 py-2 bg-white border-2 rounded-xl text-sm font-black transition-all shadow-2xs focus:outline-none ${
                  isBelowFloor 
                    ? 'border-rose-400 text-rose-900 focus:ring-4 focus:ring-rose-500/10' 
                    : isBargained 
                      ? 'border-emerald-400 text-emerald-950 focus:ring-4 focus:ring-emerald-500/10'
                      : 'border-amber-300 text-slate-900 focus:ring-4 focus:ring-amber-500/10'
                }`}
                title="কাস্টমারের সাথে দরদাম করে নির্ধারিত প্রতি গজের মূল্য (যেমন: ৭১ টাকা)"
              />
            </div>

            {/* শর্টকাট বোতাম: আসল MRP এবং সর্বনিম্ন ফ্লোর দর */}
            <div className="flex items-center gap-1 shrink-0">
              {floorPrice > 0 && floorPrice !== originalSellingPrice && (
                <button
                  type="button"
                  onClick={() => handlePriceChange(String(floorPrice))}
                  className="px-2.5 py-2 text-xs font-black bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl border border-amber-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="সর্বনিম্ন অনুমোদনযোগ্য দর সেট করুন"
                >
                  ফ্লোর ({currencySymbol}{floorPrice})
                </button>
              )}
              {isBargained && (
                <button
                  type="button"
                  onClick={() => handlePriceChange(String(originalSellingPrice))}
                  className="px-2.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="আসল MRP ফিরিয়ে আনুন"
                >
                  MRP ({currencySymbol}{originalSellingPrice})
                </button>
              )}
            </div>
          </div>

          {/* লাইভ গিরা রেট এবং ছাড় বা ফ্লোর লঙ্ঘন স্ট্যাটাস */}
          <div className="flex items-center justify-between text-xs font-semibold pt-0.5">
            <span className="text-slate-600 text-[11px]">
              প্রতি গিরা দর: <strong className="font-black text-slate-900">{currencySymbol}{perGiraPrice.toFixed(2)}</strong> (১ গজ = ১৬ গিরা)
            </span>
            {isBargained && !isBelowFloor && (
              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                গজে ছাড়: {currencySymbol}{(originalSellingPrice - effectiveUnitPrice).toFixed(2)}
              </span>
            )}
          </div>

          {/* ফ্লোর লঙ্ঘন সতর্কতা */}
          {isBelowFloor && (
            <div className="p-2 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>দামাদামির সীমা লঙ্ঘন: নূন্যতম বিক্রয়মূল্য {currencySymbol}{floorPrice.toFixed(2)} এর নিচে নামানো যাবে না!</span>
            </div>
          )}
        </div>

        {/* গজ ও গিরা ইনপুট সেকশন */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            
            {/* গজ ইনপুট বক্স */}
            <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus-within:border-amber-500 focus-within:bg-amber-50/20 transition-all space-y-1.5">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                গজ (Yard)
              </label>
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGoj(Math.max(0, goj - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                  title="১ গজ কমান"
                >
                  <Minus className="w-4 h-4" />
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
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                  title="১ গজ বাড়ান"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* গিরা ইনপুট বক্স */}
            <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus-within:border-amber-500 focus-within:bg-amber-50/20 transition-all space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  গিরা (Gira)
                </label>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
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
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                  title="১ গিরা কমান"
                >
                  <Minus className="w-4 h-4" />
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
                  className="w-12 text-center font-black text-lg text-slate-900 bg-transparent focus:outline-none"
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
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                  title="১ গিরা বাড়ান"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* প্রচলিত গিরা শর্টকাট বোতামসমূহ */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              দ্রুত গিরা বাছাই করুন:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setGira(0)}
                className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  gira === 0 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ০ (পূর্ণ গজ)
              </button>
              <button
                type="button"
                onClick={() => setGira(4)}
                className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  gira === 4 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ৪ গিরা (সোয়া)
              </button>
              <button
                type="button"
                onClick={() => setGira(8)}
                className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  gira === 8 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ৮ গিরা (আধা)
              </button>
              <button
                type="button"
                onClick={() => setGira(12)}
                className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  gira === 12 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ১২ গিরা (পৌনে)
              </button>
            </div>
          </div>

          {/* কাপড়ের প্রচলিত মাপের শর্টকাট (পোশাক তৈরির সাধারণ মাপ) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              জনপ্রিয় পোশাকের মাপ:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => applyPreset(2, 8)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
              >
                আড়াই গজ (২ গজ ৮ গিরা)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3, 8)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
              >
                সাড়ে তিন গজ (৩ গজ ৮ গিরা)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(2, 4)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
              >
                সোয়া দুই গজ (২ গজ ৪ গিরা)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 8)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-200 transition-all cursor-pointer"
              >
                আধা গজ (৮ গিরা)
              </button>
            </div>
          </div>

          {/* লাইভ হিসাব ও প্রদেয় মূল্য সারাংশ কার্ড */}
          <div className="p-3.5 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300/80 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                মোট পরিমাপ:
              </p>
              <p className="text-sm font-black text-slate-900">
                {formatFabricQuantity(totalYards, 'গজ')}
              </p>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                দর: {currencySymbol}{effectiveUnitPrice.toFixed(2)}/গজ
                {isBargained && (
                  <span className="ml-1 text-emerald-700 font-black">
                    (দরদামে নির্ধারিত)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                মোট প্রদেয় মূল্য:
              </p>
              <p className="text-lg font-black text-amber-900">
                {currencySymbol}{totalPrice.toFixed(2)}
              </p>
              {isBargained && !isBelowFloor && (
                <p className="text-[10px] text-emerald-600 font-bold">
                  আসল ছিল: {currencySymbol}{(totalYards * originalSellingPrice).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* স্টক ঘাটতি সতর্কতা */}
          {isOverStock && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>দোকানের মজুদের চেয়ে বেশি পরিমাণ নির্বাচন করা হয়েছে! (সর্বোচ্চ: {maxSelectable} গজ)</span>
            </div>
          )}

        </div>

        {/* ফুটার বাটনসমূহ */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={totalYards <= 0 || (isOverStock && maxSelectable > 0) || isBelowFloor}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black shadow-md shadow-amber-600/25 flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>কার্টে যোগ করুন ({currencySymbol}{totalPrice.toFixed(2)})</span>
          </button>
        </div>

      </div>
    </div>
  );
}

