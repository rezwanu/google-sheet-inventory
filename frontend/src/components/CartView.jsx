import React, { useState } from 'react';
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
  Printer
} from 'lucide-react';

export default function CartView({
  cartItems,
  currencySymbol,
  taxRatePercent,
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

  // মোট আইটেম সংখ্যা এবং ইউনিট হিসাব
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // সাব-টোটাল হিসাব
  const subTotal = cartItems.reduce((acc, item) => acc + item.sellingPrice * item.quantity, 0);

  // ডিসকাউন্ট এবং ট্যাক্স হিসাব
  const discount = Math.max(0, Math.min(Number(discountAmount) || 0, subTotal));
  const taxableAmount = Math.max(0, subTotal - discount);
  const taxAmount = parseFloat(((taxableAmount * (Number(taxRatePercent) || 0)) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

  // বিক্রয় সম্পন্ন করার হ্যান্ডলার
  const handleCheckout = (shouldPrint = false) => {
    if (cartItems.length === 0) return;

    onCompleteSale({
      items: cartItems,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      discountAmount: discount,
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
            const itemTotal = item.sellingPrice * item.quantity;
            const isAtMaxStock = item.quantity >= item.stockQuantity;

            return (
              <div
                key={item.productId}
                className="p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
              >
                {/* পণ্যের নাম ও রেট */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">
                    {item.productName}
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
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-200 active:scale-95 transition-transform"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    disabled={isAtMaxStock}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-transform"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* মোট টাকা এবং ডিলিট বাটন */}
                <div className="flex items-center space-x-2 pl-3">
                  <span className="text-xs font-bold text-slate-900 w-16 text-right">
                    {currencySymbol}{itemTotal.toFixed(2)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.productId)}
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
