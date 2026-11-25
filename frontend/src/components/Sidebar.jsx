import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  LayoutGrid,
  ShoppingCart,
  Truck,
  RotateCcw,
  Receipt,
  PackagePlus,
  PlusCircle,
  AlertTriangle,
  CalendarClock,
  Barcode as BarcodeIcon,
  PackageCheck,
  Building2,
  Users,
  BarChart3,
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
  Layers,
  PauseCircle,
  Scissors,
  Database,
  Search,
  X,
  Landmark,
  Settings,
  Boxes,
  Lock
} from 'lucide-react';
import { isAdminUser } from '../utils/permissionUtils';
import StoreLogo from './StoreLogo';

/**
 * Utilitarian Minimalism Collapsible Left Sidebar
 * - কোর ৬টি এন্টারপ্রাইজ ভিউ শীর্ষে পিন করা (Overview, POS Terminal, Inventory, Invoices/Sales, Customers, Settings)
 * - সেকেন্ডারি মডিউলগুলো কল্যাপ্সিবল গ্রুপে সাজানো যাতে কোনো বিদ্যমান ফিচার বাদ না যায়
 * - শূন্য গ্রেডিয়েন্ট, শূন্য ইমোজি, শূন্য backdrop-blur, শূন্য ভারী শ্যাডো
 * - মোবাইল ও ট্যাবলেটে স্মুথ স্লাইড-আউট ড্রয়ার
 */
