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
  CheckCircle2,
  UserPlus,
  Gift,
  Check,
  X,
  PauseCircle,
  Play,
  Clock,
  Layers,
  Scissors
} from 'lucide-react';

export default function CartPage({
  cartItems = [],
  currencySymbol = '৳',
  taxRatePercent = 0,
  onUpdateQuantity,
  onUpdateItemPrice,
  onRemoveItem,
  onClearCart,
  onNavigateToCatalog,
  onNavigateToCheckout,
  discountAmount = 0,
  setDiscountAmount,
  coupons = [],
  activeUser = null,
  onOpenAuthModal,
  heldCarts = [],
  onHoldCart,
  onResumeHeldCart,
  onOpenHeldCartsModal,
  onSendToTailoring
}) {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');

  // দরদাম বা কাস্টম মূল্য এডিটিং স্টেট
  const [editingPriceKey, setEditingPriceKey] = useState(null);
  const [tempPriceInput, setTempPriceInput] = useState('');
  const [tempPriceError, setTempPriceError] = useState('');

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

  // ফ্লোর প্রাইস ও মার্জিন সুরক্ষা হিসাব (দামাদামির সর্বনিম্ন সীমা)
  const minCartFloorTotal = cartItems.reduce(
    (acc, it) => acc + (Number(it.minSellingPrice !== undefined ? it.minSellingPrice : (it.costPrice || 0)) * (Number(it.quantity) || 0)),
    0
  );
  const maxAllowableDiscount = Math.max(0, subTotal - minCartFloorTotal);
  const isDiscountBreachingFloor = discountAmount > maxAllowableDiscount && maxAllowableDiscount >= 0;

  // দরদাম সংরক্ষণ হ্যান্ডলার
  const handleSaveItemPrice = (itemKey, item) => {
    const val = parseFloat(tempPriceInput);
    if (isNaN(val) || val <= 0) {
      setTempPriceError('সঠিক বিক্রয়মূল্য লিখুন');
      return;
    }
    const floor = Number(item.minSellingPrice !== undefined ? item.minSellingPrice : (item.costPrice || 0));
    if (val < floor) {
      setTempPriceError(`নূন্যতম ফ্লোর প্রাইস ${currencySymbol}${floor.toFixed(2)} এর নিচে যাওয়া যাবে না!`);
      return;
    }
    if (onUpdateItemPrice) {
      const success = onUpdateItemPrice(itemKey, val);
      if (success !== false) {
        setEditingPriceKey(null);
        setTempPriceInput('');
        setTempPriceError('');
      }
    }
  };

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
    <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col animate-in fade-in duration-200 bg-[#FAFAFA]">
      
      {/* ================= ১. পেশাদার মাল্টি-স্টেপ প্রোগ্রেস বার (Modern Stepper) ================= */}
      <div className="mb-4 bg-white border border-neutral-200/80 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-md bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold text-[#111111] tracking-tight">
                  শপিং কার্ট (Shopping Cart)
                </h1>
                {cartItems.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 font-mono tabular-nums">
                    {totalItemsCount} টি আইটেম • {totalUnits} পিস
                  </span>
                )}
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                নির্বাচিত পণ্যের পরিমাণ যাচাই করুন এবং চূড়ান্ত অর্ডারের জন্য চেকআউটে এগিয়ে যান
              </p>
            </div>
          </div>

          {/* কানেক্টেড স্টেপস বার */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium self-start md:self-auto">
            
            {/* স্টেপ ১ */}
            <button
              onClick={onNavigateToCatalog}
              className="min-h-[44px] sm:min-h-[36px] flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#525252] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-neutral-200 text-[#111111] flex items-center justify-center text-[10px] font-semibold font-mono tabular-nums">
                ১
              </span>
              <span>পণ্য ক্যাটালগ</span>
            </button>

            <span className="text-neutral-300 font-medium hidden sm:inline">──</span>

            {/* স্টেপ ২: সক্রিয় */}
            <div className="min-h-[44px] sm:min-h-[36px] flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md border border-[#0F172A] bg-[#0F172A] text-white">
              <span className="w-5 h-5 rounded-full bg-white text-[#0F172A] flex items-center justify-center text-[10px] font-semibold font-mono tabular-nums">
                ২
              </span>
              <span>শপিং কার্ট</span>
            </div>

            <span className="text-neutral-300 font-medium hidden sm:inline">──</span>

            {/* স্টেপ ৩ */}
            <button
              onClick={cartItems.length > 0 ? onNavigateToCheckout : undefined}
              disabled={cartItems.length === 0}
              className={`min-h-[44px] sm:min-h-[36px] flex items-center space-x-1.5 px-3 py-1.5 rounded-md border transition-colors ${
                cartItems.length > 0
                  ? 'bg-[#F5F5F5] hover:bg-neutral-200/70 border-neutral-200/80 text-[#525252] hover:text-[#111111] cursor-pointer'
                  : 'bg-[#FAFAFA] border-neutral-200/80 text-[#737373] cursor-not-allowed'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-neutral-200 text-[#525252] flex items-center justify-center text-[10px] font-semibold font-mono tabular-nums">
                ৩
              </span>
              <span>চেকআউট ও পেমেন্ট [F9]</span>
            </button>

          </div>

        </div>
      </div>

      {/* ================= কাউন্টার কিউ ও মাল্টি-কার্ট বার (Counter Queue & Hold Bar) ================= */}
      {(heldCarts.length > 0 || cartItems.length > 0) && (
        <div className="mb-5 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            <span className="text-xs font-semibold text-[#111111] flex items-center gap-1.5 mr-1">
              <Layers className="w-4 h-4 text-[#B45309]" />
              <span>কাউন্টার কিউ:</span>
            </span>

            {/* বর্তমান সক্রিয় কার্ট চিপ */}
            <span className="px-3 py-1.5 rounded-md bg-white border border-neutral-200/80 text-[#111111] font-medium text-xs font-mono tabular-nums flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
              <span>সক্রিয় কার্ট ({totalItemsCount} আইটেম • {currencySymbol}{subTotal.toFixed(2)})</span>
            </span>

            {/* হোল্ডকৃত কার্ট চিপসমূহ */}
            {heldCarts.map((h, hIdx) => (
              <button
                key={h.id || hIdx}
                type="button"
                onClick={() => onResumeHeldCart && onResumeHeldCart(h.id)}
                className="min-h-[44px] sm:min-h-[36px] px-3 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-[#B45309] font-medium text-xs font-mono tabular-nums transition-colors flex items-center gap-1.5 cursor-pointer"
                title="ক্লিক করে এই কাস্টমারের অর্ডার কার্টে ফিরিয়ে আনুন"
              >
                <PauseCircle className="w-3.5 h-3.5 text-[#B45309]" />
                <span>{h.token || `হোল্ড #${hIdx + 1}`} ({h.itemCount} আইটেম • {currencySymbol}{Number(h.subTotal || 0).toFixed(2)})</span>
                <span className="text-[10px] bg-[#B45309] text-white px-1.5 py-0.5 rounded-md font-medium font-sans">চালু</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {cartItems.length > 0 && onHoldCart && (
              <button
                type="button"
                onClick={() => {
                  const note = window.prompt('কাস্টমারের নাম বা টোকেন নম্বর লিখুন (ঐচ্ছিক):', `কাস্টমার #${heldCarts.length + 1}`);
                  if (note !== null) {
                    onHoldCart(note.trim() || undefined);
                  }
                }}
                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-amber-200/80 font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                title="সিরিয়ালের পরবর্তী কাস্টমারের জন্য বর্তমান অর্ডারটি হোল্ড করে কার্ট খালি করুন (শর্টকাট: F2)"
              >
                <PauseCircle className="w-4 h-4" />
                <span>অর্ডার হোল্ড [F2]</span>
              </button>
            )}

            {heldCarts.length > 0 && onOpenHeldCartsModal && (
              <button
                type="button"
                onClick={onOpenHeldCartsModal}
                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors flex items-center gap-1 cursor-pointer font-mono tabular-nums"
                title="হোল্ডকৃত অর্ডার তালিকা (শর্টকাট: F3)"
              >
                <span>হোল্ড তালিকা [F3] ({heldCarts.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= ২. কার্ট যদি সম্পূর্ণ খালি থাকে ================= */}
      {cartItems.length === 0 ? (
        <div className="space-y-4 my-auto max-w-xl mx-auto w-full">
          {heldCarts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-5 sm:p-6 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center space-x-2.5 text-[#B45309] font-semibold text-sm sm:text-base">
                <div className="w-8 h-8 rounded-md bg-white border border-amber-200/80 text-[#B45309] flex items-center justify-center shrink-0">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <span>আপনার <span className="font-mono tabular-nums">{heldCarts.length}</span>টি পূর্ববর্তী কাস্টমারের অর্ডার হোল্ডে সংরক্ষিত আছে!</span>
              </div>
              <p className="text-xs text-[#525252] leading-relaxed">
                সিরিয়ালের অন্য কাস্টমারকে বিদায় দেওয়া হয়েছে। এখন পূর্ববর্তী কাস্টমারের হোল্ডকৃত অর্ডারটি এক ক্লিকেই চালু করে দিন:
              </p>
              <div className="space-y-2 pt-1">
                {heldCarts.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="bg-white border border-amber-200/80 rounded-lg p-3 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#111111]">
                        {h.token || `কাস্টমার #${idx + 1}`}
                      </div>
                      <div className="text-[11px] text-[#525252] font-mono tabular-nums mt-0.5">
                        {h.itemCount}টি আইটেম • মোট: <strong className="text-[#111111] font-semibold">{currencySymbol}{Number(h.subTotal || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onResumeHeldCart && onResumeHeldCart(h.id)}
                      className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>কার্টে চালু করুন</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200/80 rounded-lg p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A] mb-4">
              <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#111111] mb-2">
              আপনার কার্ট বর্তমানে খালি!
            </h2>
            <p className="text-xs text-[#525252] max-w-sm mx-auto mb-5 leading-relaxed">
              পণ্য ক্যাটালগ থেকে নতুন কাস্টমারের জন্য পছন্দসই পণ্য কার্টে যোগ করুন।
            </p>
            <button
              onClick={onNavigateToCatalog}
              className="min-h-[44px] sm:min-h-[36px] inline-flex items-center space-x-2 px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs sm:text-sm rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>পণ্য ক্যাটালগে ফিরে যান</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= ৩. মূল কার্ট গ্রিড লেআউট ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* বাম কলাম: কার্টভুক্ত পণ্যসমূহের বিস্তারিত তালিকা (৮ কলাম) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
            
            {/* লিস্ট হেডার কন্ট্রোল বার */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold tracking-tight text-[#111111]">
                    কার্টভুক্ত পণ্য তালিকা
                  </h3>
                  <p className="text-xs text-[#525252] font-mono tabular-nums">
                    মোট <strong className="text-[#111111] font-semibold">{totalItemsCount}</strong> টি আইটেম • <strong className="text-[#111111] font-semibold">{totalUnits}</strong> পিস
                  </p>
                </div>
              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="flex items-center space-x-2">
                {onHoldCart && (
                  <button
                    type="button"
                    onClick={() => {
                      const note = window.prompt('কাস্টমারের নাম বা টোকেন নম্বর লিখুন (ঐচ্ছিক):', `কাস্টমার #${heldCarts.length + 1}`);
                      if (note !== null) {
                        onHoldCart(note.trim() || undefined);
                      }
                    }}
                    className="min-h-[44px] sm:min-h-[36px] text-xs font-medium text-[#B45309] bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md border border-amber-200/80 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="পরবর্তী কাস্টমারকে দ্রুত বিদায় দিতে বর্তমান কার্টটি হোল্ড করুন"
                  >
                    <PauseCircle className="w-4 h-4 text-[#B45309]" />
                    <span>অর্ডার হোল্ড করুন</span>
                  </button>
                )}

                {/* পুরো কার্ট খালি করার বাটন */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('আপনি কি নিশ্চিত যে সম্পূর্ণ কার্ট খালি করতে চান?')) {
                      onClearCart();
                    }
                  }}
                  className="min-h-[44px] sm:min-h-[36px] text-xs font-medium text-[#B91C1C] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md border border-red-200/80 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>কার্ট খালি করুন</span>
                </button>
              </div>
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
                    className="group bg-white border border-neutral-200/80 hover:border-neutral-300 rounded-lg p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
                  >
                    {/* থাম্বনেইল ও পণ্যের পরিচয় */}
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-[#F5F5F5] border border-neutral-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl || item.ImageUrl ? (
                          <img
                            src={item.imageUrl || item.ImageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-8 h-8 text-neutral-300 stroke-1" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono tabular-nums uppercase font-medium px-2 py-0.5 rounded-md bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                            {item.productId}
                          </span>
                          {item.variantName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-[#0F172A] border border-slate-200/80">
                              ভ্যারিয়েন্ট: {item.variantName}
                            </span>
                          )}
                          {item.isBundle && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F5F5F5] text-[#111111] border border-neutral-200/80">
                              কম্বো প্যাক
                            </span>
                          )}
                          {item.unit && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#FAFAFA] text-[#525252] border border-neutral-200/80">
                              একক: {item.unit}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-[#111111] mt-1 truncate" title={item.productName}>
                          {item.productName}
                          {item.variantName && (
                            <span className="ml-2 text-xs font-medium text-[#525252]">
                              ({item.variantName})
                            </span>
                          )}
                        </h4>

                        <div className="flex items-center gap-2 text-xs text-[#525252] mt-1 flex-wrap">
                          <span>
                            একক মূল্য: <strong className="text-[#111111] font-semibold font-mono tabular-nums">{formatCurrency(item.sellingPrice)}</strong>
                          </span>
                          {item.originalSellingPrice && item.originalSellingPrice !== item.sellingPrice && (
                            <span className="text-[11px] line-through text-[#737373] font-mono tabular-nums" title="আসল বিক্রয়মূল্য (MRP)">
                              {formatCurrency(item.originalSellingPrice)}
                            </span>
                          )}
                          {item.minSellingPrice !== undefined && Number(item.minSellingPrice) > 0 && (
                            <span className="text-[10px] font-medium text-[#B45309] bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md font-mono tabular-nums" title="কাস্টমার দামাদামি করলেও এর নিচে বিক্রি করা যাবে না">
                              ফ্লোর: {formatCurrency(item.minSellingPrice)}
                            </span>
                          )}
                          {item.isBargained && (
                            <span className="text-[10px] font-medium text-[#15803D] bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                              দরদামে নির্ধারিত
                            </span>
                          )}
                          {item.stockQuantity !== undefined && (
                            <span className="text-[#737373] font-mono tabular-nums">
                              (মজুদ: {item.stockQuantity} {item.unit || ''})
                            </span>
                          )}
                          {onUpdateItemPrice && (
                            <button
                              type="button"
                              onClick={() => {
                                if (editingPriceKey === itemKey) {
                                  setEditingPriceKey(null);
                                  setTempPriceInput('');
                                  setTempPriceError('');
                                } else {
                                  setEditingPriceKey(itemKey);
                                  setTempPriceInput(String(item.sellingPrice));
                                  setTempPriceError('');
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F172A] hover:underline cursor-pointer ml-1"
                              title="কাস্টমারের সাথে দরদাম করতে মূল্য পরিবর্তন করুন"
                            >
                              <Tag className="w-3 h-3 text-[#525252]" />
                              <span>{editingPriceKey === itemKey ? 'বন্ধ করুন' : 'দরদাম করুন'}</span>
                            </button>
                          )}
                        </div>

                        {/* ইনলাইন দামাদামি (Bargaining) ইনপুট বক্স */}
                        {editingPriceKey === itemKey && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 animate-in fade-in duration-150 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-[#B45309]">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-[#B45309]" />
                                <span>দামাদামির বিক্রয়মূল্য নির্ধারণ:</span>
                              </span>
                              <span>
                                সর্বনিম্ন ফ্লোর সীমা: <strong className="font-semibold font-mono tabular-nums">{formatCurrency(item.minSellingPrice || item.costPrice || 0)}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#B45309]">{currencySymbol}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tempPriceInput}
                                  onChange={(e) => {
                                    setTempPriceInput(e.target.value);
                                    const val = parseFloat(e.target.value);
                                    const floor = Number(item.minSellingPrice !== undefined ? item.minSellingPrice : (item.costPrice || 0));
                                    if (!isNaN(val) && val < floor) {
                                      setTempPriceError(`নূন্যতম ফ্লোর প্রাইস ${formatCurrency(floor)} এর নিচে যাওয়া যাবে না!`);
                                    } else {
                                      setTempPriceError('');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveItemPrice(itemKey, item);
                                    } else if (e.key === 'Escape') {
                                      setEditingPriceKey(null);
                                    }
                                  }}
                                  className={`w-full min-h-[44px] sm:min-h-[36px] pl-6 pr-2 py-1 text-xs font-semibold font-mono tabular-nums rounded-md border bg-white focus:outline-none focus:ring-1 ${
                                    tempPriceError ? 'border-red-300 focus:border-[#B91C1C] focus:ring-[#B91C1C] text-[#B91C1C]' : 'border-amber-200/80 focus:border-[#0F172A] focus:ring-[#0F172A] text-[#111111]'
                                  }`}
                                  placeholder="নতুন দর লিখুন"
                                  autoFocus
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSaveItemPrice(itemKey, item)}
                                className="min-h-[44px] sm:min-h-[36px] px-3 py-1 text-xs font-medium bg-[#0F172A] hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>প্রয়োগ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPriceKey(null);
                                  setTempPriceError('');
                                }}
                                className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 text-xs font-medium bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#525252] rounded-md transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            {/* শর্টকাট বাটন: ফ্লোর দর ও আসল MRP */}
                            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                              {item.minSellingPrice !== undefined && Number(item.minSellingPrice) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempPriceInput(String(item.minSellingPrice));
                                    setTempPriceError('');
                                  }}
                                  className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-amber-100 text-[#B45309] border border-amber-200/80 font-mono tabular-nums transition-colors cursor-pointer"
                                  title="সর্বনিম্ন অনুমোদনযোগ্য দর সেট করুন"
                                >
                                  সর্বনিম্ন ফ্লোর দর ({formatCurrency(item.minSellingPrice)})
                                </button>
                              )}
                              {item.originalSellingPrice && item.originalSellingPrice !== item.sellingPrice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempPriceInput(String(item.originalSellingPrice));
                                    setTempPriceError('');
                                  }}
                                  className="text-[10px] font-medium px-2 py-1 rounded-md bg-white hover:bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 font-mono tabular-nums transition-colors cursor-pointer"
                                  title="আসল MRP ফিরিয়ে আনুন"
                                >
                                  আসল MRP ({formatCurrency(item.originalSellingPrice)})
                                </button>
                              )}
                            </div>

                            {tempPriceError && (
                              <p className="text-[11px] font-medium text-[#B91C1C] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{tempPriceError}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {isAtMaxStock && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[#B45309] mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>সর্বোচ্চ বিদ্যমান স্টক নির্বাচন করা হয়েছে</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* কোয়ান্টিটি এবং লাইন টোটাল কন্ট্রোল */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200/80 shrink-0">
                      
                      {/* পরিমাণ কন্ট্রোলার (গজ কাপড়ের জন্য পৃথক গজ ও গিরা ইনপুট, অন্যান্য পণ্যের জন্য স্বাভাবিক ইনপুট) */}
                      {isFabricUnit(item.unit) ? (
                        (() => {
                          const { goj: currentGoj, gira: currentGira } = parseGojGira(item.quantity);
                          return (
                            <div className="flex flex-col items-end gap-1.5">
                              {/* দ্বৈত গজ ও গিরা ইনপুট বক্স */}
                              <div className="flex items-center gap-1.5 p-1 bg-amber-50 border border-amber-200/80 rounded-md">
                                
                                {/* গজ বক্স */}
                                <div className="flex items-center bg-white border border-amber-200/80 rounded-md p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextGoj = Math.max(0, currentGoj - 1);
                                      const total = calculateTotalYards(nextGoj, currentGira);
                                      if (total > 0) onUpdateQuantity(itemKey, total);
                                    }}
                                    className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md bg-amber-50 hover:bg-amber-100 text-[#B45309] transition-colors cursor-pointer"
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
                                      className="w-9 sm:w-11 text-center font-semibold font-mono tabular-nums text-xs sm:text-sm text-[#111111] bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[11px] font-medium text-[#B45309] pr-1 select-none">গজ</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextGoj = currentGoj + 1;
                                      const total = calculateTotalYards(nextGoj, currentGira);
                                      onUpdateQuantity(itemKey, total);
                                    }}
                                    disabled={isAtMaxStock}
                                    className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md bg-amber-50 hover:bg-amber-100 text-[#B45309] disabled:opacity-40 transition-colors cursor-pointer"
                                    title="১ গজ বাড়ান"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <span className="text-sm font-semibold text-[#B45309]">+</span>

                                {/* গিরা বক্স (০-১৫ গিরা) */}
                                <div className="flex items-center bg-white border border-amber-200/80 rounded-md p-0.5">
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
                                    className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md bg-amber-50 hover:bg-amber-100 text-[#B45309] transition-colors cursor-pointer"
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
                                      className="w-8 sm:w-9 text-center font-semibold font-mono tabular-nums text-xs sm:text-sm text-[#111111] bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[11px] font-medium text-[#B45309] pr-1 select-none">গিরা</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextGira = currentGira + 1;
                                      const total = calculateTotalYards(currentGoj, nextGira);
                                      onUpdateQuantity(itemKey, total);
                                    }}
                                    disabled={isAtMaxStock}
                                    className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md bg-amber-50 hover:bg-amber-100 text-[#B45309] disabled:opacity-40 transition-colors cursor-pointer"
                                    title="১ গিরা বাড়ান"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                              </div>

                              {/* মোট হিসাব ও দ্রুত ৪/৮/১২ গিরা শর্টকাট */}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className="text-[10px] font-medium text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 font-mono tabular-nums">
                                  মোট: {item.quantity} গজ
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(itemKey, calculateTotalYards(currentGoj, 4))}
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer font-mono tabular-nums ${
                                    currentGira === 4 ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                                  }`}
                                  title="৪ গিরা (সোয়া গজ)"
                                >
                                  ৪ গিরা
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(itemKey, calculateTotalYards(currentGoj, 8))}
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer font-mono tabular-nums ${
                                    currentGira === 8 ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                                  }`}
                                  title="৮ গিরা (আধা গজ)"
                                >
                                  ৮ গিরা
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(itemKey, calculateTotalYards(currentGoj, 12))}
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer font-mono tabular-nums ${
                                    currentGira === 12 ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                                  }`}
                                  title="১২ গিরা (পৌনে গজ)"
                                >
                                  ১২ গিরা
                                </button>
                              </div>

                              {onSendToTailoring && (
                                <button
                                  type="button"
                                  onClick={() => onSendToTailoring(item)}
                                  className="mt-1 min-h-[44px] sm:min-h-[36px] text-[10px] font-medium text-[#0F172A] bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="এই কাপড়টি দিয়ে টেইলারিং এ সেলাই অর্ডার তৈরি করুন"
                                >
                                  <Scissors className="w-3 h-3 text-[#525252]" />
                                  <span>টেইলারিং মাপ দিন</span>
                                </button>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center bg-[#F5F5F5] border border-neutral-200/80 rounded-md p-1">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, item.quantity - 1)}
                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-white hover:bg-neutral-200/60 text-[#111111] border border-neutral-200/80 transition-colors cursor-pointer"
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
                            className="w-16 text-center bg-transparent text-xs sm:text-sm font-semibold font-mono tabular-nums text-[#111111] focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}
                            disabled={isAtMaxStock}
                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-white hover:bg-neutral-200/60 text-[#111111] border border-neutral-200/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="পরিমাণ বাড়ান"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* মোট মূল্য */}
                      <div className="text-right min-w-[90px]">
                        <p className="text-[10px] text-[#737373] font-medium uppercase tracking-wider">মোট</p>
                        <p className="text-sm sm:text-base font-semibold text-[#111111] font-mono tabular-nums">
                          {formatCurrency(itemTotal)}
                        </p>
                      </div>

                      {/* আইটেম রিমুভ বাটন */}
                      <button
                        type="button"
                        onClick={() => onRemoveItem(itemKey)}
                        className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md border border-transparent hover:border-red-200/80 transition-colors cursor-pointer flex items-center justify-center"
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
                className="min-h-[44px] sm:min-h-[36px] inline-flex items-center space-x-2 px-4 py-2.5 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#525252]" />
                <span>আরও পণ্য যোগ করুন (ক্যাটালগে ফিরে যান)</span>
              </button>
            </div>

          </div>

          {/* ডান কলাম: অর্ডার সামারি ও চেকআউট অ্যাকশন (৪ কলাম) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 sticky top-24">
            
            {/* অর্ডার সামারি কার্ড */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 sm:p-6 space-y-5">
              
              <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200/80">
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#0F172A]" />
                  <span>অর্ডার সারসংক্ষেপ</span>
                </h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 font-mono tabular-nums">
                  {totalUnits} পিস পণ্য
                </span>
              </div>

              {/* কুপন বা ডিসকাউন্ট সেকশন */}
              {!isLoggedIn ? (
                /* অতিথি ব্যবহারকারী: যদি কার্টের পণ্যের জন্য বা সব পণ্যের জন্য কুপন থাকে, তবেই প্রমো কার্ড দেখাবে */
                availableCouponsForCart.length > 0 ? (
                  <div className="rounded-lg border border-neutral-200/80 bg-[#FAFAFA] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#0F172A] flex items-center justify-center text-white shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-medium text-[#B45309]">
                            {hasSpecificProductCoupon ? 'কার্ট পণ্যে কুপন অফার' : 'স্পেশাল কুপন অফার'}
                          </span>
                          <span className="text-xs font-semibold text-[#111111]">
                            {hasSpecificProductCoupon ? 'কার্টের পণ্যে কুপন ছাড় রয়েছে!' : 'আপনার অর্ডারে কুপন ছাড় প্রযোজ্য!'}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-[#525252] mt-1.5 leading-relaxed">
                          {hasSpecificProductCoupon
                            ? 'কার্টের পণ্যে কুপন কোড ব্যবহার করে অতিরিক্ত ছাড় ও সাশ্রয়ী মূল্যে কিনতে বিনামূল্যে অ্যাকাউন্ট তৈরি করুন অথবা সাইন-ইন করুন!'
                            : 'কুপন কোড ব্যবহার করে পুরো অর্ডারে অতিরিক্ত ছাড় ও সাশ্রয়ী মূল্যে কিনতে বিনামূল্যে অ্যাকাউন্ট তৈরি করুন অথবা সাইন-ইন করুন!'}
                        </p>

                        {/* বুলেট সুবিধা */}
                        <div className="mt-2.5 space-y-1 text-[11px] text-[#525252] font-medium">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                            <span>ইনস্ট্যান্ট কুপন ছাড় ও ক্যাশ সেভিংস</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                            <span>সহজ ও দ্রুত লাইভ অর্ডার ট্র্যাকিং</span>
                          </div>
                        </div>

                        {/* সাইন আপ / লগইন CTA বাটন */}
                        {onOpenAuthModal && (
                          <button
                            type="button"
                            onClick={onOpenAuthModal}
                            className="mt-3.5 w-full min-h-[44px] sm:min-h-[36px] py-2 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>বিনামূল্যে সাইন-আপ / লগইন করুন</span>
                          </button>
                        )}

                        <p className="text-[10px] text-center text-[#737373] mt-2 font-medium">
                          * অ্যাকাউন্ট ছাড়াও আপনি সাধারণ মূল্যে সরাসরি অর্ডার প্লেস করতে পারবেন।
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                /* লগইন করা থাকলে: কুপন ইনপুট ফিল্ড ও প্রযোজ্য কুপন চিপস */
                <div className="space-y-2.5">
                  <label className="text-xs font-medium text-[#111111] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#525252]" />
                      <span>কুপন কোড বা ছাড় ভাউচার</span>
                    </span>
                    {availableCouponsForCart.length > 0 && (
                      <span className="text-[10px] font-medium text-[#111111] bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-neutral-200/80 font-mono tabular-nums">
                        {availableCouponsForCart.length} টি কুপন পাওয়া গেছে
                      </span>
                    )}
                  </label>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[#15803D] text-xs font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-md bg-[#15803D] text-white flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-[#15803D] uppercase font-medium tracking-wider">প্রযুক্ত কুপন কোড</div>
                          <div className="text-xs font-semibold text-[#111111] font-mono tabular-nums">{appliedCoupon} (-{formatCurrency(discount)})</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="min-h-[44px] sm:min-h-[36px] text-xs text-[#B91C1C] hover:bg-red-50 px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>মুছুন</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        id="pos-coupon-discount-input"
                        type="text"
                        placeholder="কুপন বা ডিসকাউন্ট [F8]"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="flex-1 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-mono font-semibold uppercase text-[#111111]"
                      />
                      <button
                        type="submit"
                        className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
                      >
                        প্রয়োগ
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#B91C1C] font-medium bg-red-50 border border-red-200/80 p-2 rounded-md">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {/* প্রযোজ্য কুপন চিপস (সহজে এক ক্লিকে প্রয়োগ) */}
                  {!appliedCoupon && availableCouponsForCart.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-[#525252] mb-1.5">কার্টের জন্য প্রযোজ্য কুপন (ক্লিক করে যোগ করুন):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCouponsForCart.map((cp) => (
                          <button
                            key={cp.CouponCode}
                            type="button"
                            onClick={() => {
                              setCouponInput(cp.CouponCode);
                              applyCouponByCode(cp.CouponCode);
                            }}
                            className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 transition-colors cursor-pointer font-mono tabular-nums"
                          >
                            <Tag className="w-2.5 h-2.5 text-[#525252]" />
                            <span>{cp.CouponCode}</span>
                            <span className="text-[#525252]">
                              ({cp.DiscountType === 'Percentage' ? `${cp.DiscountValue}%` : `${formatCurrency(cp.DiscountValue)}`} ছাড়)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ম্যানুয়াল ক্যাশ ডিসকাউন্ট (শুধুমাত্র অ্যাডমিন/ম্যানেজার/ক্যাশিয়ারদের জন্য) */}
                  {isAdmin && (
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-neutral-200/80">
                      <span className="text-[#525252] font-medium">ম্যানুয়াল ক্যাশ ডিসকাউন্ট ({currencySymbol}):</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 min-h-[44px] sm:min-h-[36px] px-2.5 py-1 text-right border border-neutral-200/80 rounded-md bg-[#FAFAFA] font-semibold font-mono tabular-nums text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* খরচের পুঙ্খানুপুঙ্খ হিসাব */}
              <div className="space-y-2.5 pt-3 border-t border-neutral-200/80 text-xs sm:text-sm">
                <div className="flex justify-between text-[#525252]">
                  <span>পণ্যের উপ-মোট (Subtotal):</span>
                  <span className="font-semibold text-[#111111] font-mono tabular-nums">{formatCurrency(subTotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[#B91C1C] font-medium">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      <span>মোট ছাড়:</span>
                    </span>
                    <span className="font-mono tabular-nums">-{formatCurrency(discount)}</span>
                  </div>
                )}

                {/* ফ্লোর প্রাইস মার্জিন লঙ্ঘন সতর্কতা */}
                {isDiscountBreachingFloor && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200/80 text-[#B45309] text-xs font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#B45309]">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>দামাদামির সর্বোচ্চ ছাড় অতিক্রম হয়েছে!</span>
                    </div>
                    <p className="text-[11px] text-[#B45309]">
                      পণ্যের নূন্যতম ফ্লোর প্রাইস বজায় রাখতে এই কার্টে সর্বোচ্চ অনুমোদনযোগ্য ছাড় <strong className="font-mono tabular-nums">{formatCurrency(maxAllowableDiscount)}</strong>।
                    </p>
                  </div>
                )}

                <div className="flex justify-between text-[#525252]">
                  <span>ভ্যাট ও কর (<span className="font-mono tabular-nums">{taxRatePercent}%</span>):</span>
                  <span className="font-medium text-[#111111] font-mono tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>

                {/* সর্বমোট প্রদেয় টাকা */}
                <div className="pt-3 border-t border-neutral-200/80 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm sm:text-base font-semibold text-[#111111] block">
                      সর্বমোট প্রদেয় বিল:
                    </span>
                    <span className="text-[11px] text-[#737373]">
                      সকল ছাড় ও ভ্যাট সমন্বয়কৃত
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* প্রধান অ্যাকশন: চেকআউটে এগিয়ে যান */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDiscountBreachingFloor) {
                      const confirmProceed = window.confirm(`সতর্কতা: বর্তমান মোট ছাড় পণ্যের নূন্যতম ফ্লোর প্রাইস সীমা (${formatCurrency(maxAllowableDiscount)}) অতিক্রম করেছে!\n\nআপনি কি নিশ্চিত যে এই বিশেষ ছাড়ে চেকআউট করতে চান?`);
                      if (!confirmProceed) return;
                    }
                    onNavigateToCheckout();
                  }}
                  disabled={cartItems.length === 0}
                  className="w-full min-h-[44px] py-3 px-4 bg-[#0F172A] hover:bg-slate-800 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>চেকআউটে এগিয়ে যান [F9]</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* নিরাপত্তা ও সুবিধার ব্যাজ */}
              <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-center space-x-4 text-[11px] text-[#525252] font-medium">
                <div className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>নিরাপদ হিসাব</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Package className="w-3.5 h-3.5 text-[#0F172A]" />
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
