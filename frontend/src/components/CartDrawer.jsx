import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  Package,
  Scissors,
  Layers,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { isFabricUnit } from '../utils/fabricUtils';

/**
 * Fastkart-স্টাইল স্লাইড-ওভার অফ-ক্যানভাস কার্ট ড্রয়ার (Slide-Over Cart Drawer)
 * - ক্যাটালগ পেজ থেকে বের না হয়েই কার্ট দেখা ও পরিমার্জন
 * - রিয়েল-টাইম কোয়ান্টিটি স্টিপার (-, +) ও আইটেম রিমুভ
 * - থান/গজ ফেব্রিক স্পেসিফিকেশন প্রদর্শন
 * - কুপন কোড ও ইনস্ট্যান্ট সাবটোটাল সামারি
 * - সরাসরি চেকআউট বা বিস্তারিত কার্ট পেজে যাওয়ার একশন
 */
export default function CartDrawer({
  isOpen = false,
  onClose,
  cartItems = [],
  currencySymbol = '৳',
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onNavigateToCheckout,
  onNavigateToCartPage,
  discountAmount = 0,
  setDiscountAmount,
  coupons = []
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');

  if (!isOpen) return null;

  // মোট আইটেম ও ইউনিট হিসাব
  const totalUnits = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  
  // সাব-টোটাল হিসাব
  const subTotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0),
    0
  );

  // কুপন ডিসকাউন্ট হিসাব
  const effectiveDiscount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, subTotal - effectiveDiscount);

  // কুপন কোড অ্যাপ্লাই হ্যান্ডলার
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');

    if (!couponInput.trim()) {
      setCouponError('কুপন কোড লিখুন');
      return;
    }

    const clean = couponInput.trim().toUpperCase();
    const found = (coupons || []).find((c) => String(c.CouponCode).toUpperCase() === clean);

    if (!found) {
      setCouponError('অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড');
      return;
    }

    if (found.Status === 'Inactive') {
      setCouponError('এই কুপনটি বর্তমানে নিষ্ক্রিয়');
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
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    if (setDiscountAmount) {
      setDiscountAmount(0);
    }
    setAppliedCouponCode('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* ব্যাকড্রপ ওভারলে */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* স্লাইড-ওভার প্যানেল কন্টেইনার */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* ১. ড্রয়ার হেডার */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  শপিং কার্ট
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {totalUnits}টি আইটেম সংযুক্ত আছে
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {cartItems.length > 0 && onClearCart && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="সম্পূর্ণ কার্ট খালি করুন"
                >
                  খালি করুন
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="ড্রয়ার বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ২. ড্রয়ার স্ক্রোলেবল বডি (আইটেম তালিকা) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0 divide-y divide-slate-100">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">আপনার কার্ট এখনও খালি!</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    ক্যাটালগ থেকে পছন্দের কাপড় বা পণ্য কার্টে যোগ করে কেনাকাটা শুরু করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  পণ্য ক্যাটালগ দেখুন
                </button>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const itemKey = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId) || idx;
                const isFabric = isFabricUnit(item.unit);
                const itemTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);

                return (
                  <div key={itemKey} className="pt-3 first:pt-0 flex items-start space-x-3 group">
                    {/* থাম্বনেইল ছবি */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400 stroke-1" />
                      )}
                    </div>

                    {/* বিবরণ ও মূল্য */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                        {item.name}
                      </h4>

                      {/* ফেব্রিক ও ভ্যারিয়েন্ট বিবরণ */}
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {item.variantName && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            {item.variantName}
                          </span>
                        )}
                        {isFabric && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center space-x-0.5">
                            <Scissors className="w-2.5 h-2.5" />
                            <span>{item.quantity} {item.unit || 'গজ'}</span>
                          </span>
                        )}
                      </div>

                      {/* একক দর ও মোট দর */}
                      <div className="flex items-baseline space-x-1.5 mt-1">
                        <span className="text-xs font-black text-slate-900">
                          {currencySymbol}{itemTotal.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({currencySymbol}{item.sellingPrice} / {item.unit || 'টি'})
                        </span>
                      </div>
                    </div>

                    {/* Fastkart কোয়ান্টিটি স্টিপার ও রিমুভ বাটন */}
                    <div className="flex flex-col items-end space-y-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRemoveItem && onRemoveItem(itemKey)}
                        className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="কার্ট থেকে মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200/80 overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity && onUpdateQuantity(itemKey, Math.max(0, (Number(item.quantity) || 1) - 1))}
                          className="px-2 py-1 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors cursor-pointer"
                          title="কমান"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-2 text-xs font-black text-slate-800 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity && onUpdateQuantity(itemKey, (Number(item.quantity) || 0) + 1)}
                          className="px-2 py-1 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors cursor-pointer"
                          title="বাড়ান"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* ৩. ফিক্সড ফুটার: কুপন, সাব-টোটাল ও চেকআউট বাটন */}
          {cartItems.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200/90 bg-slate-50/80 space-y-3 shrink-0">
              
              {/* কুপন কোড ইনপুট */}
              {appliedCouponCode ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>কুপন <strong>{appliedCouponCode}</strong> সক্রিয় (-{currencySymbol}{effectiveDiscount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-emerald-700 hover:text-rose-600 font-bold underline text-[11px] cursor-pointer"
                  >
                    মুছুন
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="কুপন কোড লিখুন..."
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      প্রয়োগ
                    </button>
                  </div>
                  {couponError && (
                    <span className="text-[10px] text-rose-600 font-semibold block">{couponError}</span>
                  )}
                </form>
              )}

              {/* আর্থিক হিসাব সারসংক্ষেপ */}
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>মোট বিক্রয়মূল্য</span>
                  <span className="font-bold text-slate-800">{currencySymbol}{subTotal.toLocaleString('en-US')}</span>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>বিশেষ ছাড়</span>
                    <span>-{currencySymbol}{effectiveDiscount.toLocaleString('en-US')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>সর্বমোট প্রদেয়</span>
                  <span className="text-emerald-700">{currencySymbol}{grandTotal.toLocaleString('en-US')}</span>
                </div>
              </div>

              {/* প্রধান অ্যাকশন বাটনসমূহ */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToCheckout) onNavigateToCheckout();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  <span>ক্যাশ মেমো / অর্ডার চেকআউট</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {onNavigateToCartPage && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToCartPage();
                    }}
                    className="w-full py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    সম্পূর্ণ কার্ট পেজ দেখুন →
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

