import React, { useState } from 'react';
import { isFabricUnit, parseGojGira, calculateTotalYards } from '../utils/fabricUtils';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  CheckCircle, 
  User, 
  Phone, 
  Tag,
  Printer,
  Ticket,
  X,
  AlertCircle
} from 'lucide-react';

export default function CartView({
  cartItems,
  currencySymbol,
  taxRatePercent,
  salesReturns = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCompleteSale,
  isProcessing
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null); // { code, amount }
  const [voucherError, setVoucherError] = useState('');

  // মোট আইটেম সংখ্যা এবং ইউনিট হিসাব
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // সাব-টোটাল হিসাব
  const subTotal = cartItems.reduce((acc, item) => acc + item.sellingPrice * item.quantity, 0);

  // ডিসকাউন্ট এবং ট্যাক্স হিসাব
  const discount = Math.max(0, Math.min(Number(discountAmount) || 0, subTotal));
  
  // স্টোর ক্রেডিট ভাউচার ডিসকাউন্ট
  const storeCreditDiscount = appliedVoucher ? Math.min(appliedVoucher.amount, Math.max(0, subTotal - discount)) : 0;
  const taxableAmount = Math.max(0, subTotal - discount - storeCreditDiscount);
  const taxAmount = parseFloat(((taxableAmount * (Number(taxRatePercent) || 0)) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

  // ভাউচার প্রয়োগ হ্যান্ডলার
  const handleApplyVoucher = (e) => {
    if (e) e.preventDefault();
    setVoucherError('');
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    const record = (salesReturns || []).find((r) => String(r.CreditNoteCode || '').trim().toUpperCase() === code);
    if (!record) {
      setVoucherError('ভাউচার কোড পাওয়া যায়নি।');
      return;
    }

    if (record.CreditNoteStatus === 'Redeemed') {
      setVoucherError('এই ভাউচারটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
      return;
    }

    if (record.CreditNoteExpiry && new Date() > new Date(record.CreditNoteExpiry)) {
      setVoucherError('এই ভাউচারের মেয়াদ উত্তীর্ণ হয়ে গেছে।');
      return;
    }

    const amt = Number(record.TotalRefundAmount) || 0;
    if (amt <= 0) {
      setVoucherError('ভাউচারের ব্যালেন্স শূন্য।');
      return;
    }

    setAppliedVoucher({ code, amount: amt });
    setVoucherInput('');
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
  };

  // বিক্রয় সম্পন্ন করার হ্যান্ডলার
  const handleCheckout = (shouldPrint = false) => {
    if (cartItems.length === 0) return;

    onCompleteSale({
      items: cartItems,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      discountAmount: discount,
      creditNoteCode: appliedVoucher?.code || '',
      creditNoteDiscount: storeCreditDiscount,
      taxPercent: Number(taxRatePercent) || 0,
      taxAmount: taxAmount,
      subTotal: subTotal,
      grandTotal: grandTotal,
      paymentMethod: paymentMethod,
      shouldPrint: shouldPrint, // প্রিন্ট ট্রিগার ফ্ল্যাগ
    });

    // ফর্ম রিসেট
    setCustomerName('');
    setCustomerPhone('');
    setDiscountAmount('');
    setAppliedVoucher(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* কার্ট হেডার */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">বিলিং কার্ট</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {totalUnits} আইটেম
          </span>
        </div>
        {cartItems.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>খালি করুন</span>
          </button>
        )}
      </div>

      {/* কার্ট আইটেম তালিকা (High Density) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
            <ShoppingCart className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">কার্ট সম্পূর্ণ খালি</p>
            <p className="text-xs text-slate-400 mt-1">
              বাম পাশের তালিকা থেকে পণ্যে ক্লিক করুন অথবা বারকোড স্ক্যান করুন
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const itemKey = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
            const itemTotal = item.sellingPrice * item.quantity;
            const isAtMaxStock = item.quantity >= item.stockQuantity;

            return (
              <div
                key={itemKey}
                className="p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
              >
                {/* পণ্যের নাম ও রেট */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">
                    {item.productName}
                    {item.variantName && (
                      <span className="ml-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        {item.variantName}
                      </span>
                    )}
                    {item.isBundle && (
                      <span className="ml-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                        কম্বো
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    <span>
                      {currencySymbol}{Number(item.sellingPrice).toFixed(2)} / {item.unit || 'Pcs'}
                    </span>
                    {isAtMaxStock && (
                      <span className="text-[10px] text-amber-600 font-medium">
                        (সর্বোচ্চ স্টক)
                      </span>
                    )}
                  </div>
                </div>

                {/* কোয়ান্টিটি কন্ট্রোল */}
                {isFabricUnit(item.unit) ? (
                  (() => {
                    const { goj: currentGoj, gira: currentGira } = parseGojGira(item.quantity);
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 bg-amber-50/90 border border-amber-300 rounded-lg p-0.5 shadow-2xs">
                          <input
                            type="number"
                            min="0"
                            value={currentGoj}
                            onChange={(e) => {
                              const g = parseInt(e.target.value, 10);
                              const safeGoj = isNaN(g) || g < 0 ? 0 : g;
                              const total = calculateTotalYards(safeGoj, currentGira);
                              onUpdateQuantity(itemKey, total);
                            }}
                            className="w-8 text-center text-xs font-black text-slate-900 bg-white border border-amber-300 rounded px-0.5 focus:outline-none"
                            title="গজ"
                          />
                          <span className="text-[10px] font-black text-amber-900 pr-0.5 select-none">গজ</span>
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
                            className="w-7 text-center text-xs font-black text-slate-900 bg-white border border-amber-300 rounded px-0.5 focus:outline-none"
                            title="গিরা (০-১৫)"
                          />
                          <span className="text-[10px] font-black text-amber-900 pr-0.5 select-none">গিরা</span>
                        </div>
                        <span className="text-[9.5px] font-bold text-amber-900">
                          মোট: {item.quantity} গজ
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onUpdateQuantity(itemKey, Math.max(0, item.quantity - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-200 active:scale-95 transition-transform"
                      title="পরিমাণ কমান"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0) {
                          onUpdateQuantity(itemKey, Math.round(val * 10000) / 10000);
                        }
                      }}
                      className="w-12 text-center text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-1 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}
                      disabled={isAtMaxStock}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-transform"
                      title="পরিমাণ বাড়ান"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* মোট টাকা এবং ডিলিট বাটন */}
                <div className="flex items-center space-x-2 pl-3">
                  <span className="text-xs font-bold text-slate-900 w-16 text-right">
                    {currencySymbol}{itemTotal.toFixed(2)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(itemKey)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* কাস্টমার ও ক্যালকুলেশন প্যানেল */}
      {cartItems.length > 0 && (
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          
          {/* ক্রেতার তথ্য (ঐচ্ছিক) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ক্রেতার নাম (ঐচ্ছিক)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="মোবাইল নম্বর"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ডিসকাউন্ট ইনপুট */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center text-slate-500 space-x-1 flex-1">
              <Tag className="w-3.5 h-3.5" />
              <span>ডিসকাউন্ট ({currencySymbol}):</span>
            </div>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="w-24 px-2 py-1 text-right border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* স্টোর ক্রেডিট ভাউচার ইনপুট (Phase 7) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
            {appliedVoucher ? (
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-emerald-900 font-mono text-[11px]">{appliedVoucher.code}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">(-{currencySymbol}{storeCreditDiscount.toFixed(2)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-colors"
                  title="ভাউচার বাতিল"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyVoucher} className="flex space-x-1.5">
                <div className="relative flex-1">
                  <Ticket className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ক্রেডিট ভাউচার (SCN-XXXXXX)"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!voucherInput.trim()}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold disabled:opacity-40 transition-colors"
                >
                  প্রয়োগ
                </button>
              </form>
            )}
            {voucherError && (
              <div className="flex items-center space-x-1 text-[10px] text-rose-600 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{voucherError}</span>
              </div>
            )}
          </div>

          {/* হিসেব সারসংক্ষেপ */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>সাব-টোটাল:</span>
              <span className="font-semibold">{currencySymbol}{subTotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>ছাড় (ডিসকাউন্ট):</span>
                <span>-{currencySymbol}{discount.toFixed(2)}</span>
              </div>
            )}
            {storeCreditDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>স্টোর ক্রেডিট ভাউচার:</span>
                <span>-{currencySymbol}{storeCreditDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>ভ্যাট ({taxRatePercent}%):</span>
              <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>সর্বমোট প্রদেয়:</span>
              <span className="text-indigo-600">{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* পেমেন্ট মেথড নির্বাচন */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 'Cash', label: 'Cash', icon: Banknote },
              { id: 'Card', label: 'Card', icon: CreditCard },
              { id: 'bKash', label: 'bKash', icon: Smartphone },
              { id: 'Nagad', label: 'Nagad', icon: Smartphone },
            ].map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mb-0.5" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* দুই ধরনের চেকআউট অ্যাকশন বাটন: সেলস ও প্রিন্ট এবং শুধুমাত্র সেলস */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* বাটন ১: 'Complete Sale & Print' - স্বয়ংক্রিয় প্রিন্ট ও সেভ */}
            <button
              onClick={() => handleCheckout(true)}
              disabled={isProcessing || cartItems.length === 0}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 text-xs sm:text-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>বিক্রয় ও প্রিন্ট করুন</span>
            </button>

            {/* বাটন ২: শুধুমাত্র বিক্রয় সম্পন্ন (প্রিন্ট ছাড়া) */}
            <button
              onClick={() => handleCheckout(false)}
              disabled={isProcessing || cartItems.length === 0}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5 text-xs sm:text-sm disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>শুধুমাত্র বিক্রয় ({currencySymbol}{grandTotal.toFixed(2)})</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
