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
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { isAdminUser } from '../utils/permissionUtils';

/**
 * আল্ট্রা-মডার্ন, ক্লিন ও প্রিমিয়াম সাইডবার ন্যাভিগেশন প্যানেল (Ultra-Modern SaaS Sidebar)
 * - কুইক ইনস্ট্যান্ট মেনু সার্চ ফিল্টার (Instant Search Bar)
 * - বর্ডারলেস স্লিক মিনিমাল মেনু আইটেম ডিজাইন (Linear / Stripe Style)
 * - ইউনিফাইড ও মার্জিত অ্যাকসেন্ট আইকন কালার হারমোনাইজেশন
 * - কোল্যাপ্সড মোডে ফ্লোয়েটিং প্রিভিউ কার্ড (Hover Flyout Cards)
 * - ১০০% মোবাইল ব্যাকড্রপ ও স্পর্শবান্ধব ড্রয়ার
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
  const isAdmin = isLoggedIn && isAdminUser(activeUser);

  // মেনু ইনস্ট্যান্ট সার্চ ফিল্টার স্টেট
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // ক্যাটাগরি ফোল্ডিং / অ্যাকর্ডিয়ন স্টেট
  const [openSections, setOpenSections] = useState(() => {
    const defaults = {
      sales: true,
      shop: true,
      godown: true,
      procurement: true,
      crm: true,
      finance: true,
      system: true
    };
    try {
      const saved = localStorage.getItem('inventory_sidebar_sections_v4') || localStorage.getItem('inventory_sidebar_sections_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          shop: parsed.shop ?? true,
          godown: parsed.godown ?? true
        };
      }
    } catch {}
    return defaults;
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem('inventory_sidebar_sections_v4', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // সব সেকশন এক ক্লিকে খোলা বা বন্ধ করার হ্যান্ডলার
  const handleToggleAllSections = () => {
    const allOpen = Object.values(openSections).every(Boolean);
    const updated = {
      sales: !allOpen,
      shop: !allOpen,
      godown: !allOpen,
      procurement: !allOpen,
      crm: !allOpen,
      finance: !allOpen,
      system: !allOpen
    };
    setOpenSections(updated);
    try {
      localStorage.setItem('inventory_sidebar_sections_v4', JSON.stringify(updated));
    } catch {}
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

  // ৭টি সুবিন্যস্ত ক্যাটাগরি ও তাদের অপশনসমূহ (মার্জিত সফট অ্যাকসেন্ট ও আইকন সহ)
  const menuCategories = useMemo(() => [
    {
      id: 'sales',
      title: 'বিক্রয় ও বিলিং',
      shortTitle: 'বিক্রয়',
      icon: ShoppingBag,
      themeColor: 'indigo',
      accentColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      dotColor: 'bg-indigo-600',
      hasAlert: pendingOrdersCount > 0 || returnsCount > 0,
      alertCount: pendingOrdersCount + returnsCount,
      items: [
        {
          id: 'pos_catalog',
          title: 'পণ্য ক্যাটালগ ও POS',
          subTitle: 'লাইভ বিক্রয় ও দ্রুত স্ক্যান',
          icon: LayoutGrid,
          iconBg: 'bg-indigo-50 text-indigo-700',
          isActive: currentView === 'pos',
          onClick: () => onNavigate && onNavigate('pos'),
          badge: null
        },
        {
          id: 'cart_view',
          title: 'শপিং কার্ট পেজ',
          subTitle: 'আইটেম তালিকা ও বিল প্রস্তুত',
          icon: ShoppingCart,
          iconBg: 'bg-emerald-50 text-emerald-700',
          isActive: currentView === 'cart' || currentView === 'checkout',
          onClick: () => onNavigate && onNavigate('cart'),
          badge: cartCount > 0 ? { text: `${cartCount}`, color: 'bg-indigo-600 text-white font-bold' } : null
        },
        {
          id: 'order_management',
          title: 'অর্ডার ম্যানেজমেন্ট',
          subTitle: 'কুরিয়ার ও অনলাইন ডেলিভারি',
          icon: Truck,
          iconBg: 'bg-amber-50 text-amber-700',
          isActive: currentView === 'orders',
          onClick: () => onNavigate && onNavigate('orders'),
          badge: pendingOrdersCount > 0 ? { text: `${pendingOrdersCount}টি বাকি`, color: 'bg-amber-500 text-white' } : null
        },
        {
          id: 'tailoring_orders',
          title: 'টেইলারিং ও সেলাই অর্ডার',
          subTitle: 'গ্রাহক মাপজোখ ও ডেলিভারি',
          icon: Scissors,
          iconBg: 'bg-purple-50 text-purple-700',
          isActive: currentView === 'tailoring',
          onClick: () => onNavigate ? onNavigate('tailoring') : onOpenTailoringModal && onOpenTailoringModal(),
          badge: tailoringOrdersCount > 0 ? { text: `${tailoringOrdersCount}টি রানিং`, color: 'bg-purple-600 text-white font-bold' } : null
        },
        {
          id: 'sales_returns',
          title: 'পণ্য রিটার্ন ও এক্সচেঞ্জ',
          subTitle: 'ফেরত ও ক্রেডিট ভাউচার',
          icon: RotateCcw,
          iconBg: 'bg-rose-50 text-rose-700',
          isActive: currentView === 'sales_returns',
          onClick: () => onNavigate ? onNavigate('sales_returns') : onOpenSalesReturnModal && onOpenSalesReturnModal(),
          badge: returnsCount > 0 ? { text: `${returnsCount}টি`, color: 'bg-rose-100 text-rose-800 border border-rose-200' } : null
        },
        {
          id: 'invoice_lookup',
          title: 'ইনভয়েস অনুসন্ধান',
          subTitle: 'মেমো অনুসন্ধান ও রি-প্রিন্ট',
          icon: Receipt,
          iconBg: 'bg-slate-100 text-slate-700',
          isActive: currentView === 'invoice_lookup',
          onClick: () => onNavigate ? onNavigate('invoice_lookup') : onOpenInvoiceLookupModal && onOpenInvoiceLookupModal(),
          badge: null
        }
      ]
    },
    {
      id: 'shop',
      title: 'দোকান স্টক ও পরিচালনা',
      shortTitle: 'দোকান',
      icon: Store,
      themeColor: 'emerald',
      accentColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      dotColor: 'bg-emerald-600',
      hasAlert: lowStockCount > 0 || transfersInTransitCount > 0,
      alertCount: lowStockCount + transfersInTransitCount,
      items: [
        {
          id: 'shop_stock',
          title: 'দোকানের বর্তমান মজুত',
          subTitle: 'দোকান ফ্লোর ও কাউন্টার মজুত',
          icon: Store,
          iconBg: 'bg-emerald-50 text-emerald-700',
          isActive: currentView === 'shop_stock',
          onClick: () => onNavigate ? onNavigate('shop_stock') : onOpenShopStockModal ? onOpenShopStockModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'shop_outflow',
          title: 'দোকান কমার খাতা',
          subTitle: 'বিক্রি ও সার্ভিসে কমার হিসাব',
          icon: TrendingDown,
          iconBg: 'bg-teal-50 text-teal-700',
          isActive: currentView === 'shop_outflow',
          onClick: () => onNavigate ? onNavigate('shop_outflow') : onOpenShopOutflowModal ? onOpenShopOutflowModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'shop_challans',
          title: 'দোকানে আসা চালান',
          subTitle: 'গোডাউন থেকে চালান বুঝে নেওয়া',
          icon: Truck,
          iconBg: 'bg-blue-50 text-blue-700',
          isActive: currentView === 'shop_challans',
          onClick: () => onNavigate ? onNavigate('shop_challans') : onOpenShopChallansModal ? onOpenShopChallansModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: transfersInTransitCount > 0 ? { text: `${transfersInTransitCount}টি পথে`, color: 'bg-blue-600 text-white font-bold' } : null
        },
        {
          id: 'fabric_wastage',
          title: 'কাপড়ের ছাঁট ও ড্যামেজ হিসাব',
          subTitle: 'থানের টুকরা ও ক্ষতি ট্র্যাকার',
          icon: Layers,
          iconBg: 'bg-pink-50 text-pink-700',
          isActive: currentView === 'fabric_wastage',
          onClick: () => onNavigate ? onNavigate('fabric_wastage') : onOpenFabricWastageModal && onOpenFabricWastageModal(),
          badge: null
        },
        {
          id: 'low_stock_alerts',
          title: 'দোকানের কম স্টক সতর্কতা',
          subTitle: 'জরুরি রি-অর্ডার ও রিস্টক প্রয়োজন',
          icon: AlertTriangle,
          iconBg: 'bg-rose-50 text-rose-700',
          isAlertItem: lowStockCount > 0,
          isActive: currentView === 'low_stock',
          onClick: () => onNavigate ? onNavigate('low_stock') : onOpenLowStockModal && onOpenLowStockModal(),
          badge: lowStockCount > 0 ? { text: `${lowStockCount}টি`, color: 'bg-rose-600 text-white font-black' } : null
        }
      ]
    },
    {
      id: 'godown',
      title: 'গোডাউন ও কেন্দ্রীয় মজুত',
      shortTitle: 'গোডাউন',
      icon: Warehouse,
      themeColor: 'amber',
      accentColor: 'text-amber-800 bg-amber-50 border-amber-200',
      dotColor: 'bg-amber-600',
      hasAlert: expiringProductsCount > 0 || godownLowStockCount > 0,
      alertCount: expiringProductsCount + godownLowStockCount,
      items: [
        {
          id: 'godown_stock',
          title: 'গোডাউন বর্তমান মজুত',
          subTitle: 'গোডাউন থান, গজ ও স্টক খতিয়ান',
          icon: Warehouse,
          iconBg: 'bg-amber-50 text-amber-800',
          isActive: currentView === 'godown_stock',
          onClick: () => onNavigate ? onNavigate('godown_stock') : onOpenGodownStockModal ? onOpenGodownStockModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'godown_low_stock',
          title: 'গোডাউন স্টক অ্যালার্ট',
          subTitle: 'গোডাউনে ঘাটতি ও কম স্টক সতর্কতা',
          icon: AlertTriangle,
          iconBg: 'bg-rose-50 text-rose-700',
          isAlertItem: godownLowStockCount > 0,
          isActive: currentView === 'godown_low_stock',
          onClick: () => onNavigate ? onNavigate('godown_low_stock') : onOpenGodownLowStockModal ? onOpenGodownLowStockModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: godownLowStockCount > 0 ? { text: `${godownLowStockCount}টি`, color: 'bg-rose-600 text-white font-black' } : null
        },
        {
          id: 'godown_outflow',
          title: 'গোডাউন কমার খাতা (ভ্যারিয়েন্ট)',
          subTitle: 'ভ্যারিয়েন্ট ভিত্তিক স্টক কমার তালিকা ও PDF',
          icon: TrendingDown,
          iconBg: 'bg-amber-50 text-amber-800',
          isActive: currentView === 'godown_outflow',
          onClick: () => onNavigate ? onNavigate('godown_outflow') : onOpenGodownOutflowModal ? onOpenGodownOutflowModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'godown_transfer',
          title: 'গোডাউন থেকে দোকান চালান',
          subTitle: 'দোকানে মালামাল পাঠানোর চালান তৈরি',
          icon: ArrowRightLeft,
          iconBg: 'bg-indigo-50 text-indigo-700',
          isActive: currentView === 'godown_transfer',
          onClick: () => onNavigate ? onNavigate('godown_transfer') : onOpenGodownTransferModal ? onOpenGodownTransferModal() : onOpenStockTransferModal && onOpenStockTransferModal(),
          badge: null
        },
        {
          id: 'add_product',
          title: 'নতুন পণ্য তৈরি',
          subTitle: 'সরাসরি গোডাউন স্টকে সংযোজন',
          icon: PackagePlus,
          iconBg: 'bg-slate-100 text-slate-800',
          isActive: currentView === 'add_product',
          onClick: () => onNavigate ? onNavigate('add_product') : onOpenProductModal && onOpenProductModal(),
          badge: null
        },
        {
          id: 'stock_restock',
          title: 'গোডাউন রিস্টক / লট বৃদ্ধি',
          subTitle: 'নতুন লট আগমন ও কেনা দাম বৃদ্ধি',
          icon: PlusCircle,
          iconBg: 'bg-teal-50 text-teal-800',
          isActive: currentView === 'stock_restock',
          onClick: () => onNavigate ? onNavigate('stock_restock') : onOpenStockModal && onOpenStockModal(),
          badge: null
        },
        {
          id: 'expiry_alerts',
          title: 'মেয়াদ সতর্কতা ও ব্যাচ',
          subTitle: 'মেয়াদোত্তীর্ণ ও আসন্ন তারিখ',
          icon: CalendarClock,
          iconBg: 'bg-rose-50 text-rose-700',
          isAlertItem: expiringProductsCount > 0,
          isActive: currentView === 'expiry_alerts',
          onClick: () => onNavigate ? onNavigate('expiry_alerts') : onOpenExpiryAlertModal && onOpenExpiryAlertModal(),
          badge: expiringProductsCount > 0 ? { text: `${expiringProductsCount}টি`, color: 'bg-rose-600 text-white font-bold' } : null
        },
        {
          id: 'barcode_print',
          title: 'বারকোড ও প্রাইস ট্যাগ',
          subTitle: 'থার্মাল স্টিকার প্রিন্টার',
          icon: BarcodeIcon,
          iconBg: 'bg-blue-50 text-blue-700',
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
      themeColor: 'blue',
      accentColor: 'text-blue-700 bg-blue-50 border-blue-200',
      dotColor: 'bg-blue-600',
      hasAlert: pendingPOCount > 0,
      alertCount: pendingPOCount,
      items: [
        {
          id: 'purchase_orders',
          title: 'পারচেজ অর্ডার (PO)',
          subTitle: 'স্টক ক্রয় ও চালান রিসিভ',
          icon: PackageCheck,
          iconBg: 'bg-blue-50 text-blue-700',
          isActive: currentView === 'purchase_orders',
          onClick: () => onNavigate ? onNavigate('purchase_orders') : onOpenPurchaseOrdersModal && onOpenPurchaseOrdersModal(),
          badge: pendingPOCount > 0 ? { text: `${pendingPOCount}টি বাকি`, color: 'bg-blue-600 text-white' } : null
        },
        {
          id: 'suppliers_list',
          title: 'সাপ্লায়ার ও ভেন্ডর খাতা',
          subTitle: 'মহাজন তালিকা ও দেনা লেজার',
          icon: Building2,
          iconBg: 'bg-slate-100 text-slate-700',
          isActive: currentView === 'suppliers',
          onClick: () => onNavigate ? onNavigate('suppliers') : onOpenSuppliersModal && onOpenSuppliersModal(),
          badge: suppliersCount > 0 ? { text: `${suppliersCount}`, color: 'bg-slate-200 text-slate-800 font-bold' } : null
        }
      ]
    },
    {
      id: 'crm',
      title: 'গ্রাহক ও রিলেশনশিপ',
      shortTitle: 'গ্রাহক',
      icon: Users,
      themeColor: 'purple',
      accentColor: 'text-purple-700 bg-purple-50 border-purple-200',
      dotColor: 'bg-purple-600',
      hasAlert: totalDueAmount > 0 || abandonedCartsCount > 0,
      alertCount: abandonedCartsCount,
      items: [
        {
          id: 'customers_db',
          title: 'গ্রাহক ডাটাবেস',
          subTitle: 'ক্রেতা তথ্য ও ক্রয়ের ইতিহাস',
          icon: Users,
          iconBg: 'bg-purple-50 text-purple-700',
          isActive: currentView === 'customers',
          onClick: () => onNavigate ? onNavigate('customers') : onOpenCustomersModal && onOpenCustomersModal(),
          badge: safeCustomers.length > 0 ? { text: `${safeCustomers.length}`, color: 'bg-slate-100 text-slate-700 font-bold' } : null
        },
        {
          id: 'rfm_campaigns',
          title: 'RFM ক্যাম্পেইন ও SMS',
          subTitle: 'টার্গেটেড রি-অ্যাক্টিভেশন',
          icon: Sparkles,
          iconBg: 'bg-pink-50 text-pink-700',
          isActive: currentView === 'rfm_campaigns',
          onClick: () => onNavigate ? onNavigate('rfm_campaigns') : onOpenRFMCampaignModal && onOpenRFMCampaignModal(),
          badge: { text: '✨ স্মার্ট AI', color: 'bg-pink-100 text-pink-900 border border-pink-200 font-bold' }
        },
        {
          id: 'customer_ledger',
          title: 'বাকির খাতা ও লেজার',
          subTitle: 'কাস্টমার বকেয়া আদায় ও হিসাব',
          icon: BookOpen,
          iconBg: 'bg-amber-50 text-amber-800',
          isAlertItem: totalDueAmount > 0,
          isActive: currentView === 'customer_ledger',
          onClick: () => onNavigate ? onNavigate('customer_ledger') : onOpenCustomerLedgerModal && onOpenCustomerLedgerModal(),
          badge: totalDueAmount > 0 ? { text: `${currencySymbol}${Math.round(totalDueAmount).toLocaleString('en-IN')}`, color: 'bg-amber-500 text-white font-bold' } : null
        },
        {
          id: 'coupons_offers',
          title: 'কুপন ও অফার ভাউচার',
          subTitle: 'ছাড় কোড ও প্রোমোশন তৈরি',
          icon: Ticket,
          iconBg: 'bg-orange-50 text-orange-700',
          isActive: currentView === 'coupons',
          onClick: () => onNavigate ? onNavigate('coupons') : onOpenCouponModal && onOpenCouponModal(),
          badge: null
        },
        {
          id: 'abandoned_carts',
          title: 'অসম্পূর্ণ কার্ট রিকভারি',
          subTitle: 'ড্রপ-অফ ক্রেতা রি-টার্গেটিং',
          icon: ShoppingBag,
          iconBg: 'bg-amber-50 text-amber-700',
          isActive: currentView === 'abandoned_carts',
          onClick: () => onNavigate ? onNavigate('abandoned_carts') : onOpenAbandonedCartModal && onOpenAbandonedCartModal(),
          badge: abandonedCartsCount > 0 ? { text: `${abandonedCartsCount}টি`, color: 'bg-amber-600 text-white font-bold' } : null
        },
        {
          id: 'held_carts',
          title: 'হোল্ডকৃত অর্ডার (Queue)',
          subTitle: 'কাউন্টার কিউ ও পার্কড কার্ট',
          icon: PauseCircle,
          iconBg: 'bg-slate-100 text-slate-700',
          isActive: false,
          onClick: () => onOpenHeldCartsModal && onOpenHeldCartsModal(),
          badge: heldCartsCount > 0 ? { text: `${heldCartsCount}টি`, color: 'bg-slate-200 text-slate-800 font-bold' } : null
        }
      ]
    },
    {
      id: 'finance',
      title: 'হিসাব ও ক্যাশ ড্রয়ার',
      shortTitle: 'হিসাব',
      icon: CircleDollarSign,
      themeColor: 'teal',
      accentColor: 'text-teal-800 bg-teal-50 border-teal-200',
      dotColor: 'bg-teal-600',
      hasAlert: false,
      items: [
        {
          id: 'pnl_analytics',
          title: 'লাভ-ক্ষতি ও অ্যানালিটিক্স',
          subTitle: 'আর্থিক P&L ও ডেড স্টক',
          icon: TrendingUp,
          iconBg: 'bg-blue-50 text-blue-700',
          isActive: currentView === 'analytics',
          onClick: () => onNavigate ? onNavigate('analytics') : onOpenAnalyticsModal && onOpenAnalyticsModal(),
          badge: !isAdminUser(activeUser)
            ? { text: '🔒 সুরক্ষিত', color: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' }
            : null
        },
        {
          id: 'cash_register',
          title: 'দৈনিক ক্যাশ ড্রয়ার (EOD)',
          subTitle: 'কাউন্টার ব্যালেন্স ও ক্লোজিং',
          icon: Coins,
          iconBg: 'bg-emerald-50 text-emerald-700',
          isActive: currentView === 'cash_register',
          onClick: () => onNavigate ? onNavigate('cash_register') : onOpenCashRegisterModal && onOpenCashRegisterModal(),
          badge: {
            text: isRegisterOpen ? '● খোলা' : 'বন্ধ',
            color: isRegisterOpen ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-100 text-slate-500'
          }
        },
        {
          id: 'store_expenses',
          title: 'দোকানের খরচের খাতা',
          subTitle: 'ভাড়া, বিদ্যুৎ ও স্টাফ খরচ',
          icon: Receipt,
          iconBg: 'bg-rose-50 text-rose-700',
          isActive: currentView === 'expenses',
          onClick: () => onNavigate ? onNavigate('expenses') : onOpenExpensesModal && onOpenExpensesModal(),
          badge: expensesCount > 0 ? { text: `${expensesCount}`, color: 'bg-rose-100 text-rose-800 border border-rose-200 font-bold' } : null
        },
        {
          id: 'audit_logs',
          title: 'সিকিউরিটি অডিট ট্রেইল',
          subTitle: 'ইউজার লগ ও নিরাপত্তা ট্র্যাক',
          icon: ShieldAlert,
          iconBg: 'bg-slate-100 text-slate-700',
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
      themeColor: 'slate',
      accentColor: 'text-slate-800 bg-slate-100 border-slate-200',
      dotColor: 'bg-slate-700',
      hasAlert: false,
      items: [
        {
          id: 'users_staff',
          title: 'ইউজার ও স্টাফ একাউন্ট',
          subTitle: 'রোল পারমিশন ও একাউন্টস',
          icon: UserCog,
          iconBg: 'bg-indigo-50 text-indigo-700',
          isActive: currentView === 'users',
          onClick: () => onNavigate ? onNavigate('users') : onOpenUsersModal && onOpenUsersModal(),
          badge: !isAdminUser(activeUser)
            ? { text: '🔒 অ্যাডমিন', color: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' }
            : null
        },
        {
          id: 'backup_restore',
          title: '১-ক্লিক ডাটা ব্যাকআপ ও এক্সেল',
          subTitle: 'সম্পূর্ণ ব্যাকআপ ও এক্সেল ডাউনলোড',
          icon: Database,
          iconBg: 'bg-emerald-50 text-emerald-700',
          isActive: currentView === 'backup',
          onClick: () => onOpenBackupModal && onOpenBackupModal(),
          badge: !isAdminUser(activeUser)
            ? { text: '🔒 সুরক্ষিত', color: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' }
            : { text: 'নতুন', color: 'bg-emerald-100 text-emerald-800 font-bold' }
        },
        {
          id: 'switch_to_customer',
          title: 'গ্রাহক স্টোর ভিউ দেখুন',
          subTitle: 'কাস্টমার ইন্টারফেস টেস্ট',
          icon: Store,
          iconBg: 'bg-teal-50 text-teal-700',
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
    currencySymbol,
    activeUser,
    onOpenBackupModal,
    onNavigate,
    onOpenStockTransferModal,
    onOpenShopStockModal,
    onOpenShopOutflowModal,
    onOpenShopChallansModal,
    onOpenGodownStockModal,
    onOpenGodownOutflowModal,
    onOpenGodownTransferModal,
    onOpenProductModal,
    onOpenStockModal,
    onOpenFabricWastageModal,
    onOpenBarcodeModal,
    onOpenExpiryAlertModal,
    onOpenLowStockModal,
    godownLowStockCount,
    onOpenGodownLowStockModal
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
        className={`bg-white/95 backdrop-blur-2xl border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 sticky top-16 h-[calc(100vh-4rem)] select-none shadow-[4px_0_24px_-4px_rgba(15,23,42,0.03)] ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        } ${isMobileOpen ? 'flex fixed inset-y-0 left-0 top-16 shadow-2xl z-40' : 'hidden md:flex'}`}
      >
        {/* ১. স্টোর ও ইউজার প্রোফাইল স্ট্রিপ (Header Strip) */}
        <div className="p-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
          {!isCollapsed ? (
            /* প্রসারিত অবস্থায় স্লিক ইউজার কার্ড */
            <div className="bg-white rounded-2xl p-2.5 shadow-2xs border border-slate-200/90 flex items-center justify-between transition-all">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-2xs">
                  {activeUser?.FullName ? activeUser.FullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-900 truncate block">
                    {activeUser?.FullName || 'অ্যাডমিনিস্ট্রেটর'}
                  </span>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                    <span className="truncate">{activeUser?.Role || 'Admin'} • {settings.StoreName || 'স্টোর'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {/* লাইভ সিঙ্ক ব্যাজ */}
                <div 
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
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
            <div className="flex flex-col items-center justify-center relative group py-1">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-2xs">
                  {activeUser?.FullName ? activeUser.FullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <span 
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    syncStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  title={syncStatus === 'online' ? 'অনলাইন সিঙ্ক' : 'অফলাইন'}
                />
              </div>

              {/* হোভার ফ্লাইআউট কার্ড */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 min-w-[180px] bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-800">
                <div className="font-bold text-xs">{activeUser?.FullName || 'অ্যাডমিনিস্ট্রেটর'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{activeUser?.Role || 'Admin'} • {settings.StoreName || 'স্টোর'}</div>
                <div className="text-[9px] text-emerald-400 font-bold mt-1.5 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{syncStatus === 'online' ? 'গুগল শিট সিঙ্ক চালু' : 'অফলাইন মোড'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ২. ইনস্ট্যান্ট মেনু সার্চ ফিল্টার (Quick Menu Search Bar) */}
        {!isCollapsed ? (
          <div className="px-3 pt-2.5 pb-1 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="মেনু খুঁজুন... (যেমন: চালান, গোডাউন)"
                className="w-full pl-8 pr-7 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
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
          /* কোল্যাপ্সড মোডে কুইক সার্চ আইকন বাটন */
          <div className="p-2 flex justify-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onToggleCollapse) onToggleCollapse();
                setTimeout(() => searchInputRef.current?.focus(), 200);
              }}
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
              title="মেনু সার্চ করুন (প্রসারিত করতে ক্লিক করুন)"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ৩. সাইডবার ন্যাভিগেশন লিংকসমূহ (স্ক্রোলেবল প্যানেল বডি) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-2 py-2 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
          
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
                    className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-lg transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${category.dotColor || 'bg-indigo-600'} shrink-0`} />
                      <span className="truncate text-slate-600 group-hover:text-slate-900 font-extrabold text-[11px] uppercase tracking-wider">
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
                  <div className="my-1.5 border-t border-slate-100 w-full" />
                )}

                {/* ক্যাটাগরির অন্তর্ভুক্ত মেনু বাটনসমূহ */}
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
                            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                              isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
                            } ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : item.isAlertItem
                                ? 'bg-rose-50 text-rose-900 hover:bg-rose-100'
                                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              {/* সফট অ্যাকসেন্ট আইকন কনটেইনার */}
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : item.isAlertItem
                                    ? 'bg-rose-100 text-rose-700'
                                    : item.iconBg || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <ItemIcon className="w-3.5 h-3.5" />
                              </div>

                              {!isCollapsed && (
                                <div className="text-left truncate">
                                  <span className={`block truncate text-xs leading-tight ${
                                    isActive ? 'text-white font-black' : 'text-slate-800 font-bold'
                                  }`}>
                                    {item.title}
                                  </span>
                                  {item.subTitle && (
                                    <span className={`block text-[10px] truncate mt-0.5 ${
                                      isActive ? 'text-indigo-100' : 'text-slate-400 font-normal'
                                    }`}>
                                      {item.subTitle}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* ব্যাজ ও কাউন্টার */}
                            {item.badge && !isCollapsed && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-transform ${
                                  isActive ? 'bg-white text-indigo-700' : item.badge.color
                                }`}
                              >
                                {item.badge.text}
                              </span>
                            )}

                            {/* কোল্যাপ্সড মোডে ছোট ব্যাজ ডট */}
                            {item.badge && isCollapsed && (
                              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                            )}
                          </button>

                          {/* কোল্যাপ্সড মোডে ফ্লোয়েটিং প্রিভিউ কার্ড (Hover Flyout Card) */}
                          {isCollapsed && (
                            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 min-w-[200px] bg-slate-900 text-white rounded-xl p-2.5 shadow-2xl border border-slate-800">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-white truncate block">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${item.badge.color}`}>
                                    {item.badge.text}
                                  </span>
                                )}
                              </div>
                              {item.subTitle && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {item.subTitle}
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

        {/* ৪. সাইডবার ফুটার: প্যানেল সংকুচিত / প্রসারিত টগল বাটন */}
        <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer ${
              isCollapsed ? 'justify-center' : 'justify-between px-2.5'
            }`}
            title={isCollapsed ? 'সাইডবার প্যানেল প্রসারিত করুন' : 'সাইডবার প্যানেল সংকুচিত করুন'}
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
