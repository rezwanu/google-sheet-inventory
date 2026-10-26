import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import ProductCatalog from './components/ProductCatalog';

import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import CustomersModal from './components/CustomersModal';
import AddStockModal from './components/AddStockModal';
import AddProductModal from './components/AddProductModal';
import SettingsModal from './components/SettingsModal';
import SalesHistoryModal from './components/SalesHistoryModal';
import InvoiceModal from './components/InvoiceModal';
import InvoiceLookupModal from './components/InvoiceLookupModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import LowStockModal from './components/LowStockModal';
import ProductDetailsModal from './components/ProductDetailsModal';
import EditProductModal from './components/EditProductModal';
import AuthModal from './components/AuthModal';
import CustomerOrdersModal from './components/CustomerOrdersModal';
import CouponModal from './components/CouponModal';
import UsersModal from './components/UsersModal';
import Sidebar from './components/Sidebar';
import OrdersPage from './components/OrdersPage';
import CustomerOrderTrackingModal from './components/CustomerOrderTrackingModal';
import CustomerLedgerModal from './components/CustomerLedgerModal';
import AbandonedCartModal from './components/AbandonedCartModal';
import SuppliersModal from './components/SuppliersModal';
import PurchaseOrdersModal from './components/PurchaseOrdersModal';
import BarcodePrintModal from './components/BarcodePrintModal';
import ExpensesModal from './components/ExpensesModal';
import CashRegisterModal from './components/CashRegisterModal';
import AuditLogsModal from './components/AuditLogsModal';
import ExpiryAlertModal from './components/ExpiryAlertModal';
import ProductVariantSelectModal from './components/ProductVariantSelectModal';
import SalesReturnModal from './components/SalesReturnModal';
import StockTransferModal from './components/StockTransferModal';
import RFMCampaignModal from './components/RFMCampaignModal';
import FabricCutModal from './components/FabricCutModal';
import HeldCartsModal from './components/HeldCartsModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import TailoringModal from './components/TailoringModal';
import FabricWastageModal from './components/FabricWastageModal';
import BackupRestoreModal from './components/BackupRestoreModal';
import AdminPinModal from './components/AdminPinModal';
import { isAdminUser } from './utils/permissionUtils';
import { isFabricUnit } from './utils/fabricUtils';
import {
  playBarcodeBeep,
  playCashChime,
  playHoldSound,
  playWarningBeep,
  playErrorBeep,
  isSoundEnabled,
  setSoundEnabled
} from './utils/soundEffects';

import {
  getLocalSettings,
  saveLocalSettings,
  getLocalProducts,
  saveLocalProducts,
  normalizeProduct,
  getProductDisplayUnit,
  getLocalOrders,
  saveOrUpdateOrderLocally,
  updateOrderStatusLocally,
  deleteOrderLocally,
  submitOrderRmaLocally,
  resolveOrderRmaLocally,
  getLocalCategories,
  saveLocalCategories,
  getLocalUnits,
  saveLocalUnits,
  getLocalVariants,
  saveLocalVariants,
  getLocalCart,
  saveLocalCart,
  getLocalHeldCarts,
  saveLocalHeldCarts,
  deleteHeldCartLocally,
  getLocalSalesHistory,
  saveSaleLocally,
  saveLocalSalesHistory,
  getLocalCustomers,
  saveLocalCustomers,
  saveOrUpdateCustomerLocally,
  deleteCustomerLocally,
  clearDemoCustomers,
  isDummyCustomer,
  getLocalCustomerLedger,
  saveLocalCustomerLedger,
  recordCustomerLedgerEntryLocally,
  recordCustomerPaymentLocally,
  updateCustomerCreditLimitLocally,
  getLocalAbandonedCarts,
  saveLocalAbandonedCarts,
  saveOrUpdateAbandonedCartLocally,
  updateAbandonedCartStatusLocally,
  deleteAbandonedCartLocally,
  getLocalCoupons,
  saveLocalCoupons,
  saveOrUpdateCouponLocally,
  deleteCouponLocally,
  getActiveUser,
  saveActiveUser,
  getLocalUsers,
  saveLocalUsers,
  saveOrUpdateUserLocally,
  deleteUserLocally,
  registerCustomerLocally,
  authenticateUser,
  logoutUser,
  addToOfflineQueue,
  isDemoProduct,
  clearDemoData,
  sanitizeSettings,
  extractLogoFromObject,
  DEFAULT_APPS_SCRIPT_URL,
  getLocalSuppliers,
  saveLocalSuppliers,
  saveOrUpdateSupplierLocally,
  deleteSupplierLocally,
  recordSupplierPaymentLocally,
  getLocalPurchaseOrders,
  saveLocalPurchaseOrders,
  saveOrUpdatePurchaseOrderLocally,
  updatePurchaseOrderStatusLocally,
  getLocalSupplierLedger,
  saveLocalSupplierLedger,
  getLocalExpenses,
  saveLocalExpenses,
  saveOrUpdateExpenseLocally,
  deleteExpenseLocally,
  getLocalCashRegisters,
  saveLocalCashRegisters,
  getActiveCashRegister,
  saveActiveCashRegister,
  openCashRegisterLocally,
  closeCashRegisterLocally,
  getLocalAuditLogs,
  saveLocalAuditLogs,
  logAuditEventLocally,
  getExpiringProductsSummary,
  getLocalSalesReturns,
  saveLocalSalesReturns,
  saveSalesReturnLocally,
  redeemStoreCreditLocally,
  getLocalStockTransfers,
  saveLocalStockTransfers,
  saveStockTransferLocally,
  updateStockTransferStatusLocally,
  deleteStockTransferLocally,
  saveCampaignLocally,
  getLocalTailoringOrders,
  saveLocalTailoringOrders,
  addTailoringOrderLocally,
  updateTailoringOrderStatusLocally,
  updateTailoringOrderLocally,
  deleteTailoringOrderLocally,
  getLocalTailorMasters,
  saveLocalTailorMasters,
  addTailorMasterLocally,
  getLocalFabricWastage,
  saveLocalFabricWastage,
  addFabricWastageLocally,
  deleteFabricWastageLocally,
  getLocalStockMovements,
  saveLocalStockMovements,
  recordStockMovementLocally,
  getGodownOutflowLedger,
  getShopOutflowLedger,
  exportGodownOutflowExcelCSV,
  exportShopOutflowExcelCSV,
  exportLocationStockExcelCSV
} from './services/storage';

import {
  fetchInitialData,
  fetchSalesHistory,
  fetchCustomers,
  fetchCoupons,
  postAddCoupon,
  postUpdateCoupon,
  postDeleteCoupon,
  postAddCustomer,
  postDeleteCustomer,
  fetchUsers,
  postAddUser,
  postRegisterUser,
  postUpdateUser,
  postDeleteUser,
  postLoginUser,
  postAddStock,
  postCreateSale,
  postAddProduct,
  postUpdateProduct,
  postDeleteProduct,
  postAddCategory,
  postAddUnit,
  postAddVariantOption,
  postUpdateSettings,
  postCreateOrder,
  postUpdateOrderStatus,
  postBulkUpdateOrderStatus,
  postSteadfastBulkDispatch,
  postSteadfastCheckStatus,
  postSendSmsNotification,
  postRecordCustomerPayment,
  postUpdateCustomerCreditLimit,
  postSaveAbandonedCart,
  postUpdateAbandonedCartStatus,
  postSaveSupplier,
  postDeleteSupplier,
  postCreatePurchaseOrder,
  postUpdatePOStatus,
  postRecordSupplierPayment,
  postSaveExpense,
  postDeleteExpense,
  postOpenCashRegister,
  postCloseCashRegister,
  postLogAuditEvent,
  postCreateSalesReturn,
  postRedeemStoreCredit,
  postCreateStockTransfer,
  postUpdateStockTransferStatus,
  postDeleteStockTransfer,
  postSendBulkTargetedSms
} from './services/api';

