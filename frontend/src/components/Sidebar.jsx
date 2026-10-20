import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  ShoppingCart,
  Truck,
  RotateCcw,
  Receipt,
  PackagePlus,
  PlusCircle,
  AlertTriangle,
  CalendarClock,
  ArrowRightLeft,
  Barcode as BarcodeIcon,
  PackageCheck,
  Building2,
  Users,
  Sparkles,
  BookOpen,
  Ticket,
  ShoppingBag,
  TrendingUp,
  Coins,
  ShieldAlert,
  UserCog,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Search,
  X,
  Store,
  Layers,
  CircleDollarSign,
  Package
} from 'lucide-react';

/**
 * আধুনিক ও সুসংগঠিত সাইডবার মেনু প্যানেল (Organized Enterprise Sidebar Navigation)
 * UX অনুযায়ী ৬টি সুস্পষ্ট ক্যাটাগরিতে বিভক্ত:
 * ১. বিক্রয় ও অর্ডার (Sales & POS)
 * ২. ইনভেন্টরি ও গোডাউন (Inventory & Stock)
 * ৩. সাপ্লায়ার ও প্রকিউরমেন্ট (Procurement & Vendors)
 * ৪. গ্রাহক ও রিলেশনশিপ (CRM & Campaigns)
 * ৫. হিসাব ও ক্যাশ ড্রয়ার (Finance & Accounts)
 * ৬. সিস্টেম ও স্টাফ (System & Settings)
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
  onOpenSalesReturnModal,
  onOpenStockTransferModal,
  returnsCount = 0,
  transfersInTransitCount = 0,
  isRegisterOpen = false,
  expensesCount = 0,
  onOpenStockModal,
  onOpenProductModal,
  onOpenAnalyticsModal,
  onOpenLowStockModal,
  onOpenExpiryAlertModal,
  expiringProductsCount = 0,
  onOpenCustomersModal,
  onOpenRFMCampaignModal,
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
  const isAdmin = isLoggedIn && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier');

  // কুইক সার্চ ফিল্টার স্টেট
  const [searchQuery, setSearchQuery] = useState('');

  // ক্যাটাগরি ফোল্ডিং / অ্যাকর্ডিয়ন স্টেট (লোকালস্টোরেজে সংরক্ষণ)
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('inventory_sidebar_sections');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      sales: true,
      inventory: true,
      procurement: true,
      crm: true,
      finance: true,
      system: true
    };
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem('inventory_sidebar_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // গ্রাহক বকেয়া সারাংশ হিসাব
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const totalDueAmount = safeCustomers.reduce((sum, c) => sum + (Number(c?.CurrentDue) || 0), 0);
  const dueCustomersCount = safeCustomers.filter((c) => (Number(c?.CurrentDue) || 0) > 0).length;

  const handleAction = (callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // সুবিন্যস্ত ৬টি ক্যাটাগরি কনফিগারেশন
  const menuCategories = useMemo(() => [
    {
      id: 'sales',
      title: 'বিক্রয় ও অর্ডার',
      shortTitle: 'বিক্রয়',
      icon: ShoppingBag,
      accentColor: 'indigo',
      hasAlert: pendingOrdersCount > 0 || returnsCount > 0,
      alertCount: pendingOrdersCount + returnsCount,
      items: [
        {
          id: 'pos_catalog',
          title: 'পণ্য ক্যাটালগ ও পিওএস',
          subTitle: 'লাইভ সেল ও স্ক্যানার',
          icon: LayoutGrid,
          iconBg: 'bg-indigo-50 text-indigo-600',
          activeBg: 'bg-indigo-600 text-white',
          isActive: currentView === 'pos',
          onClick: () => onNavigate && onNavigate('pos'),
          badge: null
        },
        {
          id: 'cart_view',
          title: 'শপিং কার্ট পেজ',
          subTitle: 'আইটেম তালিকা ও বিলিং',
          icon: ShoppingCart,
          iconBg: 'bg-emerald-50 text-emerald-600',
          activeBg: 'bg-indigo-600 text-white',
          isActive: currentView === 'cart' || currentView === 'checkout',
          onClick: () => onNavigate && onNavigate('cart'),
          badge: cartCount > 0 ? { text: `${cartCount}`, color: 'bg-indigo-600 text-white' } : null
        },
        {
          id: 'order_management',
          title: 'অর্ডার ম্যানেজমেন্ট',
          subTitle: 'অনলাইন ও কুরিয়ার পার্সেল',
          icon: Truck,
          iconBg: 'bg-amber-50 text-amber-600',
          activeBg: 'bg-indigo-600 text-white',
          isActive: currentView === 'orders',
          onClick: () => onNavigate && onNavigate('orders'),
          badge: pendingOrdersCount > 0 ? { text: `${pendingOrdersCount}টি পেন্ডিং`, color: 'bg-amber-500 text-white' } : null
        },
        {
          id: 'sales_returns',
          title: 'পণ্য বিক্রয় রিটার্ন',
          subTitle: 'ফেরত, বদল ও ক্রেডিট নোট',
          icon: RotateCcw,
          iconBg: 'bg-indigo-50 text-indigo-600',
          onClick: onOpenSalesReturnModal,
          badge: returnsCount > 0 ? { text: `${returnsCount}টি`, color: 'bg-indigo-100 text-indigo-700' } : null
        },
        {
          id: 'invoice_lookup',
          title: 'ইনভয়েস অনুসন্ধান',
          subTitle: 'মেমো ট্র্যাক ও রি-প্রিন্ট',
          icon: Receipt,
          iconBg: 'bg-slate-100 text-slate-700',
          onClick: onOpenInvoiceLookupModal,
          badge: null
        }
      ]
    },
    {
      id: 'inventory',
      title: 'ইনভেন্টরি ও গোডাউন',
      shortTitle: 'স্টক',
      icon: Layers,
      accentColor: 'emerald',
      hasAlert: lowStockCount > 0 || expiringProductsCount > 0 || transfersInTransitCount > 0,
      alertCount: lowStockCount + expiringProductsCount + transfersInTransitCount,
      items: [
        {
          id: 'add_product',
          title: 'নতুন পণ্য যোগ',
          subTitle: 'ক্যাটালগ এন্ট্রি ও ভ্যারিয়েন্ট',
          icon: PackagePlus,
          iconBg: 'bg-slate-900 text-white',
          onClick: onOpenProductModal,
          badge: null
        },
        {
          id: 'stock_restock',
          title: 'স্টক ইনপুট (রিস্টক)',
          subTitle: 'মজুত বৃদ্ধি ও দাম আপডেট',
          icon: PlusCircle,
          iconBg: 'bg-emerald-600 text-white',
          onClick: onOpenStockModal,
          badge: null
        },
        {
          id: 'low_stock_alerts',
          title: 'কম স্টক সতর্কতা',
          subTitle: 'রি-অর্ডার তালিকা',
          icon: AlertTriangle,
          iconBg: lowStockCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500',
          isAlertItem: lowStockCount > 0,
          onClick: onOpenLowStockModal,
          badge: lowStockCount > 0 ? { text: `${lowStockCount}টি`, color: 'bg-rose-600 text-white' } : null
        },
        {
          id: 'expiry_alerts',
          title: 'মেয়াদ সতর্কতা ও ব্যাচ',
          subTitle: 'এক্সপায়ারি ডেট ট্র্যাকিং',
          icon: CalendarClock,
          iconBg: expiringProductsCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500',
          isAlertItem: expiringProductsCount > 0,
          onClick: onOpenExpiryAlertModal,
          badge: expiringProductsCount > 0 ? { text: `${expiringProductsCount}টি`, color: 'bg-rose-600 text-white animate-pulse' } : null
        },
        {
          id: 'stock_transfers',
          title: 'গোডাউন চালান',
          subTitle: 'গোডাউন টু দোকান ট্রান্সফার',
          icon: ArrowRightLeft,
          iconBg: transfersInTransitCount > 0 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700',
          onClick: onOpenStockTransferModal,
          badge: transfersInTransitCount > 0 ? { text: `${transfersInTransitCount}টি পথে`, color: 'bg-emerald-600 text-white animate-pulse' } : null
        },
        {
          id: 'barcode_print',
          title: 'বারকোড ও প্রাইস ট্যাগ',
          subTitle: 'থার্মাল স্টিকার প্রিন্টার',
          icon: BarcodeIcon,
          iconBg: 'bg-indigo-100 text-indigo-700',
          onClick: onOpenBarcodeModal,
          badge: null
        }
      ]
    },
    {
      id: 'procurement',
      title: 'সাপ্লায়ার ও প্রকিউরমেন্ট',
      shortTitle: 'সাপ্লায়ার',
      icon: PackageCheck,
      accentColor: 'blue',
      hasAlert: pendingPOCount > 0,
      alertCount: pendingPOCount,
      items: [
        {
          id: 'purchase_orders',
          title: 'পারচেজ অর্ডার (PO)',
          subTitle: 'স্টক প্রকিউরমেন্ট অর্ডার',
          icon: PackageCheck,
          iconBg: pendingPOCount > 0 ? 'bg-amber-500 text-white' : 'bg-indigo-100 text-indigo-700',
          onClick: onOpenPurchaseOrdersModal,
          badge: pendingPOCount > 0 ? { text: `${pendingPOCount}টি অপেক্ষমান`, color: 'bg-amber-600 text-white' } : null
        },
        {
          id: 'suppliers_list',
          title: 'সাপ্লায়ার ও ভেন্ডর খাতা',
          subTitle: 'মহাজন তালিকা ও বাকির লেজার',
          icon: Building2,
          iconBg: 'bg-slate-100 text-slate-700',
          onClick: onOpenSuppliersModal,
          badge: suppliersCount > 0 ? { text: `${suppliersCount}`, color: 'bg-slate-100 text-slate-600' } : null
        }
      ]
    },
    {
      id: 'crm',
      title: 'গ্রাহক ও রিলেশনশিপ',
      shortTitle: 'গ্রাহক',
      icon: Users,
      accentColor: 'purple',
      hasAlert: totalDueAmount > 0 || abandonedCartsCount > 0,
      alertCount: abandonedCartsCount,
      items: [
        {
          id: 'customers_db',
          title: 'গ্রাহক ডাটাবেস',
          subTitle: 'কাস্টমার প্রোফাইল ও হিস্ট্রি',
          icon: Users,
          iconBg: 'bg-slate-100 text-slate-700',
          onClick: onOpenCustomersModal,
          badge: safeCustomers.length > 0 ? { text: `${safeCustomers.length}`, color: 'bg-slate-100 text-slate-600' } : null
        },
        {
          id: 'rfm_campaigns',
          title: 'RFM ক্যাম্পেইন ও SMS',
          subTitle: 'স্মার্ট সেগমেন্টেশন ও অফার',
          icon: Sparkles,
          iconBg: 'bg-purple-100 text-purple-700',
          onClick: onOpenRFMCampaignModal,
          badge: { text: 'স্মার্ট AI', color: 'bg-purple-100 text-purple-800 border border-purple-200' }
        },
        {
          id: 'customer_ledger',
          title: 'বাকির খাতা ও লেজার',
          subTitle: 'গ্রাহকের বকেয়া ও কালেকশন',
          icon: BookOpen,
          iconBg: totalDueAmount > 0 ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700',
          isAlertItem: totalDueAmount > 0,
          onClick: onOpenCustomerLedgerModal,
          badge: totalDueAmount > 0 ? { text: `${currencySymbol}${Math.round(totalDueAmount).toLocaleString('en-IN')}`, color: 'bg-amber-600 text-white' } : null
        },
        {
          id: 'coupons_offers',
          title: 'কুপন ও ডিসকাউন্ট অফার',
          subTitle: 'ছাড় ভাউচার তৈরি ও ম্যানেজ',
          icon: Ticket,
          iconBg: 'bg-orange-100 text-orange-600',
          onClick: onOpenCouponModal,
          badge: null
        },
        {
          id: 'abandoned_carts',
          title: 'অসম্পূর্ণ কার্ট রিকভারি',
          subTitle: 'ড্রপ-অফ ক্রেতা রি-টার্গেটিং',
          icon: ShoppingBag,
          iconBg: abandonedCartsCount > 0 ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700',
          onClick: onOpenAbandonedCartModal,
          badge: abandonedCartsCount > 0 ? { text: `${abandonedCartsCount}টি`, color: 'bg-amber-600 text-white' } : null
        }
      ]
    },
    {
      id: 'finance',
      title: 'হিসাব ও ক্যাশ ড্রয়ার',
      shortTitle: 'হিসাব',
      icon: CircleDollarSign,
      accentColor: 'rose',
      hasAlert: isRegisterOpen,
      items: [
        {
          id: 'pnl_analytics',
          title: 'লাভ-ক্ষতি ও অ্যানালিটিক্স',
          subTitle: 'আর্থিক বিবরণী ও ডেড স্টক',
          icon: TrendingUp,
          iconBg: 'bg-indigo-100 text-indigo-700',
          onClick: onOpenAnalyticsModal,
          badge: null
        },
        {
          id: 'cash_register',
          title: 'দৈনিক ক্যাশ ড্রয়ার (EOD)',
          subTitle: 'কাউন্টার ব্যালেন্স ও ক্লোজিং',
          icon: Coins,
          iconBg: isRegisterOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700',
          onClick: onOpenCashRegisterModal,
          badge: {
            text: isRegisterOpen ? 'সক্রিয় খোলা' : 'বন্ধ',
            color: isRegisterOpen ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
          }
        },
        {
          id: 'store_expenses',
          title: 'দোকানের খরচের খাতা',
          subTitle: 'ভাড়া, বিদ্যুৎ ও স্টাফ খরচ',
          icon: Receipt,
          iconBg: 'bg-rose-100 text-rose-700',
          onClick: onOpenExpensesModal,
          badge: expensesCount > 0 ? { text: `${expensesCount}`, color: 'bg-rose-50 text-rose-700 border border-rose-200' } : null
        },
        {
          id: 'audit_logs',
          title: 'সিকিউরিটি অডিট ট্রেইল',
          subTitle: 'ইউজার লগ ও নিরাপত্তা রেকর্ড',
          icon: ShieldAlert,
          iconBg: 'bg-slate-100 text-slate-700',
          onClick: onOpenAuditLogsModal,
          badge: null
        }
      ]
    },
    {
      id: 'system',
      title: 'সিস্টেম ও স্টাফ',
      shortTitle: 'সিস্টেম',
      icon: UserCog,
      accentColor: 'slate',
      hasAlert: false,
      items: [
        {
          id: 'users_staff',
          title: 'ইউজার ও স্টাফ একাউন্ট',
          subTitle: 'রোল পারমিশন ও একাউন্টস',
          icon: UserCog,
          iconBg: 'bg-indigo-100 text-indigo-700',
          onClick: onOpenUsersModal,
          badge: null
        },
        {
          id: 'switch_to_customer',
          title: 'গ্রাহক স্টোর ভিউ দেখুন',
          subTitle: 'কাস্টমার ইন্টারফেস টেস্ট',
          icon: Store,
          iconBg: 'bg-emerald-100 text-emerald-700',
          onClick: onSwitchToCustomerMode,
          badge: null
        }
      ]
    }
  ], [
    currentView,
    cartCount,
    pendingOrdersCount,
    returnsCount,
    lowStockCount,
    expiringProductsCount,
    transfersInTransitCount,
    pendingPOCount,
    suppliersCount,
    safeCustomers.length,
    totalDueAmount,
    abandonedCartsCount,
    isRegisterOpen,
    expensesCount,
    currencySymbol
  ]);

  // সার্চ কুয়েরি অনুযায়ী ফিল্টারকৃত মেনু আইটেম
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return menuCategories;
    const q = searchQuery.trim().toLowerCase();

    return menuCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (itm) =>
            itm.title.toLowerCase().includes(q) ||
            (itm.subTitle && itm.subTitle.toLowerCase().includes(q))
        )
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menuCategories, searchQuery]);

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 sticky top-16 h-[calc(100vh-4rem)] select-none shadow-xs ${
        isCollapsed ? 'w-18' : 'w-64 lg:w-70'
      } ${isMobileOpen ? 'flex fixed inset-y-0 left-0 top-16 shadow-2xl z-40' : 'hidden md:flex'}`}
    >
      {/* ১. সাইডবার ন্যাভিগেশন লিংকসমূহ (স্ক্রোলেবল প্যানেল বডি) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4 py-3.5 scrollbar-thin scrollbar-thumb-slate-200">
        
        {/* কুইক সার্চ ফিল্টার (শুধুমাত্র এক্সপান্ডেড ভিউতে) */}
        {!isCollapsed && (
          <div className="relative px-1">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="মেনু বা ফিচার খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-1.5 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* সার্চে কোনো আইটেম না পাওয়া গেলে */}
        {!isCollapsed && searchQuery && filteredCategories.length === 0 && (
          <div className="py-8 text-center text-slate-400 space-y-1">
            <p className="text-xs font-bold text-slate-600">কোনো মেনু পাওয়া যায়নি</p>
            <p className="text-[11px] text-slate-400">"{searchQuery}" দিয়ে কোনো অপশন মেলেনি</p>
          </div>
        )}

        {/* সুবিন্যস্ত ক্যাটাগরি তালিকা */}
        {filteredCategories.map((category, catIdx) => {
          const isSectionOpen = searchQuery ? true : (openSections[category.id] !== false);
          const CatIcon = category.icon;

          return (
            <div key={category.id} className="space-y-1">
              
              {/* ক্যাটাগরি হেডার (এক্সপান্ডেড মোডে অ্যাকর্ডিয়ন টগল) */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(category.id)}
                  title={`${category.title} সেকশন খুলুন/বন্ধ করুন`}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <CatIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>{category.title}</span>
                    
                    {/* ফোল্ড করা থাকলে সতর্কবার্তা ব্যাজ */}
                    {!isSectionOpen && category.hasAlert && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                  
                  <div className="text-slate-400 group-hover:text-slate-700 transition-transform">
                    {isSectionOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>
              ) : (
                /* কোল্যাপ্সড মোডে সূক্ষ্ম ক্যাটাগরি ডিভাইডার */
                catIdx > 0 && <div className="my-2 border-t border-slate-100 w-full" />
              )}

              {/* ক্যাটাগরির অন্তর্ভুক্ত বাটনসমূহ */}
              {(isCollapsed || isSectionOpen) && (
                <nav className="space-y-1 animate-in fade-in duration-150">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = Boolean(item.isActive);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAction(item.onClick)}
                        title={`${item.title}${item.subTitle ? ` - ${item.subTitle}` : ''}`}
                        className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer group relative ${
                          isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                        } ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : item.isAlertItem
                            ? 'bg-amber-50/70 text-amber-950 border border-amber-200/80 hover:bg-amber-100/80'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.iconBg
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                          </div>

                          {!isCollapsed && (
                            <div className="text-left truncate">
                              <span className="block truncate text-[12px] leading-tight">
                                {item.title}
                              </span>
                              {item.subTitle && !isActive && (
                                <span className="block text-[10px] font-normal text-slate-400 group-hover:text-slate-500 truncate">
                                  {item.subTitle}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ব্যাজ ও ইন্ডিকেটর */}
                        {item.badge && (
                          <span
                            className={`${
                              isCollapsed
                                ? 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black border-2 border-white ' +
                                  (item.badge.color || 'bg-indigo-600 text-white')
                                : 'px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ' +
                                  (isActive ? 'bg-white text-indigo-700' : item.badge.color)
                            }`}
                          >
                            {item.badge.text}
                          </span>
                        )}

                        {!isCollapsed && isActive && !item.badge && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              )}

            </div>
          );
        })}

      </div>

      {/* ২. সাইডবার ফুটার: প্যানেল কলাপ্স বাটন (প্যানেল ছোট/বড় করার টগল) */}
      <div className="p-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
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