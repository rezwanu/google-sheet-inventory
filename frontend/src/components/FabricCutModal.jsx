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
  CheckCircle2,
  Lock,
  Receipt
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity } from '../utils/fabricUtils';

/**
 * গজ কাপড় কাটার জন্য আধুনিক, দৃষ্টিনন্দন ও প্রিমিয়াম গজ-গিরা নির্বাচন ও দরদাম মডাল
 * (Modern 2-Column POS Fabric Cut & Live Bargaining Studio)
 */
export default function FabricCutModal({
  isOpen,
  onClose,
  product,
  currencySymbol = '৳',
  storeName = 'Pabna Bostraloy',
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

  // বর্তমান নির্বাচিত মোট গজ, ইঞ্চি ও টাকার হিসাব
  const totalYards = calculateTotalYards(goj, gira);
  const totalInches = Math.round(totalYards * 36 * 10) / 10;
  const totalPrice = Math.round(totalYards * effectiveUnitPrice * 100) / 100;
  const originalTotalPrice = Math.round(totalYards * originalSellingPrice * 100) / 100;
  const totalSavings = Math.max(0, originalTotalPrice - totalPrice);
  const isOverStock = totalYards > maxSelectable;

  // কাপড়ের থান রোলের ভিজ্যুয়াল কাটিং শতাংশ (Visual Cut Percentage)
  const cutPercentage = stockQuantity > 0 ? Math.min(100, Math.round((totalYards / stockQuantity) * 100)) : 0;

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

  // কমন প্রিসেট নির্বাচন
  const applyPreset = (presetGoj, presetGira) => {
    setGoj(presetGoj);
    setGira(presetGira);
  };

  const PRESETS = [
    { id: 'panjabi', name: 'পাঞ্জাবি', goj: 3, gira: 8, subtitle: '৩ গজ ৮ গিরা (৩.৫ গজ)' },
    { id: 'kamiz', name: 'সালোয়ার-কামিজ', goj: 2, gira: 8, subtitle: '২ গজ ৮ গিরা (২.৫ গজ)' },
    { id: 'shirt', name: 'শার্ট', goj: 2, gira: 4, subtitle: '২ গজ ৪ গিরা (২.২৫ গজ)' },
    { id: 'pant', name: 'প্যান্ট / ট্রাউজার', goj: 1, gira: 4, subtitle: '১ গজ ৪ গিরা (১.২৫ গজ)' },
    { id: 'fotua', name: 'ফতুয়া / কুর্তি', goj: 2, gira: 0, subtitle: '২ গজ ০ গিরা (২.০ গজ)' },
    { id: 'borka', name: 'বোরকা / গাউন', goj: 4, gira: 8, subtitle: '৪ গজ ৮ গিরা (৪.৫ গজ)' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-5xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
      >
        {/* ================= ১. হেডার ================= */}
        <div className="px-6 py-4 bg-[#FAFAFA] text-[#111111] flex items-center justify-between shrink-0 border-b border-neutral-200/80">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111] truncate">
                  গজ কাপড় কাটিং ও পরিমাপ ক্যালকুলেটর
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 shrink-0">
                  Precision Yard & Gira Engine
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5 truncate">
                পণ্য: <span className="font-semibold text-[#111111]">{product.ProductName}</span> <span className="text-[#737373] font-mono tabular-nums">#{product.ProductID}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#737373] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-3"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= ২. মেইন কন্টেন্ট বডি (২-কলাম ড্যাশবোর্ড লেআউট) ================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ============ বাম কলাম: ইনপুট কন্ট্রোলার ও সেটিংস (৭ কলাম) ============ */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* সেকশন ১: গজ ও গিরা কাটিং পরিমাণ নির্বাচন */}
            <div className="bg-[#FAFAFA] border border-neutral-200/80 rounded-lg p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-[#0F172A] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#111111]">
                    কত গজ ও গিরা কাপড় কাটতে চান?
                  </span>
                </div>
                <span className="text-[11px] font-mono tabular-nums font-bold text-[#111111] bg-white border border-neutral-200/80 px-2.5 py-0.5 rounded-md">
                  মোট: {formatFabricQuantity(totalYards, 'গজ')}
                </span>
              </div>

              {/* গজ (Yard) ইনপুট কন্ট্রোল */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0F172A] inline-block"></span>
                    <span>গজ (পূর্ণ Yard)</span>
                  </span>
                  <span className="text-[10px] text-[#737373] font-mono tabular-nums">১ গজ = ৩ ফুট / ৩৬ ইঞ্চি</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setGoj(Math.max(0, goj - 1))}
                    className="min-h-[44px] sm:min-h-[36px] w-11 rounded-md bg-white border border-neutral-200/80 hover:border-[#0F172A] hover:bg-[#F5F5F5] text-[#111111] flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
                    title="১ গজ কমান"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max={stockQuantity || 9999}
                      value={goj}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setGoj(isNaN(val) || val < 0 ? 0 : val);
                      }}
                      className="min-h-[44px] sm:min-h-[36px] w-full text-center font-mono tabular-nums font-bold text-xl text-[#111111] bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#737373] pointer-events-none">
                      গজ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGoj(goj + 1)}
                    className="min-h-[44px] sm:min-h-[36px] w-11 rounded-md bg-white border border-neutral-200/80 hover:border-[#0F172A] hover:bg-[#F5F5F5] text-[#111111] flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
                    title="১ গজ বাড়ান"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* কুইক গজ শর্টকাট বোতামসমূহ */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] font-semibold text-[#737373]">দ্রুত যোগ:</span>
                  {[1, 2, 3, 5, 10].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setGoj((prev) => prev + step)}
                      className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 text-[11px] font-mono tabular-nums font-bold rounded-md bg-white border border-neutral-200/80 text-[#111111] hover:bg-[#F5F5F5] hover:border-[#0F172A] transition-colors cursor-pointer"
                    >
                      +{step}
                    </button>
                  ))}
                  {maxSelectable > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setGoj(Math.floor(maxSelectable));
                        setGira(0);
                      }}
                      className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 text-[11px] font-mono tabular-nums font-semibold rounded-md bg-[#0F172A] hover:bg-slate-800 text-white transition-colors cursor-pointer"
                    >
                      স্টক সমান ({maxSelectable} গজ)
                    </button>
                  )}
                </div>
              </div>

              {/* গিরা (Gira) ইনপুট কন্ট্রোল */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#B45309] inline-block"></span>
                    <span>গিরা (ভগ্নাংশ ০-১৫)</span>
                  </span>
                  <span className="text-[10px] text-[#737373] font-mono tabular-nums">১ গজ = ১৬ গিরা (২.২৫ ইঞ্চি/গিরা)</span>
                </div>

                <div className="flex items-center space-x-2">
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
                    className="min-h-[44px] sm:min-h-[36px] w-11 rounded-md bg-white border border-neutral-200/80 hover:border-[#B45309] hover:bg-amber-50 text-[#111111] hover:text-[#B45309] flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
                    title="১ গিরা কমান"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="relative flex-1">
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
                      className="min-h-[44px] sm:min-h-[36px] w-full text-center font-mono tabular-nums font-bold text-xl text-[#111111] bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#737373] pointer-events-none">
                      গিরা
                    </span>
                  </div>

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
                    className="min-h-[44px] sm:min-h-[36px] w-11 rounded-md bg-white border border-neutral-200/80 hover:border-[#B45309] hover:bg-amber-50 text-[#111111] hover:text-[#B45309] flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
                    title="১ গিরা বাড়ান"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* গিরা প্রচলিত ভগ্নাংশ বোতাম */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { g: 0, label: '০ গিরা', fraction: 'পূর্ণ গজ' },
                    { g: 4, label: '৪ গিরা', fraction: 'পোয়া (১/৪)' },
                    { g: 8, label: '৮ গিরা', fraction: 'আধা (১/২)' },
                    { g: 12, label: '১২ গিরা', fraction: 'পৌনে (৩/৪)' },
                  ].map((item) => (
                    <button
                      key={item.g}
                      type="button"
                      onClick={() => setGira(item.g)}
                      className={`min-h-[44px] sm:min-h-[36px] py-1.5 px-2 rounded-md text-center border transition-colors cursor-pointer font-mono tabular-nums ${
                        gira === item.g
                          ? 'bg-[#B45309] text-white border-[#B45309] font-bold'
                          : 'bg-white text-[#111111] border-neutral-200/80 hover:border-amber-300 hover:bg-amber-50/60'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className={`text-[9px] font-sans font-medium ${gira === item.g ? 'text-amber-100' : 'text-[#737373]'}`}>
                        {item.fraction}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* সেকশন ২: পোশাকের স্ট্যান্ডার্ড সাইজ প্রিসেট (Standard Garment Presets) */}
            <div className="bg-[#FAFAFA] border border-neutral-200/80 rounded-lg p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shirt className="w-4 h-4 text-[#0F172A] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#111111]">
                    পোশাকের স্ট্যান্ডার্ড সাইজ প্রিসেট (টেইলার্স গাইড)
                  </span>
                </div>
                <span className="text-[10px] text-[#737373] font-semibold">ক্লিক করলেই সেট হবে</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRESETS.map((p) => {
                  const isSelected = goj === p.goj && gira === p.gira;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.goj, p.gira)}
                      className={`min-h-[44px] sm:min-h-[36px] p-2.5 rounded-md border text-left transition-colors cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white hover:bg-[#F5F5F5] border-neutral-200/80 text-[#111111] hover:border-neutral-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white text-[#0F172A] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="text-xs font-semibold truncate pr-4">{p.name}</div>
                      <div className={`text-[10px] font-mono tabular-nums font-medium mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-[#737373]'}`}>
                        {p.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* সেকশন ৩: দরদাম ও বিক্রয় দর নির্ধারণ (Bargaining & Floor Price Hub) */}
            <div className={`border rounded-lg p-4 sm:p-5 space-y-3 transition-colors ${
              isBelowFloor 
                ? 'bg-red-50 border-red-200' 
                : isBargained 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-[#FAFAFA] border-neutral-200/80'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Tag className={`w-4 h-4 ${isBelowFloor ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`} />
                  <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#111111]">
                    প্রতি গজ বিক্রয় দর ও দরদাম (Bargaining)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono tabular-nums font-semibold text-[#525252] bg-white border border-neutral-200/80 px-2 py-0.5 rounded-md">
                    MRP: {currencySymbol}{originalSellingPrice.toFixed(2)}
                  </span>
                  {floorPrice > 0 && (
                    <span className="text-[10px] font-mono tabular-nums font-bold text-[#B45309] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1" title="ফ্লোর প্রাইসের নিচে নামানো নিষেধ">
                      <Lock className="w-2.5 h-2.5" />
                      <span>ফ্লোর সীমা: {currencySymbol}{floorPrice.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* প্রাইস ইনপুট ও কুইক বোতামসমূহ */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[#737373] select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={unitPriceInput}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder={originalSellingPrice.toFixed(2)}
                    className={`min-h-[44px] sm:min-h-[36px] w-full pl-8 pr-3 bg-white border rounded-md text-base font-mono tabular-nums font-bold transition-colors focus:outline-none ${
                      isBelowFloor 
                        ? 'border-[#B91C1C] text-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/20' 
                        : isBargained 
                          ? 'border-[#15803D] text-[#15803D] focus:ring-2 focus:ring-[#15803D]/20' 
                          : 'border-neutral-200/80 text-[#111111] focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A]'
                    }`}
                    title="কাস্টমারের সাথে দরদামকৃত দর লিখুন"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap">
                  <div className="flex items-center bg-white border border-neutral-200/80 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => handleQuickAdjustPrice(-1)}
                      className="min-h-[44px] sm:min-h-[36px] px-2.5 text-xs font-mono tabular-nums font-bold text-[#525252] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="১ টাকা কমান"
                    >
                      -১
                    </button>
                    <div className="w-px h-5 bg-neutral-200"></div>
                    <button
                      type="button"
                      onClick={() => handleQuickAdjustPrice(-5)}
                      className="min-h-[44px] sm:min-h-[36px] px-2.5 text-xs font-mono tabular-nums font-bold text-[#525252] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="৫ টাকা কমান"
                    >
                      -৫
                    </button>
                    <div className="w-px h-5 bg-neutral-200"></div>
                    <button
                      type="button"
                      onClick={() => handleQuickAdjustPrice(1)}
                      className="min-h-[44px] sm:min-h-[36px] px-2.5 text-xs font-mono tabular-nums font-bold text-[#525252] hover:text-[#15803D] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                      title="১ টাকা বাড়ান"
                    >
                      +১
                    </button>
                  </div>

                  {floorPrice > 0 && floorPrice !== originalSellingPrice && (
                    <button
                      type="button"
                      onClick={() => handlePriceChange(String(floorPrice))}
                      className={`min-h-[44px] sm:min-h-[36px] px-3 text-xs font-mono tabular-nums font-bold rounded-md border transition-colors cursor-pointer ${
                        effectiveUnitPrice === floorPrice
                          ? 'bg-[#B45309] text-white border-[#B45309]'
                          : 'bg-amber-50 hover:bg-amber-100 text-[#B45309] border-amber-200'
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
                      className="min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold bg-white hover:bg-[#F5F5F5] text-[#111111] rounded-md border border-neutral-200/80 transition-colors cursor-pointer"
                      title="আসল MRP ফিরিয়ে আনুন"
                    >
                      MRP
                    </button>
                  )}
                </div>
              </div>

              {/* গিরা হিসাব ও ডিসকাউন্ট ইনফো বার */}
              <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
                <span className="text-[#525252] text-[11px] flex items-center gap-1">
                  <span>প্রতি গিরা কার্যকর দর:</span>
                  <strong className="text-[#111111] font-mono tabular-nums font-bold">{currencySymbol}{perGiraPrice.toFixed(2)}</strong>
                  <span className="text-[#737373] font-mono tabular-nums">({currencySymbol}{effectiveUnitPrice.toFixed(2)} ÷ ১৬)</span>
                </span>

                {isBargained && !isBelowFloor && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-bold text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                    <span>গজ প্রতি সাশ্রয়: {currencySymbol}{savingsPerYard.toFixed(2)}</span>
                  </span>
                )}
              </div>

              {/* ফ্লোর প্রাইস লঙ্ঘন সতর্কতা */}
              {isBelowFloor && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-[#B91C1C] text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                  <span className="font-mono tabular-nums">
                    দামাদামির সীমা লঙ্ঘন: এই কাপড়ের নূন্যতম বিক্রয়মূল্য {currencySymbol}{floorPrice.toFixed(2)} এর নিচে বিক্রি করা যাবে না!
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* ============ ডান কলাম: লাইভ কাটিং ও ডিজিটাল মেমো প্রিভিউ (৫ কলাম) ============ */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* লাইভ প্রিভিউ কার্ড */}
            <div className="bg-[#FAFAFA] border border-neutral-200/80 rounded-lg p-4 sm:p-5 space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#111111] font-semibold tracking-tight text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-[#0F172A]" />
                  <span>লাইভ কাটিং প্রিভিউ ও ডিজিটাল মেমো</span>
                </div>
                <span className="text-[10px] font-semibold text-[#525252] bg-white border border-neutral-200/80 px-2 py-0.5 rounded-md">
                  রিয়েলটাইম
                </span>
              </div>

              {/* ডিজিটাল ফ্যাব্রিক মেমো স্লিপ (কার্ড) */}
              <div className="bg-white border border-neutral-200/80 rounded-lg p-4 text-[#111111] select-none space-y-3">
                
                {/* মেমো হেডার ও দোকান */}
                <div className="text-center border-b border-dashed border-neutral-300 pb-2">
                  <div className="font-bold text-xs uppercase tracking-widest text-[#111111]">
                    {storeName}
                  </div>
                  <div className="text-[10px] font-semibold text-[#525252] mt-0.5 flex items-center justify-center gap-1">
                    <Receipt className="w-3 h-3 text-[#0F172A]" />
                    <span>ফ্যাব্রিক কাটিং ও পিওএস ভাউচার স্লিপ</span>
                  </div>
                </div>

                {/* পণ্য তথ্য ও থাম্বনেইল */}
                <div className="flex items-center space-x-3 bg-[#FAFAFA] p-2.5 rounded-md border border-neutral-200/80">
                  <div className="w-12 h-12 rounded-md bg-white border border-neutral-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                    {product.ImageUrl ? (
                      <img 
                        src={product.ImageUrl} 
                        alt={product.ProductName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Ruler className="w-5 h-5 text-[#0F172A] stroke-[1.5]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#111111] truncate" title={product.ProductName}>
                      {product.ProductName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono tabular-nums text-[#737373]">
                      <span>#{product.ProductID}</span>
                      <span>•</span>
                      <span>একক: {product.Unit || 'গজ'}</span>
                    </div>
                  </div>
                </div>

                {/* কাপড়ের রোল কাটিং প্রগ্রেস বার */}
                <div className="space-y-1 bg-[#F5F5F5] p-2.5 rounded-md border border-neutral-200/80">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#111111]">
                    <span className="flex items-center gap-1 text-[#111111]">
                      <Scissors className="w-3 h-3 text-[#0F172A]" />
                      <span>কাটিং অনুপাত:</span>
                    </span>
                    <span className="text-[#111111] font-mono tabular-nums font-bold">
                      {totalYards} গজ / মোট {stockQuantity} গজ রোল
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0F172A] rounded-full transition-all duration-300"
                      style={{ width: `${cutPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* মেজারমেন্ট স্পেসিফিকেশন টেবিল */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[#FAFAFA] rounded-md border border-neutral-200/80">
                    <div className="text-[10px] text-[#737373] font-semibold uppercase">কাটার পরিমাণ</div>
                    <div className="font-bold font-mono tabular-nums text-[#111111] text-sm mt-0.5">
                      {goj} গজ {gira > 0 ? `${gira} গিরা` : ''}
                    </div>
                    <div className="text-[10px] text-[#525252] font-mono tabular-nums font-medium">
                      মোট: {totalYards} গজ
                    </div>
                  </div>

                  <div className="p-2 bg-[#FAFAFA] rounded-md border border-neutral-200/80">
                    <div className="text-[10px] text-[#737373] font-semibold uppercase">ইঞ্চি স্কেল</div>
                    <div className="font-bold font-mono tabular-nums text-[#111111] text-sm mt-0.5">
                      {totalInches} ইঞ্চি (")
                    </div>
                    <div className="text-[10px] text-[#525252] font-medium">
                      টেইলার্স পরিমাপ
                    </div>
                  </div>
                </div>

                {/* মূল্য তালিকা ও মোট বিল বক্স */}
                <div className="p-3.5 bg-[#0F172A] text-white rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">প্রতি গজ রেট:</span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      {currencySymbol}{effectiveUnitPrice.toFixed(2)}
                      {isBargained && <span className="text-red-300 line-through text-[10px] ml-1.5 font-normal">MRP {currencySymbol}{originalSellingPrice.toFixed(2)}</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">প্রতি গিরা দর:</span>
                    <span className="font-mono tabular-nums text-neutral-200">{currencySymbol}{perGiraPrice.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-700 pt-2 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                        সর্বমোট প্রদেয় বিল:
                      </span>
                      {isBargained && totalSavings > 0 && (
                        <span className="text-[10px] font-mono tabular-nums font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                          সাশ্রয়: {currencySymbol}{totalSavings.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-mono tabular-nums font-bold text-amber-400 tracking-tight">
                        {currencySymbol}{totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* সহায়ক নির্দেশিকা নোট */}
              <div className="text-center space-y-1">
                <p className="text-xs text-[#111111] font-semibold font-mono tabular-nums">
                  মোট {formatFabricQuantity(totalYards, 'গজ')} কাপড় কার্টে যুক্ত হবে
                </p>
                <p className="text-[11px] text-[#525252] font-medium">
                  কার্ট এবং মেমোতে গজ, গিরা ও নির্ধারিত দর পৃথকভাবে মুদ্রিত হবে
                </p>
              </div>

              {/* স্টক অ্যালার্ট */}
              {isOverStock && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-[#B91C1C] text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
                  <span className="font-mono tabular-nums">দোকানের মজুদের চেয়ে বেশি পরিমাণ নির্বাচন করা হয়েছে! (সর্বোচ্চ মজুদ: {maxSelectable} গজ)</span>
                </div>
              )}

              {/* পর্যাপ্ত স্টক স্ট্যাটাস */}
              {!isOverStock && stockQuantity > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-[#15803D] text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span className="font-mono tabular-nums">স্টকে পর্যাপ্ত কাপড় রয়েছে (অবশিষ্ট মজুদ: {stockQuantity} গজ)</span>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* ================= ৩. ফুটার অ্যাকশন বার ================= */}
        <div className="px-6 py-3.5 bg-[#FAFAFA] border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-semibold text-[#525252] text-center sm:text-left font-mono tabular-nums">
            সারসংক্ষেপ: <span className="text-[#111111] font-bold">{formatFabricQuantity(totalYards, 'গজ')}</span> 
            {' • '} 
            দর: <span className="text-[#111111] font-bold">{currencySymbol}{effectiveUnitPrice.toFixed(2)}/গজ</span>
            {' • '}
            মোট প্রদেয়: <span className="text-[#15803D] font-bold text-sm">{currencySymbol}{totalPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#525252] hover:text-[#111111] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              type="button"
              onClick={handleAdd}
              disabled={totalYards <= 0 || (isOverStock && maxSelectable > 0) || isBelowFloor}
              className="min-h-[44px] sm:min-h-[36px] px-6 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold font-mono tabular-nums flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <span>কার্টে যোগ করুন ({currencySymbol}{totalPrice.toFixed(2)})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
