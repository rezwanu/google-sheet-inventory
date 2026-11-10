import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  ShoppingBag,
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
  PauseCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import BarcodeScannerModal from './BarcodeScannerModal';
import { calculateExpiryStatus } from '../services/storage';
import { isFabricUnit } from '../utils/fabricUtils';

// কাপড়ের ছবি না থাকলে নান্দনিক ফেব্রিক গ্রেডিয়েন্ট ও টেক্সচার প্যালেট
const getFabricPlaceholderStyle = (product) => {
  const name = String(product?.ProductName || '').toLowerCase();
  const cat = String(product?.Category || '').toLowerCase();

  if (name.includes('লাল') || name.includes('red') || name.includes('মেরুন') || name.includes('maroon') || name.includes('রোজ')) {
    return { bg: 'from-rose-500 via-rose-600 to-pink-700', tag: 'লাল / মেরুন', initials: 'লাল' };
  }
  if (name.includes('নীল') || name.includes('blue') || name.includes('আকাশি') || name.includes('sky') || name.includes('রয়েল') || name.includes('royal')) {
    return { bg: 'from-blue-600 via-indigo-600 to-sky-700', tag: 'নীল / আকাশি', initials: 'নীল' };
  }
  if (name.includes('সবুজ') || name.includes('green') || name.includes('পান্না') || name.includes('টিয়া') || name.includes('অলিভ')) {
    return { bg: 'from-emerald-600 via-teal-600 to-emerald-800', tag: 'সবুজ', initials: 'সবুজ' };
  }
  if (name.includes('হলুদ') || name.includes('yellow') || name.includes('সোনালী') || name.includes('golden') || name.includes('বাসন্তী')) {
    return { bg: 'from-amber-400 via-amber-500 to-yellow-600', tag: 'সোনালী / হলুদ', initials: 'সোনালী' };
  }
  if (name.includes('কালো') || name.includes('black') || name.includes('ডার্ক') || name.includes('dark')) {
    return { bg: 'from-slate-800 via-slate-900 to-black', tag: 'কালো', initials: 'কালো' };
  }
  if (name.includes('বেগুনি') || name.includes('purple') || name.includes('ভায়োলেট') || name.includes('জাম')) {
    return { bg: 'from-purple-600 via-violet-600 to-purple-900', tag: 'বেগুনি', initials: 'বেগুনি' };
  }
  if (name.includes('সাদা') || name.includes('white') || name.includes('অফ হোয়াইট') || name.includes('ক্রিম')) {
    return { bg: 'from-slate-200 via-slate-300 to-amber-100 text-slate-800', tag: 'সাদা / ক্রিম', initials: 'সাদা' };
  }
  if (cat.includes('কাতান') || name.includes('কাতান') || cat.includes('সিল্ক')) {
    return { bg: 'from-fuchsia-600 via-rose-600 to-amber-600', tag: 'কাতান / সিল্ক', initials: 'কাতান' };
  }
  if (cat.includes('সুতি') || name.includes('সুতি') || cat.includes('কটন') || name.includes('cotton')) {
    return { bg: 'from-teal-500 via-cyan-600 to-blue-700', tag: 'সুতি কটন', initials: 'সুতি' };
  }
  if (cat.includes('জর্জেট') || name.includes('জর্জেট')) {
    return { bg: 'from-violet-500 via-purple-600 to-indigo-800', tag: 'জর্জেট', initials: 'জর্জেট' };
  }

  const palettes = [
    { bg: 'from-indigo-600 via-violet-600 to-purple-800', tag: 'পোশাক', initials: 'পো' },
    { bg: 'from-emerald-600 via-teal-700 to-slate-900', tag: 'বস্ত্রালয়', initials: 'ব' },
    { bg: 'from-amber-600 via-rose-600 to-pink-700', tag: 'ফ্যাব্রিক', initials: 'ফ্যা' },
    { bg: 'from-cyan-600 via-blue-700 to-indigo-900', tag: 'বস্ত্র', initials: 'বস্ত্র' }
  ];
  const charCode = (product?.ProductName || 'প').charCodeAt(0) || 0;
  const picked = palettes[charCode % palettes.length];
  return {
    ...picked,
    initials: (product?.ProductName || 'প').slice(0, 2)
  };
};

