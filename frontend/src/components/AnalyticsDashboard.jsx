import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
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
  PieChart,
  Download,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Coins,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function AnalyticsDashboard({
  isOpen,
  onClose,
  salesHistory = [],
  products = [],
  categories = [],
  currencySymbol = '৳',
  storeSettings = {},
  onRefreshSales
}) {
  // ফিল্টার রেঞ্জ স্টেট
  const [filterRange, setFilterRange] = useState('month'); // 'today' | 'yesterday' | '7days' | 'month' | 'lastMonth' | 'year' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // অ্যাক্টিভ ভিউ ট্যাব: 'overview' | 'statement' | 'products' | 'categories' | 'transactions'
  const [activeTab, setActiveTab] = useState('overview');

  // প্রোডাক্টস টেবিল সার্চ ও সর্টিং
  const [productSearch, setProductSearch] = useState('');
  const [productSortBy, setProductSortBy] = useState('profit_desc'); // 'profit_desc' | 'profit_asc' | 'revenue_desc' | 'units_desc' | 'margin_desc'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // রিফ্রেশ লোডিং স্টেট
  const [isRefreshing, setIsRefreshing] = useState(false);

  // চার্ট টুলটিপ ইন্টারঅ্যাকশন স্টেট
  const [hoveredTrendItem, setHoveredTrendItem] = useState(null);

  // ১. নির্বাচিত তারিখ অনুযায়ী সেলস ডাটা ফিল্টার করা
  const filteredSales = useMemo(() => {
    const list = Array.isArray(salesHistory) ? salesHistory : [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // গতকালের তারিখ
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // বিগত ৭ দিন
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // গত মাস
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

    return list.filter((sale) => {
      const timeVal = sale.timestamp || sale.Timestamp || sale.Date || sale.CreatedAt;
      if (!timeVal) return true;

      const saleDate = new Date(timeVal);
      if (isNaN(saleDate.getTime())) return true;

      const saleDateStr = saleDate.toISOString().split('T')[0];

      if (filterRange === 'today') {
        return saleDateStr === todayStr;
      }
      if (filterRange === 'yesterday') {
        return saleDateStr === yesterdayStr;
      }
      if (filterRange === '7days') {
        return saleDate >= sevenDaysAgo && saleDate <= now;
      }
      if (filterRange === 'month') {
        return saleDate.getFullYear() === now.getFullYear() && saleDate.getMonth() === now.getMonth();
      }
      if (filterRange === 'lastMonth') {
        return saleDate.getFullYear() === lastMonthYear && saleDate.getMonth() === lastMonthIdx;
      }
      if (filterRange === 'year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      if (filterRange === 'all') {
        return true;
      }
      if (filterRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate) : new Date('2000-01-01');
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date('2099-12-31');
        return saleDate >= start && saleDate <= end;
      }
      return true;
    });
  }, [salesHistory, filterRange, customStartDate, customEndDate]);

  // ২. পূর্ণাঙ্গ P&L মেট্রিক্স, আইটেম-ওয়াইজ ও ক্যাটাগরি-ওয়াইজ বিশ্লেষণ
  const analyticsKPI = useMemo(() => {
    let totalGrossRevenue = 0; // মোট বিক্রয় (ডিসকাউন্ট ও ট্যাক্স পূর্ববর্তী)
    let totalCollectedRevenue = 0; // মোট ইনভয়েস টাকা (GrandTotal)
    let totalCOGS = 0; // বিক্রিত পণ্যের মূল খরচ
    let totalUnitsSold = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const productSalesMap = {};
    const categorySalesMap = {};
    const paymentMap = { Cash: 0, Card: 0, bKash: 0, Nagad: 0, Bank: 0, Other: 0 };
    const dateTrendMap = {}; // দিনভিত্তিক বা সময়ভিত্তিক বিক্রয় ও লাভ

    filteredSales.forEach((sale) => {
      const gTotal = Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount) || 0;
      const sDiscount = Number(sale.discountAmount || sale.DiscountAmount) || 0;
      const sTax = Number(sale.taxAmount || sale.TaxAmount) || 0;
      const timeVal = sale.timestamp || sale.Timestamp || sale.Date || sale.CreatedAt;
      const saleDateStr = timeVal ? new Date(timeVal).toISOString().split('T')[0] : 'Unknown';

      totalCollectedRevenue += gTotal;
      totalDiscount += sDiscount;
      totalTax += sTax;

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
        try { itemsList = JSON.parse(sale.items); } catch (e) { itemsList = []; }
      } else if (typeof sale.ItemsJSON === 'string') {
        try { itemsList = JSON.parse(sale.ItemsJSON); } catch (e) { itemsList = []; }
      } else if (Array.isArray(sale.Items)) {
        itemsList = sale.Items;
      }

      let orderItemCostSum = 0;

      itemsList.forEach((item) => {
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
    });

    // ট্যাক্স ছাড়া প্রকৃত নেট বিক্রয় (Net Sales)
    const netSales = Math.max(0, totalCollectedRevenue - totalTax);
    
    // নিট মুনাফা (Net Profit = Net Sales - COGS)
    const netProfit = netSales - totalCOGS;

    // নিট মার্জিন শতকরা হার
    const profitMarginPercent = netSales > 0 
      ? parseFloat(((netProfit / netSales) * 100).toFixed(1)) 
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
      const contribution = netProfit > 0 ? parseFloat(((c.profit / netProfit) * 100).toFixed(1)) : 0;
      return {
        ...c,
        marginPercent: margin,
        contributionPercent: contribution
      };
    }).sort((a, b) => b.profit - a.profit);

    // দৈনিক ট্রেন্ড সাজানো
    const dailyTrendList = Object.values(dateTrendMap)
      .filter((t) => t.date !== 'Unknown')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // সেরা ৫ পণ্য (টপ পারফর্মার)
    const topProducts = [...allProductList].sort((a, b) => b.profit - a.profit).slice(0, 5);

    return {
      totalOrders: filteredSales.length,
      totalGrossRevenue,
      totalCollectedRevenue,
      netSales,
      totalCOGS,
      totalTax,
      totalDiscount,
      netProfit,
      profitMarginPercent,
      totalUnitsSold,
      averageOrderValue,
      topProducts,
      allProductList,
      allCategoryList,
      paymentMap,
      dailyTrendList
    };
  }, [filteredSales, products]);

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

  // CSV / Excel ডাউনলোড হ্যান্ডলার (UTF-8 BOM সহ)
  const handleExportCSV = () => {
    try {
      let csvContent = '\uFEFF'; // Excel UTF-8 BOM

      // হেডার সেকশন
      csvContent += `PROFIT & LOSS (P&L) FINANCIAL REPORT\n`;
      csvContent += `প্রতিষ্ঠানের নাম,${storeSettings.StoreName || 'Super Shop POS'}\n`;
      csvContent += `প্রতিবেদনের সময়কাল,${filterRange} (${customStartDate || 'Start'} to ${customEndDate || 'End'})\n`;
      csvContent += `রিপোর্ট তৈরির তারিখ,${new Date().toLocaleString('bn-BD')}\n\n`;

      // এক্সিকিউটিভ সামারি
      csvContent += `১. আর্থিক সারসংক্ষেপ (EXECUTIVE FINANCIAL SUMMARY)\n`;
      csvContent += `মেট্রিক,পরিমাণ (${currencySymbol})\n`;
      csvContent += `মোট বিক্রয় (Gross Revenue),${analyticsKPI.totalGrossRevenue.toFixed(2)}\n`;
      csvContent += `প্রদত্ত ছাড় (Total Discounts),${analyticsKPI.totalDiscount.toFixed(2)}\n`;
      csvContent += `সংগৃহীত কর/ভ্যাট (Taxes),${analyticsKPI.totalTax.toFixed(2)}\n`;
      csvContent += `প্রকৃত বিক্রয় (Net Sales),${analyticsKPI.netSales.toFixed(2)}\n`;
      csvContent += `বিক্রিত পণ্যের ক্রয়মূল্য (COGS),${analyticsKPI.totalCOGS.toFixed(2)}\n`;
      csvContent += `নিট লাভ/ক্ষতি (Net Profit),${analyticsKPI.netProfit.toFixed(2)}\n`;
      csvContent += `মুনাফার মার্জিন হার (Profit Margin %),${analyticsKPI.profitMarginPercent}%\n`;
      csvContent += `মোট সম্পন্ন অর্ডার,${analyticsKPI.totalOrders}\n`;
      csvContent += `মোট বিক্রিত ইউনিট,${analyticsKPI.totalUnitsSold}\n`;
      csvContent += `গড় অর্ডার মূল্য (AOV),${analyticsKPI.averageOrderValue.toFixed(2)}\n\n`;

      // পণ্যভিত্তিক লাভ-ক্ষতি তালিকা
      csvContent += `২. পণ্যভিত্তিক লাভ-ক্ষতি বিবরণী (PRODUCT-WISE P&L BREAKDOWN)\n`;
      csvContent += `Product ID,পণ্য,ক্যাটাগরি,বিক্রিত পরিমাণ,গড় বিক্রয়মূল্য,গড় কেনা দাম,মোট রাজস্ব,মোট ক্রয় খরচ,নিট লাভ,মার্জিন %\n`;
      analyticsKPI.allProductList.forEach((p) => {
        csvContent += `"${p.productId}","${p.productName.replace(/"/g, '""')}","${p.category}",${p.unitsSold},${p.avgSellingPrice},${p.avgCostPrice},${p.revenue.toFixed(2)},${p.cogs.toFixed(2)},${p.profit.toFixed(2)},${p.marginPercent}%\n`;
      });
      csvContent += `\n`;

      // ক্যাটাগরিভিত্তিক বিবরণী
      csvContent += `৩. ক্যাটাগরিভিত্তিক লাভ-ক্ষতি (CATEGORY-WISE P&L)\n`;
      csvContent += `ক্যাটাগরি,বিক্রিত আইটেম,মোট রাজস্ব,মোট খরচ,মোট লাভ,মার্জিন %,লাভে অবদান %\n`;
      analyticsKPI.allCategoryList.forEach((c) => {
        csvContent += `"${c.categoryName}",${c.unitsSold},${c.revenue.toFixed(2)},${c.cogs.toFixed(2)},${c.profit.toFixed(2)},${c.marginPercent}%,${c.contributionPercent}%\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `PnL_Financial_Report_${filterRange}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(`CSV তৈরি ব্যর্থ হয়েছে: ${err.message}`);
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 sm:py-5 animate-in fade-in duration-200">
      
      {/* প্রধান ড্যাশবোর্ড উইন্ডো (Screen Only - No Print) */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-7xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200 no-print">
        
        {/* ড্যাশবোর্ড হেডার ও দ্রুত অ্যাকশন বার */}
        <div className="shrink-0 px-5 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/50 select-none">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 ring-4 ring-indigo-500/10">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  Profit & Loss (P&L) Analytics Reporting
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 shrink-0">
                  WAC Cost Model • লাইভ অডিট
                </span>
              </div>
              <p className="text-xs text-slate-300/90 mt-0.5 truncate">
                ক্রয়মূল্য ও বিক্রয়মূল্যের ভিত্তিতে স্বচ্ছ লাভ-ক্ষতি, মার্জিন ও ফাইন্যান্সিয়াল পারফরম্যান্স
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
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/80 disabled:opacity-50 active:scale-95 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'সিঙ্ক হচ্ছে...' : 'ক্লাউড সিঙ্ক'}</span>
              </button>
            )}

            {/* CSV এক্সপোর্ট বাটন */}
            <button
              onClick={handleExportCSV}
              title="সম্পূর্ণ রিপোর্ট এক্সেল/CSV ফাইলে ডাউনলোড করুন"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV এক্সপোর্ট</span>
            </button>

            {/* প্রিন্ট বাটন */}
            <button
              onClick={handlePrint}
              title="প্রফেশনাল P&L বিবরণী প্রিন্ট করুন"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট স্টেটমেন্ট</span>
            </button>

            {/* ক্লোজ বাটন */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 ml-1"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ফিল্টার ও সময়সীমা কন্ট্রোল বার */}
        <div className="shrink-0 px-5 sm:px-8 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
          
          {/* দ্রুত সময় ফিল্টার বাটন */}
          <div className="flex flex-wrap items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            {[
              { id: 'today', label: 'আজ' },
              { id: 'yesterday', label: 'গতকাল' },
              { id: '7days', label: 'বিগত ৭ দিন' },
              { id: 'month', label: 'চলতি মাস' },
              { id: 'lastMonth', label: 'গত মাস' },
              { id: 'year', label: 'চলতি বছর' },
              { id: 'all', label: 'সকল সময়' },
              { id: 'custom', label: 'কাস্টম' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterRange(f.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                  filterRange === f.id
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* কাস্টম তারিখ নির্বাচন বার */}
          {filterRange === 'custom' && (
            <div className="flex items-center space-x-2 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs animate-in fade-in duration-150">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-slate-400 font-medium">থেকে</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {/* রেকর্ড কাউন্টার ব্যাজ */}
          <div className="flex items-center space-x-2.5 text-xs text-slate-500 font-medium">
            <span>
              অর্ডার: <strong className="text-slate-800 font-bold">{analyticsKPI.totalOrders}</strong> টি
            </span>
            <span>•</span>
            <span>
              বিক্রিত পণ্য: <strong className="text-slate-800 font-bold">{analyticsKPI.totalUnitsSold}</strong> টি
            </span>
          </div>

        </div>

        {/* ৫টি প্রধান আর্থিক KPI স্ট্রিপ কার্ড (Executive Financial KPIs) */}
        <div className="shrink-0 px-5 sm:px-8 pt-3 pb-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            
            {/* KPI ১: মোট বিক্রয় (Gross Revenue) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>মোট রাজস্ব</span>
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {currencySymbol}{analyticsKPI.totalCollectedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>ছাড়: {currencySymbol}{analyticsKPI.totalDiscount.toFixed(0)}</span>
                <span>ভ্যাট: {currencySymbol}{analyticsKPI.totalTax.toFixed(0)}</span>
              </div>
            </div>

            {/* KPI ২: বিক্রিত পণ্যের ক্রয়মূল্য (COGS) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>ক্রয় খরচ (COGS)</span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 text-base sm:text-lg font-black text-amber-700 tracking-tight">
                {currencySymbol}{analyticsKPI.totalCOGS.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                গড় ক্রয়মূল্য ভিত্তিক খরচ
              </div>
            </div>

            {/* KPI ৩: নিট মুনাফা (Net Profit - Hero Metric) */}
            <div className={`p-3 sm:p-3.5 rounded-2xl border shadow-sm transition-all flex flex-col justify-between ${
              analyticsKPI.netProfit >= 0
                ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border-emerald-300 text-emerald-950'
                : 'bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-white border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span>নিট মুনাফা</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  analyticsKPI.netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {analyticsKPI.netProfit >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
              <div className={`my-1.5 text-base sm:text-lg font-black tracking-tight ${
                analyticsKPI.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {analyticsKPI.netProfit >= 0 ? '+' : ''}{currencySymbol}{analyticsKPI.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] font-bold opacity-90 flex items-center justify-between">
                <span>{analyticsKPI.netProfit >= 0 ? 'লাভজনক' : 'ঘাটতি'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  analyticsKPI.netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  মার্জিন {analyticsKPI.profitMarginPercent}%
                </span>
              </div>
            </div>

            {/* KPI ৪: মুনাফার মার্জিন (Profit Margin %) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>মুনাফার মার্জিন %</span>
                <div className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Percent className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 text-base sm:text-lg font-black text-indigo-700 tracking-tight">
                {analyticsKPI.profitMarginPercent}%
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {analyticsKPI.profitMarginPercent >= 20 ? 'চমৎকার মার্জিন' : analyticsKPI.profitMarginPercent >= 10 ? 'সন্তোষজনক' : 'স্বাভাবিক'}
              </div>
            </div>

            {/* KPI ৫: গড় অর্ডার মান (AOV) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>গড় অর্ডার মান (AOV)</span>
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {currencySymbol}{analyticsKPI.averageOrderValue.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                প্রতি অর্ডারে গড় লেনদেন
              </div>
            </div>

          </div>
        </div>

        {/* ন্যাভিগেশন ট্যাব বার (কমপ্যাক্ট ও ক্লিন লেবেল) */}
        <div className="shrink-0 px-5 sm:px-8 border-b border-slate-200 bg-white">
          <div className="flex space-x-1 sm:space-x-3 overflow-x-auto text-xs font-bold no-scrollbar">
            {[
              { id: 'overview', label: 'ওভারভিউ ও ট্রেন্ডস', icon: BarChart3 },
              { id: 'statement', label: 'আয়-ব্যয় বিবরণী (P&L)', icon: FileText },
              { id: 'products', label: 'পণ্যভিত্তিক লাভ-ক্ষতি', icon: Package, count: analyticsKPI.allProductList.length },
              { id: 'categories', label: 'ক্যাটাগরি বিশ্লেষণ', icon: Layers, count: analyticsKPI.allCategoryList.length },
              { id: 'transactions', label: 'ইনভয়েস লেনদেন', icon: CreditCard, count: filteredSales.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
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
            <div className="space-y-5">
              
              {/* দিনভিত্তিক বিক্রয় ও মুনাফা ভিজ্যুয়াল চার্ট */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        দৈনিক বিক্রয়, ক্রয় খরচ ও মুনাফার গতিধারা
                      </h3>
                      <p className="text-[11px] text-slate-400">বারগুলোতে মাউস রেখে নির্দিষ্ট দিনের বিস্তারিত দেখুন</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-bold">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shadow-2xs"></span>
                      <span className="text-slate-700">বিক্রয় (Revenue)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-2xs"></span>
                      <span className="text-slate-700">খরচ (COGS)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-2xs"></span>
                      <span className="text-slate-700">লাভ (Profit)</span>
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
                    {/* ট্রেন্ড বার গ্রিড (গ্রিডলাইন ও সমান বিন্যাস সহ) */}
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
                                  className="w-3.5 sm:w-4 bg-indigo-500 hover:bg-indigo-600 rounded-t-md transition-all shadow-2xs group-hover:scale-105"
                                  title={`বিক্রয়: ${currencySymbol}${item.revenue.toFixed(2)}`}
                                />
                                {/* খরচ বার */}
                                <div 
                                  style={{ height: `${cogsHeight}%` }}
                                  className="w-3.5 sm:w-4 bg-amber-500 hover:bg-amber-600 rounded-t-md transition-all shadow-2xs group-hover:scale-105"
                                  title={`খরচ: ${currencySymbol}${item.cogs.toFixed(2)}`}
                                />
                                {/* লাভ বার */}
                                <div 
                                  style={{ height: `${profitHeight}%` }}
                                  className={`w-3.5 sm:w-4 rounded-t-md transition-all shadow-2xs group-hover:scale-105 ${
                                    item.profit >= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500'
                                  }`}
                                  title={`লাভ: ${currencySymbol}${item.profit.toFixed(2)}`}
                                />
                              </div>
                              <span className="text-[11px] text-slate-600 font-mono mt-1 font-bold">
                                {item.date.split('-').slice(1).join('/')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* হোভার ডিটেইলস পপআপ বার */}
                    {hoveredTrendItem && (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100 shadow-md">
                        <span className="font-bold text-indigo-300">তারিখ: {hoveredTrendItem.date}</span>
                        <span>অর্ডার: <strong>{hoveredTrendItem.orders}</strong> টি</span>
                        <span>বিক্রয়: <strong>{currencySymbol}{hoveredTrendItem.revenue.toFixed(2)}</strong></span>
                        <span>খরচ: <strong className="text-amber-300">{currencySymbol}{hoveredTrendItem.cogs.toFixed(2)}</strong></span>
                        <span className={`font-black ${hoveredTrendItem.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          নিট লাভ: {currencySymbol}{hoveredTrendItem.profit.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* টপ পারফর্মিং প্রোডাক্ট ও পেমেন্ট মেথড অনুপাত */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* সেরা বিক্রিত ও লাভজনক পণ্য (৮ কলাম) */}
                <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-black text-slate-900">
                        শীর্ষ ৫টি সর্বোচ্চ মুনাফাদায়ক পণ্য (Top 5 Profitable Products)
                      </h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 hover:underline"
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
                          <tr className="text-slate-500 font-bold border-b border-slate-100 pb-2">
                            <th className="pb-2.5">পণ্যের নাম</th>
                            <th className="pb-2.5 text-center">বিক্রিত পরিমাণ</th>
                            <th className="pb-2.5 text-right">মোট বিক্রয়</th>
                            <th className="pb-2.5 text-right">মোট লাভ</th>
                            <th className="pb-2.5 text-right">মার্জিন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analyticsKPI.topProducts.map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-semibold text-slate-900">
                                <div>{p.productName}</div>
                                <span className="text-[10px] text-slate-400 font-mono">#{p.productId}</span>
                              </td>
                              <td className="py-3 text-center font-bold text-slate-700">
                                {p.unitsSold}
                              </td>
                              <td className="py-3 text-right font-bold text-slate-900">
                                {currencySymbol}{p.revenue.toFixed(2)}
                              </td>
                              <td className="py-3 text-right font-black text-emerald-600">
                                +{currencySymbol}{p.profit.toFixed(2)}
                              </td>
                              <td className="py-3 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {p.marginPercent}%
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
                <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      পেমেন্ট চ্যানেল বন্টন
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    {Object.entries(analyticsKPI.paymentMap)
                      .filter(([_, amount]) => amount > 0)
                      .map(([method, amount]) => {
                        const percentage = analyticsKPI.totalCollectedRevenue > 0
                          ? ((amount / analyticsKPI.totalCollectedRevenue) * 100).toFixed(1)
                          : 0;

                        return (
                          <div key={method} className="space-y-1.5">
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-700">{method}</span>
                              <span className="text-slate-900 font-black">
                                {currencySymbol}{amount.toFixed(2)} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  method === 'Cash'
                                    ? 'bg-emerald-500'
                                    : method === 'bKash'
                                    ? 'bg-pink-500'
                                    : method === 'Nagad'
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    মোট সংগৃহীত পেমেন্ট: <strong className="text-slate-900 font-bold">{currencySymbol}{analyticsKPI.totalCollectedRevenue.toFixed(2)}</strong>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* ট্যাব ২: পূর্ণাঙ্গ P&L আয়-ব্যয় বিবরণী (Financial Income Statement) */}
          {/* ============================================================== */}
          {activeTab === 'statement' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm max-w-3xl mx-auto space-y-6">
              
              <div className="text-center pb-5 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-900">
                  {storeSettings.StoreName || 'Super Shop POS'}
                </h3>
                <h4 className="text-sm font-bold text-indigo-700 mt-0.5">
                  Profit & Loss (Income) Financial Statement
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  সময়কাল: {filterRange === 'today' ? 'আজকের দিন' : filterRange === 'month' ? 'চলতি মাস' : filterRange} ({customStartDate || 'শুরু'} থেকে {customEndDate || 'শেষ'})
                </p>
              </div>

              {/* প্রফেশনাল অ্যাকাউন্টিং টেবিল */}
              <div className="space-y-4 text-xs font-mono">
                
                {/* রাজস্ব সেকশন */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">১. রাজস্ব আয় (Revenues & Sales)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>মোট বিক্রয় (Gross Sales Revenue)</span>
                    <span>{currencySymbol}{analyticsKPI.totalGrossRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-rose-600">
                    <span>বাদ: বিক্রয় ছাড় ও ডিসকাউন্ট (Less: Sales Discounts)</span>
                    <span>- {currencySymbol}{analyticsKPI.totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-4 font-bold text-slate-900 bg-slate-50 py-1.5 px-3 rounded-xl font-sans">
                    <span>প্রকৃত নিট বিক্রয় (Net Sales)</span>
                    <span>{currencySymbol}{analyticsKPI.netSales.toFixed(2)}</span>
                  </div>
                </div>

                {/* ক্রয় খরচ সেকশন */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">২. বিক্রিত পণ্যের খরচ (Cost of Goods Sold - COGS)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>পণ্যের মূল ক্রয়মূল্য খরচ (Cost of Inventory Sold)</span>
                    <span>{currencySymbol}{analyticsKPI.totalCOGS.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-4 font-bold text-slate-900 bg-slate-50 py-1.5 px-3 rounded-xl font-sans">
                    <span>মোট বিক্রয় খরচ (Total Cost of Sales)</span>
                    <span>{currencySymbol}{analyticsKPI.totalCOGS.toFixed(2)}</span>
                  </div>
                </div>

                {/* মোট মুনাফা (Gross Profit) */}
                <div className="flex justify-between font-black text-sm bg-indigo-50 text-indigo-950 p-3 rounded-xl border border-indigo-200 font-sans">
                  <span>৩. মোট মুনাফা (Gross Profit = Net Sales - COGS)</span>
                  <span>{currencySymbol}{(analyticsKPI.netSales - analyticsKPI.totalCOGS).toFixed(2)}</span>
                </div>

                {/* ট্যাক্স ও শুল্ক */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <div className="font-sans font-bold text-slate-900 text-sm">৪. সংগৃহীত কর/ভ্যাট (Taxes Collected)</div>
                  <div className="flex justify-between pl-4 text-slate-700">
                    <span>সংগৃহীত বিক্রয় কর (Sales Tax / VAT)</span>
                    <span>{currencySymbol}{analyticsKPI.totalTax.toFixed(2)}</span>
                  </div>
                </div>

                {/* চূড়ান্ত নিট মুনাফা (Net Profit) */}
                <div className={`flex justify-between font-black text-base p-4 rounded-2xl border font-sans ${
                  analyticsKPI.netProfit >= 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  <div className="flex flex-col">
                    <span>চূড়ান্ত নিট মুনাফা (Net Operating Profit)</span>
                    <span className="text-xs font-semibold opacity-80 mt-0.5">
                      মুনাফার মার্জিন শতকরা হার: {analyticsKPI.profitMarginPercent}%
                    </span>
                  </div>
                  <span className="text-xl">
                    {analyticsKPI.netProfit >= 0 ? '+' : ''}{currencySymbol}{analyticsKPI.netProfit.toFixed(2)}
                  </span>
                </div>

              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
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
                              {currencySymbol}{p.avgCostPrice.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-slate-900">
                              {currencySymbol}{p.revenue.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-amber-700">
                              {currencySymbol}{p.cogs.toFixed(2)}
                            </td>
                            <td className={`py-3 px-2 text-right font-black ${
                              isProfit ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {isProfit ? '+' : ''}{currencySymbol}{p.profit.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isProfit 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {p.marginPercent}%
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
                          {currencySymbol}{processedProductsList.reduce((acc, p) => acc + p.cogs, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right text-emerald-700 font-black">
                          +{currencySymbol}{processedProductsList.reduce((acc, p) => acc + p.profit, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-black">
                          {analyticsKPI.profitMarginPercent}%
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
                            {currencySymbol}{c.cogs.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right font-black text-emerald-600">
                            +{currencySymbol}{c.profit.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {c.marginPercent}%
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
                        <th className="py-3 px-2">ইনভয়েস নম্বর</th>
                        <th className="py-3 px-2">কাস্টমার</th>
                        <th className="py-3 px-2 text-center">পেমেন্ট মেথড</th>
                        <th className="py-3 px-2 text-right">আইটেম সংখ্যা</th>
                        <th className="py-3 px-2 text-right">মোট মূল্য</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((sale, i) => {
                        const timeVal = sale.timestamp || sale.Timestamp || sale.Date || sale.CreatedAt;
                        const dateFormatted = timeVal ? new Date(timeVal).toLocaleString('bn-BD') : 'N/A';
                        const invNo = sale.invoiceNumber || sale.InvoiceNumber || sale.id || `INV-${i + 1}`;
                        const custName = sale.customerName || sale.CustomerName || 'Walk-in Customer';
                        const pMethod = sale.paymentMethod || sale.PaymentMethod || 'Cash';
                        const total = Number(sale.grandTotal || sale.GrandTotal || sale.totalAmount) || 0;
                        const itemCount = Array.isArray(sale.items) ? sale.items.length : 1;

                        return (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-slate-500">
                              {dateFormatted}
                            </td>
                            <td className="py-3 px-2 font-mono font-bold text-indigo-600">
                              {invNo}
                            </td>
                            <td className="py-3 px-2 text-slate-800 font-semibold">
                              {custName}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {pMethod}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-slate-700 font-bold">
                              {itemCount}
                            </td>
                            <td className="py-3 px-2 text-right font-black text-slate-900">
                              {currencySymbol}{total.toFixed(2)}
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

        </div>

        {/* মডাল ফুটার */}
        <div className="shrink-0 px-5 sm:px-8 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>স্বয়ংক্রিয় WAC অ্যাকাউন্টিং ও রিয়েল-টাইম গুগল শিট অ্যানালিটিক্স সিঙ্ক</span>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* প্রিন্ট উপযোগী লুকায়িত P&L ডকুমেন্ট (শুধুমাত্র প্রিন্টারের জন্য) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans w-full max-w-4xl mx-auto">
        <div className="text-center pb-4 border-b-2 border-black mb-4">
          <h1 className="text-xl font-bold tracking-tight">
            {storeSettings.StoreName || 'Super Shop POS'}
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {storeSettings.Address || ''} {storeSettings.Phone ? `• ফোন: ${storeSettings.Phone}` : ''}
          </p>
          <h2 className="text-base font-extrabold text-gray-900 mt-2 underline">
            PROFIT & LOSS (INCOME) FINANCIAL STATEMENT
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            সময়কাল: {filterRange} ({customStartDate || 'শুরু'} থেকে {customEndDate || 'শেষ'}) • প্রতিবেদন প্রকাশের তারিখ: {new Date().toLocaleDateString('bn-BD')}
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
              <tr className="border-b border-gray-300 bg-gray-50 font-bold">
                <td className="p-2">প্রকৃত নিট বিক্রয় (Net Sales)</td>
                <td className="p-2 text-right">{currencySymbol}{analyticsKPI.netSales.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">বিক্রিত পণ্যের ক্রয় খরচ (Cost of Goods Sold - COGS)</td>
                <td className="p-2 text-right text-gray-800">{currencySymbol}{analyticsKPI.totalCOGS.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-400 font-bold bg-gray-100">
                <td className="p-2">মোট মুনাফা (Gross Profit = Net Sales - COGS)</td>
                <td className="p-2 text-right">{currencySymbol}{(analyticsKPI.netSales - analyticsKPI.totalCOGS).toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-medium">সংগৃহীত বিক্রয় কর/ভ্যাট (Sales Tax / VAT)</td>
                <td className="p-2 text-right">{currencySymbol}{analyticsKPI.totalTax.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-200 font-black text-sm">
                <td className="p-2.5">চূড়ান্ত নিট মুনাফা (Net Profit)</td>
                <td className="p-2.5 text-right">
                  {analyticsKPI.netProfit >= 0 ? '+' : ''}{currencySymbol}{analyticsKPI.netProfit.toFixed(2)} ({analyticsKPI.profitMarginPercent}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* প্রিন্ট ২: পণ্যভিত্তিক লাভ-ক্ষতি বিবরণী */}
        <div className="mb-6">
          <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">
            ২. পণ্যভিত্তিক লাভ-ক্ষতি বিবরণী (Product-wise Breakdown)
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
              {analyticsKPI.allProductList.map((p, idx) => (
                <tr key={idx}>
                  <td className="p-1.5 font-medium">{p.productName}</td>
                  <td className="p-1.5">{p.category}</td>
                  <td className="p-1.5 text-center">{p.unitsSold}</td>
                  <td className="p-1.5 text-right">{p.avgSellingPrice.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.avgCostPrice.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.revenue.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.cogs.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-bold">{p.profit.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{p.marginPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* প্রিন্ট ফুটার ও সিগনেচার */}
        <div className="pt-10 flex justify-between text-xs border-t border-gray-300 text-gray-700">
          <div className="text-center">
            <div className="w-36 border-b border-black mb-1"></div>
            <span>হিসাব প্রস্তুতকারক</span>
          </div>
          <div className="text-center">
            <div className="w-36 border-b border-black mb-1"></div>
            <span>ব্যবস্থাপক / স্বত্বাধিকারী</span>
          </div>
        </div>

      </div>

    </div>
  );
}
