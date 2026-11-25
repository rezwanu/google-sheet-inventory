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
  Receipt,
  User,
  ShoppingBag,
  X,
  Coins
} from 'lucide-react';
import { isFabricUnit, formatFabricQuantity } from '../utils/fabricUtils';
import { StatusBadge, EmptyState, ConfirmDialog } from './ui';

/**
 * PosCartPanel - High-Speed Sticky POS Billing Terminal Cart (Utilitarian Minimalism)
 * - +/- কোয়ান্টিটি স্টিপার, ডিসকাউন্ট/কুপন ও ট্যাক্স ইনপুট
 * - ইনলাইন পেমেন্ট মেথড সিলেক্টর (Cash, bKash, Card) + সরাসরি "Complete Sale & Print" CTA
 * - সাবমিট চলাকালীন "Processing..." ডিস্যাবলড স্টেট ও কার্ট খালি করার আগে ConfirmDialog
 * - হোল্ড [F4], কুইক খরচ [Alt+E], গজ-গিরা ও টেইলারিং অক্ষুণ্ণ
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
  heldCarts = [],
  onHoldCart,
  onOpenHeldCartsModal,
  onSendToTailoring,
  onNavigateToCheckout,
  onDirectCompleteSale,
  isProcessingSale = false,
  onOpenQuickExpenseModal
}) {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const totalItemCount = cartItems.length;

  const subTotal = useMemo(() => {
    return cartItems.reduce(
      (acc, item) => acc + (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0),
      0
    );
  }, [cartItems]);

  const effectiveDiscount = useMemo(() => {
    return Math.min(subTotal, Math.max(0, Number(discountAmount) || 0));
  }, [subTotal, discountAmount]);

  const taxAmount = useMemo(() => {
    if (!taxRatePercent || taxRatePercent <= 0) return 0;
    const taxable = Math.max(0, subTotal - effectiveDiscount);
    return Math.round(((taxable * taxRatePercent) / 100) * 100) / 100;
  }, [subTotal, effectiveDiscount, taxRatePercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, Math.round(subTotal - effectiveDiscount + taxAmount));
  }, [subTotal, effectiveDiscount, taxAmount]);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

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

    if (setDiscountAmount) setDiscountAmount(calculatedDiscount);
    setAppliedCouponCode(clean);
    setCouponCodeInput('');
  };

  const handleRemoveCoupon = () => {
    if (setDiscountAmount) setDiscountAmount(0);
    setAppliedCouponCode('');
  };

  const hasFabricItems = useMemo(() => {
    return cartItems.some((item) => isFabricUnit(item.unit || item.Unit));
  }, [cartItems]);

  const handleCompleteSaleClick = () => {
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
    } else if (onNavigateToCheckout) {
      onNavigateToCheckout();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* ১. প্যানেল হেডার */}
      <div className="px-4 py-3 border-b border-neutral-200/80 bg-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart className="w-4 h-4 text-[#111111] shrink-0" />
          <h3 className="text-sm font-semibold font-heading tracking-tight text-[#111111] truncate">
            Current Sale
          </h3>
          <StatusBadge variant="neutral" mono>
            {totalItemCount}
          </StatusBadge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenQuickExpenseModal && (
            <button
              type="button"
              onClick={onOpenQuickExpenseModal}
              title="কুইক খরচ [Alt + E]"
              className="min-h-[32px] px-2 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-[11px] font-medium text-[#525252] hover:text-[#111111] inline-flex items-center gap-1 cursor-pointer"
            >
              <Coins className="w-3 h-3" />
              <span className="font-mono">Alt+E</span>
            </button>
          )}

          {heldCarts.length > 0 && onOpenHeldCartsModal && (
            <button
              type="button"
              onClick={onOpenHeldCartsModal}
              title="হোল্ডকৃত অর্ডার"
              className="min-h-[32px] px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-[11px] font-mono tabular-nums font-medium text-[#B45309] inline-flex items-center gap-1 cursor-pointer"
            >
              <PauseCircle className="w-3 h-3" />
              <span>{heldCarts.length}</span>
            </button>
          )}

          {cartItems.length > 0 && onClearCart && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              title="কার্ট খালি করুন"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ২. কার্ট আইটেম তালিকা */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0 bg-[#FAFAFA]">
        {cartItems.length === 0 ? (
          <EmptyState
            compact
            icon={ShoppingBag}
            title="কার্ট খালি"
            description="বামপাশের তালিকা থেকে পণ্য যোগ করুন অথবা বারকোড স্ক্যান করুন [F1]"
          />
        ) : (
          cartItems.map((item, idx) => {
            const isFabric = isFabricUnit(item.unit || item.Unit);
            const lineTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);
            const fabricDetail = isFabric ? formatFabricQuantity(item.quantity, 'গজ', false) : null;

            return (
              <div
                key={item.cartItemId || item.productId || idx}
                className="p-3 bg-white rounded-md border border-neutral-200/80 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#111111] truncate">
                      {item.name || item.productName || item.ProductName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {item.variantName && (
                        <StatusBadge variant="neutral">{item.variantName}</StatusBadge>
                      )}
                      {isFabric ? (
                        <StatusBadge variant="warning" mono>
                          <Scissors className="w-2.5 h-2.5 mr-1" />
                          {fabricDetail || `${item.quantity} গজ`}
                        </StatusBadge>
                      ) : (
                        <span className="text-[10.5px] font-mono text-[#737373]">
                          {item.unit || item.Unit || 'Pcs'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem && onRemoveItem(item.cartItemId || item.productId)}
                    className="p-1 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-sm cursor-pointer shrink-0"
                    title="আইটেম সরান"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                  <span className="text-[11px] font-mono tabular-nums text-[#525252]">
                    {formatCurrency(item.sellingPrice)}
                    {isFabric ? '/গজ' : ''}
                  </span>

                  <div className="flex items-center gap-2.5">
                    {isFabric ? (
                      <span className="px-2 py-1 rounded-sm bg-neutral-100 border border-neutral-200 text-[11px] font-mono tabular-nums text-[#111111]">
                        {item.quantity} গজ
                      </span>
                    ) : (
                      <div className="flex items-center border border-neutral-200/80 rounded-md bg-[#FAFAFA] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = Number(item.quantity) - 1;
                            if (newQ <= 0) onRemoveItem && onRemoveItem(item.cartItemId || item.productId);
                            else onUpdateQuantity && onUpdateQuantity(item.cartItemId || item.productId, newQ);
                          }}
                          className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200/60 text-[#111111] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono tabular-nums font-medium text-[#111111] min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = Number(item.quantity) + 1;
                            onUpdateQuantity && onUpdateQuantity(item.cartItemId || item.productId, newQ);
                          }}
                          className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200/60 text-[#111111] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-xs font-mono tabular-nums font-semibold text-[#111111] min-w-[58px] text-right">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ৩. ডিসকাউন্ট ও কুপন */}
      {cartItems.length > 0 && (
        <div className="px-4 py-2.5 bg-white border-t border-neutral-200/80 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-xs font-medium text-[#525252] hover:text-[#111111] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{showDiscountInput ? 'Hide Discount / Coupon' : 'Add Discount / Coupon'}</span>
            </button>

            {effectiveDiscount > 0 && (
              <StatusBadge variant="danger" mono>
                -{formatCurrency(effectiveDiscount)}
              </StatusBadge>
            )}
          </div>

          {showDiscountInput && (
            <div className="p-2.5 bg-[#FAFAFA] rounded-md border border-neutral-200/80 space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Coupon code..."
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  className="flex-1 h-8 px-2.5 text-xs bg-white border border-neutral-200/80 rounded-sm focus:outline-none focus:border-[#0F172A] font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="h-8 px-3 bg-[#0F172A] text-white text-xs font-medium rounded-sm cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-[11px] text-[#B91C1C]">{couponError}</p>}

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-200/80">
                <label className="text-[11px] font-medium text-[#525252]">Flat Discount ({currencySymbol}):</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount && setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 h-8 px-2 text-xs font-mono tabular-nums font-medium bg-white border border-neutral-200/80 rounded-sm focus:outline-none focus:border-[#0F172A] text-right"
                  />
                  {effectiveDiscount > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] font-medium text-[#B91C1C] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ৪. পেমেন্ট মেথড সিলেক্টর, টোটাল ও Complete Sale CTA */}
      {cartItems.length > 0 && (
        <div className="p-4 bg-white border-t border-neutral-200/80 space-y-3 shrink-0">
          {/* পেমেন্ট মেথড সিলেক্টর */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-[#525252]">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'Cash', label: 'Cash' },
                { id: 'bKash', label: 'bKash' },
                { id: 'Card', label: 'Card' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`min-h-[36px] py-1.5 px-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-neutral-100 hover:text-[#111111]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* সামারি হিসাব */}
          <div className="space-y-1 text-xs pt-1 border-t border-neutral-200/80">
            <div className="flex justify-between text-[#525252]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums text-[#111111]">{formatCurrency(subTotal)}</span>
            </div>
            {effectiveDiscount > 0 && (
              <div className="flex justify-between text-[#B91C1C]">
                <span>Discount</span>
                <span className="font-mono tabular-nums">-{formatCurrency(effectiveDiscount)}</span>
              </div>
            )}
            {taxRatePercent > 0 && (
              <div className="flex justify-between text-[#525252]">
                <span>Tax ({taxRatePercent}%)</span>
                <span className="font-mono tabular-nums text-[#111111]">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between pt-1.5 border-t border-neutral-200/80">
              <span className="text-sm font-semibold font-heading text-[#111111]">Grand Total</span>
              <span className="text-lg font-semibold font-mono tabular-nums text-[#111111]">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* প্রাইমারি CTA */}
          <button
            type="button"
            disabled={isProcessingSale}
            onClick={handleCompleteSaleClick}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-medium flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span>{isProcessingSale ? 'Processing...' : 'Complete Sale & Print'}</span>
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(grandTotal)} →</span>
          </button>

          {/* সেকেন্ডারি অ্যাকশন: Hold ও Full Checkout / Tailoring */}
          <div className="grid grid-cols-2 gap-1.5">
            {onHoldCart && (
              <button
                type="button"
                onClick={onHoldCart}
                className="min-h-[36px] py-1.5 px-2 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#525252] hover:text-[#111111] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold [F4]</span>
              </button>
            )}

            {hasFabricItems && onSendToTailoring ? (
              <button
                type="button"
                onClick={onSendToTailoring}
                className="min-h-[36px] py-1.5 px-2 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Tailoring</span>
              </button>
            ) : onNavigateToCheckout ? (
              <button
                type="button"
                onClick={onNavigateToCheckout}
                className="min-h-[36px] py-1.5 px-2 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#525252] hover:text-[#111111] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer / Due</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* কার্ট খালি করার কনফার্মেশন */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          setIsClearConfirmOpen(false);
          if (onClearCart) onClearCart();
        }}
        title="কার্ট খালি করতে চান?"
        message={`বর্তমান কার্টে থাকা ${totalItemCount}টি আইটেম সম্পূর্ণ মুছে ফেলা হবে।`}
        confirmLabel="Clear Cart"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
