import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Package,
  Sparkles,
  X,
  Layers,
  RefreshCw,
  Settings,
  Database,
  Tag,
  LayoutGrid,
  List,
  Zap,
  Camera,
  CalendarClock,
  Scissors,
  PauseCircle
} from 'lucide-react';
import BarcodeScannerModal from './BarcodeScannerModal';
import { calculateExpiryStatus } from '../services/storage';
import { isFabricUnit } from '../utils/fabricUtils';

export default function ProductCatalog({ 
  products = [], 
  currencySymbol = '৳', 
  onAddToCart, 
  cartItems = [],
  onOpenProductDetails,
  onOpenInvoiceLookup,
  activeUser,
  apiUrl = '',
  onOpenSettings,
  onSync,
  coupons = [],
  onOpenVariantSelector,
  heldCartsCount = 0,
  onOpenHeldCartsModal,
}) {
  const isAdmin = Boolean(activeUser && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier'));
  const isCustomer = !isAdmin;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'WITH_COUPON'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-desc' | 'stock-asc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const searchInputRef = useRef(null);

  const safeProducts = Array.isArray(products) ? products : [];

  // সক্রিয় স্টোর কুপনসমূহ (Active Coupons)
  const activeCoupons = useMemo(() => {
    if (!Array.isArray(coupons)) return [];
    const now = new Date();
    return coupons.filter((c) => {
      if (c.Status === 'Inactive') return false;
      if (c.ExpiryDate) {
        const expDate = new Date(c.ExpiryDate);
        expDate.setHours(23, 59, 59, 999);
        if (now > expDate) return false;
      }
      if (c.UsageLimit > 0 && Number(c.UsedCount) >= Number(c.UsageLimit)) return false;
      return true;
    });
  }, [coupons]);

  // নির্দিষ্ট পণ্যের জন্য সক্রিয় কুপন যাচাই হেল্পার
  const hasProductCoupon = (product) => {
    if (!product || activeCoupons.length === 0) return false;
    return activeCoupons.some((c) => {
      if (c.ApplicableType === 'SpecificProduct' && c.ProductID) {
        return (
          String(c.ProductID).trim() === String(product.ProductID).trim() ||
          (product.Barcode && String(c.ProductID).trim() === String(product.Barcode).trim())
        );
      }
      return c.ApplicableType === 'AllProducts' || !c.ApplicableType;
    });
  };

  // স্টক পরিসংখ্যান মেট্রিক্স
  const stockMetrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let withCoupon = 0;

    safeProducts.forEach((p) => {
      const stock = Number(p.StockQuantity || 0);
      const godown = Number(p.GodownStock || 0);
      const effectiveStock = isCustomer ? (stock + godown) : stock;
      const minAlert = Number(p.MinStockAlert || 5);
      if (effectiveStock > 0) {
        inStock++;
        if (effectiveStock <= minAlert) lowStock++;
      } else {
        outOfStock++;
      }
      if (hasProductCoupon(p)) withCoupon++;
    });

    return { inStock, lowStock, outOfStock, withCoupon };
  }, [safeProducts, activeCoupons, isCustomer]);

  // ডায়নামিক ক্যাটাগরি তালিকা (আইটেম কাউন্টসহ)
  const categoriesWithCounts = useMemo(() => {
    const map = new Map();
    safeProducts.forEach((p) => {
      const cat = p.Category || 'General';
      map.set(cat, (map.get(cat) || 0) + 1);
    });

    return [
      { id: 'All', label: 'সকল পণ্য', count: safeProducts.length },
      ...Array.from(map.entries()).map(([cat, count]) => ({
        id: cat,
        label: cat,
        count,
      })),
    ];
  }, [safeProducts]);

  // ফিল্টার ও সর্ট করা পণ্য তালিকা
  const filteredProducts = useMemo(() => {
    let list = safeProducts.filter((p) => {
      // ১. সার্চ কিউরি ম্যাচিং
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        (p.ProductName && p.ProductName.toLowerCase().includes(query)) ||
        (p.Barcode && p.Barcode.toString().toLowerCase().includes(query)) ||
        (p.ProductID && p.ProductID.toLowerCase().includes(query)) ||
        (p.Category && p.Category.toLowerCase().includes(query)) ||
        (p.SubCategory && p.SubCategory.toLowerCase().includes(query));

      // ২. ক্যাটাগরি ফিল্টার
      const matchCategory =
        selectedCategory === 'All' ? true : p.Category === selectedCategory;

      // ৩. স্টক ফিল্টার
      const stock = Number(p.StockQuantity || 0);
      const godown = Number(p.GodownStock || 0);
      const effectiveStock = isCustomer ? (stock + godown) : stock;
      const minAlert = Number(p.MinStockAlert || 5);
      let matchStock = true;
      if (stockFilter === 'IN_STOCK') matchStock = effectiveStock > 0;
      else if (stockFilter === 'LOW_STOCK') matchStock = effectiveStock > 0 && effectiveStock <= minAlert;
      else if (stockFilter === 'OUT_OF_STOCK') matchStock = effectiveStock <= 0;
      else if (stockFilter === 'WITH_COUPON') matchStock = hasProductCoupon(p);

      return matchSearch && matchCategory && matchStock;
    });

    // সর্টিং লজিক
    const sorted = [...list];
    if (sortBy === 'name-asc') {
      sorted.sort((a, b) => String(a.ProductName || '').localeCompare(String(b.ProductName || '')));
    } else if (sortBy === 'price-asc') {
      sorted.sort((a, b) => (Number(a.SellingPrice) || 0) - (Number(b.SellingPrice) || 0));
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => (Number(b.SellingPrice) || 0) - (Number(a.SellingPrice) || 0));
    } else if (sortBy === 'stock-desc') {
      sorted.sort((a, b) => (Number(b.StockQuantity) || 0) - (Number(a.StockQuantity) || 0));
    } else if (sortBy === 'stock-asc') {
      sorted.sort((a, b) => (Number(a.StockQuantity) || 0) - (Number(b.StockQuantity) || 0));
    }

    return sorted;
  }, [safeProducts, searchQuery, selectedCategory, stockFilter, sortBy, activeCoupons]);

  // বারকোড স্ক্যানার দিয়ে সরাসরি কার্টে যোগ বা ইনভয়েস ট্র্যাকিং
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const cleanCode = searchQuery.trim().toLowerCase();

      // যদি এডমিন মোডে ইনভয়েস প্রিফিক্স দিয়ে সার্চ করা হয় তবে সরাসরি ইনভয়েস লুকআপ ওপেন করা
      if (isAdmin && cleanCode.startsWith('inv')) {
        if (onOpenInvoiceLookup) {
          onOpenInvoiceLookup(searchQuery.trim());
          setSearchQuery('');
          return;
        }
      }

      // ভ্যারিয়েন্ট বারকোড চেক
      let variantMatchedProduct = null;
      let matchedVariantObj = null;

      for (const prod of safeProducts) {
        if (prod.HasVariants && Array.isArray(prod.Variants)) {
          const v = prod.Variants.find(varItem => varItem.Barcode && String(varItem.Barcode).toLowerCase() === cleanCode);
          if (v) {
            variantMatchedProduct = prod;
            matchedVariantObj = v;
            break;
          }
        }
      }

      if (variantMatchedProduct && matchedVariantObj) {
        const attrText = matchedVariantObj.Attributes
          ? Object.entries(matchedVariantObj.Attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
          : '';
        const itemToAdd = {
          ...variantMatchedProduct,
          SellingPrice: Number(matchedVariantObj.SellingPrice || variantMatchedProduct.SellingPrice || 0),
          CostPrice: Number(matchedVariantObj.CostPrice || variantMatchedProduct.CostPrice || 0),
          MinSellingPrice: Number(matchedVariantObj.MinSellingPrice !== undefined ? matchedVariantObj.MinSellingPrice : (variantMatchedProduct.MinSellingPrice !== undefined ? variantMatchedProduct.MinSellingPrice : (matchedVariantObj.CostPrice || variantMatchedProduct.CostPrice || 0))),
          Barcode: matchedVariantObj.Barcode,
          variantId: matchedVariantObj.VariantID,
          variantName: attrText || matchedVariantObj.VariantID,
          variantAttributes: matchedVariantObj.Attributes || {},
          _selectedVariant: matchedVariantObj
        };
        onAddToCart(itemToAdd);
        setSearchQuery('');
        return;
      }

      const exactMatch = safeProducts.find(
        (p) =>
          (p.Barcode && String(p.Barcode).toLowerCase() === cleanCode) ||
          (p.ProductID && String(p.ProductID).toLowerCase() === cleanCode)
      );

      if (exactMatch) {
        if (exactMatch.HasVariants && Array.isArray(exactMatch.Variants) && exactMatch.Variants.length > 0 && onOpenVariantSelector) {
          onOpenVariantSelector(exactMatch);
          setSearchQuery('');
        } else if (Number(exactMatch.StockQuantity) > 0) {
          onAddToCart(exactMatch);
          setSearchQuery('');
        }
      }
    }
  };

  // ক্যামেরা স্ক্যানারের মাধ্যমে পণ্য খোঁজা ও সিলেক্ট করা
  const handleCameraScanSuccess = (code) => {
    const clean = String(code).trim().toLowerCase();
    setSearchQuery(clean);

    // ভ্যারিয়েন্ট বারকোড চেক
    let variantMatchedProduct = null;
    let matchedVariantObj = null;

    for (const prod of safeProducts) {
      if (prod.HasVariants && Array.isArray(prod.Variants)) {
        const v = prod.Variants.find(varItem => varItem.Barcode && String(varItem.Barcode).trim().toLowerCase() === clean);
        if (v) {
          variantMatchedProduct = prod;
          matchedVariantObj = v;
          break;
        }
      }
    }

    if (variantMatchedProduct && matchedVariantObj && onAddToCart) {
      const attrText = matchedVariantObj.Attributes
        ? Object.entries(matchedVariantObj.Attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      const itemToAdd = {
        ...variantMatchedProduct,
        SellingPrice: Number(matchedVariantObj.SellingPrice || variantMatchedProduct.SellingPrice || 0),
        CostPrice: Number(matchedVariantObj.CostPrice || variantMatchedProduct.CostPrice || 0),
        MinSellingPrice: Number(matchedVariantObj.MinSellingPrice !== undefined ? matchedVariantObj.MinSellingPrice : (variantMatchedProduct.MinSellingPrice !== undefined ? variantMatchedProduct.MinSellingPrice : (matchedVariantObj.CostPrice || variantMatchedProduct.CostPrice || 0))),
        Barcode: matchedVariantObj.Barcode,
        variantId: matchedVariantObj.VariantID,
        variantName: attrText || matchedVariantObj.VariantID,
        variantAttributes: matchedVariantObj.Attributes || {},
        _selectedVariant: matchedVariantObj
      };
      onAddToCart(itemToAdd);
      return;
    }

    const match = safeProducts.find(
      (p) =>
        (p.Barcode && String(p.Barcode).trim().toLowerCase() === clean) ||
        (p.ProductID && p.ProductID.trim().toLowerCase() === clean)
    );

    if (match) {
      if (match.HasVariants && onOpenVariantSelector) {
        onOpenVariantSelector(match);
      } else if (onOpenProductDetails) {
        onOpenProductDetails(match);
      }
    }
  };

  // কার্টে কোনো পণ্যের বর্তমান পরিমাণ
  const getItemCartQuantity = (productId) => {
    const item = cartItems.find((ci) => ci.productId === productId);
    return item ? item.quantity : 0;
  };

  // কারেন্সি ফরম্যাটার
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/70 select-none">
      
      {/* ================= ১. শীর্ষ কন্ট্রোল বার: সার্চ, ফিল্টার ও সর্টিং ================= */}
      <div className="p-3.5 sm:p-5 bg-white border-b border-slate-200/80 space-y-3 shrink-0 shadow-2xs">
        
        {/* কমান্ড-বার সার্চ ইনপুট + টুলস */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              ref={searchInputRef}
              id="pos-product-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isCustomer ? "পণ্য পছন্দ করুন বা নাম লিখে খুঁজুন..." : "পণ্য, বারকোড বা নাম দিয়ে খুঁজুন... [F1]"}
              className="block w-full pl-11 pr-24 py-2.5 sm:py-3 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-slate-50/80 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs font-medium text-slate-800"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="সার্চ মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="flex items-center space-x-1 text-slate-500 hover:text-indigo-600 pl-1.5 border-l border-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="মোবাইল বা ওয়েবক্যাম দিয়ে বারকোড স্ক্যান করুন"
              >
                <Camera className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-mono font-bold hidden sm:inline uppercase">Scan</span>
              </button>
            </div>
          </div>

          {/* সর্টিং ও ভিউ মোড কন্ট্রোল গ্রুপ */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* হোল্ডকৃত অর্ডার কুইক বাটন (যদি অর্ডার হোল্ডে থাকে) */}
            {heldCartsCount > 0 && (
              <button
                type="button"
                onClick={onOpenHeldCartsModal}
                className="px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 animate-in zoom-in-95"
                title="হোল্ডকৃত অর্ডার তালিকা খুলুন"
              >
                <PauseCircle className="w-4 h-4 animate-pulse text-amber-100" />
                <span>হোল্ড ({heldCartsCount})</span>
              </button>
            )}

            {/* সর্টিং ড্রপডাউন */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 py-2.5 px-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-all"
              >
                <option value="default">ডিফল্ট ক্রম (Default)</option>
                <option value="name-asc">নাম অনুযায়ী (A-Z)</option>
                <option value="price-asc">মূল্য: কম থেকে বেশি</option>
                <option value="price-desc">মূল্য: বেশি থেকে কম</option>
                <option value="stock-desc">সর্বোচ্চ স্টক (Highest Stock)</option>
                <option value="stock-asc">সর্বনিম্ন স্টক (Lowest Stock)</option>
              </select>
            </div>

            {/* ভিউ মোড সুইচ (গ্রিড / লিস্ট) */}
            <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="গ্রিড কার্ড ভিউ"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="কমপ্যাক্ট লিস্ট ভিউ"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ইনভয়েস নম্বর টাইপ করলে বিশেষ নোটিফিকেশন বার */}
        {isAdmin && searchQuery.trim().toLowerCase().startsWith('inv') && (
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-2 text-xs text-indigo-900 shadow-xs animate-in fade-in">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>আপনি কি <b>{searchQuery.trim()}</b> ইনভয়েসের বিক্রয় মেমো দেখতে চান?</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenInvoiceLookup) onOpenInvoiceLookup(searchQuery.trim());
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
            >
              ইনভয়েস ডিটেইলস দেখুন →
            </button>
          </div>
        )}

        {/* স্টক স্ট্যাটাস কুইক ফিল্টার স্ট্রিপ */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {[
            { id: 'ALL', label: 'সকল পণ্য', count: safeProducts.length, color: 'slate' },
            { id: 'IN_STOCK', label: 'মজুদ আছে', count: stockMetrics.inStock, color: 'emerald' },
            { id: 'LOW_STOCK', label: 'কম স্টক', count: stockMetrics.lowStock, color: 'amber', isWarning: stockMetrics.lowStock > 0 },
            { id: 'OUT_OF_STOCK', label: 'স্টক শেষ', count: stockMetrics.outOfStock, color: 'rose' },
            ...(activeCoupons.length > 0
              ? [{ id: 'WITH_COUPON', label: '🏷️ অফার ও কুপন', count: stockMetrics.withCoupon, color: 'pink' }]
              : []),
          ].map((pill) => {
            const isSelected = stockFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStockFilter(pill.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : pill.isWarning
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ক্যাটাগরি ফিল্টার স্ক্রোলিং পিলস */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar pt-0.5">
          {categoriesWithCounts.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* ================= ২. সক্রিয় কুপন প্রমো রিবন (যদি অফার থাকে) ================= */}
      {showPromoBanner && activeCoupons.length > 0 && (
        <div className="px-4 py-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-600 text-white text-xs font-semibold flex items-center justify-between gap-3 shrink-0 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2 truncate">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
            </span>
            <span className="truncate">
              <strong>বিশেষ অফার চলছে!</strong> কার্টে কুপন ব্যবহার করে আকর্ষণীয় ছাড় উপভোগ করুন:
            </span>
            <div className="hidden sm:flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              {activeCoupons.slice(0, 3).map((c) => (
                <span
                  key={c.CouponID || c.CouponCode}
                  className="px-2 py-0.5 rounded-lg bg-white/20 border border-white/20 font-mono text-[10px] font-black tracking-wider uppercase"
                >
                  {c.CouponCode}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowPromoBanner(false)}
            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg shrink-0 cursor-pointer"
            title="লুকিয়ে ফেলুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================= ৩. মূল প্রোডাক্ট কন্টেন্ট ভিউ (গ্রিড / লিস্ট) ================= */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0">
        {filteredProducts.length === 0 ? (
          safeProducts.length === 0 ? (
            !apiUrl ? (
              <div className="h-80 flex flex-col items-center justify-center text-center text-slate-500 bg-white rounded-3xl border border-dashed border-indigo-200 p-8 max-w-md mx-auto my-6 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-inner">
                  <Database className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h4 className="text-base font-bold text-slate-800">গুগল শিট API এখনও কনফিগার করা হয়নি</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                  আপনার গুগল শিটের <span className="font-semibold text-indigo-600">Products</span> ডাটাবেস থেকে পণ্য দেখতে Settings-এ গিয়ে Apps Script Web App URL দিন এবং সিঙ্ক করুন।
                </p>
                {isAdmin && onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer hover:scale-102"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings ওপেন করুন</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center text-slate-500 bg-white rounded-3xl border border-dashed border-emerald-200 p-8 max-w-md mx-auto my-6 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                  <Package className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h4 className="text-base font-bold text-slate-800">গুগল শিট Products ট্যাবে কোনো পণ্য পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                  আপনার গুগল শিটের <span className="font-semibold text-emerald-600">Products</span> ট্যাবে পণ্য যোগ করুন অথবা নিচের বাটনে ক্লিক করে লাইভ রিফ্রেশ সিঙ্ক করুন।
                </p>
                {onSync && (
                  <button
                    onClick={onSync}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer hover:scale-102"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>গুগল শিট থেকে রিফ্রেশ সিঙ্ক</span>
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-8 max-w-md mx-auto my-6 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Package className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-700">কোনো পণ্য খুঁজে পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                অনুগ্রহ করে অন্য কোনো পণ্যের নাম, ক্যাটাগরি বা সঠিক বারকোড দিয়ে চেষ্টা করুন অথবা ফিল্টার পরিবর্তন করুন।
              </p>
              {(searchQuery || selectedCategory !== 'All' || stockFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setStockFilter('ALL');
                  }}
                  className="mt-3.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                >
                  সকল ফিল্টার রিসেট করুন
                </button>
              )}
            </div>
          )
        ) : viewMode === 'grid' ? (
          /* ================= ভিউ ১: প্রিমিয়াম কার্ড গ্রিড ================= */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4.5">
            {filteredProducts.map((product) => {
              const stock = Number(product.StockQuantity || 0);
              const godownStock = Number(product.GodownStock || 0);
              const totalStock = stock + godownStock;
              const minAlert = Number(product.MinStockAlert || 5);
              const inStock = isCustomer ? totalStock > 0 : stock > 0;
              const isLowStock = isCustomer 
                ? (totalStock > 0 && totalStock <= minAlert) 
                : (stock > 0 && stock <= minAlert);
              const isOutOfStock = !inStock;
              const cartQty = getItemCartQuantity(product.ProductID);
              const hasCoupon = hasProductCoupon(product);
              const expiryInfo = calculateExpiryStatus(product.ExpiryDate);

              return (
                <div
                  key={product.ProductID}
                  onClick={() => onOpenProductDetails && onOpenProductDetails(product)}
                  className={`group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                    isOutOfStock
                      ? 'border-slate-200 opacity-75 bg-slate-50/70 hover:border-slate-300'
                      : 'border-slate-200/80 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 active:scale-[0.99]'
                  }`}
                >
                  {/* কার্ট কোয়ান্টিটি ব্যাজ (টপ-রাইট) */}
                  {cartQty > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white shadow-md ring-2 ring-white animate-in zoom-in-75">
                      {cartQty}
                    </span>
                  )}

                  <div>
                    {/* পণ্যের ছবি ও ফ্লোটিং স্টক স্ট্যাটাস */}
                    <div className="w-full h-32 sm:h-40 mb-2.5 overflow-hidden rounded-xl bg-slate-100 border border-slate-100/90 flex items-center justify-center relative">
                      {product.ImageUrl ? (
                        <img
                          src={product.ImageUrl}
                          alt={product.ImageCaption || product.ProductName}
                          title={product.ImageCaption || product.ProductName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.classList.add('bg-slate-100');
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <Package className="w-10 h-10 stroke-1" />
                          <span className="text-[10px] font-semibold mt-1 text-slate-400">ছবি নেই</span>
                        </div>
                      )}

                      {/* ব্যাজ গ্রুপ (টপ-লেফট): কুপন, ভ্যারিয়েন্ট, কম্বো */}
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                        {hasCoupon && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs backdrop-blur-md">
                            <Tag className="w-2.5 h-2.5" />
                            <span>কুপন</span>
                          </div>
                        )}
                        {product.HasVariants && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600/95 text-white shadow-xs backdrop-blur-md">
                            <Layers className="w-2.5 h-2.5" />
                            <span>{product.Variants?.length || 0} অপশন</span>
                          </div>
                        )}
                        {product.IsBundle && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs backdrop-blur-md">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>কম্বো</span>
                          </div>
                        )}
                      </div>

                      {/* এক্সপায়ারি ব্যাজ (টপ-রাইট) */}
                      {expiryInfo && expiryInfo.status !== 'GOOD' && expiryInfo.status !== 'NO_EXPIRY' && (
                        <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-xs backdrop-blur-md border ${
                          expiryInfo.status === 'EXPIRED'
                            ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                            : expiryInfo.status === 'CRITICAL'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}>
                          <CalendarClock className="w-2.5 h-2.5" />
                          <span>{expiryInfo.label}</span>
                        </div>
                      )}

                      {/* ছবির ওপরে ভাসমান স্টক ব্যাজ */}
                      <div className="absolute bottom-2 left-2 z-10">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600/95 text-white backdrop-blur-md shadow-xs">
                            স্টক শেষ
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/95 text-white backdrop-blur-md shadow-xs animate-pulse">
                            {isCustomer 
                              ? `সীমিত স্টক (${totalStock} ${product.Unit || 'Pcs'}${Number(product.YardsPerThan) > 0 ? ` / ${totalStock * Number(product.YardsPerThan)} গজ` : ''})` 
                              : `দোকান: ${stock} | গোডাউন: ${godownStock}`}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-md shadow-2xs">
                            {isCustomer 
                              ? `মজুদ আছে (${totalStock} ${product.Unit || 'Pcs'}${Number(product.YardsPerThan) > 0 ? ` - ${totalStock * Number(product.YardsPerThan)} গজ` : ''})` 
                              : (godownStock > 0 ? (stock === 0 ? `দোকানে ০ (গোডাউনে ${godownStock})` : `দোকান: ${stock} | গোডাউন: ${godownStock}`) : `দোকান: ${stock} ${product.Unit || 'Pcs'}`)}
                          </span>
                        )}
                      </div>

                      {/* বারকোড কোড পিল (টপ-রাইট যদি এক্সপায়ারি ও কার্ট ব্যাজ না থাকে) */}
                      {cartQty === 0 && (!expiryInfo || expiryInfo.status === 'GOOD' || expiryInfo.status === 'NO_EXPIRY') && product.Barcode && (
                        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-white/80 backdrop-blur-xs text-[9px] font-mono font-bold text-slate-600 border border-white/40 shadow-2xs">
                          #{String(product.Barcode).slice(-4)}
                        </div>
                      )}
                    </div>

                    {/* ক্যাটাগরি ও সাব-ক্যাটাগরি এবং থান/গজ তথ্য */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 gap-1">
                      <span className="font-semibold text-slate-500 truncate max-w-[70%]">
                        {product.Category || 'General'}
                        {product.SubCategory && ` › ${product.SubCategory}`}
                      </span>
                      {product.Unit && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 shrink-0">
                          {product.Unit}{Number(product.YardsPerThan) > 0 ? ` (${product.YardsPerThan} গজ)` : ''}
                        </span>
                      )}
                    </div>

                    {/* পণ্যের নাম */}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-indigo-600 transition-colors">
                      {product.ProductName}
                    </h3>
                  </div>

                  {/* নিচের অংশ: মূল্য এবং দ্রুত কার্ট বাটন */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">বিক্রয় মূল্য</span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {formatCurrency(product.SellingPrice)}
                        </span>
                        {product.MinSellingPrice && Number(product.MinSellingPrice) > 0 && Number(product.MinSellingPrice) < Number(product.SellingPrice) && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.2 rounded-md" title={`দামাদামির সর্বনিম্ন সীমা: ${formatCurrency(product.MinSellingPrice)}`}>
                            ফ্লোর: {formatCurrency(product.MinSellingPrice)}
                          </span>
                        )}
                        {product.WholesalePrice && Number(product.WholesalePrice) > 0 && (
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.2 rounded-md" title={`পাইকারি বিক্রয়মূল্য: ${formatCurrency(product.WholesalePrice)}`}>
                            পাইকারি: {formatCurrency(product.WholesalePrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* দ্রুত কার্ট বাটন অথবা ভ্যারিয়েন্ট বাছাই বাটন */}
                    {inStock ? (
                      product.HasVariants && product.Variants && product.Variants.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenVariantSelector) {
                              onOpenVariantSelector(product);
                            } else {
                              onAddToCart(product);
                            }
                          }}
                          title="ভ্যারিয়েন্ট বাছাই করুন"
                          className="px-2.5 py-1.5 rounded-xl transition-all border flex items-center space-x-1 text-xs font-bold active:scale-95 shadow-2xs cursor-pointer bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border-purple-200"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>বাছাই</span>
                        </button>
                      ) : isFabricUnit(product.Unit) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          title="গজ ও গিরা পরিমাপ নির্বাচন করে কার্টে যোগ করুন"
                          className={`px-2.5 py-1.5 rounded-xl transition-all border flex items-center space-x-1 text-xs font-black active:scale-95 shadow-2xs cursor-pointer ${
                            cartQty > 0
                              ? 'bg-amber-600 text-white border-amber-600 shadow-amber-600/20'
                              : 'bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border-amber-300'
                          }`}
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>গজ-গিরা</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          title="কার্টে যোগ করুন"
                          className={`px-3 py-1.5 rounded-xl transition-all border flex items-center space-x-1 text-xs font-bold active:scale-95 shadow-2xs cursor-pointer ${
                            cartQty > 0
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20'
                              : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border-indigo-200/80'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">যোগ</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
                        অনুপলব্ধ
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* ================= ভিউ ২: কমপ্যাক্ট টেবিল / লিস্ট ভিউ ================= */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">পণ্য</th>
                    <th className="py-3 px-3">ক্যাটাগরি</th>
                    <th className="py-3 px-3">বারকোড / কোড</th>
                    <th className="py-3 px-3 text-center">স্টক অবস্থা</th>
                    <th className="py-3 px-3 text-right">বিক্রয় মূল্য</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const stock = Number(product.StockQuantity || 0);
                    const godownStock = Number(product.GodownStock || 0);
                    const totalStock = stock + godownStock;
                    const minAlert = Number(product.MinStockAlert || 5);
                    const inStock = isCustomer ? totalStock > 0 : stock > 0;
                    const isLowStock = isCustomer 
                      ? (totalStock > 0 && totalStock <= minAlert) 
                      : (stock > 0 && stock <= minAlert);
                    const cartQty = getItemCartQuantity(product.ProductID);

                    return (
                      <tr
                        key={product.ProductID}
                        onClick={() => onOpenProductDetails && onOpenProductDetails(product)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {product.ImageUrl ? (
                                <img
                                  src={product.ImageUrl}
                                  alt={product.ProductName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-xs">
                                  {product.ProductName}
                                </span>
                                {product.HasVariants && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    ভ্যারিয়েন্ট ({product.Variants?.length || 0})
                                  </span>
                                )}
                                {product.IsBundle && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    কম্বো
                                  </span>
                                )}
                                {calculateExpiryStatus(product.ExpiryDate)?.status === 'EXPIRED' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    মেয়াদোত্তীর্ণ
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                {product.ProductID}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {product.Category || 'General'}
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {product.Barcode ? `#${product.Barcode}` : '-'}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isCustomer ? (
                            totalStock <= 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                স্টক শেষ
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                সীমিত: {totalStock} {product.Unit || 'Pcs'}{Number(product.YardsPerThan) > 0 ? ` (${totalStock * Number(product.YardsPerThan)} গজ)` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {totalStock} {product.Unit || 'Pcs'}{Number(product.YardsPerThan) > 0 ? ` (${totalStock * Number(product.YardsPerThan)} গজ)` : ''}
                              </span>
                            )
                          ) : (
                            stock <= 0 ? (
                              godownStock > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300" title="দোকানে শেষ কিন্তু গোডাউনে আছে">
                                  দোকানে ০ (গোডাউনে {godownStock})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  স্টক শেষ
                                </span>
                              )
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                দোকান: {stock} | গোডাউন: {godownStock}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                দোকান: {stock} | গোডাউন: {godownStock}
                              </span>
                            )
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          <div>{formatCurrency(product.SellingPrice)}</div>
                          {product.MinSellingPrice && Number(product.MinSellingPrice) > 0 && Number(product.MinSellingPrice) < Number(product.SellingPrice) && (
                            <div className="text-[10px] font-bold text-amber-700 font-sans" title="দামাদামির সর্বনিম্ন সীমা">
                              ফ্লোর: {formatCurrency(product.MinSellingPrice)}
                            </div>
                          )}
                          {product.WholesalePrice && Number(product.WholesalePrice) > 0 && (
                            <div className="text-[10px] font-bold text-indigo-700 font-sans" title={`পাইকারি বিক্রয়মূল্য: ${formatCurrency(product.WholesalePrice)}`}>
                              পাইকারি: {formatCurrency(product.WholesalePrice)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {inStock ? (
                              product.HasVariants && product.Variants && product.Variants.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenVariantSelector) {
                                      onOpenVariantSelector(product);
                                    } else {
                                      onAddToCart(product);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border-purple-200"
                                >
                                  <Layers className="w-3 h-3" />
                                  <span>বাছাই</span>
                                </button>
                              ) : isFabricUnit(product.Unit) ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(product);
                                  }}
                                  title="গজ ও গিরা পরিমাপ নির্বাচন করে কার্টে যোগ করুন"
                                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all border flex items-center space-x-1 cursor-pointer ${
                                    cartQty > 0
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border-amber-300'
                                  }`}
                                >
                                  <Scissors className="w-3 h-3" />
                                  <span>গজ-গিরা</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(product);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer ${
                                    cartQty > 0
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border-indigo-200'
                                  }`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{cartQty > 0 ? `${cartQty} যোগ` : 'যোগ'}</span>
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">অনুপলব্ধ</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* মোবাইল ক্যামেরা বারকোড স্ক্যানার মডাল */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleCameraScanSuccess}
        title="পণ্য অনুসন্ধান স্ক্যানার"
      />

    </div>
  );
}