export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  settings = {},
  activeUser = null,
  currentView = 'overview',
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
  onOpenGodownStockModal,
  onOpenGodownLowStockModal,
  onOpenTailoringModal,
  tailoringOrdersCount = 0,
  onOpenFabricWastageModal,
  onOpenBackupModal,
  returnsCount = 0,
  onOpenCartDrawer,
  transfersInTransitCount = 0,
  isRegisterOpen = false,
  expensesCount = 0,
  onOpenBankModal,
  totalBankBalance = 0,
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
  onOpenSettingsModal,
  onSwitchToCustomerMode,
  onOpenCalculator,
  syncStatus = 'offline',
}) {
  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isAdmin = isLoggedIn && isAdminUser(activeUser);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Ctrl+K / Cmd+K দিয়ে সাইডবার কুইক ফিল্টার
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed && onToggleCollapse) {
          onToggleCollapse();
        }
        setTimeout(() => searchInputRef.current?.focus(), 120);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, onToggleCollapse]);

  const [openSections, setOpenSections] = useState(() => {
    const defaults = {
      salesOps: false,
      inventoryOps: true,
      procurement: false,
      crm: false,
      finance: false
    };
    try {
      const saved = localStorage.getItem('inventory_sidebar_sections_v6');
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
        localStorage.setItem('inventory_sidebar_sections_v6', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  // ১. কোর প্রাইমারি নেভিগেশন (Top 6 Core Views)
  const coreItems = useMemo(() => [
    {
      id: 'overview',
      title: 'Overview',
      icon: LayoutDashboard,
      isActive: currentView === 'overview',
      onClick: () => onNavigate && onNavigate('overview'),
      badge: null,
    },
    {
      id: 'pos_terminal',
      title: 'POS Terminal',
      icon: LayoutGrid,
      isActive: currentView === 'pos' || currentView === 'cart' || currentView === 'checkout',
      onClick: () => onNavigate && onNavigate('pos'),
      badge: cartCount > 0 ? { text: String(cartCount), variant: 'accent' } : null,
    },
    {
      id: 'inventory_hub',
      title: 'Inventory',
      icon: Boxes,
      isActive: currentView === 'inventory',
      onClick: () => onNavigate && onNavigate('inventory'),
      badge: lowStockCount > 0 ? { text: String(lowStockCount), variant: 'warning' } : null,
    },
    {
      id: 'invoices_sales',
      title: 'Invoices / Sales',
      icon: Receipt,
      isActive: currentView === 'orders' || currentView === 'invoice_lookup',
      onClick: () => onNavigate && onNavigate('orders'),
      badge: pendingOrdersCount > 0 ? { text: String(pendingOrdersCount), variant: 'neutral' } : null,
    },
    {
      id: 'customers_main',
      title: 'Customers',
      icon: Users,
      isActive: currentView === 'customers' || currentView === 'customer_ledger',
      onClick: () => onNavigate ? onNavigate('customers') : onOpenCustomersModal && onOpenCustomersModal(),
      badge: safeCustomers.length > 0 ? { text: String(safeCustomers.length), variant: 'neutral' } : null,
    },
    {
      id: 'settings_main',
      title: 'Settings',
      icon: Settings,
      isActive: currentView === 'settings',
      onClick: () => onNavigate ? onNavigate('settings') : onOpenSettingsModal && onOpenSettingsModal(),
      badge: null,
    },
  ], [currentView, cartCount, lowStockCount, pendingOrdersCount, safeCustomers.length, onNavigate, onOpenCustomersModal, onOpenSettingsModal]);

  // ২. সেকেন্ডারি মডিউল গ্রুপ (বিদ্যমান সব বিজনেস অপারেশন সংরক্ষণ)
  const menuCategories = useMemo(() => [
    {
      id: 'salesOps',
      title: 'বিক্রয় ও টেইলারিং',
      items: [
        {
          id: 'cart_drawer',
          title: 'শপিং কার্ট ড্রয়ার',
          icon: ShoppingCart,
          isActive: false,
          onClick: () => (onOpenCartDrawer ? onOpenCartDrawer() : onNavigate && onNavigate('cart')),
          badge: cartCount > 0 ? { text: String(cartCount), variant: 'neutral' } : null,
        },
        {
          id: 'tailoring_orders',
          title: 'টেইলারিং ও সেলাই',
          icon: Scissors,
          isActive: currentView === 'tailoring',
          onClick: () => (onNavigate ? onNavigate('tailoring') : onOpenTailoringModal && onOpenTailoringModal()),
          badge: tailoringOrdersCount > 0 ? { text: String(tailoringOrdersCount), variant: 'neutral' } : null,
        },
        {
          id: 'sales_returns',
          title: 'পণ্য রিটার্ন ও এক্সচেঞ্জ',
          icon: RotateCcw,
          isActive: currentView === 'sales_returns',
          onClick: () => (onNavigate ? onNavigate('sales_returns') : onOpenSalesReturnModal && onOpenSalesReturnModal()),
          badge: returnsCount > 0 ? { text: String(returnsCount), variant: 'neutral' } : null,
        },
        {
          id: 'invoice_lookup',
          title: 'ইনভয়েস অনুসন্ধান',
          icon: Search,
          isActive: currentView === 'invoice_lookup',
          onClick: () => (onNavigate ? onNavigate('invoice_lookup') : onOpenInvoiceLookupModal && onOpenInvoiceLookupModal()),
          badge: null,
        },
        {
          id: 'held_carts',
          title: 'হোল্ডকৃত অর্ডার',
          icon: PauseCircle,
          isActive: false,
          onClick: () => onOpenHeldCartsModal && onOpenHeldCartsModal(),
          badge: heldCartsCount > 0 ? { text: String(heldCartsCount), variant: 'warning' } : null,
        },
      ],
    },
    {
      id: 'inventoryOps',
      title: 'গোডাউন ও স্টক হাব',
      alertCount: lowStockCount + godownLowStockCount + expiringProductsCount,
      items: [
        {
          id: 'shop_stock',
          title: 'দোকানের স্টক ও চালান',
          icon: Store,
          isActive: currentView === 'shop_stock' || currentView === 'shop_challans' || currentView === 'shop_outflow',
          onClick: () => (onNavigate ? onNavigate('shop_stock') : onOpenShopStockModal ? onOpenShopStockModal() : onOpenStockTransferModal && onOpenStockTransferModal()),
          badge: transfersInTransitCount > 0 ? { text: String(transfersInTransitCount), variant: 'warning' } : null,
        },
        {
          id: 'godown_stock',
          title: 'গোডাউন মজুত ও ট্রান্সফার',
          icon: Warehouse,
          isActive: currentView === 'godown_stock' || currentView === 'godown_transfer' || currentView === 'godown_outflow',
          onClick: () => (onNavigate ? onNavigate('godown_stock') : onOpenGodownStockModal ? onOpenGodownStockModal() : onOpenStockTransferModal && onOpenStockTransferModal()),
          badge: null,
        },
        {
          id: 'stock_restock',
          title: 'স্টক রিস্টক / নতুন লট',
          icon: PlusCircle,
          isActive: currentView === 'stock_restock',
          onClick: () => (onNavigate ? onNavigate('stock_restock') : onOpenStockModal && onOpenStockModal()),
          badge: null,
        },
        {
          id: 'add_product',
          title: 'নতুন পণ্য যোগ করুন',
          icon: PackagePlus,
          isActive: currentView === 'add_product',
          onClick: () => (onNavigate ? onNavigate('add_product') : onOpenProductModal && onOpenProductModal()),
          badge: null,
        },
        {
          id: 'fabric_wastage',
          title: 'কাপড়ের ছাঁট ও অপচয়',
          icon: Layers,
          isActive: currentView === 'fabric_wastage',
          onClick: () => (onNavigate ? onNavigate('fabric_wastage') : onOpenFabricWastageModal && onOpenFabricWastageModal()),
          badge: null,
        },
        {
          id: 'barcode_print',
          title: 'বারকোড ও প্রাইস ট্যাগ',
          icon: BarcodeIcon,
          isActive: currentView === 'barcode_print',
          onClick: () => (onNavigate ? onNavigate('barcode_print') : onOpenBarcodeModal && onOpenBarcodeModal()),
          badge: null,
        },
        {
          id: 'low_stock_alerts',
          title: 'দোকান কম স্টক সতর্কতা',
          icon: AlertTriangle,
          isAlert: lowStockCount > 0,
          isActive: currentView === 'low_stock',
          onClick: () => (onNavigate ? onNavigate('low_stock') : onOpenLowStockModal && onOpenLowStockModal()),
          badge: lowStockCount > 0 ? { text: String(lowStockCount), variant: 'danger' } : null,
        },
        {
          id: 'godown_low_stock',
          title: 'গোডাউন স্টক অ্যালার্ট',
          icon: AlertTriangle,
          isAlert: godownLowStockCount > 0,
          isActive: currentView === 'godown_low_stock',
          onClick: () => (onNavigate ? onNavigate('godown_low_stock') : onOpenGodownLowStockModal && onOpenGodownLowStockModal()),
          badge: godownLowStockCount > 0 ? { text: String(godownLowStockCount), variant: 'danger' } : null,
        },
        {
          id: 'expiry_alerts',
          title: 'মেয়াদ ও ব্যাচ সতর্কতা',
          icon: CalendarClock,
          isAlert: expiringProductsCount > 0,
          isActive: currentView === 'expiry_alerts',
          onClick: () => (onNavigate ? onNavigate('expiry_alerts') : onOpenExpiryAlertModal && onOpenExpiryAlertModal()),
          badge: expiringProductsCount > 0 ? { text: String(expiringProductsCount), variant: 'danger' } : null,
        },
      ],
    },
    {
      id: 'procurement',
      title: 'মহাজন ও প্রকিউরমেন্ট',
      alertCount: pendingPOCount,
      items: [
        {
          id: 'purchase_orders',
          title: 'পারচেজ অর্ডার (PO)',
          icon: PackageCheck,
          isActive: currentView === 'purchase_orders',
          onClick: () => (onNavigate ? onNavigate('purchase_orders') : onOpenPurchaseOrdersModal && onOpenPurchaseOrdersModal()),
          badge: pendingPOCount > 0 ? { text: String(pendingPOCount), variant: 'warning' } : null,
        },
        {
          id: 'suppliers_list',
          title: 'মহাজন ও দেনা খাতা',
          icon: Building2,
          isActive: currentView === 'suppliers',
          onClick: () => (onNavigate ? onNavigate('suppliers') : onOpenSuppliersModal && onOpenSuppliersModal()),
          badge: suppliersCount > 0 ? { text: String(suppliersCount), variant: 'neutral' } : null,
        },
      ],
    },
    {
      id: 'crm',
      title: 'গ্রাহক ও লেজার',
      items: [
        {
          id: 'customer_ledger',
          title: 'বাকির খাতা ও লেজার',
          icon: BookOpen,
          isActive: currentView === 'customer_ledger',
          onClick: () => (onNavigate ? onNavigate('customer_ledger') : onOpenCustomerLedgerModal && onOpenCustomerLedgerModal()),
          badge: totalDueAmount > 0 ? { text: `${currencySymbol}${Math.round(totalDueAmount).toLocaleString('en-IN')}`, variant: 'warning' } : null,
        },
        {
          id: 'rfm_campaigns',
          title: 'RFM ও SMS ক্যাম্পেইন',
          icon: BarChart3,
          isActive: currentView === 'rfm_campaigns',
          onClick: () => (onNavigate ? onNavigate('rfm_campaigns') : onOpenRFMCampaignModal && onOpenRFMCampaignModal()),
          badge: null,
        },
        {
          id: 'coupons_offers',
          title: 'কুপন ও ছাড় কোড',
          icon: Ticket,
          isActive: currentView === 'coupons',
          onClick: () => (onNavigate ? onNavigate('coupons') : onOpenCouponModal && onOpenCouponModal()),
          badge: null,
        },
        {
          id: 'abandoned_carts',
          title: 'অসম্পূর্ণ কার্ট রিকভারি',
          icon: ShoppingBag,
          isActive: currentView === 'abandoned_carts',
          onClick: () => (onNavigate ? onNavigate('abandoned_carts') : onOpenAbandonedCartModal && onOpenAbandonedCartModal()),
          badge: abandonedCartsCount > 0 ? { text: String(abandonedCartsCount), variant: 'warning' } : null,
        },
      ],
    },
    {
      id: 'finance',
      title: 'হিসাব ও ব্যাক-অফিস',
      items: [
        {
          id: 'store_expenses',
          title: 'দোকানের খরচের খাতা',
          icon: Receipt,
          isActive: currentView === 'expenses',
          onClick: () => (onNavigate ? onNavigate('expenses') : onOpenExpensesModal && onOpenExpensesModal()),
          badge: expensesCount > 0 ? { text: String(expensesCount), variant: 'neutral' } : null,
        },
        {
          id: 'cash_register',
          title: 'দৈনিক ক্যাশ ড্রয়ার (EOD)',
          icon: Coins,
          isActive: currentView === 'cash_register',
          onClick: () => (onNavigate ? onNavigate('cash_register') : onOpenCashRegisterModal && onOpenCashRegisterModal()),
          badge: { text: isRegisterOpen ? 'Open' : 'Closed', variant: isRegisterOpen ? 'success' : 'neutral' },
        },
        {
          id: 'bank_management',
          title: 'ব্যাংক হিসাব ও ডিপোজিট',
          icon: Landmark,
          isActive: currentView === 'bank_accounts',
          onClick: () => (onNavigate ? onNavigate('bank_accounts') : onOpenBankModal && onOpenBankModal()),
          badge: totalBankBalance > 0 ? { text: `${currencySymbol}${Math.round(totalBankBalance).toLocaleString('en-IN')}`, variant: 'neutral' } : null,
        },
        {
          id: 'pnl_analytics',
          title: 'লাভ-ক্ষতি ও P&L রিপোর্ট',
          icon: TrendingUp,
          isActive: currentView === 'analytics',
          onClick: () => (onNavigate ? onNavigate('analytics') : onOpenAnalyticsModal && onOpenAnalyticsModal()),
          locked: !isAdmin,
        },
        {
          id: 'quick_calculator',
          title: 'কাটা কাপড় ক্যালকুলেটর',
          icon: Scissors,
          onClick: () => onOpenCalculator && onOpenCalculator(),
          badge: { text: 'Alt+C', variant: 'neutral' },
        },
        {
          id: 'audit_logs',
          title: 'অডিট ট্রেইল',
          icon: ShieldAlert,
          isActive: currentView === 'audit_logs',
          onClick: () => (onNavigate ? onNavigate('audit_logs') : onOpenAuditLogsModal && onOpenAuditLogsModal()),
          badge: null,
        },
        {
          id: 'users_staff',
          title: 'ইউজার ও স্টাফ',
          icon: UserCog,
          isActive: currentView === 'users',
          onClick: () => (onNavigate ? onNavigate('users') : onOpenUsersModal && onOpenUsersModal()),
          locked: !isAdmin,
        },
        {
          id: 'backup_restore',
          title: 'ডাটা ব্যাকআপ ও এক্সপোর্ট',
          icon: Database,
          isActive: currentView === 'backup',
          onClick: () => onOpenBackupModal && onOpenBackupModal(),
          locked: !isAdmin,
        },
        {
          id: 'switch_to_customer',
          title: 'গ্রাহক স্টোর ভিউ',
          icon: Store,
          onClick: onSwitchToCustomerMode,
          badge: null,
        },
      ],
    },
  ], [
    currentView, cartCount, tailoringOrdersCount, returnsCount, heldCartsCount,
    lowStockCount, godownLowStockCount, expiringProductsCount, transfersInTransitCount,
    pendingPOCount, suppliersCount, totalDueAmount, abandonedCartsCount, expensesCount,
    isRegisterOpen, totalBankBalance, currencySymbol, isAdmin,
    onNavigate, onOpenCartDrawer, onOpenTailoringModal, onOpenSalesReturnModal,
    onOpenInvoiceLookupModal, onOpenHeldCartsModal, onOpenShopStockModal,
    onOpenStockTransferModal, onOpenGodownStockModal, onOpenStockModal,
    onOpenProductModal, onOpenFabricWastageModal, onOpenBarcodeModal,
    onOpenLowStockModal, onOpenGodownLowStockModal, onOpenExpiryAlertModal,
    onOpenPurchaseOrdersModal, onOpenSuppliersModal, onOpenCustomerLedgerModal,
    onOpenRFMCampaignModal, onOpenCouponModal, onOpenAbandonedCartModal,
    onOpenExpensesModal, onOpenCashRegisterModal, onOpenBankModal,
    onOpenAnalyticsModal, onOpenCalculator, onOpenAuditLogsModal, onOpenUsersModal,
    onOpenBackupModal, onSwitchToCustomerMode
  ]);

  const q = searchQuery.trim().toLowerCase();
  const filteredCore = useMemo(() => {
    if (!q) return coreItems;
    return coreItems.filter((item) => item.title.toLowerCase().includes(q));
  }, [coreItems, q]);

  const filteredCategories = useMemo(() => {
    if (!q) return menuCategories;
    return menuCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.title.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menuCategories, q]);

  const getBadgeClass = (variant, isActive) => {
    if (isActive) return 'bg-white/15 text-white border-white/20';
    if (variant === 'danger') return 'bg-red-50 text-[#B91C1C] border-red-200';
    if (variant === 'warning') return 'bg-amber-50 text-[#B45309] border-amber-200';
    if (variant === 'success') return 'bg-emerald-50 text-[#15803D] border-emerald-200';
    if (variant === 'accent') return 'bg-[#0F172A] text-white border-[#0F172A]';
    return 'bg-neutral-100 text-[#525252] border-neutral-200/80';
  };

  return (
    <>
      {/* মোবাইল/ট্যাবলেট ড্রয়ার ব্যাকড্রপ (কোনো backdrop-blur নেই) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-neutral-950/35 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-white border-r border-neutral-200/80 flex flex-col shrink-0 transition-all duration-200 z-50 md:z-30 sticky top-0 md:top-14 h-screen md:h-[calc(100vh-3.5rem)] select-none ${
          isCollapsed ? 'w-64 md:w-16' : 'w-64'
        } ${isMobileOpen ? 'flex fixed inset-y-0 left-0' : 'hidden md:flex'}`}
      >
        {/* হোয়াইট-লেবেল ব্র্যান্ড হেডার (মোবাইল ড্রয়ার বা সাইডবারে পরিচ্ছন্ন পরিচিতি) */}
        <div className="px-3 py-3 border-b border-neutral-200/80 flex items-center justify-between gap-2 shrink-0">
          {!isCollapsed || isMobileOpen ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <StoreLogo
                url={settings?.LogoUrl || settings?.logoUrl}
                alt={settings?.StoreName || 'Store'}
                className="w-7 h-7 object-contain rounded-md border border-neutral-200/80 bg-white p-0.5 shrink-0"
                fallbackClassName="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center shrink-0"
                iconClassName="w-3.5 h-3.5"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold font-heading tracking-tight text-[#111111] truncate">
                  {settings?.StoreName || 'Enterprise POS'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#525252]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === 'online' ? 'bg-[#15803D]' : 'bg-[#B45309]'
                    }`}
                  />
                  <span className="truncate font-mono">
                    {activeUser?.Role || 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <StoreLogo
                url={settings?.LogoUrl || settings?.logoUrl}
                alt={settings?.StoreName || 'Store'}
                className="w-7 h-7 object-contain rounded-md border border-neutral-200/80 bg-white p-0.5"
                fallbackClassName="w-7 h-7 rounded-md bg-[#0F172A] text-white flex items-center justify-center"
                iconClassName="w-3.5 h-3.5"
              />
            </div>
          )}

          {isMobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="সাইডবার বন্ধ করুন"
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-[#525252] hover:bg-neutral-100 hover:text-[#111111] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* মেনু কুইক সার্চ (Ctrl+K) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3 pt-2.5 pb-1.5 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="মেনু খুঁজুন..."
                className="w-full min-h-[34px] pl-8 pr-12 py-1 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] transition-colors"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[9.5px] font-mono text-[#737373] bg-white border border-neutral-200 rounded-xs">
                  Ctrl+K
                </kbd>
              )}
            </div>
          </div>
        )}

        {/* স্ক্রলেবল মেনু এলাকা */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
          {/* ১. কোর প্রাইমারি নেভিগেশন */}
          {filteredCore.length > 0 && (
            <div className="space-y-0.5">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-[#737373]">
                  Core Modules
                </div>
              )}
              <nav className="space-y-0.5">
                {filteredCore.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAction(item.onClick)}
                      title={isCollapsed && !isMobileOpen ? item.title : ''}
                      className={`w-full flex items-center rounded-md text-xs transition-colors cursor-pointer min-h-[44px] md:min-h-[34px] ${
                        isCollapsed && !isMobileOpen ? 'justify-center px-2' : 'justify-between px-2.5 py-1.5'
                      } ${
                        item.isActive
                          ? 'bg-[#0F172A] text-white font-medium'
                          : 'text-[#525252] hover:text-[#111111] hover:bg-neutral-100 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <IconComp
                          className={`w-4 h-4 shrink-0 ${
                            item.isActive ? 'text-white' : 'text-[#525252]'
                          }`}
                        />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </span>
                      {item.badge && (!isCollapsed || isMobileOpen) && (
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono tabular-nums border ${getBadgeClass(
                            item.badge.variant,
                            item.isActive
                          )}`}
                        >
                          {item.badge.text}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* ২. সেকেন্ডারি মডিউল গ্রুপ (অ্যাকর্ডিয়ন) */}
          <div className="space-y-2 border-t border-neutral-200/80 pt-3">
            {filteredCategories.map((category) => {
              const isSectionOpen = Boolean(openSections[category.id] || q.length > 0);
              return (
                <div key={category.id} className="space-y-0.5">
                  {(!isCollapsed || isMobileOpen) ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(category.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-[#737373] hover:text-[#111111] rounded-md transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{category.title}</span>
                        {category.alertCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono tabular-nums bg-amber-50 text-[#B45309] border border-amber-200">
                            {category.alertCount}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#737373] transition-transform ${
                          isSectionOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="border-t border-neutral-200/60 my-1.5" />
                  )}

                  {(isSectionOpen || (isCollapsed && !isMobileOpen)) && (
                    <nav className="space-y-0.5">
                      {category.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAction(item.onClick)}
                            title={isCollapsed && !isMobileOpen ? item.title : ''}
                            className={`w-full flex items-center rounded-md text-xs transition-colors cursor-pointer min-h-[44px] md:min-h-[32px] ${
                              isCollapsed && !isMobileOpen
                                ? 'justify-center px-2'
                                : 'justify-between px-2.5 py-1.5'
                            } ${
                              item.isActive
                                ? 'bg-[#0F172A] text-white font-medium'
                                : item.isAlert
                                ? 'text-[#B91C1C] bg-red-50/60 hover:bg-red-50 font-medium'
                                : 'text-[#525252] hover:text-[#111111] hover:bg-neutral-100'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <ItemIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  item.isActive
                                    ? 'text-white'
                                    : item.isAlert
                                    ? 'text-[#B91C1C]'
                                    : 'text-[#737373]'
                                }`}
                              />
                              {(!isCollapsed || isMobileOpen) && (
                                <span className="truncate">{item.title}</span>
                              )}
                            </span>

                            {(!isCollapsed || isMobileOpen) && (
                              <span className="flex items-center gap-1 shrink-0">
                                {item.locked && (
                                  <Lock className="w-3 h-3 text-[#737373]" />
                                )}
                                {item.badge && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded-sm text-[10px] font-mono tabular-nums border ${getBadgeClass(
                                      item.badge.variant,
                                      item.isActive
                                    )}`}
                                  >
                                    {item.badge.text}
                                  </span>
                                )}
                              </span>
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
        </div>

        {/* ফুটার: কলাপ্স টগল (ডেস্কটপ) */}
        <div className="hidden md:flex p-2 border-t border-neutral-200/80 bg-[#FAFAFA] shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'সাইডবার প্রসারিত করুন' : 'সাইডবার সংকুচিত করুন'}
            className={`w-full min-h-[34px] flex items-center rounded-md px-2.5 text-xs text-[#525252] hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isCollapsed && <span className="font-medium">Collapse Sidebar</span>}
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
