import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  RefreshCw,
  History,
  Settings,
  Wifi,
  WifiOff,
  User,
  ShoppingBag,
  ShieldCheck,
  ChevronDown,
  LogOut,
  LogIn,
  PackageCheck,
  Store,
  LayoutGrid,
  ShoppingCart,
  MapPin,
  Users,
  PauseCircle
} from 'lucide-react';
import StoreLogo from './StoreLogo';
import { formatImageUrl } from '../services/storage';

/**
 * প্রিমিয়াম ও আধুনিক টপবার (Modern SaaS Navbar)
 * স্টোর ব্র্যান্ডিং, লাইভ সিঙ্ক স্ট্যাটাস, মাল্টি-ভিউ নেভিগেশন, কার্ট ও ইউজার প্রোফাইল হাব
 */
export default function Navbar({
  settings = {},
  activeUser = null,
  syncStatus = 'offline',
  onSync,
  onOpenSettingsModal,
  onOpenHistoryModal,
  onOpenUsersModal,
  onOpenAuthModal,
  onOpenCustomerOrdersModal,
  onSwitchToCustomerMode,
  onLogout,
  onNavigate,
  onToggleSidebar,
  isSidebarCollapsed = false,
  lowStockCount = 0,
  cartCount = 0,
  heldCartsCount = 0,
  onOpenHeldCartsModal,
  currentView = 'pos',
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isCustomer = isLoggedIn && activeUser.Role === 'Customer';
  const isAdmin = isLoggedIn && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier' || activeUser.Role === 'Manager' || activeUser.Role === 'Salesman' || activeUser.Role === 'Staff');

  // ইউজার মেনুর বাইরে ক্লিক করলে ড্রপডাউন বন্ধ করা
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-2xs transition-all h-16 sm:h-[4.25rem] relative before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-pink-500">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
          
          {/* ================= ১. বাম অংশ: সাইডবার টগল বাটন, স্টোর ব্র্যান্ডিং ================= */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            
            {/* সাইডবার প্যানেল টগল বাটন (শুধুমাত্র এডমিনদের জন্য) */}
            {isAdmin && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 -ml-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 rounded-xl transition-all cursor-pointer relative shrink-0"
                title={isSidebarCollapsed ? "সাইডবার প্যানেল প্রসারিত করুন" : "সাইডবার প্যানেল সংকুচিত করুন"}
                aria-label="সাইডবার প্যানেল টগল"
              >
                <Menu className="w-5 h-5" />
                {/* নোটিফিকেশন ডট (কার্ট বা কম স্টক থাকলে) */}
                {(cartCount > 0 || lowStockCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white animate-pulse" />
                )}
              </button>
            )}

            {/* স্টোর ব্র্যান্ডিং (লোগো, নাম ও স্ট্যাটাস) */}
            <div 
              onClick={() => onNavigate && onNavigate('pos')}
              className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group select-none min-w-0"
              title="পণ্য ক্যাটালগে ফিরে যান"
            >
              <StoreLogo
                url={settings?.LogoUrl || settings?.logoUrl}
                alt={settings?.StoreName || 'স্টোর লোগো'}
                className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-2xl border border-slate-200/90 p-1 bg-white shadow-2xs group-hover:scale-105 transition-transform shrink-0"
                fallbackIcon={Store}
                fallbackClassName="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700 flex items-center justify-center text-white font-black shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-all shrink-0"
                iconClassName="w-5 h-5 sm:w-6 sm:h-6"
              />

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors truncate">
                    {settings?.StoreName || (isAdmin ? 'আমার ইনভেন্টরি ও POS' : 'অনলাইন স্টোর')}
                  </h1>
                  {isAdmin ? (
                    <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      👑 এডমিন
                    </span>
                  ) : isCustomer ? (
                    <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      🛍️ গ্রাহক
                    </span>
                  ) : null}
                </div>
                
                {settings?.Address ? (
                  <p className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-xs hidden sm:flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                    <span>{settings.Address}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
                    স্মার্ট ইনভেন্টরি ও সেলস ম্যানেজমেন্ট
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ================= ২. মাঝের অংশ: ক্যাটালগ ও কার্ট নেভিগেশন পিলস (Desktop) ================= */}
          <div className="hidden md:flex items-center bg-slate-100/80 border border-slate-200/90 p-1 rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('pos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'pos'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>পণ্য ক্যাটালগ</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('cart')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'cart' || currentView === 'checkout'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>শপিং কার্ট</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-600 text-white ml-0.5">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* ================= ৩. ডান অংশ: সিঙ্ক, হিস্ট্রি, সেটিংস, কার্ট ও প্রোফাইল ================= */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            
            {/* এডমিন মোডে: লাইভ সিঙ্ক, হিস্ট্রি ও সেটিংস */}
            {isAdmin && (
              <>
                {/* লাইভ সিঙ্ক বাটন */}
                <button
                  type="button"
                  onClick={onSync}
                  title={`সিঙ্ক স্ট্যাটাস: ${syncStatus} (ক্লিক করে ম্যানুয়ালি ক্লাউড ডাটা সিঙ্ক করুন)`}
                  className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 shadow-2xs ${
                    syncStatus === 'syncing'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : syncStatus === 'online'
                      ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200/90 text-emerald-700'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-200/90 text-amber-700'
                  }`}
                  aria-label="সিঙ্ক করুন"
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span className="hidden lg:inline text-xs font-bold">সিঙ্ক হচ্ছে...</span>
                    </>
                  ) : syncStatus === 'online' ? (
                    <>
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </div>
                      <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden lg:inline text-xs font-bold">অনলাইন সিঙ্ক</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden lg:inline text-xs font-bold">অফলাইন</span>
                    </>
                  )}
                </button>

                {/* হিস্ট্রি আইকন */}
                <button
                  type="button"
                  onClick={onOpenHistoryModal}
                  title="বিক্রয় হিস্ট্রি ও ইনভয়েস তালিকা"
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-2xs"
                  aria-label="বিক্রয় হিস্ট্রি"
                >
                  <History className="w-4 h-4" />
                </button>

                {/* সেটিংস আইকন (হোভার স্পিন এফেক্ট) */}
                <button
                  type="button"
                  onClick={onOpenSettingsModal}
                  title="সিস্টেম ও API সেটিংস"
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-2xs group"
                  aria-label="সেটিংস"
                >
                  <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </>
            )}

            {/* হোল্ডকৃত অর্ডার বাটন (হোল্ডে অর্ডার থাকলে হাইলাইট হবে) */}
            {heldCartsCount > 0 && (
              <button
                type="button"
                onClick={onOpenHeldCartsModal}
                title={`হোল্ডকৃত অর্ডার (${heldCartsCount}টি সংরক্ষিত)`}
                aria-label="হোল্ডকৃত অর্ডার তালিকা"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/25 flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer animate-in zoom-in-95"
              >
                <PauseCircle className="w-4 h-4 animate-pulse text-amber-100" />
                <span className="hidden sm:inline">হোল্ড ({heldCartsCount})</span>
                <span className="sm:hidden font-mono font-black">{heldCartsCount}</span>
              </button>
            )}

            {/* সর্বজনীন শপিং কার্ট বাটন (মোবাইল ও ট্যাবলেট সহ সবার জন্য) */}
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('cart')}
              title={`শপিং কার্ট (${cartCount}টি পণ্য)`}
              aria-label="শপিং কার্ট পেজে যান"
              className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer relative flex items-center justify-center ${
                currentView === 'cart' || currentView === 'checkout'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-600/30'
                  : cartCount > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {cartCount > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black border-2 border-white shadow-xs flex items-center justify-center animate-in zoom-in-75 ${
                    currentView === 'cart' || currentView === 'checkout'
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* ইউজার প্রোফাইল ও অথেনটিকেশন হাব */}
            <div className="relative pl-0.5" ref={userMenuRef}>
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center space-x-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                      isCustomer
                        ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                    title={`${activeUser?.FullName || 'প্রোফাইল'} (ক্লিক করে প্রোফাইল মেনু দেখুন)`}
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-200/90 shadow-2xs relative flex items-center justify-center bg-slate-100">
                      {activeUser?.AvatarUrl ? (
                        <img
                          src={formatImageUrl(activeUser.AvatarUrl)}
                          alt={activeUser?.FullName || 'User'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{ display: activeUser?.AvatarUrl ? 'none' : 'flex' }}
                        className={`w-full h-full items-center justify-center font-bold text-xs ${
                          isCustomer
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {isCustomer ? (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-bold leading-tight max-w-[100px] truncate">
                        {activeUser?.FullName || 'ইউজার'}
                      </div>
                    </div>

                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* ইউজার প্রোফাইল ড্রপডাউন মেনু */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {/* ইউজার কার্ড সারাংশ */}
                      <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl border border-slate-100 mb-2 flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm bg-white flex items-center justify-center relative">
                          {activeUser?.AvatarUrl ? (
                            <img
                              src={formatImageUrl(activeUser.AvatarUrl)}
                              alt={activeUser?.FullName || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            style={{ display: activeUser?.AvatarUrl ? 'none' : 'flex' }}
                            className={`w-full h-full items-center justify-center font-black text-sm text-white ${
                              isCustomer
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                : 'bg-gradient-to-br from-indigo-600 to-violet-700'
                            }`}
                          >
                            {(activeUser?.FullName || 'U').charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {activeUser?.FullName || 'ইউজার'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                            {activeUser?.Phone || activeUser?.Email || 'অ্যাকাউন্ট'}
                          </div>
                          <div className="mt-1 flex items-center space-x-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isCustomer
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : (activeUser?.Role === 'Salesman'
                                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                                      : 'bg-indigo-100 text-indigo-800 border-indigo-200')
                              }`}
                            >
                              {isCustomer
                                ? '🛍️ সম্মানিত গ্রাহক'
                                : (activeUser?.Role === 'Salesman'
                                    ? '💼 সেলসম্যান'
                                    : (activeUser?.Role === 'Cashier'
                                        ? '🧾 ক্যাশিয়ার'
                                        : (activeUser?.Role === 'Manager'
                                            ? '🛡️ ম্যানেজার'
                                            : '👑 এডমিন')))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ড্রপডাউন অপশনসমূহ */}
                      <div className="space-y-1 text-xs">
                        {/* গ্রাহক মেনু অপশন */}
                        {isCustomer && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                if (onNavigate) onNavigate('pos');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <LayoutGrid className="w-4 h-4 text-indigo-600" />
                              <span>পণ্য ক্যাটালগ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                if (onNavigate) onNavigate('cart');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="flex items-center space-x-2">
                                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                <span>শপিং কার্ট পেজ</span>
                              </div>
                              {cartCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                                  {cartCount}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                if (onOpenCustomerOrdersModal) onOpenCustomerOrdersModal();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <PackageCheck className="w-4 h-4 text-indigo-600" />
                              <span>আমার পূর্ববর্তী অর্ডারসমূহ</span>
                            </button>
                          </>
                        )}

                        {/* রোল সুইচিং বাটন */}
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                if (onSwitchToCustomerMode) onSwitchToCustomerMode();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <ShoppingBag className="w-4 h-4 text-emerald-600" />
                              <span>গ্রাহক স্টোর ভিউ দেখুন</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                if (onOpenUsersModal) onOpenUsersModal();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-900 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                            >
                              <Users className="w-4 h-4 text-indigo-600" />
                              <span>ইউজার ও স্টাফ ব্যবস্থাপনা</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onOpenAuthModal) onOpenAuthModal();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-800 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            <span>এডমিন / স্টাফ প্যানেলে যান</span>
                          </button>
                        )}

                        {/* অন্য অ্যাকাউন্টে পরিবর্তন / সুইচ */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onOpenAuthModal) onOpenAuthModal();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                        >
                          <LogIn className="w-4 h-4 text-slate-500" />
                          <span>অন্য অ্যাকাউন্টে লগইন</span>
                        </button>

                        {/* লগআউট */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onLogout) onLogout();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold flex items-center space-x-2 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-2"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>লগআউট করুন</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* লগআউট অবস্থায় আকর্ষণীয় সাইন-ইন / লগইন বাটন */
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  title="লগইন বা সাইন-আপ করুন"
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md shadow-indigo-600/20 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                  aria-label="লগইন"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">লগইন / সাইন-আপ</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
