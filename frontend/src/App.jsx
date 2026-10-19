import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import ProductCatalog from './components/ProductCatalog';
import CartView from './components/CartView';
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

import {
  getLocalSettings,
  saveLocalSettings,
  getLocalProducts,
  saveLocalProducts,
  normalizeProduct,
  getLocalOrders,
  saveLocalOrders,
  saveOrUpdateOrderLocally,
  updateOrderStatusLocally,
  deleteOrderLocally,
  submitOrderRmaLocally,
  resolveOrderRmaLocally,
  getLocalCategories,
  saveLocalCategories,
  getLocalUnits,
  saveLocalUnits,
  updateProductStockLocally,
  getLocalCart,
  saveLocalCart,
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
  getCustomerOrders,
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
  recordSupplierLedgerEntryLocally,
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
  logAuditEventLocally
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
  postUpdateCustomer,
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
  postUpdateCustomerLoyalty,
  postSaveSupplier,
  postDeleteSupplier,
  postCreatePurchaseOrder,
  postUpdatePOStatus,
  postRecordSupplierPayment,
  postSaveExpense,
  postDeleteExpense,
  postOpenCashRegister,
  postCloseCashRegister,
  postLogAuditEvent
} from './services/api';

export default function App() {
  // ১. প্রাথমিক স্টেটসমূহ লোকাল স্টোরেজ থেকে লোড (জিরো-লেটেন্সি)
  const [settings, setSettings] = useState(getLocalSettings);
  const [products, setProducts] = useState(getLocalProducts);
  const [categories, setCategories] = useState(getLocalCategories);
  const [units, setUnits] = useState(getLocalUnits);
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

  // ভিউ নেভিগেশন স্টেট ('pos' | 'cart' | 'checkout')
  const [currentView, setCurrentView] = useState('pos');
  const [discountAmount, setDiscountAmount] = useState(0);
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

  // কম স্টকের পণ্যের মোট সংখ্যা
  const lowStockCount = React.useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      return stock <= minAlert;
    }).length;
  }, [products]);

  // অপেক্ষমান অর্ডারের সংখ্যা (Badge Count)
  const pendingOrdersCount = useMemo(() => {
    return (orders || []).filter((o) => o.Status === 'Pending').length;
  }, [orders]);

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
        setProducts(cleanList);
        saveLocalProducts(cleanList);
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

  // ৪. কার্ট অপারেশনসমূহ
  const handleAddToCart = (product, qtyToAdd = 1) => {
    const existingIndex = cart.findIndex((item) => item.productId === product.ProductID);
    const availableStock = Number(product.StockQuantity) || 0;
    const addQty = Math.max(1, Number(qtyToAdd) || 1);

    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + addQty > availableStock) {
        showToast(`'${product.ProductName}' এর পর্যাপ্ত স্টক নেই! (সর্বোচ্চ: ${availableStock})`, 'warning');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += addQty;
      setCart(updatedCart);
      showToast(`'${product.ProductName}' কার্টে যোগ হয়েছে (+${addQty})`, 'success');
    } else {
      if (availableStock <= 0) {
        showToast(`'${product.ProductName}' স্টক শেষ!`, 'error');
        return;
      }
      if (addQty > availableStock) {
        showToast(`'${product.ProductName}' এর পর্যাপ্ত স্টক নেই! (সর্বোচ্চ: ${availableStock})`, 'warning');
        return;
      }
      const newItem = {
        productId: product.ProductID,
        barcode: product.Barcode,
        productName: product.ProductName,
        sellingPrice: Number(product.SellingPrice),
        costPrice: Number(product.CostPrice) || 0,
        stockQuantity: availableStock,
        unit: product.Unit || 'Pcs',
        quantity: addQty,
      };
      setCart([...cart, newItem]);
      showToast(`'${product.ProductName}' কার্টে যোগ হয়েছে (+${addQty})`, 'success');
    }
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const product = products.find((p) => p.ProductID === productId);
    const availableStock = product ? Number(product.StockQuantity) : 9999;

    if (newQty > availableStock) {
      showToast(`সর্বোচ্চ স্টক সীমা অতিক্রম করেছে (${availableStock})`, 'warning');
      newQty = availableStock;
    }

    const updatedCart = cart.map((item) =>
      item.productId === productId ? { ...item, quantity: newQty } : item
    );
    setCart(updatedCart);
  };

  const handleRemoveItem = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // ৫. নতুন স্টক সাবমিট হ্যান্ডলার (Cumulative Stock Input)
  const handleSubmitStock = async (stockPayload) => {
    const targetId = String(stockPayload.productId || '').trim();
    const incoming = Number(stockPayload.incomingQty) || 0;

    const updatedProducts = products.map((p) => {
      const isMatch = String(p.ProductID || '').trim() === targetId ||
                      (p.Barcode && String(p.Barcode).trim() === targetId);

      if (isMatch) {
        const currentStock = Number(p.StockQuantity || p.StockQuantit || 0);
        const newStock = currentStock + incoming;
        const newCost = (stockPayload.unitCost !== '' && stockPayload.unitCost !== null && stockPayload.unitCost !== undefined)
          ? Number(stockPayload.unitCost)
          : Number(p.CostPrice || 0);

        return {
          ...p,
          StockQuantity: newStock,
          StockQuantit: newStock,
          CostPrice: newCost,
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
                return { ...p, StockQuantity: confirmedStock, StockQuantit: confirmedStock };
              }
              return p;
            });
            setProducts(verifiedProducts);
            saveLocalProducts(verifiedProducts);
          }
          showToast(`নতুন স্টক সফলভাবে গুগল শিটে রেকর্ড করা হয়েছে! (বর্তমান মজুদ: ${confirmedStock ?? 'আপডেট সম্পন্ন'})`, 'success');
        } else {
          showToast(`সতর্কবার্তা: ${res.message}`, 'warning');
        }
      } catch (err) {
        showToast('নেটওয়ার্ক সমস্যা: লোকাল স্টোরেজে সেভ হয়েছে, পরবর্তীতে সিঙ্ক হবে।', 'warning');
      }
    } else {
      showToast('অফলাইন মোড: স্টক লোকাল স্টোরেজে আপডেট হয়েছে।', 'success');
    }
  };

  // ৬. বিক্রয় সম্পন্ন ও প্রিন্ট হ্যান্ডলার (Complete Sale & Print)
  const handleCompleteSale = async (saleOrder) => {
    setIsProcessingSale(true);

    try {
      // ১. স্থানীয়ভাবে তাৎক্ষণিক স্টক কর্তন (জিরো-লেটেন্সি)
      const updatedProducts = products.map((p) => {
        const soldItem = saleOrder.items.find((item) => item.productId === p.ProductID);
        if (soldItem) {
          const currentStock = Number(p.StockQuantity) || 0;
          return {
            ...p,
            StockQuantity: Math.max(0, currentStock - Number(soldItem.quantity)),
            UpdatedAt: new Date().toISOString(),
          };
        }
        return p;
      });

      setProducts(updatedProducts);
      saveLocalProducts(updatedProducts);

      // ২. লোকাল সেলস রেকর্ড তৈরি
      const localInvoiceNo = `INV-${new Date().getTime().toString().slice(-6)}`;
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
    const newProd = {
      ProductID: `PROD-${Date.now().toString().slice(-4)}`,
      Barcode: productData.barcode || '',
      ProductName: productData.productName,
      Category: productData.category || 'General',
      SubCategory: productData.subCategory || '',
      ImageUrl: productData.imageUrl || productData.imageBase64 || '',
      ImageCaption: productData.imageCaption || '',
      CostPrice: Number(productData.costPrice) || 0,
      SellingPrice: Number(productData.sellingPrice),
      StockQuantity: Number(productData.initialStock) || 0,
      MinStockAlert: Number(productData.minStockAlert) || 5,
      Unit: productData.unit || 'Pcs',
      ShortDescription: productData.shortDescription || '',
      Description: productData.description || '',
      Features: Array.isArray(productData.features) ? productData.features : [],
      CreatedAt: new Date().toISOString(),
    };

    const updatedList = [newProd, ...products];
    setProducts(updatedList);
    saveLocalProducts(updatedList);

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
        return {
          ...p,
          Barcode: productData.barcode || '',
          ProductName: productData.productName,
          Category: productData.category || 'General',
          SubCategory: productData.subCategory || '',
          ImageUrl: productData.imageUrl || (productData.imageBase64 ? productData.imageBase64 : p.ImageUrl || ''),
          ImageCaption: productData.imageCaption !== undefined ? productData.imageCaption : (p.ImageCaption || ''),
          CostPrice: Number(productData.costPrice) || 0,
          SellingPrice: Number(productData.sellingPrice) || 0,
          StockQuantity: Number(productData.stockQuantity) || 0,
          MinStockAlert: Number(productData.minStockAlert) || 5,
          Unit: productData.unit || 'Pcs',
          ShortDescription: productData.shortDescription || '',
          Description: productData.description || '',
          Features: Array.isArray(productData.features) ? productData.features : [],
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

  // ৮.৫ পণ্য মুছে ফেলা (Delete/Remove Product)
  const handleDeleteProduct = async (productId) => {
    const targetProduct = products.find(p => p.ProductID === productId);
    const prodName = targetProduct?.ProductName || productId;

    const filteredProducts = products.filter(p => p.ProductID !== productId);
    setProducts(filteredProducts);
    saveLocalProducts(filteredProducts);

    // কার্ট থেকে অপসারণ
    const filteredCart = cart.filter(item => item.productId !== productId);
    setCart(filteredCart);
    saveLocalCart(filteredCart);

    // ডিটেইলস মডাল রিসেট
    if (selectedProductForDetails && selectedProductForDetails.ProductID === productId) {
      setSelectedProductForDetails(null);
      setIsProductDetailsOpen(false);
    }

    showToast(`'${prodName}' পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!`, 'success');

    if (settings.apiUrl) {
      try {
        const response = await postDeleteProduct(settings.apiUrl, productId);
        if (response && response.success) {
          showToast('গুগল শিট থেকেও পণ্যটি স্থায়ীভাবে মুছে ফেলা হয়েছে!', 'success');
        } else {
          showToast(`সতর্কবার্তা: ${response?.message || 'শিট থেকে ডিলিট ব্যর্থ'}`, 'warning');
        }
      } catch (err) {
        showToast('পণ্য লোকাল স্টোরেজ থেকে মুছে ফেলা হয়েছে (অফলাইন)।', 'info');
      }
    }
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
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCustomerOrdersModal={() => setIsCustomerOrdersOpen(true)}
        onSwitchToCustomerMode={handleSwitchToCustomerMode}
        onLogout={handleLogout}
        onNavigate={setCurrentView}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        lowStockCount={lowStockCount}
        cartCount={Array.isArray(cart) ? cart.length : 0}
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
            onNavigate={setCurrentView}
            cartCount={Array.isArray(cart) ? cart.length : 0}
            cartTotal={Array.isArray(cart) ? cart.reduce((a, b) => a + (Number(b.sellingPrice) || 0) * (Number(b.quantity) || 0), 0) : 0}
            currencySymbol={settings.CurrencySymbol || '৳'}
            lowStockCount={lowStockCount}
            pendingOrdersCount={pendingOrdersCount}
            onOpenStockModal={() => {
              setQuickRestockProductId('');
              setIsStockModalOpen(true);
            }}
            onOpenProductModal={() => setIsProductModalOpen(true)}
            onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
            onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
            onOpenCustomersModal={() => setIsCustomersModalOpen(true)}
            onOpenCustomerLedgerModal={() => setIsCustomerLedgerModalOpen(true)}
            customers={customers}
            suppliersCount={suppliers.length}
            pendingPOCount={purchaseOrders.filter(po => po.Status === 'Ordered').length}
            onOpenSuppliersModal={() => setIsSuppliersModalOpen(true)}
            onOpenPurchaseOrdersModal={() => setIsPurchaseOrdersModalOpen(true)}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onOpenExpensesModal={() => setIsExpensesModalOpen(true)}
            onOpenCashRegisterModal={() => setIsCashRegisterModalOpen(true)}
            onOpenAuditLogsModal={() => setIsAuditLogsModalOpen(true)}
            isRegisterOpen={Boolean(activeRegister && activeRegister.Status === 'Open')}
            expensesCount={expenses.length}
            abandonedCartsCount={pendingAbandonedCartsCount}
            onOpenAbandonedCartModal={() => setIsAbandonedCartModalOpen(true)}
            onOpenUsersModal={() => setIsUsersModalOpen(true)}
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
                activeUser={activeUser}
                apiUrl={settings.apiUrl}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onSync={() => handleSync(true)}
                coupons={coupons}
              />
            </div>
          )}

          {currentView === 'cart' && (
            <CartPage
              cartItems={cart}
              currencySymbol={settings.CurrencySymbol || '৳'}
              taxRatePercent={settings.TaxRatePercent || 0}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onNavigateToCatalog={() => setCurrentView('pos')}
              onNavigateToCheckout={() => setCurrentView('checkout')}
              discountAmount={discountAmount}
              setDiscountAmount={setDiscountAmount}
              coupons={coupons}
              activeUser={activeUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {currentView === 'checkout' && (
            <CheckoutPage
              cartItems={cart}
              currencySymbol={settings.CurrencySymbol || '৳'}
              taxRatePercent={settings.TaxRatePercent || 0}
              discountAmount={discountAmount}
              customers={customers}
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
        products={products}
        settings={settings}
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
