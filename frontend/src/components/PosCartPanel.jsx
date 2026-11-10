import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Scissors,
  Layers,
  ArrowRight,
  PauseCircle,
  Tag,
  CheckCircle2,
  Sparkles,
  Receipt,
  RotateCcw,
  User,
  ShoppingBag,
  Percent,
  X
} from 'lucide-react';
import { isFabricUnit, formatFabricQuantity } from '../utils/fabricUtils';

/**
 * PosCartPanel - আধুনিক স্প্লিট-স্ক্রিন POS লাইভ কার্ট ও কুইক বিলিং টার্মিনাল
 * - বামপাশের ক্যাটালগে ক্লিক করলেই রিয়েল-টাইম আইটেম যুক্ত হয়
 * - গজ-গিরা ফেব্রিক স্পেসিফিকেশন ও কালার/সাইজ ভ্যারিয়েন্ট প্রদর্শন
 * - তাত্ক্ষণিক ডিসকাউন্ট, কুপন এবং সর্বমোট হিসাব
 * - ১-ক্লিকে দ্রুত ক্যাশ গ্রহণ (F9), হোল্ড কার্ট (F4) ও টেইলারিং হ্যান্ডঅফ
 */
export default function PosCartPanel({
  cartItems = [],
  currencySymbol = '৳',
  taxRatePercent = 0,
  onUpdateQuantity,
  onUpdateItemPrice,
  onRemoveItem,
  onClearCart,
  discountAmount = 0,
  setDiscountAmount,
  coupons = [],
  activeUser,
  heldCarts = [],
  onHoldCart,
  onResumeHeldCart,
  onOpenHeldCartsModal,
  onSendToTailoring,
  onNavigateToCheckout,
  onQuickCashCheckout,
  onOpenCustomerSelect
}) {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percent'
  const [discountPercentVal, setDiscountPercentVal] = useState('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // মোট আইটেম ও ইউনিট
  const totalItemCount = cartItems.length;
  const totalUnits = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  // সাব-টোটাল হিসাব
  const subTotal = useMemo(() => {
    return cartItems.reduce(
      (acc, item) => acc + (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0),
      0
    );
  }, [cartItems]);

  // কার্যকরী ছাড় (Discount) হিসাব
  const effectiveDiscount = useMemo(() => {
    if (discountType === 'percent' && discountPercentVal) {
      const p = Math.min(100, Math.max(0, parseFloat(discountPercentVal) || 0));
      return Math.round(((subTotal * p) / 100) * 100) / 100;
    }
    return Math.min(subTotal, Math.max(0, Number(discountAmount) || 0));
  }, [subTotal, discountAmount, discountType, discountPercentVal]);

  // ভ্যাট/ট্যাক্স হিসাব
  const taxAmount = useMemo(() => {
    if (!taxRatePercent || taxRatePercent <= 0) return 0;
    const taxable = Math.max(0, subTotal - effectiveDiscount);
    return Math.round(((taxable * taxRatePercent) / 100) * 100) / 100;
  }, [subTotal, effectiveDiscount, taxRatePercent]);

  // সর্বমোট প্রদেয় (Grand Total)
  const grandTotal = useMemo(() => {
    return Math.max(0, Math.round(subTotal - effectiveDiscount + taxAmount));
  }, [subTotal, effectiveDiscount, taxAmount]);

  // কারেন্সি ফরম্যাটার
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // কুপন অ্যাপ্লাই হ্যান্ডলার
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCodeInput.trim()) return;

    const clean = couponCodeInput.trim().toUpperCase();
    const found = (coupons || []).find((c) => String(c.CouponCode).toUpperCase() === clean);

    if (!found) {
      setCouponError('অবৈধ কুপন কোড');
      return;
    }
    if (found.Status === 'Inactive') {
      setCouponError('কুপনটি নিষ্ক্রিয়');
      return;
    }

    let calculatedDiscount = 0;
    if (found.DiscountType === 'Percentage') {
      calculatedDiscount = (subTotal * (Number(found.DiscountValue) || 0)) / 100;
      if (found.MaxDiscount && calculatedDiscount > Number(found.MaxDiscount)) {
        calculatedDiscount = Number(found.MaxDiscount);
      }
    } else {
      calculatedDiscount = Number(found.DiscountValue) || 0;
    }

    if (setDiscountAmount) {
      setDiscountAmount(calculatedDiscount);
    }
    setAppliedCouponCode(clean);
    setCouponCodeInput('');
  };

  const handleRemoveCoupon = () => {
    if (setDiscountAmount) setDiscountAmount(0);
    setAppliedCouponCode('');
    setDiscountPercentVal('');
  };

  // ফ্ল্যাট ডিসকাউন্ট হ্যান্ডলার
  const handleFlatDiscountChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    if (setDiscountAmount) {
      setDiscountAmount(num);
    }
  };

  // কোনো কাপড়ের আইটেম কার্টে আছে কিনা
  const hasFabricItems = useMemo(() => {
    return cartItems.some(item => isFabricUnit(item.unit || item.Unit));
  }, [cartItems]);

  return (
    <div className="flex flex-col h-full bg-white select-none relative">
      
      {/* ================= ১. প্যানেল হেডার ================= */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white shrink-0 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white">
                লাইভ বিক্রয় কার্ট
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                {totalItemCount} আইটেম
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">
              কাউন্টার বিলিং ও তাৎক্ষণিক মেমো
            </span>
          </div>
        </div>

        {/* হেডার অ্যাকশন: হোল্ড কার্ট ও কার্ট খালি */}
        <div className="flex items-center space-x-1.5">
          {heldCarts.length > 0 && onOpenHeldCartsModal && (
            <button
              type="button"
              onClick={onOpenHeldCartsModal}
              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
              title="হোল্ডকৃত অর্ডার তালিকা"
            >
              <PauseCircle className="w-3 h-3 text-amber-300" />
              <span>হোল্ড ({heldCarts.length})</span>
            </button>
          )}

          {cartItems.length > 0 && onClearCart && (
            <button
              type="button"
              onClick={onClearCart}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="সম্পূর্ণ কার্ট খালি করুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ================= ২. কার্ট আইটেম তালিকা ================= */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 bg-slate-50/50">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-300 mb-2.5">
              <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-700">
              কার্ট বর্তমানে খালি রয়েছে
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
              পণ্য যুক্ত করতে বামপাশের ক্যাটালগে ক্লিক করুন অথবা বারকোড স্ক্যান করুন <span className="font-mono font-bold text-slate-600">[F1]</span>
            </p>
          </div>
        ) : (
          cartItems.map((item, idx) => {
            const isFabric = isFabricUnit(item.unit || item.Unit);
            const lineTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);
            const fabricDetail = isFabric ? formatFabricQuantity(item.quantity, 'গজ', false) : null;

            return (
              <div
                key={item.cartItemId || item.productId || idx}
                className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col gap-1.5 group"
              >
                {/* আইটেম হেডার ও নাম */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate block leading-snug">
                        {item.name || item.productName || item.ProductName}
                      </span>
                    </div>

                    {/* ভ্যারিয়েন্ট বা ফেব্রিক ব্যাজ */}
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {item.variantName && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <Layers className="w-2.5 h-2.5 text-slate-500" />
                          <span>{item.variantName}</span>
                        </span>
                      )}

                      {isFabric ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <Scissors className="w-2.5 h-2.5 text-amber-600" />
                          <span>কাটা কাপড়: {fabricDetail || `${item.quantity} গজ`}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-medium">
                          একক: {item.unit || item.Unit || 'Pcs'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* আইটেম রিমুভ বাটন */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem && onRemoveItem(item.cartItemId || item.productId)}
                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="আইটেমটি মুছুন"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* আইটেম প্রাইস ও কোয়ান্টিটি স্টিপার বার */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-[10px] text-slate-400">দর:</span>
                    <span className="text-xs font-bold text-slate-700">
                      {formatCurrency(item.sellingPrice)}
                    </span>
                    {isFabric && <span className="text-[9px] text-slate-400">/গজ</span>}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* কোয়ান্টিটি স্টিপার */}
                    {isFabric ? (
                      <div className="flex items-center px-2 py-0.5 bg-amber-50/80 rounded-lg border border-amber-200/80 text-[11px] font-mono font-bold text-amber-900">
                        {item.quantity} গজ
                      </div>
                    ) : (
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/70">
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = Number(item.quantity) - 1;
                            if (newQ <= 0) {
                              onRemoveItem && onRemoveItem(item.cartItemId || item.productId);
                            } else {
                              onUpdateQuantity && onUpdateQuantity(item.cartItemId || item.productId, newQ);
                            }
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1.5 text-xs font-bold text-slate-800 font-mono min-w-[1.25rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = Number(item.quantity) + 1;
                            onUpdateQuantity && onUpdateQuantity(item.cartItemId || item.productId, newQ);
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {/* লাইন টোটাল */}
                    <span className="text-xs font-black text-slate-900 min-w-[50px] text-right">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= ৩. ছাড় ও কুপন বার (সংক্ষিপ্ত ও কমপ্যাক্ট) ================= */}
      {cartItems.length > 0 && (
        <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
            >
              <Tag className="w-3 h-3" />
              <span>{showDiscountInput ? 'ছাড় ও কুপন বন্ধ করুন' : '+ ছাড় বা কুপন কোড যুক্ত করুন'}</span>
            </button>

            {effectiveDiscount > 0 && (
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                ছাড়: -{formatCurrency(effectiveDiscount)}
              </span>
            )}
          </div>

          {showDiscountInput && (
            <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
              {/* কুপন বা ফ্ল্যাট ছাড় ইনপুট */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="কুপন কোড লিখুন..."
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  কুপন
                </button>
              </div>

              {couponError && (
                <span className="text-[10px] text-rose-600 font-medium block">
                  {couponError}
                </span>
              )}

              {/* সরাসরি টাকার ফ্ল্যাট ছাড় */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-bold shrink-0">নগদ ছাড় (৳):</span>
                <input
                  type="number"
                  min="0"
                  placeholder="০"
                  value={discountAmount || ''}
                  onChange={(e) => handleFlatDiscountChange(e.target.value)}
                  className="w-20 px-2 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                />
                {effectiveDiscount > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-md text-[10px] font-bold cursor-pointer"
                    title="ছাড় বাতিল করুন"
                  >
                    রিমুভ
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= ৪. বিলিং সামারি ও অ্যাকশন বোতাম ================= */}
      {cartItems.length > 0 && (
        <div className="p-3.5 bg-white border-t border-slate-200 space-y-2.5 shrink-0 shadow-lg">
          {/* হিসাব সারসংক্ষেপ */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>সাবটোটাল</span>
              <span className="font-mono font-bold text-slate-700">{formatCurrency(subTotal)}</span>
            </div>

            {effectiveDiscount > 0 && (
              <div className="flex items-center justify-between text-rose-600 font-bold">
                <span>বিশেষ ছাড়</span>
                <span className="font-mono">-{formatCurrency(effectiveDiscount)}</span>
              </div>
            )}

            {taxRatePercent > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span>ভ্যাট ({taxRatePercent}%)</span>
                <span className="font-mono font-bold text-slate-700">{formatCurrency(taxAmount)}</span>
              </div>
            )}

            <div className="flex items-baseline justify-between pt-1.5 border-t border-dashed border-slate-200">
              <span className="text-xs sm:text-sm font-black text-slate-900">সর্বমোট প্রদেয়</span>
              <span className="text-base sm:text-lg font-black text-[#0da487] font-mono tracking-tight">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* প্রধান অ্যাকশন: ১-ক্লিক দ্রুত ক্যাশ গ্রহণ (F9) */}
          <button
            type="button"
            onClick={() => {
              if (onQuickCashCheckout) {
                onQuickCashCheckout();
              } else if (onNavigateToCheckout) {
                onNavigateToCheckout();
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-[#0da487] hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center space-x-1.5">
              <Receipt className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>নগদ ক্যাশ গ্রহণ ও বিল</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-mono font-bold text-white">F9</span>
            </span>
            <span className="font-mono text-white text-xs sm:text-sm">
              {formatCurrency(grandTotal)} →
            </span>
          </button>

          {/* দ্বিতীয় সারি বাটন: পূর্ণ চেকআউট, হোল্ড ও টেইলারিং */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {onHoldCart && (
              <button
                type="button"
                onClick={onHoldCart}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 border border-slate-200/80"
                title="কার্টটি পরে বিক্রির জন্য হোল্ডে রাখুন [F4]"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>হোল্ড [F4]</span>
              </button>
            )}

            {hasFabricItems && onSendToTailoring ? (
              <button
                type="button"
                onClick={onSendToTailoring}
                className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 border border-purple-200"
                title="কাপড়টি সেলাই বা টেইলারিং অর্ডারে পাঠান"
              >
                <Scissors className="w-3.5 h-3.5 text-purple-600" />
                <span>টেইলারিং</span>
              </button>
            ) : onNavigateToCheckout ? (
              <button
                type="button"
                onClick={onNavigateToCheckout}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 border border-slate-200/80"
                title="বিকাশ, কার্ড বা বাকিতে বিক্রয়ের জন্য পূর্ণাঙ্গ চেকআউট"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span>বিস্তারিত বিলিং</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
