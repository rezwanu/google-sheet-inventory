import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  RefreshCw,
  Settings,
  Search,
  Plus,
  ShoppingCart,
  ChevronDown,
  LogOut,
  LogIn,
  PackageCheck,
  Store,
  LayoutGrid,
  Users,
  PauseCircle,
  Keyboard,
  Volume2,
  VolumeX,
  User,
  ShieldCheck,
  ShoppingBag,
  X,
  Receipt
} from 'lucide-react';
import StoreLogo from './StoreLogo';
import { formatImageUrl } from '../services/storage';

/**
 * Minimal Utilitarian Top Bar (Linear & Stripe Style)
 * - গ্লোবাল সার্চ বার (শর্টকাট হিন্ট '/')
 * - প্রাইমারি 'New Sale' CTA (#0F172A)
 * - সিঙ্ক স্ট্যাটাস, হোল্ড ও কার্ট ইন্ডিকেটর, কমপ্যাক্ট প্রোফাইল মেনু
 * - শূন্য গ্রেডিয়েন্ট, শূন্য , শূন্য ইমোজি
 */
export default function Navbar({
  settings = {},
  activeUser = null,
  syncStatus = 'offline',
  onSync,
  onOpenSettingsModal,
  onOpenUsersModal,
  onOpenAuthModal,
  onOpenCustomerOrdersModal,
  onSwitchToCustomerMode,
  onLogout,
  onNavigate,
  onToggleSidebar,
  lowStockCount = 0,
  cartCount = 0,
  heldCartsCount = 0,
  onOpenHeldCartsModal,
  onOpenShortcutsModal,
  isSoundActive = true,
  onToggleSound,
  currentView = 'overview',
  onOpenCartDrawer,
  products = [],
  salesHistory = [],
  onAddToCart,
  onOpenInvoiceLookup,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userMenuRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const globalSearchInputRef = useRef(null);

  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isCustomer = isLoggedIn && activeUser.Role === 'Customer';
  const isAdmin = isLoggedIn && ['Admin', 'Cashier', 'Manager', 'Salesman', 'Staff'].includes(activeUser.Role);
  const currencySymbol = settings?.CurrencySymbol || '৳';

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // গ্লোবাল সার্চ ম্যাচ (পণ্য ও ইনভয়েস)
  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return { products: [], sales: [] };

    const matchedProducts = (Array.isArray(products) ? products : [])
      .filter((p) => {
        const name = String(p.ProductName || '').toLowerCase();
        const sku = String(p.ProductID || '').toLowerCase();
        const barcode = String(p.Barcode || '').toLowerCase();
        return name.includes(q) || sku.includes(q) || barcode.includes(q);
      })
      .slice(0, 5);

    const matchedSales = (Array.isArray(salesHistory) ? salesHistory : [])
      .filter((s) => {
        const inv = String(s.invoiceNo || s.InvoiceNumber || s.id || '').toLowerCase();
        const cust = String(s.customerName || s.CustomerName || '').toLowerCase();
        return inv.includes(q) || cust.includes(q);
      })
      .slice(0, 3);

    return { products: matchedProducts, sales: matchedSales };
  }, [globalQuery, products, salesHistory]);

  const handleNewSale = () => {
    if (onNavigate) onNavigate('pos');
    setTimeout(() => {
      const posSearch = document.getElementById('pos-product-search-input');
      if (posSearch) {
        posSearch.focus();
        posSearch.select();
      }
    }, 60);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80 h-14">
      <div className="w-full px-3 sm:px-5 h-full flex items-center justify-between gap-2 sm:gap-4">
        {/* ১. বাম অংশ: সাইডবার টগল ও হোয়াইট-লেবেল ব্র্যান্ড */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          {isAdmin && onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="min-w-[44px] min-h-[44px] md:min-w-[34px] md:min-h-[34px] flex items-center justify-center rounded-md border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer relative"
              title="মেনু প্যানেল"
              aria-label="সাইডবার টগল"
            >
              <Menu className="w-4 h-4" />
              {lowStockCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B45309]" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate && onNavigate(isAdmin ? 'overview' : 'pos')}
            className="flex items-center gap-2 text-left cursor-pointer group min-w-0"
          >
            <StoreLogo
              url={settings?.LogoUrl || settings?.logoUrl}
              alt={settings?.StoreName || 'স্টোর'}
              className="w-8 h-8 object-contain rounded-md border border-neutral-200/80 p-0.5 bg-white shrink-0"
              fallbackClassName="w-8 h-8 rounded-md bg-[#0F172A] text-white flex items-center justify-center shrink-0"
              iconClassName="w-4 h-4"
            />
            <div className="min-w-0 hidden sm:block">
              <div className="text-sm font-semibold font-heading tracking-tight text-[#111111] truncate max-w-[160px] lg:max-w-[220px]">
                {settings?.StoreName || 'Enterprise POS'}
              </div>
              <div className="text-[10.5px] text-[#737373] truncate max-w-[160px] leading-none mt-0.5">
                {isAdmin ? (settings?.Address || 'Inventory & Billing') : 'Online Store'}
              </div>
            </div>
          </button>
        </div>

        {/* ২. মাঝের অংশ: গ্লোবাল সার্চ বার (shortcut hint /) */}
        <div ref={searchWrapperRef} className="relative flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-top-search-input"
              ref={globalSearchInputRef}
              type="text"
              value={globalQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                  e.currentTarget.blur();
                } else if (e.key === 'Enter' && searchResults.products.length > 0) {
                  const first = searchResults.products[0];
                  if (onAddToCart) onAddToCart(first);
                  setGlobalQuery('');
                  setIsSearchOpen(false);
                }
              }}
              placeholder="পণ্য, SKU, বারকোড বা ইনভয়েস খুঁজুন..."
              className="w-full h-9 pl-8 pr-10 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] transition-colors"
            />
            {globalQuery ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[#737373] bg-white border border-neutral-200 rounded-xs">
                /
              </kbd>
            )}
          </div>

          {/* গ্লোবাল সার্চ রেজাল্ট ড্রপডাউন */}
          {isSearchOpen && globalQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-neutral-200/80 rounded-md z-50 overflow-hidden divide-y divide-neutral-200/80">
              {searchResults.products.length === 0 && searchResults.sales.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#525252]">
                  "{globalQuery}" এর জন্য কোনো ফলাফল পাওয়া যায়নি
                </div>
              ) : (
                <>
                  {searchResults.products.length > 0 && (
                    <div className="p-1.5">
                      <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
                        Products
                      </div>
                      {searchResults.products.map((prod) => (
                        <button
                          key={prod.ProductID}
                          type="button"
                          onClick={() => {
                            if (onNavigate) onNavigate('pos');
                            if (onAddToCart) onAddToCart(prod);
                            setGlobalQuery('');
                            setIsSearchOpen(false);
                          }}
                          className="w-full px-2.5 py-2 rounded-sm hover:bg-neutral-100 flex items-center justify-between gap-2 text-left cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#111111] truncate">
                              {prod.ProductName}
                            </div>
                            <div className="text-[10.5px] font-mono tabular-nums text-[#737373]">
                              {prod.ProductID} {prod.Barcode ? `• #${prod.Barcode}` : ''} • স্টক: {prod.StockQuantity || 0}
                            </div>
                          </div>
                          <span className="text-xs font-mono tabular-nums font-semibold text-[#111111] shrink-0">
                            {currencySymbol}{Number(prod.SellingPrice || 0).toLocaleString('en-IN')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.sales.length > 0 && (
                    <div className="p-1.5">
                      <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
                        Invoices
                      </div>
                      {searchResults.sales.map((sale, idx) => (
                        <button
                          key={sale.invoiceNo || idx}
                          type="button"
                          onClick={() => {
                            if (onOpenInvoiceLookup) onOpenInvoiceLookup(sale.invoiceNo);
                            setGlobalQuery('');
                            setIsSearchOpen(false);
                          }}
                          className="w-full px-2.5 py-2 rounded-sm hover:bg-neutral-100 flex items-center justify-between gap-2 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Receipt className="w-3.5 h-3.5 text-[#525252] shrink-0" />
                            <span className="text-xs font-mono font-medium text-[#111111]">
                              {sale.invoiceNo}
                            </span>
                            <span className="text-xs text-[#525252] truncate">
                              {sale.customerName || 'Walk-in'}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums font-medium text-[#111111]">
                            {currencySymbol}{Number(sale.grandTotal || 0).toLocaleString('en-IN')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ৩. ডান অংশ: New Sale CTA, Sync Status, Cart ও Profile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Primary CTA: New Sale (Admin / Staff) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleNewSale}
              className="min-h-[44px] md:min-h-[34px] px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>
          )}

          {/* Sync Status */}
          {isAdmin && (
            <button
              type="button"
              onClick={onSync}
              title={`সিঙ্ক স্ট্যাটাস: ${syncStatus}`}
              className="min-h-[44px] md:min-h-[34px] px-2.5 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#525252] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0F172A]" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'online' ? 'bg-[#15803D]' : 'bg-[#B45309]'
                  }`}
                />
              )}
              <span className="hidden lg:inline">
                {syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'online' ? 'Synced' : 'Offline'}
              </span>
            </button>
          )}

          {/* Held Carts indicator */}
          {heldCartsCount > 0 && (
            <button
              type="button"
              onClick={onOpenHeldCartsModal}
              title={`হোল্ডকৃত কার্ট (${heldCartsCount})`}
              className="min-h-[44px] md:min-h-[34px] px-2.5 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-[#B45309] text-xs font-medium font-mono tabular-nums inline-flex items-center gap-1 cursor-pointer"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>{heldCartsCount}</span>
            </button>
          )}

          {/* Sound Toggle (Desktop) */}
          {isAdmin && onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              title={isSoundActive ? 'সাউন্ড চালু' : 'সাউন্ড বন্ধ'}
              className="hidden lg:inline-flex w-[34px] h-[34px] items-center justify-center rounded-md border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
            >
              {isSoundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Shortcuts Button (Desktop) */}
          {isAdmin && onOpenShortcutsModal && (
            <button
              type="button"
              onClick={onOpenShortcutsModal}
              title="কিবোর্ড শর্টকাট"
              className="hidden lg:inline-flex w-[34px] h-[34px] items-center justify-center rounded-md border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Cart Icon Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCartDrawer) onOpenCartDrawer();
              else if (onNavigate) onNavigate('cart');
            }}
            title={`শপিং কার্ট (${cartCount})`}
            className="min-w-[44px] min-h-[44px] md:min-w-[34px] md:min-h-[34px] px-2 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-[#111111] inline-flex items-center justify-center gap-1.5 relative cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-[#525252]" />
            {cartCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono tabular-nums font-semibold bg-[#0F172A] text-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* Compact Store / User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="min-h-[44px] md:min-h-[34px] px-2 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 inline-flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-sm overflow-hidden border border-neutral-200 bg-[#0F172A] text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {activeUser?.AvatarUrl ? (
                      <img
                        src={formatImageUrl(activeUser.AvatarUrl)}
                        alt={activeUser?.FullName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (activeUser?.FullName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden md:inline text-xs font-medium text-[#111111] max-w-[90px] truncate">
                    {activeUser?.FullName || 'User'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#737373]" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-neutral-200/80 rounded-md p-1.5 z-50">
                    <div className="px-2.5 py-2 border-b border-neutral-200/80 mb-1">
                      <div className="text-xs font-semibold text-[#111111] truncate">
                        {activeUser?.FullName || 'User'}
                      </div>
                      <div className="text-[11px] font-mono text-[#737373] truncate mt-0.5">
                        {activeUser?.Role} • {activeUser?.Phone || activeUser?.Email || 'Active'}
                      </div>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      {isCustomer ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onNavigate) onNavigate('pos');
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                          >
                            <LayoutGrid className="w-3.5 h-3.5 text-[#525252]" />
                            <span>পণ্য ক্যাটালগ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onOpenCustomerOrdersModal) onOpenCustomerOrdersModal();
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5 text-[#525252]" />
                            <span>আমার অর্ডারসমূহ</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onNavigate) onNavigate('settings');
                              else if (onOpenSettingsModal) onOpenSettingsModal();
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#525252]" />
                            <span>সেটিংস (White-Label)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onSwitchToCustomerMode) onSwitchToCustomerMode();
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-[#525252]" />
                            <span>গ্রাহক স্টোর ভিউ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onNavigate) onNavigate('users');
                              else if (onOpenUsersModal) onOpenUsersModal();
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-[#525252]" />
                            <span>ইউজার ও স্টাফ</span>
                          </button>
                        </>
                      )}

                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onOpenAuthModal) onOpenAuthModal();
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#525252]" />
                          <span>অ্যাডমিন / স্টাফ লগইন</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenAuthModal) onOpenAuthModal();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-neutral-100 text-[#111111] flex items-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5 text-[#525252]" />
                        <span>অ্যাকাউন্ট পরিবর্তন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-sm hover:bg-red-50 text-[#B91C1C] flex items-center gap-2 cursor-pointer border-t border-neutral-200/80 mt-1 pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#B91C1C]" />
                        <span>লগআউট</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="min-h-[44px] md:min-h-[34px] px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
