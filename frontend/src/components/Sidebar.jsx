import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Store,
  Warehouse,
  TrendingDown,
  Layers,
  CircleDollarSign,
  Wifi,
  WifiOff,
  PauseCircle,
  Scissors,
  Database,
  Search,
  X,
  Calculator
} from 'lucide-react';
import { isAdminUser } from '../utils/permissionUtils';

/**
 * আল্ট্রা-মডার্ন, স্লিক ও প্রিমিয়াম সাইডবার ন্যাভিগেশন প্যানেল (Linear / Stripe Style SaaS Sidebar)
 * - ৫টি সুবিন্যস্ত ও যৌক্তিক মূল ক্যাটাগরি
 * - টপ পিনড কুইক কাউন্টার অ্যাকশন (POS, কার্ট, অর্ডার)
 * - সাবটাইটেল-মুক্ত সিঙ্গেল-লাইন মার্জিত লেআউট
 * - ইউনিফাইড মনোক্রোম অ্যাকসেন্ট ও হাইলাইট কালার
 * - কমপ্যাক্ট কোল্যাপ্সড মোড (64px) ও আধুনিক পিল টুলটিপ
 * - ইনস্ট্যান্ট কিবোর্ড সার্চ (Ctrl+K)
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
  godownLowStockCount = 0,
  customers = [],
  suppliersCount = 0,
  pendingPOCount = 0,
  abandonedCartsCount = 0,
  heldCartsCount = 0,
  onOpenAbandonedCartModal,
  onOpenHeldCartsModal,
  onOpenCustomerLedgerModal,
  onOpenSuppliersModal,
  onOpenPurchaseOrdersModal,
  onOpenBarcodeModal,
  onOpenExpensesModal,
  onOpenCashRegisterModal,
  onOpenAuditLogsModal,
  onOpenSalesReturnModal,
  onOpenStockTransferModal,
  onOpenShopStockModal,
  onOpenShopOutflowModal,
  onOpenShopChallansModal,
  onOpenGodownStockModal,
  onOpenGodownLowStockModal,
  onOpenGodownOutflowModal,
  onOpenGodownTransferModal,
  onOpenTailoringModal,
  tailoringOrdersCount = 0,
  onOpenFabricWastageModal,
  fabricWastageCount = 0,
  onOpenBackupModal,
  returnsCount = 0,
  onOpenCartDrawer,
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
  onOpenCalculator,
  onLogout,
  syncStatus = 'offline',
}) {
  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isAdmin = isLoggedIn && isAdminUser(activeUser);

  // মেনু ইনস্ট্যান্ট সার্চ ফিল্টার স্টেট
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // কিবোর্ড শর্টকাট (Ctrl+K বা Cmd+K দিয়ে দ্রুত সার্চ বক্সে ফোকাস)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed && onToggleCollapse) {
          onToggleCollapse();
        }
        setTimeout(() => searchInputRef.current?.focus(), 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, onToggleCollapse]);

  // ক্যাটাগরি ফোল্ডিং / অ্যাকর্ডিয়ন স্টেট (৫টি প্রধান গ্রুপ)
  const [openSections, setOpenSections] = useState(() => {
    const defaults = {
      sales: true,
      inventory: true,
      procurement: true,
      crm: true,
      finance: true
    };
    try {
      const saved = localStorage.getItem('inventory_sidebar_sections_v5');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch {}
    return defaults;
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem('inventory_sidebar_sections_v5', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // গ্রাহক বকেয়া সারাংশ হিসাব
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const totalDueAmount = safeCustomers.reduce((sum, c) => sum + (Number(c?.CurrentDue) || 0), 0);

  const handleAction = (callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // ৫টি সুবিন্যস্ত ও প্রিমিয়াম ক্যাটাগরি (Linear / Stripe Style)
  const menuCategories = useMemo(() => [
    {
      id: 'sales',
      title: '১. বিক্রয় ও কাউন্টার',
      shortTitle: 'বিক্রয়',
      icon: ShoppingBag,
      dotColor: 'bg-indigo-600',
      hasAlert: pendingOrdersCount > 0 || returnsCount > 0,
      alertCount: pendingOrdersCount + returnsCount,
      items: [
        {
          id: 'pos_catalog',
          title: 'পণ্য ক্যাটালগ ও POS',
          subTitle: 'লাইভ বিক্রয় ও দ্রুত স্ক্যান',
          icon: LayoutGrid,
          isActive: currentView === 'pos',
          onClick: () => onNavigate && onNavigate('pos'),
          badge: null
        },
        {
          id: 'cart_view',
          title: 'শপিং কার্ট পেজ',
          subTitle: 'আইটেম তালিকা ও বিল প্রস্তুত',
          icon: ShoppingCart,
          isActive: currentView === 'cart' || currentView === 'checkout',
          onClick: () => {
            if (onOpenCartDrawer) {
              onOpenCartDrawer();
            } else if (onNavigate) {
              onNavigate('cart');
            }
          },
          badge: cartCount > 0 ? { text: `${cartCount}`, color: 'bg-[#0da487] text-white font-bold' } : null
        },
        {
          id: 'order_management',
          title: 'অর্ডার ম্যানেজমেন্ট',
          subTitle: 'কুরিয়ার ও অনলাইন ডেলিভারি',
          icon: Truck,
          isActive: currentView === 'orders',
          onClick: () => onNavigate && onNavigate('orders'),
          badge: pendingOrdersCount > 0 ? { text: `${pendingOrdersCount}টি বাকি`, color: 'bg-amber-500 text-white' } : null
        },
        {
          id: 'tailoring_orders',
          title: 'টেইলারিং ও সেলাই অর্ডার',
          subTitle: 'গ্রাহক মাপজোখ ও ডেলিভারি',
          icon: Scissors,
          isActive: currentView === 'tailoring',
          onClick: () => onNavigate ? onNavigate('tailoring') : onOpenTailoringModal && onOpenTailoringModal(),
          badge: tailoringOrdersCount > 0 ? { text: `${tailoringOrdersCount}টি রানিং`, color: 'bg-purple-600 text-white font-bold' } : null
        },
        {
          id: 'sales_returns',
          title: 'পণ্য রিটার্ন ও এক্সচেঞ্জ',
          subTitle: 'ফেরত ও ক্রেডিট ভাউচার',
          icon: RotateCcw,
          isActive: currentView === 'sales_returns',
          onClick: () => onNavigate ? onNavigate('sales_returns') : onOpenSalesReturnModal && onOpenSalesReturnModal(),
          badge: returnsCount > 0 ? { text: `${returnsCount}টি`, color: 'bg-rose-100 text-rose-800 border border-rose-200' } : null
        },
        {
          id: 'invoice_lookup',
          title: 'ইনভয়েস অনুসন্ধান',
          subTitle: 'মেমো অনুসন্ধান ও রি-প্রিন্ট',
          icon: Receipt,
          isActive: currentView === 'invoice_lookup',
          onClick: () => onNavigate ? onNavigate('invoice_lookup') : onOpenInvoiceLookupModal && onOpenInvoiceLookupModal(),
          badge: null
        },
        {
          id: 'held_carts',
          title: 'হোল্ডকৃত অর্ডার (Queue)',
          subTitle: 'কাউন্টার কিউ ও পার্কড কার্ট',
          icon: PauseCircle,
          isActive: false,
          onClick: () => onOpenHeldCartsModal && onOpenHeldCartsModal(),
          badge: heldCartsCount > 0 ? { text: `${heldCartsCount}টি`, color: 'bg-slate-200 text-slate-800 font-bold' } : null
        }
      ]
    },
    {
      id: 'inventory',
      title: '২. ইনভেন্টরি ও স্টক হাব',
      shortTitle: 'স্টক',
      icon: Warehouse,
      dotColor: 'bg-emerald-600',
      hasAlert: lowStockCount > 0 || godownLowStockCount > 0 || expiringProductsCount > 0 || transfersInTransitCount > 0,
      alertCount: lowStockCount + godownLowStockCount + expiringProductsCount,
      items: [
        {
          id: 'shop_stock',
          title: 'দোকানের বর্তমান মজুত',
          subTitle: 'দোকান ফ্লোর ও কাউন্টার মজুত',
          icon: Store,
          isActive: currentView === 'shop_stock' || currentView === 'shop_challans' || currentView === 'shop_outflow',
          onClick: () => onNavigate ? onNavigate('shop_stock') : onOpenShopStockModal ? onOpenShopStockModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: transfersInTransitCount > 0 ? { text: `${transfersInTransitCount}টি চালান পথে`, color: 'bg-blue-600 text-white font-bold' } : null
        },
        {
          id: 'fabric_wastage',
          title: 'কাপড়ের ছাঁট ও ক্ষতি হিসাব',
          subTitle: 'থানের টুকরা ও অপচয় ট্র্যাকার',
          icon: Layers,
          isActive: currentView === 'fabric_wastage',
          onClick: () => onNavigate ? onNavigate('fabric_wastage') : onOpenFabricWastageModal && onOpenFabricWastageModal(),
          badge: null
        },
        {
          id: 'godown_stock',
          title: 'গোডাউন বর্তমান মজুত',
          subTitle: 'গোডাউন থান, গজ ও মূল স্টক',
          icon: Warehouse,
          isActive: currentView === 'godown_stock',
          onClick: () => onNavigate ? onNavigate('godown_stock') : onOpenGodownStockModal ? onOpenGodownStockModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'godown_transfer',
          title: 'গোডাউন থেকে দোকান চালান',
          subTitle: 'দোকানে মালামাল পাঠানোর চালান তৈরি',
          icon: ArrowRightLeft,
          isActive: currentView === 'godown_transfer',
          onClick: () => onNavigate ? onNavigate('godown_transfer') : onOpenGodownTransferModal ? onOpenGodownTransferModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'godown_outflow',
          title: 'গোডাউন কমার খাতা (ভ্যারিয়েন্ট)',
          subTitle: 'ভ্যারিয়েন্ট ভিত্তিক স্টক কমার তালিকা',
          icon: TrendingDown,
          isActive: currentView === 'godown_outflow',
          onClick: () => onNavigate ? onNavigate('godown_outflow') : onOpenGodownOutflowModal ? onOpenGodownOutflowModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'stock_restock',
          title: 'গোডাউন রিস্টক / লট বৃদ্ধি',
          subTitle: 'নতুন লট আগমন ও কেনা দাম বৃদ্ধি',
          icon: PlusCircle,
          isActive: currentView === 'stock_restock',
          onClick: () => onNavigate ? onNavigate('stock_restock') : onOpenStockModal && onOpenStockModal(),
          badge: null
        },
        {
          id: 'add_product',
          title: 'নতুন পণ্য তৈরি',
          subTitle: 'সরাসরি ডাটাবেসে পণ্য সংযোজন',
          icon: PackagePlus,
          isActive: currentView === 'add_product',
          onClick: () => onNavigate ? onNavigate('add_product') : onOpenProductModal && onOpenProductModal(),
          badge: null
        },
        {
          id: 'barcode_print',
          title: 'বারকোড ও প্রাইস ট্যাগ',
          subTitle: 'থার্মাল স্টিকার প্রিন্টার',
          icon: BarcodeIcon,
          isActive: currentView === 'barcode_print',
          onClick: () => onNavigate ? onNavigate('barcode_print') : onOpenBarcodeModal && onOpenBarcodeModal(),
          badge: null
        },
        {
          id: 'low_stock_alerts',
          title: 'দোকান কম স্টক সতর্কতা',
          subTitle: 'জরুরি রিস্টক ও রি-অর্ডার প্রয়োজন',
          icon: AlertTriangle,
          isAlertItem: lowStockCount > 0,
          isActive: currentView === 'low_stock',
          onClick: () => onNavigate ? onNavigate('low_stock') : onOpenLowStockModal && onOpenLowStockModal(),
          badge: lowStockCount > 0 ? { text: `${lowStockCount}টি`, color: 'bg-rose-600 text-white font-black' } : null
        },
        {
          id: 'godown_low_stock',
          title: 'গোডাউন স্টক অ্যালার্ট',
          subTitle: 'গোডাউনে ঘাটতি ও সতর্কতা',
          icon: AlertTriangle,
          isAlertItem: godownLowStockCount > 0,
          isActive: currentView === 'godown_low_stock',
          onClick: () => onNavigate ? onNavigate('godown_low_stock') : onOpenGodownLowStockModal ? onOpenGodownLowStockModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: godownLowStockCount > 0 ? { text: `${godownLowStockCount}টি`, color: 'bg-rose-600 text-white font-black' } : null
        },
        {
          id: 'expiry_alerts',
          title: 'মেয়াদ সতর্কতা ও ব্যাচ',
          subTitle: 'মেয়াদোত্তীর্ণ ও আসন্ন তারিখ',
          icon: CalendarClock,
          isAlertItem: expiringProductsCount > 0,
          isActive: currentView === 'expiry_alerts',
          onClick: () => onNavigate ? onNavigate('expiry_alerts') : onOpenExpiryAlertModal && onOpenExpiryAlertModal(),
          badge: expiringProductsCount > 0 ? { text: `${expiringProductsCount}টি`, color: 'bg-rose-600 text-white font-bold' } : null
        }
      ]
    },
    {
      id: 'procurement',
      title: '৩. মহাজন ও প্রকিউরমেন্ট',
      shortTitle: 'মহাজন',
      icon: PackageCheck,
      dotColor: 'bg-blue-600',
      hasAlert: pendingPOCount > 0,
      alertCount: pendingPOCount,
      items: [
        {
          id: 'purchase_orders',
          title: 'পারচেজ অর্ডার (PO)',
          subTitle: 'স্টক ক্রয় ও চালান রিসিভ',
          icon: PackageCheck,
          isActive: currentView === 'purchase_orders',
          onClick: () => onNavigate ? onNavigate('purchase_orders') : onOpenPurchaseOrdersModal && onOpenPurchaseOrdersModal(),
          badge: pendingPOCount > 0 ? { text: `${pendingPOCount}টি বাকি`, color: 'bg-blue-600 text-white font-bold' } : null
        },
        {
          id: 'suppliers_list',
          title: 'মহাজন ও সাপ্লায়ার খাতা',
          subTitle: 'সাপ্লায়ার তালিকা ও দেনা লেজার',
          icon: Building2,
          isActive: currentView === 'suppliers',
          onClick: () => onNavigate ? onNavigate('suppliers') : onOpenSuppliersModal && onOpenSuppliersModal(),
          badge: suppliersCount > 0 ? { text: `${suppliersCount}`, color: 'bg-slate-200 text-slate-800 font-bold' } : null
        }
      ]
    },
    {
      id: 'crm',
      title: '৪. গ্রাহক ও রিলেশনশিপ',
      shortTitle: 'গ্রাহক',
      icon: Users,
      dotColor: 'bg-purple-600',
      hasAlert: totalDueAmount > 0 || abandonedCartsCount > 0,
      alertCount: abandonedCartsCount,
      items: [
        {
          id: 'customer_ledger',
          title: 'বাকির খাতা ও লেজার',
          subTitle: 'কাস্টমার বকেয়া আদায় ও হিসাব',
          icon: BookOpen,
          isAlertItem: totalDueAmount > 0,
          isActive: currentView === 'customer_ledger',
          onClick: () => onNavigate ? onNavigate('customer_ledger') : onOpenCustomerLedgerModal && onOpenCustomerLedgerModal(),
          badge: totalDueAmount > 0 ? { text: `${currencySymbol}${Math.round(totalDueAmount).toLocaleString('en-IN')}`, color: 'bg-amber-500 text-white font-bold' } : null
        },
        {
          id: 'customers_db',
          title: 'গ্রাহক ডাটাবেস',
          subTitle: 'ক্রেতা তথ্য ও ক্রয়ের ইতিহাস',
          icon: Users,
          isActive: currentView === 'customers',
          onClick: () => onNavigate ? onNavigate('customers') : onOpenCustomersModal && onOpenCustomersModal(),
          badge: safeCustomers.length > 0 ? { text: `${safeCustomers.length}`, color: 'bg-slate-100 text-slate-700 font-bold' } : null
        },
        {
          id: 'rfm_campaigns',
          title: 'RFM ক্যাম্পেইন ও SMS',
          subTitle: 'টার্গেটেড রি-অ্যাক্টিভেশন',
          icon: Sparkles,
          isActive: currentView === 'rfm_campaigns',
          onClick: () => onNavigate ? onNavigate('rfm_campaigns') : onOpenRFMCampaignModal && onOpenRFMCampaignModal(),
          badge: { text: '✨ AI', color: 'bg-pink-100 text-pink-900 border border-pink-200 font-bold' }
        },
        {
          id: 'coupons_offers',
          title: 'কুপন ও অফার ভাউচার',
          subTitle: 'ছাড় কোড ও প্রোমোশন তৈরি',
          icon: Ticket,
          isActive: currentView === 'coupons',
          onClick: () => onNavigate ? onNavigate('coupons') : onOpenCouponModal && onOpenCouponModal(),
          badge: null
        },
        {
          id: 'abandoned_carts',
          title: 'অসম্পূর্ণ কার্ট রিকভারি',
          subTitle: 'ড্রপ-অফ ক্রেতা রি-টার্গেটিং',
          icon: ShoppingBag,
          isActive: currentView === 'abandoned_carts',
          onClick: () => onNavigate ? onNavigate('abandoned_carts') : onOpenAbandonedCartModal && onOpenAbandonedCartModal(),
          badge: abandonedCartsCount > 0 ? { text: `${abandonedCartsCount}টি`, color: 'bg-amber-600 text-white font-bold' } : null
        }
      ]
    },
    {
      id: 'finance',
      title: '৫. হিসাব, অডিট ও ব্যাক-অফিস',
      shortTitle: 'হিসাব',
      icon: CircleDollarSign,
      dotColor: 'bg-teal-600',
      hasAlert: false,
      items: [
        {
          id: 'cash_register',
          title: 'দৈনিক ক্যাশ ড্রয়ার (EOD)',
          subTitle: 'কাউন্টার ব্যালেন্স ও ক্লোজিং',
          icon: Coins,
          isActive: currentView === 'cash_register',
          onClick: () => onNavigate ? onNavigate('cash_register') : onOpenCashRegisterModal && onOpenCashRegisterModal(),
          badge: {
            text: isRegisterOpen ? '● খোলা' : 'বন্ধ',
            color: isRegisterOpen ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-100 text-slate-500 font-medium'
          }
        },
        {
          id: 'quick_calculator',
          title: 'কাটা কাপড় ক্যালকুলেটর',
          subTitle: 'গজ ও গিরা থেকে মোট মূল্য',
          icon: Scissors,
          onClick: () => onOpenCalculator && onOpenCalculator(),
          badge: { text: 'Alt+C', color: 'bg-emerald-100 text-emerald-800 font-mono font-bold' }
        },
        {
          id: 'pnl_analytics',
          title: 'লাভ-ক্ষতি ও P&L রিপোর্ট',
          subTitle: 'আর্থিক অ্যানালিটিক্স ও ডেড স্টক',
          icon: TrendingUp,
          isActive: currentView === 'analytics',
          onClick: () => onNavigate ? onNavigate('analytics') : onOpenAnalyticsModal && onOpenAnalyticsModal(),
          badge: !isAdmin
            ? { text: '🔒 অ্যাডমিন', color: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' }
            : null
        },
        {
          id: 'store_expenses',
          title: 'দোকানের খরচের খাতা',
          subTitle: 'ভাড়া, বিদ্যুৎ ও স্টাফ খরচ',
          icon: Receipt,
          isActive: currentView === 'expenses',
          onClick: () => onNavigate ? onNavigate('expenses') : onOpenExpensesModal && onOpenExpensesModal(),
          badge: expensesCount > 0 ? { text: `${expensesCount}`, color: 'bg-rose-100 text-rose-800 border border-rose-200 font-bold' } : null
        },
        {
          id: 'audit_logs',
          title: 'সিকিউরিটি অডিট ট্রেইল',
          subTitle: 'ইউজার লগ ও নিরাপত্তা ট্র্যাক',
          icon: ShieldAlert,
          isActive: currentView === 'audit_logs',
          onClick: () => onNavigate ? onNavigate('audit_logs') : onOpenAuditLogsModal && onOpenAuditLogsModal(),
          badge: null
        },
        {
          id: 'users_staff',
          title: 'ইউজার ও স্টাফ একাউন্ট',
          subTitle: 'রোল পারমিশন ও একাউন্টস',
          icon: UserCog,
          isActive: currentView === 'users',
          onClick: () => onNavigate ? onNavigate('users') : onOpenUsersModal && onOpenUsersModal(),
          badge: !isAdmin
            ? { text: '🔒 অ্যাডমিন', color: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' }
            : null
        },
        {
          id: 'backup_restore',
          title: '১-ক্লিক ডাটা ব্যাকআপ ও এক্সেল',
          subTitle: 'সম্পূর্ণ ব্যাকআপ ও এক্সেল ডাউনলোড',
          icon: Database,
          isActive: currentView === 'backup',
          onClick: () => onOpenBackupModal && onOpenBackupModal(),
          badge: !isAdmin
            ? { text: '🔒 সুরক্ষিত', color: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' }
            : { text: 'এক্সেল', color: 'bg-emerald-100 text-emerald-800 font-bold' }
        },
        {
          id: 'switch_to_customer',
          title: 'গ্রাহক স্টোর ভিউ দেখুন',
          subTitle: 'কাস্টমার ইন্টারফেস টেস্ট',
          icon: Store,
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
    godownLowStockCount,
    expiringProductsCount,
    transfersInTransitCount,
    pendingPOCount,
    suppliersCount,
    safeCustomers.length,
    totalDueAmount,
    abandonedCartsCount,
    heldCartsCount,
    isRegisterOpen,
    expensesCount,
    currencySymbol,
    isAdmin,
    onOpenBackupModal,
    onNavigate,
    onOpenStockTransferModal,
    onOpenShopStockModal,
    onOpenShopOutflowModal,
    onOpenShopChallansModal,
    onOpenGodownStockModal,
    onOpenGodownLowStockModal,
    onOpenGodownOutflowModal,
    onOpenGodownTransferModal,
    onOpenProductModal,
    onOpenStockModal,
    onOpenFabricWastageModal,
    onOpenBarcodeModal,
    onOpenExpiryAlertModal,
    onOpenLowStockModal,
    onOpenCustomersModal,
    onOpenCustomerLedgerModal,
    onOpenRFMCampaignModal,
    onOpenSuppliersModal,
    onOpenPurchaseOrdersModal,
    onOpenExpensesModal,
    onOpenCashRegisterModal,
    onOpenAuditLogsModal,
    onOpenSalesReturnModal,
    onOpenInvoiceLookupModal,
    onOpenHeldCartsModal,
    onOpenAbandonedCartModal,
    onOpenCouponModal,
    onOpenUsersModal,
    onOpenAnalyticsModal,
    onSwitchToCustomerMode,
    onOpenTailoringModal,
    tailoringOrdersCount
  ]);

  // ফিল্টার করা ক্যাটাগরি ও মেনু আইটেম (লাইভ সার্চ রেজাল্ট)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return menuCategories;
    const q = searchQuery.trim().toLowerCase();

    return menuCategories
      .map((cat) => {
        const matchingItems = cat.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.subTitle && item.subTitle.toLowerCase().includes(q))
        );
        return {
          ...cat,
          items: matchingItems
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [menuCategories, searchQuery]);

  const totalFilteredItems = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [filteredCategories]);

  return (
    <>
      {/* মোবাইল ব্যাকড্রপ ওভারলে (Mobile Backdrop Blur) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-35 bg-slate-950/60 backdrop-blur-xs transition-opacity md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-white/98 backdrop-blur-2xl border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 sticky top-16 h-[calc(100vh-4rem)] select-none shadow-[2px_0_16px_-4px_rgba(15,23,42,0.04)] ${
          isCollapsed ? 'w-16 lg:w-[68px]' : 'w-64 lg:w-72'
        } ${isMobileOpen ? 'flex fixed inset-y-0 left-0 top-16 shadow-2xl z-40' : 'hidden md:flex'}`}
      >
        {/* ১. স্টোর ও ইউজার প্রোফাইল স্ট্রিপ (Header Strip) */}
        <div className="p-2.5 border-b border-slate-100 shrink-0 bg-slate-50/60">
          {!isCollapsed ? (
            /* প্রসারিত অবস্থায় স্লিক ইউজার কার্ড */
            <div className="bg-white rounded-xl p-2 shadow-2xs border border-slate-200/90 flex items-center justify-between transition-all">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-2xs">
                  {activeUser?.FullName ? activeUser.FullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-900 truncate block leading-tight">
                    {activeUser?.FullName || 'অ্যাডমিনিস্ট্রেটর'}
                  </span>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                    <span className="truncate">{activeUser?.Role || 'Admin'} • {settings.StoreName || 'পাবনা বস্ত্রালয়'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {/* লাইভ সিঙ্ক ব্যাজ */}
                <div 
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    syncStatus === 'online' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}
                  title={syncStatus === 'online' ? 'গুগল শিট ক্লাউড সিঙ্ক সক্রিয়' : 'অফলাইন মোড'}
                >
                  {syncStatus === 'online' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                </div>

                {/* মোবাইল ক্লোজ বাটন */}
                {isMobileOpen && (
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="md:hidden p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="সাইডবার বন্ধ করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* সংকুচিত (Collapsed) মোডে মিনি অ্যাভাটার ও সিঙ্ক ডট */
            <div className="flex flex-col items-center justify-center relative group py-0.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-2xs">
                  {activeUser?.FullName ? activeUser.FullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <span 
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    syncStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  title={syncStatus === 'online' ? 'অনলাইন সিঙ্ক' : 'অফলাইন'}
                />
              </div>

              {/* হোভার স্লিক ফ্লাইআউট কার্ড */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 min-w-[160px] bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800">
                <div className="font-bold text-xs">{activeUser?.FullName || 'অ্যাডমিনিস্ট্রেটর'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{activeUser?.Role || 'Admin'} • {settings.StoreName || 'স্টোর'}</div>
                <div className="text-[9px] text-emerald-400 font-bold mt-1.5 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{syncStatus === 'online' ? 'ক্লাউড সিঙ্ক চালু' : 'অফলাইন'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ২. ইনস্ট্যান্ট মেনু সার্চ ফিল্টার (Quick Search Bar with Ctrl+K) */}
        {!isCollapsed ? (
          <div className="px-2.5 pt-2 pb-1 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="মেনু খুঁজুন... (Ctrl+K)"
                className="w-full pl-8 pr-7 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-700"
                  title="সার্চ মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="text-[10px] font-bold text-slate-500 mt-1 px-1 flex items-center justify-between">
                <span>সার্চ ফলাফল:</span>
                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-black">{totalFilteredItems}টি মেনু</span>
              </div>
            )}
          </div>
        ) : (
          /* কোল্যাপ্সড মোডে কুইক সার্চ ও ক্যালকুলেটর আইকন বাটন */
          <div className="p-1.5 flex flex-col items-center space-y-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onToggleCollapse) onToggleCollapse();
                setTimeout(() => searchInputRef.current?.focus(), 150);
              }}
              className="w-9 h-9 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
              title="মেনু সার্চ করুন (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenCalculator && onOpenCalculator()}
              className="w-9 h-9 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
              title="কাটা কাপড় গজ-গিরা ক্যালকুলেটর (Alt+C)"
            >
              <Scissors className="w-4 h-4 text-[#0da487]" />
            </button>
          </div>
        )}

        {/* ৩. শীর্ষ কুইক পিনড শর্টকাট (Quick Hot-Bar: POS, Cart, Orders, Calculator) */}
        {!isCollapsed && !searchQuery && (
          <div className="px-2 pt-1 pb-1 shrink-0">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => handleAction(() => onNavigate && onNavigate('pos'))}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-center transition-all cursor-pointer ${
                  currentView === 'pos'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
                title="পণ্য ক্যাটালগ ও লাইভ POS"
              >
                <LayoutGrid className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px] font-bold truncate w-full">POS</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => {
                  if (onOpenCartDrawer) {
                    onOpenCartDrawer();
                  } else if (onNavigate) {
                    onNavigate('cart');
                  }
                })}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-center transition-all cursor-pointer relative ${
                  currentView === 'cart' || currentView === 'checkout'
                    ? 'bg-[#0da487] text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
                title="শপিং কার্ট"
              >
                <ShoppingCart className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px] font-bold truncate w-full">কার্ট</span>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 right-0.5 px-1 py-0.2 rounded-full text-[8.5px] font-black bg-rose-500 text-white shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onNavigate && onNavigate('orders'))}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-center transition-all cursor-pointer relative ${
                  currentView === 'orders'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
                title="অর্ডার ও কুরিয়ার ডেলিভারি"
              >
                <Truck className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px] font-bold truncate w-full">অর্ডার</span>
                {pendingOrdersCount > 0 && (
                  <span className="absolute -top-0.5 right-0.5 px-1 py-0.2 rounded-full text-[8.5px] font-black bg-amber-500 text-white shadow-xs">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onOpenCalculator && onOpenCalculator())}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-center transition-all cursor-pointer text-slate-700 hover:bg-white hover:text-emerald-700 group"
                title="কাটা কাপড় গজ-গিরা ক্যালকুলেটর (Alt+C বা F6)"
              >
                <Scissors className="w-3.5 h-3.5 mb-0.5 text-[#0da487] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold truncate w-full">গজ হিসাব</span>
              </button>
            </div>
          </div>
        )}

        {/* ৪. সাইডবার ন্যাভিগেশন লিংকসমূহ (স্ক্রোলেবল প্যানেল বডি) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1.5 py-1.5 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
          
          {/* কোনো সার্চ ফলাফল না পাওয়া গেলে এম্পটি স্টেট */}
          {filteredCategories.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 space-y-1">
              <p className="font-bold text-slate-600">কোনো মেনু পাওয়া যায়নি!</p>
              <p className="text-[10px]">অন্য কোনো কি-ওয়ার্ড দিয়ে খুঁজুন</p>
            </div>
          )}

          {/* সুবিন্যস্ত ক্যাটাগরি ও মেনু আইটেম তালিকা */}
          {filteredCategories.map((category) => {
            const isSectionOpen = Boolean(openSections[category.id] !== false || searchQuery.trim().length > 0);

            return (
              <div key={category.id} className="space-y-0.5">
                
                {/* ক্যাটাগরি হেডার (বোল্ড টেক্সট ও সফট অ্যাকর্ডিয়ন অ্যারো) */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(category.id)}
                    title={`${category.title} সেকশন টগল করুন`}
                    className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 rounded-lg transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${category.dotColor || 'bg-indigo-600'} shrink-0`} />
                      <span className="truncate text-slate-500 group-hover:text-slate-800 font-extrabold text-[10.5px] uppercase tracking-wider">
                        {category.title}
                      </span>
                      
                      {category.hasAlert && typeof category.alertCount === 'number' && category.alertCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          {category.alertCount} সতর্কতা
                        </span>
                      )}
                    </div>
                    
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isSectionOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                ) : (
                  /* কোল্যাপ্সড মোডে ক্যাটাগরি ডিভাইডার */
                  <div className="my-1 border-t border-slate-100 w-full" />
                )}

                {/* ক্যাটাগরির অন্তর্ভুক্ত মেনু বাটনসমূহ (স্লিম সিঙ্গেল লাইন) */}
                {(isCollapsed || isSectionOpen) && (
                  <nav className="space-y-0.5 animate-in fade-in duration-150">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = Boolean(item.isActive);

                      return (
                        <div key={item.id} className="relative group">
                          <button
                            type="button"
                            onClick={() => handleAction(item.onClick)}
                            title={isCollapsed ? '' : `${item.title}${item.subTitle ? ` - ${item.subTitle}` : ''}`}
                            className={`w-full flex items-center rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                              isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
                            } ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : item.isAlertItem
                                ? 'bg-rose-50/90 text-rose-900 hover:bg-rose-100'
                                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 font-medium'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              {/* ইউনিফাইড স্লিম আইকন */}
                              <ItemIcon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isActive
                                    ? 'text-white'
                                    : item.isAlertItem
                                    ? 'text-rose-600'
                                    : 'text-slate-400 group-hover:text-indigo-600'
                                }`}
                              />

                              {!isCollapsed && (
                                <span className={`truncate text-xs ${
                                  isActive ? 'text-white font-bold' : 'text-slate-800 font-semibold'
                                }`}>
                                  {item.title}
                                </span>
                              )}
                            </div>

                            {/* ব্যাজ ও কাউন্টার */}
                            {item.badge && !isCollapsed && (
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-bold shrink-0 transition-transform ${
                                  isActive ? 'bg-white text-indigo-700' : item.badge.color
                                }`}
                              >
                                {item.badge.text}
                              </span>
                            )}

                            {/* কোল্যাপ্সড মোডে ছোট ব্যাজ ডট */}
                            {item.badge && isCollapsed && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                            )}
                          </button>

                          {/* কোল্যাপ্সড মোডে স্লিক ফ্লোয়েটিং পিল টুলটিপ */}
                          {isCollapsed && (
                            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 shadow-xl border border-slate-800 whitespace-nowrap flex items-center space-x-2">
                              <span className="text-xs font-bold">{item.title}</span>
                              {item.badge && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${item.badge.color}`}>
                                  {item.badge.text}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                )}

              </div>
            );
          })}

        </div>

        {/* ৫. সাইডবার ফুটার: প্যানেল সংকুচিত / প্রসারিত টগল বাটন */}
        <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer ${
              isCollapsed ? 'justify-center' : 'justify-between px-2.5'
            }`}
            title={isCollapsed ? 'সাইডবার প্যানেল প্রসারিত করুন' : 'সাইডবার প্যানেল সংকুচিত করুন (Ctrl+K দিয়ে খুঁজুন)'}
            aria-label="প্যানেল সাইজ টগল"
          >
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
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
    </>
  );
}
