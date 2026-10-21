import React, { useState, useMemo } from 'react';
import { formatFabricQuantity } from '../utils/fabricUtils';
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Printer,
  ArrowLeft,
  Search,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  BadgePercent,
  Clock,
  Sparkles,
  X,
  Package,
  LogIn,
  Layers
} from 'lucide-react';
import { formatImageUrl } from '../services/storage';
import StoreLogo from './StoreLogo';

export default function CheckoutPage({
  cartItems,
  currencySymbol = '৳',
  taxRatePercent = 0,
  discountAmount = 0,
  customers = [],
  salesReturns = [],
  settings = {},
  onNavigateToCart,
  onNavigateToCatalog,
  onCompleteSale,
  onSaveAbandonedCart,
  isProcessing,
  activeUser,
  onOpenAuthModal,
}) {
  const isAdmin = Boolean(activeUser && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier'));
  const isCustomer = !isAdmin;
  const isGuest = !activeUser;

  // কার্ট ট্র্যাকিং আইডি (অসম্পূর্ণ ড্রপ-অফ কার্ট স্বয়ংক্রিয় শনাক্তকরণের জন্য)
  const [cartTrackingId] = useState(() => 'CART-' + Date.now().toString().slice(-6));

  // স্টোর ক্রেডিট ভাউচার স্টেট (Phase 7)
  const [storeCreditCodeInput, setStoreCreditCodeInput] = useState('');
  const [appliedStoreCredit, setAppliedStoreCredit] = useState(null); // { code, amount }
  const [storeCreditError, setStoreCreditError] = useState('');

  // লয়ালটি ও ক্যাশব্যাক কনফিগারেশন
  const loyaltyEnabled = settings?.LoyaltyEnabled !== false;
  const loyaltyPointsRate = Number(settings?.LoyaltyPointsRate) || 100;
  const loyaltyRedeemRate = Number(settings?.LoyaltyRedeemRate) || 1.0;
  const minRedeemPoints = Number(settings?.MinRedeemPoints) || 10;

  const [isRedeemingLoyalty, setIsRedeemingLoyalty] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState('');

  // কাস্টমার সার্চ ও ড্রপডাউন স্টেট
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // কাস্টমার ফর্ম স্টেট
  const [customerName, setCustomerName] = useState(isCustomer ? (activeUser?.FullName || '') : '');
  const [customerPhone, setCustomerPhone] = useState(isCustomer ? (activeUser?.Phone || '') : '');
  const [customerEmail, setCustomerEmail] = useState(isCustomer ? (activeUser?.Email || '') : '');
  const [customerAddress, setCustomerAddress] = useState(isCustomer ? (activeUser?.Address || '') : '');
  const [customerType, setCustomerType] = useState('Regular');
  const [orderNotes, setOrderNotes] = useState('');

  // লগইন করা কাস্টমারের তথ্য অটোমেটিকভাবে লোড করা
  React.useEffect(() => {
    if (activeUser && activeUser.Role === 'Customer') {
      if (activeUser.FullName) setCustomerName(activeUser.FullName);
      if (activeUser.Phone) setCustomerPhone(activeUser.Phone);
      if (activeUser.Email) setCustomerEmail(activeUser.Email);
      if (activeUser.Address) setCustomerAddress(activeUser.Address);
      setSelectedCustomerId(activeUser.UserID || '');
    }
  }, [activeUser]);

  // পেমেন্ট সংক্রান্ত স্টেট
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receivedCash, setReceivedCash] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  // স্প্লিট পেমেন্ট স্টেট (Split Payments)
  const [splitPayments, setSplitPayments] = useState({
    cash: '',
    bkash: '',
    nagad: '',
    card: '',
    due: ''
  });
  const [splitTrxRefs, setSplitTrxRefs] = useState({
    bkash: '',
    nagad: '',
    card: ''
  });

  // নির্বাচিত কাস্টমার অবজেক্ট এবং বকেয়া ও ক্রেডিট লিমিট
  const selectedCustomerObj = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    if (list.length === 0) return null;
    return list.find(c => 
      c && (
        (selectedCustomerId && c.CustomerID === selectedCustomerId) ||
        (customerPhone && String(c.Phone).trim() === customerPhone.trim()) ||
        (customerName && c.CustomerName?.trim().toLowerCase() === customerName.trim().toLowerCase())
      )
    );
  }, [customers, selectedCustomerId, customerPhone, customerName]);

  const customerCurrentDue = Number(selectedCustomerObj?.CurrentDue || 0);
  const customerCreditLimit = Number(selectedCustomerObj?.CreditLimit || 0);
  const availableLoyaltyPoints = Number(selectedCustomerObj?.LoyaltyPoints || 0);

  // মোট আইটেম সংখ্যা এবং ইউনিট হিসাব
  const totalItemsCount = cartItems.length;
  const totalUnits = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  // সাব-টোটাল হিসাব
  const subTotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0),
    0
  );

  // কুপন ডিসকাউন্ট হিসাব
  const couponDiscount = Math.max(0, Math.min(Number(discountAmount) || 0, subTotal));
  const amountAfterCoupon = Math.max(0, subTotal - couponDiscount);

  // লয়ালটি পয়েন্ট ডিসকাউন্ট হিসাব
  const maxRedeemablePoints = Math.min(
    availableLoyaltyPoints,
    Math.ceil(amountAfterCoupon / loyaltyRedeemRate)
  );

  const pointsActuallyRedeemed = isRedeemingLoyalty
    ? Math.max(0, Math.min(Number(loyaltyPointsToRedeem) || 0, maxRedeemablePoints))
    : 0;

  const loyaltyDiscount = pointsActuallyRedeemed * loyaltyRedeemRate;
  const initialDiscount = couponDiscount + loyaltyDiscount;

  // স্টোর ক্রেডিট ভাউচার ডিসকাউন্ট (Phase 7)
  const storeCreditDiscount = appliedStoreCredit
    ? Math.min(appliedStoreCredit.amount, Math.max(0, subTotal - initialDiscount))
    : 0;

  const totalDiscount = initialDiscount + storeCreditDiscount;

  // ফ্লোর প্রাইস ও মার্জিন সুরক্ষা হিসাব
  const minCartFloorTotal = cartItems.reduce(
    (acc, it) => acc + (Number(it.minSellingPrice !== undefined ? it.minSellingPrice : (it.costPrice || 0)) * (Number(it.quantity) || 0)),
    0
  );
  const maxAllowableDiscount = Math.max(0, subTotal - minCartFloorTotal);
  const isDiscountBreachingFloor = totalDiscount > maxAllowableDiscount && maxAllowableDiscount >= 0;

  const taxableAmount = Math.max(0, subTotal - totalDiscount);
  const taxAmount = parseFloat(((taxableAmount * (Number(taxRatePercent) || 0)) / 100).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

  // স্টোর ক্রেডিট ভাউচার প্রয়োগ হ্যান্ডলার
  const handleApplyStoreCredit = (e) => {
    if (e) e.preventDefault();
    setStoreCreditError('');
    const code = storeCreditCodeInput.trim().toUpperCase();
    if (!code) return;

    const record = (salesReturns || []).find((r) => String(r.CreditNoteCode || '').trim().toUpperCase() === code);
    if (!record) {
      setStoreCreditError('ভাউচার কোড পাওয়া যায়নি বা সঠিক নয়।');
      return;
    }

    if (record.CreditNoteStatus === 'Redeemed') {
      setStoreCreditError('এই ভাউচারটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
      return;
    }

    if (record.CreditNoteExpiry && new Date() > new Date(record.CreditNoteExpiry)) {
      setStoreCreditError('এই ভাউচারের মেয়াদ উত্তীর্ণ হয়ে গেছে।');
      return;
    }

    const amt = Number(record.TotalRefundAmount) || 0;
    if (amt <= 0) {
      setStoreCreditError('ভাউচারের ব্যালেন্স শূন্য।');
      return;
    }

    setAppliedStoreCredit({ code, amount: amt });
    setStoreCreditCodeInput('');
  };

  const handleRemoveStoreCredit = () => {
    setAppliedStoreCredit(null);
    setStoreCreditError('');
  };

  // এই অর্ডারে অর্জিত নতুন পয়েন্ট
  const newlyEarnedPoints = loyaltyEnabled ? Math.floor(grandTotal / loyaltyPointsRate) : 0;

  // ক্যাশ পরিবর্তনের (Change / Return) হিসাব
  const cashGiven = Number(receivedCash) || 0;
  const changeDue = Math.max(0, parseFloat((cashGiven - grandTotal).toFixed(2)));
  const shortAmount = Math.max(0, parseFloat((grandTotal - cashGiven).toFixed(2)));

  // স্প্লিট পেমেন্ট হিসাব
  const splitTotalPaid = (Number(splitPayments.cash) || 0) + (Number(splitPayments.bkash) || 0) + (Number(splitPayments.nagad) || 0) + (Number(splitPayments.card) || 0);
  const splitDue = Number(splitPayments.due) || 0;
  const splitSum = splitTotalPaid + splitDue;
  const splitRemaining = Math.max(0, parseFloat((grandTotal - splitSum).toFixed(2)));

  // ড্রপ-অফ কার্ট স্বয়ংক্রিয় ট্র্যাকিং (মোবাইল নম্বর দেওয়ার সাথে সাথে ডেবউন্সড সেভ)
  React.useEffect(() => {
    const rawPhone = String(customerPhone || '').replace(/[^0-9]/g, '');
    if (rawPhone.length >= 11 && cartItems.length > 0 && onSaveAbandonedCart) {
      const timer = setTimeout(() => {
        onSaveAbandonedCart({
          cartId: cartTrackingId,
          customerPhone: rawPhone,
          customerName: customerName.trim() || 'Online Visitor',
          customerEmail: customerEmail.trim(),
          customerAddress: customerAddress.trim(),
          items: cartItems,
          totalAmount: grandTotal,
          status: 'Pending'
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [customerPhone, customerName, customerEmail, customerAddress, cartItems, grandTotal, onSaveAbandonedCart, cartTrackingId]);

  // ফিল্টারকৃত কাস্টমার তালিকা (ডাটাবেস সার্চ)
  const filteredCustomers = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    if (!customerSearchQuery.trim()) return list.slice(0, 6);
    const q = customerSearchQuery.trim().toLowerCase();
    return list.filter(
      (c) =>
        c && (
          (c.CustomerName && String(c.CustomerName).toLowerCase().includes(q)) ||
          (c.Phone && String(c.Phone).includes(q)) ||
          (c.Email && String(c.Email).toLowerCase().includes(q))
        )
    ).slice(0, 10);
  }, [customers, customerSearchQuery]);

  // বিদ্যমান গ্রাহক নির্বাচন করা
  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(cust.CustomerID || '');
    setCustomerName(cust.CustomerName || '');
    setCustomerPhone(cust.Phone || '');
    setCustomerEmail(cust.Email || '');
    setCustomerAddress(cust.Address || '');
    setCustomerType(cust.CustomerType || 'Regular');
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  // দ্রুত সাধারণ ওয়াক-ইন কাস্টমার সেট করা
  const handleSetWalkIn = () => {
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerType('Regular');
    setShowCustomerDropdown(false);
  };

  // ফর্ম ক্লিয়ার / নতুন কাস্টমার
  const handleClearCustomerForm = () => {
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerType('Regular');
    setShowCustomerDropdown(false);
  };

  // বিক্রয় সম্পন্ন করার চূড়ান্ত হ্যান্ডলার
  const handleFinalSubmit = (shouldPrint = false) => {
    if (cartItems.length === 0 || isProcessing) return;

    const finalCustomerName = customerName.trim() || 'Walk-in Customer';

    let finalPaidAmount = grandTotal;
    let finalDueAmount = 0;

    if (paymentMethod === 'Due') {
      finalPaidAmount = 0;
      finalDueAmount = grandTotal;
    } else if (paymentMethod === 'Split') {
      finalPaidAmount = splitTotalPaid;
      finalDueAmount = splitDue;
      if (Math.abs(splitSum - grandTotal) > 0.05) {
        alert(`স্প্লিট পেমেন্টের হিসাব মেলেনি!\nমোট পরিশোধ: ৳${splitTotalPaid}\nমোট বাকি: ৳${splitDue}\nযোগফল: ৳${splitSum}\nমোট বিল: ৳${grandTotal}\n\nঅনুগ্রহ করে যোগফল বিলের সাথে সমান করুন।`);
        return;
      }
    }

    // বাকী থাকলে কাস্টমার নাম ও মোবাইল নম্বর যাচাই
    if (finalDueAmount > 0 && !customerPhone.trim() && (!customerName.trim() || customerName.trim().toLowerCase() === 'walk-in customer')) {
      alert('সতর্কতা: বাকী বা আংশিক বাকীতে বিক্রয় সম্পন্ন করতে গ্রাহকের নাম এবং মোবাইল নম্বর প্রদান করা আবশ্যক।');
      return;
    }

    // ক্রেডিট লিমিট গার্ড (Credit Limit Guard)
    if (finalDueAmount > 0 && customerCreditLimit > 0 && (customerCurrentDue + finalDueAmount > customerCreditLimit)) {
      const proceed = window.confirm(`সতর্কতা: এই গ্রাহকের বর্তমান বাকি ৳${customerCurrentDue} + নতুন বাকি ৳${finalDueAmount} = মোট ৳${customerCurrentDue + finalDueAmount}, যা নির্ধারিত ক্রেডিট লিমিট (৳${customerCreditLimit}) ছাড়িয়ে গেছে!\n\nআপনি কি তবুও এই বিক্রয়টি অনুমোদন করতে চান?`);
      if (!proceed) return;
    }

    onCompleteSale({
      items: cartItems,
      customerName: finalCustomerName,
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerType: customerType,
      customerId: selectedCustomerId || selectedCustomerObj?.CustomerID || '',
      orderNotes: orderNotes.trim(),
      discountAmount: totalDiscount,
      couponDiscount: couponDiscount,
      loyaltyDiscount: loyaltyDiscount,
      creditNoteCode: appliedStoreCredit?.code || '',
      creditNoteDiscount: storeCreditDiscount,
      loyaltyEarned: newlyEarnedPoints,
      loyaltyRedeemed: pointsActuallyRedeemed,
      cartId: cartTrackingId,
      taxPercent: Number(taxRatePercent) || 0,
      taxAmount: taxAmount,
      subTotal: subTotal,
      grandTotal: grandTotal,
      paymentMethod: paymentMethod,
      receivedCash: paymentMethod === 'Cash' ? cashGiven : (paymentMethod === 'Split' ? (Number(splitPayments.cash) || 0) : grandTotal),
      changeDue: paymentMethod === 'Cash' ? changeDue : 0,
      transactionRef: transactionRef.trim(),
      paidAmount: finalPaidAmount,
      dueAmount: finalDueAmount,
      splitDetails: paymentMethod === 'Split' ? {
        cash: Number(splitPayments.cash) || 0,
        bkash: Number(splitPayments.bkash) || 0,
        nagad: Number(splitPayments.nagad) || 0,
        card: Number(splitPayments.card) || 0,
        due: Number(splitPayments.due) || 0,
        trxRefs: splitTrxRefs
      } : null,
      creditLimit: customerCreditLimit,
      shouldPrint: shouldPrint,
    });
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col animate-in fade-in duration-200">
      
      {/* ১. প্রফেশনাল স্টেপার ও ব্রেডক্রাম্বস */}
      <div className="mb-7 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                চেকআউট ও পেমেন্ট (Checkout & Payment)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-11">
              গ্রাহকের বিবরণ নিশ্চিত করুন, পেমেন্ট মাধ্যম নির্বাচন করুন এবং বিক্রয় রশিদ তৈরি করুন।
            </p>
          </div>

          {/* স্টেপ ট্র্যাকার */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-bold self-start md:self-auto">
            <button
              onClick={onNavigateToCatalog}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[11px] font-black">১</span>
              <span>পণ্য ক্যাটালগ</span>
            </button>

            <span className="text-slate-300 font-bold">──</span>

            <button
              onClick={onNavigateToCart}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[11px] font-black">২</span>
              <span>শপিং কার্ট</span>
            </button>

            <span className="text-slate-300 font-bold">──</span>

            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <span className="w-5 h-5 rounded-full bg-white text-emerald-700 flex items-center justify-center text-[11px] font-black">৩</span>
              <span>চেকআউট ও পেমেন্ট</span>
            </div>
          </div>
        </div>
      </div>

      {/* অতিথি গ্রাহকদের জন্য লগইন / সাইন-আপ ব্যানার */}
      {isGuest && onOpenAuthModal && (
        <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-violet-50 border border-indigo-100 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                আপনার কি পূর্ববর্তী অ্যাকাউন্ট রয়েছে?
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                লগইন করলে আপনার পূর্ববর্তী ঠিকানা ও অর্ডার হিস্ট্রি যুক্ত থাকবে, অথবা আপনি অতিথি হিসেবেও ফর্ম পূরণ করে অর্ডার করতে পারেন।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAuthModal}
            className="shrink-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-black transition-all shadow-md hover:shadow-lg flex items-center space-x-2 cursor-pointer active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>লগইন / সাইন-আপ করুন</span>
          </button>
        </div>
      )}

      {/* ২. চেকআউট মডার্ন গ্রিড লেআউট */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
        
        {/* বাম কলাম: কাস্টমার ডাটাবেস ও পেমেন্ট অপশন (৮ কলাম) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* ২.১ কাস্টমার প্রোফাইল কার্ড */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  isAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    {isAdmin ? 'গ্রাহকের বিবরণ (Customer Information)' : 'ডেলিভারি ও যোগাযোগের তথ্য'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? 'ডাটাবেস থেকে পুরাতন গ্রাহক নির্বাচন করুন অথবা নতুন গ্রাহক নিবন্ধন করুন'
                      : 'অর্ডার নিশ্চিত করার জন্য আপনার সঠিক নাম, ফোন নম্বর ও পূর্ণাঙ্গ ঠিকানা প্রদান করুন'}
                  </p>
                </div>
              </div>

              {/* কুইক অ্যাকশন বাটনসমূহ (শুধু ক্যাশিয়ার/এডমিন মোডে) */}
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSetWalkIn}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    ওয়াক-ইন গ্রাহক
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCustomerForm}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>নতুন ফর্ম</span>
                  </button>
                </div>
              )}
            </div>

            {/* গ্রাহক অনুসন্ধান ইনপুট (Live Database Search - শুধু ক্যাশিয়ার মোডে) */}
            {isAdmin && (
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  গ্রাহক খুঁজুন (ফোন নম্বর বা নাম দিয়ে ডাটাবেস সার্চ):
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="গ্রাহকের নাম বা মোবাইল নম্বর টাইপ করুন..."
                  value={customerSearchQuery}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium transition-all"
                />
              </div>

              {/* লাইভ ড্রপডাউন পপওভার */}
              {showCustomerDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                  <div className="p-2.5 bg-slate-50 text-[11px] font-bold text-slate-500 flex justify-between items-center px-4">
                    <span>ডাটাবেসে সংরক্ষিত গ্রাহক তালিকা ({filteredCustomers.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold"
                    >
                      বন্ধ করুন ✕
                    </button>
                  </div>

                  {filteredCustomers.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-500">
                      কোনো গ্রাহক পাওয়া যায়নি। নিচে সরাসরি নতুন গ্রাহকের তথ্য পূরণ করুন।
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.CustomerID || c.Phone}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3.5 hover:bg-indigo-50/70 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                            {c.CustomerName ? c.CustomerName.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">{c.CustomerName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200/80">
                                {c.CustomerType || 'Regular'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">{c.Phone || 'মোবাইল নেই'}</span>
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          <span className="text-indigo-600 font-black block">{currencySymbol}{Number(c.TotalSpent || 0).toFixed(2)}</span>
                          <span className="text-slate-400 font-semibold">{c.TotalOrders || 0} টি অর্ডার</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* গ্রাহক বাকির তথ্য ও ক্রেডিট লিমিট কার্ড (Customer Due & Credit Limit Pill) */}
          {selectedCustomerObj && (Number(selectedCustomerObj.CurrentDue) > 0 || Number(selectedCustomerObj.CreditLimit) > 0) && (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">গ্রাহকের পূর্বের বকেয়া হিসাব:</span>
                  <span className="text-sm font-black text-rose-600 font-mono">
                    {currencySymbol}{Number(selectedCustomerObj.CurrentDue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                {Number(selectedCustomerObj.CreditLimit) > 0 ? (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">নির্ধারিত ক্রেডিট লিমিট</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {currencySymbol}{Number(selectedCustomerObj.CreditLimit).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">ক্রেডিট লিমিট সেট করা নেই</span>
                )}
              </div>
            </div>
          )}

          {/* গ্রাহক তথ্য ফরম ফিল্ডস */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* গ্রাহকের নাম */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>গ্রাহকের নাম *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="গ্রাহকের পুরো নাম লিখুন"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* মোবাইল নম্বর */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>মোবাইল নম্বর *</span>
                </label>
                <input
                  type="tel"
                  placeholder="যেমন: 01711-XXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* ইমেইল ঠিকানা */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ইমেইল ঠিকানা (ঐচ্ছিক)</span>
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* কাস্টমার ধরন (Type) - শুধু এডমিন / ক্যাশিয়ার */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>গ্রাহকের ক্যাটাগরি</span>
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 transition-all"
                  >
                    <option value="Regular">নিয়মিত খুচরা গ্রাহক (Regular)</option>
                    <option value="Wholesale">পাইকারি গ্রাহক (Wholesale)</option>
                    <option value="VIP">ভিআইপি গ্রাহক (VIP Member)</option>
                    <option value="Corporate">কর্পোরেট ক্লায়েন্ট (Corporate)</option>
                  </select>
                </div>
              )}

              {/* পূর্ণাঙ্গ ঠিকানা */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>গ্রাহকের ঠিকানা (ডেলিভারি বা যোগাযোগের জন্য)</span>
                </label>
                <input
                  type="text"
                  placeholder="বাড়ি, রোড, এলাকা, থানা, জেলা"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              {/* অর্ডার স্পেশাল নোট */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>অর্ডার নোট বা বিশেষ মন্তব্য</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: দ্রুত ডেলিভারি দিতে হবে / বিশেষ নির্দেশনা..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

            </div>

          </div>

          {/* ২.২ পেমেন্ট মেথড ও ক্যাশ ক্যালকুলেটর সেকশন */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    পেমেন্ট মেথড নির্বাচন (Payment Method)
                  </h2>
                  <p className="text-xs text-slate-500">
                    গ্রাহক যেভাবে মূল্য পরিশোধ করছেন সেটি নির্বাচন করুন
                  </p>
                </div>
              </div>
            </div>

            {/* পেমেন্ট কার্ড গ্রিড (Modern Brand Accent Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'Cash', label: 'নগদ টাকা (Cash)', icon: Banknote, color: 'text-emerald-600', activeBg: 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20' },
                { id: 'bKash', label: 'বিকাশ (bKash)', icon: Smartphone, color: 'text-pink-600', activeBg: 'bg-pink-50/80 border-pink-500 ring-2 ring-pink-500/20' },
                { id: 'Nagad', label: 'নগদ (Nagad)', icon: Smartphone, color: 'text-amber-600', activeBg: 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20' },
                { id: 'Rocket', label: 'রকেট (Rocket)', icon: Smartphone, color: 'text-purple-600', activeBg: 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20' },
                { id: 'Card', label: 'কার্ড / POS (Card)', icon: CreditCard, color: 'text-indigo-600', activeBg: 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20' },
                { id: 'Due', label: 'বাকী / ক্রেডিট (Due)', icon: AlertTriangle, color: 'text-rose-600', activeBg: 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20' },
                { id: 'Split', label: 'স্প্লিট পেমেন্ট (Split)', icon: Layers, color: 'text-violet-600', activeBg: 'bg-violet-50/80 border-violet-500 ring-2 ring-violet-500/20' },
              ].map((pm) => {
                const Icon = pm.icon;
                const isSelected = paymentMethod === pm.id;

                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between space-y-2 cursor-pointer ${
                      isSelected
                        ? pm.activeBg
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white shadow-2xs ' + pm.color : 'bg-white text-slate-500 border border-slate-200'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <CheckCircle className={`w-4 h-4 ${pm.color}`} />
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      {pm.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* নগদ প্রদান ক্যালকুলেটর (Modern Change Calculator - শুধু ক্যাশিয়ার / এডমিন মোডে) */}
            {isAdmin && paymentMethod === 'Cash' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">নগদ প্রদান ক্যালকুলেটর</h4>
                    <p className="text-[11px] text-slate-500">গ্রাহকের কাছ থেকে নেওয়া টাকার পরিমাণ লিখুন</p>
                  </div>
                  
                  {/* কুইক শর্টকাট বাটনসমূহ */}
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    {[grandTotal, Math.ceil(grandTotal / 500) * 500, Math.ceil(grandTotal / 1000) * 1000].map((amt, idx) => {
                      if (!amt || isNaN(amt)) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReceivedCash(amt.toString())}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-bold text-slate-700 transition-all shadow-2xs"
                        >
                          {currencySymbol}{amt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      গ্রহণকৃত নগদ টাকা ({currencySymbol}):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={receivedCash}
                      onChange={(e) => setReceivedCash(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-lg font-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-900"
                    />
                  </div>

                  {/* ফেরত দেওয়ার ডিজিটাল ডিসপ্লে */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-center shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500">গ্রাহককে ফেরত দিতে হবে (Change):</span>
                    <span className={`text-xl sm:text-2xl font-black tracking-tight ${cashGiven >= grandTotal ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {currencySymbol}{changeDue.toFixed(2)}
                    </span>
                    {shortAmount > 0 && cashGiven > 0 && (
                      <span className="text-[11px] text-rose-600 font-bold mt-0.5">
                        (আরও {currencySymbol}{shortAmount.toFixed(2)} টাকা বাকী রয়েছে)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* গ্রাহক / অতিথি মোডে ক্যাশ অন ডেলিভারি বার্তা */}
            {!isAdmin && paymentMethod === 'Cash' && (
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-emerald-800 text-xs flex items-center space-x-3 animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <strong className="block text-emerald-950 font-bold">ক্যাশ অন ডেলিভারি (Cash on Delivery):</strong>
                  <span className="text-emerald-700">পণ্য হাতে পেয়ে দেখে ডেলিভারিম্যানকে নগদ মূল্য পরিশোধ করবেন। কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই।</span>
                </div>
              </div>
            )}

            {/* মোবাইল ব্যাংকিং বা কার্ড ট্রানজেকশন আইডি */}
            {(paymentMethod === 'bKash' || paymentMethod === 'Nagad' || paymentMethod === 'Rocket' || paymentMethod === 'Card') && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-slate-700">
                  ট্রানজেকশন আইডি / পেমেন্ট রেফারেন্স (TrxID / Ref No - ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: TRXB9828731 বা স্লিপ #120"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            )}

            {/* স্প্লিট পেমেন্ট (Split Payment Mode) ইন্টারফেস */}
            {paymentMethod === 'Split' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-violet-600" />
                      <span>বহুবিধ মাধ্যমে পেমেন্ট ভাগ করুন (Split Payment)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      মোট বিল: <strong className="text-slate-800 font-bold">{currencySymbol}{grandTotal}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        const paidOthers = (Number(splitPayments.bkash) || 0) + (Number(splitPayments.nagad) || 0) + (Number(splitPayments.card) || 0) + (Number(splitPayments.due) || 0);
                        const rem = Math.max(0, parseFloat((grandTotal - paidOthers).toFixed(2)));
                        setSplitPayments(prev => ({ ...prev, cash: rem > 0 ? rem.toString() : '' }));
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      অবশিষ্ট নগদে দিন
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, parseFloat((grandTotal - splitTotalPaid).toFixed(2)));
                        setSplitPayments(prev => ({ ...prev, due: rem > 0 ? rem.toString() : '' }));
                      }}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-bold text-rose-700 transition-all cursor-pointer shadow-2xs"
                    >
                      অবশিষ্ট বাকীতে লিখুন
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* ১. নগদ (Cash) */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        <span>নগদ পরিশোধ (Cash):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={splitPayments.cash}
                      onChange={(e) => setSplitPayments(prev => ({ ...prev, cash: e.target.value }))}
                      className="w-full px-3 py-2 text-sm font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  {/* ২. বিকাশ (bKash) */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                        <span>বিকাশ (bKash):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}</span>
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={splitPayments.bkash}
                        onChange={(e) => setSplitPayments(prev => ({ ...prev, bkash: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                      />
                      {Number(splitPayments.bkash) > 0 && (
                        <input
                          type="text"
                          placeholder="bKash TrxID (যেমন: TRXB9828731)"
                          value={splitTrxRefs.bkash}
                          onChange={(e) => setSplitTrxRefs(prev => ({ ...prev, bkash: e.target.value }))}
                          className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* ৩. নগদ (Nagad) */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                        <span>নগদ (Nagad MFS):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}</span>
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={splitPayments.nagad}
                        onChange={(e) => setSplitPayments(prev => ({ ...prev, nagad: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      {Number(splitPayments.nagad) > 0 && (
                        <input
                          type="text"
                          placeholder="Nagad TrxID (ঐচ্ছিক)"
                          value={splitTrxRefs.nagad}
                          onChange={(e) => setSplitTrxRefs(prev => ({ ...prev, nagad: e.target.value }))}
                          className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* ৪. কার্ড / POS (Card) */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        <span>কার্ড / POS (Card):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}</span>
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={splitPayments.card}
                        onChange={(e) => setSplitPayments(prev => ({ ...prev, card: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      {Number(splitPayments.card) > 0 && (
                        <input
                          type="text"
                          placeholder="কার্ড স্লিপ / Auth Ref (ঐচ্ছিক)"
                          value={splitTrxRefs.card}
                          onChange={(e) => setSplitTrxRefs(prev => ({ ...prev, card: e.target.value }))}
                          className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* ৫. বাকী / ক্রেডিট (Due) */}
                  <div className="sm:col-span-2 bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
                    <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>বাকী / বকেয়া রাখা হবে (Due / Credit):</span>
                      </span>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">{currencySymbol}</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={splitPayments.due}
                      onChange={(e) => setSplitPayments(prev => ({ ...prev, due: e.target.value }))}
                      className="w-full px-3.5 py-2 text-base font-black bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-rose-700"
                    />
                    {Number(splitPayments.due) > 0 && (
                      <p className="text-[10px] text-rose-600 font-bold mt-1">
                        * এই পরিমাণ টাকা কাস্টমারের বাকির খাতা ও লেজারে স্বয়ংক্রিয়ভাবে বকেয়া হিসেবে যোগ হবে।
                      </p>
                    )}
                  </div>
                </div>

                {/* স্প্লিট ব্যালেন্স স্ট্যাটাস বার */}
                <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold ${
                  Math.abs(splitSum - grandTotal) < 0.05
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  <div className="flex items-center space-x-3 flex-wrap">
                    <span>পরিশোধ: <strong className="text-emerald-700 font-mono font-black">{currencySymbol}{splitTotalPaid}</strong></span>
                    <span>•</span>
                    <span>বাকী: <strong className="text-rose-600 font-mono font-black">{currencySymbol}{splitDue}</strong></span>
                    <span>•</span>
                    <span>মোট: <strong className="font-mono">{currencySymbol}{splitSum}</strong></span>
                  </div>

                  <div>
                    {Math.abs(splitSum - grandTotal) < 0.05 ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>মোট বিলের সাথে শতভাগ মিলেছে</span>
                      </span>
                    ) : splitSum < grandTotal ? (
                      <span className="text-rose-600 font-bold">
                        আরও {currencySymbol}{(grandTotal - splitSum).toFixed(2)} টাকা মেলানো বাকি
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold">
                        বিল থেকে {currencySymbol}{(splitSum - grandTotal).toFixed(2)} টাকা অতিরিক্ত ইনপুট হয়েছে
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* বাকী বিক্রয় অ্যালার্ট */}
            {paymentMethod === 'Due' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900 text-xs animate-in fade-in duration-150">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">বাকী / ক্রেডিট বিক্রয় সতর্কতা</h4>
                  <p className="text-rose-700 mt-0.5 font-medium">
                    এই বিক্রয়টি বকেয়া হিসেবে লিপিবদ্ধ হবে। অনুগ্রহ করে নিশ্চিত করুন যে গ্রাহকের নাম ও মোবাইল নম্বর সঠিকভাবে পূরণ করা হয়েছে।
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ডান কলাম: চূড়ান্ত অর্ডার সারসংক্ষেপ ও চেকআউট অ্যাকশন (৪ কলাম) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 sticky top-24">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <StoreLogo
                  url={settings?.LogoUrl || settings?.logoUrl}
                  alt={settings?.StoreName || 'স্টোর'}
                  className="w-9 h-9 object-contain rounded-xl border border-slate-200 p-0.5 bg-white shadow-2xs"
                  fallbackIcon={Receipt}
                  fallbackClassName="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"
                  iconClassName="w-5 h-5"
                />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {settings?.StoreName || 'চূড়ান্ত সারসংক্ষেপ'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">অর্ডার ভেরিফিকেশন ও সামারি</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {totalUnits} আইটেম
              </span>
            </div>

            {/* কার্ট আইটেমস প্রিভিউ */}
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 divide-y divide-slate-100">
              {cartItems.map((item) => {
                const itemKey = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
                return (
                  <div key={itemKey} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-slate-900 truncate">
                        {item.productName}
                        {item.variantName && (
                          <span className="ml-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {item.variantName}
                          </span>
                        )}
                        {item.isBundle && (
                          <span className="ml-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">
                            কম্বো
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>{formatFabricQuantity(item.quantity, item.unit)} × {currencySymbol}{Number(item.sellingPrice).toFixed(2)}</span>
                        {item.isBargained && (
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">
                            দরদামকৃত
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-black text-slate-900">
                      {currencySymbol}{((Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* লয়ালটি পয়েন্ট রিওয়ার্ড কার্ড */}
            {loyaltyEnabled && (
              <div className="p-3.5 bg-gradient-to-br from-purple-50/80 via-indigo-50/40 to-purple-50/60 border border-purple-200/90 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      🪙
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800">লয়ালটি পয়েন্ট রিওয়ার্ড</div>
                      <div className="text-[10px] text-slate-500">
                        উপলব্ধ ব্যালেন্স: <strong className="text-purple-700 font-bold">{availableLoyaltyPoints}</strong> পয়েন্ট
                      </div>
                    </div>
                  </div>

                  {availableLoyaltyPoints >= minRedeemPoints ? (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-purple-700">
                      <input
                        type="checkbox"
                        checked={isRedeemingLoyalty}
                        onChange={(e) => {
                          setIsRedeemingLoyalty(e.target.checked);
                          if (e.target.checked && !loyaltyPointsToRedeem) {
                            setLoyaltyPointsToRedeem(Math.min(availableLoyaltyPoints, maxRedeemablePoints).toString());
                          }
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <span>ভাঙিয়ে ছাড় নিন</span>
                    </label>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      (ন্যূনতম {minRedeemPoints} পয়েন্ট আবশ্যক)
                    </span>
                  )}
                </div>

                {/* পয়েন্ট ইনপুট ফিল্ড (যখন রিডিম সক্রিয় করা হয়) */}
                {isRedeemingLoyalty && availableLoyaltyPoints >= minRedeemPoints && (
                  <div className="pt-2 border-t border-purple-200/70 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max={maxRedeemablePoints}
                        value={loyaltyPointsToRedeem}
                        onChange={(e) => setLoyaltyPointsToRedeem(e.target.value)}
                        placeholder={`সর্বোচ্চ ${maxRedeemablePoints}`}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                      />
                    </div>
                    <span className="text-xs font-black text-purple-700 shrink-0">
                      = -{currencySymbol}{(Number(loyaltyPointsToRedeem || 0) * loyaltyRedeemRate).toFixed(2)} ছাড়
                    </span>
                  </div>
                )}

                {/* এই কেনাকাটায় অর্জিত পয়েন্ট ব্যাজ */}
                {newlyEarnedPoints > 0 && (
                  <div className="text-[11px] font-bold text-emerald-700 bg-white/80 border border-emerald-200/80 px-2.5 py-1 rounded-xl flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>এই কেনাকাটায় অর্জন হবে:</span>
                    </span>
                    <span className="font-mono font-black text-emerald-800">+{newlyEarnedPoints} পয়েন্ট</span>
                  </div>
                )}
              </div>
            )}

            {/* স্টোর ক্রেডিট ভাউচার নোট বক্স (Phase 7) */}
            <div className="p-3 bg-gradient-to-r from-amber-50/70 to-indigo-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                  <Ticket className="w-4 h-4 text-amber-600" />
                  <span>স্টোর ক্রেডিট ভাউচার</span>
                </div>
                {appliedStoreCredit && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    প্রযুক্ত
                  </span>
                )}
              </div>

              {appliedStoreCredit ? (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div>
                    <span className="font-mono font-bold text-xs text-indigo-700 block">{appliedStoreCredit.code}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      ভাউচার ব্যালেন্স: {currencySymbol}{appliedStoreCredit.amount.toFixed(2)} (ছাড়: -{currencySymbol}{storeCreditDiscount.toFixed(2)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveStoreCredit}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="ভাউচার বাতিল"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyStoreCredit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="SCN-XXXXXX কোড দিন"
                    value={storeCreditCodeInput}
                    onChange={(e) => setStoreCreditCodeInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-mono uppercase focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!storeCreditCodeInput.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors shadow-2xs"
                  >
                    প্রয়োগ
                  </button>
                </form>
              )}

              {storeCreditError && (
                <div className="flex items-center space-x-1 text-[10px] text-rose-600 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{storeCreditError}</span>
                </div>
              )}
            </div>

            {/* খরচ ও মোট টাকার তালিকা */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>উপ-মোট (Subtotal):</span>
                <span className="font-bold text-slate-800">{currencySymbol}{subTotal.toFixed(2)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>কুপন ডিসকাউন্ট ছাড়:</span>
                  <span>-{currencySymbol}{couponDiscount.toFixed(2)}</span>
                </div>
              )}

              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-purple-600 font-bold">
                  <span>লয়ালটি পয়েন্ট ছাড় ({pointsActuallyRedeemed} pt):</span>
                  <span>-{currencySymbol}{loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}

              {storeCreditDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>স্টোর ক্রেডিট ভাউচার ছাড়:</span>
                  <span>-{currencySymbol}{storeCreditDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>ভ্যাট ও কর ({taxRatePercent}%):</span>
                <span className="font-semibold text-slate-800">{currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>

              {/* মোট প্রদেয় */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-sm sm:text-base font-black text-slate-900 block">
                    মোট প্রদেয়:
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    মাধ্যম: <strong className="text-indigo-600">{paymentMethod}</strong>
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                  {currencySymbol}{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* চেকআউট অ্যাকশন বাটনসমূহ */}
            <div className="space-y-2.5 pt-2">
              
              {isCustomer ? (
                /* গ্রাহক মোডে বাটনসমূহ */
                <>
                  <button
                    type="button"
                    onClick={() => handleFinalSubmit(false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center justify-center space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>
                      {isProcessing
                        ? 'অর্ডার প্রসেসিং হচ্ছে...'
                        : `অর্ডার নিশ্চিত করুন (${currencySymbol}${grandTotal.toFixed(2)})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinalSubmit(true)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>অর্ডার ও মেমো প্রিন্ট করুন</span>
                  </button>
                </>
              ) : (
                /* ক্যাশিয়ার / এডমিন মোডে বাটনসমূহ */
                <>
                  {/* বাটন ১: বিক্রয় ও ইনভয়েস প্রিন্ট করুন */}
                  <button
                    type="button"
                    onClick={() => handleFinalSubmit(true)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center justify-center space-x-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{isProcessing ? 'প্রসেসিং হচ্ছে...' : 'বিক্রয় ও ইনভয়েস প্রিন্ট করুন'}</span>
                  </button>

                  {/* বাটন ২: শুধুমাত্র বিক্রয় সম্পন্ন করুন */}
                  <button
                    type="button"
                    onClick={() => handleFinalSubmit(false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>শুধুমাত্র বিক্রয় ({currencySymbol}{grandTotal.toFixed(2)})</span>
                  </button>
                </>
              )}

              {/* কার্টে ফিরে যান */}
              <button
                type="button"
                onClick={onNavigateToCart}
                className="w-full py-2.5 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>কার্ট পেজে ফিরে যান</span>
              </button>

            </div>

            {/* অডিট ইনফো */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
              {isCustomer ? (
                <span>অর্ডারকারী: <strong className="text-slate-800">{activeUser?.FullName || customerName || 'সম্মানিত অতিথি গ্রাহক'}</strong> • {new Date().toLocaleDateString('bn-BD')}</span>
              ) : (
                <span>অপারেটর: <strong className="text-slate-800">{activeUser?.FullName || 'প্রধান ক্যাশিয়ার'}</strong> • {new Date().toLocaleDateString('bn-BD')}</span>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