export default function App() {
  // ১. প্রাথমিক স্টেটসমূহ লোকাল স্টোরেজ থেকে লোড (জিরো-লেটেন্সি)
  const [settings, setSettings] = useState(getLocalSettings);
  const [products, setProducts] = useState(getLocalProducts);
  const [categories, setCategories] = useState(getLocalCategories);
  const [units, setUnits] = useState(getLocalUnits);
  const [variantAttributes, setVariantAttributes] = useState(getLocalVariants);
  const [cart, setCart] = useState(getLocalCart);
  const [salesHistory, setSalesHistory] = useState(getLocalSalesHistory);
  const [orders, setOrders] = useState(getLocalOrders);
  const [customers, setCustomers] = useState(() => {
    try {
      const c = getLocalCustomers();
      return Array.isArray(c) ? c : [];
    } catch {
      return [];
    }
  });
  const [customerLedger, setCustomerLedger] = useState(() => {
    try {
      const l = getLocalCustomerLedger();
      return Array.isArray(l) ? l : [];
    } catch {
      return [];
    }
  });
  const [coupons, setCoupons] = useState(getLocalCoupons);
  const [activeUser, setActiveUser] = useState(getActiveUser);
  const [users, setUsers] = useState(getLocalUsers);
  const [abandonedCarts, setAbandonedCarts] = useState(() => {
    try {
      const c = getLocalAbandonedCarts();
      return Array.isArray(c) ? c : [];
    } catch {
      return [];
    }
  });
  // কাউন্টার অর্ডার হোল্ড স্টেট (সিরিয়ালের অন্য কাস্টমারকে বিদায় দেওয়ার জন্য)
  const [heldCarts, setHeldCarts] = useState(() => {
    try {
      const h = getLocalHeldCarts();
      return Array.isArray(h) ? h : [];
    } catch {
      return [];
    }
  });
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  // ফেজ ১: কিবোর্ড শর্টকাট ও অডিও সাউন্ড স্টেট
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSoundActive, setIsSoundActive] = useState(isSoundEnabled);

  // ফেজ ২: টেইলারিং ও সেলাই অর্ডার এবং কাপড়ের ছাঁট/ড্যামেজ ট্র্যাকার স্টেট
  const [tailoringOrders, setTailoringOrders] = useState(() => {
    try {
      const to = getLocalTailoringOrders();
      return Array.isArray(to) ? to : [];
    } catch {
      return [];
    }
  });
  const [tailorMasters, setTailorMasters] = useState(() => {
    try {
      const tm = getLocalTailorMasters();
      return Array.isArray(tm) ? tm : [];
    } catch {
      return [];
    }
  });
  const [fabricWastageList, setFabricWastageList] = useState(() => {
    try {
      const fw = getLocalFabricWastage();
      return Array.isArray(fw) ? fw : [];
    } catch {
      return [];
    }
  });
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);
  const [isFabricWastageModalOpen, setIsFabricWastageModalOpen] = useState(false);
  const [tailoringPreloadData, setTailoringPreloadData] = useState(null);

  // ফেজ ৪: সাপ্লায়ার ও ভেন্ডর, পারচেজ অর্ডার এবং লেজার স্টেট
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const s = getLocalSuppliers();
      return Array.isArray(s) ? s : [];
    } catch {
      return [];
    }
  });
  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    try {
      const po = getLocalPurchaseOrders();
      return Array.isArray(po) ? po : [];
    } catch {
      return [];
    }
  });
  const [supplierLedger, setSupplierLedger] = useState(() => {
    try {
      const sl = getLocalSupplierLedger();
      return Array.isArray(sl) ? sl : [];
    } catch {
      return [];
    }
  });

  // ফেজ ৫: খরচের খাতা, দৈনিক ক্যাশ ড্রয়ার ও অডিট ট্রেইল স্টেট
  const [expenses, setExpenses] = useState(() => {
    try {
      const exp = getLocalExpenses();
      return Array.isArray(exp) ? exp : [];
    } catch {
      return [];
    }
  });
  const [cashRegisters, setCashRegisters] = useState(() => {
    try {
      const cr = getLocalCashRegisters();
      return Array.isArray(cr) ? cr : [];
    } catch {
      return [];
    }
  });
  const [activeRegister, setActiveRegister] = useState(getActiveCashRegister);
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const al = getLocalAuditLogs();
      return Array.isArray(al) ? al : [];
    } catch {
      return [];
    }
  });

  // ফেজ ৭: পণ্য বিক্রয় রিটার্ন ও গোডাউন ট্রান্সফার স্টেট (Phase 7)
  const [salesReturns, setSalesReturns] = useState(() => {
    try {
      const sr = getLocalSalesReturns();
      return Array.isArray(sr) ? sr : [];
    } catch {
      return [];
    }
  });
  const [stockTransfers, setStockTransfers] = useState(() => {
    try {
      const st = getLocalStockTransfers();
      return Array.isArray(st) ? st : [];
    } catch {
      return [];
    }
  });
  const [stockMovements, setStockMovements] = useState(() => {
    try {
      const sm = getLocalStockMovements();
      return Array.isArray(sm) ? sm : [];
    } catch {
      return [];
    }
  });
  const [isSalesReturnModalOpen, setIsSalesReturnModalOpen] = useState(false);
  const [isStockTransferModalOpen, setIsStockTransferModalOpen] = useState(false);
  const [stockTransferModalConfig, setStockTransferModalConfig] = useState({
    tab: 'overview',
    subTab: 'new',
    filter: 'ALL'
  });

  const handleOpenStockTransferModalWithConfig = (tab = 'overview', subTab = 'new', filter = 'ALL') => {
    setStockTransferModalConfig({ tab, subTab, filter });
    setIsStockTransferModalOpen(true);
  };

  // ফেজ ৮: আরএফএম গ্রাহক সেগমেন্টেশন ও টার্গেটেড এসএমএস ক্যাম্পেইন মডাল স্টেট
  const [isRFMCampaignModalOpen, setIsRFMCampaignModalOpen] = useState(false);

  // ভিউ নেভিগেশন স্টেট ('pos' | 'cart' | 'checkout')
  const [currentView, setCurrentView] = useState('pos');
  const [discountAmount, setDiscountAmount] = useState(0);

  // ফেজ ৩: ব্যবসায়িক লাভ ও নিরাপত্তা (Role-Based Restriction & 1-Click Backup)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinActionDescription, setAdminPinActionDescription] = useState('');
  const [pendingAdminAction, setPendingAdminAction] = useState(null);
  const [isPinAuthorizedSession, setIsPinAuthorizedSession] = useState(false);

  // অ্যাডমিন অনুমতি যাচাই ও পিন শিল্ড প্রোটেকশন
  const executeAdminAction = useCallback((actionCallback, actionName = 'এই সুরক্ষিত সেকশনটি ব্যবহার করতে') => {
    if (isAdminUser(activeUser) || isPinAuthorizedSession) {
      if (typeof actionCallback === 'function') actionCallback();
    } else {
      setAdminPinActionDescription(actionName);
      setPendingAdminAction(() => actionCallback);
      setIsAdminPinModalOpen(true);
    }
  }, [activeUser, isPinAuthorizedSession]);

  const handleSecureNavigate = useCallback((view) => {
    if (view === 'godown_low_stock') {
      handleOpenStockTransferModalWithConfig('godown_stock', 'new', 'LOW_GODOWN');
      return;
    }
    if (view === 'analytics') {
      executeAdminAction(() => setCurrentView('analytics'), 'লাভ-ক্ষতি ও P&L অ্যানালিটিক্স রিপোর্ট দেখতে');
      return;
    }
    if (view === 'users') {
      executeAdminAction(() => setCurrentView('users'), 'ইউজার ও স্টাফ একাউন্ট ম্যানেজ করতে');
      return;
    }
    if (view === 'backup') {
      executeAdminAction(() => setCurrentView('backup'), '১-ক্লিক সম্পূর্ণ ডাটা ব্যাকআপ ও এক্সেল ডাউনলোড করতে');
      return;
    }
    setCurrentView(view);
  }, [executeAdminAction]);

  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [isCustomerLedgerModalOpen, setIsCustomerLedgerModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isAbandonedCartModalOpen, setIsAbandonedCartModalOpen] = useState(false);
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [isPurchaseOrdersModalOpen, setIsPurchaseOrdersModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

  // ফেজ ৬: মেয়াদ সতর্কতা ও ভ্যারিয়েন্ট সিলেক্টর মডাল স্টেট
  const [isExpiryAlertModalOpen, setIsExpiryAlertModalOpen] = useState(false);
  const [variantSelectModalProduct, setVariantSelectModalProduct] = useState(null);
  const [fabricCutProduct, setFabricCutProduct] = useState(null);

  // মেয়াদোত্তীর্ণ ও সন্নিকটে থাকা পণ্যের মোট সংখ্যা হিসাব
  const expiringProductsSummary = useMemo(() => {
    return getExpiringProductsSummary(products);
  }, [products]);

  // পেন্ডিং অসম্পূর্ণ কার্ট গণনা
  const pendingAbandonedCartsCount = useMemo(() => {
    return Array.isArray(abandonedCarts)
      ? abandonedCarts.filter((c) => c.RecoveryStatus === 'Pending').length
      : 0;
  }, [abandonedCarts]);

  // ২. সিস্টেম স্ট্যাটাস ও মডাল স্টেট (জিরো-ডিলে রেডি স্ট্যাটাস)
  const [syncStatus, setSyncStatus] = useState(() => {
    try {
      const p = getLocalProducts();
      return (p && p.length > 0) ? 'online' : 'syncing';
    } catch {
      return 'online';
    }
  });
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ইনভয়েস প্রিন্ট স্টেট
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [activeInvoiceData, setActiveInvoiceData] = useState(null);
  const [autoTriggerPrint, setAutoTriggerPrint] = useState(false);

  // ইনভয়েস অনুসন্ধান ও বিস্তারিত মেমো মডাল স্টেট
  const [isInvoiceLookupOpen, setIsInvoiceLookupOpen] = useState(false);
  const [selectedLookupInvoiceNo, setSelectedLookupInvoiceNo] = useState('');

  // অন্যান্য মডাল ভিজিবিলিটি
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [quickRestockProductId, setQuickRestockProductId] = useState('');

  // অথেনটিকেশন ও কাস্টমার পোর্টাল মডাল স্টেট
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCustomerOrdersOpen, setIsCustomerOrdersOpen] = useState(false);

  // কাস্টমার সরাসরি ট্র্যাকিং পোর্টাল স্টেট (?track=ORD-XXXXX)
  const [directTrackingOrderId, setDirectTrackingOrderId] = useState('');
  const [isCustomerTrackingModalOpen, setIsCustomerTrackingModalOpen] = useState(false);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trackId = urlParams.get('track') || urlParams.get('order');
      if (trackId) {
        setDirectTrackingOrderId(trackId);
        setIsCustomerTrackingModalOpen(true);
      }
    } catch {}
  }, []);

  // ওমনিচ্যানেল সেলস ও অর্ডার ডাটাবেস অটো-সিঙ্ক (Sync historical POS sales into orders if missing)
  useEffect(() => {
    try {
      const currentOrders = getLocalOrders();
      const existingOrderIds = new Set(currentOrders.map((o) => String(o.OrderID || '').trim().toLowerCase()));
      let hasNewOrder = false;

      (salesHistory || []).forEach((sale) => {
        const invNo = String(sale.invoiceNo || sale.invoiceNumber || sale.id || '').trim();
        if (invNo && !existingOrderIds.has(invNo.toLowerCase())) {
          const pastOrder = {
            OrderID: invNo,
            OrderNumber: invNo,
            OrderDate: sale.timestamp || sale.CreatedAt || new Date().toISOString(),
            CustomerName: sale.customerName || sale.CustomerName || 'কাউন্টার কাস্টমার',
            CustomerPhone: sale.customerPhone || sale.CustomerPhone || '',
            CustomerAddress: sale.customerAddress || 'ইন-স্টোর কাউন্টার',
            OrderSource: 'In-Store / POS',
            Items: (sale.items || []).map((i) => ({
              productId: i.productId || i.ProductID,
              productName: i.productName || i.ProductName || 'পণ্য',
              quantity: Number(i.quantity || i.Quantity) || 1,
              sellingPrice: Number(i.sellingPrice || i.SellingPrice) || 0,
              costPrice: Number(i.costPrice || i.CostPrice) || 0,
              category: i.category || 'General',
              barcode: i.barcode || ''
            })),
            SubTotal: Number(sale.subTotal || sale.SubTotal || sale.grandTotal) || 0,
            DiscountAmount: Number(sale.discountAmount || sale.DiscountAmount) || 0,
            DeliveryCharge: 0,
            TotalAmount: Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount) || 0,
            AdvancePaid: Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount) || 0,
            DueAmount: 0,
            CourierName: 'Counter Pickup',
            Status: 'Delivered',
            PaymentStatus: 'Paid',
            PaymentMethod: sale.paymentMethod || sale.PaymentMethod || 'Cash',
            RiskLevel: 'Low',
            StockReserved: true,
            CreatedBy: sale.cashierEmail || 'POS Cashier',
            ActivityLog: [
              {
                timestamp: sale.timestamp || new Date().toISOString(),
                action: 'কাউন্টার পিওএস (POS) থেকে বিক্রয় সম্পন্ন',
                actor: sale.cashierEmail || 'POS Cashier'
              }
            ]
          };
          saveOrUpdateOrderLocally(pastOrder);
          existingOrderIds.add(invNo.toLowerCase());
          hasNewOrder = true;
        }
      });

      if (hasNewOrder) {
        setOrders(getLocalOrders());
      }
    } catch (e) {
      console.warn('Omnichannel order backfill notice:', e);
    }
  }, [salesHistory]);

  // সাইডবার মেনু প্যানেল স্টেট (Sidebar Panel State)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('inventory_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('inventory_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
    setIsMobileSidebarOpen((prev) => !prev);
  };

  // একক পণ্যের পূর্ণ বিবরণ (Single Product Details) স্টেট
  const [selectedProductForDetails, setSelectedProductForDetails] = useState(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);

  // পণ্য সম্পাদনা (Edit Product) মডাল স্টেট
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);

  // লাইভ প্রোডাক্ট অবজেক্ট বের করা
  const activeProductForDetails = React.useMemo(() => {
    if (!selectedProductForDetails) return null;
    return products.find((p) => p.ProductID === selectedProductForDetails.ProductID) || selectedProductForDetails;
  }, [products, selectedProductForDetails]);

  // পণ্যের বিবরণী ওপেন হ্যান্ডলার
  const handleOpenProductDetails = (product) => {
    setSelectedProductForDetails(product);
    setIsProductDetailsOpen(true);
  };

  // কম স্টকের পণ্যের মোট সংখ্যা (দোকান)
  const lowStockCount = React.useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      return stock <= minAlert;
    }).length;
  }, [products]);

  // গোডাউনে কম স্টকের পণ্যের মোট সংখ্যা (গোডাউন)
  const godownLowStockCount = React.useMemo(() => {
    return products.filter((p) => {
      const vars = Array.isArray(p.Variants) && p.Variants.length > 0
        ? p.Variants
        : (typeof p.VariantsJSON === 'string' && p.VariantsJSON.trim() ? (() => { try { return JSON.parse(p.VariantsJSON); } catch (e) { return []; } })() : []);
      const minAlert = Number(p.MinStockAlert || 5);
      if (vars.length > 0) {
        const gStock = vars.reduce((sum, v) => sum + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0), 0);
        const hasLowVariant = vars.some((v) => {
          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0));
          return vGStock <= 2;
        });
        return gStock <= minAlert || hasLowVariant;
      }
      const gStock = Number(p.GodownStock || 0);
      return gStock <= minAlert;
    }).length;
  }, [products]);

  // অপেক্ষমান অর্ডারের সংখ্যা (Badge Count)
  const pendingOrdersCount = useMemo(() => {
    return (orders || []).filter((o) => o.Status === 'Pending').length;
  }, [orders]);

  // সেলাই বা কাটিং চলমান টেইলারিং অর্ডারের সংখ্যা (Badge Count)
  const runningTailoringOrdersCount = useMemo(() => {
    return (tailoringOrders || []).filter((o) => o.Status !== 'Delivered' && o.Status !== 'Cancelled').length;
  }, [tailoringOrders]);

  // দ্রুত স্টক ইনপুট ওপেন হ্যান্ডলার
  const handleQuickRestock = (product) => {
    setQuickRestockProductId(product.ProductID);
    setIsStockModalOpen(true);
  };

  // নোটিফিকেশন টোস্ট প্রদর্শন
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ইউজার অথেনটিকেশন ও রোল হ্যান্ডলারসমূহ
  const handleLoginSuccess = async ({ identifier, pin, requestedRole }) => {
    // ১. ক্লাউড API থাকলে লাইভ গুগল শিট Users ট্যাবের মাধ্যমে যাচাই করার চেষ্টা
    if (settings.apiUrl && settings.apiUrl.trim()) {
      try {
        const res = await postLoginUser(settings.apiUrl, { identifier, pin, role: requestedRole });
        if (res && res.success && res.data) {
          const user = saveOrUpdateUserLocally(res.data);
          saveActiveUser(user);
          setActiveUser(user);
          setIsAuthModalOpen(false);
          setUsers(getLocalUsers());
          showToast(`স্বাগতম, ${user.FullName || user.Email}! সফলভাবে লগইন সম্পন্ন হয়েছে।`, 'success');
          return;
        } else if (res && !res.success) {
          throw new Error(res.message || 'ভুল মোবাইল নম্বর বা পাসওয়ার্ড।');
        }
      } catch (apiErr) {
        // যদি নির্দিষ্ট প্রমাণীকরণ ত্রুটি বা নিষ্ক্রিয় একাউন্ট বার্তা হয়
        if (apiErr.message && !apiErr.message.includes('Failed to fetch') && !apiErr.message.includes('NetworkError') && !apiErr.message.includes('সার্ভার এরর')) {
          throw apiErr;
        }
        // অফলাইনে নেটওয়ার্ক না থাকলে নিচে লোকাল স্টোরেজ দিয়ে চলবে
      }
    }

    // ২. অফলাইন মোডে লোকাল স্টোরেজ থেকে অথেনটিকেশন যাচাই
    try {
      const user = authenticateUser({ identifier, pin, requestedRole });
      setActiveUser(user);
      setIsAuthModalOpen(false);
      setUsers(getLocalUsers());
      showToast(`স্বাগতম, ${user.FullName || user.Email}! সফলভাবে লগইন সম্পন্ন হয়েছে।`, 'success');
    } catch (err) {
      throw err;
    }
  };

  const handleRegisterSuccess = async (formData) => {
    try {
      // ১. অফলাইন ফার্স্ট: লোকাল স্টোরেজে তৎক্ষণাৎ অ্যাকাউন্ট তৈরি
      const newUser = registerCustomerLocally(formData);
      setActiveUser(newUser);
      setIsAuthModalOpen(false);
      setUsers(getLocalUsers());
      setCustomers(getLocalCustomers());
      showToast(`অভিনন্দন, ${newUser.FullName}! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।`, 'success');

      // ২. গুগল শিট Users ও Customers ট্যাবে ক্লাউড সিঙ্ক
      if (settings.apiUrl && settings.apiUrl.trim()) {
        try {
          const res = await postRegisterUser(settings.apiUrl, {
            fullName: newUser.FullName,
            phone: newUser.Phone,
            email: newUser.Email,
            pin: newUser.PIN,
            address: newUser.Address,
            avatarUrl: newUser.AvatarUrl || formData.AvatarUrl || '',
            imageBase64: formData.imageBase64 || '',
            imageMimeType: formData.imageMimeType || '',
            role: 'Customer',
            status: 'Active'
          });
          if (res && res.success && res.data) {
            const synced = saveOrUpdateUserLocally(res.data);
            setActiveUser(synced);
            setUsers(getLocalUsers());
          }
        } catch (syncErr) {
          console.warn('Google Sheet Users registration sync delayed:', syncErr);
        }
      }
    } catch (err) {
      throw err;
    }
  };

  // এডমিন কর্তৃক ব্যবহারকারী তৈরি ও ব্যবস্থাপনা হ্যান্ডলারসমূহ
  const handleAddUser = async (userData) => {
    try {
      const newUser = saveOrUpdateUserLocally(userData);
      setUsers(getLocalUsers());
      showToast(`ব্যবহারকারী '${newUser.FullName}' সফলভাবে তৈরি হয়েছে!`, 'success');

      if (settings.apiUrl && settings.apiUrl.trim()) {
        try {
          const res = await postAddUser(settings.apiUrl, {
            fullName: newUser.FullName,
            phone: newUser.Phone,
            email: newUser.Email,
            role: newUser.Role,
            pin: newUser.PIN,
            address: newUser.Address,
            avatarUrl: newUser.AvatarUrl || userData.AvatarUrl || '',
            imageBase64: userData.imageBase64 || '',
            imageMimeType: userData.imageMimeType || '',
            status: newUser.Status
          });
          if (res && res.success && res.data) {
            saveOrUpdateUserLocally(res.data);
            setUsers(getLocalUsers());
          }
        } catch (apiErr) {
          console.warn('Add user sheet sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(err.message || 'ব্যবহারকারী তৈরি ব্যর্থ হয়েছে।', 'error');
      throw err;
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      const updated = saveOrUpdateUserLocally(userData);
      if (activeUser && (activeUser.UserID === updated.UserID || (activeUser.Phone && activeUser.Phone === updated.Phone))) {
        setActiveUser(updated);
      }
      setUsers(getLocalUsers());
      showToast(`ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে!`, 'success');

      if (settings.apiUrl && settings.apiUrl.trim()) {
        try {
          const res = await postUpdateUser(settings.apiUrl, {
            ...userData,
            userId: updated.UserID,
            avatarUrl: updated.AvatarUrl,
          });
          if (res && res.success && res.data) {
            const synced = saveOrUpdateUserLocally(res.data);
            if (activeUser && activeUser.UserID === synced.UserID) {
              setActiveUser(synced);
            }
            setUsers(getLocalUsers());
          }
        } catch (apiErr) {
          console.warn('Update user sheet sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(err.message || 'তথ্য আপডেট ব্যর্থ হয়েছে।', 'error');
      throw err;
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      deleteUserLocally(userId);
      setUsers(getLocalUsers());
      showToast('ব্যবহারকারীকে সফলভাবে মুছে ফেলা হয়েছে।', 'info');

      if (settings.apiUrl && settings.apiUrl.trim()) {
        try {
          await postDeleteUser(settings.apiUrl, userId);
        } catch (apiErr) {
          console.warn('Delete user sheet sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(err.message || 'মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleLogout = () => {
    const guest = logoutUser();
    setActiveUser(guest);
    setDiscountAmount(0);
    setIsPinAuthorizedSession(false);
    showToast('সফলভাবে লগআউট সম্পন্ন হয়েছে।', 'info');
  };

  const handleSwitchToCustomerMode = () => {
    const users = getLocalUsers();
    const customerUser = users.find((u) => u.Role === 'Customer') || {
      UserID: 'GUEST-CUSTOMER',
      FullName: 'সম্মানিত ক্রেতা',
      Email: '',
      Phone: '',
      Role: 'Customer',
      Address: '',
    };
    saveActiveUser(customerUser);
    setActiveUser(customerUser);
    showToast('গ্রাহক স্টোর ভিউ মোডে প্রবেশ করা হয়েছে।', 'info');
  };

  // ৩. গুগল শিট API-এর সাথে ব্যাকগ্রাউন্ড ডাটা সিঙ্ক ফাংশন (Non-Blocking SWR Pattern)
  const handleSync = useCallback(async (manual = true, targetApiUrl = null) => {
    let effectiveApiUrl = (targetApiUrl || settings.apiUrl || DEFAULT_APPS_SCRIPT_URL || '').trim();
    if (!effectiveApiUrl) {
      effectiveApiUrl = DEFAULT_APPS_SCRIPT_URL;
    }

    // শুধুমাত্র ম্যানুয়াল সিঙ্কে স্পিনার দেখান, ব্যাকগ্রাউন্ড অটো-সিঙ্কে ইউজার ইন্টারফেস স্বাভাবিক থাকবে
    if (manual) {
      setSyncStatus('syncing');
    }

    let data = null;
    try {
      data = await fetchInitialData(effectiveApiUrl, manual);
    } catch (err) {
      console.warn('Initial sync failed with URL:', effectiveApiUrl, err);
      // যদি সংরক্ষিত বা কাস্টম URL কোনো কারণে ফেইল করে, কিন্তু DEFAULT_APPS_SCRIPT_URL ভিন্ন হয়,
      // তাহলে স্বয়ংক্রিয়ভাবে ডিফল্ট অফিসিয়াল লাইভ ব্যাকএন্ড দিয়ে রিকভারি করার চেষ্টা করুন
      if (effectiveApiUrl !== DEFAULT_APPS_SCRIPT_URL && DEFAULT_APPS_SCRIPT_URL) {
        try {
          console.info('Attempting fallback to DEFAULT_APPS_SCRIPT_URL...');
          data = await fetchInitialData(DEFAULT_APPS_SCRIPT_URL, manual);
          effectiveApiUrl = DEFAULT_APPS_SCRIPT_URL;
        } catch (fallbackErr) {
          if (manual) {
            setSyncStatus('offline');
            showToast(`সিঙ্ক ব্যর্থ: ${err.message}`, 'error');
          }
          return;
        }
      } else {
        if (manual) {
          setSyncStatus('offline');
          showToast(`সিঙ্ক ব্যর্থ: ${err.message}`, 'error');
        }
        return;
      }
    }

    try {
      // সেটিংস আপডেট (গুগল শিট থেকে আসল সেটিংস সংরক্ষণ ও ডামি ডাটা প্রতিরোধ)
      if (data && data.settings) {
        let incoming = data.settings;
        if (Array.isArray(incoming)) {
          incoming = incoming.find(s => s && (extractLogoFromObject(s) || s.StoreName)) || incoming[0] || {};
        }
        const cleanIncoming = sanitizeSettings(incoming);
        const resolvedApiUrl = (cleanIncoming.apiUrl || cleanIncoming.ApiUrl || effectiveApiUrl || DEFAULT_APPS_SCRIPT_URL || '').trim();

        const mergedSettings = {
          ...settings,
          ...cleanIncoming,
          apiUrl: resolvedApiUrl,
          ApiUrl: resolvedApiUrl,
        };

        if (cleanIncoming.LogoUrl) {
          mergedSettings.LogoUrl = cleanIncoming.LogoUrl;
          mergedSettings.logoUrl = cleanIncoming.LogoUrl;
        } else if (settings.LogoUrl) {
          mergedSettings.LogoUrl = settings.LogoUrl;
          mergedSettings.logoUrl = settings.LogoUrl;
        }

        if (cleanIncoming.StoreName) mergedSettings.StoreName = cleanIncoming.StoreName;
        if (cleanIncoming.Address) mergedSettings.Address = cleanIncoming.Address;
        if (cleanIncoming.Phone) mergedSettings.Phone = cleanIncoming.Phone;
        if (cleanIncoming.Email) mergedSettings.Email = cleanIncoming.Email;
        if (cleanIncoming.ReceiptFooter) mergedSettings.ReceiptFooter = cleanIncoming.ReceiptFooter;

        setSettings(mergedSettings);
        saveLocalSettings(mergedSettings);
      }

      // প্রোডাক্টস আপডেট (শুধুমাত্র আসল শিট পণ্য লোড হবে, ডেমো পণ্য বর্জিত)
      if (data && data.products && Array.isArray(data.products)) {
        const cleanList = data.products
          .filter(p => !isDemoProduct(p))
          .map(normalizeProduct)
          .filter(Boolean);

        // স্মার্ট প্রটেকশন: শিট রেসপন্সে যদি কোনো কারণে ইনকামিং ভ্যারিয়েন্ট স্টক ০ থাকে কিন্তু লোকাল স্টেটে সঠিক স্টক থাকে
        setProducts(prevProducts => {
          const currentList = Array.isArray(prevProducts) && prevProducts.length > 0 ? prevProducts : products;
          const merged = cleanList.map(incomingP => {
            const localP = currentList.find(lp => String(lp.ProductID || '').trim() === String(incomingP.ProductID || '').trim());
            if (!localP) return incomingP;

            const inVarGodown = (incomingP.Variants || []).reduce((s, v) => s + (Number(v.GodownStock) || 0), 0);
            const localVarGodown = (localP.Variants || []).reduce((s, v) => s + (Number(v.GodownStock) || 0), 0);

            if (localVarGodown > 0 && inVarGodown === 0 && Number(incomingP.GodownStock || 0) > 0) {
              return {
                ...incomingP,
                Variants: localP.Variants,
                VariantsJSON: localP.VariantsJSON || JSON.stringify(localP.Variants),
                variantsJSON: localP.variantsJSON || JSON.stringify(localP.Variants)
              };
            }
            return incomingP;
          });
          saveLocalProducts(merged);
          return merged;
        });
      }

      // ক্যাটাগরি আপডেট
      if (data && data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
        saveLocalCategories(data.categories);
      }

      // পরিমাপক একক (Units) আপডেট
      if (data && data.units && Array.isArray(data.units) && data.units.length > 0) {
        setUnits(data.units);
        saveLocalUnits(data.units);
      }

      // ভ্যারিয়েন্ট অপশন (Variants) আপডেট
      if (data && data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
        setVariantAttributes(data.variants);
        saveLocalVariants(data.variants);
      }

      // সেলস হিস্ট্রি আপডেট (গুগল শিট থেকে ক্লাউড ডাটা)
      if (data && data.sales && Array.isArray(data.sales) && data.sales.length > 0) {
        setSalesHistory(data.sales);
        saveLocalSalesHistory(data.sales);
      }

      // কাস্টমার ডাটাবেস আপডেট (গুগল শিট থেকে আসল ক্লাউড ডাটা, ডামি গ্রাহক বাদ দিয়ে)
      if (data && data.customers && Array.isArray(data.customers)) {
        const realCusts = data.customers.filter((c) => !isDummyCustomer(c));
        setCustomers(realCusts);
        saveLocalCustomers(realCusts);
      }

      // কুপন ডাটাবেস আপডেট (গুগল শিট থেকে আসল ক্লাউড ডাটা)
      if (data && data.coupons && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
        saveLocalCoupons(data.coupons);
      }

      // ব্যবহারকারী ডাটাবেস আপডেট (গুগল শিট Users ট্যাব থেকে ক্লাউড ডাটা)
      if (data && data.users && Array.isArray(data.users) && data.users.length > 0) {
        setUsers(data.users);
        saveLocalUsers(data.users);
      }

      // কাস্টমার লেজার ডাটাবেস আপডেট (গুগল শিট CustomerLedger ট্যাব থেকে ক্লাউড ডাটা)
      if (data && data.customerLedger && Array.isArray(data.customerLedger)) {
        setCustomerLedger(data.customerLedger);
        saveLocalCustomerLedger(data.customerLedger);
      }

      // অসম্পূর্ণ কার্ট ডাটাবেস আপডেট (গুগল শিট AbandonedCarts ট্যাব থেকে ক্লাউড ডাটা)
      if (data && data.abandonedCarts && Array.isArray(data.abandonedCarts)) {
        setAbandonedCarts(data.abandonedCarts);
        saveLocalAbandonedCarts(data.abandonedCarts);
      }

      // ফেজ ৪: সাপ্লায়ার ও ভেন্ডর ডাটাবেস আপডেট (গুগল শিট Suppliers ট্যাব)
      if (data && data.suppliers && Array.isArray(data.suppliers)) {
        setSuppliers(data.suppliers);
        saveLocalSuppliers(data.suppliers);
      }

      // ফেজ ৪: পারচেজ অর্ডার ডাটাবেস আপডেট (গুগল শিট PurchaseOrders ট্যাব)
      if (data && data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
        setPurchaseOrders(data.purchaseOrders);
        saveLocalPurchaseOrders(data.purchaseOrders);
      }

      // ফেজ ৪: সাপ্লায়ার লেজার ডাটাবেস আপডেট (গুগল শিট SupplierLedger ট্যাব)
      if (data && data.supplierLedger && Array.isArray(data.supplierLedger)) {
        setSupplierLedger(data.supplierLedger);
        saveLocalSupplierLedger(data.supplierLedger);
      }

      // ফেজ ৫: খরচের খাতা ডাটাবেস আপডেট (গুগল শিট Expenses ট্যাব)
      if (data && data.expenses && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
        saveLocalExpenses(data.expenses);
      }

      // ফেজ ৫: ক্যাশ রেজিস্টার ডাটাবেস আপডেট (গুগল শিট CashRegister ট্যাব)
      if (data && data.cashRegisters && Array.isArray(data.cashRegisters)) {
        setCashRegisters(data.cashRegisters);
        saveLocalCashRegisters(data.cashRegisters);
        const openSession = data.cashRegisters.find(r => String(r.Status || '').trim().toLowerCase() === 'open');
        setActiveRegister(openSession || null);
        saveActiveCashRegister(openSession || null);
      }

      // ফেজ ৫: অডিট ট্রেইল ডাটাবেস আপডেট (গুগল শিট AuditLogs ট্যাব)
      if (data && data.auditLogs && Array.isArray(data.auditLogs)) {
        setAuditLogs(data.auditLogs);
        saveLocalAuditLogs(data.auditLogs);
      }

      // ফেজ ৭: পণ্য বিক্রয় রিটার্ন ও ভাউচার ডাটাবেস আপডেট (গুগল শিট SalesReturns ট্যাব)
      if (data && data.salesReturns && Array.isArray(data.salesReturns)) {
        setSalesReturns(data.salesReturns);
        saveLocalSalesReturns(data.salesReturns);
      }

      // ফেজ ৭: স্টক ট্রান্সফার চালান ডাটাবেস আপডেট (গুগল শিট StockTransfers ট্যাব)
      if (data && data.stockTransfers && Array.isArray(data.stockTransfers)) {
        setStockTransfers(data.stockTransfers);
        saveLocalStockTransfers(data.stockTransfers);
      }

      setSyncStatus('online');
      if (manual) {
        showToast('গুগল শিট ডাটাবেসের সাথে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!', 'success');
      }
    } catch (parseErr) {
      console.error('Error processing synced data:', parseErr);
      setSyncStatus('online');
    }
  }, [settings]);

  // সেলস ডাটা সরাসরি ক্লাউড থেকে রিফ্রেশ করার হ্যান্ডলার
  const handleRefreshSales = async () => {
    if (!settings.apiUrl || !settings.apiUrl.trim()) {
      showToast('API URL কনফিগার করা নেই। Settings এ গিয়ে URL দিন।', 'warning');
      return;
    }
    try {
      const freshSales = await fetchSalesHistory(settings.apiUrl, 1000);
      if (Array.isArray(freshSales) && freshSales.length > 0) {
        setSalesHistory(freshSales);
        saveLocalSalesHistory(freshSales);
        showToast(`গুগল শিট থেকে ${freshSales.length} টি বিক্রয় রেকর্ড সিঙ্ক হয়েছে!`, 'success');
      } else {
        showToast('কোনো নতুন বিক্রয় ডাটা পাওয়া যায়নি।', 'info');
      }
    } catch (err) {
      showToast(`সেলস সিঙ্ক ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // কাস্টমার ডাটা সরাসরি ক্লাউড শিট থেকে রিফ্রেশ করার হ্যান্ডলার
  const handleRefreshCustomers = async () => {
    if (!settings.apiUrl || !settings.apiUrl.trim()) {
      showToast('API URL কনফিগার করা নেই। Settings এ গিয়ে URL দিন।', 'warning');
      return;
    }
    try {
      const freshCustomers = await fetchCustomers(settings.apiUrl);
      const realCusts = (freshCustomers || []).filter((c) => !isDummyCustomer(c));
      setCustomers(realCusts);
      saveLocalCustomers(realCusts);
      showToast(`গুগল শিট থেকে ${realCusts.length} জন গ্রাহক ডাটা সিঙ্ক হয়েছে!`, 'success');
    } catch (err) {
      showToast(`গ্রাহক ডাটা সিঙ্ক ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ব্যবহারকারী ডাটা সরাসরি ক্লাউড শিট থেকে রিফ্রেশ করার হ্যান্ডলার
  const handleRefreshUsers = async () => {
    if (!settings.apiUrl || !settings.apiUrl.trim()) {
      showToast('API URL কনফিগার করা নেই। Settings এ গিয়ে URL দিন।', 'warning');
      return;
    }
    try {
      const freshUsers = await fetchUsers(settings.apiUrl);
      if (Array.isArray(freshUsers)) {
        setUsers(freshUsers);
        saveLocalUsers(freshUsers);
        showToast(`গুগল শিট থেকে ${freshUsers.length} জন ব্যবহারকারীর তথ্য সিঙ্ক হয়েছে!`, 'success');
      }
    } catch (err) {
      showToast(`ইউজার ডাটা সিঙ্ক ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // কম্পোনেন্ট মাউন্ট হলে স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক ও ডেমো ডাটা পরিষ্কারকরণ
  useEffect(() => {
    const cleanReal = clearDemoData();
    setProducts(cleanReal);
    const cleanCustomers = clearDemoCustomers();
    setCustomers(Array.isArray(cleanCustomers) ? cleanCustomers : []);
    const targetUrl = (settings.apiUrl || DEFAULT_APPS_SCRIPT_URL || '').trim();
    if (targetUrl) {
      handleSync(false, targetUrl);
    }
  }, [settings.apiUrl]);

  // কার্ট পরিবর্তন হলে লোকাল স্টোরেজে সংরক্ষণ
  useEffect(() => {
    saveLocalCart(cart);
  }, [cart]);

  // ফেজ ১: সাউন্ড এফেক্ট টগল হ্যান্ডলার
  const handleToggleSound = () => {
    const nextState = !isSoundActive;
    setIsSoundActive(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playBarcodeBeep();
      showToast('সাউন্ড ইফেক্ট অন করা হয়েছে।', 'info');
    } else {
      showToast('সাউন্ড ইফেক্ট মিউট করা হয়েছে।', 'info');
    }
  };

  // ফেজ ১: গ্লোবাল পিওএস কিবোর্ড শর্টকাট ইঞ্জিন (F1-F10 & Hotkeys)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Shift + ? => কিবোর্ড শর্টকাট সহায়িকা মডাল
      if (e.shiftKey && (e.key === '?' || e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Escape => যেকোনো সক্রিয় মডাল বন্ধ করা
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isHeldCartsModalOpen) {
          setIsHeldCartsModalOpen(false);
          return;
        }
        if (isInvoiceModalOpen) {
          setIsInvoiceModalOpen(false);
          return;
        }
        if (fabricCutProduct) {
          setFabricCutProduct(null);
          return;
        }
        if (isTailoringModalOpen) {
          setIsTailoringModalOpen(false);
          return;
        }
        if (isFabricWastageModalOpen) {
          setIsFabricWastageModalOpen(false);
          return;
        }
      }

      // ফাংশন কি-সমূহ (F1 - F10)
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentView('pos');
        setTimeout(() => {
          const el = document.getElementById('pos-product-search-input');
          if (el) {
            el.focus();
            el.select();
          }
        }, 50);
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleHoldCurrentCart();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsHeldCartsModalOpen((prev) => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentView('pos');
        setIsBarcodeModalOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setTailoringPreloadData(null);
        setCurrentView('tailoring');
        setIsTailoringModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCurrentView('cart');
        setTimeout(() => {
          const el = document.getElementById('pos-coupon-discount-input');
          if (el) {
            el.focus();
            el.select();
          }
        }, 50);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart && cart.length > 0) {
          setCurrentView('checkout');
        } else {
          showToast('চেকআউটে যেতে কার্টে পণ্য যোগ করুন!', 'warning');
          playWarningBeep();
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleOpenInvoiceLookup('');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    cart,
    heldCarts,
    isShortcutsModalOpen,
    isHeldCartsModalOpen,
    isInvoiceModalOpen,
    isTailoringModalOpen,
    isFabricWastageModalOpen,
    fabricCutProduct
  ]);

  // ৪. কার্ট অপারেশনসমূহ (সাপোর্টস সিম্পল পণ্য, সাইজ/রং ভ্যারিয়েন্ট, গজ কাপড় থান এবং কম্বো বান্ডেল)
  const handleAddToCart = (product, qtyToAdd = 1, fromFabricModal = false) => {
    // গজ কাপড়ের ক্ষেত্রে যদি পৃথক গজ-গিরা মডাল থেকে না আসে এবং পরিমাণ সুনির্দিষ্ট না থাকে, তবে গজ-গিরা সিলেক্টর ওপেন করুন
    const isFabric = isFabricUnit(product.Unit || product.unit);
    if (isFabric && !fromFabricModal && qtyToAdd === 1) {
      setFabricCutProduct(product);
      return;
    }
    const isVariant = Boolean(product.variantId || product.VariantID || product._selectedVariant);
    const variantId = product.variantId || product.VariantID || product._selectedVariant?.VariantID || null;
    const variantName = product.variantName || (product._selectedVariant ? [product._selectedVariant.Size, product._selectedVariant.Color, product._selectedVariant.Weight, product._selectedVariant.Title].filter(Boolean).join(' / ') : '');
    const cartItemId = variantId ? `${product.ProductID}__${variantId}` : product.ProductID;

    const existingIndex = cart.findIndex((item) => {
      const itemId = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
      return itemId === cartItemId;
    });

    const isCustomerUser = Boolean(!activeUser || activeUser.Role === 'Customer');
    const godownStock = Number(product.GodownStock || 0);
    const shopStock = Number(product.StockQuantity || 0);
    // অনলাইন কাস্টমারদের জন্য গোডাউন ও দোকান মিলিয়ে মোট স্টক প্রযোজ্য; দোকানে কাউন্টার বিক্রয়ে দোকান স্টক প্রযোজ্য
    const availableStock = isCustomerUser ? (shopStock + godownStock) : shopStock;
    const addQty = Math.max(0.001, Number(qtyToAdd) || 1);
    const displayName = `${product.ProductName}${variantName ? ` (${variantName})` : ''}`;

    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + addQty > availableStock) {
        showToast(`'${displayName}' এর পর্যাপ্ত স্টক নেই! (সর্বোচ্চ: ${availableStock})`, 'warning');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += addQty;
      if (product.SellingPrice && Number(product.SellingPrice) !== Number(cart[existingIndex].sellingPrice)) {
        updatedCart[existingIndex].sellingPrice = Number(product.SellingPrice);
        updatedCart[existingIndex].isBargained = Boolean(product.isBargained);
        if (product.originalSellingPrice) {
          updatedCart[existingIndex].originalSellingPrice = Number(product.originalSellingPrice);
        }
      }
      setCart(updatedCart);
      playBarcodeBeep();
      showToast(`'${displayName}' কার্টে যোগ হয়েছে (+${addQty})`, 'success');
    } else {
      if (availableStock <= 0) {
        if (!isCustomerUser && godownStock > 0) {
          showToast(`'${displayName}' দোকানে স্টক শেষ, তবে গোডাউনে ${godownStock} ${product.Unit || 'টি'} আছে। চালান করে দোকানে নিয়ে আসুন।`, 'warning');
        } else {
          showToast(`'${displayName}' স্টক শেষ!`, 'error');
        }
        playWarningBeep();
        return;
      }
      if (addQty > availableStock) {
        showToast(`'${displayName}' এর পর্যাপ্ত স্টক নেই! (সর্বোচ্চ: ${availableStock})`, 'warning');
        playWarningBeep();
        return;
      }
      const newItem = {
        cartItemId: cartItemId,
        productId: product.ProductID,
        variantId: variantId,
        variantName: variantName,
        barcode: product.Barcode || '',
        productName: product.ProductName,
        sellingPrice: Number(product.SellingPrice),
        costPrice: Number(product.CostPrice) || 0,
        minSellingPrice: Number(product.MinSellingPrice !== undefined ? product.MinSellingPrice : (product.minSellingPrice || product.CostPrice || 0)),
        originalSellingPrice: Number(product.originalSellingPrice || product.SellingPrice),
        isBargained: Boolean(product.isBargained),
        stockQuantity: availableStock,
        unit: product.Unit || 'Pcs',
        quantity: addQty,
        imageUrl: product.ImageUrl || '',
        isBundle: Boolean(product.IsBundle),
        bundleItems: product.BundleItems || product.bundleItems || []
      };
      setCart([...cart, newItem]);
      playBarcodeBeep();
      showToast(`'${displayName}' কার্টে যোগ হয়েছে (+${addQty})`, 'success');
    }
  };

  const handleUpdateQuantity = (itemIdentifier, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(itemIdentifier);
      return;
    }

    const updatedCart = cart.map((item) => {
      const currentId = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
      if (currentId === itemIdentifier || item.productId === itemIdentifier) {
        const availableStock = item.stockQuantity !== undefined ? Number(item.stockQuantity) : 9999;
        const validQty = Math.min(newQty, availableStock);
        if (newQty > availableStock) {
          showToast(`সর্বোচ্চ স্টক সীমা অতিক্রম করেছে (${availableStock})`, 'warning');
        }
        return { ...item, quantity: validQty };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const handleRemoveItem = (itemIdentifier) => {
    setCart(cart.filter((item) => {
      const currentId = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
      return currentId !== itemIdentifier && item.productId !== itemIdentifier;
    }));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // কাউন্টার অর্ডার হোল্ড হ্যান্ডলার (সিরিয়ালের পরবর্তী কাস্টমারকে বিদায় দেওয়ার জন্য)
  const handleHoldCurrentCart = (customNoteOrName) => {
    if (!cart || cart.length === 0) {
      showToast('হোল্ড করার মতো কোনো পণ্য কার্টে নেই!', 'warning');
      return null;
    }

    const holdIndex = heldCarts.length + 1;
    const newHeld = {
      id: `HOLD-${Date.now()}`,
      token: customNoteOrName || `কাস্টমার #${holdIndex}`,
      customerName: customNoteOrName || '',
      items: [...cart],
      discountAmount: discountAmount || 0,
      subTotal: cart.reduce((acc, it) => acc + (Number(it.sellingPrice) || 0) * (Number(it.quantity) || 0), 0),
      itemCount: cart.length,
      totalUnits: cart.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
      createdAt: new Date().toISOString()
    };

    const updated = [newHeld, ...heldCarts];
    setHeldCarts(updated);
    saveLocalHeldCarts(updated);

    setCart([]);
    setDiscountAmount(0);
    saveLocalCart([]);

    playHoldSound();
    showToast(`✓ ${newHeld.token} এর অর্ডার হোল্ডে রাখা হয়েছে! নতুন কাস্টমারের অর্ডার নিতে পারেন।`, 'success');
    return newHeld;
  };

  // হোল্ডকৃত অর্ডার পুনরায় সক্রিয় কার্টে চালু করার হ্যান্ডলার
  const handleResumeHeldCart = (heldCartId) => {
    const target = heldCarts.find((h) => h.id === heldCartId);
    if (!target) return;

    let remaining = heldCarts.filter((h) => h.id !== heldCartId);

    // বর্তমান কার্ট যদি খালি না থাকে, তবে বর্তমান কার্টটিকে স্বয়ংক্রিয়ভাবে একটি নতুন হোল্ডে রাখা হবে
    if (cart && cart.length > 0) {
      const autoHoldCurrent = {
        id: `HOLD-${Date.now()}`,
        token: `কাস্টমার #${remaining.length + 1}`,
        customerName: '',
        items: [...cart],
        discountAmount: discountAmount || 0,
        subTotal: cart.reduce((acc, it) => acc + (Number(it.sellingPrice) || 0) * (Number(it.quantity) || 0), 0),
        itemCount: cart.length,
        totalUnits: cart.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
        createdAt: new Date().toISOString()
      };
      remaining = [autoHoldCurrent, ...remaining];
    }

    setHeldCarts(remaining);
    saveLocalHeldCarts(remaining);

    setCart(target.items || []);
    setDiscountAmount(target.discountAmount || 0);
    saveLocalCart(target.items || []);

    setCurrentView('cart');
    setIsHeldCartsModalOpen(false);
    playHoldSound();
    showToast(`✓ ${target.token} সফলভাবে কার্টে চালু করা হয়েছে!`, 'success');
  };

  // হোল্ডকৃত অর্ডার ডিলিট হ্যান্ডলার
  const handleDeleteHeldCart = (heldCartId) => {
    const filtered = deleteHeldCartLocally(heldCartId);
    setHeldCarts(filtered);
    showToast('হোল্ডকৃত অর্ডারটি মুছে ফেলা হয়েছে।', 'info');
  };

  // ==========================================================================
  // ফেজ ২: টেইলারিং ও সেলাই অর্ডার ব্যবস্থাপনা হ্যান্ডলারসমূহ
  // ==========================================================================

  const handleSaveTailoringOrder = (orderPayload) => {
    // ১. দোকানের থান কাপড় ব্যবহার হলে স্টক স্বয়ংক্রিয়ভাবে কর্তন করা
    if (orderPayload.FabricSource === 'store' && orderPayload.FabricProductID && Number(orderPayload.FabricYards) > 0) {
      const pIdx = products.findIndex((p) => String(p.ProductID || p.id).trim() === String(orderPayload.FabricProductID).trim());
      if (pIdx !== -1) {
        const curP = products[pIdx];
        const curStock = Number(curP.StockQuantity !== undefined ? curP.StockQuantity : (curP.CurrentStock || curP.stock || 0));
        const newStock = Math.max(0, Math.round((curStock - Number(orderPayload.FabricYards)) * 10000) / 10000);
        const updatedProds = [...products];
        updatedProds[pIdx] = {
          ...curP,
          StockQuantity: newStock,
          CurrentStock: newStock,
          stock: newStock,
          UpdatedAt: new Date().toISOString()
        };
        setProducts(updatedProds);
        saveLocalProducts(updatedProds);

        // দোকান স্টক কমার খতিয়ানে টেইলারিং থান কাপড় কর্তন সংরক্ষণ
        recordStockMovementLocally({
          location: 'Shop',
          type: 'TAILORING',
          reasonBangla: `টেইলারিং কার্যাদেশ (অর্ডার #${orderPayload.OrderNumber || orderPayload.TokenNo || 'TLR'})`,
          productId: curP.ProductID,
          productName: curP.ProductName,
          barcode: curP.Barcode,
          unit: curP.Unit || 'গজ',
          quantity: Number(orderPayload.FabricYards),
          previousStock: curStock,
          remainingStock: newStock,
          referenceNo: orderPayload.OrderNumber || orderPayload.TokenNo || '',
          operatorName: activeUser?.FullName || 'Tailor Master'
        });
        setStockMovements(getLocalStockMovements());
      }
    }

    const saved = addTailoringOrderLocally(orderPayload);
    setTailoringOrders(getLocalTailoringOrders());
    showToast(`টেইলারিং অর্ডার #${saved.TokenNo} (${saved.OrderID}) সফলভাবে তৈরি হয়েছে!`, 'success');

    // অডিট লগ
    logAuditEventLocally({
      ActionType: 'CREATE_TAILORING_ORDER',
      Module: 'Tailoring',
      Details: `নতুন টেইলারিং অর্ডার #${saved.TokenNo} (${saved.OrderID}), পোশাক: ${saved.GarmentType}, মজুরি: ৳${saved.TotalAmount}, অগ্রিম: ৳${saved.AdvancePaid}`,
      UserID: activeUser?.UserID || 'USER-ADMIN-01',
      UserName: activeUser?.FullName || 'Admin'
    });

    return saved;
  };

  const handleUpdateTailoringOrderStatus = (orderId, newStatus, note) => {
    const updated = updateTailoringOrderStatusLocally(orderId, newStatus, note, activeUser?.FullName || 'Admin');
    if (updated) {
      setTailoringOrders(getLocalTailoringOrders());
      showToast(`অর্ডার #${updated.TokenNo} এর স্ট্যাটাস আপডেট: ${newStatus}`, 'info');

      logAuditEventLocally({
        ActionType: 'UPDATE_TAILORING_STATUS',
        Module: 'Tailoring',
        Details: `টেইলারিং অর্ডার #${updated.TokenNo} (${orderId}) স্ট্যাটাস পরিবর্তন: ${newStatus}`,
        UserID: activeUser?.UserID || 'USER-ADMIN-01',
        UserName: activeUser?.FullName || 'Admin'
      });
    }
    return updated;
  };

  const handleCollectTailoringDue = (orderId, amount, method = 'Cash') => {
    const orders = getLocalTailoringOrders();
    const target = orders.find((o) => o.OrderID === orderId);
    if (!target) return;

    const currentAdv = Number(target.AdvancePaid || 0);
    const newAdv = currentAdv + Number(amount);
    const updated = updateTailoringOrderLocally(orderId, {
      AdvancePaid: newAdv,
      PaymentMethod: method
    });

    setTailoringOrders(getLocalTailoringOrders());
    showToast(`অর্ডার #${target.TokenNo} এর বকেয়া ৳${amount} সফলভাবে আদায় হয়েছে!`, 'success');

    logAuditEventLocally({
      ActionType: 'COLLECT_TAILORING_DUE',
      Module: 'Tailoring',
      Details: `টেইলারিং অর্ডার #${target.TokenNo} (${orderId}) এর বকেয়া ৳${amount} আদায় সম্পন্ন (${method})`,
      UserID: activeUser?.UserID || 'USER-ADMIN-01',
      UserName: activeUser?.FullName || 'Admin'
    });

    return updated;
  };

  const handleDeleteTailoringOrder = (orderId) => {
    const orders = getLocalTailoringOrders();
    const target = orders.find((o) => (o.OrderID || o.orderId) === orderId);
    if (target && target.FabricSource === 'store' && target.FabricProductID && Number(target.FabricYards) > 0) {
      const pIdx = products.findIndex((p) => String(p.ProductID || p.id).trim() === String(target.FabricProductID).trim());
      if (pIdx !== -1) {
        const curP = products[pIdx];
        const curStock = Number(curP.StockQuantity !== undefined ? curP.StockQuantity : (curP.CurrentStock || curP.stock || 0));
        const restoredStock = Math.round((curStock + Number(target.FabricYards)) * 10000) / 10000;
        const updatedProds = [...products];
        updatedProds[pIdx] = {
          ...curP,
          StockQuantity: restoredStock,
          CurrentStock: restoredStock,
          stock: restoredStock,
          UpdatedAt: new Date().toISOString()
        };
        setProducts(updatedProds);
        saveLocalProducts(updatedProds);

        // দোকান স্টকে থান কাপড় পুনরুদ্ধার খতিয়ান সংরক্ষণ
        recordStockMovementLocally({
          location: 'Shop',
          type: 'CANCEL_RESTORE',
          reasonBangla: `টেইলারিং অর্ডার #${target.TokenNo || target.OrderID} বাতিল হওয়ায় দোকানে থান কাপড় ফেরত`,
          productId: curP.ProductID,
          productName: curP.ProductName,
          barcode: curP.Barcode,
          unit: curP.Unit || 'গজ',
          quantity: Number(target.FabricYards),
          previousStock: curStock,
          remainingStock: restoredStock,
          referenceNo: target.OrderNumber || target.TokenNo || '',
          operatorName: activeUser?.FullName || 'Admin'
        });
        setStockMovements(getLocalStockMovements());
      }
    }

    deleteTailoringOrderLocally(orderId);
    setTailoringOrders(getLocalTailoringOrders());
    showToast('টেইলারিং অর্ডারটি মুছে ফেলা হয়েছে এবং থান কাপড়ের স্টক পুনরুদ্ধার করা হয়েছে।', 'info');
  };

  const handleSendToTailoringFromCart = (fabricItem) => {
    setTailoringPreloadData({
      customerName: '',
      customerPhone: '',
      fabricItem: fabricItem
    });
    setCurrentView('tailoring');
    setIsTailoringModalOpen(true);
  };

  // ==========================================================================
  // ফেজ ২: থান কাপড়ের ছাঁট ও ড্যামেজ ট্র্যাকার হ্যান্ডলারসমূহ
  // ==========================================================================

  const handleRecordFabricWastage = (payload) => {
    let updatedProds = [...products];

    // ১. প্রোডাক্ট স্টক থেকে মোট নষ্ট/ছাঁট গজ বিয়োগ করা
    if (payload.ProductID && payload.TotalYards > 0) {
      const pIdx = updatedProds.findIndex((p) => String(p.ProductID || p.id).trim() === String(payload.ProductID).trim());
      if (pIdx !== -1) {
        const curP = updatedProds[pIdx];
        const curStock = Number(curP.StockQuantity !== undefined ? curP.StockQuantity : (curP.CurrentStock || curP.stock || 0));
        const newStock = Math.max(0, Math.round((curStock - payload.TotalYards) * 10000) / 10000);
        updatedProds[pIdx] = {
          ...curP,
          StockQuantity: newStock,
          CurrentStock: newStock,
          stock: newStock,
          UpdatedAt: new Date().toISOString()
        };

        // দোকান স্টক কমার খতিয়ানে ছাঁট/ওয়েস্টেজ এন্ট্রি সংরক্ষণ
        recordStockMovementLocally({
          location: 'Shop',
          type: 'WASTAGE',
          reasonBangla: `থান কাপড়ের ছাঁট/টুকরা অবশিষ্টাংশ কর্তন (${payload.Reason || 'ছাঁট'})`,
          productId: curP.ProductID,
          productName: curP.ProductName,
          barcode: curP.Barcode,
          unit: curP.Unit || 'গজ',
          quantity: payload.TotalYards,
          previousStock: curStock,
          remainingStock: newStock,
          referenceNo: payload.WastageID || '',
          operatorName: activeUser?.FullName || 'Admin',
          notes: payload.Reason || ''
        });
        setStockMovements(getLocalStockMovements());
      }
    }

    // ২. যদি ক্লিয়ারেন্স ছাঁট প্যাক হিসেবে ক্যাটালগে যুক্ত করতে চায়
    if (payload.CreateBundle && payload.BundlePrice > 0) {
      const newBundleItem = {
        ProductID: `BUNDLE-${Date.now().toString().slice(-6)}`,
        ProductName: `[ছাঁট প্যাক] ${payload.ProductName} (${payload.TotalYards} গজ)`,
        Category: 'ছাঁট ও বান্ডিল',
        CostPrice: payload.LossAmount,
        SellingPrice: payload.BundlePrice,
        StockQuantity: 1,
        CurrentStock: 1,
        Unit: 'প্যাক',
        Barcode: `BND${Date.now().toString().slice(-6)}`,
        Description: `থানের শেষ অবশিষ্টাংশ ছাঁট প্যাক (${payload.TotalYards} গজ)`
      };
      updatedProds = [newBundleItem, ...updatedProds];
    }

    setProducts(updatedProds);
    saveLocalProducts(updatedProds);

    // ৩. ছাঁট ও ড্যামেজ লগে সংরক্ষণ
    const saved = addFabricWastageLocally(payload);
    setFabricWastageList(getLocalFabricWastage());
    showToast(`ছাঁট/ড্যামেজ (${payload.TotalYards} গজ) রেকর্ড ও স্টক সফলভাবে সমন্বয় করা হয়েছে!`, 'success');

    // ৪. অডিট লগ
    logAuditEventLocally({
      ActionType: 'RECORD_FABRIC_WASTAGE',
      Module: 'Inventory',
      Details: `কাপড়ের অপচয় রেকর্ড: ${payload.ProductName}, পরিমাণ: ${payload.TotalYards} গজ, ক্ষতি: ৳${payload.LossAmount}, কারণ: ${payload.Reason}`,
      UserID: activeUser?.UserID || 'USER-ADMIN-01',
      UserName: activeUser?.FullName || 'Admin'
    });

    return saved;
  };

  const handleDeleteFabricWastage = (recordId) => {
    const list = getLocalFabricWastage();
    const target = list.find((r) => (r.WastageID || r.wastageId) === recordId);
    if (target && target.ProductID && Number(target.TotalYards) > 0) {
      const pIdx = products.findIndex((p) => String(p.ProductID || p.id).trim() === String(target.ProductID).trim());
      if (pIdx !== -1) {
        const curP = products[pIdx];
        const curStock = Number(curP.StockQuantity !== undefined ? curP.StockQuantity : (curP.CurrentStock || curP.stock || 0));
        const restoredStock = Math.round((curStock + Number(target.TotalYards)) * 10000) / 10000;
        const updatedProds = [...products];
        updatedProds[pIdx] = {
          ...curP,
          StockQuantity: restoredStock,
          CurrentStock: restoredStock,
          stock: restoredStock,
          UpdatedAt: new Date().toISOString()
        };
        setProducts(updatedProds);
        saveLocalProducts(updatedProds);

        // দোকান স্টকে ছাঁট কাপড় পুনরুদ্ধার খতিয়ান সংরক্ষণ
        recordStockMovementLocally({
          location: 'Shop',
          type: 'CANCEL_RESTORE',
          reasonBangla: `ছাঁট/ড্যামেজ রেকর্ড বাতিল হওয়ায় দোকানে কাপড় ফেরত`,
          productId: curP.ProductID,
          productName: curP.ProductName,
          barcode: curP.Barcode,
          unit: curP.Unit || 'গজ',
          quantity: Number(target.TotalYards),
          previousStock: curStock,
          remainingStock: restoredStock,
          referenceNo: target.WastageID || '',
          operatorName: activeUser?.FullName || 'Admin'
        });
        setStockMovements(getLocalStockMovements());
      }
    }

    deleteFabricWastageLocally(recordId);
    setFabricWastageList(getLocalFabricWastage());
    showToast('ছাঁট/ড্যামেজ রেকর্ডটি মুছে ফেলা হয়েছে এবং স্টক পুনরুদ্ধার করা হয়েছে।', 'info');
  };

  // কাস্টমারের সাথে দামাদামির জন্য কার্টের পণ্যের বিক্রয়মূল্য পরিবর্তন (ফ্লোর প্রাইস সুরক্ষা সহ)
  const handleUpdateItemPrice = (itemIdentifier, newPrice) => {
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('সঠিক মূল্য প্রদান করুন', 'error');
      return false;
    }

    let isViolatingFloor = false;
    let floorVal = 0;
    let violatingItemName = '';

    const updatedCart = cart.map((item) => {
      const currentId = item.cartItemId || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
      if (currentId === itemIdentifier || item.productId === itemIdentifier) {
        const minFloor = Number(item.minSellingPrice !== undefined ? item.minSellingPrice : (item.costPrice || 0));
        if (parsedPrice < minFloor) {
          isViolatingFloor = true;
          floorVal = minFloor;
          violatingItemName = item.productName;
          return item;
        }
        return {
          ...item,
          sellingPrice: parsedPrice,
          isBargained: true,
        };
      }
      return item;
    });

    if (isViolatingFloor) {
      const curSym = settings.CurrencySymbol || '৳';
      playWarningBeep();
      showToast(`দামাদামির সীমা লঙ্ঘন: '${violatingItemName}' এর নূন্যতম ফ্লোর প্রাইস ${curSym}${floorVal.toFixed(2)} এর নিচে যাওয়া যাবে না!`, 'error');
      return false;
    }

    setCart(updatedCart);
    saveLocalCart(updatedCart);
    showToast('পণ্যের দরদাম মূল্য সফলভাবে প্রযোজ্য হয়েছে!', 'success');
    return true;
  };

  // ৫. নতুন স্টক সাবমিট হ্যান্ডলার (Cumulative Stock Input with Variant & Location Support)
  const handleSubmitStock = async (stockPayload) => {
    const targetId = String(stockPayload.productId || '').trim();
    const incoming = Number(stockPayload.incomingQty) || 0;
    const location = stockPayload.location || 'Godown';
    const updatedVariants = stockPayload.updatedVariants || null;
    const isThanUnit = Boolean(stockPayload.isThanUnit);
    const inThans = Number(stockPayload.incomingThans) || (isThanUnit ? incoming : 0);
    const inYards = Number(stockPayload.incomingYards) || 0;

    const updatedProducts = products.map((p) => {
      const isMatch = String(p.ProductID || '').trim() === targetId ||
                      (p.Barcode && String(p.Barcode).trim() === targetId);

      if (isMatch) {
        const prevShopStock = Number(p.StockQuantity || p.StockQuantit || 0);
        const prevGodownStock = Number(p.GodownStock !== undefined ? p.GodownStock : 0);

        let newShopStock = prevShopStock;
        let newGodownStock = prevGodownStock;

        if (location === 'Godown') {
          newGodownStock = prevGodownStock + incoming;
        } else {
          newShopStock = prevShopStock + incoming;
        }

        const prevCost = Number(p.CostPrice || 0);
        const newLotCost = (stockPayload.unitCost !== '' && stockPayload.unitCost !== null && stockPayload.unitCost !== undefined)
          ? Number(stockPayload.unitCost)
          : prevCost;

        // ওয়েইটেড এভারেজ কস্ট (WAC) নির্ণয়
        const targetPrevStock = location === 'Godown' ? prevGodownStock : prevShopStock;
        const targetNewStock = location === 'Godown' ? newGodownStock : newShopStock;
        let weightedCost = newLotCost;
        if (targetNewStock > 0) {
          weightedCost = parseFloat((((targetPrevStock * prevCost) + (incoming * newLotCost)) / targetNewStock).toFixed(2));
        }

        // থান ও গজ হিসাব
        let newTotalThan = Number(p.TotalThan || p.ThanCount || 0);
        let newTotalGoj = Number(p.TotalGoj || p.TotalYards || 0);
        if (isThanUnit) {
          newTotalThan += inThans;
          newTotalGoj += inYards;
        }

        // লোকাল স্টক মুভমেন্ট লেজারে অডিট রেকর্ড
        try {
          recordStockMovementLocally({
            location: location,
            type: 'LOT_IN',
            reasonBangla: `নতুন লট রিস্টক (${stockPayload.supplierName || 'সরবরাহকারী'})${isThanUnit ? ` - ${inThans} থান (${inYards} গজ)` : ''} [${stockPayload.notes || 'লট এন্ট্রি'}]`,
            productId: p.ProductID,
            productName: p.ProductName,
            barcode: p.Barcode,
            unit: isThanUnit ? 'থান' : (p.Unit || 'Pcs'),
            quantity: incoming,
            previousStock: targetPrevStock,
            remainingStock: targetNewStock,
          });
        } catch (e) {
          console.warn('Movement logging error:', e);
        }

        return {
          ...p,
          StockQuantity: newShopStock,
          StockQuantit: newShopStock,
          GodownStock: newGodownStock,
          CostPrice: weightedCost,
          Variants: updatedVariants || p.Variants,
          variants: updatedVariants || p.variants || p.Variants,
          VariantsJSON: updatedVariants ? JSON.stringify(updatedVariants) : (p.VariantsJSON || ''),
          HasVariants: (updatedVariants && updatedVariants.length > 0) ? 'TRUE' : p.HasVariants,
          hasVariants: (updatedVariants && updatedVariants.length > 0) ? true : p.hasVariants,
          TotalThan: isThanUnit ? newTotalThan : p.TotalThan,
          TotalGoj: isThanUnit ? newTotalGoj : p.TotalGoj,
          ThanCount: isThanUnit ? newTotalThan : p.ThanCount,
          TotalYards: isThanUnit ? newTotalGoj : p.TotalYards,
          UpdatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    saveLocalProducts(updatedProducts);

    if (settings.apiUrl) {
      try {
        const res = await postAddStock(settings.apiUrl, stockPayload);
        if (res.success) {
          const confirmedStock = (res.data && res.data.newStock !== undefined) ? Number(res.data.newStock) : null;
          if (confirmedStock !== null) {
            const verifiedProducts = updatedProducts.map((p) => {
              if (String(p.ProductID || '').trim() === targetId || (p.Barcode && String(p.Barcode).trim() === targetId)) {
                if (location === 'Godown') {
                  return { ...p, GodownStock: confirmedStock };
                }
                return { ...p, StockQuantity: confirmedStock, StockQuantit: confirmedStock };
              }
              return p;
            });
            setProducts(verifiedProducts);
            saveLocalProducts(verifiedProducts);
          }
          showToast(`নতুন স্টক সফলভাবে গুগল শিটে রেকর্ড হয়েছে! (${location === 'Godown' ? '🏭 গোডাউনে' : '🏬 দোকানে'} বর্তমান মজুদ: ${confirmedStock ?? 'আপডেট সম্পন্ন'})`, 'success');
        } else {
          showToast(`সতর্কবার্তা: ${res.message}`, 'warning');
        }
      } catch (err) {
        showToast('নেটওয়ার্ক সমস্যা: লোকাল স্টোরেজে সেভ হয়েছে, পরবর্তীতে সিঙ্ক হবে।', 'warning');
      }
    } else {
      showToast(`অফলাইন মোড: ${location === 'Godown' ? 'গোডাউনে' : 'দোকানে'} স্টক লোকাল স্টোরেজে আপডেট হয়েছে।`, 'success');
    }
  };

  // ৬. বিক্রয় সম্পন্ন ও প্রিন্ট হ্যান্ডলার (Complete Sale & Print)
  const handleCompleteSale = async (saleOrder) => {
    setIsProcessingSale(true);

    try {
      // ১. স্থানীয়ভাবে তাৎক্ষণিক স্টক কর্তন (জিরো-লেটেন্সি) - সাপোর্টস সিম্পল, ভ্যারিয়েন্ট এবং কম্বো বান্ডেল
      let updatedProducts = [...products];

      (saleOrder.items || []).forEach((soldItem) => {
        const itemQty = Number(soldItem.quantity) || 1;
        const targetPid = String(soldItem.productId || '').trim();
        const targetVariantId = soldItem.variantId || soldItem.VariantID || null;

        // মূল পণ্য বা ভ্যারিয়েন্ট স্টক কর্তন
        updatedProducts = updatedProducts.map((p) => {
          if (String(p.ProductID || '').trim() === targetPid) {
            const currentStock = Number(p.StockQuantity) || 0;
            const newStock = Math.max(0, currentStock - itemQty);

            let updatedVariants = p.Variants;
            if (targetVariantId && Array.isArray(p.Variants)) {
              updatedVariants = p.Variants.map((v) => {
                if (String(v.VariantID || v.variantId || '').trim() === String(targetVariantId).trim()) {
                  const vStock = Number(v.StockQuantity) || 0;
                  return {
                    ...v,
                    StockQuantity: Math.max(0, vStock - itemQty)
                  };
                }
                return v;
              });
            }

            return {
              ...p,
              StockQuantity: newStock,
              Variants: updatedVariants,
              UpdatedAt: new Date().toISOString()
            };
          }
          return p;
        });

        // যদি কম্বো/বান্ডেল পণ্য হয়, তবে এর কম্পোনেন্ট সাব-আইটেমগুলোর স্টক কর্তন
        const bundleComponents = soldItem.bundleItems || soldItem.BundleItems || [];
        if (Array.isArray(bundleComponents) && bundleComponents.length > 0) {
          bundleComponents.forEach((bSub) => {
            const subPid = String(bSub.productId || bSub.ProductID || '').trim();
            const subMultiplier = Number(bSub.quantity || bSub.Quantity || 1);
            const totalSubDeduct = subMultiplier * itemQty;

            updatedProducts = updatedProducts.map((p) => {
              if (String(p.ProductID || '').trim() === subPid) {
                const subStock = Number(p.StockQuantity) || 0;
                return {
                  ...p,
                  StockQuantity: Math.max(0, subStock - totalSubDeduct),
                  UpdatedAt: new Date().toISOString()
                };
              }
              return p;
            });
          });
        }
      });

      setProducts(updatedProducts);
      saveLocalProducts(updatedProducts);

      // ২. লোকাল সেলস রেকর্ড তৈরি
      const localInvoiceNo = `INV-${new Date().getTime().toString().slice(-6)}`;

      // দোকান স্টক কমার খতিয়ানে বিক্রয় এন্ট্রি সংরক্ষণ
      itemsToProcess.forEach((soldItem) => {
        const itemQty = Number(soldItem.quantity) || 1;
        const targetPid = String(soldItem.productId || '').trim();
        const foundProd = products.find((p) => String(p.ProductID || '').trim() === targetPid || String(p.Barcode || '').trim() === targetPid);
        const prev = foundProd ? Number(foundProd.StockQuantity || 0) : itemQty;
        const remaining = Math.max(0, prev - itemQty);
        recordStockMovementLocally({
          location: 'Shop',
          type: 'SALE',
          reasonBangla: `কাউন্টার পিওএস বিক্রয় (মেমো #${localInvoiceNo})`,
          productId: foundProd ? foundProd.ProductID : targetPid,
          productName: soldItem.productName || foundProd?.ProductName || 'পণ্য',
          barcode: foundProd?.Barcode || '',
          unit: soldItem.unit || foundProd?.Unit || 'Pcs',
          quantity: itemQty,
          previousStock: prev,
          remainingStock: remaining,
          referenceNo: localInvoiceNo,
          operatorName: activeUser?.FullName || 'Cashier'
        });
      });
      setStockMovements(getLocalStockMovements());
      const salePaid = Number(saleOrder.paidAmount !== undefined ? saleOrder.paidAmount : (saleOrder.paymentMethod === 'Due' ? 0 : saleOrder.grandTotal));
      const saleDue = Number(saleOrder.dueAmount !== undefined ? saleOrder.dueAmount : (saleOrder.paymentMethod === 'Due' ? saleOrder.grandTotal : 0));

      const completedSaleRecord = {
        saleId: `SALE-${new Date().getTime()}`,
        invoiceNo: localInvoiceNo,
        timestamp: new Date().toISOString(),
        customerId: saleOrder.customerId,
        customerName: saleOrder.customerName,
        customerPhone: saleOrder.customerPhone,
        items: saleOrder.items,
        subTotal: saleOrder.subTotal,
        taxPercent: saleOrder.taxPercent,
        taxAmount: saleOrder.taxAmount,
        discountAmount: saleOrder.discountAmount,
        grandTotal: saleOrder.grandTotal,
        paidAmount: salePaid,
        dueAmount: saleDue,
        splitPayments: saleOrder.splitPayments || null,
        paymentMethod: saleOrder.paymentMethod,
        cashierEmail: activeUser?.Email || 'guest@store.local',
      };

      saveSaleLocally(completedSaleRecord);
      setSalesHistory([completedSaleRecord, ...salesHistory]);

      // ২.১ ওমনিচ্যানেল ইউনিফাইড অর্ডার সিস্টেমে ইন-স্টোর (POS) অর্ডার তৈরি ও সেভ করা
      const posOrderRecord = {
        OrderID: localInvoiceNo,
        OrderNumber: localInvoiceNo,
        OrderDate: completedSaleRecord.timestamp,
        CustomerName: saleOrder.customerName || 'কাউন্টার কাস্টমার',
        CustomerPhone: saleOrder.customerPhone || '',
        CustomerAddress: saleOrder.customerAddress || 'ইন-স্টোর কাউন্টার',
        OrderSource: 'In-Store / POS',
        Items: (saleOrder.items || []).map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: Number(i.quantity) || 1,
          sellingPrice: Number(i.sellingPrice) || 0,
          costPrice: Number(i.costPrice) || 0,
          category: i.category || 'General',
          barcode: i.barcode || ''
        })),
        SubTotal: Number(saleOrder.subTotal) || 0,
        DiscountAmount: Number(saleOrder.discountAmount) || 0,
        DeliveryCharge: 0,
        TotalAmount: Number(saleOrder.grandTotal) || 0,
        AdvancePaid: salePaid,
        DueAmount: saleDue,
        CourierName: 'Counter Pickup',
        Status: 'Delivered',
        PaymentStatus: saleDue > 0 ? (salePaid > 0 ? 'Partial' : 'Unpaid') : 'Paid',
        PaymentMethod: saleOrder.paymentMethod || 'Cash',
        RiskLevel: 'Low',
        StockReserved: true,
        CreatedBy: activeUser?.FullName || activeUser?.Email || 'POS Cashier',
        ActivityLog: [
          {
            timestamp: new Date().toISOString(),
            action: 'ইন-স্টোর পিওএস (POS) কাউন্টার থেকে সরাসরি বিক্রয় ও ক্যাশ মেমো সম্পন্ন',
            actor: activeUser?.FullName || 'POS Cashier'
          }
        ]
      };
      saveOrUpdateOrderLocally(posOrderRecord);
      setOrders(getLocalOrders());

      // ৩. কার্ট খালি করা এবং ভিউ রিসেট করা
      setCart([]);
      setDiscountAmount(0);
      playCashChime();
      setCurrentView('pos');

      // ৩.১ গ্রাহক ডাটাবেস ও বাকির খাতা আপডেট (Customer Database & Ledger Persistence)
      if (saleOrder.customerName || saleOrder.customerPhone) {
        const updatedCustList = saveOrUpdateCustomerLocally({
          CustomerName: saleOrder.customerName,
          Phone: saleOrder.customerPhone,
          Email: saleOrder.customerEmail,
          Address: saleOrder.customerAddress,
          CustomerType: saleOrder.customerType,
          CustomerID: saleOrder.customerId,
        }, saleOrder.grandTotal, saleDue, salePaid, Number(saleOrder.loyaltyEarned) || 0, Number(saleOrder.loyaltyRedeemed) || 0);
        setCustomers(updatedCustList);

        // যদি বিক্রয়ে বকেয়া (Due) থাকে, তবে কাস্টমার লেজারে ডেবিট (Sale on Credit) এন্ট্রি সংরক্ষণ
        if (saleDue > 0) {
          const custId = saleOrder.customerId || updatedCustList.find(c => c.Phone === saleOrder.customerPhone)?.CustomerID || `CUST-${saleOrder.customerPhone}`;
          recordCustomerLedgerEntryLocally({
            CustomerID: custId,
            CustomerName: saleOrder.customerName,
            CustomerPhone: saleOrder.customerPhone,
            OrderID: localInvoiceNo,
            InvoiceNo: localInvoiceNo,
            EntryType: 'Sale',
            Debit: saleDue,
            Credit: 0,
            PaymentMethod: saleOrder.paymentMethod,
            TrxID: saleOrder.transactionRef || '',
            CollectedBy: activeUser?.FullName || activeUser?.Email || 'POS Cashier',
            Notes: saleOrder.paymentMethod === 'Split' ? 'মাল্টি-পেমেন্ট স্প্লিট বাকি' : 'ইনভয়েস বিক্রয়ের বাকি'
          });
          setCustomerLedger(getLocalCustomerLedger());
        }

        // অসম্পূর্ণ কার্ট যদি অর্ডার করা হয়ে থাকে, তবে স্বয়ংক্রিয়ভাবে 'Recovered' মার্ক করা
        if (saleOrder.cartId) {
          const updatedCarts = updateAbandonedCartStatusLocally(saleOrder.cartId, 'Recovered', `অর্ডার সম্পন্ন: ${localInvoiceNo}`);
          setAbandonedCarts(updatedCarts);
        }
      }

      // ৪. যদি ইউজার 'বিক্রয় ও প্রিন্ট করুন' চেপে থাকেন, তবে ইনভয়েস ডায়ালগ চালু
      if (saleOrder.shouldPrint) {
        setActiveInvoiceData(completedSaleRecord);
        setAutoTriggerPrint(true);
        setIsInvoiceModalOpen(true);
      }

      // ৫. ব্যাকএন্ড API-এ অর্ডার পুশ
      if (settings.apiUrl) {
        try {
          const response = await postCreateSale(settings.apiUrl, {
            items: saleOrder.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              sellingPrice: i.sellingPrice,
              costPrice: i.costPrice,
            })),
            customerName: saleOrder.customerName,
            customerPhone: saleOrder.customerPhone,
            customerEmail: saleOrder.customerEmail || '',
            customerAddress: saleOrder.customerAddress || '',
            customerType: saleOrder.customerType || 'Regular',
            customerId: saleOrder.customerId || '',
            notes: saleOrder.orderNotes || '',
            discountAmount: saleOrder.discountAmount,
            paymentMethod: saleOrder.paymentMethod,
            receivedCash: saleOrder.receivedCash,
            changeDue: saleOrder.changeDue,
            transactionRef: saleOrder.transactionRef,
            paidAmount: salePaid,
            dueAmount: saleDue,
            splitPayments: saleOrder.splitPayments || null,
            loyaltyEarned: Number(saleOrder.loyaltyEarned) || 0,
            loyaltyRedeemed: Number(saleOrder.loyaltyRedeemed) || 0,
            cartId: saleOrder.cartId || '',
            cashierEmail: activeUser?.Email || 'guest@store.local',
          });

          if (response.success && response.data) {
            const serverInvoiceNo = response.data.invoiceNo;
            completedSaleRecord.invoiceNo = serverInvoiceNo;
            saveSaleLocally(completedSaleRecord);
            setSalesHistory(getLocalSalesHistory());

            // ক্লাউড ইনভয়েস নম্বরে লোকাল অর্ডারও আপডেট
            posOrderRecord.OrderID = serverInvoiceNo;
            posOrderRecord.OrderNumber = serverInvoiceNo;
            saveOrUpdateOrderLocally(posOrderRecord);
            setOrders(getLocalOrders());

            if (saleOrder.shouldPrint) {
              setActiveInvoiceData({ ...completedSaleRecord });
            }
            showToast(`অর্ডার সম্পন্ন! ইনভয়েস: ${serverInvoiceNo}`, 'success');
          } else {
            showToast('অর্ডার লোকালভাবে সফল হয়েছে, শিট সিঙ্ক অপেক্ষমান।', 'warning');
          }
        } catch (apiErr) {
          addToOfflineQueue(completedSaleRecord);
          showToast('অফলাইন মোড: অর্ডার লোকাল ক্যাশে সেভ হয়েছে।', 'info');
        }
      } else {
        showToast('অর্ডার সফলভাবে সম্পন্ন হয়েছে!', 'success');
      }

      // ফেজ ৭: স্টোর ক্রেডিট ভাউচার ব্যবহার করা হয়ে থাকলে তা রিডিম হিসেবে চিহ্নিত করা
      if (saleOrder.creditNoteCode) {
        handleRedeemStoreCredit(saleOrder.creditNoteCode).catch(() => {});
      }

    } catch (error) {
      showToast(`অর্ডার সম্পন্ন করতে সমস্যা: ${error.message}`, 'error');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // ৬.১ কাস্টমার বকেয়া আদায় হ্যান্ডলার (Customer Payment / Due Collection)
  const handleRecordCustomerPayment = async (paymentData) => {
    try {
      const result = recordCustomerPaymentLocally({
        ...paymentData,
        CollectedBy: activeUser?.FullName || activeUser?.Email || 'POS Cashier'
      });
      setCustomerLedger(getLocalCustomerLedger());
      setCustomers(getLocalCustomers());
      showToast(`৳${paymentData.amount} বকেয়া আদায় সফলভাবে লিপিবদ্ধ হয়েছে!`, 'success');

      if (settings.apiUrl) {
        try {
          await postRecordCustomerPayment(settings.apiUrl, {
            ...paymentData,
            CollectedBy: activeUser?.FullName || activeUser?.Email || 'POS Cashier'
          });
        } catch (cloudErr) {
          console.warn('Customer payment cloud sync delayed:', cloudErr);
        }
      }
      return result;
    } catch (err) {
      showToast(`বকেয়া আদায় এন্ট্রি ব্যর্থ: ${err.message}`, 'error');
      throw err;
    }
  };

  // ৬.২ কাস্টমার ক্রেডিট লিমিট আপডেট হ্যান্ডলার
  const handleUpdateCustomerCreditLimit = async (customerId, creditLimit, customerPhone) => {
    try {
      const updatedCustList = updateCustomerCreditLimitLocally(customerId, creditLimit, customerPhone);
      setCustomers(updatedCustList);
      showToast(`ক্রেডিট লিমিট আপডেট হয়েছে: ৳${Number(creditLimit).toLocaleString('en-IN')}`, 'success');

      if (settings.apiUrl) {
        try {
          await postUpdateCustomerCreditLimit(settings.apiUrl, customerId, creditLimit, customerPhone);
        } catch (cloudErr) {
          console.warn('Credit limit cloud sync delayed:', cloudErr);
        }
      }
    } catch (err) {
      showToast(`ক্রেডিট লিমিট আপডেট ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ৬.৪ অর্ডার ম্যানেজমেন্ট হ্যান্ডলারসমূহ (Order Management Handlers)
  const handleSaveOrder = async (orderData) => {
    try {
      // ১. যদি স্টক রিজার্ভ অন থাকে, তাৎক্ষণিকভাবে পণ্যগুলোর স্টক কর্তন (জিরো-লেটেন্সি)
      if (orderData.StockReserved && Array.isArray(orderData.Items)) {
        const updatedProducts = products.map((p) => {
          const item = orderData.Items.find((i) => (i.productId || i.ProductID) === p.ProductID);
          if (item) {
            const currentStock = Number(p.StockQuantity) || 0;
            return {
              ...p,
              StockQuantity: Math.max(0, currentStock - Number(item.quantity)),
              UpdatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
        setProducts(updatedProducts);
        saveLocalProducts(updatedProducts);
      }

      // ২. কাস্টমার ডাটাবেস আপডেট (Customer Database Persistence)
      if (orderData.CustomerName && orderData.CustomerPhone) {
        const updatedCustList = saveOrUpdateCustomerLocally({
          CustomerName: orderData.CustomerName,
          Phone: orderData.CustomerPhone,
          Address: orderData.CustomerAddress,
          CustomerType: 'Regular',
        }, orderData.TotalAmount);
        setCustomers(updatedCustList);
      }

      // ৩. লোকাল অর্ডারে সেভ
      const updatedOrders = saveOrUpdateOrderLocally(orderData);
      setOrders(updatedOrders);
      showToast(`অর্ডার ${orderData.OrderID} সফলভাবে তৈরি হয়েছে!`, 'success');

      // ৪. গুগল শিট ব্যাকএন্ডে সিঙ্ক
      if (settings.apiUrl) {
        try {
          await postCreateOrder(settings.apiUrl, orderData);
        } catch (apiErr) {
          console.warn('Order cloud sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`অর্ডার তৈরি করতে সমস্যা: ${err.message}`, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, trackingId = null, courierName = null) => {
    try {
      const targetOrder = orders.find((o) => o.OrderID === orderId);
      if (!targetOrder) return;

      const prevStatus = targetOrder.Status;

      // ১. অটোমেটিক রিস্টক (Restock on Return or Cancellation)
      if (
        (newStatus === 'Returned' || newStatus === 'Cancelled') &&
        prevStatus !== 'Returned' &&
        prevStatus !== 'Cancelled' &&
        targetOrder.StockReserved &&
        Array.isArray(targetOrder.Items)
      ) {
        const restockedProducts = products.map((p) => {
          const item = targetOrder.Items.find((i) => (i.productId || i.ProductID) === p.ProductID);
          if (item) {
            const currentStock = Number(p.StockQuantity) || 0;
            return {
              ...p,
              StockQuantity: currentStock + Number(item.quantity),
              UpdatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
        setProducts(restockedProducts);
        saveLocalProducts(restockedProducts);
        showToast('রিটার্ন/বাতিলকৃত পণ্যের স্টক মূল ইনভেন্টরিতে ফেরত যোগ করা হয়েছে!', 'info');
      }

      // বিপরীতভাবে: যদি পূর্বে রিটার্ন/ক্যানসেল ছিল এবং এখন আবার কনফার্ম বা ডেলিভারি করা হয়
      if (
        (prevStatus === 'Returned' || prevStatus === 'Cancelled') &&
        newStatus !== 'Returned' &&
        newStatus !== 'Cancelled' &&
        targetOrder.StockReserved &&
        Array.isArray(targetOrder.Items)
      ) {
        const deductedProducts = products.map((p) => {
          const item = targetOrder.Items.find((i) => (i.productId || i.ProductID) === p.ProductID);
          if (item) {
            const currentStock = Number(p.StockQuantity) || 0;
            return {
              ...p,
              StockQuantity: Math.max(0, currentStock - Number(item.quantity)),
              UpdatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
        setProducts(deductedProducts);
        saveLocalProducts(deductedProducts);
      }

      // ২. লোকাল স্টোরেজে স্ট্যাটাস আপডেট
      const updatedOrders = updateOrderStatusLocally(orderId, newStatus, trackingId, courierName);
      setOrders(updatedOrders);
      showToast(`অর্ডার ${orderId} স্ট্যাটাস '${newStatus}'-এ পরিবর্তিত হয়েছে।`, 'success');

      // ৩. ক্লাউড সিঙ্ক
      if (settings.apiUrl) {
        try {
          await postUpdateOrderStatus(settings.apiUrl, {
            orderId,
            status: newStatus,
            trackingId: trackingId !== null ? trackingId : targetOrder.TrackingID,
            courierName: courierName !== null ? courierName : targetOrder.CourierName,
          });
        } catch (apiErr) {
          console.warn('Update order status cloud sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`স্ট্যাটাস পরিবর্তন ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // বাল্ক অর্ডার স্ট্যাটাস আপডেট হ্যান্ডলার (Bulk Order Status Updater)
  const handleBulkUpdateStatus = async (orderIds, newStatus) => {
    if (!orderIds || orderIds.length === 0) return;
    try {
      let latestOrders = getLocalOrders();
      for (const id of orderIds) {
        latestOrders = updateOrderStatusLocally(id, newStatus, null, null, activeUser?.FullName || 'Admin');
      }
      setOrders(latestOrders);
      showToast(`${orderIds.length}টি অর্ডারের স্ট্যাটাস সফলভাবে '${newStatus}'-এ আপডেট হয়েছে!`, 'success');

      if (settings.apiUrl) {
        await postBulkUpdateOrderStatus(settings.apiUrl, {
          orderIds: orderIds,
          status: newStatus
        });
      }
    } catch (err) {
      showToast(`বাল্ক আপডেট ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // Steadfast Courier ১-ক্লিক বাল্ক বুকিং হ্যান্ডলার
  const handleSteadfastBulkDispatch = async (selectedOrders) => {
    if (!selectedOrders || selectedOrders.length === 0) {
      return { success: false, message: 'বুকিংয়ের জন্য কোনো অর্ডার পাওয়া যায়নি।' };
    }
    if (!settings.apiUrl) {
      showToast('গুগল শিট API URL পাওয়া যায়নি। Settings চেক করুন।', 'error');
      return { success: false, message: 'API URL অনুপস্থিত' };
    }

    try {
      const res = await postSteadfastBulkDispatch(settings.apiUrl, {
        orders: selectedOrders,
        apiKey: settings.SteadfastApiKey,
        secretKey: settings.SteadfastSecretKey
      });

      if (res.success) {
        let latestOrders = getLocalOrders();
        selectedOrders.forEach(ord => {
          const inv = String(ord.OrderNumber || ord.orderNumber || ord.OrderID || ord.orderId || '').trim();
          const trk = (res.data?.trackingMap && res.data.trackingMap[inv]) || '';
          const cid = (res.data?.consignmentMap && res.data.consignmentMap[inv]) || '';
          latestOrders = updateOrderStatusLocally(
            ord.OrderID || ord.orderId,
            'In Transit',
            trk || null,
            'Steadfast',
            activeUser?.FullName || 'Admin',
            cid || null
          );
        });
        setOrders(latestOrders);
        showToast(res.message || `${selectedOrders.length}টি অর্ডার Steadfast-এ সফলভাবে বুকিং হয়েছে!`, 'success');
      } else {
        showToast(`Steadfast বুকিং ব্যর্থ: ${res.message}`, 'error');
      }
      return res;
    } catch (err) {
      showToast(`Steadfast সার্ভার ত্রুটি: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  // Steadfast লাইভ ট্র্যাকিং স্ট্যাটাস চেক
  const handleSteadfastCheckStatus = async (order) => {
    if (!settings.apiUrl) {
      showToast('গুগল শিট API URL পাওয়া যায়নি।', 'error');
      return null;
    }
    try {
      const res = await postSteadfastCheckStatus(settings.apiUrl, {
        consignmentId: order.ConsignmentID,
        trackingCode: order.TrackingID,
        invoice: order.OrderNumber || order.OrderID,
        apiKey: settings.SteadfastApiKey,
        secretKey: settings.SteadfastSecretKey
      });
      return res;
    } catch (err) {
      showToast(`ট্র্যাকিং তথ্য আনতে সমস্যা: ${err.message}`, 'error');
      return null;
    }
  };

  // কাস্টমারকে স্বয়ংক্রিয় SMS নোটিফিকেশন পাঠানো
  const handleSendSmsNotification = async ({ orderId, phone, message }) => {
    if (!settings.apiUrl) {
      showToast('গুগল শিট API URL পাওয়া যায়নি।', 'error');
      return { success: false, message: 'API URL অনুপস্থিত' };
    }
    try {
      const res = await postSendSmsNotification(settings.apiUrl, {
        orderId,
        phone,
        message,
        provider: settings.SmsProvider,
        apiKey: settings.SmsApiKey,
        senderId: settings.SmsSenderId
      });
      if (res.success) {
        if (orderId) {
          const updated = updateOrderStatusLocally(orderId, null, null, null, activeUser?.FullName || 'Admin', null, 'Sent');
          setOrders(updated);
        }
        showToast('SMS সফলভাবে পাঠানো হয়েছে!', 'success');
      } else {
        showToast(`SMS ব্যর্থ: ${res.message}`, 'error');
      }
      return res;
    } catch (err) {
      showToast(`SMS ত্রুটি: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  const handleDeleteOrder = (orderId) => {
    const updated = deleteOrderLocally(orderId);
    setOrders(updated);
    showToast(`অর্ডার ${orderId} মুছে ফেলা হয়েছে।`, 'info');
  };

  const handleResolveRma = async (orderId, resolution, notesOrData) => {
    try {
      if (resolution === 'Submitted') {
        const updatedOrder = submitOrderRmaLocally(orderId, notesOrData);
        if (updatedOrder) {
          setOrders(getLocalOrders());
          showToast(`অর্ডার ${orderId}-এর রিটার্ন/এক্সচেঞ্জ আবেদন সফলভাবে জমা হয়েছে।`, 'success');
        }
        return;
      }

      const targetOrder = orders.find((o) => o.OrderID === orderId);
      if (!targetOrder) return;

      if (resolution === 'Approved') {
        // ১. অটোমেটিক রিস্টক (যদি স্টক রিজার্ভ থাকে)
        if (targetOrder.StockReserved && Array.isArray(targetOrder.Items)) {
          const restockedProducts = products.map((p) => {
            const item = targetOrder.Items.find((i) => (i.productId || i.ProductID) === p.ProductID);
            if (item) {
              const currentStock = Number(p.StockQuantity) || 0;
              return {
                ...p,
                StockQuantity: currentStock + Number(item.quantity),
                UpdatedAt: new Date().toISOString(),
              };
            }
            return p;
          });
          setProducts(restockedProducts);
          saveLocalProducts(restockedProducts);
          showToast('রিটার্ন অনুমোদন করায় পণ্যগুলো মূল ইনভেন্টরি স্টকে ফেরত যোগ হয়েছে!', 'info');
        }
      }

      const updated = resolveOrderRmaLocally(orderId, resolution, typeof notesOrData === 'string' ? notesOrData : '', activeUser?.FullName || 'Admin');
      setOrders(updated);
      showToast(`আবেদন ${resolution === 'Approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে।`, 'success');

      // ক্লাউড সিঙ্ক
      if (resolution === 'Approved' && settings.apiUrl) {
        try {
          await postUpdateOrderStatus(settings.apiUrl, {
            orderId,
            status: 'Returned',
            trackingId: targetOrder.TrackingID || '',
            courierName: targetOrder.CourierName || '',
          });
        } catch (apiErr) {
          console.warn('RMA status cloud sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`RMA আপডেট ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ৬.৫ নতুন গ্রাহক ম্যানুয়ালি যোগ করার হ্যান্ডলার
  const handleAddCustomer = async (newCustomerData) => {
    const updatedList = saveOrUpdateCustomerLocally(newCustomerData, 0);
    setCustomers(updatedList);
    showToast(`'${newCustomerData.CustomerName}' গ্রাহক ডাটাবেসে সফলভাবে সংরক্ষিত হয়েছে!`, 'success');

    if (settings.apiUrl) {
      try {
        const response = await postAddCustomer(settings.apiUrl, newCustomerData);
        if (response && response.success) {
          showToast('গুগল শিট ডাটাবেসে গ্রাহকের তথ্য সফলভাবে সিঙ্ক হয়েছে!', 'success');
        }
      } catch (err) {
        showToast('গ্রাহক লোকাল ডাটাবেসে সংরক্ষিত হয়েছে (অফলাইন)।', 'info');
      }
    }
  };

  // ৬.৬ গ্রাহক মুছে ফেলার হ্যান্ডলার
  const handleDeleteCustomer = async (cust) => {
    const updated = deleteCustomerLocally(cust.CustomerID, cust.Phone);
    setCustomers(updated);
    showToast(`'${cust.CustomerName}' গ্রাহক ডাটাবেস থেকে মুছে ফেলা হয়েছে।`, 'info');

    if (settings.apiUrl) {
      try {
        await postDeleteCustomer(settings.apiUrl, cust.CustomerID, cust.Phone);
        showToast('গুগল শিট ডাটাবেস থেকেও গ্রাহক সফলভাবে মুছে ফেলা হয়েছে!', 'success');
      } catch (err) {
        console.warn('Customer delete remote failed:', err);
      }
    }
  };

  // ৬.৭ কুপন তৈরি বা আপডেট করার হ্যান্ডলার
  const handleSaveCoupon = async (couponData) => {
    const updatedList = saveOrUpdateCouponLocally(couponData);
    setCoupons(updatedList);
    showToast(`'${couponData.CouponCode}' কুপন সফলভাবে সংরক্ষিত হয়েছে!`, 'success');

    if (settings.apiUrl) {
      try {
        const isUpdate = Boolean(couponData.CouponID && coupons.some(c => c.CouponID === couponData.CouponID));
        const response = isUpdate
          ? await postUpdateCoupon(settings.apiUrl, couponData)
          : await postAddCoupon(settings.apiUrl, couponData);

        if (response && response.success) {
          if (response.data) {
            const syncedList = saveOrUpdateCouponLocally(response.data);
            setCoupons(syncedList);
          }
          showToast('গুগল শিট ডাটাবেসে কুপন সফলভাবে সিঙ্ক হয়েছে!', 'success');
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'কুপন শিটে সিঙ্ক হয়নি'}`, 'warning');
        }
      } catch (err) {
        showToast('কুপন লোকাল স্টোরেজে সংরক্ষিত হয়েছে (অফলাইন)।', 'info');
      }
    }
  };

  // ৬.৮ কুপন মুছে ফেলার হ্যান্ডলার
  const handleDeleteCoupon = async (couponId, couponCode) => {
    const updated = deleteCouponLocally(couponId, couponCode);
    setCoupons(updated);
    showToast(`'${couponCode}' কুপন সফলভাবে মুছে ফেলা হয়েছে।`, 'info');

    if (settings.apiUrl) {
      try {
        await postDeleteCoupon(settings.apiUrl, couponId, couponCode);
        showToast('গুগল শিট ডাটাবেস থেকেও কুপন মুছে ফেলা হয়েছে!', 'success');
      } catch (err) {
        console.warn('Coupon delete remote failed:', err);
      }
    }
  };

  // ৬.৯ কুপন তালিকা ক্লাউড থেকে রিফ্রেশ
  const handleRefreshCoupons = async () => {
    if (!settings.apiUrl || !settings.apiUrl.trim()) {
      showToast('API URL কনফিগার করা নেই। Settings এ গিয়ে URL দিন।', 'warning');
      return;
    }
    try {
      const cloudCoupons = await fetchCoupons(settings.apiUrl);
      if (Array.isArray(cloudCoupons)) {
        setCoupons(cloudCoupons);
        saveLocalCoupons(cloudCoupons);
        showToast('গুগল শিট থেকে কুপনের তালিকা সফলভাবে রিফ্রেশ হয়েছে!', 'success');
      }
    } catch (err) {
      showToast(`কুপন রিফ্রেশ ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ৬.১০ অসম্পূর্ণ কার্ট (Abandoned Cart) হ্যান্ডলারসমূহ
  const handleSaveAbandonedCart = async (cartData) => {
    try {
      const updatedList = saveOrUpdateAbandonedCartLocally(cartData);
      setAbandonedCarts(updatedList);

      if (settings.apiUrl) {
        try {
          await postSaveAbandonedCart(settings.apiUrl, cartData);
        } catch (cloudErr) {
          console.warn('Abandoned cart cloud sync delayed:', cloudErr);
        }
      }
    } catch (err) {
      console.warn('Error saving abandoned cart:', err);
    }
  };

  const handleUpdateAbandonedCartStatus = async (cartId, status, notes = '') => {
    try {
      const updatedList = updateAbandonedCartStatusLocally(cartId, status, notes);
      setAbandonedCarts(updatedList);
      showToast(`কার্ট স্ট্যাটাস '${status === 'Contacted' ? 'যোগাযোগ সম্পন্ন' : status === 'Recovered' ? 'অর্ডার রিকভার্ড' : status}' হিসেবে সংরক্ষিত হয়েছে।`, 'success');

      if (settings.apiUrl) {
        try {
          await postUpdateAbandonedCartStatus(settings.apiUrl, cartId, status, notes);
        } catch (cloudErr) {
          console.warn('Abandoned cart status cloud sync delayed:', cloudErr);
        }
      }
    } catch (err) {
      showToast(`কার্ট স্ট্যাটাস আপডেট ব্যর্থ: ${err.message}`, 'error');
    }
  };

  const handleDeleteAbandonedCart = (cartId) => {
    try {
      const updatedList = deleteAbandonedCartLocally(cartId);
      setAbandonedCarts(updatedList);
      showToast('অসম্পূর্ণ কার্ট তালিকা থেকে মুছে ফেলা হয়েছে।', 'info');
    } catch (err) {
      showToast('কার্ট মুছতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleConvertToOrderFromAbandoned = (cartRecord) => {
    try {
      if (!cartRecord) return;
      let items = [];
      if (Array.isArray(cartRecord.CartItems)) {
        items = cartRecord.CartItems;
      } else if (typeof cartRecord.CartItemsJSON === 'string' && cartRecord.CartItemsJSON.trim()) {
        try {
          items = JSON.parse(cartRecord.CartItemsJSON);
        } catch {}
      }

      if (Array.isArray(items) && items.length > 0) {
        setCart(items);
        setCurrentView('checkout');
        setIsAbandonedCartModalOpen(false);
        showToast('অসম্পূর্ণ কার্ট আইটেমগুলো চেকআউটে লোড করা হয়েছে!', 'success');
      } else {
        showToast('এই কার্টে কোনো বৈধ পণ্য আইটেম পাওয়া যায়নি।', 'warning');
      }
    } catch (err) {
      showToast(`কার্ট লোড করতে সমস্যা: ${err.message}`, 'error');
    }
  };

  // ==========================================
  // ফেজ ৪: সাপ্লায়ার, ভেন্ডর ও পারচেজ অর্ডার হ্যান্ডলারসমূহ
  // ==========================================
  const handleSaveSupplier = async (supplierData) => {
    try {
      const updatedList = saveOrUpdateSupplierLocally(supplierData);
      setSuppliers(updatedList);
      showToast('সাপ্লায়ারের তথ্য সফলভাবে সংরক্ষিত হয়েছে!', 'success');

      if (settings.apiUrl) {
        try {
          const res = await postSaveSupplier(settings.apiUrl, supplierData);
          if (res && res.data) {
            const syncedList = saveOrUpdateSupplierLocally(res.data);
            setSuppliers(syncedList);
          }
        } catch (apiErr) {
          console.warn('Supplier remote sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`সাপ্লায়ার সংরক্ষণে সমস্যা: ${err.message}`, 'error');
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    try {
      const updatedList = deleteSupplierLocally(supplierId);
      setSuppliers(updatedList);
      showToast('সাপ্লায়ার সফলভাবে মুছে ফেলা হয়েছে!', 'info');

      if (settings.apiUrl) {
        try {
          await postDeleteSupplier(settings.apiUrl, supplierId);
        } catch (apiErr) {
          console.warn('Supplier remote delete delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`সাপ্লায়ার মুছতে সমস্যা: ${err.message}`, 'error');
    }
  };

  const handleRecordSupplierPayment = async (paymentData) => {
    try {
      const updatedSuppliers = recordSupplierPaymentLocally(paymentData);
      setSuppliers(updatedSuppliers);
      setSupplierLedger(getLocalSupplierLedger());
      showToast(`৳${paymentData.amount || paymentData.Amount} সাপ্লায়ার পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে!`, 'success');

      if (settings.apiUrl) {
        try {
          await postRecordSupplierPayment(settings.apiUrl, paymentData);
        } catch (apiErr) {
          console.warn('Supplier payment remote sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`পেমেন্ট সংরক্ষণে সমস্যা: ${err.message}`, 'error');
    }
  };

  const handleCreatePurchaseOrder = async (poData, receiveImmediately = false) => {
    try {
      const updatedPOs = saveOrUpdatePurchaseOrderLocally(poData);
      setPurchaseOrders(updatedPOs);

      // যদি এখনই সরাসরি স্টক গ্রহণ করা হয় (receiveImmediately / Status === 'Received')
      if (receiveImmediately || poData.Status === 'Received') {
        const items = Array.isArray(poData.Items) ? poData.Items : [];
        if (items.length > 0) {
          let currentProds = getLocalProducts();
          items.forEach(item => {
            const prodIdx = currentProds.findIndex(p => p.ProductID === item.ProductID || p.Barcode === item.Barcode);
            if (prodIdx !== -1) {
              const oldStock = Number(currentProds[prodIdx].StockQuantity) || 0;
              const incomingQty = Number(item.Quantity) || 0;
              const newStock = oldStock + incomingQty;
              const oldCost = Number(currentProds[prodIdx].CostPrice) || 0;
              const incomingCost = Number(item.UnitCost) || oldCost;
              const newCost = newStock > 0 ? ((oldStock * oldCost) + (incomingQty * incomingCost)) / newStock : incomingCost;
              
              currentProds[prodIdx].StockQuantity = newStock;
              currentProds[prodIdx].CostPrice = Math.round(newCost * 100) / 100;
              currentProds[prodIdx].UpdatedAt = new Date().toISOString();
            }
          });
          saveLocalProducts(currentProds);
          setProducts(currentProds);
        }
      }

      setSuppliers(getLocalSuppliers());
      setSupplierLedger(getLocalSupplierLedger());
      showToast(`পারচেজ অর্ডার ${poData.PONumber} সফলভাবে তৈরি হয়েছে!`, 'success');

      if (settings.apiUrl) {
        try {
          const res = await postCreatePurchaseOrder(settings.apiUrl, poData);
          if (res && res.data) {
            const syncedPOs = saveOrUpdatePurchaseOrderLocally(res.data);
            setPurchaseOrders(syncedPOs);
          }
        } catch (apiErr) {
          console.warn('Purchase order remote sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`পারচেজ অর্ডার তৈরি ব্যর্থ: ${err.message}`, 'error');
    }
  };

  const handleUpdatePOStatus = async (poNumber, newStatus) => {
    try {
      const currentPO = purchaseOrders.find(p => p.PONumber === poNumber);
      const prevStatus = currentPO?.Status;

      const updatedPOs = updatePurchaseOrderStatusLocally(poNumber, newStatus);
      setPurchaseOrders(updatedPOs);

      // যদি পূর্বে রিসিভ না হয়ে থাকে এবং এখন 'Received' স্ট্যাটাস হয় -> স্বয়ংক্রিয় স্টক বৃদ্ধি
      if (newStatus === 'Received' && prevStatus !== 'Received' && currentPO) {
        let items = currentPO.Items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        if (Array.isArray(items) && items.length > 0) {
          let currentProds = getLocalProducts();
          items.forEach(item => {
            const prodIdx = currentProds.findIndex(p => p.ProductID === item.ProductID || p.Barcode === item.Barcode);
            if (prodIdx !== -1) {
              const oldStock = Number(currentProds[prodIdx].StockQuantity) || 0;
              const incomingQty = Number(item.Quantity) || 0;
              const newStock = oldStock + incomingQty;
              const oldCost = Number(currentProds[prodIdx].CostPrice) || 0;
              const incomingCost = Number(item.UnitCost) || oldCost;
              const newCost = newStock > 0 ? ((oldStock * oldCost) + (incomingQty * incomingCost)) / newStock : incomingCost;
              
              currentProds[prodIdx].StockQuantity = newStock;
              currentProds[prodIdx].CostPrice = Math.round(newCost * 100) / 100;
              currentProds[prodIdx].UpdatedAt = new Date().toISOString();
            }
          });
          saveLocalProducts(currentProds);
          setProducts(currentProds);
          showToast(`মালামাল গ্রহণ সম্পন্ন! পণ্যের স্টক ইনভেন্টরিতে বৃদ্ধি করা হয়েছে।`, 'info');
        }
      }

      setSuppliers(getLocalSuppliers());
      setSupplierLedger(getLocalSupplierLedger());
      showToast(`অর্ডার স্ট্যাটাস "${newStatus}" এ পরিবর্তন করা হয়েছে!`, 'success');

      if (settings.apiUrl) {
        try {
          await postUpdatePOStatus(settings.apiUrl, poNumber, newStatus);
        } catch (apiErr) {
          console.warn('PO status remote sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`স্ট্যাটাস পরিবর্তন ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ফেজ ৫: খরচের ভাউচার সংরক্ষণ
  const handleSaveExpense = async (expenseData) => {
    try {
      const updatedExpenses = saveOrUpdateExpenseLocally(expenseData);
      setExpenses(updatedExpenses);

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'EXPENSE',
        module: 'Expenses',
        description: `নতুন খরচের ভাউচার এন্ট্রি: ${expenseData.Category} - ৳${(Number(expenseData.Amount) || 0).toLocaleString('en-IN')}`,
        details: expenseData
      });
      setAuditLogs(getLocalAuditLogs());

      showToast(`৳${(Number(expenseData.Amount) || 0).toLocaleString('en-IN')} খরচ সফলভাবে সংরক্ষিত হয়েছে!`, 'success');

      if (settings.apiUrl) {
        try {
          await postSaveExpense(settings.apiUrl, expenseData);
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Expense sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`খরচ সংরক্ষণ ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ফেজ ৫: খরচের ভাউচার মুছে ফেলা
  const handleDeleteExpense = async (expenseId) => {
    try {
      const updatedExpenses = deleteExpenseLocally(expenseId);
      setExpenses(updatedExpenses);

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'DELETE',
        module: 'Expenses',
        description: `খরচের ভাউচার অপসারণ: ${expenseId}`,
        details: { expenseId }
      });
      setAuditLogs(getLocalAuditLogs());

      showToast('খরচের ভাউচারটি সফলভাবে মুছে ফেলা হয়েছে!', 'info');

      if (settings.apiUrl) {
        try {
          await postDeleteExpense(settings.apiUrl, expenseId);
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Expense delete sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`খরচ ডিলিট ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ফেজ ৫: সকালের ক্যাশ রেজিস্টার সেশন ওপেন
  const handleOpenCashRegister = async (sessionData) => {
    try {
      const newSession = openCashRegisterLocally(sessionData);
      setActiveRegister(newSession);
      setCashRegisters(getLocalCashRegisters());

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'REGISTER',
        module: 'CashRegister',
        description: `সকালের ক্যাশ রেজিস্টার খোলা হয়েছে (প্রারম্ভিক ব্যালেন্স: ৳${(Number(sessionData.openingBalance) || 0).toLocaleString('en-IN')})`,
        details: sessionData
      });
      setAuditLogs(getLocalAuditLogs());

      showToast('ক্যাশ রেজিস্টার সফলভাবে চালু হয়েছে!', 'success');

      if (settings.apiUrl) {
        try {
          await postOpenCashRegister(settings.apiUrl, sessionData);
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Open register sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`রেজিস্টার ওপেন ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ফেজ ৫: দিন শেষে ক্যাশ রেজিস্টার ক্লোজ ও EOD
  const handleCloseCashRegister = async (closingData) => {
    try {
      const closedSession = closeCashRegisterLocally(closingData);
      setActiveRegister(null);
      setCashRegisters(getLocalCashRegisters());

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'REGISTER',
        module: 'CashRegister',
        description: `দিন শেষে ক্যাশ রেজিস্টার ক্লোজ সম্পন্ন (প্রত্যাশিত: ৳${closingData.expectedCash}, বাস্তবে: ৳${closingData.actualCash}, পার্থক্য: ৳${closingData.difference})`,
        details: closingData
      });
      setAuditLogs(getLocalAuditLogs());

      showToast('ক্যাশ রেজিস্টার ক্লোজ ও EOD রিপোর্ট সংরক্ষণ সম্পন্ন!', 'success');

      if (settings.apiUrl) {
        try {
          await postCloseCashRegister(settings.apiUrl, closingData);
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Close register sync delayed:', apiErr);
        }
      }
    } catch (err) {
      showToast(`রেজিস্টার ক্লোজ ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ============================================================================
  // ফেজ ৭: পণ্য বিক্রয় রিটার্ন ও রিফান্ড হ্যান্ডলার (Sales Returns & Refunds)
  // ============================================================================
  const handleSaveSalesReturn = async (returnPayload) => {
    try {
      const { record, returns } = saveSalesReturnLocally(returnPayload);
      setSalesReturns(returns);

      // ১. যদি কোনো পণ্য পুনর্বিক্রয়যোগ্য (Resellable) হিসেবে ফেরত আসে, তবে মূল প্রোডাক্ট স্টকে স্বয়ংক্রিয়ভাবে যোগ করা
      const returnItems = Array.isArray(returnPayload.items) ? returnPayload.items : [];
      let updatedProducts = [...products];
      let hasRestocked = false;

      returnItems.forEach((itm) => {
        if (itm.condition === 'Resellable') {
          const qty = Number(itm.quantity) || 1;
          const pid = String(itm.productId || '').trim();
          const variantId = itm.variantId || null;

          const prodIdx = updatedProducts.findIndex(
            (p) => String(p.ProductID || '').trim() === pid || String(p.Barcode || '').trim() === pid
          );

          if (prodIdx !== -1) {
            hasRestocked = true;
            const targetProd = { ...updatedProducts[prodIdx] };
            targetProd.StockQuantity = (Number(targetProd.StockQuantity) || 0) + qty;

            // ভ্যারিয়েন্ট স্টক আপডেট
            if (variantId && Array.isArray(targetProd.Variants)) {
              const vIdx = targetProd.Variants.findIndex(
                (v) => String(v.VariantID || '').trim() === String(variantId).trim()
              );
              if (vIdx !== -1) {
                const updatedVariants = [...targetProd.Variants];
                updatedVariants[vIdx] = {
                  ...updatedVariants[vIdx],
                  StockQuantity: (Number(updatedVariants[vIdx].StockQuantity) || 0) + qty
                };
                targetProd.Variants = updatedVariants;
              }
            }

            updatedProducts[prodIdx] = targetProd;
          }
        }
      });

      if (hasRestocked) {
        setProducts(updatedProducts);
        saveLocalProducts(updatedProducts);
      }

      // ২. যদি রিফান্ড মেথড DeductDue হয়, তবে কাস্টমারের বকেয়া কমিয়ে লেজারে এন্ট্রি দেওয়া
      if (returnPayload.refundMethod === 'DeductDue' && returnPayload.customerId && returnPayload.customerId !== 'GUEST') {
        const refundAmt = Number(returnPayload.totalRefundAmount) || 0;
        const custIdx = customers.findIndex(
          (c) => String(c.CustomerID || '').trim() === String(returnPayload.customerId).trim()
        );
        if (custIdx !== -1) {
          const updatedCusts = [...customers];
          const curDue = Number(updatedCusts[custIdx].CurrentDue) || 0;
          updatedCusts[custIdx] = {
            ...updatedCusts[custIdx],
            CurrentDue: Math.max(0, curDue - refundAmt)
          };
          setCustomers(updatedCusts);
          saveLocalCustomers(updatedCusts);

          // লেজার এন্ট্রি
          recordCustomerLedgerEntryLocally({
            customerId: returnPayload.customerId,
            customerName: returnPayload.customerName,
            customerPhone: returnPayload.customerPhone,
            transactionType: 'RETURN_ADJUST',
            amount: refundAmt,
            previousDue: curDue,
            newDue: Math.max(0, curDue - refundAmt),
            paymentMethod: 'Return Adjustment',
            note: `পণ্য রিটার্ন ইনভয়েস #${returnPayload.invoiceNo} থেকে বকেয়া সমন্বয়`,
            cashier: activeUser?.FullName || 'Cashier'
          });
          setCustomerLedger(getLocalCustomerLedger());
        }
      }

      // ৩. অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'RETURN',
        module: 'SalesReturns',
        description: `বিক্রয় রিটার্ন প্রসেস সম্পন্ন: ইনভয়েস #${returnPayload.invoiceNo} (রিফান্ড: ৳${returnPayload.totalRefundAmount}, মাধ্যম: ${returnPayload.refundMethod})`,
        details: returnPayload
      });
      setAuditLogs(getLocalAuditLogs());

      showToast('পণ্য বিক্রয় রিটার্ন সফলভাবে সম্পন্ন হয়েছে!', 'success');

      // ৪. ব্যাকএন্ড সিঙ্ক
      if (settings.apiUrl) {
        try {
          postCreateSalesReturn(settings.apiUrl, returnPayload).catch(() => {});
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Sales return sync delayed:', apiErr);
        }
      }

      return { record, returns };
    } catch (err) {
      showToast(`রিটার্ন প্রক্রিয়াকরণ ব্যর্থ: ${err.message}`, 'error');
      throw err;
    }
  };

  // স্টোর ক্রেডিট ভাউচার রিডিম হ্যান্ডলার
  const handleRedeemStoreCredit = async (creditNoteCode) => {
    try {
      const result = redeemStoreCreditLocally(creditNoteCode, activeUser?.FullName || 'Cashier');
      if (result.success) {
        setSalesReturns(getLocalSalesReturns());

        const logEntry = logAuditEventLocally({
          userId: activeUser?.UserID || 'ADMIN',
          userName: activeUser?.FullName || 'Admin',
          userRole: activeUser?.Role || 'Admin',
          actionType: 'CREDIT_REDEEM',
          module: 'SalesReturns',
          description: `স্টোর ক্রেডিট নোট ${creditNoteCode} রিডিম করা হয়েছে (৳${result.creditAmount})`,
          details: { creditNoteCode, creditAmount: result.creditAmount }
        });
        setAuditLogs(getLocalAuditLogs());

        if (settings.apiUrl) {
          postRedeemStoreCredit(settings.apiUrl, {
            creditNoteCode,
            cashier: activeUser?.FullName || 'Cashier'
          }).catch(() => {});
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        }
      }
      return result;
    } catch (err) {
      console.warn('Store credit redeem error:', err);
      return { success: false, message: err.message };
    }
  };

  // ============================================================================
  // ফেজ ৭: গোডাউন ও দোকান স্টক ট্রান্সফার চালান ও মুভমেন্ট হ্যান্ডলার (Stock Transfers)
  // ============================================================================
  const handleSaveStockTransfer = async (transferPayload) => {
    try {
      const { record, transfers } = saveStockTransferLocally(transferPayload);
      setStockTransfers(transfers);

      // প্রেরক ও প্রাপক লোকেশন নির্ধারণ
      const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(transferPayload.fromLocation || '') || !/shop|store|counter|দোকান/i.test(transferPayload.fromLocation || '');
      const isFromShop = /shop|store|counter|দোকান/i.test(transferPayload.fromLocation || '');
      const isToShop = /shop|store|counter|দোকান/i.test(transferPayload.toLocation || '');
      const isReceived = (transferPayload.status === 'Received');

      // চালান তৈরি হলে প্রেরক স্থান থেকে স্টক কর্তন (এবং সরাসরি রিসিভ হলে দোকানে স্টক যোগ)
      let updatedProducts = [...products];
      const transferItems = Array.isArray(transferPayload.items) ? transferPayload.items : [];
      let hasModifiedStock = false;
      const modifiedProductIds = new Set();

      transferItems.forEach((itm) => {
        const qty = Number(itm.quantity) || 0;
        const pid = String(itm.productId || '').trim();
        const variantId = itm.variantId || null;

        const prodIdx = updatedProducts.findIndex(
          (p) => String(p.ProductID || '').trim() === pid || String(p.Barcode || '').trim() === pid
        );

        if (prodIdx !== -1) {
          hasModifiedStock = true;
          modifiedProductIds.add(updatedProducts[prodIdx].ProductID);
          const target = { ...updatedProducts[prodIdx] };
          const prevGodown = Number(target.GodownStock || 0);
          const prevShop = Number(target.StockQuantity || 0);

          let matchedVariant = null;
          if (variantId && Array.isArray(target.Variants)) {
            matchedVariant = target.Variants.find(
              (v) => String(v.VariantID || '').trim() === String(variantId).trim()
            ) || null;
          }

          if (isFromWarehouse) {
            // গোডাউন থেকে স্টক কর্তন
            const newGodown = Math.max(0, prevGodown - qty);
            target.GodownStock = newGodown;
            target.godownStock = newGodown;
            target.TotalStock = (Number(target.StockQuantity) || 0) + newGodown;

            if (variantId && Array.isArray(target.Variants)) {
              const vIdx = target.Variants.findIndex(
                (v) => String(v.VariantID || '').trim() === String(variantId).trim()
              );
              if (vIdx !== -1) {
                const uVars = [...target.Variants];
                const prevVG = Number(uVars[vIdx].GodownStock !== undefined ? uVars[vIdx].GodownStock : uVars[vIdx].StockQuantity) || 0;
                uVars[vIdx] = {
                  ...uVars[vIdx],
                  GodownStock: Math.max(0, prevVG - qty),
                  godownStock: Math.max(0, prevVG - qty)
                };
                target.Variants = uVars;
                target.VariantsJSON = JSON.stringify(uVars);
                matchedVariant = uVars[vIdx];
              }
            }

            const varName = itm.variantName || matchedVariant?.VariantName || (matchedVariant?.Color ? `রং: ${matchedVariant.Color}` : '') || (matchedVariant?.Size ? `সাইজ: ${matchedVariant.Size}` : '');
            const varColor = itm.color || matchedVariant?.Color || '';
            const varSize = itm.size || matchedVariant?.Size || '';

            recordStockMovementLocally({
              location: 'Godown',
              type: 'TRANSFER_OUT',
              reasonBangla: `দোকানে চালান স্থানান্তর (চালান #${transferPayload.challanNo})`,
              productId: target.ProductID,
              productName: target.ProductName,
              barcode: target.Barcode,
              unit: target.Unit || 'Pcs',
              quantity: qty,
              previousStock: prevGodown,
              remainingStock: newGodown,
              referenceNo: transferPayload.challanNo,
              operatorName: activeUser?.FullName || 'Admin',
              notes: transferPayload.notes || '',
              variantId: variantId || '',
              variantName: varName,
              color: varColor,
              size: varSize,
              category: target.Category || ''
            });
          } else if (isFromShop) {
            // দোকান থেকে স্টক কর্তন
            const newShop = Math.max(0, prevShop - qty);
            target.StockQuantity = newShop;
            target.CurrentStock = newShop;
            target.TotalStock = newShop + (Number(target.GodownStock) || 0);

            if (variantId && Array.isArray(target.Variants)) {
              const vIdx = target.Variants.findIndex(
                (v) => String(v.VariantID || '').trim() === String(variantId).trim()
              );
              if (vIdx !== -1) {
                const uVars = [...target.Variants];
                uVars[vIdx] = {
                  ...uVars[vIdx],
                  StockQuantity: Math.max(0, (Number(uVars[vIdx].StockQuantity) || 0) - qty),
                  CurrentStock: Math.max(0, (Number(uVars[vIdx].StockQuantity) || 0) - qty)
                };
                target.Variants = uVars;
                target.VariantsJSON = JSON.stringify(uVars);
                matchedVariant = uVars[vIdx];
              }
            }

            const varName = itm.variantName || matchedVariant?.VariantName || (matchedVariant?.Color ? `রং: ${matchedVariant.Color}` : '') || (matchedVariant?.Size ? `সাইজ: ${matchedVariant.Size}` : '');
            const varColor = itm.color || matchedVariant?.Color || '';
            const varSize = itm.size || matchedVariant?.Size || '';

            recordStockMovementLocally({
              location: 'Shop',
              type: 'TRANSFER_OUT',
              reasonBangla: `চালানে স্থানান্তর (চালান #${transferPayload.challanNo})`,
              productId: target.ProductID,
              productName: target.ProductName,
              barcode: target.Barcode,
              unit: target.Unit || 'Pcs',
              quantity: qty,
              previousStock: prevShop,
              remainingStock: newShop,
              referenceNo: transferPayload.challanNo,
              operatorName: activeUser?.FullName || 'Admin',
              notes: transferPayload.notes || '',
              variantId: variantId || '',
              variantName: varName,
              color: varColor,
              size: varSize,
              category: target.Category || ''
            });
          }

          // যদি সরাসরি দোকানে গ্রহণ করা হয় (Direct Transfer / Received):
          if (isReceived && isToShop) {
            const currentShop = Number(target.StockQuantity || 0);
            const newShop = currentShop + qty;
            target.StockQuantity = newShop;
            target.CurrentStock = newShop;
            target.ShopStock = newShop;
            target.TotalStock = (Number(target.GodownStock) || 0) + newShop;

            if (variantId && Array.isArray(target.Variants)) {
              const vIdx = target.Variants.findIndex(
                (v) => String(v.VariantID || '').trim() === String(variantId).trim()
              );
              if (vIdx !== -1) {
                const uVars = [...target.Variants];
                const prevVS = Number(uVars[vIdx].StockQuantity !== undefined ? uVars[vIdx].StockQuantity : 0) || 0;
                uVars[vIdx] = {
                  ...uVars[vIdx],
                  StockQuantity: prevVS + qty,
                  CurrentStock: prevVS + qty,
                  ShopStock: prevVS + qty
                };
                target.Variants = uVars;
                target.VariantsJSON = JSON.stringify(uVars);
                matchedVariant = uVars[vIdx];
              }
            }

            const varName = itm.variantName || matchedVariant?.VariantName || (matchedVariant?.Color ? `রং: ${matchedVariant.Color}` : '') || (matchedVariant?.Size ? `সাইজ: ${matchedVariant.Size}` : '');
            const varColor = itm.color || matchedVariant?.Color || '';
            const varSize = itm.size || matchedVariant?.Size || '';

            recordStockMovementLocally({
              location: 'Shop',
              type: 'TRANSFER_IN',
              reasonBangla: `গোডাউন থেকে সরাসরি স্থানান্তর গ্রহণ (চালান #${transferPayload.challanNo})`,
              productId: target.ProductID,
              productName: target.ProductName,
              barcode: target.Barcode,
              unit: target.Unit || 'Pcs',
              quantity: qty,
              previousStock: currentShop,
              remainingStock: newShop,
              referenceNo: transferPayload.challanNo,
              operatorName: activeUser?.FullName || 'Admin',
              notes: transferPayload.notes || '',
              variantId: variantId || '',
              variantName: varName,
              color: varColor,
              size: varSize,
              category: target.Category || ''
            });
          }

          updatedProducts[prodIdx] = target;
        }
      });

      if (hasModifiedStock) {
        setProducts(updatedProducts);
        saveLocalProducts(updatedProducts);
        setStockMovements(getLocalStockMovements());

        // গুগল শিট Products ডাটাবেসে অবিলম্বে স্টক ও ভ্যারিয়েন্ট সিঙ্ক
        if (settings.apiUrl && settings.apiUrl.trim()) {
          modifiedProductIds.forEach((pid) => {
            const prod = updatedProducts.find((p) => p.ProductID === pid);
            if (prod) {
              const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
              const yardsPerThan = Number(prod.YardsPerThan) || 0;
              const totalStock = (Number(prod.GodownStock) || 0) + (Number(prod.StockQuantity) || 0);

              postUpdateProduct(settings.apiUrl, {
                productId: prod.ProductID,
                productName: prod.ProductName,
                barcode: prod.Barcode,
                category: prod.Category,
                costPrice: prod.CostPrice,
                sellingPrice: prod.SellingPrice,
                godownStock: Number(prod.GodownStock) || 0,
                stockQuantity: Number(prod.StockQuantity) || 0,
                totalStock: totalStock,
                thanCount: isThan ? totalStock : prod.ThanCount,
                totalYards: isThan ? (totalStock * yardsPerThan) : prod.TotalYards,
                hasVariants: Array.isArray(prod.Variants) && prod.Variants.length > 0,
                variants: prod.Variants || [],
                variantsJSON: JSON.stringify(prod.Variants || [])
              }).catch((e) => console.warn('Product sync after transfer failed:', e));
            }
          });
        }
      }

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'TRANSFER_CREATE',
        module: 'StockTransfers',
        description: `নতুন স্টক ট্রান্সফার চালান #${transferPayload.challanNo} তৈরি হয়েছে (${transferPayload.fromLocation} ➔ ${transferPayload.toLocation})`,
        details: transferPayload
      });
      setAuditLogs(getLocalAuditLogs());

      showToast(
        isReceived
          ? `গোডাউন থেকে সফলভাবে ${transferPayload.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} টি পণ্য দোকানে স্থানান্তর ও সেভ হয়েছে!`
          : `স্টক ট্রান্সফার চালান #${transferPayload.challanNo} সফলভাবে তৈরি হয়েছে!`,
        'success'
      );

      if (settings.apiUrl) {
        try {
          postCreateStockTransfer(settings.apiUrl, transferPayload).catch(() => {});
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Stock transfer sync delayed:', apiErr);
        }
      }

      return { record, transfers };
    } catch (err) {
      showToast(`চালান তৈরি ব্যর্থ: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleUpdateStockTransferStatus = async ({ transferId, status, receivedBy = 'Manager' }) => {
    try {
      const { record, transfers } = updateStockTransferStatusLocally(transferId, status, receivedBy);
      setStockTransfers(transfers);

      // যদি স্ট্যাটাস Received হয়, তবে গন্তব্য দোকানে স্টক বৃদ্ধি এবং আগমন রেকর্ড
      if (status === 'Received' && record) {
        let updatedProducts = [...products];
        const transferItems = Array.isArray(record.Items) ? record.Items : (typeof record.Items === 'string' ? JSON.parse(record.Items || '[]') : []);
        let hasRestocked = false;

        transferItems.forEach((itm) => {
          const qty = Number(itm.quantity) || 0;
          const pid = String(itm.productId || '').trim();
          const variantId = itm.variantId || null;

          const prodIdx = updatedProducts.findIndex(
            (p) => String(p.ProductID || '').trim() === pid || String(p.Barcode || '').trim() === pid
          );

          if (prodIdx !== -1) {
            hasRestocked = true;
            const target = { ...updatedProducts[prodIdx] };
            const prevShop = Number(target.StockQuantity) || 0;
            const newShop = prevShop + qty;
            target.StockQuantity = newShop;
            target.CurrentStock = newShop;
            target.TotalStock = newShop + (Number(target.GodownStock) || 0);

            if (variantId && Array.isArray(target.Variants)) {
              const vIdx = target.Variants.findIndex(
                (v) => String(v.VariantID || '').trim() === String(variantId).trim()
              );
              if (vIdx !== -1) {
                const uVars = [...target.Variants];
                uVars[vIdx] = {
                  ...uVars[vIdx],
                  StockQuantity: (Number(uVars[vIdx].StockQuantity) || 0) + qty
                };
                target.Variants = uVars;
              }
            }

            updatedProducts[prodIdx] = target;

            // দোকানে চালান আগমনের খতিয়ান সংরক্ষণ
            recordStockMovementLocally({
              location: 'Shop',
              type: 'TRANSFER_IN',
              reasonBangla: `গোডাউন থেকে চালানে গ্রহণ (চালান #${record?.ChallanNo || transferId})`,
              productId: target.ProductID,
              productName: target.ProductName,
              barcode: target.Barcode,
              unit: target.Unit || 'Pcs',
              quantity: qty,
              previousStock: prevShop,
              remainingStock: newShop,
              referenceNo: record?.ChallanNo || transferId,
              operatorName: receivedBy || activeUser?.FullName || 'Manager'
            });
          }
        });

        if (hasRestocked) {
          setProducts(updatedProducts);
          saveLocalProducts(updatedProducts);
          setStockMovements(getLocalStockMovements());

          // গুগল শিট ডাটাবেসে রিসিভ হওয়া প্রোডাক্ট সিঙ্ক
          if (settings.apiUrl && settings.apiUrl.trim()) {
            transferItems.forEach((itm) => {
              const pid = String(itm.productId || '').trim();
              const prod = updatedProducts.find((p) => p.ProductID === pid);
              if (prod) {
                const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
                const yardsPerThan = Number(prod.YardsPerThan) || 0;
                const totalStock = (Number(prod.GodownStock) || 0) + (Number(prod.StockQuantity) || 0);

                postUpdateProduct(settings.apiUrl, {
                  productId: prod.ProductID,
                  productName: prod.ProductName,
                  barcode: prod.Barcode,
                  category: prod.Category,
                  costPrice: prod.CostPrice,
                  sellingPrice: prod.SellingPrice,
                  godownStock: Number(prod.GodownStock) || 0,
                  stockQuantity: Number(prod.StockQuantity) || 0,
                  totalStock: totalStock,
                  thanCount: isThan ? totalStock : prod.ThanCount,
                  totalYards: isThan ? (totalStock * yardsPerThan) : prod.TotalYards,
                  hasVariants: Array.isArray(prod.Variants) && prod.Variants.length > 0,
                  variants: prod.Variants || [],
                  variantsJSON: JSON.stringify(prod.Variants || [])
                }).catch((e) => console.warn('Product sync after challan receive failed:', e));
              }
            });
          }
        }
      } else if (status === 'Cancelled' && record) {
        // যদি চালান বাতিল হয়, তবে গোডাউনে স্টক ফেরত দেওয়া
        let updatedProducts = [...products];
        const transferItems = Array.isArray(record.Items) ? record.Items : (typeof record.Items === 'string' ? JSON.parse(record.Items || '[]') : []);
        let hasRestored = false;

        transferItems.forEach((itm) => {
          const qty = Number(itm.quantity) || 0;
          const pid = String(itm.productId || '').trim();
          const prodIdx = updatedProducts.findIndex(
            (p) => String(p.ProductID || '').trim() === pid || String(p.Barcode || '').trim() === pid
          );

          if (prodIdx !== -1) {
            hasRestored = true;
            const target = { ...updatedProducts[prodIdx] };
            const prevGodown = Number(target.GodownStock || 0);
            const newGodown = prevGodown + qty;
            target.GodownStock = newGodown;
            target.godownStock = newGodown;
            target.TotalStock = (Number(target.StockQuantity) || 0) + newGodown;
            updatedProducts[prodIdx] = target;

            recordStockMovementLocally({
              location: 'Godown',
              type: 'CANCEL_RESTORE',
              reasonBangla: `চালান #${record?.ChallanNo || transferId} বাতিল হওয়ায় গোডাউনে স্টক ফেরত`,
              productId: target.ProductID,
              productName: target.ProductName,
              barcode: target.Barcode,
              unit: target.Unit || 'Pcs',
              quantity: qty,
              previousStock: prevGodown,
              remainingStock: newGodown,
              referenceNo: record?.ChallanNo || transferId,
              operatorName: receivedBy || 'Manager'
            });
          }
        });

        if (hasRestored) {
          setProducts(updatedProducts);
          saveLocalProducts(updatedProducts);
          setStockMovements(getLocalStockMovements());

          // গুগল শিট ডাটাবেসে ফেরত পাওয়া প্রোডাক্ট সিঙ্ক
          if (settings.apiUrl && settings.apiUrl.trim()) {
            transferItems.forEach((itm) => {
              const pid = String(itm.productId || '').trim();
              const prod = updatedProducts.find((p) => p.ProductID === pid);
              if (prod) {
                const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
                const yardsPerThan = Number(prod.YardsPerThan) || 0;
                const totalStock = (Number(prod.GodownStock) || 0) + (Number(prod.StockQuantity) || 0);

                postUpdateProduct(settings.apiUrl, {
                  productId: prod.ProductID,
                  productName: prod.ProductName,
                  barcode: prod.Barcode,
                  category: prod.Category,
                  costPrice: prod.CostPrice,
                  sellingPrice: prod.SellingPrice,
                  godownStock: Number(prod.GodownStock) || 0,
                  stockQuantity: Number(prod.StockQuantity) || 0,
                  totalStock: totalStock,
                  thanCount: isThan ? totalStock : prod.ThanCount,
                  totalYards: isThan ? (totalStock * yardsPerThan) : prod.TotalYards,
                  hasVariants: Array.isArray(prod.Variants) && prod.Variants.length > 0,
                  variants: prod.Variants || [],
                  variantsJSON: JSON.stringify(prod.Variants || [])
                }).catch((e) => console.warn('Product sync after challan cancel failed:', e));
              }
            });
          }
        }
      }

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'TRANSFER_STATUS',
        module: 'StockTransfers',
        description: `চালান #${record?.ChallanNo || transferId}-এর স্ট্যাটাস পরিবর্তিত হয়ে '${status}' হয়েছে।`,
        details: { transferId, status, receivedBy }
      });
      setAuditLogs(getLocalAuditLogs());

      showToast(`চালান স্ট্যাটাস '${status}' হিসেবে আপডেট হয়েছে!`, 'success');

      if (settings.apiUrl) {
        try {
          postUpdateStockTransferStatus(settings.apiUrl, { transferId, status, receivedBy }).catch(() => {});
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
        } catch (apiErr) {
          console.warn('Update transfer status sync delayed:', apiErr);
        }
      }

      return { record, transfers };
    } catch (err) {
      showToast(`চালান স্ট্যাটাস আপডেট ব্যর্থ: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleDeleteStockTransfer = async ({ transferId, challanNo }) => {
    try {
      const targetId = transferId || challanNo;
      const targetChallan = stockTransfers.find((t) => 
        String(t.TransferID).trim() === String(targetId).trim() ||
        String(t.ChallanNo).trim() === String(targetId).trim()
      );

      // যদি চালানটি রিসিভ না হয়ে থাকে (In Transit বা Pending), তবে গোডাউনে স্টক ফিরিয়ে দেওয়া হবে
      if (targetChallan && (targetChallan.Status === 'In Transit' || targetChallan.Status === 'Pending')) {
        let updatedProducts = [...products];
        const rawItems = targetChallan.Items || targetChallan.items || [];
        const transferItems = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'string' ? JSON.parse(rawItems || '[]') : []);
        let hasRestored = false;
        const modifiedProductIds = new Set();

        transferItems.forEach((itm) => {
          const qty = Number(itm.quantity || itm.Quantity || 0);
          const pid = String(itm.productId || itm.ProductID || '').trim();
          const variantId = itm.variantId || itm.VariantID || null;

          const prodIdx = updatedProducts.findIndex(
            (p) => String(p.ProductID || '').trim() === pid || String(p.Barcode || '').trim() === pid
          );

          if (prodIdx !== -1) {
            hasRestored = true;
            modifiedProductIds.add(updatedProducts[prodIdx].ProductID);
            const target = { ...updatedProducts[prodIdx] };
            const prevGodown = Number(target.GodownStock || 0);
            const newGodown = prevGodown + qty;
            target.GodownStock = newGodown;
            target.godownStock = newGodown;
            target.TotalStock = (Number(target.StockQuantity) || 0) + newGodown;

            if (variantId && Array.isArray(target.Variants)) {
              const vIdx = target.Variants.findIndex(
                (v) => String(v.VariantID || '').trim() === String(variantId).trim()
              );
              if (vIdx !== -1) {
                const uVars = [...target.Variants];
                const prevVG = Number(uVars[vIdx].GodownStock !== undefined ? uVars[vIdx].GodownStock : (uVars[vIdx].godownStock || 0)) || 0;
                uVars[vIdx] = {
                  ...uVars[vIdx],
                  GodownStock: prevVG + qty,
                  godownStock: prevVG + qty
                };
                target.Variants = uVars;
                target.VariantsJSON = JSON.stringify(uVars);
              }
            }

            recordStockMovementLocally({
              location: 'Godown',
              type: 'RESTORE_ON_DELETE',
              reasonBangla: `চালান #${targetChallan.ChallanNo || targetId} মুছে ফেলায় গোডাউনে স্টক ফেরত`,
              productId: target.ProductID,
              productName: target.ProductName,
              barcode: target.Barcode,
              unit: target.Unit || 'Pcs',
              quantity: qty,
              previousStock: prevGodown,
              remainingStock: newGodown,
              referenceNo: targetChallan.ChallanNo || targetId,
              operatorName: activeUser?.FullName || 'Admin',
              notes: 'চালান মুছে ফেলা হয়েছে'
            });

            updatedProducts[prodIdx] = target;
          }
        });

        if (hasRestored) {
          setProducts(updatedProducts);
          saveLocalProducts(updatedProducts);
          setStockMovements(getLocalStockMovements());

          // গুগল শিটে রিস্টোর হওয়া স্টক সিঙ্ক
          if (settings.apiUrl && settings.apiUrl.trim()) {
            modifiedProductIds.forEach((pid) => {
              const prod = updatedProducts.find((p) => p.ProductID === pid);
              if (prod) {
                const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
                const yardsPerThan = Number(prod.YardsPerThan) || 0;
                const totalStock = (Number(prod.GodownStock) || 0) + (Number(prod.StockQuantity) || 0);

                postUpdateProduct(settings.apiUrl, {
                  productId: prod.ProductID,
                  productName: prod.ProductName,
                  barcode: prod.Barcode,
                  category: prod.Category,
                  costPrice: prod.CostPrice,
                  sellingPrice: prod.SellingPrice,
                  godownStock: Number(prod.GodownStock) || 0,
                  stockQuantity: Number(prod.StockQuantity) || 0,
                  totalStock: totalStock,
                  thanCount: isThan ? totalStock : prod.ThanCount,
                  totalYards: isThan ? (totalStock * yardsPerThan) : prod.TotalYards,
                  hasVariants: Array.isArray(prod.Variants) && prod.Variants.length > 0,
                  variants: prod.Variants || [],
                  variantsJSON: JSON.stringify(prod.Variants || [])
                }).catch((e) => console.warn('Product sync after transfer delete failed:', e));
              }
            });
          }
        }
      }

      // লোকাল স্টোরেজ থেকে চালান মুছে ফেলা
      const { removedRecord, transfers } = deleteStockTransferLocally(targetId);
      setStockTransfers(transfers);

      // গুগল শিট ডাটাবেস থেকে মুছে ফেলা
      if (settings.apiUrl && settings.apiUrl.trim()) {
        postDeleteStockTransfer(settings.apiUrl, {
          transferId: targetId,
          deletedBy: activeUser?.FullName || 'Admin'
        }).catch((e) => console.warn('Delete transfer backend sync failed:', e));
      }

      // অডিট লগ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'TRANSFER_DELETE',
        module: 'StockTransfers',
        description: `স্টক স্থানান্তর চালান #${targetChallan?.ChallanNo || targetId} মুছে ফেলা হয়েছে`,
        details: { targetId }
      });
      setAuditLogs(getLocalAuditLogs());
      if (settings.apiUrl) {
        postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
      }

      showToast(`চালান #${targetChallan?.ChallanNo || targetId} সফলভাবে মুছে ফেলা হয়েছে!`, 'success');
      return { success: true, transfers };
    } catch (err) {
      showToast(`চালান মুছতে সমস্যা হয়েছে: ${err.message}`, 'error');
      throw err;
    }
  };

  // গোডাউন থেকে দোকানে সরাসরি তাৎক্ষণিক পণ্য আনা (ইন-ডেপথ ও ডাটাবেস অটো-সেভ)
  const handleDirectGodownToShopTransfer = async ({
    product,
    items = [], // array of { variantId, variantName, quantity }
    notes = '',
    operatorName = activeUser?.FullName || 'Admin'
  }) => {
    if (!product || !Array.isArray(items) || items.length === 0) {
      throw new Error('স্থানান্তরের জন্য অন্তত ১টি পণ্য বা ভ্যারিয়েন্ট নির্বাচন করুন।');
    }

    const challanNo = `TRF-${Date.now().toString().slice(-6)}`;
    const transferItems = items.map((itm) => {
      let vName = itm.variantName || '';
      if (!vName && itm.variantId && Array.isArray(product.Variants)) {
        const vr = product.Variants.find((v) => String(v.VariantID || v.variantId) === String(itm.variantId));
        if (vr) {
          const attrs = vr.Attributes || {};
          vName = Object.values(attrs).filter(Boolean).join(' / ') || vr.VariantID;
        }
      }
      return {
        productId: product.ProductID,
        productName: product.ProductName,
        variantId: itm.variantId || null,
        variantName: vName,
        quantity: Number(itm.quantity) || 1,
        unit: product.Unit || 'Pcs',
        costPrice: Number(product.CostPrice) || 0
      };
    });

    const payload = {
      challanNo,
      fromLocation: 'Main Warehouse',
      toLocation: 'Main Shop',
      driverName: 'সরাসরি স্থানান্তর',
      notes: notes || 'গোডাউন থেকে সরাসরি দোকানে স্থানান্তর',
      items: transferItems,
      status: 'Received',
      createdBy: operatorName
    };

    return await handleSaveStockTransfer(payload);
  };

  // গোডাউন ও দোকান সরাসরি স্টক অ্যাডজাস্টমেন্ট হ্যান্ডলার
  const handleAdjustLocationStock = ({ productId, variantId = null, location = 'Godown', actionType = 'ADD', quantity = 1, reason = '', notes = '' }) => {
    try {
      let updatedProducts = [...products];
      const idx = updatedProducts.findIndex(p => p.ProductID === productId || p.Barcode === productId);
      if (idx === -1) {
        showToast('পণ্যটি খুঁজে পাওয়া যায়নি!', 'error');
        return;
      }
      const prod = { ...updatedProducts[idx] };
      const numQty = Math.max(0, Number(quantity) || 0);

      let prevStock = 0;
      let newStock = 0;

      let matchedVariant = null;
      if (variantId && Array.isArray(prod.Variants)) {
        const vIdx = prod.Variants.findIndex(v => String(v.VariantID || '').trim() === String(variantId).trim());
        if (vIdx !== -1) {
          const uVars = [...prod.Variants];
          matchedVariant = uVars[vIdx];
          const prevVG = Number(uVars[vIdx].GodownStock !== undefined ? uVars[vIdx].GodownStock : 0) || 0;
          const prevVS = Number(uVars[vIdx].StockQuantity !== undefined ? uVars[vIdx].StockQuantity : 0) || 0;
          if (location === 'Godown') {
            const newVG = actionType === 'ADD' ? prevVG + numQty : actionType === 'DEDUCT' ? Math.max(0, prevVG - numQty) : numQty;
            uVars[vIdx] = { ...uVars[vIdx], GodownStock: newVG, godownStock: newVG };
          } else {
            const newVS = actionType === 'ADD' ? prevVS + numQty : actionType === 'DEDUCT' ? Math.max(0, prevVS - numQty) : numQty;
            uVars[vIdx] = { ...uVars[vIdx], StockQuantity: newVS, CurrentStock: newVS };
          }
          prod.Variants = uVars;
          prod.VariantsJSON = JSON.stringify(uVars);
        }
      }

      if (location === 'Godown') {
        prevStock = Number(prod.GodownStock || 0);
        if (actionType === 'ADD') newStock = prevStock + numQty;
        else if (actionType === 'DEDUCT') newStock = Math.max(0, prevStock - numQty);
        else if (actionType === 'SET') newStock = numQty;
        prod.GodownStock = newStock;
        prod.godownStock = newStock;
      } else {
        prevStock = Number(prod.StockQuantity || 0);
        if (actionType === 'ADD') newStock = prevStock + numQty;
        else if (actionType === 'DEDUCT') newStock = Math.max(0, prevStock - numQty);
        else if (actionType === 'SET') newStock = numQty;
        prod.StockQuantity = newStock;
        prod.StockQuantit = newStock;
        prod.CurrentStock = newStock;
      }
      prod.TotalStock = (Number(prod.StockQuantity) || 0) + (Number(prod.GodownStock) || 0);
      prod.UpdatedAt = new Date().toISOString();
      updatedProducts[idx] = prod;

      setProducts(updatedProducts);
      saveLocalProducts(updatedProducts);

      const moveType = actionType === 'DEDUCT' ? (reason?.includes('ড্যামেজ') ? 'DAMAGE' : 'ADJUSTMENT') : 'ADJUSTMENT';
      const varName = matchedVariant?.VariantName || (matchedVariant?.Color ? `রং: ${matchedVariant.Color}` : '') || (matchedVariant?.Size ? `সাইজ: ${matchedVariant.Size}` : '');
      const { entry, movements } = recordStockMovementLocally({
        location,
        type: moveType,
        reasonBangla: reason || `${location === 'Godown' ? 'গোডাউন' : 'দোকান'} স্টক সমন্বয় (${actionType === 'ADD' ? 'যোগ' : actionType === 'DEDUCT' ? 'কর্তন' : 'নতুন মান নির্ধারণ'})`,
        productId: prod.ProductID,
        productName: prod.ProductName,
        barcode: prod.Barcode,
        unit: prod.Unit || 'Pcs',
        quantity: numQty,
        previousStock: prevStock,
        remainingStock: newStock,
        referenceNo: `ADJ-${Date.now().toString().slice(-6)}`,
        operatorName: activeUser?.FullName || 'Admin',
        notes: notes || '',
        variantId: variantId || '',
        variantName: varName,
        color: matchedVariant?.Color || '',
        size: matchedVariant?.Size || '',
        category: prod.Category || ''
      });
      setStockMovements(movements);
      showToast(`${location === 'Godown' ? 'গোডাউন' : 'দোকান'} স্টক সফলভাবে আপডেট হয়েছে!`, 'success');
    } catch (err) {
      showToast(`স্টক অ্যাডজাস্ট ব্যর্থ: ${err.message}`, 'error');
    }
  };

  // ============================================================================
  // ফেজ ৮: টার্গেটেড আরএফএম এসএমএস ক্যাম্পেইন ও ডিরেক্ট রি-অ্যাক্টিভেশন
  // ============================================================================
  const handleSendBulkSmsCampaign = async (campaignPayload) => {
    try {
      const sentBy = activeUser?.FullName || 'Admin';
      const payloadWithUser = {
        ...campaignPayload,
        sentBy
      };

      // স্থানীয়ভাবে তাৎক্ষণিক ক্যাম্পেইন হিস্ট্রি সংরক্ষণ (অফলাইন-ফার্স্ট)
      const localRecord = saveCampaignLocally(payloadWithUser);

      // অডিট ট্রেইল সংরক্ষণ
      const logEntry = logAuditEventLocally({
        userId: activeUser?.UserID || 'ADMIN',
        userName: activeUser?.FullName || 'Admin',
        userRole: activeUser?.Role || 'Admin',
        actionType: 'SMS_CAMPAIGN',
        module: 'CustomerCampaigns',
        description: `টার্গেটেড এসএমএস ক্যাম্পেইন সম্পন্ন: "${campaignPayload.title}" (${campaignPayload.recipients?.length || 0} প্রাপক, সেগমেন্ট: ${campaignPayload.segment || 'All'})`,
        details: payloadWithUser
      });
      setAuditLogs(getLocalAuditLogs());

      if (settings?.apiUrl) {
        try {
          postLogAuditEvent(settings.apiUrl, logEntry).catch(() => {});
          const res = await postSendBulkTargetedSms(settings.apiUrl, payloadWithUser);
          if (res.success) {
            showToast(`এসএমএস ক্যাম্পেইন সফল: ${res.sentCount || campaignPayload.recipients?.length} টি এসএমএস পাঠানো হয়েছে!`, 'success');
            return { success: true, count: res.sentCount || campaignPayload.recipients?.length };
          } else {
            showToast(`এসএমএস নোটিশ: ${res.message || 'কিছু এসএমএস প্রেরণে সমস্যা হতে পারে'}`, 'warning');
            return { success: false, message: res.message };
          }
        } catch (apiErr) {
          console.warn('Targeted SMS sync delayed:', apiErr);
          showToast(`এসএমএস ব্যাকগ্রাউন্ড পাঠানো হচ্ছে: ${apiErr.message}`, 'info');
          return { success: true, count: campaignPayload.recipients?.length };
        }
      } else {
        showToast('অফলাইন মোড: এসএমএস ক্যাম্পেইন হিস্ট্রি স্থানীয়ভাবে সংরক্ষিত হয়েছে।', 'info');
        return { success: true, count: campaignPayload.recipients?.length };
      }
    } catch (err) {
      console.error('Campaign dispatch error:', err);
      showToast(`ক্যাম্পেইন ত্রুটি: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  // ৭. অতীত ইনভয়েস রি-প্রিন্ট ওপেন করা
  const handleOpenReprintInvoice = (sale) => {
    setActiveInvoiceData(sale);
    setAutoTriggerPrint(false);
    setIsInvoiceModalOpen(true);
  };

  // ৭.১ ইনভয়েস নম্বর দিয়ে বিস্তারিত মেমো অনুসন্ধান ওপেন করা
  const handleOpenInvoiceLookup = (initialInvoice = '') => {
    const invStr = typeof initialInvoice === 'string' 
      ? initialInvoice 
      : (initialInvoice?.invoiceNo || initialInvoice?.InvoiceNo || '');
    setSelectedLookupInvoiceNo(invStr);
    setIsInvoiceLookupOpen(true);
  };

  // ৮. নতুন পণ্য তৈরির হ্যান্ডলার
  const handleSubmitProduct = async (productData) => {
    const effectiveUnit = getProductDisplayUnit({
      Unit: productData.unit || productData.Unit,
      Category: productData.category,
    });
    const isThan = /than|থান/i.test(effectiveUnit);
    const yardsPerThan = isThan ? Number(productData.yardsPerThan !== undefined ? productData.yardsPerThan : (productData.YardsPerThan || 25)) : 0;
    const thanCount = isThan ? (Number(productData.thanCount !== undefined ? productData.thanCount : (productData.initialGodownStock || productData.initialStock || 0))) : 0;
    const totalYards = isThan
      ? (thanCount * yardsPerThan)
      : (/গজ|yard/i.test(effectiveUnit) ? (Number(productData.initialGodownStock || 0) + Number(productData.initialStock || 0)) : 0);

    const newProd = {
      ProductID: `PROD-${Date.now().toString().slice(-4)}`,
      Barcode: productData.barcode || '',
      ProductName: productData.productName,
      Category: productData.category || 'General',
      SubCategory: productData.subCategory || '',
      ImageUrl: productData.imageUrl || productData.imageBase64 || '',
      ImageCaption: productData.imageCaption || '',
      CostPrice: Number(productData.costPrice) || 0,
      WholesalePrice: Number(productData.wholesalePrice !== undefined ? productData.wholesalePrice : (productData.WholesalePrice || 0)) || 0,
      wholesalePrice: Number(productData.wholesalePrice !== undefined ? productData.wholesalePrice : (productData.WholesalePrice || 0)) || 0,
      MinSellingPrice: productData.minSellingPrice !== undefined && productData.minSellingPrice !== '' ? Number(productData.minSellingPrice) : (Number(productData.costPrice) || 0),
      SellingPrice: Number(productData.sellingPrice),
      StockQuantity: Number(productData.initialStock) || 0,
      CurrentStock: Number(productData.initialStock) || 0,
      ShopStock: Number(productData.initialStock) || 0,
      GodownStock: Number(productData.initialGodownStock !== undefined ? productData.initialGodownStock : (productData.godownStock || 0)),
      godownStock: Number(productData.initialGodownStock !== undefined ? productData.initialGodownStock : (productData.godownStock || 0)),
      TotalStock: (Number(productData.initialStock) || 0) + Number(productData.initialGodownStock !== undefined ? productData.initialGodownStock : (productData.godownStock || 0)),
      YardsPerThan: yardsPerThan,
      yardsPerThan: yardsPerThan,
      ThanCount: thanCount,
      thanCount: thanCount,
      TotalThan: isThan ? thanCount : 0,
      totalThan: isThan ? thanCount : 0,
      TotalYards: totalYards,
      totalYards: totalYards,
      MinStockAlert: Number(productData.minStockAlert) || 5,
      Unit: effectiveUnit,
      unit: effectiveUnit,
      ShortDescription: productData.shortDescription || '',
      Description: productData.description || '',
      Features: Array.isArray(productData.features) ? productData.features : [],
      HasVariants: Boolean(productData.hasVariants),
      Variants: Array.isArray(productData.variants) ? productData.variants : [],
      VariantsJSON: productData.variantsJSON || (Array.isArray(productData.variants) ? JSON.stringify(productData.variants) : ''),
      BatchNumber: productData.batchNumber || '',
      ExpiryDate: productData.expiryDate || '',
      MfgDate: productData.mfgDate || '',
      IsBundle: Boolean(productData.isBundle),
      BundleItems: Array.isArray(productData.bundleItems) ? productData.bundleItems : [],
      BundleItemsJSON: productData.bundleItemsJSON || (Array.isArray(productData.bundleItems) ? JSON.stringify(productData.bundleItems) : ''),
      CreatedAt: new Date().toISOString(),
    };

    const updatedList = [newProd, ...products];
    setProducts(updatedList);
    saveLocalProducts(updatedList);

    // গোডাউন ও দোকান প্রাথমিক স্টক ট্র্যাকিং রেকর্ড সংরক্ষণ
    const initialGodown = Number(newProd.GodownStock || 0);
    if (initialGodown > 0) {
      recordStockMovementLocally({
        location: 'Godown',
        type: 'ADJUSTMENT',
        reasonBangla: `নতুন পণ্য গোডাউনে প্রাথমিক সংযোজন (${initialGodown} ${newProd.Unit}${newProd.YardsPerThan > 0 ? ` - ${initialGodown * newProd.YardsPerThan} গজ` : ''})`,
        productId: newProd.ProductID,
        productName: newProd.ProductName,
        barcode: newProd.Barcode,
        unit: newProd.Unit,
        quantity: initialGodown,
        previousStock: 0,
        remainingStock: initialGodown,
        referenceNo: `IN-GD-${Date.now().toString().slice(-6)}`,
        operatorName: activeUser?.FullName || 'Admin',
        notes: 'গোডাউনে প্রাথমিক আগমন'
      });
    }
    const initialShop = Number(newProd.StockQuantity || 0);
    if (initialShop > 0) {
      recordStockMovementLocally({
        location: 'Shop',
        type: 'ADJUSTMENT',
        reasonBangla: `নতুন পণ্য দোকানে প্রাথমিক স্টক (${initialShop} ${newProd.Unit})`,
        productId: newProd.ProductID,
        productName: newProd.ProductName,
        barcode: newProd.Barcode,
        unit: newProd.Unit,
        quantity: initialShop,
        previousStock: 0,
        remainingStock: initialShop,
        referenceNo: `IN-SH-${Date.now().toString().slice(-6)}`,
        operatorName: activeUser?.FullName || 'Admin',
        notes: 'দোকানে প্রাথমিক আগমন'
      });
    }

    // লোকাল ক্যাটাগরি তালিকায় না থাকলে স্বয়ংক্রিয়ভাবে লোকাল ক্যাটাগরিতেও যুক্ত করা
    if (productData.category) {
      const exists = categories.some(
        c => c.CategoryName === productData.category &&
             (c.SubCategoryName || '') === (productData.subCategory || '')
      );
      if (!exists) {
        const newCat = {
          CategoryID: `CAT-${Date.now().toString().slice(-4)}`,
          CategoryName: productData.category,
          SubCategoryName: productData.subCategory || '',
          Status: 'Active',
        };
        const updatedCats = [...categories, newCat];
        setCategories(updatedCats);
        saveLocalCategories(updatedCats);
      }
    }

    if (settings.apiUrl) {
      try {
        const response = await postAddProduct(settings.apiUrl, productData);
        if (response && response.success) {
          if (response.data) {
            const synced = updatedList.map(p =>
              p.ProductID === newProd.ProductID
                ? { 
                    ...p, 
                    ProductID: response.data.productId || p.ProductID,
                    ImageUrl: response.data.imageUrl || p.ImageUrl
                  }
                : p
            );
            setProducts(synced);
            saveLocalProducts(synced);
          }
          if (response.imageUploadError) {
            showToast(response.message || `পণ্য ডাটাবেসে সেভ হয়েছে, কিন্তু ছবি ড্রাইভে সেভ হয়নি (${response.imageUploadError})`, 'warning');
          } else {
            showToast(response.message || 'নতুন পণ্য ডাটাবেসে (Google Sheets) সফলভাবে যুক্ত হয়েছে!', 'success');
          }
        } else {
          showToast(`ডাটাবেস সংরক্ষণ ব্যর্থ: ${response?.message || 'অজানা ত্রুটি'}`, 'warning');
        }
      } catch (e) {
        console.error('Failed to add product to database:', e);
        showToast(`ডাটাবেসে পাঠাতে ব্যর্থ: ${e.message || 'নেটওয়ার্ক বা পারমিশন এরর'} (অফলাইনে সংরক্ষিত)`, 'error');
      }
    } else {
      showToast('সতর্কবার্তা: API URL কনফিগার করা নেই! পণ্য শুধুমাত্র অফলাইনে সংরক্ষিত হয়েছে। Settings-এ গিয়ে Web App URL দিন।', 'warning');
    }
  };

  // ৮.১ নতুন ক্যাটাগরি তৈরির হ্যান্ডলার
  const handleAddCategory = async (catData) => {
    const catName = catData.categoryName || catData.CategoryName;
    const subCatName = catData.subCategoryName || catData.SubCategoryName || '';

    const newCat = {
      CategoryID: `CAT-${Date.now().toString().slice(-4)}`,
      CategoryName: catName,
      SubCategoryName: subCatName,
      Status: 'Active',
    };
    const updatedCats = [...categories, newCat];
    setCategories(updatedCats);
    saveLocalCategories(updatedCats);

    if (settings.apiUrl) {
      try {
        const response = await postAddCategory(settings.apiUrl, catData);
        if (response && response.success) {
          showToast('নতুন ক্যাটাগরি ডাটাবেসে সফলভাবে যুক্ত হয়েছে!', 'success');
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'ক্যাটাগরি শিটে যুক্ত হয়নি'}`, 'warning');
        }
      } catch (e) {
        showToast('ক্যাটাগরি লোকাল স্টোরেজে সংরক্ষিত হয়েছে (অফলাইন)।', 'info');
      }
    } else {
      showToast('ক্যাটাগরি লোকাল স্টোরেজে সংরক্ষিত হয়েছে।', 'success');
    }
  };

  // ৮.২ নতুন পরিমাপক একক (Unit) তৈরির হ্যান্ডলার
  const handleAddUnit = async (unitData) => {
    const unitName = unitData.unitName || unitData.UnitName;
    const shortName = unitData.shortName || unitData.ShortName || unitName;

    const newUnit = {
      UnitID: `UNT-${Date.now().toString().slice(-4)}`,
      UnitName: unitName,
      ShortName: shortName,
      Status: 'Active',
    };
    const updatedUnits = [...units, newUnit];
    setUnits(updatedUnits);
    saveLocalUnits(updatedUnits);

    if (settings.apiUrl) {
      try {
        const response = await postAddUnit(settings.apiUrl, unitData);
        if (response && response.success) {
          showToast('নতুন পরিমাপক একক ডাটাবেসে সফলভাবে যুক্ত হয়েছে!', 'success');
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'একক শিটে যুক্ত হয়নি'}`, 'warning');
        }
      } catch (e) {
        showToast('একক লোকাল স্টোরেজে সংরক্ষিত হয়েছে (অফলাইন)।', 'info');
      }
    } else {
      showToast('একক লোকাল স্টোরেজে সংরক্ষিত হয়েছে।', 'success');
    }
  };

  // ৮.২.১ ভ্যারিয়েন্ট অপশন (রং, সাইজ ইত্যাদি) ডাটাবেসে যোগ
  const handleAddVariantOption = async (optionData) => {
    const type = optionData.type || optionData.Type || 'Color';
    const name = String(optionData.name || optionData.Name || '').trim();
    if (!name) return null;

    const newId = `VAR-${type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newOption = {
      VariantID: newId,
      Type: type,
      Name: name,
      Value: optionData.value || '',
      Status: 'Active',
      CreatedAt: new Date().toISOString()
    };

    let wasAdded = false;
    setVariantAttributes(prev => {
      const exists = prev.some(v => 
        String(v.Type || 'Color').toLowerCase() === type.toLowerCase() && 
        String(v.Name || '').trim().toLowerCase() === name.toLowerCase()
      );
      if (exists) return prev;
      wasAdded = true;
      const updated = [...prev, newOption];
      saveLocalVariants(updated);
      return updated;
    });

    if (settings.apiUrl) {
      try {
        const response = await postAddVariantOption(settings.apiUrl, { type, name, value: optionData.value || '' });
        if (response && response.success) {
          showToast(`'${name}' ভ্যারিয়েন্ট ডাটাবেসে সংরক্ষিত হয়েছে!`, 'success');
        } else {
          showToast(`ভ্যারিয়েন্ট লোকাল স্টোরেজে সংরক্ষিত হয়েছে (${response?.message || 'অফলাইন'})`, 'info');
        }
      } catch (err) {
        showToast('ভ্যারিয়েন্ট লোকাল স্টোরেজে সংরক্ষিত হয়েছে (অফলাইন)।', 'info');
      }
    } else {
      showToast(`'${name}' ভ্যারিয়েন্ট লোকাল ডাটাবেসে যুক্ত হয়েছে!`, 'success');
    }

    return newOption;
  };

  // ৮.৩ পণ্য সম্পাদনা মডাল ওপেন
  const handleOpenEditProduct = (product) => {
    setSelectedProductForEdit(product);
    setIsEditProductModalOpen(true);
  };

  // ৮.৪ বিদ্যমান পণ্য সম্পাদনা সংরক্ষণ (Edit/Update Product)
  const handleUpdateProduct = async (productData) => {
    const pId = productData.productId || productData.ProductID;
    const updatedList = products.map((p) => {
      if (p.ProductID === pId) {
        const effectiveUnit = getProductDisplayUnit({
          Unit: productData.unit || productData.Unit || p.Unit,
          Category: productData.category || p.Category,
        });
        const isThan = /than|থান/i.test(effectiveUnit);
        const yardsPerThan = isThan ? Number(productData.yardsPerThan !== undefined ? productData.yardsPerThan : (p.YardsPerThan || 25)) : 0;
        const thanCount = isThan ? Number(productData.thanCount !== undefined ? productData.thanCount : (p.ThanCount || (Number(productData.godownStock !== undefined ? productData.godownStock : p.GodownStock || 0) + Number(productData.stockQuantity !== undefined ? productData.stockQuantity : p.StockQuantity || 0)))) : 0;
        const totalYards = isThan
          ? (thanCount * yardsPerThan)
          : (/গজ|yard/i.test(effectiveUnit) ? (Number(productData.stockQuantity || 0) + (productData.godownStock !== undefined ? Number(productData.godownStock) : Number(p.GodownStock || 0))) : 0);

        return {
          ...p,
          Barcode: productData.barcode || '',
          ProductName: productData.productName,
          Category: productData.category || 'General',
          SubCategory: productData.subCategory || '',
          ImageUrl: productData.imageUrl || (productData.imageBase64 ? productData.imageBase64 : p.ImageUrl || ''),
          ImageCaption: productData.imageCaption !== undefined ? productData.imageCaption : (p.ImageCaption || ''),
          CostPrice: Number(productData.costPrice) || 0,
          WholesalePrice: productData.wholesalePrice !== undefined ? Number(productData.wholesalePrice) : (productData.WholesalePrice !== undefined ? Number(productData.WholesalePrice) : Number(p.WholesalePrice || 0)),
          wholesalePrice: productData.wholesalePrice !== undefined ? Number(productData.wholesalePrice) : (productData.WholesalePrice !== undefined ? Number(productData.WholesalePrice) : Number(p.WholesalePrice || 0)),
          MinSellingPrice: productData.minSellingPrice !== undefined && productData.minSellingPrice !== '' ? Number(productData.minSellingPrice) : (Number(productData.costPrice) || 0),
          SellingPrice: Number(productData.sellingPrice) || 0,
          StockQuantity: Number(productData.stockQuantity) || 0,
          CurrentStock: Number(productData.stockQuantity) || 0,
          ShopStock: Number(productData.stockQuantity) || 0,
          GodownStock: productData.godownStock !== undefined ? Number(productData.godownStock) : Number(p.GodownStock || 0),
          godownStock: productData.godownStock !== undefined ? Number(productData.godownStock) : Number(p.GodownStock || 0),
          TotalStock: (Number(productData.stockQuantity) || 0) + (productData.godownStock !== undefined ? Number(productData.godownStock) : Number(p.GodownStock || 0)),
          YardsPerThan: yardsPerThan,
          yardsPerThan: yardsPerThan,
          ThanCount: thanCount,
          thanCount: thanCount,
          TotalThan: isThan ? thanCount : 0,
          totalThan: isThan ? thanCount : 0,
          TotalYards: totalYards,
          totalYards: totalYards,
          MinStockAlert: Number(productData.minStockAlert) || 5,
          Unit: effectiveUnit,
          unit: effectiveUnit,
          ShortDescription: productData.shortDescription || '',
          Description: productData.description || '',
          Features: Array.isArray(productData.features) ? productData.features : [],
          HasVariants: Boolean(productData.hasVariants !== undefined ? productData.hasVariants : p.HasVariants),
          Variants: Array.isArray(productData.variants) ? productData.variants : (p.Variants || []),
          VariantsJSON: productData.variantsJSON || (Array.isArray(productData.variants) ? JSON.stringify(productData.variants) : (p.VariantsJSON || '')),
          BatchNumber: productData.batchNumber !== undefined ? productData.batchNumber : (p.BatchNumber || ''),
          ExpiryDate: productData.expiryDate !== undefined ? productData.expiryDate : (p.ExpiryDate || ''),
          MfgDate: productData.mfgDate !== undefined ? productData.mfgDate : (p.MfgDate || ''),
          IsBundle: Boolean(productData.isBundle !== undefined ? productData.isBundle : p.IsBundle),
          BundleItems: Array.isArray(productData.bundleItems) ? productData.bundleItems : (p.BundleItems || []),
          BundleItemsJSON: productData.bundleItemsJSON || (Array.isArray(productData.bundleItems) ? JSON.stringify(productData.bundleItems) : (p.BundleItemsJSON || '')),
          UpdatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setProducts(updatedList);
    saveLocalProducts(updatedList);

    // কার্টে যদি পণ্যটি থাকে তবে তার তথ্য আপডেট করা
    const updatedCart = cart.map((item) => {
      if (item.productId === pId) {
        return {
          ...item,
          productName: productData.productName,
          sellingPrice: Number(productData.sellingPrice) || 0,
          costPrice: Number(productData.costPrice) || 0,
          minSellingPrice: productData.minSellingPrice !== undefined && productData.minSellingPrice !== '' ? Number(productData.minSellingPrice) : (Number(productData.costPrice) || 0),
          unit: productData.unit || 'Pcs',
          stockQuantity: Number(productData.stockQuantity) || 0,
        };
      }
      return item;
    });
    setCart(updatedCart);
    saveLocalCart(updatedCart);

    // ডিটেইলস মডাল ওপেন থাকলে সেটির সিলেক্টেড অবজেক্টও রিফ্রেশ করা
    if (selectedProductForDetails && selectedProductForDetails.ProductID === pId) {
      const refreshedObj = updatedList.find(p => p.ProductID === pId);
      if (refreshedObj) {
        setSelectedProductForDetails(refreshedObj);
      }
    }

    showToast(`'${productData.productName}' পণ্যের তথ্য আপডেট হয়েছে!`, 'success');

    if (settings.apiUrl) {
      try {
        const response = await postUpdateProduct(settings.apiUrl, productData);
        if (response && response.success) {
          if (response.data && response.data.imageUrl) {
            const synced = updatedList.map(p =>
              p.ProductID === pId
                ? { ...p, ImageUrl: response.data.imageUrl }
                : p
            );
            setProducts(synced);
            saveLocalProducts(synced);
          }
          if (response.imageUploadError) {
            showToast(response.message || `পণ্য আপডেট হয়েছে, কিন্তু ছবি ড্রাইভে সেভ হয়নি (${response.imageUploadError})`, 'warning');
          } else {
            showToast(response.message || 'গুগল শিট ও ড্রাইভে পণ্য সফলভাবে আপডেট হয়েছে!', 'success');
          }
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'শিট সিঙ্ক ব্যর্থ'}`, 'warning');
        }
      } catch (err) {
        showToast('পণ্য লোকালভাবে আপডেট হয়েছে (অফলাইন)।', 'info');
      }
    }
  };

  // ৮.৫ পণ্য মুছে ফেলা ও ডাটাবেসের সাথে অটো-সিঙ্ক (Delete/Remove Product & Auto-sync)
  const handleDeleteProduct = async (productId) => {
    const cleanId = String(productId || '').trim();
    if (!cleanId) return false;

    const targetProduct = products.find(
      (p) => String(p.ProductID || '').trim() === cleanId || (p.Barcode && String(p.Barcode).trim() === cleanId)
    );
    const prodName = targetProduct?.ProductName || cleanId;
    const resolvedId = targetProduct?.ProductID || cleanId;
    const resolvedBarcode = targetProduct?.Barcode || '';

    // ১. ফ্রন্টএন্ড প্রোডাক্ট তালিকা ও লোকালস্টোরেজ থেকে অপসারণ
    const filteredProducts = products.filter(
      (p) => String(p.ProductID || '').trim() !== resolvedId && (resolvedBarcode ? String(p.Barcode || '').trim() !== resolvedBarcode : true)
    );
    setProducts(filteredProducts);
    saveLocalProducts(filteredProducts);

    // ২. কার্ট থেকে অপসারণ
    const filteredCart = cart.filter((item) => String(item.productId || '').trim() !== resolvedId);
    setCart(filteredCart);
    saveLocalCart(filteredCart);

    // ৩. ডিটেইলস ও এডিট মডাল বন্ধ করা
    if (selectedProductForDetails && String(selectedProductForDetails.ProductID || '').trim() === resolvedId) {
      setSelectedProductForDetails(null);
      setIsProductDetailsOpen(false);
    }
    if (selectedProductForEdit && String(selectedProductForEdit.ProductID || '').trim() === resolvedId) {
      setSelectedProductForEdit(null);
      setIsEditProductModalOpen(false);
    }

    showToast(`'${prodName}' ফ্রন্টএন্ড থেকে মুছে ফেলা হয়েছে...`, 'info');

    // ৪. গুগল শিট ডাটাবেস থেকে রিমুভ ও অটো-সিঙ্ক
    if (settings.apiUrl && settings.apiUrl.trim()) {
      try {
        const response = await postDeleteProduct(settings.apiUrl, resolvedId, resolvedBarcode);
        if (response && response.success) {
          showToast(`'${prodName}' গুগল শিট ডাটাবেস থেকে সফলভাবে মুছে ফেলা হয়েছে!`, 'success');
          // ডাটাবেস ও ফ্রন্টএন্ড ১০০% মেলানোর জন্য স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক
          setTimeout(() => {
            handleSync(false);
          }, 300);
          return true;
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'গুগল শিট থেকে ডিলিট ব্যর্থ'}`, 'warning');
          return false;
        }
      } catch (err) {
        showToast('অফলাইন মোড: পণ্য লোকাল স্টোরেজ থেকে মুছে ফেলা হয়েছে। নেটওয়ার্ক পেলে সিঙ্ক হবে।', 'warning');
        return true;
      }
    } else {
      showToast('অফলাইন মোড: পণ্য লোকাল স্টোরেজ থেকে সফলভাবে মুছে ফেলা হয়েছে।', 'success');
      return true;
    }
  };

  // ৮.৬ ভ্যারিয়েন্ট লেভেল রিস্টক ও ডিলিট হ্যান্ডলার (Variant-wise Restock & Remove with Auto Sum & DB Sync)
  const handleUpdateProductVariants = async (productId, updatedVariants, changeMeta = null) => {
    const cleanId = String(productId || '').trim();
    const targetProduct = products.find((p) => String(p.ProductID || '').trim() === cleanId);
    if (!targetProduct) return false;

    const safeVariants = Array.isArray(updatedVariants) ? updatedVariants : [];

    // ১. ভ্যারিয়েন্টগুলোর যোগফল বের করা
    const totalGodown = safeVariants.reduce(
      (sum, v) => sum + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0)) || 0), 0
    );
    const totalShop = safeVariants.reduce(
      (sum, v) => sum + (Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : (v.ShopStock !== undefined ? v.ShopStock : 0))) || 0), 0
    );
    const totalAll = totalGodown + totalShop;
    const isThan = Boolean(targetProduct.TotalThan || targetProduct.YardsPerThan || /than|থান/i.test(targetProduct.Unit || ''));
    const yardsPerThan = Number(targetProduct.YardsPerThan) || 0;

    const updatedProd = {
      ...targetProduct,
      HasVariants: safeVariants.length > 0,
      Variants: safeVariants,
      VariantsJSON: JSON.stringify(safeVariants),
      GodownStock: totalGodown,
      godownStock: totalGodown,
      StockQuantity: totalShop,
      CurrentStock: totalShop,
      ShopStock: totalShop,
      TotalStock: totalAll,
      TotalThan: isThan ? totalAll : targetProduct.TotalThan,
      ThanCount: isThan ? totalAll : targetProduct.ThanCount,
      TotalGoj: isThan ? (totalAll * yardsPerThan) : targetProduct.TotalGoj,
      TotalYards: isThan ? (totalAll * yardsPerThan) : targetProduct.TotalYards,
      UpdatedAt: new Date().toISOString()
    };

    const nextProducts = products.map((p) => String(p.ProductID || '').trim() === cleanId ? updatedProd : p);
    setProducts(nextProducts);
    saveLocalProducts(nextProducts);

    // ডিটেইলস মডাল ওপেন থাকলে রিফ্রেশ
    if (selectedProductForDetails && String(selectedProductForDetails.ProductID || '').trim() === cleanId) {
      setSelectedProductForDetails(updatedProd);
    }

    // মুভমেন্ট হিস্ট্রি লগ
    if (changeMeta) {
      try {
        recordStockMovementLocally({
          location: changeMeta.location || 'Godown',
          type: changeMeta.type || 'ADJUSTMENT',
          reasonBangla: changeMeta.reason || `ভ্যারিয়েন্ট আপডেট (${changeMeta.variantName || 'সকল'})`,
          productId: targetProduct.ProductID,
          productName: targetProduct.ProductName,
          barcode: targetProduct.Barcode,
          unit: targetProduct.Unit || 'Pcs',
          quantity: Number(changeMeta.qty || 0),
          previousStock: Number(changeMeta.prevStock || 0),
          remainingStock: Number(changeMeta.newStock || 0),
          operatorName: activeUser?.FullName || 'Admin',
          notes: changeMeta.notes || 'ভ্যারিয়েন্ট স্টক সমন্বয়',
          variantId: changeMeta.variantId || '',
          variantName: changeMeta.variantName || '',
          color: changeMeta.color || '',
          size: changeMeta.size || '',
          category: targetProduct.Category || ''
        });
      } catch (e) {
        console.warn('Stock movement logging error:', e);
      }
    }

    showToast(`'${targetProduct.ProductName}' পণ্যের ভ্যারিয়েন্ট স্টক সফলভাবে সংরক্ষিত হয়েছে!`, 'success');

    // গুগল শিট ডাটাবেসে সেভ ও অটো সিঙ্ক
    if (settings.apiUrl && settings.apiUrl.trim()) {
      try {
        const payload = {
          productId: targetProduct.ProductID,
          productName: targetProduct.ProductName,
          barcode: targetProduct.Barcode,
          category: targetProduct.Category,
          costPrice: targetProduct.CostPrice,
          sellingPrice: targetProduct.SellingPrice,
          godownStock: totalGodown,
          stockQuantity: totalShop,
          totalStock: totalAll,
          thanCount: isThan ? totalAll : targetProduct.ThanCount,
          totalYards: isThan ? (totalAll * yardsPerThan) : targetProduct.TotalYards,
          hasVariants: safeVariants.length > 0,
          variants: safeVariants,
          variantsJSON: JSON.stringify(safeVariants)
        };
        const response = await postUpdateProduct(settings.apiUrl, payload);
        if (response && response.success) {
          showToast('গুগল শিট ডাটাবেসে ভ্যারিয়েন্ট স্টক সিঙ্ক সম্পন্ন হয়েছে!', 'success');
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'শিট সিঙ্ক ব্যর্থ'}`, 'warning');
        }
      } catch (err) {
        showToast('অফলাইন মোড: লোকাল স্টোরেজে সেভ হয়েছে।', 'info');
      }
    }
    return true;
  };

  // ৯. সেটিংস আপডেট হ্যান্ডলার - সংরক্ষণ করেই অবিলম্বে গুগল শিটের সাথে ডাটা সিঙ্ক
  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    saveLocalSettings(newSettings);
    showToast('সেটিংস সংরক্ষণ করা হচ্ছে...', 'info');

    if (newSettings.apiUrl && newSettings.apiUrl.trim()) {
      try {
        const response = await postUpdateSettings(newSettings.apiUrl, newSettings);
        if (response && response.success) {
          showToast('গুগল শিটে সেটিংস সফলভাবে আপডেট হয়েছে!', 'success');
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'শিট আপডেট ব্যর্থ'}`, 'warning');
        }
      } catch (e) {
        showToast('নেটওয়ার্ক সমস্যা: সেটিংস লোকাল স্টোরেজে সংরক্ষিত হয়েছে।', 'warning');
      }

      // নতুন API URL দিয়ে সরাসরি গুগল শিট Products ডাটাবেস থেকে রিয়েল পণ্য সিঙ্ক করা
      await handleSync(true, newSettings.apiUrl);
    } else {
      showToast('সেটিংস লোকাল স্টোরেজে সংরক্ষিত হয়েছে।', 'success');
    }
  };

  // ১০. API কানেকশন টেস্ট
  const handleTestConnection = async (apiUrl) => {
    const data = await fetchInitialData(apiUrl);
    if (data.products && Array.isArray(data.products)) {
      const cleanList = data.products
        .filter(p => !isDemoProduct(p))
        .map(normalizeProduct)
        .filter(Boolean);
      setProducts(cleanList);
      saveLocalProducts(cleanList);
    }
    if (data.units && Array.isArray(data.units)) {
      setUnits(data.units);
      saveLocalUnits(data.units);
    }
    if (data.variants && Array.isArray(data.variants)) {
      setVariantAttributes(data.variants);
      saveLocalVariants(data.variants);
    }
    setSyncStatus('online');
    return true;
  };

  const isLoggedIn = Boolean(activeUser && activeUser.Role && activeUser.UserID !== 'USER-GUEST');
  const isAdmin = isLoggedIn && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier' || activeUser.Role === 'Manager' || activeUser.Role === 'Salesman' || activeUser.Role === 'Staff');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* টপ নেভিগেশন বার (সরাসরি স্টোর লোগো, নাম, সিঙ্ক, হিস্ট্রি, সেটিংস ও প্রোফাইল আইকন) */}
      <Navbar
        settings={settings}
        activeUser={activeUser}
        syncStatus={syncStatus}
        onSync={() => handleSync(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenUsersModal={() => executeAdminAction(() => setIsUsersModalOpen(true), 'ইউজার ও স্টাফ একাউন্ট ম্যানেজ করতে')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCustomerOrdersModal={() => setIsCustomerOrdersOpen(true)}
        onSwitchToCustomerMode={handleSwitchToCustomerMode}
        onLogout={handleLogout}
        onNavigate={handleSecureNavigate}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        lowStockCount={lowStockCount}
        cartCount={Array.isArray(cart) ? cart.length : 0}
        heldCartsCount={heldCarts.length}
        onOpenHeldCartsModal={() => setIsHeldCartsModalOpen(true)}
        onOpenTailoringModal={() => {
          setTailoringPreloadData(null);
          setCurrentView('tailoring');
        }}
        tailoringOrdersCount={runningTailoringOrdersCount}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        isSoundActive={isSoundActive}
        onToggleSound={handleToggleSound}
        currentView={currentView}
      />

      {/* মূল বডি লেআউট: স্থায়ী সাইডবার প্যানেল (শুধুমাত্র এডমিনের জন্য) এবং মূল অ্যাপ্লিকেশন কন্টেন্ট */}
      <div className="flex-1 flex w-full relative">
        
        {/* সাইডবার মেনু প্যানেল (শুধুমাত্র এডমিন লগইন থাকলে দৃশ্যমান) */}
        {isAdmin && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            settings={settings}
            activeUser={activeUser}
            currentView={currentView}
            onNavigate={handleSecureNavigate}
            cartCount={Array.isArray(cart) ? cart.length : 0}
            cartTotal={Array.isArray(cart) ? cart.reduce((a, b) => a + (Number(b.sellingPrice) || 0) * (Number(b.quantity) || 0), 0) : 0}
            currencySymbol={settings.CurrencySymbol || '৳'}
            lowStockCount={lowStockCount}
            godownLowStockCount={godownLowStockCount}
            pendingOrdersCount={pendingOrdersCount}
            onOpenStockModal={() => {
              setQuickRestockProductId('');
              setIsStockModalOpen(true);
            }}
            onOpenProductModal={() => setIsProductModalOpen(true)}
            onOpenAnalyticsModal={() => executeAdminAction(() => setIsAnalyticsModalOpen(true), 'লাভ-ক্ষতি ও P&L অ্যানালিটিক্স রিপোর্ট দেখতে')}
            onOpenBackupModal={() => executeAdminAction(() => setIsBackupModalOpen(true), '১-ক্লিক সম্পূর্ণ ডাটা ব্যাকআপ ও এক্সেল ডাউনলোড করতে')}
            onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
            onOpenGodownLowStockModal={() => handleOpenStockTransferModalWithConfig('godown_stock', 'new', 'LOW_GODOWN')}
            onOpenExpiryAlertModal={() => setIsExpiryAlertModalOpen(true)}
            expiringProductsCount={expiringProductsSummary.totalAlerts}
            onOpenCustomersModal={() => setIsCustomersModalOpen(true)}
            onOpenCustomerLedgerModal={() => setIsCustomerLedgerModalOpen(true)}
            onOpenRFMCampaignModal={() => setIsRFMCampaignModalOpen(true)}
            customers={customers}
            suppliersCount={suppliers.length}
            pendingPOCount={purchaseOrders.filter(po => po.Status === 'Ordered').length}
            onOpenSuppliersModal={() => setIsSuppliersModalOpen(true)}
            onOpenPurchaseOrdersModal={() => setIsPurchaseOrdersModalOpen(true)}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onOpenExpensesModal={() => setIsExpensesModalOpen(true)}
            onOpenCashRegisterModal={() => setIsCashRegisterModalOpen(true)}
            onOpenAuditLogsModal={() => setIsAuditLogsModalOpen(true)}
            onOpenSalesReturnModal={() => setIsSalesReturnModalOpen(true)}
            onOpenStockTransferModal={() => handleOpenStockTransferModalWithConfig('overview', 'new', 'ALL')}
            onOpenShopStockModal={() => handleOpenStockTransferModalWithConfig('shop_stock', 'new', 'IN_SHOP')}
            onOpenShopOutflowModal={() => handleOpenStockTransferModalWithConfig('shop_outflow', 'new', 'ALL')}
            onOpenShopChallansModal={() => handleOpenStockTransferModalWithConfig('transfers', 'list', 'ALL')}
            onOpenGodownStockModal={() => handleOpenStockTransferModalWithConfig('godown_stock', 'new', 'IN_GODOWN')}
            onOpenGodownOutflowModal={() => handleOpenStockTransferModalWithConfig('godown_outflow', 'new', 'ALL')}
            onOpenGodownTransferModal={() => handleOpenStockTransferModalWithConfig('transfers', 'new', 'ALL')}
            onOpenTailoringModal={() => {
              setTailoringPreloadData(null);
              setCurrentView('tailoring');
            }}
            tailoringOrdersCount={runningTailoringOrdersCount}
            onOpenFabricWastageModal={() => setCurrentView('fabric_wastage')}
            fabricWastageCount={fabricWastageList.length}
            returnsCount={salesReturns.length}
            transfersInTransitCount={stockTransfers.filter(t => t.Status === 'In Transit').length}
            isRegisterOpen={Boolean(activeRegister && activeRegister.Status === 'Open')}
            expensesCount={expenses.length}
            abandonedCartsCount={pendingAbandonedCartsCount}
            heldCartsCount={heldCarts.length}
            onOpenAbandonedCartModal={() => setIsAbandonedCartModalOpen(true)}
            onOpenHeldCartsModal={() => setIsHeldCartsModalOpen(true)}
            onOpenUsersModal={() => executeAdminAction(() => setIsUsersModalOpen(true), 'ইউজার ও স্টাফ একাউন্ট ম্যানেজ করতে')}
            onOpenCouponModal={() => setIsCouponModalOpen(true)}
            onOpenInvoiceLookupModal={handleOpenInvoiceLookup}
            onOpenCustomerOrdersModal={() => setIsCustomerOrdersOpen(true)}
            onSwitchToCustomerMode={handleSwitchToCustomerMode}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            syncStatus={syncStatus}
          />
        )}

        {/* প্রধান লেআউট ভিউ: ক্যাটালগ | কার্ট পেজ | চেকআউট পেজ | অর্ডার পেজ */}
        <main className={`flex-1 min-w-0 p-3 sm:p-4 lg:p-6 flex flex-col ${!isAdmin ? 'max-w-7xl mx-auto w-full' : ''}`}>
          
          {/* স্টোরফ্রন্ট প্রমোশনাল অফার ব্যানার */}
          {settings?.StorefrontBannerText && settings?.StorefrontEnabled !== false && (
            <div className="mb-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-2xl shadow-sm flex items-center justify-center space-x-2 animate-in fade-in duration-300">
              <span className="text-amber-300 text-base shrink-0">✨</span>
              <span className="tracking-wide text-center">{settings.StorefrontBannerText}</span>
            </div>
          )}

          {currentView === 'pos' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]">
              <ProductCatalog
                products={products}
                currencySymbol={settings.CurrencySymbol || '৳'}
                onAddToCart={handleAddToCart}
                cartItems={cart}
                onOpenProductDetails={handleOpenProductDetails}
                onOpenInvoiceLookup={handleOpenInvoiceLookup}
                onDeleteProduct={handleDeleteProduct}
                onEditProduct={handleOpenEditProduct}
                activeUser={activeUser}
                apiUrl={settings.apiUrl}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onSync={() => handleSync(true)}
                coupons={coupons}
                onOpenVariantSelector={(prod) => setVariantSelectModalProduct(prod)}
                heldCartsCount={heldCarts.length}
                onOpenHeldCartsModal={() => setIsHeldCartsModalOpen(true)}
              />
            </div>
          )}

          {currentView === 'cart' && (
            <CartPage
              cartItems={cart}
              currencySymbol={settings.CurrencySymbol || '৳'}
              taxRatePercent={settings.TaxRatePercent || 0}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateItemPrice={handleUpdateItemPrice}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onNavigateToCatalog={() => setCurrentView('pos')}
              onNavigateToCheckout={() => setCurrentView('checkout')}
              discountAmount={discountAmount}
              setDiscountAmount={setDiscountAmount}
              coupons={coupons}
              activeUser={activeUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              heldCarts={heldCarts}
              onHoldCart={handleHoldCurrentCart}
              onResumeHeldCart={handleResumeHeldCart}
              onOpenHeldCartsModal={() => setIsHeldCartsModalOpen(true)}
              onSendToTailoring={handleSendToTailoringFromCart}
            />
          )}

          {currentView === 'checkout' && (
            <CheckoutPage
              cartItems={cart}
              currencySymbol={settings.CurrencySymbol || '৳'}
              taxRatePercent={settings.TaxRatePercent || 0}
              discountAmount={discountAmount}
              customers={customers}
              salesReturns={salesReturns}
              settings={settings}
              onNavigateToCart={() => setCurrentView('cart')}
              onNavigateToCatalog={() => setCurrentView('pos')}
              onCompleteSale={handleCompleteSale}
              onSaveAbandonedCart={handleSaveAbandonedCart}
              isProcessing={isProcessingSale}
              activeUser={activeUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {currentView === 'orders' && (
            <OrdersPage
              orders={orders}
              setOrders={setOrders}
              products={products}
              settings={settings}
              activeUser={activeUser}
              onSaveOrder={handleSaveOrder}
              onUpdateStatus={handleUpdateOrderStatus}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              onSteadfastBulkDispatch={handleSteadfastBulkDispatch}
              onSteadfastCheckStatus={handleSteadfastCheckStatus}
              onSendSmsNotification={handleSendSmsNotification}
              onResolveRma={handleResolveRma}
              onDeleteOrder={handleDeleteOrder}
              showToast={showToast}
              currencySymbol={settings.CurrencySymbol || '৳'}
            />
          )}

          {/* পূর্ণাঙ্গ ইন-প্লেস পেজ ভিউসমূহ (SPA Page Views - No Discarding Popups) */}
          {currentView === 'analytics' && (
            <AnalyticsDashboard
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              salesHistory={salesHistory}
              orders={orders}
              products={products}
              categories={categories}
              customers={customers}
              customerLedger={customerLedger}
              expenses={expenses}
              fabricWastage={fabricWastageList}
              currencySymbol={settings.CurrencySymbol || '৳'}
              storeSettings={settings}
              onRefreshSales={handleRefreshSales}
            />
          )}

          {currentView === 'customers' && (
            <CustomersModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              customers={customers}
              currencySymbol={settings.CurrencySymbol || '৳'}
              settings={settings}
              onAddCustomer={handleAddCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onRefreshCustomers={handleRefreshCustomers}
              onOpenCustomerLedgerModal={() => setCurrentView('customer_ledger')}
              showToast={showToast}
            />
          )}

          {currentView === 'customer_ledger' && (
            <CustomerLedgerModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              customers={customers}
              customerLedger={customerLedger}
              orders={orders}
              settings={settings}
              activeUser={activeUser}
              onRecordPayment={handleRecordCustomerPayment}
              onUpdateCreditLimit={handleUpdateCustomerCreditLimit}
              onSendSms={handleSendSmsNotification}
              currencySymbol={settings.CurrencySymbol || '৳'}
              showToast={showToast}
            />
          )}

          {currentView === 'sales_returns' && (
            <SalesReturnModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              salesHistory={salesHistory}
              customers={customers}
              products={products}
              salesReturns={salesReturns}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              storeSettings={settings}
              onSaveSalesReturn={handleSaveSalesReturn}
              onRedeemStoreCredit={handleRedeemStoreCredit}
            />
          )}

          {(currentView === 'stock_transfers' ||
            currentView === 'shop_stock' ||
            currentView === 'shop_outflow' ||
            currentView === 'shop_challans' ||
            currentView === 'godown_stock' ||
            currentView === 'godown_outflow' ||
            currentView === 'godown_transfer') && (
            <StockTransferModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              products={products}
              stockTransfers={stockTransfers}
              stockMovements={stockMovements}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              storeSettings={settings}
              onSaveStockTransfer={handleSaveStockTransfer}
              onUpdateStockTransferStatus={handleUpdateStockTransferStatus}
              onDeleteStockTransfer={handleDeleteStockTransfer}
              onAdjustLocationStock={handleAdjustLocationStock}
              onDeleteProduct={handleDeleteProduct}
              onUpdateProductVariants={handleUpdateProductVariants}
              onDirectGodownToShopTransfer={handleDirectGodownToShopTransfer}
              onEditProduct={handleOpenEditProduct}
              variantAttributes={variantAttributes}
              onAddVariantOption={handleAddVariantOption}
              initialTab={
                currentView === 'shop_stock'
                  ? 'shop_stock'
                  : currentView === 'shop_outflow'
                  ? 'shop_outflow'
                  : currentView === 'shop_challans'
                  ? 'transfers'
                  : currentView === 'godown_stock'
                  ? 'godown_stock'
                  : currentView === 'godown_outflow'
                  ? 'godown_outflow'
                  : currentView === 'godown_transfer'
                  ? 'transfers'
                  : 'overview'
              }
              initialTransferSubTab={
                currentView === 'shop_challans' ? 'list' : currentView === 'godown_transfer' ? 'new' : 'new'
              }
              initialFilter={
                currentView === 'shop_stock' ? 'IN_SHOP' : currentView === 'godown_stock' ? 'IN_GODOWN' : 'ALL'
              }
            />
          )}

          {currentView === 'rfm_campaigns' && (
            <RFMCampaignModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              customers={customers}
              salesHistory={salesHistory}
              orders={orders}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              storeSettings={settings}
              onSendBulkSmsCampaign={handleSendBulkSmsCampaign}
            />
          )}

          {currentView === 'purchase_orders' && (
            <PurchaseOrdersModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              storeName={settings.StoreName || 'Pabna Bostraloy'}
              storeSettings={settings}
              onCreatePO={handleCreatePurchaseOrder}
              onUpdatePOStatus={handleUpdatePOStatus}
              onOpenSuppliersModal={() => setCurrentView('suppliers')}
            />
          )}

          {currentView === 'suppliers' && (
            <SuppliersModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              suppliers={suppliers}
              supplierLedger={supplierLedger}
              purchaseOrders={purchaseOrders}
              currencySymbol={settings.CurrencySymbol || '৳'}
              storeName={settings.StoreName || 'Pabna Bostraloy'}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onRecordPayment={handleRecordSupplierPayment}
              onOpenCreatePO={() => setCurrentView('purchase_orders')}
              showToast={showToast}
            />
          )}

          {currentView === 'expenses' && (
            <ExpensesModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              expenses={expenses}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {currentView === 'cash_register' && (
            <CashRegisterModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              activeRegister={activeRegister}
              cashRegisters={cashRegisters}
              salesHistory={salesHistory}
              customerLedger={customerLedger}
              supplierLedger={supplierLedger}
              expenses={expenses}
              tailoringOrders={tailoringOrders}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              storeSettings={settings}
              onOpenRegister={handleOpenCashRegister}
              onCloseRegister={handleCloseCashRegister}
            />
          )}

          {currentView === 'coupons' && (
            <CouponModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              coupons={coupons}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              onSaveCoupon={handleSaveCoupon}
              onDeleteCoupon={handleDeleteCoupon}
              onRefreshCoupons={handleRefreshCoupons}
            />
          )}

          {currentView === 'abandoned_carts' && (
            <AbandonedCartModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              abandonedCarts={abandonedCarts}
              onUpdateStatus={handleUpdateAbandonedCartStatus}
              onDeleteCart={handleDeleteAbandonedCart}
              onConvertToOrder={handleConvertToOrderFromAbandoned}
              currencySymbol={settings.CurrencySymbol || '৳'}
              settings={settings}
              showToast={showToast}
            />
          )}

          {currentView === 'audit_logs' && (
            <AuditLogsModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              auditLogs={auditLogs}
            />
          )}

          {currentView === 'users' && (
            <UsersModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              users={users}
              activeUser={activeUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onRefreshUsers={handleRefreshUsers}
              isLoading={syncStatus === 'syncing'}
            />
          )}

          {currentView === 'low_stock' && (
            <LowStockModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              onQuickRestock={handleQuickRestock}
              onAddToCart={handleAddToCart}
            />
          )}

          {currentView === 'expiry_alerts' && (
            <ExpiryAlertModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              onAddToCart={handleAddToCart}
              onEditProduct={(prod) => {
                handleOpenEditProduct(prod);
              }}
              settings={settings}
            />
          )}

          {currentView === 'barcode_print' && (
            <BarcodePrintModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              storeName={settings.StoreName || 'Pabna Bostraloy'}
            />
          )}

          {currentView === 'invoice_lookup' && (
            <InvoiceLookupModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              salesHistory={salesHistory}
              currencySymbol={settings.CurrencySymbol || '৳'}
              settings={settings}
              apiUrl={settings.apiUrl}
              initialInvoiceNo={selectedLookupInvoiceNo}
              onOpenPrintInvoice={(sale) => {
                handleOpenReprintInvoice(sale);
              }}
            />
          )}

          {currentView === 'add_product' && (
            <AddProductModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              currencySymbol={settings.CurrencySymbol || '৳'}
              onSubmitProduct={handleSubmitProduct}
              categories={categories}
              onAddCategory={handleAddCategory}
              units={units}
              onAddUnit={handleAddUnit}
              variantAttributes={variantAttributes}
              onAddVariantOption={handleAddVariantOption}
              products={products}
              settings={settings}
            />
          )}

          {currentView === 'stock_restock' && (
            <AddStockModal
              embedded={true}
              isOpen={true}
              onClose={() => {
                setQuickRestockProductId('');
                setCurrentView('pos');
              }}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              onSubmitStock={handleSubmitStock}
              initialProductId={quickRestockProductId}
              settings={settings}
              variantAttributes={variantAttributes}
              onAddVariantOption={handleAddVariantOption}
            />
          )}

          {currentView === 'tailoring' && (
            <TailoringModal
              embedded={true}
              isOpen={true}
              onClose={() => {
                setTailoringPreloadData(null);
                setCurrentView('pos');
              }}
              tailoringOrders={tailoringOrders}
              tailorMasters={tailorMasters}
              products={products}
              customers={customers}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              storeSettings={settings}
              initialPreload={tailoringPreloadData}
              onSaveOrder={handleSaveTailoringOrder}
              onUpdateOrderStatus={handleUpdateTailoringOrderStatus}
              onCollectDue={handleCollectTailoringDue}
              onDeleteOrder={handleDeleteTailoringOrder}
            />
          )}

          {currentView === 'fabric_wastage' && (
            <FabricWastageModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              fabricWastageList={fabricWastageList}
              products={products}
              currencySymbol={settings.CurrencySymbol || '৳'}
              activeUser={activeUser}
              onRecordWastage={handleRecordFabricWastage}
              onDeleteWastageRecord={handleDeleteFabricWastage}
            />
          )}

          {currentView === 'backup' && (
            <BackupRestoreModal
              embedded={true}
              isOpen={true}
              onClose={() => setCurrentView('pos')}
              products={products}
              salesHistory={salesHistory}
              customers={customers}
              tailoringOrders={tailoringOrders}
              storeSettings={settings}
              onRestoreComplete={() => {
                setProducts(getLocalProducts());
                setCategories(getLocalCategories());
                setUnits(getLocalUnits());
                setSalesHistory(getLocalSalesHistory());
                setOrders(getLocalOrders());
                setCustomers(getLocalCustomers());
                setCustomerLedger(getLocalCustomerLedger());
                setExpenses(getLocalExpenses());
                setTailoringOrders(getLocalTailoringOrders());
                setFabricWastageList(getLocalFabricWastage());
                setSuppliers(getLocalSuppliers());
                setPurchaseOrders(getLocalPurchaseOrders());
                showToast('ডাটাবেস সফলভাবে রিস্টোর হয়েছে!', 'success');
              }}
            />
          )}
        </main>
      </div>

      {/* ক্যাটালগ ভিউতে ফ্লোটিং ডায়নামিক কার্ট বার (Floating Dynamic Island) */}
      {Array.isArray(cart) && cart.length > 0 && currentView === 'pos' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 hover:bg-slate-900 text-white pl-4 pr-2.5 py-2 rounded-full shadow-2xl backdrop-blur-xl flex items-center space-x-3 sm:space-x-4 border border-white/10 animate-in fade-in slide-in-from-bottom-5 transition-all">
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-indigo-500/30">
              {cart.reduce((a, b) => a + (Number(b.quantity) || 0), 0)}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-200">কার্ট:</span>
          </div>

          <span className="text-emerald-400 font-black text-sm sm:text-base">
            {settings.CurrencySymbol || '৳'}{cart.reduce((a, b) => a + (Number(b.sellingPrice) || 0) * (Number(b.quantity) || 0), 0).toFixed(2)}
          </span>

          <button
            onClick={() => setCurrentView('cart')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-full shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span>কার্ট পেজে যান</span>
            <span className="text-sm font-bold">→</span>
          </button>
        </div>
      )}

      {/* একক পণ্যের পূর্ণ বিবরণ (Single Product Details) মডাল */}
      <ProductDetailsModal
        isOpen={isProductDetailsOpen}
        onClose={() => {
          setIsProductDetailsOpen(false);
          setSelectedProductForDetails(null);
        }}
        product={activeProductForDetails || selectedProductForDetails}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onAddToCart={handleAddToCart}
        onQuickRestock={handleQuickRestock}
        onEditProduct={handleOpenEditProduct}
        onDeleteProduct={handleDeleteProduct}
        activeUser={activeUser}
        settings={settings}
        cartQuantity={
          (activeProductForDetails || selectedProductForDetails)
            ? (cart.find((c) => c.productId === (activeProductForDetails || selectedProductForDetails).ProductID)?.quantity || 0)
            : 0
        }
      />

      {/* পণ্য সম্পাদনা (Edit Product) মডাল */}
      <EditProductModal
        isOpen={isEditProductModalOpen}
        onClose={() => {
          setIsEditProductModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        product={selectedProductForEdit}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onSubmitUpdate={handleUpdateProduct}
        categories={categories}
        onAddCategory={handleAddCategory}
        units={units}
        onAddUnit={handleAddUnit}
        variantAttributes={variantAttributes}
        onAddVariantOption={handleAddVariantOption}
        products={products}
        settings={settings}
        activeUser={activeUser}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* P&L লাভ-ক্ষতি অ্যানালিটিক্স ড্যাশবোর্ড মডাল */}
      <AnalyticsDashboard
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        salesHistory={salesHistory}
        orders={orders}
        products={products}
        categories={categories}
        customers={customers}
        customerLedger={customerLedger}
        expenses={expenses}
        fabricWastage={fabricWastageList}
        currencySymbol={settings.CurrencySymbol || '৳'}
        storeSettings={settings}
        onRefreshSales={handleRefreshSales}
      />

      {/* কম স্টক অ্যালার্ট ও রিস্টক তালিকা মডাল */}
      <LowStockModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        products={products}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onQuickRestock={handleQuickRestock}
        onAddToCart={handleAddToCart}
      />

      {/* ইনভয়েস প্রিন্ট জেনারেটর মডাল (Thermal 80mm & A4) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        saleData={activeInvoiceData}
        settings={settings}
        autoPrint={autoTriggerPrint}
      />

      {/* অন্যান্য মডালসমূহ */}
      <AddStockModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setQuickRestockProductId('');
        }}
        products={products}
        currencySymbol={settings.CurrencySymbol || '৳'}
        activeUser={activeUser}
        onSubmitStock={handleSubmitStock}
        initialProductId={quickRestockProductId}
        settings={settings}
        variantAttributes={variantAttributes}
        onAddVariantOption={handleAddVariantOption}
      />

      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onSubmitProduct={handleSubmitProduct}
        categories={categories}
        onAddCategory={handleAddCategory}
        units={units}
        onAddUnit={handleAddUnit}
        variantAttributes={variantAttributes}
        onAddVariantOption={handleAddVariantOption}
        products={products}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTestConnection={handleTestConnection}
      />

      <SalesHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        salesHistory={salesHistory}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onReprintInvoice={handleOpenReprintInvoice}
        onViewInvoiceDetails={(sale) => {
          setIsHistoryModalOpen(false);
          handleOpenInvoiceLookup(sale.invoiceNo);
        }}
      />

      {/* ইনভয়েস অনুসন্ধান ও পূর্ণাঙ্গ বিস্তারিত মেমো মডাল */}
      <InvoiceLookupModal
        isOpen={isInvoiceLookupOpen}
        onClose={() => {
          setIsInvoiceLookupOpen(false);
          setSelectedLookupInvoiceNo('');
        }}
        salesHistory={salesHistory}
        currencySymbol={settings.CurrencySymbol || '৳'}
        settings={settings}
        apiUrl={settings.apiUrl}
        initialInvoiceNo={selectedLookupInvoiceNo}
        onOpenPrintInvoice={(sale) => {
          setIsInvoiceLookupOpen(false);
          handleOpenReprintInvoice(sale);
        }}
      />

      {/* গ্রাহক ডাটাবেস ব্যবস্থাপনা মডাল */}
      <CustomersModal
        isOpen={isCustomersModalOpen}
        onClose={() => setIsCustomersModalOpen(false)}
        customers={customers}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onAddCustomer={handleAddCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onRefreshCustomers={handleRefreshCustomers}
        onOpenCustomerLedgerModal={() => {
          setIsCustomersModalOpen(false);
          setIsCustomerLedgerModalOpen(true);
        }}
      />

      {/* বাকির খাতা ও কাস্টমার ক্রেডিট লেজার মডাল */}
      <CustomerLedgerModal
        isOpen={isCustomerLedgerModalOpen}
        onClose={() => setIsCustomerLedgerModalOpen(false)}
        customers={customers}
        customerLedger={customerLedger}
        orders={orders}
        settings={settings}
        activeUser={activeUser}
        onRecordPayment={handleRecordCustomerPayment}
        onUpdateCreditLimit={handleUpdateCustomerCreditLimit}
        onSendSms={handleSendSmsNotification}
        currencySymbol={settings.CurrencySymbol || '৳'}
        showToast={showToast}
      />

      {/* কুপন তৈরি ও অফার ব্যবস্থাপনা মডাল */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        coupons={coupons}
        products={products}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onSaveCoupon={handleSaveCoupon}
        onDeleteCoupon={handleDeleteCoupon}
        onRefreshCoupons={handleRefreshCoupons}
      />

      {/* গ্রাহক ও এডমিন লগইন এবং রেজিস্ট্রেশন মডাল */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        activeUser={activeUser}
        settings={settings}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        onLogout={handleLogout}
      />

      {/* ব্যবহারকারী ও স্টাফ অ্যাকাউন্ট ব্যবস্থাপনা মডাল (Users Management) */}
      <UsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={users}
        activeUser={activeUser}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onRefreshUsers={handleRefreshUsers}
        isLoading={syncStatus === 'syncing'}
      />

      {/* গ্রাহকের নিজস্ব পূর্ববর্তী অর্ডার তালিকা মডাল */}
      <CustomerOrdersModal
        isOpen={isCustomerOrdersOpen}
        onClose={() => setIsCustomerOrdersOpen(false)}
        activeUser={activeUser}
        settings={settings}
        salesHistory={salesHistory}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onViewInvoice={(sale) => {
          setIsCustomerOrdersOpen(false);
          setActiveInvoiceData(sale);
          setIsInvoiceModalOpen(true);
        }}
        onNavigateToCatalog={() => {
          setCurrentView('pos');
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* কাস্টমার ব্র্যান্ডেড লাইভ ট্র্যাকিং ও সেলফ-সার্ভিস RMA পোর্টাল মডাল */}
      <CustomerOrderTrackingModal
        isOpen={isCustomerTrackingModalOpen}
        onClose={() => {
          setIsCustomerTrackingModalOpen(false);
          setDirectTrackingOrderId('');
        }}
        orders={orders}
        initialOrderId={directTrackingOrderId}
        settings={settings}
        onSubmitRma={(orderId, rmaData) => {
          handleResolveRma(orderId, 'Submitted', rmaData);
        }}
        currencySymbol={settings.CurrencySymbol || '৳'}
      />

      {/* ড্রপ-অফ ও অসম্পূর্ণ কার্ট রিকভারি মডাল */}
      <AbandonedCartModal
        isOpen={isAbandonedCartModalOpen}
        onClose={() => setIsAbandonedCartModalOpen(false)}
        abandonedCarts={abandonedCarts}
        onUpdateStatus={handleUpdateAbandonedCartStatus}
        onDeleteCart={handleDeleteAbandonedCart}
        onConvertToOrder={handleConvertToOrderFromAbandoned}
        currencySymbol={settings.CurrencySymbol || '৳'}
      />

      {/* ফেজ ৪: সাপ্লায়ার ও ভেন্ডর প্রোফাইল এবং দেনা খাতা মডাল */}
      <SuppliersModal
        isOpen={isSuppliersModalOpen}
        onClose={() => setIsSuppliersModalOpen(false)}
        suppliers={suppliers}
        supplierLedger={supplierLedger}
        purchaseOrders={purchaseOrders}
        currencySymbol={settings.CurrencySymbol || '৳'}
        storeName={settings.StoreName || 'Pabna Bostraloy'}
        onSaveSupplier={handleSaveSupplier}
        onDeleteSupplier={handleDeleteSupplier}
        onRecordPayment={handleRecordSupplierPayment}
        onOpenCreatePO={() => {
          setIsSuppliersModalOpen(false);
          setIsPurchaseOrdersModalOpen(true);
        }}
      />

      {/* ফেজ ৪: পারচেজ অর্ডার ও স্টক প্রকিউরমেন্ট রিস্টক মডাল */}
      <PurchaseOrdersModal
        isOpen={isPurchaseOrdersModalOpen}
        onClose={() => setIsPurchaseOrdersModalOpen(false)}
        purchaseOrders={purchaseOrders}
        suppliers={suppliers}
        products={products}
        currencySymbol={settings.CurrencySymbol || '৳'}
        storeName={settings.StoreName || 'Pabna Bostraloy'}
        storeSettings={settings}
        onCreatePO={handleCreatePurchaseOrder}
        onUpdatePOStatus={handleUpdatePOStatus}
        onOpenSuppliersModal={() => {
          setIsPurchaseOrdersModalOpen(false);
          setIsSuppliersModalOpen(true);
        }}
      />

      {/* ফেজ ৪: থার্মাল বারকোড লেবেল ও প্রাইস ট্যাগ জেনারেটর মডাল */}
      <BarcodePrintModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={products}
        currencySymbol={settings.CurrencySymbol || '৳'}
        storeName={settings.StoreName || 'Pabna Bostraloy'}
      />

      {/* ফেজ ৫: দৈনন্দিন খরচের খাতা মডাল */}
      <ExpensesModal
        isOpen={isExpensesModalOpen}
        onClose={() => setIsExpensesModalOpen(false)}
        expenses={expenses}
        currencySymbol={settings.CurrencySymbol || '৳'}
        activeUser={activeUser}
        onSaveExpense={handleSaveExpense}
        onDeleteExpense={handleDeleteExpense}
      />

      {/* ফেজ ৫: দৈনিক ক্যাশ ড্রয়ার ও EOD ক্লোজিং মডাল */}
      <CashRegisterModal
        isOpen={isCashRegisterModalOpen}
        onClose={() => setIsCashRegisterModalOpen(false)}
        activeRegister={activeRegister}
        cashRegisters={cashRegisters}
        salesHistory={salesHistory}
        customerLedger={customerLedger}
        supplierLedger={supplierLedger}
        expenses={expenses}
        tailoringOrders={tailoringOrders}
        currencySymbol={settings.CurrencySymbol || '৳'}
        activeUser={activeUser}
        storeSettings={settings}
        onOpenRegister={handleOpenCashRegister}
        onCloseRegister={handleCloseCashRegister}
      />

      {/* ফেজ ৫: অ্যাক্টিভিটি ও সিকিউরিটি অডিট ট্রেইল মডাল */}
      <AuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
        auditLogs={auditLogs}
      />

      {/* ফেজ ৬: মেয়াদ সতর্কতা ও ব্যাচ ট্র্যাকিং মডাল */}
      <ExpiryAlertModal
        isOpen={isExpiryAlertModalOpen}
        onClose={() => setIsExpiryAlertModalOpen(false)}
        products={products}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onAddToCart={handleAddToCart}
        onEditProduct={(prod) => {
          setIsExpiryAlertModalOpen(false);
          handleOpenEditProduct(prod);
        }}
        settings={settings}
      />

      {/* ফেজ ৬: সাইজ/রং ভ্যারিয়েন্ট বাছাইকারী মডাল */}
      {Boolean(variantSelectModalProduct) && (
        <ProductVariantSelectModal
          isOpen={true}
          onClose={() => setVariantSelectModalProduct(null)}
          product={variantSelectModalProduct}
          currencySymbol={settings.CurrencySymbol || '৳'}
          onAddToCart={handleAddToCart}
          cartItems={cart}
        />
      )}

      {/* গজ কাপড় ও থান কাটার জন্য গজ-গিরা নির্বাচন মডাল */}
      <FabricCutModal
        isOpen={Boolean(fabricCutProduct)}
        onClose={() => setFabricCutProduct(null)}
        product={fabricCutProduct}
        currencySymbol={settings.CurrencySymbol || '৳'}
        storeName={settings.StoreName || 'Pabna Bostraloy'}
        cartItems={cart}
        onConfirmAddToCart={(prod, totalYards) => {
          handleAddToCart(prod, totalYards, true);
        }}
      />

      {/* ফেজ ৭: পণ্য বিক্রয় রিটার্ন ও স্টোর ক্রেডিট ভাউচার মডাল */}
      <SalesReturnModal
        isOpen={isSalesReturnModalOpen}
        onClose={() => setIsSalesReturnModalOpen(false)}
        salesHistory={salesHistory}
        customers={customers}
        products={products}
        salesReturns={salesReturns}
        currencySymbol={settings.CurrencySymbol || '৳'}
        activeUser={activeUser}
        storeSettings={settings}
        onSaveSalesReturn={handleSaveSalesReturn}
        onRedeemStoreCredit={handleRedeemStoreCredit}
      />

      {/* ফেজ ৭: গোডাউন ও দোকান স্টক ট্রান্সফার চালান মডাল */}
      <StockTransferModal
        isOpen={isStockTransferModalOpen}
        onClose={() => setIsStockTransferModalOpen(false)}
        products={products}
        stockTransfers={stockTransfers}
        stockMovements={stockMovements}
        currencySymbol={settings.CurrencySymbol || '৳'}
        activeUser={activeUser}
        storeSettings={settings}
        onSaveStockTransfer={handleSaveStockTransfer}
        onUpdateStockTransferStatus={handleUpdateStockTransferStatus}
        onDeleteStockTransfer={handleDeleteStockTransfer}
        onAdjustLocationStock={handleAdjustLocationStock}
        onDeleteProduct={handleDeleteProduct}
        onUpdateProductVariants={handleUpdateProductVariants}
        onDirectGodownToShopTransfer={handleDirectGodownToShopTransfer}
        onEditProduct={handleOpenEditProduct}
        variantAttributes={variantAttributes}
        onAddVariantOption={handleAddVariantOption}
        initialTab={stockTransferModalConfig.tab || 'overview'}
        initialTransferSubTab={stockTransferModalConfig.subTab || 'new'}
        initialFilter={stockTransferModalConfig.filter || 'ALL'}
      />

      {/* ফেজ ৮: আরএফএম গ্রাহক সেগমেন্টেশন ও টার্গেটেড এসএমএস ক্যাম্পেইন মডাল */}
      <RFMCampaignModal
        isOpen={isRFMCampaignModalOpen}
        onClose={() => setIsRFMCampaignModalOpen(false)}
        customers={customers}
        salesHistory={salesHistory}
        orders={orders}
        currencySymbol={settings.CurrencySymbol || '৳'}
        activeUser={activeUser}
        storeSettings={settings}
        onSendBulkSmsCampaign={handleSendBulkSmsCampaign}
      />

      {/* কাউন্টার হোল্ড অর্ডার ও মাল্টি-কাস্টমার কিউ ড্রয়ার */}
      <HeldCartsModal
        isOpen={isHeldCartsModalOpen}
        onClose={() => setIsHeldCartsModalOpen(false)}
        heldCarts={heldCarts}
        activeCartItems={cart}
        currencySymbol={settings.CurrencySymbol || '৳'}
        onHoldCurrentCart={handleHoldCurrentCart}
        onResumeHeldCart={handleResumeHeldCart}
        onDeleteHeldCart={handleDeleteHeldCart}
      />

      {/* ফেজ ১: ক্যাশিয়ার কিবোর্ড শর্টকাট সহায়িকা মডাল */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* ফেজ ২: টেইলারিং ও সেলাই অর্ডার পপআপ মডাল */}
      {isTailoringModalOpen && currentView !== 'tailoring' && (
        <TailoringModal
          isOpen={isTailoringModalOpen}
          onClose={() => {
            setIsTailoringModalOpen(false);
            setTailoringPreloadData(null);
          }}
          tailoringOrders={tailoringOrders}
          tailorMasters={tailorMasters}
          products={products}
          customers={customers}
          currencySymbol={settings.CurrencySymbol || '৳'}
          activeUser={activeUser}
          storeSettings={settings}
          initialPreload={tailoringPreloadData}
          onSaveOrder={handleSaveTailoringOrder}
          onUpdateOrderStatus={handleUpdateTailoringOrderStatus}
          onCollectDue={handleCollectTailoringDue}
          onDeleteOrder={handleDeleteTailoringOrder}
        />
      )}

      {/* ফেজ ২: কাপড়ের ছাঁট ও ড্যামেজ হিসাব পপআপ মডাল */}
      {isFabricWastageModalOpen && currentView !== 'fabric_wastage' && (
        <FabricWastageModal
          isOpen={isFabricWastageModalOpen}
          onClose={() => setIsFabricWastageModalOpen(false)}
          fabricWastageList={fabricWastageList}
          products={products}
          currencySymbol={settings.CurrencySymbol || '৳'}
          activeUser={activeUser}
          onRecordWastage={handleRecordFabricWastage}
          onDeleteWastageRecord={handleDeleteFabricWastage}
        />
      )}

      {/* ফেজ ৩: ১-ক্লিক সম্পূর্ণ ডাটা ব্যাকআপ ও এক্সেল ডাউনলোড মডাল */}
      {isBackupModalOpen && currentView !== 'backup' && (
        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          products={products}
          salesHistory={salesHistory}
          customers={customers}
          tailoringOrders={tailoringOrders}
          storeSettings={settings}
          onRestoreComplete={() => {
            setProducts(getLocalProducts());
            setCategories(getLocalCategories());
            setUnits(getLocalUnits());
            setSalesHistory(getLocalSalesHistory());
            setOrders(getLocalOrders());
            setCustomers(getLocalCustomers());
            setCustomerLedger(getLocalCustomerLedger());
            setExpenses(getLocalExpenses());
            setTailoringOrders(getLocalTailoringOrders());
            setFabricWastageList(getLocalFabricWastage());
            setSuppliers(getLocalSuppliers());
            setPurchaseOrders(getLocalPurchaseOrders());
            showToast('ডাটাবেস সফলভাবে রিস্টোর হয়েছে!', 'success');
          }}
        />
      )}

      {/* ফেজ ৩: অ্যাডমিন পিন অথরাইজেশন শিল্ড মডাল */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => {
          setIsAdminPinModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={() => {
          setIsPinAuthorizedSession(true);
          setIsAdminPinModalOpen(false);
          if (typeof pendingAdminAction === 'function') {
            const action = pendingAdminAction;
            setPendingAdminAction(null);
            action();
          }
        }}
        users={users}
        settings={settings}
        actionDescription={adminPinActionDescription}
      />

      {/* লাইভ টোস্ট নোটিফিকেশন */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center space-x-2 text-white ${
              toastMessage.type === 'error'
                ? 'bg-rose-600'
                : toastMessage.type === 'warning'
                ? 'bg-amber-600'
                : 'bg-emerald-600'
            }`}
          >
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