export default function ProductCatalog({ 
  products = [], 
  currencySymbol = '৳', 
  onAddToCart, 
  onUpdateCartQuantity,
  onRemoveFromCart,
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
  onDeleteProduct,
  onEditProduct,
  onOpenCartDrawer
}) {
  const isAdmin = Boolean(activeUser && (activeUser.Role === 'Admin' || activeUser.Role === 'Cashier'));
  const isCustomer = !isAdmin;
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fastkart কোয়ান্টিটি হ্রাস ও বৃদ্ধি হ্যান্ডলার
  const handleDecrementCart = (e, product) => {
    e.stopPropagation();
    const currentQty = getItemCartQuantity(product.ProductID);
    if (currentQty <= 1) {
      if (onRemoveFromCart) {
        onRemoveFromCart(product.ProductID);
      } else if (onUpdateCartQuantity) {
        onUpdateCartQuantity(product.ProductID, 0);
      }
    } else {
      if (onUpdateCartQuantity) {
        onUpdateCartQuantity(product.ProductID, currentQty - 1);
      }
    }
  };

  const handleIncrementCart = (e, product) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };
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

        {/* সমন্বিত আধুনিক ক্যাটাগরি ও স্টক ফিল্টার বার (Slim Unified Filter Bar) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar pt-0.5">
          {/* ক্যাটাগরি পিলস */}
          {categoriesWithCounts.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-1.5 border cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#0da487] text-white border-[#0da487] shadow-sm shadow-emerald-600/20 scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/90 hover:border-slate-300'
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

          {/* বিভাজক দাগ */}
          <div className="h-5 w-[1px] bg-slate-200 shrink-0 mx-1" />

          {/* স্টক স্ট্যাটাস ড্রপডাউন / কুইক পিলস */}
          {[
            { id: 'ALL', label: 'সব স্টক', count: safeProducts.length },
            { id: 'IN_STOCK', label: 'মজুদ আছে', count: stockMetrics.inStock },
            { id: 'LOW_STOCK', label: 'কম স্টক', count: stockMetrics.lowStock, isWarning: stockMetrics.lowStock > 0 },
            { id: 'OUT_OF_STOCK', label: 'শেষ', count: stockMetrics.outOfStock },
            ...(activeCoupons.length > 0
              ? [{ id: 'WITH_COUPON', label: '🏷️ অফার', count: stockMetrics.withCoupon }]
              : []),
          ].map((pill) => {
            const isSelected = stockFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStockFilter(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer border whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-100/70 hover:bg-slate-200/70 text-slate-600 border-slate-200/60'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`text-[9px] px-1 rounded-full font-black ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : pill.isWarning
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-white text-slate-600'
                }`}>
                  {pill.count}
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
                      : 'border-slate-200/90 hover:border-[#0da487] hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 active:scale-[0.99]'
                  }`}
                >
                  <div>
                    {/* Fastkart 1:1 Square Media Frame */}
                    <div className="relative w-full aspect-square mb-2.5 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {product.ImageUrl ? (
                        <img
                          src={product.ImageUrl}
                          alt={product.ImageCaption || product.ProductName}
                          title={product.ImageCaption || product.ProductName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.classList.add('bg-slate-100');
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (() => {
                        const style = getFabricPlaceholderStyle(product);
                        return (
                          <div className={`w-full h-full bg-gradient-to-br ${style.bg} flex flex-col items-center justify-center p-2 relative overflow-hidden transition-transform duration-500 group-hover:scale-105 select-none shadow-inner`}>
                            {/* সূক্ষ্ম টেক্সটাইল ফ্যাব্রিক টেক্সচার */}
                            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                            <div className="relative z-10 flex flex-col items-center justify-center text-center">
                              <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white font-black text-sm shadow-xs mb-1">
                                {style.initials}
                              </span>
                              <span className="text-[10px] font-bold text-white/90 drop-shadow-xs truncate max-w-full px-1">
                                {style.tag}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Single Smart Badge (Top-Left): Priority Coupon -> Variant -> Bundle */}
                      <div className="absolute top-2 left-2 z-10">
                        {hasCoupon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs">
                            <Tag className="w-2.5 h-2.5" />
                            <span>কুপন</span>
                          </span>
                        ) : product.HasVariants && product.Variants && product.Variants.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#0da487] text-white shadow-xs">
                            <Layers className="w-2.5 h-2.5" />
                            <span>{product.Variants.length} অপশন</span>
                          </span>
                        ) : product.IsBundle ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white shadow-xs">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>কম্বো</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Top-Right: Admin Hover Action Buttons or Expiry Warning */}
                      {isAdmin ? (
                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-xs border border-white/60">
                          {onEditProduct && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProduct(product);
                              }}
                              title={`'${product.ProductName}' এডিট করুন`}
                              className="p-1 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-[#0da487] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteProduct && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmProduct(product);
                              }}
                              title={`'${product.ProductName}' মুছে ফেলুন`}
                              className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        expiryInfo && expiryInfo.status !== 'GOOD' && expiryInfo.status !== 'NO_EXPIRY' && (
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
                        )
                      )}

                      {/* Floating Stock Badge (Bottom-Left) */}
                      <div className="absolute bottom-2 left-2 z-10">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600/95 text-white backdrop-blur-xs shadow-xs">
                            স্টক শেষ
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/95 text-white backdrop-blur-xs shadow-xs animate-pulse">
                            {isCustomer 
                              ? `সীমিত (${totalStock} ${product.Unit || 'Pcs'})` 
                              : `দোকান: ${stock} | গো: ${godownStock}`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/75 text-white backdrop-blur-xs shadow-2xs">
                            {isCustomer 
                              ? `${totalStock} ${product.Unit || 'Pcs'}${Number(product.YardsPerThan) > 0 ? ` (${totalStock * Number(product.YardsPerThan)} গজ)` : ''}` 
                              : `দোকান: ${stock}${godownStock > 0 ? ` | গো: ${godownStock}` : ''}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category & Unit Info */}
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

                    {/* Product Name */}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#0da487] transition-colors">
                      {product.ProductName}
                    </h3>
                  </div>

                  {/* Bottom: Price Block & Fastkart Morphing Button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                          {isFabricUnit(product.Unit) ? 'গজ বিক্রয় মূল্য' : 'বিক্রয় মূল্য'}
                        </span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className={`font-black text-slate-900 ${isFabricUnit(product.Unit) ? 'text-sm sm:text-base text-emerald-800' : 'text-xs sm:text-sm'}`}>
                            {formatCurrency(product.SellingPrice)}
                            {isFabricUnit(product.Unit) && <span className="text-[10px] font-bold text-slate-500 ml-0.5">/গজ</span>}
                          </span>
                          {product.MinSellingPrice && Number(product.MinSellingPrice) > 0 && Number(product.MinSellingPrice) < Number(product.SellingPrice) && isAdmin && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-1 py-0.2 rounded" title={`দামাদামির সর্বনিম্ন সীমা: ${formatCurrency(product.MinSellingPrice)}`}>
                              ফ্লোর: {formatCurrency(product.MinSellingPrice)}
                            </span>
                          )}
                          {product.WholesalePrice && Number(product.WholesalePrice) > 0 && isAdmin && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-1 py-0.2 rounded" title={`পাইকারি বিক্রয়মূল্য: ${formatCurrency(product.WholesalePrice)}`}>
                              পাইকারি: {formatCurrency(product.WholesalePrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ইউনিট ব্যাজ যদি থাকে */}
                      {product.Unit && !isFabricUnit(product.Unit) && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                          {product.Unit}
                        </span>
                      )}
                    </div>

                    {/* অ্যাকশন বাটন এরিয়া */}
                    <div className="flex items-center justify-end">
                      {!inStock ? (
                        <span className="text-[11px] font-bold text-slate-400 px-2.5 py-1 bg-slate-100 rounded-full">
                          অনুপলব্ধ
                        </span>
                      ) : product.HasVariants && product.Variants && product.Variants.length > 0 ? (
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
                          className="w-full py-1.5 px-3 rounded-xl transition-all border flex items-center justify-center space-x-1.5 text-xs font-bold active:scale-95 shadow-2xs cursor-pointer bg-emerald-50 hover:bg-[#0da487] text-[#0da487] hover:text-white border-emerald-200"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>ভ্যারিয়েন্ট বাছাই</span>
                        </button>
                      ) : isFabricUnit(product.Unit) ? (
                        /* গজ কাপড়ের জন্য কুইক গজ ট্যাপার */
                        <div className="w-full flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(product, 2, true)}
                            className="flex-1 py-1 px-1 rounded-lg text-[10px] font-black bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-200 transition-all cursor-pointer active:scale-90 text-center"
                            title="২ গজ সরাসরি কার্টে যোগ করুন"
                          >
                            ২গজ
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(product, 2.5, true)}
                            className="flex-1 py-1 px-1 rounded-lg text-[10px] font-black bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-200 transition-all cursor-pointer active:scale-90 text-center"
                            title="২.৫ গজ সরাসরি কার্টে যোগ করুন"
                          >
                            ২.৫গজ
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(product, 3, true)}
                            className="flex-1 py-1 px-1 rounded-lg text-[10px] font-black bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-200 transition-all cursor-pointer active:scale-90 text-center"
                            title="৩ গজ সরাসরি কার্টে যোগ করুন"
                          >
                            ৩গজ
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(product)}
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer active:scale-90 flex items-center justify-center gap-0.5 shrink-0 ${
                              cartQty > 0
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-amber-100 hover:bg-amber-600 text-amber-900 hover:text-white border-amber-300'
                            }`}
                            title="গজ-গিরা পরিমাপ ও কাস্টম কাটিং নির্বাচন করুন"
                          >
                            <Scissors className="w-3 h-3" />
                            <span>{cartQty > 0 ? `${cartQty}` : 'কাট'}</span>
                          </button>
                        </div>
                      ) : cartQty === 0 ? (
                        /* সাধারণ পণ্যের জন্য ফাস্টকার্ট "যোগ +" বাটন */
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIncrementCart(e, product);
                          }}
                          title="কার্টে যোগ করুন"
                          className="w-full py-1.5 px-3 rounded-xl transition-all duration-200 border flex items-center justify-center space-x-1.5 text-xs font-bold active:scale-95 shadow-2xs cursor-pointer bg-emerald-50 hover:bg-[#0da487] text-[#0da487] hover:text-white border-emerald-200 group-hover:bg-[#0da487] group-hover:text-white group-hover:border-transparent"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>কার্টে যোগ</span>
                        </button>
                      ) : (
                        /* একটিভ কোয়ান্টিটি স্টিপার [-] [qty] [+] */
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="w-full inline-flex items-center justify-between bg-[#0da487] text-white rounded-xl shadow-xs px-2 py-1 border border-[#0da487] animate-in zoom-in-75 duration-150"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleDecrementCart(e, product)}
                            title="সংখ্যা কমান"
                            className="p-1 hover:bg-black/15 rounded-lg transition-colors active:scale-90 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-black min-w-[20px] text-center select-none font-mono">
                            {cartQty} {product.Unit || 'Pcs'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleIncrementCart(e, product)}
                            title="সংখ্যা বাড়ান"
                            className="p-1 hover:bg-black/15 rounded-lg transition-colors active:scale-90 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
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
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer bg-emerald-50 hover:bg-[#0da487] text-[#0da487] hover:text-white border-emerald-200"
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
                                  <span>গজ-গিরা {cartQty > 0 ? `(${cartQty})` : ''}</span>
                                </button>
                              ) : cartQty === 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleIncrementCart(product);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer bg-emerald-50 hover:bg-[#0da487] text-[#0da487] hover:text-white border-emerald-200"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>যোগ</span>
                                </button>
                              ) : (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center bg-[#0da487] text-white rounded-lg shadow-xs px-1 py-0.5 border border-[#0da487]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleDecrementCart(product)}
                                    title="সংখ্যা কমান"
                                    className="p-1 hover:bg-black/15 rounded transition-colors active:scale-90 cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-1.5 text-xs font-black min-w-[18px] text-center select-none">
                                    {cartQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementCart(product)}
                                    title="সংখ্যা বাড়ান"
                                    className="p-1 hover:bg-black/15 rounded transition-colors active:scale-90 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">অনুপলব্ধ</span>
                            )}

                            {isAdmin && onEditProduct && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProduct(product);
                                }}
                                title={`'${product.ProductName}' এডিট করুন (Edit Product)`}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-[#0da487] transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isAdmin && onDeleteProduct && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmProduct(product);
                                }}
                                title={`'${product.ProductName}' মুছে ফেলুন (Delete)`}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* পণ্য ডিলিট নিশ্চিতকরণ মডাল (Delete Confirmation Modal) */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">পণ্যটি মুছে ফেলতে চান?</h3>
                <p className="text-xs text-slate-500">ডাটাবেস ও ফ্রন্টএন্ড উভয়েই আপডেট হবে</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-5 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm">{deleteConfirmProduct.ProductName}</div>
              <div className="font-mono text-[11px] text-slate-500">আইডি: {deleteConfirmProduct.ProductID} {deleteConfirmProduct.Barcode ? `| #${deleteConfirmProduct.Barcode}` : ''}</div>
              <p className="text-[11px] text-rose-600 font-semibold pt-1">
                ⚠️ এই পণ্যটি মুছে ফেলার সাথে সাথে গুগল শিট ডাটাবেস থেকে স্থায়ীভাবে ডিলিট হয়ে যাবে এবং ফ্রন্টএন্ড স্বয়ংক্রিয়ভাবে সিঙ্ক হয়ে যাবে।
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const pId = deleteConfirmProduct.ProductID;
                    setDeleteConfirmProduct(null);
                    await onDeleteProduct(pId);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, নিশ্চিত মুছে ফেলুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ফ্লোটিং কার্ট বাটন (Fastkart Floating Bottom Cart Pill) */}
      {cartItems.length > 0 && onOpenCartDrawer && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <button
            type="button"
            onClick={onOpenCartDrawer}
            className="flex items-center gap-3 px-4 sm:px-5 py-3 rounded-full bg-[#0da487] hover:bg-[#0b8b72] text-white shadow-xl shadow-emerald-600/30 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-2 bg-white text-[#0da487] text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs">
                {cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)}
              </span>
            </div>
            <div className="text-left leading-tight hidden xs:block">
              <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-wide">আপনার কার্ট</div>
              <div className="text-sm font-black text-white">
                {currencySymbol} {cartItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0).toLocaleString()}
              </div>
            </div>
            <span className="ml-1 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full group-hover:bg-white/30 transition-colors">
              দেখুন &rarr;
            </span>
          </button>
        </div>
      )}

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
