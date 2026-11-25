import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Package,
  X,
  Layers,
  RefreshCw,
  Settings,
  Database,
  Tag,
  LayoutGrid,
  List,
  Camera,
  CalendarClock,
  Scissors,
  PauseCircle,
  Edit3,
  Trash2,
  Receipt
} from 'lucide-react';
import BarcodeScannerModal from './BarcodeScannerModal';
import { calculateExpiryStatus } from '../services/storage';
import { isFabricUnit } from '../utils/fabricUtils';
import { StatusBadge, CatalogGridSkeleton, EmptyState, ConfirmDialog } from './ui';

/**
 * ProductCatalog - High-Speed POS Left Panel (Utilitarian Minimalism)
 * - ইনস্ট্যান্ট সার্চ (/) + বারকোড এন্টার-টু-অ্যাড
 * - ফ্ল্যাট হরাইজন্টাল ক্যাটাগরি ফিল্টার ট্যাব
 * - কমপ্যাক্ট প্রোডাক্ট গ্রিড: SKU (mono), স্টক ব্যাজ (In Stock / Low / Out), দাম (tabular-nums)
 * - গজ-গিরা ফেব্রিক কাটিং ও ভ্যারিয়েন্ট সাপোর্ট অক্ষুণ্ণ
 * - শূন্য গ্রেডিয়েন্ট, শূন্য backdrop-blur, শূন্য ভারী শ্যাডো, শূন্য ইমোজি
 */
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
  isLoading = false
}) {
  const isAdmin = Boolean(
    activeUser && ['Admin', 'Cashier', 'Manager', 'Salesman', 'Staff'].includes(activeUser.Role)
  );
  const isCustomer = !isAdmin;
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const searchInputRef = useRef(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const getItemCartQuantity = (productId) => {
    const item = cartItems.find((ci) => ci.productId === productId);
    return item ? item.quantity : 0;
  };

  const handleDecrementCart = (e, product) => {
    e.stopPropagation();
    const currentQty = getItemCartQuantity(product.ProductID);
    if (currentQty <= 1) {
      if (onRemoveFromCart) onRemoveFromCart(product.ProductID);
      else if (onUpdateCartQuantity) onUpdateCartQuantity(product.ProductID, 0);
    } else if (onUpdateCartQuantity) {
      onUpdateCartQuantity(product.ProductID, currentQty - 1);
    }
  };

  const handleIncrementCart = (e, product) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product);
  };

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

  const stockMetrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let withCoupon = 0;

    safeProducts.forEach((p) => {
      const stock = Number(p.StockQuantity || 0);
      const godown = Number(p.GodownStock || 0);
      const effectiveStock = isCustomer ? stock + godown : stock;
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

  const categoriesWithCounts = useMemo(() => {
    const map = new Map();
    safeProducts.forEach((p) => {
      const cat = p.Category || 'General';
      map.set(cat, (map.get(cat) || 0) + 1);
    });

    return [
      { id: 'All', label: 'All Items', count: safeProducts.length },
      ...Array.from(map.entries()).map(([cat, count]) => ({
        id: cat,
        label: cat,
        count,
      })),
    ];
  }, [safeProducts]);

  const filteredProducts = useMemo(() => {
    let list = safeProducts.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        (p.ProductName && p.ProductName.toLowerCase().includes(query)) ||
        (p.Barcode && p.Barcode.toString().toLowerCase().includes(query)) ||
        (p.ProductID && p.ProductID.toLowerCase().includes(query)) ||
        (p.Category && p.Category.toLowerCase().includes(query)) ||
        (p.SubCategory && p.SubCategory.toLowerCase().includes(query));

      const matchCategory = selectedCategory === 'All' ? true : p.Category === selectedCategory;

      const stock = Number(p.StockQuantity || 0);
      const godown = Number(p.GodownStock || 0);
      const effectiveStock = isCustomer ? stock + godown : stock;
      const minAlert = Number(p.MinStockAlert || 5);
      let matchStock = true;
      if (stockFilter === 'IN_STOCK') matchStock = effectiveStock > 0;
      else if (stockFilter === 'LOW_STOCK') matchStock = effectiveStock > 0 && effectiveStock <= minAlert;
      else if (stockFilter === 'OUT_OF_STOCK') matchStock = effectiveStock <= 0;
      else if (stockFilter === 'WITH_COUPON') matchStock = hasProductCoupon(p);

      return matchSearch && matchCategory && matchStock;
    });

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
  }, [safeProducts, searchQuery, selectedCategory, stockFilter, sortBy, activeCoupons, isCustomer]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const cleanCode = searchQuery.trim().toLowerCase();

      if (isAdmin && cleanCode.startsWith('inv')) {
        if (onOpenInvoiceLookup) {
          onOpenInvoiceLookup(searchQuery.trim());
          setSearchQuery('');
          return;
        }
      }

      let variantMatchedProduct = null;
      let matchedVariantObj = null;

      for (const prod of safeProducts) {
        if (prod.HasVariants && Array.isArray(prod.Variants)) {
          const v = prod.Variants.find(
            (varItem) => varItem.Barcode && String(varItem.Barcode).toLowerCase() === cleanCode
          );
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
        onAddToCart({
          ...variantMatchedProduct,
          SellingPrice: Number(matchedVariantObj.SellingPrice || variantMatchedProduct.SellingPrice || 0),
          CostPrice: Number(matchedVariantObj.CostPrice || variantMatchedProduct.CostPrice || 0),
          MinSellingPrice: Number(
            matchedVariantObj.MinSellingPrice !== undefined
              ? matchedVariantObj.MinSellingPrice
              : variantMatchedProduct.MinSellingPrice || 0
          ),
          Barcode: matchedVariantObj.Barcode,
          variantId: matchedVariantObj.VariantID,
          variantName: attrText || matchedVariantObj.VariantID,
          variantAttributes: matchedVariantObj.Attributes || {},
          _selectedVariant: matchedVariantObj,
        });
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

  const handleCameraScanSuccess = (code) => {
    const clean = String(code).trim().toLowerCase();
    setSearchQuery(clean);

    for (const prod of safeProducts) {
      if (prod.HasVariants && Array.isArray(prod.Variants)) {
        const v = prod.Variants.find(
          (varItem) => varItem.Barcode && String(varItem.Barcode).trim().toLowerCase() === clean
        );
        if (v && onAddToCart) {
          const attrText = v.Attributes
            ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
            : '';
          onAddToCart({
            ...prod,
            SellingPrice: Number(v.SellingPrice || prod.SellingPrice || 0),
            CostPrice: Number(v.CostPrice || prod.CostPrice || 0),
            Barcode: v.Barcode,
            variantId: v.VariantID,
            variantName: attrText || v.VariantID,
            variantAttributes: v.Attributes || {},
            _selectedVariant: v,
          });
          return;
        }
      }
    }

    const match = safeProducts.find(
      (p) =>
        (p.Barcode && String(p.Barcode).trim().toLowerCase() === clean) ||
        (p.ProductID && p.ProductID.trim().toLowerCase() === clean)
    );

    if (match) {
      if (match.HasVariants && onOpenVariantSelector) onOpenVariantSelector(match);
      else if (onOpenProductDetails) onOpenProductDetails(match);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] select-none">
      {/* ১. টপ সার্চ ও ফিল্টার কন্ট্রোল */}
      <div className="p-4 sm:p-5 bg-white border-b border-neutral-200/80 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* ইনস্ট্যান্ট সার্চ ও বারকোড ইনপুট */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="pos-product-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isCustomer
                  ? 'পণ্য খুঁজুন...'
                  : 'পণ্য, SKU বা বারকোড স্ক্যান/সার্চ করুন... (/)'
              }
              className="w-full min-h-[44px] md:min-h-[38px] pl-9 pr-24 py-2 text-xs sm:text-sm bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] transition-colors font-sans"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 rounded-sm text-[#737373] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
                  title="সার্চ মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#737373] bg-white border border-neutral-200 rounded-xs">
                  /
                </kbd>
              )}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="min-h-[32px] px-2 py-1 rounded-sm border border-neutral-200/80 bg-white hover:bg-neutral-100 text-[#111111] inline-flex items-center gap-1 cursor-pointer text-[11px] font-medium"
                title="ক্যামেরা বারকোড স্ক্যানার"
              >
                <Camera className="w-3.5 h-3.5 text-[#525252]" />
                <span className="hidden sm:inline font-mono">Scan</span>
              </button>
            </div>
          </div>

          {/* সর্টিং ও ভিউ টগল */}
          <div className="flex items-center gap-2 shrink-0">
            {heldCartsCount > 0 && (
              <button
                type="button"
                onClick={onOpenHeldCartsModal}
                className="min-h-[44px] md:min-h-[38px] px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-[#B45309] text-xs font-medium font-mono tabular-nums inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold ({heldCartsCount})</span>
              </button>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-[44px] md:min-h-[38px] text-xs bg-white border border-neutral-200/80 font-medium text-[#111111] py-1.5 px-2.5 rounded-md focus:outline-none focus:border-[#0F172A] cursor-pointer"
            >
              <option value="default">Default Order</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
            </select>

            <div className="flex items-center border border-neutral-200/80 rounded-md bg-[#FAFAFA] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`min-w-[36px] min-h-[34px] flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#111111] border border-neutral-200/80'
                    : 'text-[#737373] hover:text-[#111111]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`min-w-[36px] min-h-[34px] flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#111111] border border-neutral-200/80'
                    : 'text-[#737373] hover:text-[#111111]'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ইনভয়েস লুকআপ প্রম্পট (INV লিখলে) */}
        {isAdmin && searchQuery.trim().toLowerCase().startsWith('inv') && (
          <div className="p-3 bg-[#FAFAFA] border border-neutral-200/80 rounded-md flex items-center justify-between gap-2 text-xs">
            <span className="text-[#111111] flex items-center gap-2 font-medium">
              <Receipt className="w-4 h-4 text-[#525252]" />
              <span>
                ইনভয়েস <strong className="font-mono">{searchQuery.trim()}</strong> খুঁজছেন?
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenInvoiceLookup) onOpenInvoiceLookup(searchQuery.trim());
                setSearchQuery('');
              }}
              className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium cursor-pointer"
            >
              Open Invoice →
            </button>
          </div>
        )}

        {/* হরাইজন্টাল ক্যাটাগরি ও স্টক ফিল্টার ট্যাব */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          {categoriesWithCounts.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[36px] px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white hover:bg-neutral-100 text-[#525252] border-neutral-200/80'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1 rounded-xs font-mono tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-[#525252]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}

          <div className="h-5 w-px bg-neutral-200 shrink-0 mx-1" />

          {[
            { id: 'ALL', label: 'All', count: safeProducts.length },
            { id: 'IN_STOCK', label: 'In Stock', count: stockMetrics.inStock },
            { id: 'LOW_STOCK', label: 'Low Stock', count: stockMetrics.lowStock },
            { id: 'OUT_OF_STOCK', label: 'Out', count: stockMetrics.outOfStock },
            ...(activeCoupons.length > 0
              ? [{ id: 'WITH_COUPON', label: 'Offers', count: stockMetrics.withCoupon }]
              : []),
          ].map((pill) => {
            const isSelected = stockFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStockFilter(pill.id)}
                className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer border whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-[#FAFAFA] hover:bg-neutral-100 text-[#525252] border-neutral-200/80'
                }`}
              >
                <span>{pill.label}</span>
                <span className="text-[10px] font-mono tabular-nums opacity-75">
                  ({pill.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* সক্রিয় কুপন মিনিমাল ব্যানার */}
      {showPromoBanner && activeCoupons.length > 0 && (
        <div className="px-4 py-2 bg-white border-b border-neutral-200/80 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 truncate text-[#525252]">
            <Tag className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
            <span className="truncate font-medium text-[#111111]">Active Coupons:</span>
            <div className="flex items-center gap-1.5">
              {activeCoupons.slice(0, 3).map((c) => (
                <span
                  key={c.CouponID || c.CouponCode}
                  className="px-1.5 py-0.5 rounded-sm bg-neutral-100 border border-neutral-200 font-mono text-[10.5px] font-medium text-[#111111] uppercase"
                >
                  {c.CouponCode}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPromoBanner(false)}
            className="p-1 text-[#737373] hover:text-[#111111] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ২. প্রোডাক্ট গ্রিড / লিস্ট কন্টেইনার */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 min-h-0">
        {isLoading ? (
          <CatalogGridSkeleton count={8} />
        ) : filteredProducts.length === 0 ? (
          safeProducts.length === 0 ? (
            !apiUrl ? (
              <EmptyState
                icon={Database}
                title="গুগল শিট API কনফিগার করা হয়নি"
                description="Products ডাটাবেস থেকে পণ্য দেখতে Settings-এ গিয়ে Apps Script Web App URL সংযুক্ত করুন।"
                actionLabel={isAdmin && onOpenSettings ? 'Open Settings' : ''}
                onAction={onOpenSettings}
              />
            ) : (
              <EmptyState
                icon={Package}
                title="কোনো পণ্য পাওয়া যায়নি"
                description="আপনার গুগল শিটের Products ট্যাবে পণ্য যোগ করুন অথবা সিঙ্ক করুন।"
                actionLabel={onSync ? 'Refresh Sync' : ''}
                onAction={onSync}
              />
            )
          ) : (
            <EmptyState
              icon={Package}
              title="সার্চের সাথে কোনো পণ্য মেলেনি"
              description="সঠিক পণ্যের নাম, SKU বা বারকোড লিখুন অথবা ফিল্টার রিসেট করুন।"
              actionLabel={
                searchQuery || selectedCategory !== 'All' || stockFilter !== 'ALL'
                  ? 'Reset Filters'
                  : ''
              }
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setStockFilter('ALL');
              }}
            />
          )
        ) : viewMode === 'grid' ? (
          /* ভিউ ১: ফ্ল্যাট হাই-ডেনসিটি গ্রিড */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const stock = Number(product.StockQuantity || 0);
              const godownStock = Number(product.GodownStock || 0);
              const totalStock = stock + godownStock;
              const minAlert = Number(product.MinStockAlert || 5);
              const inStock = isCustomer ? totalStock > 0 : stock > 0;
              const isLowStock = isCustomer
                ? totalStock > 0 && totalStock <= minAlert
                : stock > 0 && stock <= minAlert;
              const isOutOfStock = !inStock;
              const cartQty = getItemCartQuantity(product.ProductID);
              const hasCoupon = hasProductCoupon(product);
              const expiryInfo = calculateExpiryStatus(product.ExpiryDate);

              return (
                <div
                  key={product.ProductID}
                  onClick={() => onOpenProductDetails && onOpenProductDetails(product)}
                  className={`group flex flex-col justify-between p-3 bg-white rounded-lg border transition-colors cursor-pointer ${
                    isOutOfStock
                      ? 'border-neutral-200/80 opacity-65'
                      : cartQty > 0
                      ? 'border-[#0F172A]'
                      : 'border-neutral-200/80 hover:border-neutral-400'
                  }`}
                >
                  <div>
                    {/* পরিচ্ছন্ন মিডিয়া বক্স (#F5F5F5, কোনো গ্রেডিয়েন্ট নয়) */}
                    <div className="relative w-full aspect-[4/3] mb-2.5 overflow-hidden rounded-md bg-[#F5F5F5] border border-neutral-200/60 flex items-center justify-center">
                      {product.ImageUrl ? (
                        <img
                          src={product.ImageUrl}
                          alt={product.ImageCaption || product.ProductName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#737373] p-2">
                          <Package className="w-5 h-5 stroke-[1.5] mb-1" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">
                            {(product.ProductName || 'PRD').slice(0, 2)}
                          </span>
                        </div>
                      )}

                      {/* সিঙ্গেল টপ-লেফট ব্যাজ */}
                      {hasCoupon ? (
                        <div className="absolute top-1.5 left-1.5">
                          <StatusBadge variant="warning">Promo</StatusBadge>
                        </div>
                      ) : product.HasVariants && product.Variants?.length > 0 ? (
                        <div className="absolute top-1.5 left-1.5">
                          <StatusBadge variant="neutral" mono>
                            {product.Variants.length} Vars
                          </StatusBadge>
                        </div>
                      ) : null}

                      {/* অ্যাডমিন কুইক এডিট/ডিলিট বা এক্সপায়ারি */}
                      {isAdmin ? (
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-neutral-200/80 rounded-sm p-0.5">
                          {onEditProduct && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProduct(product);
                              }}
                              title="Edit Product"
                              className="p-1 text-[#525252] hover:text-[#111111] hover:bg-neutral-100 rounded-xs cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteProduct && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmProduct(product);
                              }}
                              title="Delete Product"
                              className="p-1 text-[#525252] hover:text-[#B91C1C] hover:bg-red-50 rounded-xs cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        expiryInfo &&
                        expiryInfo.status !== 'GOOD' &&
                        expiryInfo.status !== 'NO_EXPIRY' && (
                          <div className="absolute top-1.5 right-1.5">
                            <StatusBadge variant={expiryInfo.status === 'EXPIRED' ? 'danger' : 'warning'}>
                              {expiryInfo.label}
                            </StatusBadge>
                          </div>
                        )
                      )}
                    </div>

                    {/* SKU ও স্টক ব্যাজ */}
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[10.5px] font-mono tabular-nums text-[#737373] truncate">
                        {product.Barcode ? `#${product.Barcode}` : product.ProductID}
                      </span>
                      <StatusBadge
                        variant={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}
                        mono
                      >
                        {isOutOfStock
                          ? 'Out (0)'
                          : isCustomer
                          ? `${totalStock} ${product.Unit || 'Pcs'}`
                          : `${stock}${godownStock > 0 ? `+${godownStock}` : ''}`}
                      </StatusBadge>
                    </div>

                    {/* পণ্যের নাম ও ক্যাটাগরি */}
                    <h3 className="text-xs sm:text-sm font-medium text-[#111111] leading-snug line-clamp-2 min-h-[2.25rem]">
                      {product.ProductName}
                    </h3>
                    <div className="text-[11px] text-[#737373] truncate mt-0.5">
                      {product.Category || 'General'}
                      {product.Unit && ` • ${product.Unit}`}
                    </div>
                  </div>

                  {/* দাম ও Add / Stepper */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/80 space-y-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-sm font-semibold font-mono tabular-nums text-[#111111]">
                        {formatCurrency(product.SellingPrice)}
                        {isFabricUnit(product.Unit) && (
                          <span className="text-[10px] font-sans font-normal text-[#737373]">/গজ</span>
                        )}
                      </span>
                      {isAdmin && product.WholesalePrice > 0 && (
                        <span className="text-[10px] font-mono tabular-nums text-[#737373]">
                          WS: {formatCurrency(product.WholesalePrice)}
                        </span>
                      )}
                    </div>

                    {!inStock ? (
                      <div className="w-full min-h-[44px] md:min-h-[34px] flex items-center justify-center rounded-md bg-neutral-100 text-[#737373] text-xs font-medium border border-neutral-200/80">
                        Out of Stock
                      </div>
                    ) : product.HasVariants && product.Variants?.length > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenVariantSelector) onOpenVariantSelector(product);
                          else onAddToCart(product);
                        }}
                        className="w-full min-h-[44px] md:min-h-[34px] px-3 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] text-[#111111] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Select Variant</span>
                      </button>
                    ) : isFabricUnit(product.Unit) ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {[2, 2.5, 3].map((yds) => (
                          <button
                            key={yds}
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(product, yds, true)}
                            className="flex-1 min-h-[44px] md:min-h-[34px] px-1 rounded-md text-[11px] font-mono tabular-nums font-medium bg-white hover:bg-[#0F172A] text-[#111111] hover:text-white border border-neutral-200/80 transition-colors cursor-pointer"
                          >
                            {yds}গজ
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => onAddToCart && onAddToCart(product)}
                          className={`min-h-[44px] md:min-h-[34px] px-2.5 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                            cartQty > 0
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-neutral-100 hover:bg-[#0F172A] text-[#111111] hover:text-white border-neutral-200/80'
                          }`}
                        >
                          <Scissors className="w-3 h-3" />
                          <span className="font-mono">{cartQty > 0 ? cartQty : 'Cut'}</span>
                        </button>
                      </div>
                    ) : cartQty === 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIncrementCart(e, product);
                        }}
                        className="w-full min-h-[44px] md:min-h-[34px] px-3 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] text-[#111111] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-between bg-[#0F172A] text-white rounded-md border border-[#0F172A] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDecrementCart(e, product)}
                          className="min-w-[44px] min-h-[44px] md:min-w-[34px] md:min-h-[34px] flex items-center justify-center hover:bg-white/15 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono tabular-nums font-medium">
                          {cartQty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleIncrementCart(e, product)}
                          className="min-w-[44px] min-h-[44px] md:min-w-[34px] md:min-h-[34px] flex items-center justify-center hover:bg-white/15 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ভিউ ২: কমপ্যাক্ট লিস্ট টেবিল */
          <div className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-neutral-200/80 text-[#525252] text-[11px] font-medium">
                    <th className="py-2.5 px-4">Product / SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Stock</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80">
                  {filteredProducts.map((product) => {
                    const stock = Number(product.StockQuantity || 0);
                    const godownStock = Number(product.GodownStock || 0);
                    const totalStock = stock + godownStock;
                    const minAlert = Number(product.MinStockAlert || 5);
                    const inStock = isCustomer ? totalStock > 0 : stock > 0;
                    const isLowStock = isCustomer
                      ? totalStock > 0 && totalStock <= minAlert
                      : stock > 0 && stock <= minAlert;
                    const cartQty = getItemCartQuantity(product.ProductID);

                    return (
                      <tr
                        key={product.ProductID}
                        onClick={() => onOpenProductDetails && onOpenProductDetails(product)}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-[#111111] truncate max-w-xs">
                            {product.ProductName}
                          </div>
                          <div className="text-[10.5px] font-mono tabular-nums text-[#737373]">
                            {product.ProductID} {product.Barcode ? `• #${product.Barcode}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#525252]">
                          {product.Category || 'General'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge
                            variant={!inStock ? 'danger' : isLowStock ? 'warning' : 'success'}
                            mono
                          >
                            {!inStock ? 'Out (0)' : `${stock}${godownStock > 0 ? ` (+${godownStock})` : ''}`}
                          </StatusBadge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#111111]">
                          {formatCurrency(product.SellingPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            {!inStock ? (
                              <span className="text-[11px] text-[#737373]">Unavailable</span>
                            ) : cartQty === 0 ? (
                              <button
                                type="button"
                                onClick={(e) => handleIncrementCart(e, product)}
                                className="min-h-[32px] px-2.5 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-[#0F172A] hover:text-white text-xs font-medium cursor-pointer"
                              >
                                Add
                              </button>
                            ) : (
                              <div className="inline-flex items-center bg-[#0F172A] text-white rounded-md">
                                <button
                                  type="button"
                                  onClick={(e) => handleDecrementCart(e, product)}
                                  className="px-2 py-1 hover:bg-white/15 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-1.5 text-xs font-mono tabular-nums">
                                  {cartQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleIncrementCart(e, product)}
                                  className="px-2 py-1 hover:bg-white/15 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {isAdmin && onEditProduct && (
                              <button
                                type="button"
                                onClick={() => onEditProduct(product)}
                                className="p-1.5 rounded-md border border-neutral-200/80 text-[#525252] hover:text-[#111111] hover:bg-neutral-100 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && onDeleteProduct && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmProduct(product)}
                                className="p-1.5 rounded-md border border-neutral-200/80 text-[#525252] hover:text-[#B91C1C] hover:bg-red-50 cursor-pointer"
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

      {/* পণ্য ডিলিট নিশ্চিতকরণ ডায়ালগ (Forgiving UX) */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmProduct)}
        onClose={() => !isDeleting && setDeleteConfirmProduct(null)}
        onConfirm={async () => {
          if (!deleteConfirmProduct) return;
          setIsDeleting(true);
          try {
            const pId = deleteConfirmProduct.ProductID;
            setDeleteConfirmProduct(null);
            await onDeleteProduct(pId);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="পণ্যটি মুছে ফেলতে চান?"
        message={
          deleteConfirmProduct
            ? `${deleteConfirmProduct.ProductName} (${deleteConfirmProduct.ProductID}) মুছে ফেললে এটি আপনার লোকাল এবং গুগল শিট ডাটাবেস থেকে স্থায়ীভাবে সরে যাবে।`
            : ''
        }
        confirmLabel="Delete Product"
        cancelLabel="Cancel"
        isDestructive={true}
        isProcessing={isDeleting}
      />

      {/* ক্যামেরা বারকোড স্ক্যানার মডাল */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleCameraScanSuccess}
        title="Barcode / SKU Scanner"
      />
    </div>
  );
}
