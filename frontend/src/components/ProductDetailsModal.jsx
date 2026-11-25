import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Barcode,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  ShoppingCart,
  Scale,
  PlusCircle,
  FileText,
  AlignLeft,
  Sparkles,
  Edit3,
  Trash2,
  Printer,
  Lock,
  Store,
  Warehouse,
  Ruler
} from 'lucide-react';
import BarcodeStickerModal from './BarcodeStickerModal';
import { isAdminUser, canViewCostPrice, formatMaskedCostPrice } from '../utils/permissionUtils';
import {
  isFabricUnit,
  isThanUnit,
  isFabricProduct,
  calculateThanBreakdown,
  formatFabricQuantity,
  getSafeRunningCutText,
  getColorHex,
} from '../utils/fabricUtils';

export default function ProductDetailsModal({
  isOpen,
  onClose,
  product,
  currencySymbol = '৳',
  onAddToCart,
  onQuickRestock,
  cartQuantity = 0,
  onEditProduct,
  onDeleteProduct,
  activeUser,
  settings = {},
}) {
  const isAdmin = isAdminUser(activeUser);
  const [quantity, setQuantity] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);

  // মডাল ওপেন হলে পরিমাণ ১ এ রিসেট
  React.useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const stock = Number(product.StockQuantity || 0);
  const godownStock = Number(product.GodownStock || 0);
  const minAlert = Number(product.MinStockAlert || 5);
  const selling = Number(product.SellingPrice || 0);
  
  const inStock = stock > 0;
  const isLowStock = inStock && stock <= minAlert;
  const isOutOfStock = !inStock;
  const remainingStockForCart = Math.max(0, stock - cartQuantity);

  const isFabric = isFabricProduct(product);
  const yardsPerThan = Number(product.YardsPerThan) || (isFabric ? 20 : 0);
  const hasThanSystem = isFabric && (yardsPerThan > 0 || isThanUnit(product.Unit));

  // ফেব্রিক পণ্যের জন্য নির্ভুল গজ ও থান বিশ্লেষণ
  const fabricData = (() => {
    if (!isFabric) return null;

    // দোকানে মজুত বিশ্লেষণ (দোকানের StockQuantity গজে থাকে)
    const shopBreakdown = hasThanSystem
      ? calculateThanBreakdown(stock, yardsPerThan)
      : null;

    // গোডাউন বিশ্লেষণ (গোডাউনের স্টক সংখ্যা হলো আস্ত থান)
    const godownThans = hasThanSystem ? godownStock : 0;
    const godownYards = hasThanSystem ? Math.round(godownThans * yardsPerThan * 10000) / 10000 : 0;

    // মোট কাপড়ের মজুত (দোকানের গজ + গোডাউনের গজ)
    const totalYards = hasThanSystem ? Math.round((stock + godownYards) * 10000) / 10000 : stock;
    const totalBreakdown = hasThanSystem ? calculateThanBreakdown(totalYards, yardsPerThan) : null;

    return {
      yardsPerThan,
      shopYards: stock,
      shopBreakdown,
      godownThans,
      godownYards,
      totalYards,
      totalBreakdown,
    };
  })();

  // পণ্য বৈশিষ্ট্যসমূহ তালিকা
  const productFeatures = Array.isArray(product.Features)
    ? product.Features.filter(Boolean)
    : typeof product.Features === 'string' && product.Features.trim()
    ? product.Features.split('|').map((f) => f.trim()).filter(Boolean)
    : [];

  const handleIncrement = () => {
    if (quantity < remainingStockForCart) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCartClick = () => {
    if (remainingStockForCart <= 0) return;
    if (onAddToCart) {
      onAddToCart(product, quantity);
      onClose();
    }
  };

  const handleRestockClick = () => {
    if (onQuickRestock) {
      onClose();
      onQuickRestock(product);
    }
  };

  const handleEditClick = () => {
    if (onEditProduct) {
      onClose();
      onEditProduct(product);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteProduct) return;
    setIsDeleting(true);
    try {
      await onDeleteProduct(product.ProductID);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      alert(`পণ্য মুছতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // তারিখ ফরম্যাট
  const formatDate = (isoString) => {
    if (!isoString) return 'প্রযোজ্য নয়';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg border border-neutral-200/80 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* হেডার */}
        <div className="px-6 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0F172A] flex items-center justify-center text-white shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#111111] leading-tight">পণ্যের বিস্তারিত বিবরণ</h2>
              <p className="text-xs text-[#525252] font-mono tabular-nums">আইডি: {product.ProductID}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {isAdmin && (
              <>
                {/* এডিট বাটন */}
                <button
                  type="button"
                  onClick={handleEditClick}
                  title="পণ্য সম্পাদনা করুন"
                  className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#0F172A]" />
                  <span>এডিট</span>
                </button>

                {/* ডিলিট বাটন */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="পণ্যটি মুছে ফেলুন"
                  className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-red-50 hover:border-red-200 text-[#111111] hover:text-[#B91C1C] text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#B91C1C]" />
                  <span>মুছুন</span>
                </button>

                <span className="w-px h-5 bg-neutral-300 mx-1" />
              </>
            )}

            {/* ক্লোজ বাটন */}
            <button
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="overflow-y-auto p-6 space-y-5">
          
          {/* টপ সেকশন: ছবি এবং প্রধান পরিচিতি */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            
            {/* ছবি প্রিভিউ ও ক্যাপশন */}
            <div className="sm:col-span-5 flex flex-col space-y-2">
              <div className="bg-[#F5F5F5] rounded-lg overflow-hidden border border-neutral-200/80 aspect-square flex items-center justify-center relative">
                {product.ImageUrl ? (
                  <img
                    src={product.ImageUrl}
                    alt={product.ImageCaption || product.ProductName}
                    title={product.ImageCaption || product.ProductName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center text-[#737373]"><svg class="w-12 h-12 stroke-1 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">ছবি লোড হয়নি</span></div>';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#737373] p-4 text-center">
                    <Package className="w-16 h-16 stroke-1 text-neutral-300 mb-2" />
                    <span className="text-xs font-medium">কোনো ছবি যুক্ত করা হয়নি</span>
                  </div>
                )}

                {/* স্টক ব্যাজ ওভারলে */}
                <div className="absolute top-2.5 right-2.5">
                {isOutOfStock ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#B91C1C] text-white">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    স্টক নেই
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#B45309] text-white">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    কম স্টক
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#15803D] text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    মজুত আছে
                  </span>
                )}
              </div>
            </div>

            {/* ছবির ক্যাপশন (SEO Alt Text প্রদর্শন) */}
            {product.ImageCaption && (
              <p className="text-[11px] text-[#525252] italic text-center px-2 bg-[#FAFAFA] py-1 rounded-md border border-neutral-200/80">
                {product.ImageCaption}
              </p>
            )}
          </div>

            {/* টাইটেল এবং প্রাথমিক তথ্য */}
            <div className="sm:col-span-7 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80">
                    {product.Category || 'General'}
                  </span>
                  {product.SubCategory && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#FAFAFA] text-[#525252] border border-neutral-200/80">
                      {product.SubCategory}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium font-mono tabular-nums bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {isFabric ? `একক: ${product.Unit || 'গজ'}${yardsPerThan > 0 ? ` (${yardsPerThan} গজ/থান)` : ''}` : `একক: ${product.Unit || 'Pcs'}`}
                  </span>
                </div>

                <h1 className="text-xl font-semibold tracking-tight text-[#111111] leading-snug">
                  {product.ProductName}
                </h1>
              </div>

              {/* বারকোড কার্ড */}
              <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-[#525252] min-w-0">
                  <Barcode className="w-4 h-4 text-[#737373] shrink-0" />
                  <span className="text-xs font-medium shrink-0">বারকোড / SKU:</span>
                  <span className="font-mono tabular-nums text-xs font-bold text-[#111111] bg-white px-2 py-0.5 rounded-md border border-neutral-200/80 truncate">
                    {product.Barcode ? product.Barcode : 'নির্ধারিত নেই'}
                  </span>
                </div>
                {product.Barcode && (
                  <button
                    type="button"
                    onClick={() => setIsStickerModalOpen(true)}
                    className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                    title="এই পণ্যের বারকোড স্টিকার প্রিন্ট করুন"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>স্টিকার প্রিন্ট</span>
                  </button>
                )}
              </div>

              {/* বিক্রয়মূল্য ও মজুত হাইলাইট */}
              <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-xs text-[#525252] font-medium block">
                    {isFabric ? 'বিক্রয়মূল্য (প্রতি গজ)' : `বিক্রয়মূল্য (প্রতি ${product.Unit || 'একক'})`}
                  </span>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className="text-sm font-semibold text-[#525252]">{currencySymbol}</span>
                    <span className="text-2xl font-bold font-mono tabular-nums text-[#111111]">
                      {selling.toFixed(2)}
                    </span>
                    {isFabric && (
                      <span className="text-xs font-semibold text-[#525252] ml-0.5">/গজ</span>
                    )}
                  </div>
                  {isFabric && yardsPerThan > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-[#525252] font-semibold block mt-0.5">
                      ১ থান ({yardsPerThan} গজ) = {currencySymbol}{(selling * yardsPerThan).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* ফেজ ৩: ক্যাশিয়ারের জন্য কেনা দাম সুরক্ষা */}
                {canViewCostPrice(activeUser) ? (
                  <div className="text-center px-3 border-x border-neutral-200/80">
                    <span className="text-[11px] text-[#525252] font-semibold block">
                      {isFabric ? 'কেনা দাম (গজ)' : 'কেনা দাম'}
                    </span>
                    <span className="text-base font-bold text-[#111111] font-mono tabular-nums">
                      {currencySymbol}{Number(product.CostPrice || 0).toFixed(2)}
                    </span>
                    {isFabric && yardsPerThan > 0 && (
                      <span className="text-[10px] font-mono tabular-nums text-[#737373] font-medium block">
                        থান: {currencySymbol}{(Number(product.CostPrice || 0) * yardsPerThan).toFixed(2)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-center px-3 border-x border-neutral-200/80">
                    <span className="text-[10px] text-[#737373] font-semibold block">কেনা দাম</span>
                    <span className="text-xs font-semibold text-[#737373] inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>সুরক্ষিত</span>
                    </span>
                  </div>
                )}

                {/* পাইকারি বিক্রয়মূল্য */}
                {Number(product.WholesalePrice || product.wholesalePrice) > 0 && (
                  <div className="text-center px-3 border-r border-neutral-200/80">
                    <span className="text-[11px] text-[#525252] font-semibold block">
                      {isFabric ? 'পাইকারি দর (গজ)' : 'পাইকারি দর'}
                    </span>
                    <span className="text-base font-bold text-[#111111] font-mono tabular-nums">
                      {currencySymbol}{Number(product.WholesalePrice || product.wholesalePrice).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="text-right">
                  <span className="text-xs text-[#525252] font-medium block">দোকানে মজুত</span>
                  {isFabric ? (
                    <div>
                      <span className={`text-xl font-bold font-mono tabular-nums block ${isOutOfStock ? 'text-[#B91C1C]' : isLowStock ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                        {stock} <span className="text-xs font-sans font-semibold text-[#525252]">গজ</span>
                      </span>
                      {hasThanSystem && fabricData?.shopBreakdown && (
                        <span className="text-[10px] font-mono tabular-nums font-semibold text-[#525252] block truncate max-w-[150px]" title={fabricData.shopBreakdown.displayText}>
                          {fabricData.shopBreakdown.fullThans > 0 
                            ? `${fabricData.shopBreakdown.fullThans} থান + ${getSafeRunningCutText(fabricData.shopBreakdown)}` 
                            : getSafeRunningCutText(fabricData.shopBreakdown) || `${stock} গজ`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={`text-xl font-bold font-mono tabular-nums block ${isOutOfStock ? 'text-[#B91C1C]' : isLowStock ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                      {stock} <span className="text-xs font-sans font-semibold text-[#525252]">{product.Unit || 'Pcs'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* গোডাউন বনাম দোকান স্টক বিভাজন */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-200/80">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <span className="text-[10px] font-semibold text-[#15803D] inline-flex items-center justify-center gap-1">
                    <Store className="w-3 h-3" />
                    <span>দোকান স্টক</span>
                  </span>
                  {isFabric ? (
                    <>
                      <span className="text-base font-bold font-mono tabular-nums text-[#15803D] block">
                        {stock} <span className="text-[10px] font-sans font-medium">গজ</span>
                      </span>
                      {hasThanSystem && fabricData?.shopBreakdown && (
                        <span className="text-[10px] font-mono tabular-nums font-semibold text-[#15803D] block truncate" title={fabricData.shopBreakdown.displayText}>
                          {fabricData.shopBreakdown.fullThans > 0 
                            ? `${fabricData.shopBreakdown.fullThans} থান + ${getSafeRunningCutText(fabricData.shopBreakdown)}` 
                            : getSafeRunningCutText(fabricData.shopBreakdown) || `${stock} গজ`}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base font-bold font-mono tabular-nums text-[#15803D] block">
                      {stock} <span className="text-[10px] font-sans font-medium">{product.Unit || 'Pcs'}</span>
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-[#F5F5F5] rounded-lg border border-neutral-200/80 text-center">
                  <span className="text-[10px] font-semibold text-[#111111] inline-flex items-center justify-center gap-1">
                    <Warehouse className="w-3 h-3 text-[#0F172A]" />
                    <span>গোডাউন স্টক</span>
                  </span>
                  {isFabric ? (
                    <>
                      <span className="text-base font-bold font-mono tabular-nums text-[#111111] block">
                        {godownStock} <span className="text-[10px] font-sans font-medium text-[#525252]">থান</span>
                      </span>
                      {hasThanSystem && (
                        <span className="text-[10px] font-mono tabular-nums font-semibold text-[#525252] block">
                          ({fabricData?.godownYards || 0} গজ)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base font-bold font-mono tabular-nums text-[#111111] block">
                      {godownStock} <span className="text-[10px] font-sans font-medium text-[#525252]">{product.Unit || 'Pcs'}</span>
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 text-center">
                  <span className="text-[10px] font-semibold text-[#525252] inline-flex items-center justify-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>মোট স্টক</span>
                  </span>
                  {isFabric ? (
                    <>
                      <span className="text-base font-bold font-mono tabular-nums text-[#111111] block">
                        {fabricData?.totalYards || 0} <span className="text-[10px] font-sans font-medium text-[#525252]">গজ</span>
                      </span>
                      {hasThanSystem && fabricData?.totalBreakdown && (
                        <span className="text-[10px] font-mono tabular-nums font-semibold text-[#525252] block truncate" title={`${fabricData.totalBreakdown.fullThans} থান + ${getSafeRunningCutText(fabricData.totalBreakdown)}`}>
                          {fabricData.totalBreakdown.fullThans > 0 
                            ? `${fabricData.totalBreakdown.fullThans} থান + ${getSafeRunningCutText(fabricData.totalBreakdown)}` 
                            : getSafeRunningCutText(fabricData.totalBreakdown) || `${fabricData.totalYards} গজ`}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base font-bold font-mono tabular-nums text-[#111111] block">
                      {stock + godownStock} <span className="text-[10px] font-sans font-medium text-[#525252]">{product.Unit || 'Pcs'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* কাপড় পরিমাপ ও থান-গজ বিশদ বিবরণ */}
              {hasThanSystem && fabricData && (
                <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-200 mt-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[#B45309] font-semibold border-b border-amber-200 pb-1.5">
                    <span className="flex items-center space-x-1.5">
                      <Ruler className="w-3.5 h-3.5 text-[#B45309]" />
                      <span>কাপড় পরিমাপ (থান ও গজ বিশ্লেষণ)</span>
                    </span>
                    <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 text-[#B45309] font-semibold">
                      বস্ত্রালয় হিসাব
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-md border border-amber-200">
                      <span className="text-[10px] text-[#B45309] font-semibold block">প্রতি থানে গজ</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-[#111111] block">
                        {fabricData.yardsPerThan} গজ
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-md border border-amber-200">
                      <span className="text-[10px] text-[#B45309] font-semibold block">দোকানে গজ</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-[#111111] block">
                        {fabricData.shopYards} গজ
                      </span>
                      <span className="text-[9px] font-mono tabular-nums text-[#737373] font-medium block truncate" title={fabricData.shopBreakdown?.displayText}>
                        ({fabricData.shopBreakdown?.displayText || `${fabricData.shopYards} গজ`})
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-md border border-amber-200">
                      <span className="text-[10px] text-[#B45309] font-semibold block">গোডাউনে গজ</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-[#111111] block">
                        {fabricData.godownYards} গজ
                      </span>
                      <span className="text-[9px] font-mono tabular-nums text-[#737373] font-medium block">
                        ({fabricData.godownThans} থান আস্ত)
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-100/70 rounded-md border border-amber-200 flex items-center justify-between font-semibold text-[#111111]">
                    <span className="text-[11px] text-[#B45309]">মোট কাপড়ের মজুদ (দোকান + গোডাউন):</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#111111]">
                      {fabricData.totalYards} গজ
                      <span className="text-[10px] font-normal text-[#B45309] ml-1.5">
                        ({fabricData.totalBreakdown?.fullThans || 0} থান + {getSafeRunningCutText(fabricData.totalBreakdown) || '০ গজ'})
                      </span>
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ব্যাচ নম্বর ও মেয়াদোত্তীর্ণ তথ্য (Phase 6) */}
          {(product.BatchNumber || product.ExpiryDate || product.MfgDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 text-xs">
              {product.BatchNumber && (
                <div>
                  <span className="text-[10px] font-semibold text-[#737373] block uppercase">ব্যাচ নম্বর</span>
                  <span className="font-mono tabular-nums font-bold text-[#111111]">{product.BatchNumber}</span>
                </div>
              )}
              {product.MfgDate && (
                <div>
                  <span className="text-[10px] font-semibold text-[#737373] block uppercase">উৎপাদন তারিখ</span>
                  <span className="font-mono tabular-nums font-semibold text-[#111111]">{product.MfgDate}</span>
                </div>
              )}
              {product.ExpiryDate && (
                <div>
                  <span className="text-[10px] font-semibold text-[#737373] block uppercase">মেয়াদোত্তীর্ণ তারিখ</span>
                  <span className="font-mono tabular-nums font-bold text-[#B91C1C]">{product.ExpiryDate}</span>
                </div>
              )}
            </div>
          )}

          {/* ভ্যারিয়েন্ট তালিকা (Phase 6) */}
          {product.HasVariants && Array.isArray(product.Variants) && product.Variants.length > 0 && (
            <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0F172A]" />
                  <span>সাইজ ও কালার ভ্যারিয়েন্ট তালিকা (<span className="font-mono tabular-nums">{product.Variants.length}</span> টি অপশন)</span>
                </span>
                <span className="text-[10px] font-semibold text-[#525252]">
                  {isFabric ? 'দোকান (গজ) | গোডাউন (থান)' : 'দোকান ও গোডাউন স্টক'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.Variants.map((v, idx) => {
                  const vStock = Number(v.StockQuantity || 0);
                  const vGodown = Number(v.GodownStock || 0);
                  const vSelling = Number(v.SellingPrice || product.SellingPrice || 0);
                  const vColor = v.Color || (v.Attributes && (v.Attributes.Color || v.Attributes.color || v.Attributes['রং'])) || null;
                  const hexColor = vColor ? getColorHex(vColor) : null;
                  const label = (v.Attributes && typeof v.Attributes === 'object' && Object.keys(v.Attributes).length > 0)
                    ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
                    : ([v.Color, v.Size, v.Weight, v.Title].filter(Boolean).join(' / ') || v.VariantName || `ভ্যারিয়েন্ট #${idx + 1}`);

                  let vShopDisplay = '';
                  let vGodownDisplay = '';
                  let vTotalDisplay = '';

                  if (isFabric) {
                    const vGodownYards = hasThanSystem ? vGodown * yardsPerThan : 0;
                    const vTotalYards = Math.round((vStock + vGodownYards) * 10000) / 10000;
                    const vBreakdown = hasThanSystem ? calculateThanBreakdown(vStock, yardsPerThan) : null;
                    const vTotalBreakdown = hasThanSystem ? calculateThanBreakdown(vTotalYards, yardsPerThan) : null;

                    vShopDisplay = `${vStock} গজ`;
                    if (hasThanSystem && vBreakdown && vBreakdown.fullThans > 0) {
                      vShopDisplay += ` (${vBreakdown.fullThans}থান + ${getSafeRunningCutText(vBreakdown)})`;
                    }
                    vGodownDisplay = `${vGodown} থান (${vGodownYards} গজ)`;
                    vTotalDisplay = `${vTotalYards} গজ`;
                    if (hasThanSystem && vTotalBreakdown && vTotalBreakdown.fullThans > 0) {
                      vTotalDisplay += ` (${vTotalBreakdown.fullThans}থান + ${getSafeRunningCutText(vTotalBreakdown)})`;
                    }
                  } else {
                    vShopDisplay = `${vStock} ${product.Unit || 'একক'}`;
                    vGodownDisplay = `${vGodown} ${product.Unit || 'একক'}`;
                    vTotalDisplay = `${vStock + vGodown} ${product.Unit || 'একক'}`;
                  }

                  return (
                    <div key={v.VariantID || idx} className="p-2.5 bg-white rounded-lg border border-neutral-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          {hexColor && (
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 inline-block"
                              style={{ backgroundColor: hexColor }}
                              title={`রং: ${vColor}`}
                            />
                          )}
                          <span className="font-semibold text-[#111111] text-xs truncate">
                            {label}
                          </span>
                        </div>
                        <span className="font-bold font-mono tabular-nums text-[#111111] text-xs">
                          {currencySymbol}{vSelling.toFixed(2)}
                          {isFabric && <span className="text-[9px] text-[#737373] font-sans font-normal ml-0.5">/গজ</span>}
                        </span>
                      </div>

                      {v.Barcode && (
                        <div className="font-mono tabular-nums text-[10px] text-[#737373]">
                          #{v.Barcode}
                        </div>
                      )}

                      <div className="pt-1 border-t border-neutral-200/80 grid grid-cols-2 gap-1 text-[11px]">
                        <div className="text-[#15803D]">
                          <span className="text-[9px] text-[#737373] font-semibold block uppercase">দোকান মজুত:</span>
                          <span className="font-bold font-mono tabular-nums">{vShopDisplay}</span>
                        </div>
                        <div className="text-[#111111] text-right">
                          <span className="text-[9px] text-[#737373] font-semibold block uppercase">গোডাউন ব্যাকআপ:</span>
                          <span className="font-bold font-mono tabular-nums">{vGodownDisplay}</span>
                        </div>
                      </div>

                      <div className="text-[10px] font-semibold text-[#525252] bg-[#FAFAFA] px-2 py-0.5 rounded-md border border-neutral-200/80 flex items-center justify-between">
                        <span>মোট মজুত:</span>
                        <span className="font-bold font-mono tabular-nums text-[#111111]">{vTotalDisplay}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* কম্বো প্যাকেজ কম্পোনেন্ট তালিকা (Phase 6) */}
          {product.IsBundle && Array.isArray(product.BundleItems) && product.BundleItems.length > 0 && (
            <div className="p-3.5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 space-y-2">
              <span className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0F172A]" />
                <span>প্যাকেজ উপাদান (<span className="font-mono tabular-nums">{product.BundleItems.length}</span> টি পণ্য অন্তর্ভুক্ত)</span>
              </span>
              <div className="space-y-1.5">
                {product.BundleItems.map((bi, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-md border border-neutral-200/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#111111]">{bi.productName || bi.ProductName || bi.productId}</span>
                    <span className="font-bold font-mono tabular-nums text-[#111111] bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-neutral-200/80">
                      x{bi.quantity || bi.Quantity || 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* সংক্ষিপ্ত বিবরণ (Short Description) */}
          {product.ShortDescription && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wide block mb-1 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-[#B45309]" />
                <span>সংক্ষিপ্ত বিবরণ</span>
              </span>
              <p className="text-xs text-[#111111] leading-relaxed font-normal">
                {product.ShortDescription}
              </p>
            </div>
          )}

          {/* মাল্টি ফিচার / পণ্যের বৈশিষ্ট্য (Features) */}
          {productFeatures.length > 0 && (
            <div className="p-4 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 space-y-2.5">
              <h4 className="text-xs font-semibold tracking-tight text-[#111111] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0F172A]" />
                <span>পণ্যের প্রধান বৈশিষ্ট্যসমূহ (Key Features)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {productFeatures.map((feat, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start space-x-2 text-xs text-[#111111] bg-white p-2.5 rounded-md border border-neutral-200/80"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
                    <span className="font-medium leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* বিস্তারিত বিবরণ (Description) - রিচ টেক্সট ফরম্যাটেড রেন্ডারিং */}
          {product.Description ? (
            <div className="p-4 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 space-y-2">
              <h4 className="text-xs font-semibold tracking-tight text-[#111111] flex items-center space-x-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-[#0F172A]" />
                <span>বিস্তারিত বিবরণ (Description)</span>
              </h4>
              {/<[a-z][\s\S]*>/i.test(product.Description) ? (
                <div 
                  className="rich-text-content text-xs text-[#111111] leading-relaxed font-normal prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_a]:text-[#0F172A] [&_a]:underline [&_a]:font-medium [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: product.Description }}
                />
              ) : (
                <p className="text-xs text-[#111111] whitespace-pre-line leading-relaxed font-normal">
                  {product.Description}
                </p>
              )}
            </div>
          ) : (
            !product.ShortDescription && productFeatures.length === 0 && (
              <div className="p-4 bg-[#FAFAFA] rounded-lg border border-dashed border-neutral-300 text-center text-xs text-[#737373]">
                এই পণ্যের কোনো বিস্তারিত বিবরণ বা অতিরিক্ত বৈশিষ্ট্য এখনো যুক্ত করা হয়নি।
              </div>
            )
          )}

          {/* অতিরিক্ত তথ্য ও টাইমস্ট্যাম্প */}
          <div className="text-xs text-[#525252] space-y-1.5 pt-2 border-t border-neutral-200/80 flex flex-wrap justify-between items-center">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#737373]" />
              <span>যুক্ত করার সময়: <strong>{formatDate(product.CreatedAt)}</strong></span>
            </div>
            {cartQuantity > 0 && (
              <span className="text-[#111111] font-medium font-mono tabular-nums">
                কার্টে ইতিমধ্যে যুক্ত আছে: <strong>{cartQuantity} {product.Unit || 'Pcs'}</strong>
              </span>
            )}
          </div>

        </div>

        {/* ফুটার অ্যাকশন বাটন */}
        <div className={`px-6 py-4 border-t border-neutral-200/80 bg-[#FAFAFA] flex flex-col sm:flex-row items-center gap-3 ${isAdmin ? 'justify-between' : 'justify-end'}`}>
          
          {/* কুইক রিস্টক বাটন (শুধু এডমিনদের জন্য) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleRestockClick}
              className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto px-4 py-2 border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#0F172A]" />
              <span>নতুন স্টক ইনপুট</span>
            </button>
          )}

          {/* কার্টে যোগ করার সেকশন */}
          <div className="w-full sm:w-auto flex items-center space-x-3 justify-end">
            
            {inStock && remainingStockForCart > 0 && !product.HasVariants && (
              <div className="flex items-center border border-neutral-200/80 rounded-md bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="min-h-[44px] sm:min-h-[36px] px-3 text-[#525252] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-9 text-center text-xs font-bold text-[#111111] font-mono tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= remainingStockForCart}
                  className="min-h-[44px] sm:min-h-[36px] px-3 text-[#525252] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddToCartClick}
              disabled={isOutOfStock || remainingStockForCart <= 0}
              className="min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-initial px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold font-mono tabular-nums rounded-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {isOutOfStock
                  ? 'স্টক নেই'
                  : remainingStockForCart <= 0
                  ? 'কার্টে সীমা শেষ'
                  : product.HasVariants
                  ? 'ভ্যারিয়েন্ট বাছাই ও কার্টে যোগ'
                  : `কার্টে যোগ করুন (${currencySymbol} ${(selling * quantity).toFixed(2)})`}
              </span>
            </button>
          </div>

        </div>

      </div>

      {/* ডিলিট কনফার্মেশন মডাল ডায়ালগ */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[70] bg-neutral-900/40 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-lg border border-neutral-200/80 max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-[#B91C1C]">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#B91C1C]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-tight text-[#111111]">পণ্যটি মুছে ফেলতে চান?</h4>
                <p className="text-xs text-[#525252] mt-0.5">ডাটাবেস থেকে স্থায়ীভাবে মুছে যাবে।</p>
              </div>
            </div>

            <p className="text-xs text-[#525252] bg-[#FAFAFA] p-3 rounded-md border border-neutral-200/80 leading-relaxed">
              আপনি কি নিশ্চিতভাবে <strong className="text-[#111111]">"{product.ProductName}"</strong> পণ্যটি মুছে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে আনা যাবে না।
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 border border-neutral-200/80 bg-white text-[#525252] hover:text-[#111111] text-xs font-semibold rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-[#B91C1C] hover:bg-red-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, নিশ্চিত মুছুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* বারকোড স্টিকার প্রিন্ট ও প্রিভিউ মডাল */}
      {isStickerModalOpen && (
        <BarcodeStickerModal
          isOpen={isStickerModalOpen}
          onClose={() => setIsStickerModalOpen(false)}
          product={product}
          initialQuantity={Number(product.StockQuantity) || 10}
          currencySymbol={currencySymbol}
          storeName={settings?.StoreName || 'Pabna Bostraloy'}
        />
      )}

    </div>
  );
}
