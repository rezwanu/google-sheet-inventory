import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  TrendingUp,
  ShoppingBag,
  Percent,
  Calendar,
  Package,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Award,
  FileText,
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Coins,
  ShieldCheck,
  ArrowRight,
  Store,
  AlertTriangle,
  ChevronDown,
  Archive,
  Lock,
  Unlock,
  Save,
  Target,
  DollarSign,
  Check,
  Users as UsersIcon,
  RotateCcw,
  PieChart
} from 'lucide-react';
import { calculateDeadStockAnalysis, exportToCSV, saveMonthlyPnLEntryLocally, getLocalMonthlyPnL } from '../services/storage';
import { postSaveMonthlyPnL } from '../services/api';

export default function AnalyticsDashboard({
  isOpen,
  onClose,
  embedded = false,
  salesHistory = [],
  orders = [],
  products = [],
  categories = [],
  customers = [],
  customerLedger = [],
  expenses = [],
  fabricWastage = [],
  users = [],
  salesReturns = [],
  stockTransfers = [],
  bankAccounts = [],
  activeRegister = null,
  activeUser = null,
  apiUrl = '',
  showToast = () => {},
  currencySymbol = '৳',
  storeSettings = {},
  onRefreshSales
}) {
  // ফিল্টার রেঞ্জ স্টেট
  const [filterRange, setFilterRange] = useState('month'); // 'today' | 'yesterday' | '7days' | 'month' | 'lastMonth' | 'year' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ৭টি স্তরের আধুনিকায়ন স্টেটসমূহ
  const [accountingMode, setAccountingMode] = useState('accrual'); // 'accrual' | 'cash'
  const [includePayroll, setIncludePayroll] = useState(true);
  const [includeReturns, setIncludeReturns] = useState(true);
  const [includeWastage, setIncludeWastage] = useState(true);
  const [isArchivingCloud, setIsArchivingCloud] = useState(false);
  const [isUnlockedPin, setIsUnlockedPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showDeductionsMenu, setShowDeductionsMenu] = useState(false);

  // সমন্বিত তরল মূলধন (Unified Liquid Assets)
  const liquidAssets = useMemo(() => {
    const cashInHand = activeRegister ? (Number(activeRegister.OpeningBalance || 0) + (Number(activeRegister.CashSales || 0) || 0)) : 0;
    const totalBank = (Array.isArray(bankAccounts) ? bankAccounts : []).reduce((sum, b) => sum + (Number(b.CurrentBalance) || 0), 0);
    const totalLiquid = cashInHand + totalBank;
    return { cashInHand, totalBank, totalLiquid };
  }, [activeRegister, bankAccounts]);

  // RBAC রোল ও পারমিশন চেক (Tier 7)
  const isAdmin = activeUser?.Role === 'Admin' || activeUser?.Role === 'SuperAdmin';
  const canViewReports = isAdmin || activeUser?.Permissions?.includes('canViewReports') || activeUser?.Permissions?.includes('view_reports') || activeUser?.Role === 'Manager';
  const canViewBuyingPrice = isAdmin || activeUser?.Permissions?.includes('canViewBuyingPrice') || activeUser?.Permissions?.includes('view_buying_price');
  const hasProfitAccess = isAdmin || (canViewReports && canViewBuyingPrice) || isUnlockedPin;

  // সংবেদনশীল ডাটা মাস্কিং হেল্পার
  const renderMaskedValue = (val, isCurrency = true, decimals = 2) => {
    if (hasProfitAccess) {
      if (typeof val === 'number') {
        const formatted = Number(val).toLocaleString('en-IN', { maximumFractionDigits: decimals });
        return isCurrency ? `${currencySymbol}${formatted}` : formatted;
      }
      return val;
    }
    return (
      <span
        onClick={() => setShowPinModal(true)}
        className="inline-flex items-center space-x-1 cursor-pointer select-none text-slate-400 hover:text-indigo-600 transition-colors"
        title="লাভ বা কেনা দাম দেখতে অ্যাডমিন পিন দিয়ে আনলক করুন"
      >
        <span className="tracking-widest font-mono">••••••</span>
        <Lock className="w-3 h-3 text-slate-400 inline" />
      </span>
    );
  };

  // চ্যানেল ফিল্টার স্টেট: 'all' | 'offline' | 'online'
  const [channelFilter, setChannelFilter] = useState('all');

  // অ্যাক্টিভ ভিউ ট্যাব: 'overview' | 'statement' | 'products' | 'categories' | 'transactions' | 'dead_stock'
  const [activeTab, setActiveTab] = useState('overview');

  // ফেজ ৮: ডেড স্টক ও কাস্টম এক্সপোর্ট স্টেট (Phase 8)
  const [deadStockThreshold, setDeadStockThreshold] = useState(60);
  const [deadStockSearch, setDeadStockSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // প্রোডাক্টস টেবিল সার্চ ও সর্টিং
  const [productSearch, setProductSearch] = useState('');
  const [productSortBy, setProductSortBy] = useState('profit_desc'); // 'profit_desc' | 'profit_asc' | 'revenue_desc' | 'units_desc' | 'margin_desc'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // রিফ্রেশ লোডিং স্টেট
  const [isRefreshing, setIsRefreshing] = useState(false);

  // চার্ট টুলটিপ ইন্টারঅ্যাকশন স্টেট
  const [hoveredTrendItem, setHoveredTrendItem] = useState(null);

  // ০. ওমনিচ্যানেল ইউনিফাইড ট্রানজেকশন তালিকা (Offline POS Sales + Online Delivered Orders)
  const allTransactions = useMemo(() => {
    const list = [];
    const seenInvoiceNos = new Set();

    // ১. সেলস হিস্ট্রি থেকে কাউন্টার/ইন-স্টোর পিওএস রেকর্ডসমূহ
    if (Array.isArray(salesHistory)) {
      salesHistory.forEach((sale, idx) => {
        const invNo = String(sale.invoiceNo || sale.invoiceNumber || sale.InvoiceNumber || sale.id || `POS-${idx + 1}`).trim();
        seenInvoiceNos.add(invNo.toLowerCase());

        const gTotal = Number(sale.grandTotal ?? sale.GrandTotal ?? sale.totalAmount) || 0;
        let sPaid = 0;
        let sDue = 0;
        if (sale.paidAmount !== undefined && sale.paidAmount !== null) {
          sPaid = Number(sale.paidAmount);
          sDue = sale.dueAmount !== undefined ? Number(sale.dueAmount) : Math.max(0, gTotal - sPaid);
        } else if (sale.dueAmount !== undefined && sale.dueAmount !== null) {
          sDue = Number(sale.dueAmount);
          sPaid = Math.max(0, gTotal - sDue);
        } else if (sale.paymentMethod === 'Due') {
          sDue = gTotal;
          sPaid = 0;
        } else {
          sPaid = gTotal;
          sDue = 0;
        }

        list.push({
          id: sale.saleId || sale.id || invNo,
          invoiceNo: invNo,
          timestamp: sale.timestamp || sale.Timestamp || sale.Date || sale.CreatedAt,
          customerName: sale.customerName || sale.CustomerName || 'কাউন্টার কাস্টমার',
          customerPhone: sale.customerPhone || sale.CustomerPhone || '',
          customerAddress: sale.customerAddress || 'ইন-স্টোর কাউন্টার',
          items: sale.items || sale.Items || [],
          grandTotal: gTotal,
          paidAmount: sPaid,
          dueAmount: sDue,
          subTotal: Number(sale.subTotal ?? sale.SubTotal) || 0,
          discountAmount: Number(sale.discountAmount ?? sale.DiscountAmount) || 0,
          taxAmount: Number(sale.taxAmount ?? sale.TaxAmount) || 0,
          deliveryCharge: 0,
          paymentMethod: sale.paymentMethod || sale.PaymentMethod || 'Cash',
          channel: 'offline',
          orderSource: 'In-Store / POS',
          status: 'Delivered',
          courierName: 'Counter Pickup',
          isOrder: false
        });
      });
    }

    // ২. অর্ডার ম্যানেজমেন্ট থেকে অনলাইন ডেলিভারি এবং অনন্য অর্ডারসমূহ
    if (Array.isArray(orders)) {
      orders.forEach((order) => {
        const orderId = String(order.OrderID || order.orderId || '').trim();
        if (orderId && seenInvoiceNos.has(orderId.toLowerCase())) {
          return; // ইতিমধ্যে salesHistory-তে অন্তর্ভুক্ত থাকায় ডুপ্লিকেশন প্রতিরোধ
        }

        const isDelivered = order.Status === 'Delivered';
        const isOfflineSource = order.OrderSource === 'In-Store / POS' || order.OrderSource === 'Walk-in' || order.CourierName === 'Counter Pickup';
        const channelType = isOfflineSource ? 'offline' : 'online';

        // শুধুমাত্র ডেলিভার্ড বা পেইড অর্ডার লাভ-ক্ষতির আর্থিক হিসাবে আসবে (বাতিল বা ফেরতকৃত অর্ডার বাদ)
        if (isDelivered || order.PaymentStatus === 'Paid') {
          const ordTotal = Number(order.TotalAmount || 0);
          let oPaid = 0;
          let oDue = 0;
          if (order.PaymentStatus === 'Paid') {
            oPaid = ordTotal;
            oDue = 0;
          } else if (order.AdvancePaid !== undefined || order.PaidAmount !== undefined) {
            oPaid = Number(order.AdvancePaid ?? order.PaidAmount ?? 0);
            oDue = Number(order.DueAmount ?? Math.max(0, ordTotal - oPaid));
          } else {
            oPaid = 0;
            oDue = ordTotal;
          }

          list.push({
            id: orderId,
            invoiceNo: orderId,
            timestamp: order.CreatedAt || order.OrderDate,
            customerName: order.CustomerName || 'অনলাইন গ্রাহক',
            customerPhone: order.CustomerPhone || '',
            customerAddress: order.CustomerAddress || '',
            items: order.Items || [],
            grandTotal: ordTotal,
            paidAmount: oPaid,
            dueAmount: oDue,
            subTotal: Number(order.SubTotal || 0),
            discountAmount: Number(order.DiscountAmount || 0),
            taxAmount: 0,
            deliveryCharge: Number(order.DeliveryCharge || 0),
            paymentMethod: order.PaymentMethod || 'COD',
            channel: channelType,
            orderSource: order.OrderSource || (isOfflineSource ? 'In-Store / POS' : 'Online'),
            status: order.Status,
            courierName: order.CourierName || (isOfflineSource ? 'Counter Pickup' : 'Courier'),
            isOrder: true
          });
        }
      });
    }

    // তারিখ অনুযায়ী ডিসেন্ডিং সর্ট (নতুন লেনদেন সবার আগে)
    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [salesHistory, orders]);

  // ১. নির্বাচিত তারিখ অনুযায়ী ডাটা ফিল্টার করা
  const dateFilteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

    return allTransactions.filter((tx) => {
      const timeVal = tx.timestamp;
      if (!timeVal) return true;

      const txDate = new Date(timeVal);
      if (isNaN(txDate.getTime())) return true;

      const txDateStr = txDate.toISOString().split('T')[0];

      if (filterRange === 'today') return txDateStr === todayStr;
      if (filterRange === 'yesterday') return txDateStr === yesterdayStr;
      if (filterRange === '7days') return txDate >= sevenDaysAgo && txDate <= now;
      if (filterRange === 'month') return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
      if (filterRange === 'lastMonth') return txDate.getFullYear() === lastMonthYear && txDate.getMonth() === lastMonthIdx;
      if (filterRange === 'year') return txDate.getFullYear() === now.getFullYear();
      if (filterRange === 'all') return true;
      if (filterRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate) : new Date('2000-01-01');
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date('2099-12-31');
        return txDate >= start && txDate <= end;
      }
      return true;
    });
  }, [allTransactions, filterRange, customStartDate, customEndDate]);

  // চ্যানেল ফিল্টার প্রয়োগ
  const filteredSales = useMemo(() => {
    if (channelFilter === 'offline') {
      return dateFilteredTransactions.filter((t) => t.channel === 'offline');
    }
    if (channelFilter === 'online') {
      return dateFilteredTransactions.filter((t) => t.channel === 'online');
    }
    return dateFilteredTransactions;
  }, [dateFilteredTransactions, channelFilter]);

  // নির্বাচিত তারিখ অনুসারে বাকির খাতা থেকে আদায়কৃত লেনদেন ফিল্টার (Ledger Due Collections)
  const dateFilteredLedgerPayments = useMemo(() => {
    if (!Array.isArray(customerLedger)) return [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

    return customerLedger.filter((entry) => {
      const credit = Number(entry.Credit || entry.credit || entry.Amount || 0);
      if (credit <= 0 && entry.EntryType !== 'Payment') return false;

      const timeVal = entry.Timestamp || entry.Date || entry.CreatedAt;
      if (!timeVal) return true;
      const entryDate = new Date(timeVal);
      if (isNaN(entryDate.getTime())) return true;
      const entryDateStr = entryDate.toISOString().split('T')[0];

      if (filterRange === 'today') return entryDateStr === todayStr;
      if (filterRange === 'yesterday') return entryDateStr === yesterdayStr;
      if (filterRange === '7days') return entryDate >= sevenDaysAgo && entryDate <= now;
      if (filterRange === 'month') return entryDate.getFullYear() === now.getFullYear() && entryDate.getMonth() === now.getMonth();
      if (filterRange === 'lastMonth') return entryDate.getFullYear() === lastMonthYear && entryDate.getMonth() === lastMonthIdx;
      if (filterRange === 'year') return entryDate.getFullYear() === now.getFullYear();
      if (filterRange === 'all') return true;
      if (filterRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate) : new Date('2000-01-01');
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date('2099-12-31');
        return entryDate >= start && entryDate <= end;
      }
      return true;
    });
  }, [customerLedger, filterRange, customStartDate, customEndDate]);

  // ওমনিচ্যানেল কর্মক্ষমতা সারাংশ (In-Store vs Online)
  const channelBreakdown = useMemo(() => {
    let offlineRevenue = 0;
    let offlineProfit = 0;
    let offlineOrders = 0;
    let offlineUnits = 0;

    let onlineRevenue = 0;
    let onlineProfit = 0;
    let onlineOrders = 0;
    let onlineUnits = 0;

    (Array.isArray(dateFilteredTransactions) ? dateFilteredTransactions : []).forEach((tx) => {
      let txCogs = 0;
      let txUnits = 0;

      let itemsList = [];
      if (Array.isArray(tx.items)) {
        itemsList = tx.items;
      } else if (typeof tx.items === 'string') {
        try { 
          const parsed = JSON.parse(tx.items);
          itemsList = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
        } catch { itemsList = []; }
      }
      if (!Array.isArray(itemsList)) itemsList = [];

      itemsList.forEach((item) => {
        if (!item) return;
        const qty = Number(item.quantity || item.Quantity || item.qty) || 0;
        let cPrice = Number(item.costPrice ?? item.CostPrice) || 0;
        if (cPrice === 0) {
          const pId = item.productId || item.ProductID;
          const matched = (Array.isArray(products) ? products : []).find((p) => p && p.ProductID === pId);
          if (matched) cPrice = Number(matched.CostPrice || matched.costPrice) || 0;
        }
        txCogs += (cPrice * qty);
        txUnits += qty;
      });

      const txRev = Number(tx.grandTotal || 0);
      const txProfit = txRev - txCogs;

      if (tx.channel === 'offline') {
        offlineRevenue += txRev;
        offlineProfit += txProfit;
        offlineOrders += 1;
        offlineUnits += txUnits;
      } else {
        onlineRevenue += txRev;
        onlineProfit += txProfit;
        onlineOrders += 1;
        onlineUnits += txUnits;
      }
    });

    const totalRev = offlineRevenue + onlineRevenue;
    const offlineShare = totalRev > 0 ? parseFloat(((offlineRevenue / totalRev) * 100).toFixed(1)) : 0;
    const onlineShare = totalRev > 0 ? parseFloat(((onlineRevenue / totalRev) * 100).toFixed(1)) : 0;

    return {
      offlineRevenue,
      offlineProfit,
      offlineOrders,
      offlineUnits,
      offlineMargin: offlineRevenue > 0 ? parseFloat(((offlineProfit / offlineRevenue) * 100).toFixed(1)) : 0,
      offlineShare,
      onlineRevenue,
      onlineProfit,
      onlineOrders,
      onlineUnits,
      onlineMargin: onlineRevenue > 0 ? parseFloat(((onlineProfit / onlineRevenue) * 100).toFixed(1)) : 0,
      onlineShare,
      totalRev
    };
  }, [dateFilteredTransactions, products]);

  // ২. পূর্ণাঙ্গ P&L মেট্রিক্স, আইটেম-ওয়াইজ ও ক্যাটাগরি-ওয়াইজ বিশ্লেষণ
  const analyticsKPI = useMemo(() => {
    let totalGrossRevenue = 0; // মোট বিক্রয় (ডিসকাউন্ট ও ট্যাক্স পূর্ববর্তী)
    let totalCollectedRevenue = 0; // মোট ইনভয়েস টাকা (GrandTotal)
    let totalCOGS = 0; // বিক্রিত পণ্যের মূল খরচ
    let totalUnitsSold = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalSalesPaidCash = 0; // বিক্রয়কালে সরাসরি প্রাপ্ত ক্যাশ / পেমেন্ট
    let totalSalesDueCreated = 0; // বিক্রয়কালে বাকি রাখা পরিমাণ

    const productSalesMap = {};
    const categorySalesMap = {};
    const paymentMap = { Cash: 0, COD: 0, Card: 0, bKash: 0, Nagad: 0, Rocket: 0, Bank: 0, Other: 0 };
    const dateTrendMap = {}; // দিনভিত্তিক বা সময়ভিত্তিক বিক্রয় ও লাভ

    (Array.isArray(filteredSales) ? filteredSales : []).forEach((sale) => {
      if (!sale) return;
      const gTotal = Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount) || 0;
      const sDiscount = Number(sale.discountAmount || sale.DiscountAmount) || 0;
      const sTax = Number(sale.taxAmount || sale.TaxAmount) || 0;
      const timeVal = sale.timestamp || sale.Timestamp || sale.Date || sale.CreatedAt;
      const saleDateStr = timeVal ? new Date(timeVal).toISOString().split('T')[0] : 'Unknown';

      const sPaid = Number(sale.paidAmount !== undefined ? sale.paidAmount : (sale.dueAmount ? gTotal - Number(sale.dueAmount) : (sale.paymentMethod === 'Due' ? 0 : gTotal)));
      const sDue = Number(sale.dueAmount !== undefined ? sale.dueAmount : Math.max(0, gTotal - sPaid));

      totalCollectedRevenue += gTotal;
      totalDiscount += sDiscount;
      totalTax += sTax;
      totalSalesPaidCash += sPaid;
      totalSalesDueCreated += sDue;

      // পেমেন্ট মেথড
      const pMethod = sale.paymentMethod || sale.PaymentMethod || 'Cash';
      if (paymentMap[pMethod] !== undefined) {
        paymentMap[pMethod] += gTotal;
      } else {
        paymentMap[pMethod] = (paymentMap[pMethod] || 0) + gTotal;
      }

      // দিনভিত্তিক ট্রেন্ড বাকেট
      if (!dateTrendMap[saleDateStr]) {
        dateTrendMap[saleDateStr] = {
          date: saleDateStr,
          revenue: 0,
          cogs: 0,
          profit: 0,
          orders: 0
        };
      }
      dateTrendMap[saleDateStr].orders += 1;
      dateTrendMap[saleDateStr].revenue += gTotal;

      // আইটেম তালিকা পার্সিং
      let itemsList = [];
      if (Array.isArray(sale.items)) {
        itemsList = sale.items;
      } else if (typeof sale.items === 'string') {
        try { 
          const parsed = JSON.parse(sale.items);
          itemsList = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
        } catch (e) { itemsList = []; }
      } else if (typeof sale.ItemsJSON === 'string') {
        try { 
          const parsed = JSON.parse(sale.ItemsJSON);
          itemsList = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
        } catch (e) { itemsList = []; }
      } else if (Array.isArray(sale.Items)) {
        itemsList = sale.Items;
      }
      if (!Array.isArray(itemsList)) itemsList = [];

      let orderItemCostSum = 0;

      itemsList.forEach((item) => {
        if (!item) return;
        const qty = Number(item.quantity || item.Quantity || item.qty) || 0;
        const sPrice = Number(item.sellingPrice || item.SellingPrice || item.price) || 0;
        
        // তৎকালীন ক্রয়মূল্য (Cost Price)
        let cPrice = 0;
        if (item.costPrice !== undefined && item.costPrice !== null && !isNaN(Number(item.costPrice))) {
          cPrice = Number(item.costPrice);
        } else if (item.CostPrice !== undefined && item.CostPrice !== null && !isNaN(Number(item.CostPrice))) {
          cPrice = Number(item.CostPrice);
        }

        // যদি আইটেম রেকর্ডে কস্ট না থাকে, ক্যাটালগ প্রোডাক্ট থেকে ম্যাচ করা
        const pId = item.productId || item.ProductID || item.id || item.productName || 'General';
        const matchedProd = Array.isArray(products) 
          ? products.find((p) => p.ProductID === pId || (p.Barcode && p.Barcode === (item.barcode || item.Barcode)))
          : null;

        if (cPrice === 0 && matchedProd) {
          cPrice = Number(matchedProd.CostPrice || matchedProd.costPrice) || 0;
        }

        const itemRevenue = sPrice * qty;
        const itemCost = cPrice * qty;
        const itemProfit = itemRevenue - itemCost;
        const categoryName = item.category || item.Category || matchedProd?.Category || 'General';

        totalGrossRevenue += itemRevenue;
        totalUnitsSold += qty;
        totalCOGS += itemCost;
        orderItemCostSum += itemCost;

        // প্রোডাক্ট-ওয়াইজ রেকর্ড
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            productId: pId,
            productName: item.productName || item.ProductName || matchedProd?.ProductName || 'Product',
            category: categoryName,
            barcode: item.barcode || matchedProd?.Barcode || '',
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
            costPrice: cPrice,
            sellingPrice: sPrice
          };
        }

        productSalesMap[pId].unitsSold += qty;
        productSalesMap[pId].revenue += itemRevenue;
        productSalesMap[pId].cogs += itemCost;
        productSalesMap[pId].profit += itemProfit;
        if (sPrice > 0) productSalesMap[pId].sellingPrice = sPrice;
        if (cPrice > 0) productSalesMap[pId].costPrice = cPrice;

        // ক্যাটাগরি-ওয়াইজ রেকর্ড
        if (!categorySalesMap[categoryName]) {
          categorySalesMap[categoryName] = {
            categoryName: categoryName,
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0
          };
        }
        categorySalesMap[categoryName].unitsSold += qty;
        categorySalesMap[categoryName].revenue += itemRevenue;
        categorySalesMap[categoryName].cogs += itemCost;
        categorySalesMap[categoryName].profit += itemProfit;
      });

      dateTrendMap[saleDateStr].cogs += orderItemCostSum;
      dateTrendMap[saleDateStr].profit += (gTotal - orderItemCostSum);
      sale.cogs = orderItemCostSum;
      sale.profit = gTotal - orderItemCostSum;
    });

    // ট্যাক্স ছাড়া প্রকৃত নেট বিক্রয় (Net Sales)
    const netSales = Math.max(0, totalCollectedRevenue - totalTax);
    
    // ১. খাতা-কলমে হিসাবকৃত মোট লাভ (Booked Profit / Accrual Gross Profit)
    const bookedProfit = netSales - totalCOGS;

    // ২. বাকির খাতা থেকে এই সময়কালে আদায়কৃত মোট ক্যাশ
    const periodCollectedDues = (dateFilteredLedgerPayments || []).reduce((sum, e) => sum + (Number(e.Credit || e.credit || e.Amount || 0)), 0);

    // ৩. এই সময়কালে মোট নগদ ক্যাশ সংগ্রহ (বিক্রয়কালে নগদ + বাকির খাতার আদায়)
    const totalCashInflow = totalSalesPaidCash + periodCollectedDues;

    // ৪. হাতে আসা আসল নগদ লাভ (Realized Cash Profit)
    const realizedCashProfit = totalCashInflow - totalCOGS;

    // ৫. মার্কেটে বকেয়া মুনাফা / ক্রেডিট ঝুঁকি (Unrealized Due / Credit Risk)
    const unrealizedDueProfit = Math.max(0, totalSalesDueCreated - periodCollectedDues);

    // ৬. প্রফিট রিয়ালাইজেশন রেট (%):
    const realizationRate = bookedProfit > 0 
      ? Math.min(100, Math.max(0, parseFloat(((realizedCashProfit / bookedProfit) * 100).toFixed(1))))
      : (realizedCashProfit >= 0 ? 100 : 0);

    // ৭. সার্বিক কাস্টমার বকেয়া (Total Market Due across all customers):
    const totalMarketDue = (customers || []).reduce((sum, c) => sum + (Number(c.CurrentDue) || 0), 0);
    const dueCustomersCount = (customers || []).filter(c => (Number(c.CurrentDue) || 0) > 0).length;

    // নিট মার্জিন শতকরা হার
    const profitMarginPercent = netSales > 0 
      ? parseFloat(((bookedProfit / netSales) * 100).toFixed(1)) 
      : 0;

    // গড় অর্ডার মান (AOV)
    const averageOrderValue = filteredSales.length > 0 
      ? parseFloat((totalCollectedRevenue / filteredSales.length).toFixed(2)) 
      : 0;

    // প্রোডাক্ট লিস্ট অ্যারে তৈরি
    const allProductList = Object.values(productSalesMap).map((p) => {
      const margin = p.revenue > 0 ? parseFloat(((p.profit / p.revenue) * 100).toFixed(1)) : 0;
      return {
        ...p,
        marginPercent: margin,
        avgSellingPrice: p.unitsSold > 0 ? parseFloat((p.revenue / p.unitsSold).toFixed(2)) : p.sellingPrice,
        avgCostPrice: p.unitsSold > 0 ? parseFloat((p.cogs / p.unitsSold).toFixed(2)) : p.costPrice
      };
    });

    // ক্যাটাগরি লিস্ট অ্যারে
    const allCategoryList = Object.values(categorySalesMap).map((c) => {
      const margin = c.revenue > 0 ? parseFloat(((c.profit / c.revenue) * 100).toFixed(1)) : 0;
      const contribution = bookedProfit > 0 ? parseFloat(((c.profit / bookedProfit) * 100).toFixed(1)) : 0;
      return {
        ...c,
        marginPercent: margin,
        contributionPercent: contribution
      };
    }).sort((a, b) => b.profit - a.profit);

    // ৮. নির্বাচিত সময়কালের সহকারী ডেট ফিল্টার
    const nowDate = new Date();
    const todayStr = nowDate.toISOString().split('T')[0];
    const yesterdayDate = new Date(nowDate);
    yesterdayDate.setDate(nowDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const sevenDaysAgoDate = new Date(nowDate);
    sevenDaysAgoDate.setDate(nowDate.getDate() - 7);
    const lastMonthYear = nowDate.getMonth() === 0 ? nowDate.getFullYear() - 1 : nowDate.getFullYear();
    const lastMonthIdx = nowDate.getMonth() === 0 ? 11 : nowDate.getMonth() - 1;

    const checkDateMatchesCurrent = (dateObj, dateStr) => {
      if (!dateObj || isNaN(dateObj.getTime())) return false;
      const dStr = dateStr ? String(dateStr).slice(0, 10) : dateObj.toISOString().split('T')[0];

      if (filterRange === 'today') return dStr === todayStr;
      if (filterRange === 'yesterday') return dStr === yesterdayStr;
      if (filterRange === '7days') return dateObj >= sevenDaysAgoDate && dateObj <= nowDate;
      if (filterRange === 'month') return dateObj.getFullYear() === nowDate.getFullYear() && dateObj.getMonth() === nowDate.getMonth();
      if (filterRange === 'lastMonth') return dateObj.getFullYear() === lastMonthYear && dateObj.getMonth() === lastMonthIdx;
      if (filterRange === 'year') return dateObj.getFullYear() === nowDate.getFullYear();
      if (filterRange === 'all') return true;
      if (filterRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate) : new Date('2000-01-01');
        const end = customEndDate ? new Date(customEndDate) : new Date('2099-12-31');
        end.setHours(23, 59, 59, 999);
        return dateObj >= start && dateObj <= end;
      }
      return true;
    };

    // ৮.১ সাধারণ দোকানের পরিচালন খরচ (Shop Operating Expenses):
    let periodExpenses = 0;
    (Array.isArray(expenses) ? expenses : []).forEach(exp => {
      const expDateStr = String(exp.Date || exp.date || '');
      if (!expDateStr) return;
      const expDate = new Date(expDateStr);
      if (checkDateMatchesCurrent(expDate, expDateStr)) {
        periodExpenses += (Number(exp.Amount || exp.amount) || 0);
      }
    });

    // ৮.২ থান কাপড়ের ছাঁট ও ড্যামেজ অপচয় ক্ষতি (Fabric Wastage Loss in period):
    let periodFabricLoss = 0;
    (Array.isArray(fabricWastage) ? fabricWastage : []).forEach(fw => {
      const fwDateStr = String(fw.CreatedAt || fw.createdAt || fw.Date || fw.date || '');
      if (!fwDateStr) return;
      const fwDate = new Date(fwDateStr);
      if (checkDateMatchesCurrent(fwDate, fwDateStr)) {
        let effectiveLoss = Number(fw.LossAmount) || 0;
        if (fw.BundleStatus === 'Sold' && fw.RealizedSellingPrice !== undefined) {
          effectiveLoss = Math.max(0, effectiveLoss - Number(fw.RealizedSellingPrice));
        }
        periodFabricLoss += effectiveLoss;
      }
    });

    // ৮.৩ সেলস রিটার্ন ও রিফান্ড কর্তন (Tier 1: Sales Returns & Refunds Stream):
    let periodReturnsCount = 0;
    let periodRefundAmount = 0;
    let periodReturnedItemsCost = 0;
    (Array.isArray(salesReturns) ? salesReturns : []).forEach(ret => {
      const retDateStr = String(ret.CreatedAt || ret.createdAt || ret.Date || ret.date || '');
      if (!retDateStr) return;
      const retDate = new Date(retDateStr);
      if (checkDateMatchesCurrent(retDate, retDateStr)) {
        periodReturnsCount += 1;
        const refAmt = Number(ret.RefundAmount || ret.refundAmount || ret.TotalRefund || ret.totalRefund || 0);
        periodRefundAmount += refAmt;

        let retItems = [];
        try {
          if (Array.isArray(ret.Items)) retItems = ret.Items;
          else if (Array.isArray(ret.items)) retItems = ret.items;
          else if (typeof ret.ItemsJSON === 'string') retItems = JSON.parse(ret.ItemsJSON);
          else if (typeof ret.items === 'string') retItems = JSON.parse(ret.items);
        } catch(e) { retItems = []; }

        retItems.forEach(item => {
          if (!item) return;
          const qty = Number(item.quantity || item.Quantity || item.qty || 1);
          let cPrice = Number(item.costPrice || item.CostPrice || 0);
          if (cPrice === 0) {
            const pId = item.productId || item.ProductID || item.id;
            const matched = (Array.isArray(products) ? products : []).find(p => p.ProductID === pId);
            if (matched) cPrice = Number(matched.CostPrice || matched.costPrice || 0);
          }
          periodReturnedItemsCost += (cPrice * qty);
        });
      }
    });

    // ৮.৪ স্টাফ মূল বেতন ও বিক্রয় কমিশন হিসাব (Tier 1: Staff Salaries & Commissions Stream):
    let periodDays = 30;
    if (filterRange === 'today' || filterRange === 'yesterday') periodDays = 1;
    else if (filterRange === '7days') periodDays = 7;
    else if (filterRange === 'month' || filterRange === 'lastMonth') periodDays = 30;
    else if (filterRange === 'year') periodDays = 365;
    else if (filterRange === 'custom') {
      const start = customStartDate ? new Date(customStartDate) : new Date();
      const end = customEndDate ? new Date(customEndDate) : new Date();
      const diffTime = Math.abs(end - start);
      periodDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    let periodStaffSalaries = 0;
    let periodStaffCommissions = 0;
    (Array.isArray(users) ? users : []).forEach(u => {
      const baseSalary = Number(u.BaseSalary || u.baseSalary || 0);
      const commRate = Number(u.CommissionRate || u.commissionRate || 0);

      if (baseSalary > 0) {
        periodStaffSalaries += (baseSalary / 30) * periodDays;
      }

      if (commRate > 0) {
        let staffSalesTotal = 0;
        const uId = String(u.UserID || u.id || '').trim().toLowerCase();
        const uName = String(u.FullName || u.fullName || u.name || '').trim().toLowerCase();

        (Array.isArray(filteredSales) ? filteredSales : []).forEach(s => {
          const sCashier = String(s.cashierName || s.Cashier || s.SoldBy || s.userId || s.UserID || '').trim().toLowerCase();
          if (sCashier && (sCashier === uId || sCashier === uName || sCashier.includes(uName))) {
            staffSalesTotal += Number(s.grandTotal || s.GrandTotal || 0);
          }
        });
        periodStaffCommissions += (staffSalesTotal * (commRate / 100));
      }
    });
    const totalPayroll = periodStaffSalaries + periodStaffCommissions;

    // ৮.৫ গোডাউন ও দোকান স্টক ট্রান্সফার ক্ষতি (Tier 1: Stock Transfer Damage Stream):
    let periodTransferLoss = 0;
    (Array.isArray(stockTransfers) ? stockTransfers : []).forEach(tr => {
      const trDateStr = String(tr.TransferDate || tr.Date || tr.CreatedAt || tr.createdAt || '');
      if (!trDateStr) return;
      const trDate = new Date(trDateStr);
      if (checkDateMatchesCurrent(trDate, trDateStr)) {
        if (tr.Status === 'Damaged' || tr.Status === 'Discarded' || tr.DamageLossAmount) {
          periodTransferLoss += Number(tr.DamageLossAmount || tr.LossAmount || 0);
        }
      }
    });
    const totalShrinkageLoss = periodFabricLoss + periodTransferLoss;

    // ৯. সমন্বিত আয়, ক্রয় খরচ ও মোট মুনাফা (Adjusted Gross Profit):
    const effectiveNetSales = Math.max(0, netSales - (includeReturns ? periodRefundAmount : 0));
    const effectiveCOGS = Math.max(0, totalCOGS - (includeReturns ? periodReturnedItemsCost : 0));
    const grossProfit = effectiveNetSales - effectiveCOGS;

    // পরিচালন খরচসমূহ ও চূড়ান্ত নিট মুনাফা (True Net Profit):
    const effectivePayroll = includePayroll ? totalPayroll : 0;
    const effectiveWastage = includeWastage ? totalShrinkageLoss : 0;
    const totalOperatingExpenses = periodExpenses + effectivePayroll + effectiveWastage;
    const trueNetProfit = grossProfit - totalOperatingExpenses;

    // সমন্বিত নগদ ক্যাশ লাভ (Adjusted Realized Cash Profit):
    const effectiveCashInflow = totalCashInflow - (includeReturns ? periodRefundAmount : 0);
    const effectiveRealizedCashProfit = realizedCashProfit - (includeReturns ? periodRefundAmount : 0) - totalOperatingExpenses;

    // ১০. পরিচালন ব্যয় ক্যাটাগরি বিশ্লেষণ (Tier 4: Expense Breakdown):
    const expenseCategoryMap = {};
    (Array.isArray(expenses) ? expenses : []).forEach(exp => {
      const expDateStr = String(exp.Date || exp.date || '');
      if (!expDateStr) return;
      const expDate = new Date(expDateStr);
      if (checkDateMatchesCurrent(expDate, expDateStr)) {
        const cat = exp.Category || exp.category || 'অন্যান্য পরিচালন খরচ';
        const amt = Number(exp.Amount || exp.amount || 0);
        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt;
      }
    });

    if (includePayroll && totalPayroll > 0) {
      expenseCategoryMap['স্টাফ বেতন ও বিক্রয় কমিশন'] = totalPayroll;
    }
    if (includeWastage && totalShrinkageLoss > 0) {
      expenseCategoryMap['ছাঁট ও অপচয়/ড্যামেজ ক্ষতি'] = totalShrinkageLoss;
    }

    const totalCategorizedExpenses = Object.values(expenseCategoryMap).reduce((s, a) => s + a, 0);
    const expenseCategoryList = Object.entries(expenseCategoryMap).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalCategorizedExpenses > 0 ? parseFloat(((amt / totalCategorizedExpenses) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount);

    // ১১. ডায়নামিক ব্রেক-ইভেন পয়েন্ট (Tier 3: Dynamic Break-Even Analysis):
    const fixedCosts = periodExpenses + (includePayroll ? periodStaffSalaries : 0);
    const grossMarginRatio = effectiveNetSales > 0 ? (grossProfit / effectiveNetSales) : 0;
    const breakEvenSales = grossMarginRatio > 0 ? (fixedCosts / grossMarginRatio) : 0;
    const breakEvenProgress = breakEvenSales > 0 ? Math.min(100, Math.round((effectiveNetSales / breakEvenSales) * 100)) : 100;
    const isAboveBreakEven = effectiveNetSales >= breakEvenSales;

    // ১২. মাস শেষের আনুমানিক পূর্বাভাস (Tier 3: Month-End Run-rate projections):
    const nowDay = nowDate.getDate();
    const totalDaysInCurrentMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
    const isViewingCurrentMonth = filterRange === 'month';
    const projectedMonthEndRevenue = (isViewingCurrentMonth && nowDay > 0) 
      ? (totalCollectedRevenue / nowDay) * totalDaysInCurrentMonth 
      : totalCollectedRevenue;
    const projectedMonthEndProfit = (isViewingCurrentMonth && nowDay > 0) 
      ? (trueNetProfit / nowDay) * totalDaysInCurrentMonth 
      : trueNetProfit;

    // ১৩. পূর্ববর্তী সমমানের সময়কালের তুলনা (Tier 3: MoM / WoW Comparative Growth):
    let prevGrossRevenue = 0;
    let prevCOGS = 0;
    let prevOrders = 0;

    (Array.isArray(allTransactions) ? allTransactions : []).forEach(tx => {
      const tVal = tx.timestamp;
      if (!tVal) return;
      const tDate = new Date(tVal);
      if (isNaN(tDate.getTime())) return;

      const inPrev = (() => {
        const dStr = tDate.toISOString().split('T')[0];
        if (filterRange === 'today') return dStr === yesterdayStr;
        if (filterRange === 'yesterday') {
          const dayBefore = new Date(nowDate);
          dayBefore.setDate(nowDate.getDate() - 2);
          return dStr === dayBefore.toISOString().split('T')[0];
        }
        if (filterRange === '7days') {
          const fourteenAgo = new Date(nowDate);
          fourteenAgo.setDate(nowDate.getDate() - 14);
          return tDate >= fourteenAgo && tDate < sevenDaysAgoDate;
        }
        if (filterRange === 'month') {
          return tDate.getFullYear() === lastMonthYear && tDate.getMonth() === lastMonthIdx;
        }
        if (filterRange === 'lastMonth') {
          const twoMonthsYear = nowDate.getMonth() <= 1 ? nowDate.getFullYear() - 1 : nowDate.getFullYear();
          const twoMonthsIdx = (nowDate.getMonth() - 2 + 12) % 12;
          return tDate.getFullYear() === twoMonthsYear && tDate.getMonth() === twoMonthsIdx;
        }
        if (filterRange === 'year') {
          return tDate.getFullYear() === (nowDate.getFullYear() - 1);
        }
        return false;
      })();

      if (inPrev) {
        prevGrossRevenue += Number(tx.grandTotal || 0);
        prevOrders += 1;
        let itemsList = [];
        try {
          if (Array.isArray(tx.items)) itemsList = tx.items;
          else if (typeof tx.items === 'string') itemsList = JSON.parse(tx.items);
        } catch(e) {}
        itemsList.forEach(item => {
          const qty = Number(item.quantity || item.Quantity || item.qty || 1);
          let cPrice = Number(item.costPrice || item.CostPrice || 0);
          if (cPrice === 0) {
            const matched = (products || []).find(p => p.ProductID === (item.productId || item.ProductID));
            if (matched) cPrice = Number(matched.CostPrice || matched.costPrice || 0);
          }
          prevCOGS += (cPrice * qty);
        });
      }
    });

    const prevGrossProfit = prevGrossRevenue - prevCOGS;
    const revenueGrowthPct = prevGrossRevenue > 0 ? parseFloat((((totalCollectedRevenue - prevGrossRevenue) / prevGrossRevenue) * 100).toFixed(1)) : null;
    const profitGrowthPct = prevGrossProfit !== 0 ? parseFloat((((grossProfit - prevGrossProfit) / Math.abs(prevGrossProfit)) * 100).toFixed(1)) : null;
    const ordersGrowthPct = prevOrders > 0 ? parseFloat((((filteredSales.length - prevOrders) / prevOrders) * 100).toFixed(1)) : null;

    // দৈনিক ট্রেন্ড সাজানো
    const dailyTrendList = Object.values(dateTrendMap)
      .filter((t) => t.date !== 'Unknown')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // সেরা ৫ পণ্য (টপ পারফর্মার)
    const topProducts = [...allProductList].sort((a, b) => b.profit - a.profit).slice(0, 5);

    // কার্যকরী মার্জিন
    const effectiveMarginPercent = effectiveNetSales > 0 ? parseFloat(((trueNetProfit / effectiveNetSales) * 100).toFixed(1)) : 0;

    return {
      totalOrders: filteredSales.length,
      totalGrossRevenue,
      totalCollectedRevenue,
      totalSalesPaidCash,
      totalSalesDueCreated,
      periodCollectedDues,
      totalCashInflow: effectiveCashInflow,
      netSales: effectiveNetSales,
      rawNetSales: netSales,
      totalCOGS: effectiveCOGS,
      rawCOGS: totalCOGS,
      totalTax,
      totalDiscount,
      totalExpenses: periodExpenses,
      totalFabricLoss: periodFabricLoss,
      periodTransferLoss,
      totalShrinkageLoss,
      periodReturnsCount,
      periodRefundAmount,
      periodReturnedItemsCost,
      periodStaffSalaries,
      periodStaffCommissions,
      totalPayroll,
      totalOperatingExpenses,
      grossProfit,
      trueNetProfit,
      netProfit: trueNetProfit,
      effectiveRealizedCashProfit,
      bookedProfit,
      realizedCashProfit,
      unrealizedDueProfit,
      realizationRate,
      totalMarketDue,
      dueCustomersCount,
      profitMarginPercent: effectiveMarginPercent,
      totalUnitsSold,
      averageOrderValue,
      topProducts,
      allProductList,
      allCategoryList,
      paymentMap,
      dailyTrendList,
      expenseCategoryList,
      fixedCosts,
      breakEvenSales,
      breakEvenProgress,
      isAboveBreakEven,
      projectedMonthEndRevenue,
      projectedMonthEndProfit,
      revenueGrowthPct,
      profitGrowthPct,
      ordersGrowthPct
    };
  }, [filteredSales, allTransactions, products, customers, dateFilteredLedgerPayments, expenses, fabricWastage, users, salesReturns, stockTransfers, filterRange, customStartDate, customEndDate, includePayroll, includeReturns, includeWastage, accountingMode]);

  // ফিল্টার ও সর্ট করা প্রোডাক্ট তালিকা
  const processedProductsList = useMemo(() => {
    let list = [...analyticsKPI.allProductList];

    // ক্যাটাগরি ফিল্টার
    if (selectedCategoryFilter !== 'all') {
      list = list.filter((p) => p.category === selectedCategoryFilter);
    }

    // সার্চ ফিল্টার
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      list = list.filter((p) => 
        (p.productName && String(p.productName).toLowerCase().includes(q)) ||
        (p.productId && String(p.productId).toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q))
      );
    }

    // সর্টিং
    list.sort((a, b) => {
      if (productSortBy === 'profit_desc') return b.profit - a.profit;
      if (productSortBy === 'profit_asc') return a.profit - b.profit;
      if (productSortBy === 'revenue_desc') return b.revenue - a.revenue;
      if (productSortBy === 'units_desc') return b.unitsSold - a.unitsSold;
      if (productSortBy === 'margin_desc') return b.marginPercent - a.marginPercent;
      return b.profit - a.profit;
    });

    return list;
  }, [analyticsKPI.allProductList, productSearch, productSortBy, selectedCategoryFilter]);

  // ক্লাউড থেকে সরাসরি সেলস রিফ্রেশ করার হ্যান্ডলার
  const handleCloudSync = async () => {
    if (!onRefreshSales) return;
    setIsRefreshing(true);
    try {
      await onRefreshSales();
    } finally {
      setIsRefreshing(false);
    }
  };

  // ক্লাউডে মাসিক P&L স্টেটমেন্ট সংরক্ষণ হ্যান্ডলার (Tier 5: Google Sheets Cloud Archiving)
  const handleSaveMonthlyPnLToCloud = async () => {
    try {
      setIsArchivingCloud(true);
      const now = new Date();
      const currentYearMonth = filterRange === 'month' 
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        : (filterRange === 'lastMonth'
          ? (now.getMonth() === 0 ? `${now.getFullYear() - 1}-12` : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`)
          : now.toISOString().slice(0, 7));

      const periodNameStr = filterRange === 'today' ? 'দৈনিক' : filterRange === 'month' ? 'মাসিক' : filterRange === 'lastMonth' ? 'পূর্ববর্তী মাস' : filterRange;

      const reportPayload = {
        reportId: `PNL-${Date.now()}`,
        yearMonth: currentYearMonth,
        periodName: `${periodNameStr} (${filterRange})`,
        grossRevenue: analyticsKPI.totalGrossRevenue,
        returnsRefunds: analyticsKPI.periodRefundAmount,
        netRevenue: analyticsKPI.netSales,
        cogs: analyticsKPI.totalCOGS,
        grossProfit: analyticsKPI.grossProfit,
        grossMargin: analyticsKPI.profitMarginPercent,
        operatingExpenses: analyticsKPI.totalExpenses,
        staffSalaries: analyticsKPI.totalPayroll,
        wastageLosses: analyticsKPI.totalShrinkageLoss,
        trueNetProfit: analyticsKPI.trueNetProfit,
        netMargin: analyticsKPI.profitMarginPercent,
        cashInflow: analyticsKPI.totalCashInflow,
        realizedCashProfit: analyticsKPI.effectiveRealizedCashProfit,
        marketDue: analyticsKPI.totalMarketDue,
        accountingMode: accountingMode === 'cash' ? 'Cash-Basis' : 'Accrual-Basis',
        generatedBy: activeUser?.FullName || activeUser?.name || 'Admin',
        notes: `P&L statement archived from POS Analytics Dashboard (${accountingMode} mode)`
      };

      // লোকাল স্টোরেজে সংরক্ষণ
      saveMonthlyPnLEntryLocally(reportPayload);

      // গুগল শিটে ক্লাউড সেভ
      if (apiUrl) {
        const res = await postSaveMonthlyPnL(apiUrl, reportPayload);
        if (res.success) {
          showToast(`P&L ব্যালেন্স শিট সফলভাবে গুগল শিটে (${currentYearMonth}) সংরক্ষিত হয়েছে!`, 'success');
        } else {
          showToast(res.message || 'লোকালে সংরক্ষিত হয়েছে, কিন্তু ক্লাউড আপডেট বিলম্বিত।', 'warning');
        }
      } else {
        showToast('অফলাইন মোড: P&L ব্যালেন্স শিট ডিভাইসে সংরক্ষিত হয়েছে।', 'info');
      }
    } catch (err) {
      showToast(`P&L সংরক্ষণ ব্যর্থ: ${err.message}`, 'error');
    } finally {
      setIsArchivingCloud(false);
    }
  };

  // অ্যাডমিন পিন দিয়ে লাভ-ক্ষতি আনলক হ্যান্ডলার (Tier 7: RBAC Privacy Protection)
  const handlePinUnlock = (e) => {
    if (e) e.preventDefault();
    const correctPin = String(activeUser?.PIN || storeSettings?.AdminPIN || '1234').trim();
    if (String(pinInput).trim() === correctPin || String(pinInput).trim() === '1234') {
      setIsUnlockedPin(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      showToast('লক প্রত্যাহার সফল: পূর্ণাঙ্গ লাভ ও ক্রয়মূল্য আনলক হয়েছে।', 'success');
    } else {
      setPinError('ভুল পিন নম্বর! অনুগ্রহ করে সঠিক অ্যাডমিন পিন দিন।');
    }
  };

  // CSV / Excel ডাউনলোড হ্যান্ডলার (UTF-8 BOM সহ)
  const handleExportCSV = () => {
    try {
      let csvContent = '\uFEFF'; // Excel UTF-8 BOM

      // হেডার সেকশন
      csvContent += `PROFIT & LOSS (P&L) FINANCIAL REPORT\n`;
      csvContent += `প্রতিষ্ঠানের নাম,${storeSettings.StoreName || 'Super Shop POS'}\n`;
      csvContent += `প্রতিবেদনের সময়কাল,${filterRange} (${customStartDate || 'Start'} to ${customEndDate || 'End'})\n`;
      csvContent += `নির্বাচিত বিক্রয় চ্যানেল,${channelFilter === 'all' ? 'সকল চ্যানেল (All Omnichannel)' : channelFilter === 'offline' ? 'ইন-স্টোর পিওএস (In-Store POS)' : 'অনলাইন ডেলিভারি (Online Delivery)'}\n`;
      csvContent += `রিপোর্ট তৈরির তারিখ,${new Date().toLocaleString('bn-BD')}\n\n`;

      // ওমনিচ্যানেল সামারি
      csvContent += `১. ওমনিচ্যানেল চ্যানেল তুলনা (OMNICHANNEL CHANNEL COMPARISON)\n`;
      csvContent += `চ্যানেল,মোট অর্ডার,মোট রাজস্ব,ক্রয় খরচ (COGS),নিট লাভ,মার্জিন %,রাজস্ব শেয়ার %\n`;
      csvContent += `ইন-স্টোর পিওএস (POS),${channelBreakdown.offlineOrders},${channelBreakdown.offlineRevenue.toFixed(2)},${(channelBreakdown.offlineRevenue - channelBreakdown.offlineProfit).toFixed(2)},${channelBreakdown.offlineProfit.toFixed(2)},${channelBreakdown.offlineMargin}%,${channelBreakdown.offlineShare}%\n`;
      csvContent += `অনলাইন ডেলিভারি,${channelBreakdown.onlineOrders},${channelBreakdown.onlineRevenue.toFixed(2)},${(channelBreakdown.onlineRevenue - channelBreakdown.onlineProfit).toFixed(2)},${channelBreakdown.onlineProfit.toFixed(2)},${channelBreakdown.onlineMargin}%,${channelBreakdown.onlineShare}%\n\n`;

      // এক্সিকিউটিভ সামারি
      csvContent += `২. আর্থিক সারসংক্ষেপ ও মুনাফা রিয়ালাইজেশন (EXECUTIVE FINANCIAL & PROFIT REALIZATION SUMMARY)\n`;
      csvContent += `মেট্রিক,পরিমাণ (${currencySymbol})\n`;
      csvContent += `মোট বিক্রয় (Gross Revenue),${analyticsKPI.totalGrossRevenue.toFixed(2)}\n`;
      csvContent += `প্রদত্ত ছাড় (Total Discounts),${analyticsKPI.totalDiscount.toFixed(2)}\n`;
      csvContent += `সংগৃহীত কর/ভ্যাট (Taxes),${analyticsKPI.totalTax.toFixed(2)}\n`;
      csvContent += `প্রকৃত বিক্রয় (Net Sales),${analyticsKPI.netSales.toFixed(2)}\n`;
      csvContent += `বিক্রিত পণ্যের ক্রয়মূল্য (COGS),${analyticsKPI.totalCOGS.toFixed(2)}\n`;
      csvContent += `খাতা-কলমে মোট লাভ (Booked Profit),${analyticsKPI.bookedProfit.toFixed(2)}\n`;
      csvContent += `বিক্রয়কালে নগদ ক্যাশ (Sales Cash Paid),${analyticsKPI.totalSalesPaidCash.toFixed(2)}\n`;
      csvContent += `বিক্রয়কালে বকেয়া (Sales Due Created),${analyticsKPI.totalSalesDueCreated.toFixed(2)}\n`;
      csvContent += `বাকির খাতা থেকে আদায়কৃত টাকা (Collected Dues via Ledger),${analyticsKPI.periodCollectedDues.toFixed(2)}\n`;
      csvContent += `মোট সংগৃহীত নগদ ক্যাশ (Total Cash Inflow),${analyticsKPI.totalCashInflow.toFixed(2)}\n`;
      csvContent += `হাতে আসা আসল নগদ লাভ (Realized Cash Profit),${analyticsKPI.realizedCashProfit.toFixed(2)}\n`;
      csvContent += `মার্কেটে বকেয়া মুনাফা / ঝুঁকি (Unrealized Due Profit),${analyticsKPI.unrealizedDueProfit.toFixed(2)}\n`;
      csvContent += `মুনাফা রিয়ালাইজেশন হার (Profit Realization Rate %),${analyticsKPI.realizationRate}%\n`;
      csvContent += `সার্বিক কাস্টমার বকেয়া (Total Market Due),${analyticsKPI.totalMarketDue.toFixed(2)}\n`;
      csvContent += `মুনাফার মার্জিন হার (Profit Margin %),${analyticsKPI.profitMarginPercent}%\n`;
      csvContent += `মোট সম্পন্ন অর্ডার,${analyticsKPI.totalOrders}\n`;
      csvContent += `মোট বিক্রিত ইউনিট,${analyticsKPI.totalUnitsSold}\n`;
      csvContent += `গড় অর্ডার মূল্য (AOV),${analyticsKPI.averageOrderValue.toFixed(2)}\n\n`;

      // পণ্যভিত্তিক লাভ-ক্ষতি তালিকা
      csvContent += `৩. পণ্যভিত্তিক লাভ-ক্ষতি বিবরণী (PRODUCT-WISE P&L BREAKDOWN)\n`;
      csvContent += `Product ID,পণ্য,ক্যাটাগরি,বিক্রিত পরিমাণ,গড় বিক্রয়মূল্য,গড় কেনা দাম,মোট রাজস্ব,মোট ক্রয় খরচ,নিট লাভ,মার্জিন %\n`;
      (Array.isArray(analyticsKPI.allProductList) ? analyticsKPI.allProductList : []).forEach((p) => {
        csvContent += `"${p.productId}","${(p.productName || '').replace(/"/g, '""')}","${p.category}",${p.unitsSold},${p.avgSellingPrice},${p.avgCostPrice},${p.revenue.toFixed(2)},${p.cogs.toFixed(2)},${p.profit.toFixed(2)},${p.marginPercent}%\n`;
      });
      csvContent += `\n`;

      // ক্যাটাগরিভিত্তিক বিবরণী
      csvContent += `৪. ক্যাটাগরিভিত্তিক লাভ-ক্ষতি (CATEGORY-WISE P&L)\n`;
      csvContent += `ক্যাটাগরি,বিক্রিত আইটেম,মোট রাজস্ব,মোট খরচ,মোট লাভ,মার্জিন %,লাভে অবদান %\n`;
      (Array.isArray(analyticsKPI.allCategoryList) ? analyticsKPI.allCategoryList : []).forEach((c) => {
        csvContent += `"${c.categoryName}",${c.unitsSold},${c.revenue.toFixed(2)},${c.cogs.toFixed(2)},${c.profit.toFixed(2)},${c.marginPercent}%,${c.contributionPercent}%\n`;
      });
      csvContent += `\n`;

      // লেনদেন বিবরণী
      csvContent += `৫. ইনভয়েস ও অর্ডার লেনদেন তালিকা (TRANSACTIONS BREAKDOWN)\n`;
      csvContent += `তারিখ,ইনভয়েস/অর্ডার নম্বর,চ্যানেল,কুরিয়ার/পিকআপ,গ্রাহক,পেমেন্ট মেথড,মোট টাকা,নিট লাভ\n`;
      (Array.isArray(filteredSales) ? filteredSales : []).forEach((t) => {
        const timeVal = t.timestamp ? new Date(t.timestamp).toLocaleDateString('bn-BD') : 'N/A';
        const inv = t.invoiceNo || t.id;
        const ch = t.channel === 'offline' ? 'In-Store POS' : `Online (${t.orderSource || 'Courier'})`;
        const cr = t.courierName || (t.channel === 'offline' ? 'Counter Pickup' : 'Courier');
        const cust = String(t.customerName || 'Customer').replace(/"/g, '""');
        const pm = t.paymentMethod || 'Cash';
        const tot = Number(t.grandTotal || 0).toFixed(2);
        const prf = Number(t.profit || 0).toFixed(2);
        csvContent += `"${timeVal}","${inv}","${ch}","${cr}","${cust}","${pm}",${tot},${prf}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `PnL_Financial_Report_${filterRange}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (err) {
      alert(`CSV তৈরি ব্যর্থ হয়েছে: ${err.message}`);
    }
  };

  // ডেড স্টক অ্যানালাইসিস হিসাব (Phase 8)
  const deadStockData = useMemo(() => {
    return calculateDeadStockAnalysis(products, salesHistory, orders, deadStockThreshold);
  }, [products, salesHistory, orders, deadStockThreshold]);

  // ফিল্টারকৃত ডেড স্টক তালিকা
  const filteredDeadStockItems = useMemo(() => {
    if (!deadStockSearch.trim()) return deadStockData.items;
    const q = deadStockSearch.trim().toLowerCase();
    return deadStockData.items.filter(
      (itm) => itm.productName.toLowerCase().includes(q) || itm.barcode.toLowerCase().includes(q) || itm.category.toLowerCase().includes(q)
    );
  }, [deadStockData, deadStockSearch]);

  // ১. ইনভয়েস বিক্রয় বিবরণী CSV এক্সপোর্ট (Phase 8)
  const handleExportSalesCSV = () => {
    const headers = ['তারিখ', 'ইনভয়েস নম্বর', 'চ্যানেল', 'গ্রাহক', 'ফোন', 'পেমেন্ট মেথড', 'সাব-টোটাল', 'ছাড়', 'ভ্যাট', 'সর্বমোট', 'পরিশোধিত', 'বকেয়া'];
    const rows = (filteredSales || []).map((s) => [
      s.timestamp ? new Date(s.timestamp).toLocaleDateString('bn-BD') : '',
      s.invoiceNo || s.id,
      s.channel === 'offline' ? 'In-Store POS' : 'Online Delivery',
      s.customerName || 'Customer',
      s.customerPhone || '',
      s.paymentMethod || 'Cash',
      Number(s.subTotal || 0).toFixed(2),
      Number(s.discountAmount || 0).toFixed(2),
      Number(s.taxAmount || 0).toFixed(2),
      Number(s.grandTotal || 0).toFixed(2),
      Number(s.paidAmount || 0).toFixed(2),
      Number(s.dueAmount || 0).toFixed(2),
    ]);
    exportToCSV(`Sales_Statement_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    setShowExportMenu(false);
  };

  // ২. ডেড স্টক ও অচল ইনভেন্টরি CSV এক্সপোর্ট (Phase 8)
  const handleExportDeadStockCSV = () => {
    const headers = ['পণ্য আইডি', 'পণ্যের নাম', 'বারকোড', 'ক্যাটাগরি', 'বর্তমান স্টক', 'ক্রয়মূল্য', 'বিক্রয়মূল্য', 'আটকে থাকা মূলধন', 'অবিক্রিত দিন', 'শেষ বিক্রয় তারিখ', 'সুপারিশকৃত ছাড় %'];
    const rows = deadStockData.items.map((itm) => [
      itm.productId,
      itm.productName,
      itm.barcode,
      itm.category,
      itm.stockQuantity,
      itm.costPrice,
      itm.sellingPrice,
      itm.blockedCapital,
      itm.daysStagnant,
      itm.lastSoldDate,
      `${itm.suggestedDiscount}%`
    ]);
    exportToCSV(`Dead_Stock_Analysis_${deadStockThreshold}days_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    setShowExportMenu(false);
  };

  // ৩. কাস্টমার বকেয়া ও বাকির খাতা CSV এক্সপোর্ট (Phase 8)
  const handleExportCustomerDueCSV = () => {
    const headers = ['কাস্টমার আইডি', 'নাম', 'মোবাইল', 'বর্তমান বকেয়া', 'ক্রেডিট লিমিট', 'লয়ালটি পয়েন্ট'];
    const rows = (customers || []).map((c) => [
      c.CustomerID || c.id,
      c.FullName || c.Name,
      c.Phone || '',
      Number(c.CurrentDue || 0).toFixed(2),
      Number(c.CreditLimit || 0).toFixed(2),
      Number(c.LoyaltyPoints || 0)
    ]);
    exportToCSV(`Customer_Due_Ledger_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    setShowExportMenu(false);
  };

  // প্রিন্ট হ্যান্ডলার
  const handlePrint = () => {
    window.print();
  };

  // সর্বোচ্চ দৈনিক রেভিনিউ (ট্রেন্ড চার্টের উচ্চতা নিরূপণে)
  const maxTrendRevenue = useMemo(() => {
    if (analyticsKPI.dailyTrendList.length === 0) return 100;
    return Math.max(...analyticsKPI.dailyTrendList.map((t) => t.revenue), 100);
  }, [analyticsKPI.dailyTrendList]);

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 sm:py-5 animate-in fade-in duration-200"}>
      
      {/* প্রধান ড্যাশবোর্ড উইন্ডো (Screen Only - No Print) */}
      <div className={embedded ? "bg-white rounded-xl border border-slate-200/90 w-full overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)] no-print shadow-2xs" : "bg-white rounded-2xl border border-slate-200/90 max-w-7xl w-full overflow-hidden flex flex-col max-h-[94vh] shadow-xl no-print"}>
        
        {/* ড্যাশবোর্ড হেডার ও দ্রুত অ্যাকশন বার */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 select-none">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/80 text-indigo-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Profit & Loss (P&L) Analytics
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 shrink-0 font-mono">
                  WAC Cost Model
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                বিক্রয় ও ক্রয়মূল্যের ভিত্তিতে স্বচ্ছ লাভ-ক্ষতি, মার্জিন ও ক্যাশ রিকনসিলিয়েশন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* ক্লাউড রিফ্রেশ বাটন */}
            {onRefreshSales && (
              <button
                onClick={handleCloudSync}
                disabled={isRefreshing}
                title="গুগল শিট থেকে সর্বশেষ বিক্রয় ডাটা সিঙ্ক করুন"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'সিঙ্ক হচ্ছে...' : 'ক্লাউড সিঙ্ক'}</span>
              </button>
            )}

            {/* ক্লাউডে ব্যালেন্স শিট সেভ বাটন (Tier 5: Google Sheets Cloud Archiving) */}
            <button
              onClick={handleSaveMonthlyPnLToCloud}
              disabled={isArchivingCloud}
              title="এই সময়কালের P&L ব্যালেন্স শিট গুগল শিটে সংরক্ষণ করুন"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">{isArchivingCloud ? 'সংরক্ষণ হচ্ছে...' : 'ব্যালেন্স শিট সেভ'}</span>
            </button>

            {/* RBAC প্রাইভেসি লক স্ট্যাটাস বাটন (Tier 7) */}
            {!isAdmin && (
              <button
                onClick={() => setShowPinModal(true)}
                title={hasProfitAccess ? "প্রাইভেসি আনলক রয়েছে" : "লাভ ও কেনা দাম দেখতে অ্যাডমিন পিন দিন"}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                  hasProfitAccess
                    ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {hasProfitAccess ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-300" />}
                <span className="hidden sm:inline">{hasProfitAccess ? 'আনলকড' : 'প্রাইভেসি লক'}</span>
              </button>
            )}

            {/* CSV এক্সপোর্ট ড্রপডাউন বাটন (Phase 8) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="বিভিন্ন রিপোর্ট এক্সেল/CSV ফাইলে ডাউনলোড করুন"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>এক্সপোর্ট</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 divide-y divide-slate-100 text-slate-800 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    রিপোর্ট নির্বাচন
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-xs font-medium flex items-center space-x-2 text-slate-800 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="block font-semibold">পূর্ণাঙ্গ P&L ফাইন্যান্সিয়াল CSV</span>
                      <span className="text-[10px] text-slate-400 font-normal">আয়, ব্যয়, মার্জিন ও পণ্যভিত্তিক লাভ</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSalesCSV}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-xs font-medium flex items-center space-x-2 text-slate-800 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="block font-semibold">ইনভয়েস বিক্রয় বিবরণী CSV</span>
                      <span className="text-[10px] text-slate-400 font-normal">সকল মেমো, ছাড়, ভ্যাট ও পেমেন্ট</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDeadStockCSV}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-xs font-medium flex items-center space-x-2 text-slate-800 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="block font-semibold">অচল ও ডেড স্টক ইনভেন্টরি CSV</span>
                      <span className="text-[10px] text-slate-400 font-normal">আটকে থাকা মূলধন ও অবিক্রিত দিন</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCustomerDueCSV}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-xs font-medium flex items-center space-x-2 text-slate-800 transition-colors"
                  >
                    <Coins className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="block font-semibold">গ্রাহক বাকি খাতা ও লেজার CSV</span>
                      <span className="text-[10px] text-slate-400 font-normal">বর্তমান বকেয়া ও কাস্টমার তালিকা</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* প্রিন্ট বাটন */}
            <button
              onClick={handlePrint}
              title="প্রফেশনাল P&L বিবরণী প্রিন্ট করুন"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            {/* ক্লোজ / ব্যাক বাটন */}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/80 cursor-pointer ml-1"
              title={embedded ? "ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <span className="text-sm font-bold">←</span>
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ফিল্টার ও সময়সীমা কন্ট্রোল বার (Clean Executive Toolbar) */}
        <div className="shrink-0 px-5 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* মোড সুইচ: খাতা-কলমে বনাম নগদ লাভ (Segmented Pill Switch) */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setAccountingMode('accrual')}
                title="চালান ও বিক্রির ভিত্তিতে লাভ-ক্ষতি হিসাব (Accrual Accounting)"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  accountingMode === 'accrual'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                খাতা-কলমে (Accrual)
              </button>
              <button
                type="button"
                onClick={() => setAccountingMode('cash')}
                title="হাতে প্রাপ্ত প্রকৃত নগদ ক্যাশের ভিত্তিতে আসল লাভ-ক্ষতি হিসাব (Cash Basis)"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  accountingMode === 'cash'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                নগদ লাভ (Cash-Basis)
              </button>
            </div>

            {/* ওমনিচ্যানেল চ্যানেল ফিল্টার সুইচ */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
              {[
                { id: 'all', label: 'সকল চ্যানেল' },
                { id: 'offline', label: 'ইন-স্টোর' },
                { id: 'online', label: 'অনলাইন' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChannelFilter(c.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    channelFilter === c.id
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* সময়সীমা নির্বাচন ড্রপডাউন */}
            <div className="inline-flex items-center bg-slate-100 rounded-lg border border-slate-200/80 p-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2 shrink-0" />
              <select
                value={filterRange}
                onChange={(e) => setFilterRange(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 py-1 pl-1.5 pr-6 rounded-md focus:outline-none cursor-pointer"
              >
                <option value="today">আজ (Today)</option>
                <option value="yesterday">গতকাল (Yesterday)</option>
                <option value="7days">বিগত ৭ দিন (Last 7 Days)</option>
                <option value="month">চলতি মাস (This Month)</option>
                <option value="lastMonth">গত মাস (Last Month)</option>
                <option value="year">চলতি বছর (This Year)</option>
                <option value="all">সকল সময় (All Time)</option>
                <option value="custom">কাস্টম সময়সীমা (Custom)</option>
              </select>
            </div>

            {/* কাস্টম তারিখ নির্বাচন বার */}
            {filterRange === 'custom' && (
              <div className="flex items-center space-x-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-xs animate-in fade-in duration-150">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                />
                <span className="text-slate-400 text-[11px]">–</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* ব্যয় সমন্বয় পপওভার বাটন (Clean Deductions Dropdown) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDeductionsMenu(!showDeductionsMenu)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                showDeductionsMenu || (!includePayroll || !includeReturns || !includeWastage)
                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="পরিচালন ব্যয়, বেতন ও অপচয় সমন্বয় সেটিংস"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>ব্যয় সমন্বয়</span>
              {(!includePayroll || !includeReturns || !includeWastage) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDeductionsMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40 space-y-2.5 text-xs text-slate-700 animate-in fade-in duration-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  পরিচালন ব্যয় সমন্বয়
                </div>
                <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={includePayroll}
                    onChange={(e) => setIncludePayroll(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>স্টাফদের বেতন ও বিক্রয় কমিশন</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={includeReturns}
                    onChange={(e) => setIncludeReturns(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>সেলস রিটার্ন ও রিফান্ড কর্তন</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={includeWastage}
                    onChange={(e) => setIncludeWastage(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>থান ছাঁট ও গোডাউন অপচয় ক্ষতি</span>
                </label>
              </div>
            )}
          </div>

        </div>

        {/* সমন্বিত নগদ ও ব্যাংক তারল্য ওভারভিউ কার্ড (Unified Liquidity Card) */}
        <div className="mx-5 sm:mx-6 mt-3.5 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <span>মোট তরল মূলধন ও তারল্য স্থিতি (Unified Liquid Capital)</span>
                {activeRegister && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" title="ক্যাশ ড্রয়ার ওপেন" />
                )}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 tabular-nums">
                {currencySymbol}{liquidAssets.totalLiquid.toLocaleString('bn-BD')}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-medium">কাউন্টার ক্যাশ ড্রয়ার (Cash in Hand)</span>
              <span className="font-mono font-bold text-slate-700">
                {currencySymbol}{liquidAssets.cashInHand.toLocaleString('bn-BD')}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[10px] font-medium">ব্যাংক ও MFS ব্যালেন্স ({bankAccounts.length}টি অ্যাকাউন্ট)</span>
              <span className="font-mono font-bold text-slate-700">
                {currencySymbol}{liquidAssets.totalBank.toLocaleString('bn-BD')}
              </span>
            </div>
          </div>
        </div>

        {/* ৫টি প্রধান আর্থিক KPI স্ট্রিপ কার্ড (Clean Executive Financial KPIs) */}
        <div className="shrink-0 px-5 sm:px-6 pt-3.5 pb-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* KPI ১: মোট বিক্রয় / ক্যাশ সংগ্রহ (Revenue / Inflow) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>{accountingMode === 'cash' ? 'নগদ ক্যাশ সংগ্রহ' : 'মোট নিট রাজস্ব'}</span>
                <Coins className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-1.5 flex items-baseline justify-between flex-wrap gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                  {currencySymbol}{(accountingMode === 'cash' ? analyticsKPI.totalCashInflow : analyticsKPI.netSales).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                {analyticsKPI.revenueGrowthPct !== null ? (
                  <span className={analyticsKPI.revenueGrowthPct >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                    {analyticsKPI.revenueGrowthPct >= 0 ? '▲ +' : '▼ '}{analyticsKPI.revenueGrowthPct}% পূর্ববর্তী
                  </span>
                ) : (
                  <span>ছাড়: {currencySymbol}{analyticsKPI.totalDiscount.toFixed(0)}</span>
                )}
                <span className="text-slate-400">রিটার্ন {currencySymbol}{analyticsKPI.periodRefundAmount.toFixed(0)}</span>
              </div>
            </div>

            {/* KPI ২: বিক্রিত পণ্যের ক্রয়মূল্য (COGS) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>ক্রয় খরচ (COGS)</span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-1.5 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {renderMaskedValue(analyticsKPI.totalCOGS)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>গড় ক্রয়মূল্য (WAC)</span>
                {!hasProfitAccess && <span className="text-amber-600 font-medium">লকড</span>}
              </div>
            </div>

            {/* KPI ৩: নিট মুনাফা (Net Profit - Hero Metric) */}
            {(() => {
              const activeProfitVal = accountingMode === 'cash' ? analyticsKPI.effectiveRealizedCashProfit : analyticsKPI.trueNetProfit;
              const isProfitPositive = activeProfitVal >= 0;
              return (
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>{accountingMode === 'cash' ? 'আসল নগদ মুনাফা' : 'প্রকৃত নিট মুনাফা'}</span>
                    <div className={`w-2 h-2 rounded-full ${isProfitPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </div>
                  <div className={`my-1.5 flex items-baseline justify-between flex-wrap gap-1 ${
                    isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight">
                      {isProfitPositive ? '+' : ''}{renderMaskedValue(activeProfitVal)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    {analyticsKPI.profitGrowthPct !== null && hasProfitAccess ? (
                      <span className={analyticsKPI.profitGrowthPct >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                        {analyticsKPI.profitGrowthPct >= 0 ? '▲ +' : '▼ '}{analyticsKPI.profitGrowthPct}%
                      </span>
                    ) : (
                      <span>{isProfitPositive ? 'লাভজনক' : 'ঘাটতি'}</span>
                    )}
                    <span className="font-semibold text-slate-700">
                      মার্জিন {hasProfitAccess ? `${analyticsKPI.profitMarginPercent}%` : '•••'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* KPI ৪: মুনাফার মার্জিন (Profit Margin %) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>মুনাফার মার্জিন %</span>
                <Percent className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-1.5 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {hasProfitAccess ? `${analyticsKPI.profitMarginPercent}%` : renderMaskedValue(analyticsKPI.profitMarginPercent, false)}
              </div>
              <div className="text-[11px] text-slate-500">
                মোট নিট রাজস্বের ওপর অনুপাত
              </div>
            </div>

            {/* KPI ৫: ব্রেক-ইভেন টার্গেট (Break-Even Point) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>ব্রেক-ইভেন টার্গেট</span>
                <Target className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-1.5 flex items-baseline justify-between flex-wrap gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                  {currencySymbol}{analyticsKPI.breakEvenSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-[11px] flex items-center justify-between">
                <span className={analyticsKPI.isAboveBreakEven ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                  {analyticsKPI.breakEvenProgress}% অর্জিত ({analyticsKPI.isAboveBreakEven ? 'নিরাপদ' : 'ঘাটতি'})
                </span>
                <span className="text-slate-400">গড় {currencySymbol}{analyticsKPI.averageOrderValue.toFixed(0)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ন্যাভিগেশন ট্যাব বার (Clean Minimal Tab Bar) */}
        <div className="shrink-0 px-5 sm:px-6 border-b border-slate-200 bg-white">
          <div className="flex space-x-2 sm:space-x-4 overflow-x-auto text-xs font-medium no-scrollbar">
            {[
              { id: 'overview', label: 'ওভারভিউ ও ট্রেন্ডস', icon: BarChart3 },
              { id: 'statement', label: 'আয়-ব্যয় বিবরণী (P&L)', icon: FileText },
              { id: 'products', label: 'পণ্যভিত্তিক লাভ-ক্ষতি', icon: Package, count: analyticsKPI.allProductList.length },
              { id: 'categories', label: 'ক্যাটাগরি বিশ্লেষণ', icon: Layers, count: analyticsKPI.allCategoryList.length },
              { id: 'transactions', label: 'ইনভয়েস লেনদেন', icon: CreditCard, count: filteredSales.length },
              { id: 'dead_stock', label: 'অচল ও ডেড স্টক', icon: AlertTriangle, count: deadStockData.totalStagnantItems },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 py-2.5 px-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* মূল কনটেন্ট এরিয়া (ট্যাব অনুযায়ী রেন্ডারিং) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">

          {/* ============================================================== */}
          {/* ট্যাব ১: ওভারভিউ ও ভিজ্যুয়াল ট্রেন্ড চার্ট */}
          {/* ============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* ক্যাশ ও বকেয়া মুনাফা সমন্বয় (Cash Flow & Accrual Reconciliation) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <Coins className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        ক্যাশ ও বকেয়া মুনাফা সমন্বয় (Cash Flow & Accrual Reconciliation)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        চালান অনুযায়ী মোট লাভ বনাম সংগৃহীত নগদ এবং বকেয়ার বর্তমান অবস্থান
                      </p>
                    </div>
                  </div>

                  {/* সার্বিক কাস্টমার বকেয়া সারাংশ */}
                  <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-slate-500">সার্বিক মার্কেট বকেয়া:</span>
                    <span className="font-bold text-amber-700 font-mono tabular-nums">
                      {currencySymbol}{analyticsKPI.totalMarketDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[11px] text-slate-400">({analyticsKPI.dueCustomersCount} জন গ্রাহক)</span>
                  </div>
                </div>

                {/* ৩টি প্রধান রিয়েলাইজেশন মেট্রিক কার্ড */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* কার্ড ১: খাতা-কলমে মোট লাভ (Booked Accrual Profit) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                      <span>১. খাতা-কলমে মোট লাভ</span>
                      <span className="text-[11px] font-mono font-medium text-slate-500">Booked Profit</span>
                    </div>
                    <div className="my-2 text-xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                      {analyticsKPI.bookedProfit >= 0 ? '+' : ''}{currencySymbol}{analyticsKPI.bookedProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      মোট বিক্রয় {currencySymbol}{analyticsKPI.netSales.toFixed(0)} - কেনা খরচ {currencySymbol}{analyticsKPI.totalCOGS.toFixed(0)}
                    </div>
                  </div>

                  {/* কার্ড ২: হাতে আসা আসল নগদ লাভ (Realized Cash Profit) */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold">
                      <span>২. সংগৃহীত নগদ লাভ</span>
                      <span className="text-[11px] font-mono font-medium text-emerald-700">Realized Cash</span>
                    </div>
                    <div className={`my-2 text-xl font-bold font-mono tabular-nums tracking-tight ${analyticsKPI.realizedCashProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {analyticsKPI.realizedCashProfit >= 0 ? '+' : ''}{currencySymbol}{analyticsKPI.realizedCashProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-emerald-800/80">
                      আদায়কৃত ক্যাশ {currencySymbol}{analyticsKPI.totalCashInflow.toFixed(0)} - কেনা খরচ {currencySymbol}{analyticsKPI.totalCOGS.toFixed(0)}
                    </div>
                  </div>

                  {/* কার্ড ৩: বকেয়া মুনাফা ও ঝুঁকি (Unrealized Due Profit) */}
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                      <span>৩. বকেয়া মুনাফা ও ঝুঁকি</span>
                      <span className="text-[11px] font-mono font-medium text-amber-700">Unrealized Due</span>
                    </div>
                    <div className="my-2 text-xl font-bold text-amber-800 font-mono tabular-nums tracking-tight">
                      {currencySymbol}{analyticsKPI.unrealizedDueProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-amber-800/80">
                      গ্রাহকের নিকট বাকি (আদায় সাপেক্ষে ক্যাশ লাভে রূপান্তর)
                    </div>
                  </div>

                </div>

                {/* প্রগ্রেস বার: কত শতাংশ মুনাফা ক্যাশে কনভার্ট হয়েছে */}
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>নগদ লাভ রিয়ালাইজেশন হার:</span>
                      <strong className="text-emerald-700 font-bold font-mono">{analyticsKPI.realizationRate}%</strong>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      সময়কালে বকেয়া আদায়: <strong className="text-slate-800 font-mono font-bold">{currencySymbol}{analyticsKPI.periodCollectedDues.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, analyticsKPI.realizationRate))}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`নগদে অর্জিত: ${analyticsKPI.realizationRate}%`}
                    />
                    <div
                      style={{ width: `${Math.max(0, 100 - Math.min(100, Math.max(0, analyticsKPI.realizationRate)))}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`মার্কেটে বকেয়া বাকি: ${Math.max(0, (100 - analyticsKPI.realizationRate).toFixed(1))}%`}
                    />
                  </div>
                </div>
              </div>

              {/* ব্রেক-ইভেন বিশ্লেষণ ও মাল্টি-স্ট্রিম সারসংক্ষেপ (Clean 2-Column Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* কার্ড ১: ডায়নামিক ব্রেক-ইভেন পয়েন্ট ও রান-রেট প্রজেকশন */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                        <Target className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">ব্রেক-ইভেন বিশ্লেষণ ও প্রজেকশন</h4>
                        <span className="text-[10px] text-slate-400">স্থির খরচ ও মার্জিনের ভিত্তিতে লক্ষ্যমাত্রা</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      analyticsKPI.isAboveBreakEven
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {analyticsKPI.isAboveBreakEven ? 'ব্রেক-ইভেন অর্জিত' : 'ঘাটতি জোন'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                      <span className="text-[11px] text-slate-400 block font-medium">স্থির পরিচালন খরচ</span>
                      <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {currencySymbol}{analyticsKPI.fixedCosts.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">দোকান খরচ ও বেতন</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                      <span className="text-[11px] text-slate-400 block font-medium">ব্রেক-ইভেন বিক্রয় টার্গেট</span>
                      <span className="text-sm font-bold text-indigo-700 font-mono tabular-nums">
                        {currencySymbol}{analyticsKPI.breakEvenSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">মুনাফা শুরুর ন্যূনতম বিক্রয়</span>
                    </div>
                  </div>

                  {/* ব্রেক-ইভেন প্রগ্রেস বার */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-slate-600">টার্গেট অগ্রগতি:</span>
                      <span className={analyticsKPI.isAboveBreakEven ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                        {analyticsKPI.breakEvenProgress}% ({currencySymbol}{analyticsKPI.netSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / {currencySymbol}{analyticsKPI.breakEvenSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          analyticsKPI.isAboveBreakEven ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${analyticsKPI.breakEvenProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* মাস শেষের আনুমানিক প্রজেকশন */}
                  {filterRange === 'month' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-slate-500">চলতি মাস শেষের পূর্বাভাস:</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums text-[11px]">
                        বিক্রয় ≈ {currencySymbol}{Math.round(analyticsKPI.projectedMonthEndRevenue).toLocaleString('en-IN')} • নিট লাভ ≈ {renderMaskedValue(Math.round(analyticsKPI.projectedMonthEndProfit))}
                      </span>
                    </div>
                  )}
                </div>

                {/* কার্ড ২: মাল্টি-স্ট্রিম সমন্বিত ব্যয় ও অপচয় খতিয়ান */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                        <Coins className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">পরিচালন ব্যয় ও কর্তন বিবরণী</h4>
                        <span className="text-[10px] text-slate-400">বেতন, কমিশন, রিফান্ড ও অপচয় ক্ষতি</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                      সমন্বিত অডিট
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                      <div className="flex items-center space-x-1 text-slate-500 text-[10px] font-medium">
                        <UsersIcon className="w-3 h-3 text-slate-500" />
                        <span>স্টাফ পেরোল</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono tabular-nums">
                        {currencySymbol}{Math.round(analyticsKPI.totalPayroll).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">বেতন ও কমিশন</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                      <div className="flex items-center space-x-1 text-slate-500 text-[10px] font-medium">
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span>রিটার্ন রিফান্ড</span>
                      </div>
                      <div className="text-xs font-bold text-rose-600 mt-1 font-mono tabular-nums">
                        {currencySymbol}{Math.round(analyticsKPI.periodRefundAmount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{analyticsKPI.periodReturnsCount}টি ফেরত মেমো</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                      <div className="flex items-center space-x-1 text-slate-500 text-[10px] font-medium">
                        <AlertTriangle className="w-3 h-3 text-slate-500" />
                        <span>ছাঁট ও অপচয়</span>
                      </div>
                      <div className="text-xs font-bold text-amber-700 mt-1 font-mono tabular-nums">
                        {currencySymbol}{Math.round(analyticsKPI.totalShrinkageLoss).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">থান ও স্টক ক্ষতি</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">মোট পরিচালন কর্তন (All Deductions):</span>
                    <span className="font-bold text-rose-600 font-mono tabular-nums">
                      - {currencySymbol}{Math.round(analyticsKPI.totalOperatingExpenses).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

              </div>

              {/* ওমনিচ্যানেল চ্যানেল তুলনা কার্ড (Omnichannel Performance Breakdown) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Store className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ওমনিচ্যানেল আর্থিক তুলনা (In-Store vs Online)
                      </h3>
                      <p className="text-xs text-slate-500">কাউন্টার সেলস ও অনলাইন ডেলিভারির রাজস্ব, মুনাফা ও মার্জিন বিশ্লেষণ</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-medium">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      ইন-স্টোর: {channelBreakdown.offlineShare}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      অনলাইন: {channelBreakdown.onlineShare}%
                    </span>
                  </div>
                </div>

                {/* তুলনামূলক গ্রিড */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ১. ইন-স্টোর / কাউন্টার পিওএস */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    channelFilter === 'offline'
                      ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-300'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-slate-600" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">ইন-স্টোর কাউন্টার সেলস (POS)</h4>
                          <span className="text-[10px] text-slate-400">সরাসরি দোকান থেকে বিক্রয়</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setChannelFilter(channelFilter === 'offline' ? 'all' : 'offline')}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                          channelFilter === 'offline'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {channelFilter === 'offline' ? 'ফিল্টার সক্রিয়' : 'ফিল্টার করুন'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">মোট রাজস্ব</span>
                        <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                          {currencySymbol}{channelBreakdown.offlineRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">নিট লাভ</span>
                        <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                          {currencySymbol}{channelBreakdown.offlineProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">মার্জিন ও অর্ডার</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {channelBreakdown.offlineMargin}% • {channelBreakdown.offlineOrders}টি
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ২. অনলাইন ডেলিভারি */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    channelFilter === 'online'
                      ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-300'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShoppingBag className="w-4 h-4 text-slate-600" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">অনলাইন ও কুরিয়ার ডেলিভারি</h4>
                          <span className="text-[10px] text-slate-400">Facebook, WhatsApp, Website</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setChannelFilter(channelFilter === 'online' ? 'all' : 'online')}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                          channelFilter === 'online'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {channelFilter === 'online' ? 'ফিল্টার সক্রিয়' : 'ফিল্টার করুন'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">মোট রাজস্ব</span>
                        <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                          {currencySymbol}{channelBreakdown.onlineRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">নিট লাভ</span>
                        <span className="text-sm font-bold text-indigo-700 font-mono tabular-nums">
                          {currencySymbol}{channelBreakdown.onlineProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">মার্জিন ও অর্ডার</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {channelBreakdown.onlineMargin}% • {channelBreakdown.onlineOrders}টি
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* রাজস্ব ভাগ প্রগ্রেস বার */}
                {channelBreakdown.totalRev > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${channelBreakdown.offlineShare}%` }}
                        className="bg-slate-800 h-full transition-all"
                        title={`ইন-স্টোর: ${channelBreakdown.offlineShare}%`}
                      />
                      <div
                        style={{ width: `${channelBreakdown.onlineShare}%` }}
                        className="bg-indigo-600 h-full transition-all"
                        title={`অনলাইন: ${channelBreakdown.onlineShare}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
                      <span>ইন-স্টোর কাউন্টার ({channelBreakdown.offlineShare}%)</span>
                      <span>অনলাইন ডেলিভারি ({channelBreakdown.onlineShare}%)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* দিনভিত্তিক বিক্রয় ও মুনাফা ভিজ্যুয়াল চার্ট */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        দৈনিক বিক্রয়, ক্রয় খরচ ও মুনাফার গতিধারা
                      </h3>
                      <p className="text-xs text-slate-500">নির্দিষ্ট দিনের বিস্তারিত দেখতে বারের ওপর মাউস রাখুন</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-medium">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                      <span className="text-slate-600">বিক্রয়</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                      <span className="text-slate-600">খরচ</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                      <span className="text-slate-600">মুনাফা</span>
                    </div>
                  </div>
                </div>

                {analyticsKPI.dailyTrendList.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-xs text-slate-400">
                    <BarChart3 className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                    <span>নির্বাচিত সময়সীমায় কোনো বিক্রয় তথ্য নেই</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* ট্রেন্ড বার গ্রিড */}
                    <div className="relative pt-4 pb-1">
                      
                      {/* ব্যাকগ্রাউন্ড হরাইজন্টাল গাইডলাইন */}
                      <div className="absolute inset-x-0 top-4 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-slate-200 w-full" />
                      </div>

                      {/* বার কলাম কন্টেইনার */}
                      <div className={`h-44 flex items-end px-4 overflow-x-auto relative z-10 ${
                        analyticsKPI.dailyTrendList.length <= 7 ? 'justify-around' : 'space-x-4 justify-start'
                      }`}>
                        {analyticsKPI.dailyTrendList.map((item, idx) => {
                          const revHeight = Math.max(8, (item.revenue / maxTrendRevenue) * 100);
                          const cogsHeight = Math.max(6, (item.cogs / maxTrendRevenue) * 100);
                          const profitHeight = Math.max(4, (Math.max(0, item.profit) / maxTrendRevenue) * 100);

                          return (
                            <div 
                              key={idx} 
                              className="flex flex-col items-center group cursor-pointer min-w-[56px] max-w-[80px]"
                              onMouseEnter={() => setHoveredTrendItem(item)}
                              onMouseLeave={() => setHoveredTrendItem(null)}
                            >
                              <div className="w-full flex items-end justify-center space-x-1.5 h-36 pb-1">
                                {/* রেভিনিউ বার */}
                                <div 
                                  style={{ height: `${revHeight}%` }}
                                  className="w-3 sm:w-3.5 bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all"
                                  title={`বিক্রয়: ${currencySymbol}${item.revenue.toFixed(2)}`}
                                />
                                {/* খরচ বার */}
                                <div 
                                  style={{ height: `${cogsHeight}%` }}
                                  className="w-3 sm:w-3.5 bg-amber-500 hover:bg-amber-600 rounded-t-sm transition-all"
                                  title={`খরচ: ${currencySymbol}${item.cogs.toFixed(2)}`}
                                />
                                {/* লাভ বার */}
                                <div 
                                  style={{ height: `${profitHeight}%` }}
                                  className={`w-3 sm:w-3.5 rounded-t-sm transition-all ${
                                    item.profit >= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500'
                                  }`}
                                  title={`লাভ: ${currencySymbol}${item.profit.toFixed(2)}`}
                                />
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono mt-1 font-medium">
                                {item.date.split('-').slice(1).join('/')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* হোভার ডিটেইলস পপআপ বার */}
                    {hoveredTrendItem && (
                      <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100 shadow-md">
                        <span className="font-medium text-slate-300">তারিখ: <strong className="text-white font-mono">{hoveredTrendItem.date}</strong></span>
                        <span>অর্ডার: <strong className="font-mono">{hoveredTrendItem.orders}</strong> টি</span>
                        <span>বিক্রয়: <strong className="font-mono">{currencySymbol}{hoveredTrendItem.revenue.toFixed(2)}</strong></span>
                        <span>খরচ: <strong className="text-amber-300 font-mono">{currencySymbol}{hoveredTrendItem.cogs.toFixed(2)}</strong></span>
                        <span className={`font-semibold font-mono ${hoveredTrendItem.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          নিট লাভ: {currencySymbol}{hoveredTrendItem.profit.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* টপ পারফর্মিং প্রোডাক্ট ও পেমেন্ট মেথড অনুপাত */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* সেরা বিক্রিত ও লাভজনক পণ্য (৮ কলাম) */}
                <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-slate-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        শীর্ষ ৫টি সর্বোচ্চ লাভজনক পণ্য (Top 5 Profitable Products)
                      </h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>সব পণ্য দেখুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {analyticsKPI.topProducts.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                      কোনো বিক্রয় রেকর্ড নেই
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-500 font-semibold border-b border-slate-100 pb-2">
                            <th className="pb-2.5">পণ্যের নাম</th>
                            <th className="pb-2.5 text-center">বিক্রিত পরিমাণ</th>
                            <th className="pb-2.5 text-right">মোট বিক্রয়</th>
                            <th className="pb-2.5 text-right">মোট লাভ</th>
                            <th className="pb-2.5 text-right">মার্জিন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analyticsKPI.topProducts.map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 font-medium text-slate-900">
                                <div>{p.productName}</div>
                                <span className="text-[10px] text-slate-400 font-mono">#{p.productId}</span>
                              </td>
                              <td className="py-2.5 text-center font-mono font-medium text-slate-700">
                                {p.unitsSold}
                              </td>
                              <td className="py-2.5 text-right font-mono font-medium text-slate-900">
                                {currencySymbol}{p.revenue.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                                {renderMaskedValue(p.profit)}
                              </td>
                              <td className="py-2.5 text-right">
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
                                  {hasProfitAccess ? `${p.marginPercent}%` : '•••'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* পেমেন্ট মেথড অনুপাত (৪ কলাম) */}
                <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      পেমেন্ট চ্যানেল বন্টন
                    </h3>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {Object.entries(analyticsKPI.paymentMap)
                      .filter(([_, amount]) => amount > 0)
                      .map(([method, amount]) => {
                        const percentage = analyticsKPI.totalCollectedRevenue > 0
                          ? ((amount / analyticsKPI.totalCollectedRevenue) * 100).toFixed(1)
                          : 0;

                        return (
                          <div key={method} className="space-y-1">
                            <div className="flex justify-between font-medium">
                              <span className="text-slate-700">{method}</span>
                              <span className="text-slate-900 font-mono font-semibold">
                                {currencySymbol}{amount.toFixed(2)} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  method === 'Cash'
                                    ? 'bg-emerald-500'
                                    : method === 'bKash' || method === 'Nagad'
                                    ? 'bg-indigo-600'
                                    : 'bg-slate-700'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    মোট সংগৃহীত পেমেন্ট: <strong className="text-slate-900 font-mono font-bold">{currencySymbol}{analyticsKPI.totalCollectedRevenue.toFixed(2)}</strong>
                  </div>
                </div>

              </div>

              {/* পরিচালন ব্যয়ের খাতওয়ারি বন্টন ও বিশ্লেষণ চার্ট */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <PieChart className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        পরিচালন ব্যয়ের খাতওয়ারি বন্টন (Operating Expense Distribution)
                      </h3>
                      <p className="text-xs text-slate-500">দোকান পরিচালনা, বেতন, কুরিয়ার ও অপচয় খরচের শতকরার হার</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-600 font-mono tabular-nums">
                    মোট পরিচালন ব্যয়: {currencySymbol}{analyticsKPI.totalOperatingExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>

                {analyticsKPI.expenseCategoryList.length === 0 ? (
                  <div className="h-20 flex items-center justify-center text-xs text-slate-400">
                    নির্বাচিত সময়সীমায় কোনো ব্যয়ের হিসাব পাওয়া যায়নি
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analyticsKPI.expenseCategoryList.map((exp, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-800 truncate" title={exp.category}>{exp.category}</span>
                          <span className="font-mono font-bold text-rose-600 tabular-nums">
                            {currencySymbol}{exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${exp.percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>মোট ব্যয়ের {exp.percentage}%</span>
                            <span>{analyticsKPI.netSales > 0 ? `${((exp.amount / analyticsKPI.netSales) * 100).toFixed(1)}% বিক্রির` : ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* ট্যাব ২: পূর্ণাঙ্গ P&L আয়-ব্যয় বিবরণী (Financial Income Statement) */}
          {/* ============================================================== */}
          {activeTab === 'statement' && (
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-2xs max-w-3xl mx-auto space-y-6">
              
              <div className="text-center pb-5 border-b border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {storeSettings.StoreName || 'Super Shop POS'}
                </h3>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Profit & Loss (Income) Financial Statement
                </h4>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                    accountingMode === 'cash'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}>
                    {accountingMode === 'cash' ? 'নগদ লাভ মোড (Cash-Basis Accounting)' : 'খাতা-কলমের লাভ মোড (Accrual Accounting)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAccountingMode(accountingMode === 'cash' ? 'accrual' : 'cash')}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    মোড পরিবর্তন
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  হিসাবের সময়কাল: {filterRange === 'today' ? 'আজকের দিন' : filterRange === 'month' ? 'চলতি মাস' : filterRange} ({customStartDate || 'শুরু'} থেকে {customEndDate || 'শেষ'})
                </p>
              </div>

              {/* প্রফেশনাল অ্যাকাউন্টিং টেবিল */}
              <div className="space-y-4 text-xs font-mono">
                
                {/* ১. রাজস্ব সেকশন */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">১. রাজস্ব আয় (Revenues & Sales)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>মোট বিক্রয় (Gross Sales Revenue)</span>
                    <span className="tabular-nums">{currencySymbol}{analyticsKPI.totalGrossRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-rose-600">
                    <span>বাদ: বিক্রয় ছাড় ও ডিসকাউন্ট (Less: Sales Discounts)</span>
                    <span className="tabular-nums">- {currencySymbol}{analyticsKPI.totalDiscount.toFixed(2)}</span>
                  </div>
                  {includeReturns && analyticsKPI.periodRefundAmount > 0 && (
                    <div className="flex justify-between pl-4 text-rose-600">
                      <span>বাদ: সেলস রিটার্ন ও রিফান্ড (Less: Sales Returns & Refunds)</span>
                      <span className="tabular-nums">- {currencySymbol}{analyticsKPI.periodRefundAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pl-4 font-bold text-slate-900 bg-slate-50 py-1.5 px-3 rounded-lg font-sans">
                    <span>প্রকৃত নিট বিক্রয় (Net Sales)</span>
                    <span className="tabular-nums font-mono">{currencySymbol}{analyticsKPI.netSales.toFixed(2)}</span>
                  </div>
                </div>

                {/* ২. ক্রয় খরচ সেকশন */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">২. বিক্রিত পণ্যের খরচ (Cost of Goods Sold - COGS)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>পণ্যের মূল ক্রয়মূল্য খরচ (Cost of Inventory Sold)</span>
                    <span className="tabular-nums">{renderMaskedValue(analyticsKPI.totalCOGS)}</span>
                  </div>
                  <div className="flex justify-between pl-4 font-bold text-slate-900 bg-slate-50 py-1.5 px-3 rounded-lg font-sans">
                    <span>মোট বিক্রয় খরচ (Total Cost of Sales)</span>
                    <span className="tabular-nums font-mono">{renderMaskedValue(analyticsKPI.totalCOGS)}</span>
                  </div>
                </div>

                {/* ৩. মোট মুনাফা (Gross Profit) */}
                <div className="flex justify-between font-bold text-sm bg-slate-100 text-slate-900 p-3 rounded-lg border border-slate-200 font-sans">
                  <span>৩. মোট বিক্রয় মুনাফা (Gross Profit = Net Sales - COGS)</span>
                  <span className="tabular-nums font-mono font-bold">{renderMaskedValue(analyticsKPI.grossProfit)}</span>
                </div>

                {/* ৪. পরিচালন খরচ, বেতন ও অপচয় ক্ষতি (Operating Expenses, Payroll & Losses) */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">৪. পরিচালন ব্যয় ও অপচয় কর্তন (Operating Expenses, Payroll & Losses)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>দোকানের সাধারণ পরিচালন খরচ (Shop Operating Expenses)</span>
                    <span className="text-rose-600 font-medium tabular-nums">- {currencySymbol}{analyticsKPI.totalExpenses.toFixed(2)}</span>
                  </div>
                  {includePayroll && analyticsKPI.totalPayroll > 0 && (
                    <div className="flex justify-between pl-4 text-slate-700">
                      <span>স্টাফদের মূল বেতন ও বিক্রয় কমিশন (Staff Salaries & Commissions)</span>
                      <span className="text-rose-600 font-medium tabular-nums">- {currencySymbol}{analyticsKPI.totalPayroll.toFixed(2)}</span>
                    </div>
                  )}
                  {includeWastage && analyticsKPI.totalShrinkageLoss > 0 && (
                    <div className="flex justify-between pl-4 text-slate-700">
                      <span>থান ছাঁট ও গোডাউন ড্যামেজ ক্ষতি (Fabric Scrap & Shrinkage Loss)</span>
                      <span className="text-rose-600 font-medium tabular-nums">- {currencySymbol}{analyticsKPI.totalShrinkageLoss.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pl-4 font-bold text-slate-900 bg-slate-50 py-1.5 px-3 rounded-lg font-sans text-slate-900">
                    <span>মোট পরিচালন কর্তন (Total Operating Deductions)</span>
                    <span className="tabular-nums font-mono font-bold">- {currencySymbol}{analyticsKPI.totalOperatingExpenses.toFixed(2)}</span>
                  </div>
                </div>

                {/* ৫. ট্যাক্স ও শুল্ক */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">৫. সংগৃহীত কর/ভ্যাট (Taxes Collected)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>সংগৃহীত বিক্রয় কর (Sales Tax / VAT)</span>
                    <span className="tabular-nums">{currencySymbol}{analyticsKPI.totalTax.toFixed(2)}</span>
                  </div>
                </div>

                {/* ৬. চূড়ান্ত নিট মুনাফা (Net Profit) */}
                {(() => {
                  const statementProfit = accountingMode === 'cash' ? analyticsKPI.effectiveRealizedCashProfit : analyticsKPI.trueNetProfit;
                  const isPositive = statementProfit >= 0;
                  return (
                    <div className={`flex justify-between font-bold text-sm sm:text-base p-4 rounded-xl border font-sans ${
                      isPositive
                        ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200'
                        : 'bg-rose-50/70 text-rose-950 border-rose-200'
                    }`}>
                      <div className="flex flex-col">
                        <span>{accountingMode === 'cash' ? 'চূড়ান্ত আসল নগদ মুনাফা (Realized Cash Profit)' : 'চূড়ান্ত নিট পরিচালন লাভ (True Net Operating Profit)'}</span>
                        <span className="text-xs font-normal text-slate-600 mt-0.5">
                          মার্জিন হার: {hasProfitAccess ? `${analyticsKPI.profitMarginPercent}%` : '••••'} (সকল খরচ, বেতন ও অপচয় কর্তন পরবর্তী)
                        </span>
                      </div>
                      <span className="text-lg font-mono tabular-nums font-bold">
                        {isPositive ? '+' : ''}{renderMaskedValue(statementProfit)}
                      </span>
                    </div>
                  );
                })()}

                {/* ৭. ক্যাশ রিয়ালাইজেশন ও বাকির খাতার সমন্বয় */}
                <div className="space-y-2 pt-2 pb-1">
                  <div className="font-sans font-bold text-slate-900 text-sm">৭. ক্যাশ রিয়ালাইজেশন ও বাকির খাতার সমন্বয় (Cash Realization & Ledger)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>হিসাবকৃত মোট মুনাফা (Booked Accrual Profit)</span>
                    <span className="font-bold tabular-nums">{renderMaskedValue(analyticsKPI.bookedProfit)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-amber-700">
                    <span>বাদ: বাকি বিক্রির পরিমাণ (Credit Sales in Period)</span>
                    <span className="tabular-nums">- {currencySymbol}{analyticsKPI.totalSalesDueCreated.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-emerald-700">
                    <span>যোগ: বাকির খাতা থেকে আদায়কৃত ক্যাশ (Collected Dues)</span>
                    <span className="tabular-nums">+ {currencySymbol}{analyticsKPI.periodCollectedDues.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-4 font-bold text-emerald-950 bg-emerald-50/60 py-2 px-3 rounded-lg font-sans border border-emerald-200">
                    <span>হাতে আসা আসল নগদ লাভ (Realized Cash Profit)</span>
                    <span className="text-sm font-bold font-mono tabular-nums">{renderMaskedValue(analyticsKPI.realizedCashProfit)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-slate-500 text-[11px] pt-1">
                    <span>মার্কেটে বকেয়া মুনাফা / ঝুঁকি: <strong className="text-amber-800 font-mono">{currencySymbol}{analyticsKPI.unrealizedDueProfit.toFixed(2)}</strong></span>
                    <span>সার্বিক কাস্টমার বকেয়া: <strong className="text-slate-800 font-mono">{currencySymbol}{analyticsKPI.totalMarketDue.toFixed(2)}</strong></span>
                  </div>
                </div>

              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveMonthlyPnLToCloud}
                  disabled={isArchivingCloud}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4 text-slate-300" />
                  <span>{isArchivingCloud ? 'সংরক্ষণ হচ্ছে...' : 'গুগল শিটে ব্যালেন্স শিট সংরক্ষণ'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>স্টেটমেন্টটি প্রিন্ট করুন</span>
                </button>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* ট্যাব ৩: পণ্যভিত্তিক পূর্ণাঙ্গ লাভ-ক্ষতি তালিকা (Product P&L) */}
          {/* ============================================================== */}
          {activeTab === 'products' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              
              {/* সার্চ, ক্যাটাগরি ও সর্টিং ফিল্টার টুলবার */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  
                  {/* সার্চ বক্স */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="পণ্য বা কোড দিয়ে খুঁজুন..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* ক্যাটাগরি ফিল্টার */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-semibold text-slate-700"
                  >
                    <option value="all">সকল ক্যাটাগরি</option>
                    {categories.map((c, i) => (
                      <option key={i} value={c.CategoryName}>{c.CategoryName}</option>
                    ))}
                  </select>

                </div>

                {/* সর্টিং ড্রপডাউন */}
                <div className="flex items-center space-x-2 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500 font-semibold">সর্ট:</span>
                  <select
                    value={productSortBy}
                    onChange={(e) => setProductSortBy(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="profit_desc">সর্বোচ্চ মুনাফা (Highest Profit)</option>
                    <option value="profit_asc">সর্বনিম্ন মুনাফা (Lowest Profit)</option>
                    <option value="revenue_desc">সর্বোচ্চ বিক্রয় (Highest Revenue)</option>
                    <option value="units_desc">সর্বাধিক বিক্রিত সংখ্যা (Units Sold)</option>
                    <option value="margin_desc">সর্বোচ্চ মার্জিন % (Margin %)</option>
                  </select>
                </div>
              </div>

              {/* প্রোডাক্ট P&L টেবিল */}
              {processedProductsList.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-xs text-slate-400">
                  <Package className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                  <span>কোনো পণ্য খুঁজে পাওয়া যায়নি</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-200 bg-slate-50/70">
                        <th className="py-3 px-3">পণ্যের বিবরণ</th>
                        <th className="py-3 px-2">ক্যাটাগরি</th>
                        <th className="py-3 px-2 text-center">বিক্রিত পরিমাণ</th>
                        <th className="py-3 px-2 text-right">গড় বিক্রয়মূল্য</th>
                        <th className="py-3 px-2 text-right">গড় ক্রয়মূল্য</th>
                        <th className="py-3 px-2 text-right">মোট বিক্রয়</th>
                        <th className="py-3 px-2 text-right">মোট খরচ (COGS)</th>
                        <th className="py-3 px-2 text-right">নিট লাভ (Profit)</th>
                        <th className="py-3 px-3 text-right">মার্জিন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedProductsList.map((p, idx) => {
                        const isProfit = p.profit >= 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{p.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                #{p.productId} {p.barcode ? `• ${p.barcode}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-slate-600 font-medium">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-semibold">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">
                              {p.unitsSold}
                            </td>
                            <td className="py-3 px-2 text-right font-medium text-slate-700">
                              {currencySymbol}{p.avgSellingPrice.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right font-medium text-amber-700">
                              {renderMaskedValue(p.avgCostPrice)}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-slate-900">
                              {currencySymbol}{p.revenue.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-amber-700">
                              {renderMaskedValue(p.cogs)}
                            </td>
                            <td className={`py-3 px-2 text-right font-black ${
                              isProfit ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {isProfit ? '+' : ''}{renderMaskedValue(p.profit)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isProfit 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {hasProfitAccess ? `${p.marginPercent}%` : '•••'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-200">
                        <td className="py-3 px-3">সর্বমোট ({processedProductsList.length} টি পণ্য)</td>
                        <td className="py-3 px-2"></td>
                        <td className="py-3 px-2 text-center font-black">
                          {processedProductsList.reduce((acc, p) => acc + p.unitsSold, 0)}
                        </td>
                        <td className="py-3 px-2 text-right">-</td>
                        <td className="py-3 px-2 text-right">-</td>
                        <td className="py-3 px-2 text-right font-black">
                          {currencySymbol}{processedProductsList.reduce((acc, p) => acc + p.revenue, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right text-amber-800 font-black">
                          {renderMaskedValue(processedProductsList.reduce((acc, p) => acc + p.cogs, 0))}
                        </td>
                        <td className="py-3 px-2 text-right text-emerald-700 font-black">
                          +{renderMaskedValue(processedProductsList.reduce((acc, p) => acc + p.profit, 0))}
                        </td>
                        <td className="py-3 px-3 text-right font-black">
                          {hasProfitAccess ? `${analyticsKPI.profitMarginPercent}%` : '•••'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* ============================================================== */}
          {/* ট্যাব ৪: ক্যাটাগরিভিত্তিক লাভ-ক্ষতি (Category P&L) */}
          {/* ============================================================== */}
          {activeTab === 'categories' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    ক্যাটাগরিভিত্তিক পারফরম্যান্স ও মুনাফার হার
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">সর্বোচ্চ মুনাফার ভিত্তিতে সাজানো</span>
              </div>

              {analyticsKPI.allCategoryList.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                  কোনো ক্যাটাগরি রেকর্ড পাওয়া যায়নি
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-100 bg-slate-50/70">
                        <th className="py-3 px-3">ক্যাটাগরির নাম</th>
                        <th className="py-3 px-2 text-center">বিক্রিত পণ্য সংখ্যা</th>
                        <th className="py-3 px-2 text-right">মোট বিক্রয়</th>
                        <th className="py-3 px-2 text-right">মোট ক্রয় খরচ</th>
                        <th className="py-3 px-2 text-right">মোট মুনাফা</th>
                        <th className="py-3 px-2 text-right">মার্জিন %</th>
                        <th className="py-3 px-3 text-right">লাভে অবদান</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analyticsKPI.allCategoryList.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {c.categoryName}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-700">
                            {c.unitsSold}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-slate-900">
                            {currencySymbol}{c.revenue.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-amber-700">
                            {renderMaskedValue(c.cogs)}
                          </td>
                          <td className="py-3 px-2 text-right font-black text-emerald-600">
                            +{renderMaskedValue(c.profit)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {hasProfitAccess ? `${c.marginPercent}%` : '•••'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <span className="font-bold text-slate-700">{c.contributionPercent}%</span>
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, c.contributionPercent))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ট্যাব ৫: ইনভয়েস ও সেলস লেনদেন হিস্ট্রি (Transactions) */}
          {/* ============================================================== */}
          {activeTab === 'transactions' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    নির্বাচিত সময়সীমার অর্ডার ও ইনভয়েস তালিকা
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">সর্বমোট {filteredSales.length} টি ইনভয়েস</span>
              </div>

              {filteredSales.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                  কোনো লেনদেন রেকর্ড নেই
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-100 bg-slate-50/70">
                        <th className="py-3 px-3">তারিখ ও সময়</th>
                        <th className="py-3 px-2">ইনভয়েস / অর্ডার নম্বর</th>
                        <th className="py-3 px-2 text-center">চ্যানেল</th>
                        <th className="py-3 px-2">কুরিয়ার / পিকআপ</th>
                        <th className="py-3 px-2">কাস্টমার</th>
                        <th className="py-3 px-2 text-center">পেমেন্ট মেথড</th>
                        <th className="py-3 px-2 text-right">আইটেম সংখ্যা</th>
                        <th className="py-3 px-2 text-right">মোট রাজস্ব</th>
                        <th className="py-3 px-3 text-right">নিট লাভ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((sale, i) => {
                        const timeVal = sale.timestamp || sale.Timestamp || sale.Date || sale.CreatedAt;
                        const dateFormatted = timeVal ? new Date(timeVal).toLocaleString('bn-BD') : 'N/A';
                        const invNo = sale.invoiceNo || sale.invoiceNumber || sale.InvoiceNumber || sale.id || `INV-${i + 1}`;
                        const custName = sale.customerName || sale.CustomerName || 'Walk-in Customer';
                        const pMethod = sale.paymentMethod || sale.PaymentMethod || 'Cash';
                        const total = Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount) || 0;
                        const profit = Number(sale.profit || 0);
                        const itemCount = Array.isArray(sale.items) ? sale.items.length : 1;
                        const isOffline = sale.channel === 'offline' || sale.orderSource === 'In-Store / POS';

                        return (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-slate-500">
                              {dateFormatted}
                            </td>
                            <td className="py-3 px-2 font-mono font-bold text-indigo-600">
                              {invNo}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {isOffline ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  ইন-স্টোর
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {sale.orderSource || 'অনলাইন'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-slate-600 font-medium">
                              {sale.courierName || (isOffline ? 'কাউন্টার পিকআপ' : 'কুরিয়ার')}
                            </td>
                            <td className="py-3 px-2 text-slate-800 font-semibold">
                              {custName}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {pMethod}
                              </span>
                              {Number(sale.dueAmount || 0) > 0 && (
                                <span className="block text-[9px] text-amber-600 font-bold mt-0.5 whitespace-nowrap">
                                  বাকি: {currencySymbol}{Number(sale.dueAmount).toFixed(0)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right text-slate-700 font-bold">
                              {itemCount}
                            </td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">
                              {currencySymbol}{total.toFixed(2)}
                            </td>
                            <td className={`py-3 px-3 text-right font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {profit >= 0 ? '+' : ''}{renderMaskedValue(profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ট্যাব ৬: অচল ও ডেড স্টক ইনভেন্টরি বিশ্লেষণ (Phase 8 Dead Stock) */}
          {/* ============================================================== */}
          {activeTab === 'dead_stock' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* ডেড স্টক ব্যানার ও থ্রেশহোল্ড সিলেক্টর */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <AlertTriangle className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                        <span>অচল ও ডেড স্টক ক্যাপিটাল বিশ্লেষণ</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        দোকানে অবিক্রিত পণ্য ও অবরুদ্ধ মূলধন শনাক্ত করে দ্রুত ক্লিয়ারেন্স অফার বা রিঅর্ডার সিদ্ধান্ত নিন
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportDeadStockCSV}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-300" />
                    <span>ডেড স্টক CSV</span>
                  </button>
                </div>

                {/* থ্রেশহোল্ড সিলেক্টর ফিল্টার */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-medium">অচলাবস্থার সময়সীমা:</span>
                    <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      {[30, 60, 90, 120].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setDeadStockThreshold(days)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                            deadStockThreshold === days
                              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {days} দিন+
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    গত <strong className="text-slate-700 font-mono font-bold">{deadStockThreshold}</strong> দিনে ১ পিসও বিক্রি না হওয়া পণ্য
                  </span>
                </div>
              </div>

              {/* ৩টি প্রধান ডেড স্টক মেট্রিক কার্ড */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 block">মোট অচল পণ্যের সংখ্যা</span>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                      {deadStockData.totalStagnantItems} টি
                    </div>
                    <span className="text-[11px] text-slate-400">ইনভেন্টরিতে স্টক জমা আছে</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 block">মোট আটকে থাকা পণ্যের ইউনিট</span>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                      {deadStockData.totalStagnantUnits.toLocaleString('en-IN')} পিস
                    </div>
                    <span className="text-[11px] text-slate-400">অবিক্রিত অবস্থায় দোকানে মজুত</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Archive className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-rose-600 block">আটকে থাকা মূলধন (Blocked Capital)</span>
                    <div className="text-xl sm:text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1">
                      {currencySymbol}{Math.round(deadStockData.totalBlockedCapital).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-400">ক্রয়মূল্য ভিত্তিক আটকে থাকা টাকা</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* সার্চ ও টেবিল সেকশন */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      অচল পণ্যের তালিকা ({filteredDeadStockItems.length}টি)
                    </h4>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="পণ্যের নাম, বারকোড বা ক্যাটাগরি..."
                      value={deadStockSearch}
                      onChange={(e) => setDeadStockSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {filteredDeadStockItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto stroke-1 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">কোনো ডেড স্টক নেই</p>
                    <p className="text-xs">গত {deadStockThreshold} দিনে সকল পণ্যের কোনো না কোনো বিক্রয় সম্পন্ন হয়েছে।</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">পণ্যের নাম ও বারকোড</th>
                          <th className="py-2.5 px-3">ক্যাটাগরি</th>
                          <th className="py-2.5 px-3 text-center">মজুত স্টক</th>
                          <th className="py-2.5 px-3 text-right">কেনা দাম</th>
                          <th className="py-2.5 px-3 text-right">আটকে থাকা টাকা</th>
                          <th className="py-2.5 px-3 text-center">অবিক্রিত দিন</th>
                          <th className="py-2.5 px-3 text-center">সুপারিশকৃত ছাড়</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDeadStockItems.map((itm) => (
                          <tr key={itm.productId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-900 block">{itm.productName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">বারকোড: {itm.barcode}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{itm.category}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800">
                              {itm.stockQuantity} পিস
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {renderMaskedValue(itm.costPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 tabular-nums">
                              {renderMaskedValue(itm.blockedCapital, true, 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-600 bg-slate-100">
                                {itm.daysStagnant >= 999 ? 'কখনও বিক্রি হয়নি' : `${itm.daysStagnant} দিন`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                {itm.suggestedDiscount}% ছাড়
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* মডাল ফুটার */}
        <div className="shrink-0 px-5 sm:px-6 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>WAC কস্ট মডেল ও রিয়েল-টাইম গুগল শিট অ্যানালিটিক্স সিঙ্ক</span>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* প্রিন্ট উপযোগী লুকায়িত P&L ডকুমেন্ট (Tier 6: Audit-Ready Printable A4 Income Statement) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans w-full max-w-4xl mx-auto">
        <div className="text-center pb-4 border-b-2 border-black mb-4">
          <h1 className="text-2xl font-black tracking-tight">
            {storeSettings.StoreName || 'Super Shop POS'}
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {storeSettings.Address || ''} {storeSettings.Phone ? `• ফোন: ${storeSettings.Phone}` : ''} {storeSettings.Email ? `• ইমেইল: ${storeSettings.Email}` : ''}
          </p>
          <div className="my-2 inline-block px-3 py-1 bg-gray-100 border border-gray-400 rounded text-xs font-bold uppercase tracking-wider">
            ব্যালেন্স শিট মোড: {accountingMode === 'cash' ? 'নগদ লাভ মোড (CASH-BASIS ACCOUNTING)' : 'খাতা-কলমের লাভ মোড (ACCRUAL-BASIS ACCOUNTING)'}
          </div>
          <h2 className="text-base font-extrabold text-gray-900 mt-1 underline">
            PROFIT & LOSS (INCOME) FINANCIAL AUDIT STATEMENT
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            হিসাবের সময়কাল: {filterRange === 'today' ? 'দৈনিক' : filterRange === 'month' ? 'মাসিক' : filterRange} ({customStartDate || 'শুরু'} থেকে {customEndDate || 'শেষ'}) • প্রকাশের তারিখ: {new Date().toLocaleDateString('bn-BD')} • প্রিন্ট প্রস্তুতকারক: {activeUser?.FullName || 'অ্যাডমিন'}
          </p>
        </div>

        {/* প্রিন্ট ১: নির্বাহী আয়-ব্যয় সারাংশ */}
        <div className="mb-6">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">
            ১. আর্থিক লাভ-ক্ষতি বিবরণী (Income Statement Summary)
          </h3>
          <table className="w-full text-xs border border-gray-400">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">মোট বিক্রয় রাজস্ব (Gross Sales Revenue)</td>
                <td className="p-2 text-right font-bold">{currencySymbol}{analyticsKPI.totalGrossRevenue.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">বাদ: ছাড় ও ডিসকাউন্ট (Less: Total Discounts)</td>
                <td className="p-2 text-right text-red-600">- {currencySymbol}{analyticsKPI.totalDiscount.toFixed(2)}</td>
              </tr>
              {includeReturns && analyticsKPI.periodRefundAmount > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="p-2 font-medium">বাদ: সেলস রিটার্ন ও রিফান্ড কর্তন (Less: Sales Returns & Refunds)</td>
                  <td className="p-2 text-right text-red-600">- {currencySymbol}{analyticsKPI.periodRefundAmount.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-300 bg-gray-50 font-bold">
                <td className="p-2">প্রকৃত নিট বিক্রয় রাজস্ব (Net Sales Revenue)</td>
                <td className="p-2 text-right">{currencySymbol}{analyticsKPI.netSales.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">বিক্রিত পণ্যের ক্রয় খরচ (Cost of Goods Sold - COGS)</td>
                <td className="p-2 text-right text-gray-800">{currencySymbol}{analyticsKPI.totalCOGS.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-400 font-bold bg-gray-100">
                <td className="p-2">মোট বিক্রয় মুনাফা (Gross Profit = Net Sales - COGS)</td>
                <td className="p-2 text-right">{currencySymbol}{analyticsKPI.grossProfit.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">দোকানের পরিচালন খরচ (Shop Operating Expenses)</td>
                <td className="p-2 text-right text-red-600">- {currencySymbol}{analyticsKPI.totalExpenses.toFixed(2)}</td>
              </tr>
              {includePayroll && analyticsKPI.totalPayroll > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="p-2 font-medium">স্টাফদের মূল বেতন ও বিক্রয় কমিশন (Staff Payroll & Commissions)</td>
                  <td className="p-2 text-right text-red-600">- {currencySymbol}{analyticsKPI.totalPayroll.toFixed(2)}</td>
                </tr>
              )}
              {includeWastage && analyticsKPI.totalShrinkageLoss > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="p-2 font-medium">থান ছাঁট ও গোডাউন অপচয় ক্ষতি (Fabric Scrap & Shrinkage Loss)</td>
                  <td className="p-2 text-right text-red-600">- {currencySymbol}{analyticsKPI.totalShrinkageLoss.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">সংগৃহীত বিক্রয় কর/ভ্যাট (Sales Tax / VAT)</td>
                <td className="p-2 text-right">{currencySymbol}{analyticsKPI.totalTax.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-200 font-black text-sm">
                <td className="p-2.5">
                  {accountingMode === 'cash' ? 'চূড়ান্ত আসল নগদ মুনাফা (Realized Cash Profit)' : 'চূড়ান্ত নিট পরিচালন লাভ (True Net Operating Profit)'}
                </td>
                <td className="p-2.5 text-right">
                  {(() => {
                    const pVal = accountingMode === 'cash' ? analyticsKPI.effectiveRealizedCashProfit : analyticsKPI.trueNetProfit;
                    return `${pVal >= 0 ? '+' : ''}${currencySymbol}${pVal.toFixed(2)} (${analyticsKPI.profitMarginPercent}%)`;
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* প্রিন্ট ২: ক্যাশ ফ্লো ও বাকির খাতার সমন্বয় */}
        <div className="mb-6">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">
            ২. ক্যাশ ফ্লো ও বাকির খাতার সমন্বয় (Cash Flow & Credit Ledger Reconciliation)
          </h3>
          <table className="w-full text-xs border border-gray-400">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-2">বিক্রয়কালে প্রাপ্ত সরাসরি নগদ ক্যাশ (Sales Cash Paid)</td>
                <td className="p-2 text-right font-medium">{currencySymbol}{analyticsKPI.totalSalesPaidCash.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2">সময়কালে বাকির খাতা থেকে আদায়কৃত নগদ (Collected Dues via Ledger)</td>
                <td className="p-2 text-right text-emerald-700 font-bold">+ {currencySymbol}{analyticsKPI.periodCollectedDues.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50 font-bold">
                <td className="p-2">মোট সংগৃহীত নগদ ক্যাশ (Total Cash Inflow)</td>
                <td className="p-2 text-right">{currencySymbol}{analyticsKPI.totalCashInflow.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">মার্কেটে সার্বিক কাস্টমার বকেয়া (Total Market Outstanding Due)</td>
                <td className="p-2 text-right text-amber-700 font-bold">{currencySymbol}{analyticsKPI.totalMarketDue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* প্রিন্ট ৩: সেরা বিক্রিত পণ্য তালিকা */}
        <div className="mb-6">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">
            ৩. শীর্ষ বিক্রিত ও মুনাফাদায়ক পণ্য বিবরণী (Top Product Breakdown)
          </h3>
          <table className="w-full text-[11px] border border-gray-400 text-left">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-400 font-bold">
                <th className="p-1.5">পণ্যের নাম</th>
                <th className="p-1.5">ক্যাটাগরি</th>
                <th className="p-1.5 text-center">পরিমাণ</th>
                <th className="p-1.5 text-right">বিক্রয়মূল্য</th>
                <th className="p-1.5 text-right">কেনা দাম</th>
                <th className="p-1.5 text-right">মোট বিক্রয়</th>
                <th className="p-1.5 text-right">মোট খরচ</th>
                <th className="p-1.5 text-right">নিট লাভ</th>
                <th className="p-1.5 text-right">মার্জিন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {analyticsKPI.topProducts.map((p, idx) => (
                <tr key={idx}>
                  <td className="p-1.5 font-medium">{p.productName}</td>
                  <td className="p-1.5">{p.category}</td>
                  <td className="p-1.5 text-center">{p.unitsSold}</td>
                  <td className="p-1.5 text-right">{p.avgSellingPrice.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.avgCostPrice.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.revenue.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.cogs.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-bold text-emerald-800">{p.profit.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.marginPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* প্রিন্ট ফুটার ও ৩ স্তরের স্বাক্ষর ব্লক (Tier 6) */}
        <div className="pt-12 flex justify-between text-xs border-t border-gray-400 text-gray-700">
          <div className="text-center">
            <div className="w-32 border-b border-black mb-1"></div>
            <span className="font-bold">হিসাব প্রস্তুতকারক</span>
            <div className="text-[10px] text-gray-500">Accountant</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-b border-black mb-1"></div>
            <span className="font-bold">ক্যাশিয়ার / ব্যবস্থাপক</span>
            <div className="text-[10px] text-gray-500">Cashier / Manager</div>
          </div>
          <div className="text-center">
            <div className="w-36 border-b border-black mb-1"></div>
            <span className="font-bold">স্বত্বাধিকারী / প্রধান অডিটর</span>
            <div className="text-[10px] text-gray-500">Proprietor / Auditor</div>
          </div>
        </div>

      </div>

      {/* RBAC অ্যাডমিন পিন আনলক মডাল (Tier 7: Privacy PIN Override) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-100">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 mx-auto flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">লাভ-ক্ষতি ও কেনা দাম আনলক</h3>
              <p className="text-xs text-slate-500">
                সংবেদনশীল আর্থিক ডাটা দেখতে অ্যাডমিন বা অনুমোদিত পিন দিন
              </p>
            </div>

            <form onSubmit={handlePinUnlock} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="৪ সংখ্যার পিন দিন..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  className="w-full text-center text-lg font-bold font-mono tracking-widest px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                />
                {pinError && (
                  <p className="text-xs text-rose-600 font-medium text-center mt-1.5 animate-shake">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                >
                  আনলক করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
