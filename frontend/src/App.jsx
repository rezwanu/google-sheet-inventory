import React, { useState, useEffect, useCallback } from 'react';
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
  DEFAULT_APPS_SCRIPT_URL
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
  postUpdateOrderStatus
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
  const [customers, setCustomers] = useState(getLocalCustomers);
  const [coupons, setCoupons] = useState(getLocalCoupons);
  const [activeUser, setActiveUser] = useState(getActiveUser);
  const [users, setUsers] = useState(getLocalUsers);

  // ভিউ নেভিগেশন স্টেট ('pos' | 'cart' | 'checkout')
  const [currentView, setCurrentView] = useState('pos');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

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
    setCustomers(cleanCustomers);
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
      const completedSaleRecord = {
        saleId: `SALE-${new Date().getTime()}`,
        invoiceNo: localInvoiceNo,
        timestamp: new Date().toISOString(),
        customerName: saleOrder.customerName,
        customerPhone: saleOrder.customerPhone,
        items: saleOrder.items,
        subTotal: saleOrder.subTotal,
        taxPercent: saleOrder.taxPercent,
        taxAmount: saleOrder.taxAmount,
        discountAmount: saleOrder.discountAmount,
        grandTotal: saleOrder.grandTotal,
        paymentMethod: saleOrder.paymentMethod,
        cashierEmail: activeUser?.Email || 'guest@store.local',
      };

      saveSaleLocally(completedSaleRecord);
      setSalesHistory([completedSaleRecord, ...salesHistory]);

      // ৩. কার্ট খালি করা এবং ভিউ রিসেট করা
      setCart([]);
      setDiscountAmount(0);
      setCurrentView('pos');

      // ৩.১ গ্রাহক ডাটাবেস আপডেট (Customer Database Persistence)
      if (saleOrder.customerName || saleOrder.customerPhone) {
        const updatedCustList = saveOrUpdateCustomerLocally({
          CustomerName: saleOrder.customerName,
          Phone: saleOrder.customerPhone,
          Email: saleOrder.customerEmail,
          Address: saleOrder.customerAddress,
          CustomerType: saleOrder.customerType,
          CustomerID: saleOrder.customerId,
        }, saleOrder.grandTotal);
        setCustomers(updatedCustList);
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
            cashierEmail: activeUser?.Email || 'guest@store.local',
          });

          if (response.success && response.data) {
            completedSaleRecord.invoiceNo = response.data.invoiceNo;
            saveSaleLocally(completedSaleRecord);
            setSalesHistory(getLocalSalesHistory());
            if (saleOrder.shouldPrint) {
              setActiveInvoiceData({ ...completedSaleRecord });
            }
            showToast(`অর্ডার সম্পন্ন! ইনভয়েস: ${response.data.invoiceNo}`, 'success');
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
      />

      {/* P&L লাভ-ক্ষতি অ্যানালিটিক্স ড্যাশবোর্ড মডাল */}
      <AnalyticsDashboard
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        salesHistory={salesHistory}
        products={products}
        categories={categories}
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
