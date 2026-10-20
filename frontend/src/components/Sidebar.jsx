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
  Search,
  X,
  Store,
  Layers,
  CircleDollarSign,
  Wifi,
  WifiOff,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

/**
 * আল্ট্রা-মডার্ন ও আই-ক্যাচি সাইডবার ন্যাভিগেশন প্যানেল (Ultra-Modern SaaS Sidebar)
 * গ্লাস মরফিজম, ভাইব্রেন্ট ডুয়াল-টোন আইকন, রিয়েল-টাইম পালস অ্যালার্ট ব্যাজ, 
 * ইন্টারেক্টিভ অ্যাকর্ডিয়ন এবং কুইক মেনু সার্চ সহ পেশাদার ডিজাইন।
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

  // ক্যাটাগরি ফোল্ডিং / অ্যাকর্ডিয়ন স্টেট (লোকালস্টোরেজে প্রিফারেন্স মনে রাখা)
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('inventory_sidebar_sections_v2');
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
        localStorage.setItem('inventory_sidebar_sections_v2', JSON.stringify(next));
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

  // প্রিমিয়াম কালার স্কিম ও আইকন সহ ৬টি সুবিন্যস্ত ক্যাটাগরি
  const menuCategories = useMemo(() => [
    {
      id: 'sales',
      title: 'বিক্রয় ও বিলিং',
      shortTitle: 'বিক্রয়',
      icon: ShoppingBag,
      accentBorder: 'border-indigo-500',
      tagColor: 'text-indigo-600 bg-indigo-50/80',
      hasAlert: pendingOrdersCount > 0 || returnsCount > 0,
      alertCount: pendingOrdersCount + returnsCount,
      items: [
        {
          id: 'pos_catalog',
          title: 'পণ্য ক্যাটালগ ও POS',
          subTitle: 'লাইভ বিক্রয় ও দ্রুত স্ক্যান',
          icon: LayoutGrid,
          iconGradient: 'from-blue-600 to-indigo-600 text-white shadow-indigo-500/25',
          isActive: currentView === 'pos',
          onClick: () => onNavigate && onNavigate('pos'),
          badge: null
        },
        {
          id: 'cart_view',
          title: 'শপিং কার্ট পেজ',
          subTitle: 'আইটেম তালিকা ও বিল প্রস্তুত',
          icon: ShoppingCart,
          iconGradient: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/25',
          isActive: currentView === 'cart' || currentView === 'checkout',
          onClick: () => onNavigate && onNavigate('cart'),
          badge: cartCount > 0 ? { text: `${cartCount}`, color: 'bg-indigo-600 text-white shadow-xs animate-bounce' } : null
        },
        {
          id: 'order_management',
          title: 'অর্ডার ম্যানেজমেন্ট',
          subTitle: 'কুরিয়ার ও অনলাইন ডেলিভারি',
          icon: Truck,
          iconGradient: 'from-amber-500 to-orange-600 text-white shadow-amber-500/25',
          isActive: currentView === 'orders',
          onClick: () => onNavigate && onNavigate('orders'),
          badge: pendingOrdersCount > 0 ? { text: `${pendingOrdersCount} অপেক্ষমান`, color: 'bg-amber-500 text-white shadow-xs' } : null
        },
        {
          id: 'sales_returns',
          title: 'পণ্য রিটার্ন ও এক্সচেঞ্জ',
          subTitle: 'ফেরত ও ক্রেডিট ভাউচার',
          icon: RotateCcw,
          iconGradient: 'from-violet-500 to-purple-600 text-white shadow-purple-500/25',
          isActive: currentView === 'sales_returns',
          onClick: () => onNavigate ? onNavigate('sales_returns') : onOpenSalesReturnModal && onOpenSalesReturnModal(),
          badge: returnsCount > 0 ? { text: `${returnsCount}টি`, color: 'bg-purple-100 text-purple-700 border border-purple-200' } : null
        },
        {
          id: 'invoice_lookup',
          title: 'ইনভয়েস অনুসন্ধান',
          subTitle: 'মেমো অনুসন্ধান ও রি-প্রিন্ট',
          icon: Receipt,
          iconGradient: 'from-slate-600 to-slate-800 text-white shadow-slate-500/25',
          isActive: currentView === 'invoice_lookup',
          onClick: () => onNavigate ? onNavigate('invoice_lookup') : onOpenInvoiceLookupModal && onOpenInvoiceLookupModal(),
          badge: null
        }
      ]
    },
    {
      id: 'inventory',
      title: 'ইনভেন্টরি ও গোডাউন',
      shortTitle: 'স্টক',
      icon: Layers,
      accentBorder: 'border-emerald-500',
      tagColor: 'text-emerald-600 bg-emerald-50/80',
      hasAlert: lowStockCount > 0 || expiringProductsCount > 0 || transfersInTransitCount > 0,
      alertCount: lowStockCount + expiringProductsCount + transfersInTransitCount,
      items: [
        {
          id: 'add_product',
          title: 'নতুন পণ্য তৈরি',
          subTitle: 'ক্যাটালগ এন্ট্রি ও ভ্যারিয়েন্ট',
          icon: PackagePlus,
          iconGradient: 'from-slate-800 to-slate-950 text-white shadow-slate-900/25',
          isActive: currentView === 'add_product',
          onClick: () => onNavigate ? onNavigate('add_product') : onOpenProductModal && onOpenProductModal(),
          badge: null
        },
        {
          id: 'stock_restock',
          title: 'স্টক ইনপুট (রিস্টক)',
          subTitle: 'মজুত সংখ্যা ও কেনা দাম বৃদ্ধি',
          icon: PlusCircle,
          iconGradient: 'from-emerald-500 to-green-600 text-white shadow-emerald-500/25',
          isActive: currentView === 'stock_restock',
          onClick: () => onNavigate ? onNavigate('stock_restock') : onOpenStockModal && onOpenStockModal(),
          badge: null
        },
        {
          id: 'low_stock_alerts',
          title: 'কম স্টক সতর্কতা',
          subTitle: 'জরুরি রিস্টক প্রয়োজন',
          icon: AlertTriangle,
          iconGradient: lowStockCount > 0 ? 'from-rose-500 to-red-600 text-white shadow-rose-500/30' : 'from-slate-400 to-slate-600 text-white',
          isAlertItem: lowStockCount > 0,
          isActive: currentView === 'low_stock',
          onClick: () => onNavigate ? onNavigate('low_stock') : onOpenLowStockModal && onOpenLowStockModal(),
          badge: lowStockCount > 0 ? { text: `${lowStockCount}টি`, color: 'bg-rose-600 text-white animate-pulse shadow-xs' } : null
        },
        {
          id: 'expiry_alerts',
          title: 'মেয়াদ সতর্কতা ও ব্যাচ',
          subTitle: 'মেয়াদোত্তীর্ণ ও আসন্ন তারিখ',
          icon: CalendarClock,
          iconGradient: expiringProductsCount > 0 ? 'from-rose-600 to-pink-600 text-white shadow-rose-600/30' : 'from-slate-400 to-slate-600 text-white',
          isAlertItem: expiringProductsCount > 0,
          isActive: currentView === 'expiry_alerts',
          onClick: () => onNavigate ? onNavigate('expiry_alerts') : onOpenExpiryAlertModal && onOpenExpiryAlertModal(),
          badge: expiringProductsCount > 0 ? { text: `${expiringProductsCount}টি`, color: 'bg-rose-600 text-white animate-pulse shadow-xs' } : null
        },
        {
          id: 'stock_transfers',
          title: 'গোডাউন চালান ট্রান্সফার',
          subTitle: 'গোডাউন টু দোকান চালান',
          icon: ArrowRightLeft,
          iconGradient: transfersInTransitCount > 0 ? 'from-teal-500 to-emerald-600 text-white shadow-teal-500/25' : 'from-slate-400 to-slate-600 text-white',
          isActive: currentView === 'stock_transfers',
          onClick: () => onNavigate ? onNavigate('stock_transfers') : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: transfersInTransitCount > 0 ? { text: `${transfersInTransitCount}টি পথে`, color: 'bg-teal-600 text-white animate-pulse shadow-xs' } : null
        },
        {
          id: 'barcode_print',
          title: 'বারকোড ও প্রাইস ট্যাগ',
          subTitle: 'থার্মাল স্টিকার প্রিন্টার',
          icon: BarcodeIcon,
          iconGradient: 'from-indigo-500 to-blue-600 text-white shadow-indigo-500/25',
          isActive: currentView === 'barcode_print',
          onClick: () => onNavigate ? onNavigate('barcode_print') : onOpenBarcodeModal && onOpenBarcodeModal(),
          badge: null
        }
      ]
    },
    {
      id: 'procurement',
      title: 'সাপ্লায়ার ও প্রকিউরমেন্ট',
      shortTitle: 'সাপ্লায়ার',
      icon: PackageCheck,
      accentBorder: 'border-blue-500',
      tagColor: 'text-blue-600 bg-blue-50/80',
      hasAlert: pendingPOCount > 0,
      alertCount: pendingPOCount,
      items: [
        {
          id: 'purchase_orders',
          title: 'পারচেজ অর্ডার (PO)',
          subTitle: 'স্টক ক্রয় ও চালান রিসিভ',
          icon: PackageCheck,
          iconGradient: pendingPOCount > 0 ? 'from-amber-500 to-orange-600 text-white shadow-amber-500/25' : 'from-blue-500 to-indigo-600 text-white shadow-blue-500/25',
          isActive: currentView === 'purchase_orders',
          onClick: () => onNavigate ? onNavigate('purchase_orders') : onOpenPurchaseOrdersModal && onOpenPurchaseOrdersModal(),
          badge: pendingPOCount > 0 ? { text: `${pendingPOCount}টি অপেক্ষমান`, color: 'bg-amber-600 text-white shadow-xs' } : null
        },
        {
          id: 'suppliers_list',
          title: 'সাপ্লায়ার ও ভেন্ডর খাতা',
          subTitle: 'মহাজন তালিকা ও দেনা লেজার',
          icon: Building2,
          iconGradient: 'from-slate-600 to-slate-800 text-white shadow-slate-600/25',
          isActive: currentView === 'suppliers',
          onClick: () => onNavigate ? onNavigate('suppliers') : onOpenSuppliersModal && onOpenSuppliersModal(),
          badge: suppliersCount > 0 ? { text: `${suppliersCount}`, color: 'bg-slate-100 text-slate-700 font-bold' } : null
        }
      ]
    },
    {
      id: 'crm',
      title: 'গ্রাহক ও রিলেশনশিপ',
      shortTitle: 'গ্রাহক',
      icon: Users,
      accentBorder: 'border-purple-500',
      tagColor: 'text-purple-600 bg-purple-50/80',
      hasAlert: totalDueAmount > 0 || abandonedCartsCount > 0,
      alertCount: abandonedCartsCount,
      items: [
        {
          id: 'customers_db',
          title: 'গ্রাহক ডাটাবেস',
          subTitle: 'ক্রেতা তথ্য ও ক্রয়ের ইতিহাস',
          icon: Users,
          iconGradient: 'from-slate-600 to-indigo-700 text-white shadow-slate-600/25',
          isActive: currentView === 'customers',
          onClick: () => onNavigate ? onNavigate('customers') : onOpenCustomersModal && onOpenCustomersModal(),
          badge: safeCustomers.length > 0 ? { text: `${safeCustomers.length}`, color: 'bg-slate-100 text-slate-700' } : null
        },
        {
          id: 'rfm_campaigns',
          title: 'RFM ক্যাম্পেইন ও SMS',
          subTitle: 'টার্গেটেড রি-অ্যাক্টিভেশন',
          icon: Sparkles,
          iconGradient: 'from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-purple-500/30',
          isActive: currentView === 'rfm_campaigns',
          onClick: () => onNavigate ? onNavigate('rfm_campaigns') : onOpenRFMCampaignModal && onOpenRFMCampaignModal(),
          badge: { text: '✨ স্মার্ট AI', color: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border border-purple-200 shadow-2xs font-bold' }
        },
        {
          id: 'customer_ledger',
          title: 'বাকির খাতা ও লেজার',
          subTitle: 'কাস্টমার বকেয়া আদায় ও হিসাব',
          icon: BookOpen,
          iconGradient: totalDueAmount > 0 ? 'from-amber-500 to-orange-600 text-white shadow-amber-500/30' : 'from-amber-400 to-amber-600 text-white',
          isAlertItem: totalDueAmount > 0,
          isActive: currentView === 'customer_ledger',
          onClick: () => onNavigate ? onNavigate('customer_ledger') : onOpenCustomerLedgerModal && onOpenCustomerLedgerModal(),
          badge: totalDueAmount > 0 ? { text: `${currencySymbol}${Math.round(totalDueAmount).toLocaleString('en-IN')}`, color: 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs' } : null
        },
        {
          id: 'coupons_offers',
          title: 'কুপন ও অফার ভাউচার',
          subTitle: 'ছাড় কোড ও প্রোমোশন তৈরি',
          icon: Ticket,
          iconGradient: 'from-orange-400 to-amber-600 text-white shadow-orange-500/25',
          isActive: currentView === 'coupons',
          onClick: () => onNavigate ? onNavigate('coupons') : onOpenCouponModal && onOpenCouponModal(),
          badge: null
        },
        {
          id: 'abandoned_carts',
          title: 'অসম্পূর্ণ কার্ট রিকভারি',
          subTitle: 'ড্রপ-অফ ক্রেতা রি-টার্গেটিং',
          icon: ShoppingBag,
          iconGradient: abandonedCartsCount > 0 ? 'from-amber-500 to-rose-500 text-white shadow-amber-500/25' : 'from-slate-400 to-slate-600 text-white',
          isActive: currentView === 'abandoned_carts',
          onClick: () => onNavigate ? onNavigate('abandoned_carts') : onOpenAbandonedCartModal && onOpenAbandonedCartModal(),
          badge: abandonedCartsCount > 0 ? { text: `${abandonedCartsCount}টি`, color: 'bg-amber-600 text-white shadow-xs' } : null
        }
      ]
    },
    {
      id: 'finance',
      title: 'হিসাব ও ক্যাশ ড্রয়ার',
      shortTitle: 'হিসাব',
      icon: CircleDollarSign,
      accentBorder: 'border-rose-500',
      tagColor: 'text-rose-600 bg-rose-50/80',
      hasAlert: isRegisterOpen,
      items: [
        {
          id: 'pnl_analytics',
          title: 'লাভ-ক্ষতি ও অ্যানালিটিক্স',
          subTitle: 'আর্থিক P&L ও ডেড স্টক',
          icon: TrendingUp,
          iconGradient: 'from-blue-600 to-indigo-700 text-white shadow-indigo-600/25',
          isActive: currentView === 'analytics',
          onClick: () => onNavigate ? onNavigate('analytics') : onOpenAnalyticsModal && onOpenAnalyticsModal(),
          badge: null
        },
        {
          id: 'cash_register',
          title: 'দৈনিক ক্যাশ ড্রয়ার (EOD)',
          subTitle: 'কাউন্টার ব্যালেন্স ও ক্লোজিং',
          icon: Coins,
          iconGradient: isRegisterOpen ? 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/30' : 'from-slate-400 to-slate-600 text-white',
          isActive: currentView === 'cash_register',
          onClick: () => onNavigate ? onNavigate('cash_register') : onOpenCashRegisterModal && onOpenCashRegisterModal(),
          badge: {
            text: isRegisterOpen ? '● খোলা' : 'বন্ধ',
            color: isRegisterOpen ? 'bg-emerald-500 text-white shadow-xs font-black ring-2 ring-emerald-200' : 'bg-slate-100 text-slate-500'
          }
        },
        {
          id: 'store_expenses',
          title: 'দোকানের খরচের খাতা',
          subTitle: 'ভাড়া, বিদ্যুৎ ও স্টাফ খরচ',
          icon: Receipt,
          iconGradient: 'from-rose-500 to-pink-600 text-white shadow-rose-500/25',
          isActive: currentView === 'expenses',
          onClick: () => onNavigate ? onNavigate('expenses') : onOpenExpensesModal && onOpenExpensesModal(),
          badge: expensesCount > 0 ? { text: `${expensesCount}`, color: 'bg-rose-50 text-rose-700 border border-rose-200' } : null
        },
        {
          id: 'audit_logs',
          title: 'সিকিউরিটি অডিট ট্রেইল',
          subTitle: 'ইউজার লগ ও নিরাপত্তা ট্র্যাক',
          icon: ShieldAlert,
          iconGradient: 'from-slate-700 to-slate-900 text-white shadow-slate-700/25',
          isActive: currentView === 'audit_logs',
          onClick: () => onNavigate ? onNavigate('audit_logs') : onOpenAuditLogsModal && onOpenAuditLogsModal(),
          badge: null
        }
      ]
    },
    {
      id: 'system',
      title: 'সিস্টেম ও স্টাফ',
      shortTitle: 'সিস্টেম',
      icon: UserCog,
      accentBorder: 'border-slate-500',
      tagColor: 'text-slate-600 bg-slate-100',
      hasAlert: false,
      items: [
        {
          id: 'users_staff',
          title: 'ইউজার ও স্টাফ একাউন্ট',
          subTitle: 'রোল পারমিশন ও একাউন্টস',
          icon: UserCog,
          iconGradient: 'from-indigo-600 to-slate-800 text-white shadow-indigo-600/25',
          isActive: currentView === 'users',
          onClick: () => onNavigate ? onNavigate('users') : onOpenUsersModal && onOpenUsersModal(),
          badge: null
        },
        {
          id: 'switch_to_customer',
          title: 'গ্রাহক স্টোর ভিউ দেখুন',
          subTitle: 'কাস্টমার ইন্টারফেস টেস্ট',
          icon: Store,
          iconGradient: 'from-teal-500 to-emerald-600 text-white shadow-teal-500/25',
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
      className={`bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 sticky top-16 h-[calc(100vh-4rem)] select-none shadow-[4px_0_24px_-4px_rgba(15,23,42,0.04)] ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      } ${isMobileOpen ? 'flex fixed inset-y-0 left-0 top-16 shadow-2xl z-40' : 'hidden md:flex'}`}
    >
      {/* ১. স্টোর ব্র্যাঞ্চ ও ইউজার স্ট্যাটাস স্ট্রিপ (Expanded Mode) */}
      {!isCollapsed && (
        <div className="px-3.5 pt-3.5 pb-2">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-2.5 text-white shadow-md shadow-indigo-950/20 border border-indigo-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-inner">
                {activeUser?.FullName ? activeUser.FullName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xs tracking-tight text-white truncate block">
                    {activeUser?.FullName || 'অ্যাডমিনিস্ট্রেটর'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-indigo-200/80 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">{activeUser?.Role || 'Admin'} • {settings.StoreName || 'স্টোর'}</span>
                </div>
              </div>
            </div>

            {/* লাইভ সিঙ্ক স্ট্যাটাস ব্যাজ */}
            <div 
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                syncStatus === 'online' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
              title={syncStatus === 'online' ? 'গুগল শিট ক্লাউড সিঙ্ক সক্রিয়' : 'অফলাইন মোড'}
            >
              {syncStatus === 'online' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
      )}

      {/* ২. কুইক সার্চ ফিল্টার (শুধুমাত্র এক্সপান্ডেড ভিউতে) */}
      {!isCollapsed && (
        <div className="px-3.5 pt-1 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="মেনু খুঁজুন... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-slate-100/90 focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="সার্চ মুছুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ৩. সাইডবার ন্যাভিগেশন লিংকসমূহ (স্ক্রোলেবল প্যানেল বডি) */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-3.5 py-2 scrollbar-thin scrollbar-thumb-slate-200/80 hover:scrollbar-thumb-slate-300">
        
        {/* সার্চে কোনো আইটেম না পাওয়া গেলে */}
        {!isCollapsed && searchQuery && filteredCategories.length === 0 && (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold text-slate-700">কোনো মেনু খুঁজে পাওয়া যায়নি</p>
            <p className="text-[11px] text-slate-400">"{searchQuery}" দিয়ে কোনো অপশন মেলেনি</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              সার্চ ফিল্টার মুছুন
            </button>
          </div>
        )}

        {/* সুবিন্যস্ত ক্যাটাগরি তালিকা */}
        {filteredCategories.map((category, catIdx) => {
          const isSectionOpen = searchQuery ? true : (openSections[category.id] !== false);
          const CatIcon = category.icon;

          return (
            <div key={category.id} className="space-y-1">
              
              {/* ক্যাটাগরি হেডার (এক্সপান্ডেড মোডে মডার্ন অ্যাকর্ডিয়ন টগল) */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(category.id)}
                  title={`${category.title} সেকশন টগল করুন`}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors shrink-0" />
                    <span className="truncate">{category.title}</span>
                    
                    {/* ফোল্ড করা থাকলে সতর্কবার্তা ব্যাজ */}
                    {!isSectionOpen && category.hasAlert && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-2xs">
                        {category.alertCount}টি সতর্কতা
                      </span>
                    )}
                  </div>
                  
                  <div className="text-slate-400 group-hover:text-slate-700 transition-transform duration-200">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSectionOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </div>
                </button>
              ) : (
                /* কোল্যাপ্সড মোডে সূক্ষ্ম ক্যাটাগরি ডিভাইডার */
                catIdx > 0 && <div className="my-2 border-t border-slate-100 w-full" />
              )}

              {/* ক্যাটাগরির অন্তর্ভুক্ত বাটনসমূহ */}
              {(isCollapsed || isSectionOpen) && (
                <nav className="space-y-1 animate-in fade-in duration-200">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = Boolean(item.isActive);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAction(item.onClick)}
                        title={`${item.title}${item.subTitle ? ` - ${item.subTitle}` : ''}`}
                        className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer group relative ${
                          isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                        } ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-500'
                            : item.isAlertItem
                            ? 'bg-amber-50/80 text-amber-950 border border-amber-200 hover:bg-amber-100 hover:shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-950 hover:translate-x-0.5'
                        }`}
                      >
                        {/* বাম পাশের গ্লোয়িং অ্যাক্টিভ ইন্ডিকেটর বার */}
                        {isActive && !isCollapsed && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white shadow-sm" />
                        )}

                        <div className="flex items-center space-x-2.5 min-w-0">
                          {/* আইকনের ভাইব্রেন্ট ডুয়াল-টোন ব্যাকগ্রাউন্ড */}
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm group-hover:scale-105 ${
                              isActive
                                ? 'bg-white/20 text-white shadow-inner'
                                : `bg-gradient-to-br ${item.iconGradient || 'from-slate-700 to-slate-900 text-white'}`
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                          </div>

                          {!isCollapsed && (
                            <div className="text-left truncate">
                              <span className="block truncate text-[12.5px] leading-tight font-extrabold tracking-tight">
                                {item.title}
                              </span>
                              {item.subTitle && !isActive && (
                                <span className="block text-[10px] font-medium text-slate-400 group-hover:text-slate-600 truncate mt-0.5">
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
                                : 'px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-transform group-hover:scale-105 ' +
                                  (isActive ? 'bg-white text-indigo-800 shadow-xs' : item.badge.color)
                            }`}
                          >
                            {item.badge.text}
                          </span>
                        )}

                        {!isCollapsed && isActive && !item.badge && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-xs" />
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

      {/* ৪. সাইডবার ফুটার: প্যানেল কলাপ্স বাটন (প্যানেল ছোট/বড় করার টগল) */}
      <div className="p-2 border-t border-slate-200/70 bg-gradient-to-b from-white to-slate-50 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center' : 'justify-between px-3'
          }`}
          title={isCollapsed ? 'সাইডবার প্যানেল প্রসারিত করুন' : 'সাইডবার প্যানেল সংকুচিত করুন'}
          aria-label="প্যানেল সাইজ টগল"
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-slate-600">
                সাইডবার সংকুচিত করুন
              </span>
            </div>
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