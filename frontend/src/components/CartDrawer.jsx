import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Receipt,
  Tag,
  Package,
  Scissors,
  ShoppingBag,
  User
} from 'lucide-react';
import { isFabricUnit } from '../utils/fabricUtils';
import { StatusBadge, EmptyState, ConfirmDialog } from './ui';

/**
 * CartDrawer - মোবাইল ও ডেস্কটপ ফুল-হাইট স্লাইড-ওভার কার্ট শিট
 * - মোবাইলে (375px) পূর্ণ প্রস্থের শিট হিসেবে ওপেন হয় (Minimum 44px touch targets)
 * - ইনলাইন পেমেন্ট সিলেক্টর (Cash | bKash | Card) + "Complete Sale & Print"
 * - Esc চাপে ক্লোজ, শূন্য , শূন্য shadow-2xl
 */
export default function CartDrawer({
  isOpen = false,
  onClose,
  cartItems = [],
  currencySymbol = '৳',
  taxRatePercent = 0,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onNavigateToCheckout,
  onNavigateToCartPage,
  onDirectCompleteSale,
  isProcessingSale = false,
  discountAmount = 0,
  setDiscountAmount,
  coupons = []
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isClearConfirmOpen) setIsClearConfirmOpen(false);
        else if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isClearConfirmOpen, onClose]);

  const totalUnits = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  const subTotal = useMemo(() => {
    return cartItems.reduce(
      (acc, item) => acc + (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0),
      0
    );
  }, [cartItems]);

  const effectiveDiscount = Math.min(subTotal, Math.max(0, Number(discountAmount) || 0));
  const taxAmount =
    taxRatePercent > 0
      ? Math.round(((Math.max(0, subTotal - effectiveDiscount) * taxRatePercent) / 100) * 100) / 100
      : 0;
  const grandTotal = Math.max(0, Math.round(subTotal - effectiveDiscount + taxAmount));

  if (!isOpen) return null;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const clean = couponInput.trim().toUpperCase();
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

    if (setDiscountAmount) setDiscountAmount(calculatedDiscount);
    setAppliedCouponCode(clean);
    setCouponInput('');
  };

  const handleCompleteSale = () => {
    if (isProcessingSale || cartItems.length === 0) return;
    if (typeof onDirectCompleteSale === 'function') {
      onDirectCompleteSale({
        items: cartItems,
        subTotal,
        discountAmount: effectiveDiscount,
        taxPercent: taxRatePercent,
        taxAmount,
        grandTotal,
        paymentMethod,
        paidAmount: grandTotal,
        dueAmount: 0,
        customerName: 'Walk-in Customer',
        customerPhone: '',
        shouldPrint: true,
      });
      if (onClose) onClose();
    } else if (onNavigateToCheckout) {
      if (onClose) onClose();
      onNavigateToCheckout();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end select-none" role="dialog" aria-modal="true">
      {/* ফ্ল্যাট স্ক্রিম */}
      <div className="fixed inset-0 bg-neutral-950/35" onClick={onClose} aria-hidden="true" />

      {/* ফুল-হাইট কার্ট শিট */}
      <div className="relative z-10 w-full sm:max-w-md bg-white border-l border-neutral-200/80 h-full flex flex-col">
        {/* ১. হেডার */}
        <div className="px-4 py-3.5 border-b border-neutral-200/80 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#111111]" />
            <h3 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
              Shopping Cart
            </h3>
            <StatusBadge variant="neutral" mono>
              {totalUnits} units
            </StatusBadge>
          </div>

          <div className="flex items-center gap-2">
            {cartItems.length > 0 && onClearCart && (
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                className="min-h-[36px] px-2.5 text-xs font-medium text-[#B91C1C] hover:bg-red-50 rounded-md cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Cart"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ২. আইটেম তালিকা */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#FAFAFA] min-h-0">
          {cartItems.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="আপনার কার্ট খালি"
              description="ক্যাটালগ থেকে পণ্য কার্টে যোগ করে বিলিং শুরু করুন।"
              actionLabel="Browse Catalog"
              onAction={onClose}
            />
          ) : (
            cartItems.map((item, idx) => {
              const itemKey =
                item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId) || idx;
              const isFabric = isFabricUnit(item.unit);
              const itemTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);

              return (
                <div
                  key={itemKey}
                  className="p-3 bg-white border border-neutral-200/80 rounded-md flex items-start gap-3"
                >
                  <div className="w-12 h-12 rounded-md bg-[#F5F5F5] border border-neutral-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-[#737373]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-medium text-[#111111] truncate">{item.name}</h4>
                      <button
                        type="button"
                        onClick={() => onRemoveItem && onRemoveItem(itemKey)}
                        className="p-1 text-[#737373] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {item.variantName && <StatusBadge variant="neutral">{item.variantName}</StatusBadge>}
                      {isFabric && (
                        <StatusBadge variant="warning" mono>
                          <Scissors className="w-2.5 h-2.5 mr-1" />
                          {item.quantity} {item.unit || 'গজ'}
                        </StatusBadge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-200/60">
                      <div className="text-xs font-mono tabular-nums font-semibold text-[#111111]">
                        {currencySymbol}{itemTotal.toLocaleString('en-IN')}
                        <span className="text-[10.5px] font-normal text-[#737373] ml-1">
                          ({currencySymbol}{item.sellingPrice})
                        </span>
                      </div>

                      <div className="flex items-center border border-neutral-200/80 rounded-md bg-[#FAFAFA] overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity && onUpdateQuantity(itemKey, Math.max(0, (Number(item.quantity) || 1) - 1))
                          }
                          className="min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center hover:bg-neutral-200/60 text-[#111111] cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-mono tabular-nums font-medium text-[#111111]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity && onUpdateQuantity(itemKey, (Number(item.quantity) || 0) + 1)
                          }
                          className="min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center hover:bg-neutral-200/60 text-[#111111] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ৩. ফুটার */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-neutral-200/80 bg-white space-y-3 shrink-0">
            {appliedCouponCode ? (
              <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-[#15803D]">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Tag className="w-3.5 h-3.5" />
                  Coupon <strong className="font-mono">{appliedCouponCode}</strong> (-{currencySymbol}{effectiveDiscount})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (setDiscountAmount) setDiscountAmount(0);
                    setAppliedCouponCode('');
                  }}
                  className="text-[#B91C1C] font-medium hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Coupon code..."
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-1 min-h-[44px] md:min-h-[36px] px-3 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-mono uppercase focus:outline-none focus:bg-white focus:border-[#0F172A]"
                />
                <button
                  type="submit"
                  className="min-h-[44px] md:min-h-[36px] px-3.5 bg-[#0F172A] text-white text-xs font-medium rounded-md cursor-pointer"
                >
                  Apply
                </button>
              </form>
            )}
            {couponError && <p className="text-[11px] text-[#B91C1C]">{couponError}</p>}

            {/* পেমেন্ট মেথড */}
            <div className="grid grid-cols-3 gap-1.5">
              {['Cash', 'bKash', 'Card'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`min-h-[44px] md:min-h-[36px] rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                    paymentMethod === m
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-neutral-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="space-y-1 text-xs pt-1 border-t border-neutral-200/80">
              <div className="flex justify-between text-[#525252]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-[#111111]">{currencySymbol}{subTotal.toLocaleString('en-IN')}</span>
              </div>
              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-[#B91C1C]">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{currencySymbol}{effectiveDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline text-sm font-semibold text-[#111111] pt-1 border-t border-neutral-200/80">
                <span>Grand Total</span>
                <span className="text-base font-mono tabular-nums">{currencySymbol}{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isProcessingSale}
                onClick={handleCompleteSale}
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Receipt className="w-4 h-4" />
                <span>{isProcessingSale ? 'Processing...' : 'Complete Sale & Print'}</span>
              </button>

              {onNavigateToCheckout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCheckout();
                  }}
                  className="w-full min-h-[44px] md:min-h-[36px] py-1.5 border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Full Checkout (Customer / Due / Courier)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          setIsClearConfirmOpen(false);
          if (onClearCart) onClearCart();
        }}
        title="কার্ট খালি করতে চান?"
        message="বর্তমান কার্টের সকল আইটেম মুছে ফেলা হবে।"
        confirmLabel="Clear Cart"
        isDestructive={true}
      />
    </div>
  );
}
