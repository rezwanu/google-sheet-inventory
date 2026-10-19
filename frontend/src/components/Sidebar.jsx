import React from 'react';
import {
  LayoutGrid,
  ShoppingCart,
  PackageCheck,
  Users,
  Receipt,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  PackagePlus,
  ShoppingBag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Ticket,
  UserCog,
  Truck,
  BookOpen,
  Barcode as BarcodeIcon,
  Building2,
  Coins,
  ShieldAlert,
  CalendarClock
} from 'lucide-react';

/**
 * আধুনিক সাইডবার মেনু প্যানেল (Modern Sidebar Menu Panel)
 * কোনো ড্রয়ার বা ওভারলে ছাড়া মূল লেআউটের অংশ হিসেবে বাম পাশে ডক করা থাকে।
 * প্রয়োজন অনুযায়ী প্রসারিত (Expanded) বা সংকুচিত (Collapsed) করা যায়।
 */
export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  settings = {},
  activeUser = null,
  currentView = 'pos',
  onNavigate,
  cartCount = 0,
  cartTotal = 0,
  pendingOrdersCount = 0,
  currencySymbol = '৳',
  lowStockCount = 0,
  customers = [],
  suppliersCount = 0,
  pendingPOCount = 0,
  abandonedCartsCount = 0,
  onOpenAbandonedCartModal,
  onOpenCustomerLedgerModal,
  onOpenSuppliersModal,
  onOpenPurchaseOrdersModal,
  onOpenBarcodeModal,
  onOpenExpensesModal,
  onOpenCashRegisterModal,
  onOpenAuditLogsModal,
  isRegisterOpen = false,
  expensesCount = 0,
  onOpenStockModal,
  onOpenProductModal,
  onOpenAnalyticsModal,
  onOpenLowStockModal,
  onOpenExpiryAlertModal,
  expiringProductsCount = 0,
  onOpenCustomersModal,
  onOpenUsersModal,
  onOpenCouponModal,
  onOpenInvoiceLookupModal,
  onOpenCustomerOrdersModal,
  onSwitchToCustomerMode,
  onOpenAuthModal,
  onLogout,
  syncStatus = 'offline',
}) {
  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isCustomer = isLoggedIn && activeUser.Role === 'Customer';
  const isAdmin = isLoggedIn && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier');

  // গ্রাহক বকেয়া সারাংশ হিসাব
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const totalDueAmount = safeCustomers.reduce((sum, c) => sum + (Number(c?.CurrentDue) || 0), 0);
  const dueCustomersCount = safeCustomers.filter((c) => (Number(c?.CurrentDue) || 0) > 0).length;

  // সাইডবার মেনু প্যানেল শুধুমাত্র এডমিন লগইন থাকলে দৃশ্যমান হবে (গ্রাহকের জন্য প্রযোজ্য নয়)
  if (!isAdmin) {
    return null;
  }

  const handleAction = (callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 sticky top-16 h-[calc(100vh-4rem)] select-none shadow-xs ${
        isCollapsed ? 'w-18' : 'w-64 lg:w-68'
      } ${isMobileOpen ? 'flex fixed inset-y-0 left-0 top-16 shadow-2xl z-40' : 'hidden md:flex'}`}
    >
      {/* ১. সাইডবার ন্যাভিগেশন লিংকসমূহ (স্ক্রোলেবল প্যানেল বডি) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 py-4 scrollbar-thin scrollbar-thumb-slate-200">
        
        {/* সেকশন ১: প্রধান নেভিগেশন পেজ */}
        <div>
          {!isCollapsed && (
            <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              মূল পেজসমূহ
            </p>
          )}
          <nav className="space-y-1.5">
            
            {/* ক্যাটালগ পেজ */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate && onNavigate('pos'))}
              title="পণ্য ক্যাটালগ ও বিক্রয়"
              className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
              } ${
                currentView === 'pos'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    currentView === 'pos' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </div>
                {!isCollapsed && <span>পণ্য ক্যাটালগ</span>}
              </div>
              {!isCollapsed && currentView === 'pos' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              )}
            </button>

            {/* কার্ট পেজ */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate && onNavigate('cart'))}
              title={`শপিং কার্ট (${cartCount} আইটেম)`}
              className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer relative ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
              } ${
                currentView === 'cart' || currentView === 'checkout'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    currentView === 'cart' || currentView === 'checkout'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                </div>
                {!isCollapsed && <span>শপিং কার্ট পেজ</span>}
              </div>
              
              {cartCount > 0 && (
                <span
                  className={`${
                    isCollapsed
                      ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-600 text-white border-2 border-white'
                      : 'px-2 py-0.5 rounded-full text-[10px] font-black'
                  } ${
                    !isCollapsed && (currentView === 'cart' || currentView === 'checkout')
                      ? 'bg-white text-indigo-700'
                      : 'bg-indigo-600 text-white shadow-xs'
                  }`}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* অর্ডার ম্যানেজমেন্ট পেজ */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate && onNavigate('orders'))}
              title={`অর্ডার ম্যানেজমেন্ট (${pendingOrdersCount > 0 ? `${pendingOrdersCount}টি অপেক্ষমান` : 'সকল অর্ডার'})`}
              className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer relative ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
              } ${
                currentView === 'orders'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    currentView === 'orders'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                </div>
                {!isCollapsed && <span>অর্ডার ম্যানেজমেন্ট</span>}
              </div>

              {pendingOrdersCount > 0 && (
                <span
                  className={`${
                    isCollapsed
                      ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white border-2 border-white'
                      : 'px-2 py-0.5 rounded-full text-[10px] font-black'
                  } ${
                    !isCollapsed && currentView === 'orders'
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-amber-500 text-white shadow-xs'
                  }`}
                >
                  {pendingOrdersCount}
                </span>
              )}
            </button>

          </nav>
        </div>

        {/* সেকশন ২: গ্রাহক পোর্টাল (যদি সাধারণ গ্রাহক লগইন থাকে) */}
        {isCustomer && (
          <div>
            {!isCollapsed && (
              <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                গ্রাহক পোর্টাল
              </p>
            )}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleAction(onOpenCustomerOrdersModal)}
                title="আমার পূর্ববর্তী অর্ডারসমূহ ও মেমো"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>আমার অর্ডারসমূহ</span>}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* সেকশন ৩: এডমিন ও ইনভেন্টরি ম্যানেজমেন্ট কন্ট্রোল (যদি এডমিন লগইন থাকে) */}
        {isAdmin && (
          <div>
            {!isCollapsed && (
              <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                ইনভেন্টরি ও এডমিন
              </p>
            )}
            <div className="space-y-1.5">
              
              {/* নতুন পণ্য যোগ */}
              <button
                type="button"
                onClick={() => handleAction(onOpenProductModal)}
                title="নতুন পণ্য ডাটাবেসে যোগ করুন"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>নতুন পণ্য যোগ</span>}
                </div>
              </button>

              {/* স্টক ইনপুট ও বৃদ্ধি */}
              <button
                type="button"
                onClick={() => handleAction(onOpenStockModal)}
                title="মজুদ পণ্য যোগ বা আপডেট করুন (রিস্টক)"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>স্টক ইনপুট</span>}
                </div>
              </button>

              {/* কম স্টক সতর্কতা */}
              <button
                type="button"
                onClick={() => handleAction(onOpenLowStockModal)}
                title={lowStockCount > 0 ? `${lowStockCount}টি পণ্যের স্টক কম রয়েছে!` : 'কম স্টক সতর্কতা তালিকা'}
                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  lowStockCount > 0
                    ? 'bg-amber-50/80 text-amber-950 border border-amber-200/80 hover:bg-amber-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      lowStockCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>কম স্টক সতর্কতা</span>}
                </div>
                {lowStockCount > 0 && (
                  <span
                    className={`${
                      isCollapsed
                        ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white border-2 border-white'
                        : 'px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-2xs shrink-0'
                    }`}
                  >
                    {lowStockCount}টি
                  </span>
                )}
              </button>

              {/* মেয়াদ সতর্কতা ও ব্যাচ ট্র্যাকিং */}
              <button
                type="button"
                onClick={() => handleAction(onOpenExpiryAlertModal)}
                title={expiringProductsCount > 0 ? `${expiringProductsCount}টি পণ্যের মেয়াদ শেষ বা সন্নিকটে!` : 'পণ্য মেয়াদ ও ব্যাচ ট্র্যাকিং'}
                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  expiringProductsCount > 0
                    ? 'bg-rose-50/80 text-rose-950 border border-rose-200/80 hover:bg-rose-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      expiringProductsCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>মেয়াদ সতর্কতা</span>}
                </div>
                {expiringProductsCount > 0 && (
                  <span
                    className={`${
                      isCollapsed
                        ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white border-2 border-white'
                        : 'px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-2xs shrink-0 animate-pulse'
                    }`}
                  >
                    {expiringProductsCount}টি
                  </span>
                )}
              </button>

              {/* লাভ-ক্ষতি ও অ্যানালিটিক্স */}
              <button
                type="button"
                onClick={() => handleAction(onOpenAnalyticsModal)}
                title="লাভ-ক্ষতি ও ব্যবসায়িক অ্যানালিটিক্স রিপোর্ট"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>লাভ-ক্ষতি রিপোর্ট</span>}
                </div>
              </button>

              {/* গ্রাহক ডাটাবেস */}
              <button
                type="button"
                onClick={() => handleAction(onOpenCustomersModal)}
                title="গ্রাহক ডাটাবেস ব্যবস্থাপনা"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>গ্রাহক ডাটাবেস</span>}
                </div>
              </button>

              {/* বকেয়া ও বাকির খাতা */}
              <button
                type="button"
                onClick={() => handleAction(onOpenCustomerLedgerModal)}
                title={totalDueAmount > 0 ? `মোট বকেয়া: ৳${totalDueAmount.toLocaleString('en-IN')} (${dueCustomersCount} জন)` : 'বাকির খাতা ও কাস্টমার লেজার'}
                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  totalDueAmount > 0
                    ? 'bg-amber-50/70 text-amber-950 border border-amber-200/80 hover:bg-amber-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    totalDueAmount > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>বাকির খাতা ও লেজার</span>}
                </div>
                {totalDueAmount > 0 && (
                  <span
                    className={`${
                      isCollapsed
                        ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-600 text-white border-2 border-white'
                        : 'px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black shadow-2xs shrink-0'
                    }`}
                  >
                    {dueCustomersCount} জন
                  </span>
                )}
              </button>

              {/* পারচেজ অর্ডার ও মালামাল রিস্টক (PO) */}
              <button
                type="button"
                onClick={() => handleAction(onOpenPurchaseOrdersModal)}
                title={pendingPOCount > 0 ? `${pendingPOCount}টি পারচেজ অর্ডার পেন্ডিং আছে` : 'পারচেজ অর্ডার ও স্টক প্রকিউরমেন্ট'}
                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  pendingPOCount > 0
                    ? 'bg-amber-50/70 text-amber-950 border border-amber-200/80 hover:bg-amber-100'
                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    pendingPOCount > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>পারচেজ অর্ডার (PO)</span>}
                </div>
                {pendingPOCount > 0 && (
                  <span
                    className={`${
                      isCollapsed
                        ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-600 text-white border-2 border-white'
                        : 'px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black shadow-2xs shrink-0'
                    }`}
                  >
                    {pendingPOCount}টি
                  </span>
                )}
              </button>

              {/* সাপ্লায়ার ও ভেন্ডর খাতা */}
              <button
                type="button"
                onClick={() => handleAction(onOpenSuppliersModal)}
                title="সাপ্লায়ার ও ভেন্ডর তালিকা এবং বকেয়া দেনা খাতা"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Truck className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>সাপ্লায়ার ও ভেন্ডর</span>}
                </div>
                {!isCollapsed && suppliersCount > 0 && (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                    {suppliersCount}
                  </span>
                )}
              </button>

              {/* থার্মাল বারকোড ও প্রাইস ট্যাগ প্রিন্টার */}
              <button
                type="button"
                onClick={() => handleAction(onOpenBarcodeModal)}
                title="থার্মাল বারকোড স্টিকার ও প্রাইস ট্যাগ জেনারেটর"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <BarcodeIcon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>বারকোড স্টিকার</span>}
                </div>
              </button>

              {/* দোকানের দৈনন্দিন খরচের খাতা */}
              <button
                type="button"
                onClick={() => handleAction(onOpenExpensesModal)}
                title="দোকানের ভাড়া, বিল, স্টাফ বেতন ও অন্যান্য ব্যয়"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>দোকানের খরচের খাতা</span>}
                </div>
                {!isCollapsed && expensesCount > 0 && (
                  <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    {expensesCount}
                  </span>
                )}
              </button>

              {/* দৈনিক ক্যাশ ড্রয়ার ও EOD ক্লোজিং */}
              <button
                type="button"
                onClick={() => handleAction(onOpenCashRegisterModal)}
                title={isRegisterOpen ? 'ক্যাশ রেজিস্টার সক্রিয় রয়েছে - ড্রয়ার হিসাব ও ক্লোজিং' : 'দৈনিক ক্যাশ রেজিস্টার ক্লোজিং'}
                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  isRegisterOpen
                    ? 'bg-emerald-50/80 text-emerald-950 border border-emerald-200/80 hover:bg-emerald-100'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    isRegisterOpen ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <Coins className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>ক্যাশ ড্রয়ার (EOD)</span>}
                </div>
                <span
                  className={`${
                    isCollapsed
                      ? 'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ' + (isRegisterOpen ? 'bg-emerald-500' : 'bg-slate-300')
                      : 'px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ' + (isRegisterOpen ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-500')
                  }`}
                >
                  {isCollapsed ? '' : (isRegisterOpen ? 'খোলা' : 'বন্ধ')}
                </span>
              </button>

              {/* সিকিউরিটি ও সিস্টেম অডিট ট্রেইল */}
              <button
                type="button"
                onClick={() => handleAction(onOpenAuditLogsModal)}
                title="ইউজার অ্যাক্টিভিটি, স্টক ও বিক্রয় অডিট ট্রেইল"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>অডিট ট্রেইল</span>}
                </div>
              </button>

              {/* অসম্পূর্ণ কার্ট ও ড্রপ-অফ রিকভারি */}
              <button
                type="button"
                onClick={() => handleAction(onOpenAbandonedCartModal)}
                title={abandonedCartsCount > 0 ? `${abandonedCartsCount}টি অসম্পূর্ণ কার্ট পেন্ডিং আছে` : 'অসম্পূর্ণ কার্ট ও রিকভারি'}
                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  abandonedCartsCount > 0
                    ? 'bg-amber-50/80 text-amber-950 border border-amber-200/80 hover:bg-amber-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    abandonedCartsCount > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>অসম্পূর্ণ কার্ট</span>}
                </div>
                {abandonedCartsCount > 0 && (
                  <span
                    className={`${
                      isCollapsed
                        ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-600 text-white border-2 border-white'
                        : 'px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black shadow-2xs shrink-0'
                    }`}
                  >
                    {abandonedCartsCount}টি
                  </span>
                )}
              </button>

              {/* ব্যবহারকারী ও স্টাফ ব্যবস্থাপনা */}
              <button
                type="button"
                onClick={() => handleAction(onOpenUsersModal)}
                title="ব্যবহারকারী ও স্টাফ একাউন্ট ব্যবস্থাপনা"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <UserCog className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>ইউজার ও স্টাফ</span>}
                </div>
              </button>


              {/* কুপন তৈরি ও অফার ব্যবস্থাপনা */}
              <button
                type="button"
                onClick={() => handleAction(onOpenCouponModal)}
                title="পণ্যভিত্তিক ও সাধারণ কুপন কোড তৈরি ও অফার"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-950 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Ticket className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>কুপন জেনারেট ও অফার</span>}
                </div>
              </button>

              {/* ইনভয়েস অনুসন্ধান ও ট্র্যাক */}
              <button
                type="button"
                onClick={() => handleAction(onOpenInvoiceLookupModal)}
                title="ইনভয়েস নম্বর দিয়ে বিস্তারিত অনুসন্ধান ও ট্র্যাক"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Receipt className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>ইনভয়েস ট্র্যাক</span>}
                </div>
              </button>

            </div>
          </div>
        )}

        {/* সেকশন ৪: মোড সুইচিং */}
        <div>
          {!isCollapsed && (
            <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              মোড সুইচিং
            </p>
          )}
          <div className="space-y-1.5">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => handleAction(onSwitchToCustomerMode)}
                title="গ্রাহক স্টোর ভিউ দেখুন"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>গ্রাহক স্টোর ভিউ</span>}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAction(onOpenAuthModal)}
                title="এডমিন / স্টাফ প্যানেলে যান"
                className={`w-full flex items-center rounded-2xl text-xs font-bold text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/80 transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>এডমিন প্যানেলে যান</span>}
                </div>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ২. সাইডবার ফুটার: প্যানেল কলাপ্স বাটন (প্যানেল ছোট/বড় করার টগল) */}
      <div className="p-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center' : 'justify-between px-3'
          }`}
          title={isCollapsed ? 'সাইডবার প্যানেল বড় করুন' : 'সাইডবার প্যানেল সংকুচিত করুন'}
          aria-label="প্যানেল সাইজ টগল"
        >
          {!isCollapsed && (
            <span className="text-xs font-semibold text-slate-500">
              প্যানেল সংকুচিত করুন
            </span>
          )}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </aside>
  );
}
