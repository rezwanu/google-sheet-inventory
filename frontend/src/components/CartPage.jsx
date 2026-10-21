import React, { useState, useMemo } from 'react';
import { isFabricUnit, parseGojGira, calculateTotalYards } from '../utils/fabricUtils';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Tag,
  Package,
  ShieldCheck,
  Percent,
  Receipt,
  Sparkles,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  UserPlus,
  Gift,
  LogIn,
  Lock,
  BadgeCheck,
  Zap,
  Clock,
  Check,
  Store
} from 'lucide-react';

export default function CartPage({
  cartItems = [],
  currencySymbol = '৳',
  taxRatePercent = 0,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onNavigateToCatalog,
  onNavigateToCheckout,
  discountAmount = 0,
  setDiscountAmount,
  coupons = [],
  activeUser = null,
  onOpenAuthModal,
}) {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');

  // ব্যবহারকারীর অথেনটিকেশন ও রোল নির্ধারণ
  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isAdmin = Boolean(
    activeUser &&
      (activeUser.Role === 'Admin' ||
        activeUser.Role === 'Owner' ||
        activeUser.Role === 'Manager' ||
        activeUser.Role === 'Cashier')
  );

  // মোট আইটেম সংখ্যা এবং ইউনিট হিসাব
  const totalItemsCount = cartItems.length;
  const totalUnits = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  // সাব-টোটাল হিসাব
  const subTotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0),
    0
  );

  // কার্টের আইটেমগুলোর জন্য প্রযোজ্য ও সক্রিয় কুপনসমূহ ফিল্টার
  const availableCouponsForCart = useMemo(() => {
    if (!Array.isArray(coupons) || cartItems.length === 0) return [];
    const now = new Date();
    return coupons.filter((c) => {
      if (c.Status === 'Inactive') return false;
      if (c.ExpiryDate) {
        const expDate = new Date(c.ExpiryDate);
        expDate.setHours(23, 59, 59, 999);
        if (now > expDate) return false;
      }
      if (c.UsageLimit > 0 && Number(c.UsedCount) >= Number(c.UsageLimit)) return false;

      // ১. নির্দিষ্ট পণ্যভিত্তিক কুপন যাচাই (কার্টের পণ্যের সাথে মিল থাকলে)
      if (c.ApplicableType === 'SpecificProduct' && c.ProductID) {
        return cartItems.some(
          (item) =>
            String(item.productId || '').trim() === String(c.ProductID).trim() ||
            (item.barcode && String(item.barcode).trim() === String(c.ProductID).trim())
        );
      }

      // ২. সকল পণ্যের কুপন (All Products / কার্টে পণ্য থাকলে প্রযোজ্য)
      if (c.ApplicableType === 'AllProducts' || !c.ApplicableType || !c.ProductID) {
        return true;
      }

      return false;
    });
  }, [coupons, cartItems]);

  const hasSpecificProductCoupon = availableCouponsForCart.some(
    (c) => c.ApplicableType === 'SpecificProduct' && c.ProductID
  );

  // কারেন্সি ফরম্যাট হেল্পার
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // কুপন কোড যাচাই ও প্রয়োগ করার কোর ফাংশন
  const applyCouponByCode = (rawCode) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return;

    // ১. ডাটাবেসের কুপন তালিকা থেকে কুপন মিলানো
    const foundCoupon = Array.isArray(coupons)
      ? coupons.find((c) => c.CouponCode && c.CouponCode.trim().toUpperCase() === code)
      : null;

    if (foundCoupon) {
      // স্ট্যাটাস পরীক্ষা
      if (foundCoupon.Status === 'Inactive') {
        setCouponError('এই কুপনটি বর্তমানে নিষ্ক্রিয় রয়েছে।');
        return;
      }

      // মেয়াদ পরীক্ষা
      if (foundCoupon.ExpiryDate) {
        const expDate = new Date(foundCoupon.ExpiryDate);
        expDate.setHours(23, 59, 59, 999);
        if (new Date() > expDate) {
          setCouponError('এই কুপনটির মেয়াদ উত্তীর্ণ হয়ে গেছে।');
          return;
        }
      }

      // ব্যবহারের সীমা পরীক্ষা
      if (foundCoupon.UsageLimit > 0 && Number(foundCoupon.UsedCount) >= Number(foundCoupon.UsageLimit)) {
        setCouponError('এই কুপনটির ব্যবহারের সর্বোচ্চ সীমা শেষ হয়ে গেছে।');
        return;
      }

      // সর্বনিম্ন অর্ডারের অংক পরীক্ষা
      if (Number(foundCoupon.MinPurchaseAmount) > 0 && subTotal < Number(foundCoupon.MinPurchaseAmount)) {
        setCouponError(`এই কুপনটি পেতে সর্বনিম্ন ${formatCurrency(foundCoupon.MinPurchaseAmount)} টাকার কেনাকাটা আবশ্যক।`);
        return;
      }

      // পণ্যভিত্তিক কুপন যাচাই (Product-Wise Coupon)
      if (foundCoupon.ApplicableType === 'SpecificProduct' && foundCoupon.ProductID) {
        const targetItem = cartItems.find(
          (item) =>
            String(item.productId || '').trim() === String(foundCoupon.ProductID).trim() ||
            String(item.barcode || '').trim() === String(foundCoupon.ProductID).trim()
        );

        if (!targetItem) {
          setCouponError(
            `এই কুপনটি শুধুমাত্র '${foundCoupon.ProductName || 'নির্দিষ্ট পণ্য'}' এর জন্য প্রযোজ্য, যা কার্টে নেই!`
          );
          return;
        }

        const itemSubtotal = (Number(targetItem.sellingPrice) || 0) * (Number(targetItem.quantity) || 0);
        let disc = 0;
        if (foundCoupon.DiscountType === 'Percentage') {
          disc = (itemSubtotal * Number(foundCoupon.DiscountValue)) / 100;
          if (Number(foundCoupon.MaxDiscountAmount) > 0) {
            disc = Math.min(disc, Number(foundCoupon.MaxDiscountAmount));
          }
        } else {
          disc = Math.min(Number(foundCoupon.DiscountValue), itemSubtotal);
        }

        disc = Math.round(disc);
        setDiscountAmount(disc);
        setAppliedCoupon(code);
        setCouponError('');
        return;
      }

      // সার্বজনীন / সকল পণ্যে প্রযোজ্য কুপন (All Products Coupon)
      let disc = 0;
      if (foundCoupon.DiscountType === 'Percentage') {
        disc = (subTotal * Number(foundCoupon.DiscountValue)) / 100;
        if (Number(foundCoupon.MaxDiscountAmount) > 0) {
          disc = Math.min(disc, Number(foundCoupon.MaxDiscountAmount));
        }
      } else {
        disc = Math.min(Number(foundCoupon.DiscountValue), subTotal);
      }

      disc = Math.round(disc);
      setDiscountAmount(disc);
      setAppliedCoupon(code);
      setCouponError('');
      return;
    }

    // ২. ডেমো ফলব্যাক কুপন কোড
    if (code === 'DISCOUNT10' || code === 'EID10') {
      const disc = Math.round(subTotal * 0.1);
      setDiscountAmount(disc);
      setAppliedCoupon(code);
      setCouponError('');
    } else if (code === 'SAVE50') {
      const disc = Math.min(50, subTotal);
      setDiscountAmount(disc);
      setAppliedCoupon(code);
      setCouponError('');
    } else {
      setCouponError('অবৈধ কুপন কোড! অনুগ্রহ করে সঠিক কোড প্রদান করুন।');
    }
  };

  // কুপন ফর্ম সাবমিট হ্যান্ডলার
  const handleApplyCoupon = (e) => {
    if (e) e.preventDefault();
    applyCouponByCode(couponInput);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponInput('');
    setDiscountAmount(0);
    setCouponError('');
  };

  // ডিসকাউন্ট এবং ট্যাক্স হিসাব
  const discount = Math.max(0, Math.min(Number(discountAmount) || 0, subTotal));
  const taxableAmount = Math.max(0, subTotal - discount);
  const taxAmount = parseFloat(((taxableAmount * (Number(taxRatePercent) || 0)) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col animate-in fade-in duration-200">
      
      {/* ================= ১. পেশাদার মাল্টি-স্টেপ প্রোগ্রেস বার (Modern Stepper) ================= */}
      <div className="mb-6 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  শপিং কার্ট (Shopping Cart)
                </h1>
                {cartItems.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {totalItemsCount} টি আইটেম • {totalUnits} পিস
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                নির্বাচিত পণ্যের পরিমাণ যাচাই করুন এবং চূড়ান্ত অর্ডারের জন্য চেকআউটে এগিয়ে যান
              </p>
            </div>
          </div>

          {/* কানেক্টেড স্টেপস বার */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 text-xs font-bold self-start md:self-auto">
            
            {/* স্টেপ ১ */}
            <button
              onClick={onNavigateToCatalog}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95"
            >
              <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-black">
                ১
              </span>
              <span>পণ্য ক্যাটালগ</span>
            </button>

            <span className="text-slate-300 font-bold">──</span>

            {/* স্টেপ ২: সক্রিয় */}
            <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <span className="w-5 h-5 rounded-full bg-white text-indigo-700 flex items-center justify-center text-[10px] font-black">
                ২
              </span>
              <span>শপিং কার্ট</span>
            </div>

            <span className="text-slate-300 font-bold">──</span>

            {/* স্টেপ ৩ */}
            <button
              onClick={cartItems.length > 0 ? onNavigateToCheckout : undefined}
              disabled={cartItems.length === 0}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                cartItems.length > 0
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer active:scale-95'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black">
                ৩
              </span>
              <span>চেকআউট ও পেমেন্ট</span>
            </button>

          </div>

        </div>
      </div>

      {/* ================= ২. কার্ট যদি সম্পূর্ণ খালি থাকে ================= */}
      {cartItems.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 sm:p-16 text-center shadow-xs flex flex-col items-center justify-center my-auto max-w-xl mx-auto w-full">
          <div className="w-24 h-24 rounded-3xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 mb-5 shadow-inner">
            <ShoppingCart className="w-12 h-12 stroke-[1.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            আপনার কার্ট সম্পূর্ণ খালি!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            বর্তমানে কোনো পণ্য কার্টে যুক্ত নেই। পণ্য ক্যাটালগ থেকে পছন্দসই পণ্য কার্টে যোগ করুন এবং সহজে অর্ডার সম্পন্ন করুন।
          </p>
          <button
            onClick={onNavigateToCatalog}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>পণ্য ক্যাটালগে ফিরে যান</span>
          </button>
        </div>
      ) : (
        /* ================= ৩. মূল কার্ট গ্রিড লেআউট ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* বাম কলাম: কার্টভুক্ত পণ্যসমূহের বিস্তারিত তালিকা (৮ কলাম) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
            
            {/* লিস্ট হেডার কন্ট্রোল বার */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    কার্টভুক্ত পণ্য তালিকা
                  </h3>
                  <p className="text-xs text-slate-500">
                    মোট <strong className="text-indigo-600 font-bold">{totalItemsCount}</strong> টি আইটেম • <strong className="text-indigo-600 font-bold">{totalUnits}</strong> পিস
                  </p>
                </div>
              </div>

              {/* পুরো কার্ট খালি করার বাটন */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('আপনি কি নিশ্চিত যে সম্পূর্ণ কার্ট খালি করতে চান?')) {
                    onClearCart();
                  }
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/80 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>কার্ট খালি করুন</span>
              </button>
            </div>

            {/* প্রতিটি পণ্যের কার্ড */}
            <div className="space-y-3">
              {cartItems.map((item) => {
                const itemKey = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
                const itemTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);
                const isAtMaxStock = item.quantity >= (Number(item.stockQuantity) || 9999);

                return (
                  <div
                    key={itemKey}
                    className="group bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
                  >
                    {/* থাম্বনেইল ও পণ্যের পরিচয় */}
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl || item.ImageUrl ? (
                          <img
                            src={item.imageUrl || item.ImageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-8 h-8 text-slate-300 stroke-1" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                            {item.productId}
                          </span>
                          {item.variantName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              ভ্যারিয়েন্ট: {item.variantName}
                            </span>
                          )}
                          {item.isBundle && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              কম্বো প্যাক
                            </span>
                          )}
                          {item.unit && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                              একক: {item.unit}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate group-hover:text-indigo-600 transition-colors" title={item.productName}>
                          {item.productName}
                          {item.variantName && (
                            <span className="ml-2 text-xs font-semibold text-indigo-600">
                              ({item.variantName})
                            </span>
                          )}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>
                            একক মূল্য: <strong className="text-slate-800">{formatCurrency(item.sellingPrice)}</strong>
                          </span>
                          {item.stockQuantity !== undefined && (
                            <span className="text-slate-400 font-medium">
                              (মজুদ: {item.stockQuantity} {item.unit || ''})
                            </span>
                          )}
                        </div>

                        {isAtMaxStock && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>সর্বোচ্চ বিদ্যমান স্টক নির্বাচন করা হয়েছে</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* কোয়ান্টিটি এবং লাইন টোটাল কন্ট্রোল */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      
                      {/* পরিমাণ কন্ট্রোলার (গজ কাপড়ের জন্য পৃথক গজ ও গিরা ইনপুট, অন্যান্য পণ্যের জন্য স্বাভাবিক ইনপুট) */}
                      {isFabricUnit(item.unit) ? (
                        (() => {
                          const { goj: currentGoj, gira: currentGira } = parseGojGira(item.quantity);
                          return (
                            <div className="flex flex-col items-end gap-1.5">
                              {/* দ্বৈত গজ ও গিরা ইনপুট বক্স */}
                              <div className="flex items-center gap-1.5 p-1 bg-amber-50/90 border border-amber-300/90 rounded-2xl shadow-2xs">
                                
                                {/* গজ বক্স */}
                                <div className="flex items-center bg-white border border-amber-300 rounded-xl p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextGoj = Math.max(0, currentGoj - 1);
                                      const total = calculateTotalYards(nextGoj, currentGira);
                                      if (total > 0) onUpdateQuantity(itemKey, total);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 active:scale-95 transition-all cursor-pointer"
                                    title="১ গজ কমান"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <div className="flex items-center px-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.stockQuantity || 9999}
                                      value={currentGoj}
                                      onChange={(e) => {
                                        const g = parseInt(e.target.value, 10);
                                        const safeGoj = isNaN(g) || g < 0 ? 0 : g;
                                        const total = calculateTotalYards(safeGoj, currentGira);
                                        onUpdateQuantity(itemKey, total);
                                      }}
                                      className="w-9 sm:w-11 text-center font-black text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[11px] font-black text-amber-900 pr-1 select-none">গজ</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextGoj = currentGoj + 1;
                                      const total = calculateTotalYards(nextGoj, currentGira);
                                      onUpdateQuantity(itemKey, total);
                                    }}
                                    disabled={isAtMaxStock}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                                    title="১ গজ বাড়ান"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <span className="text-sm font-black text-amber-600">+</span>

                                {/* গিরা বক্স (০-১৫ গিরা) */}
                                <div className="flex items-center bg-white border border-amber-300 rounded-xl p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      let nextGira = currentGira - 1;
                                      let nextGoj = currentGoj;
                                      if (nextGira < 0) {
                                        if (nextGoj > 0) {
                                          nextGoj -= 1;
                                          nextGira = 15;
                                        } else {
                                          nextGira = 0;
                                        }
                                      }
                                      const total = calculateTotalYards(nextGoj, nextGira);
                                      if (total > 0) onUpdateQuantity(itemKey, total);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 active:scale-95 transition-all cursor-pointer"
                                    title="১ গিরা কমান"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <div className="flex items-center px-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="15"
                                      value={currentGira}
                                      onChange={(e) => {
                                        const gi = parseInt(e.target.value, 10);
                                        const safeGira = isNaN(gi) || gi < 0 ? 0 : gi;
                                        const total = calculateTotalYards(currentGoj, safeGira);
                                        onUpdateQuantity(itemKey, total);
                                      }}
                                      className="w-8 sm:w-9 text-center font-black text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[11px] font-black text-amber-900 pr-1 select-none">গিরা</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextGira = currentGira + 1;
                                      const total = calculateTotalYards(currentGoj, nextGira);
                                      onUpdateQuantity(itemKey, total);
                                    }}
                                    disabled={isAtMaxStock}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                                    title="১ গিরা বাড়ান"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                              </div>

                              {/* মোট হিসাব ও দ্রুত ৪/৮/১২ গিরা শর্টকাট */}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className="text-[10px] font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                                  মোট: {item.quantity} গজ
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(itemKey, calculateTotalYards(currentGoj, 4))}
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    currentGira === 4 ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                                  }`}
                                  title="৪ গিরা (সোয়া গজ)"
                                >
                                  ৪ গিরা
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(itemKey, calculateTotalYards(currentGoj, 8))}
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    currentGira === 8 ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                                  }`}
                                  title="৮ গিরা (আধা গজ)"
                                >
                                  ৮ গিরা
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(itemKey, calculateTotalYards(currentGoj, 12))}
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    currentGira === 12 ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                                  }`}
                                  title="১২ গিরা (পৌনে গজ)"
                                >
                                  ১২ গিরা
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center bg-slate-100/80 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors active:scale-95 shadow-2xs cursor-pointer"
                            title="পরিমাণ কমান"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            max={item.stockQuantity || 9999}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                onUpdateQuantity(itemKey, Math.round(val * 10000) / 10000);
                              }
                            }}
                            className="w-16 text-center bg-transparent text-xs sm:text-sm font-black text-slate-900 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}
                            disabled={isAtMaxStock}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                            title="পরিমাণ বাড়ান"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* মোট মূল্য */}
                      <div className="text-right min-w-[90px]">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">মোট</p>
                        <p className="text-sm sm:text-base font-black text-slate-900">
                          {formatCurrency(itemTotal)}
                        </p>
                      </div>

                      {/* আইটেম রিমুভ বাটন */}
                      <button
                        type="button"
                        onClick={() => onRemoveItem(itemKey)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                        title="কার্ট থেকে পণ্যটি বাদ দিন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* নিচে ক্যাটালগে ফিরে যাওয়ার বাটন */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>আরও পণ্য যোগ করুন (ক্যাটালগে ফিরে যান)</span>
              </button>
            </div>

          </div>

          {/* ডান কলাম: অর্ডার সামারি ও চেকআউট অ্যাকশন (৪ কলাম) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 sticky top-24">
            
            {/* অর্ডার সামারি কার্ড */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <span>অর্ডার সারসংক্ষেপ</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {totalUnits} পিস পণ্য
                </span>
              </div>

              {/* কুপন বা ডিসকাউন্ট সেকশন */}
              {!isLoggedIn ? (
                /* অতিথি ব্যবহারকারী: যদি কার্টের পণ্যের জন্য বা সব পণ্যের জন্য কুপন থাকে, তবেই প্রমো কার্ড দেখাবে */
                availableCouponsForCart.length > 0 ? (
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-pink-50/80 p-4 shadow-xs transition-all hover:shadow-md">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-indigo-200/40 to-pink-200/30 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                        <Gift className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
                            {hasSpecificProductCoupon ? 'কার্ট পণ্যে কুপন অফার' : 'স্পেশাল কুপন অফার'}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {hasSpecificProductCoupon ? 'কার্টের পণ্যে কুপন ছাড় রয়েছে!' : 'আপনার অর্ডারে কুপন ছাড় প্রযোজ্য!'}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                          {hasSpecificProductCoupon
                            ? 'কার্টের পণ্যে কুপন কোড ব্যবহার করে অতিরিক্ত ছাড় ও সাশ্রয়ী মূল্যে কিনতে বিনামূল্যে অ্যাকাউন্ট তৈরি করুন অথবা সাইন-ইন করুন!'
                            : 'কুপন কোড ব্যবহার করে পুরো অর্ডারে অতিরিক্ত ছাড় ও সাশ্রয়ী মূল্যে কিনতে বিনামূল্যে অ্যাকাউন্ট তৈরি করুন অথবা সাইন-ইন করুন!'}
                        </p>

                        {/* বুলেট সুবিধা */}
                        <div className="mt-2.5 space-y-1 text-[11px] text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>ইনস্ট্যান্ট কুপন ছাড় ও ক্যাশ সেভিংস</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>সহজ ও দ্রুত লাইভ অর্ডার ট্র্যাকিং</span>
                          </div>
                        </div>

                        {/* সাইন আপ / লগইন CTA বাটন */}
                        {onOpenAuthModal && (
                          <button
                            type="button"
                            onClick={onOpenAuthModal}
                            className="mt-3.5 w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>বিনামূল্যে সাইন-আপ / লগইন করুন</span>
                          </button>
                        )}

                        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                          * অ্যাকাউন্ট ছাড়াও আপনি সাধারণ মূল্যে সরাসরি অর্ডার প্লেস করতে পারবেন।
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                /* লগইন করা থাকলে: কুপন ইনপুট ফিল্ড ও প্রযোজ্য কুপন চিপস */
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      <span>কুপন কোড বা ছাড় ভাউচার</span>
                    </span>
                    {availableCouponsForCart.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {availableCouponsForCart.length} টি কুপন পাওয়া গেছে
                      </span>
                    )}
                  </label>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-emerald-600 uppercase font-black tracking-wider">প্রযুক্ত কুপন কোড</div>
                          <div className="text-xs font-black text-emerald-900">{appliedCoupon} (-{formatCurrency(discount)})</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors font-bold cursor-pointer"
                      >
                        মুছুন ✕
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="কুপন লিখুন (যেমন: EID10)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold uppercase"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        প্রয়োগ
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-2 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {/* প্রযোজ্য কুপন চিপস (সহজে এক ক্লিকে প্রয়োগ) */}
                  {!appliedCoupon && availableCouponsForCart.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-bold text-slate-500 mb-1.5">কার্টের জন্য প্রযোজ্য কুপন (ক্লিক করে যোগ করুন):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCouponsForCart.map((cp) => (
                          <button
                            key={cp.CouponCode}
                            type="button"
                            onClick={() => {
                              setCouponInput(cp.CouponCode);
                              applyCouponByCode(cp.CouponCode);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors cursor-pointer"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span>{cp.CouponCode}</span>
                            <span className="text-indigo-900">
                              ({cp.DiscountType === 'Percentage' ? `${cp.DiscountValue}%` : `${formatCurrency(cp.DiscountValue)}`} ছাড়)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ম্যানুয়াল ক্যাশ ডিসকাউন্ট (শুধুমাত্র অ্যাডমিন/ম্যানেজার/ক্যাশিয়ারদের জন্য) */}
                  {isAdmin && (
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                      <span className="text-slate-600 font-semibold">ম্যানুয়াল ক্যাশ ডিসকাউন্ট ({currencySymbol}):</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-24 px-2 py-1 text-right border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* খরচের পুঙ্খানুপুঙ্খ হিসাব */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>পণ্যের উপ-মোট (Subtotal):</span>
                  <span className="font-bold text-slate-800">{formatCurrency(subTotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      <span>মোট ছাড়:</span>
                    </span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>ভ্যাট ও কর ({taxRatePercent}%):</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(taxAmount)}</span>
                </div>

                {/* সর্বমোট প্রদেয় টাকা */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm sm:text-base font-black text-slate-900 block">
                      সর্বমোট প্রদেয় বিল:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      সকল ছাড় ও ভ্যাট সমন্বয়কৃত
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* প্রধান অ্যাকশন: চেকআউটে এগিয়ে যান */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToCheckout}
                  disabled={cartItems.length === 0}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>চেকআউটে এগিয়ে যান</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* নিরাপত্তা ও সুবিধার ব্যাজ */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center space-x-4 text-[11px] text-slate-500 font-semibold">
                <div className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>নিরাপদ হিসাব</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  <span>তাৎক্ষণিক স্টক সিঙ্ক</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
