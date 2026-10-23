import React, { useState, useMemo } from 'react';
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
  Printer
} from 'lucide-react';
import BarcodeStickerModal from './BarcodeStickerModal';
import { isAdminUser, canViewCostPrice, formatMaskedCostPrice } from '../utils/permissionUtils';

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
  const minAlert = Number(product.MinStockAlert || 5);
  const selling = Number(product.SellingPrice || 0);
  
  const inStock = stock > 0;
  const isLowStock = inStock && stock <= minAlert;
  const isOutOfStock = !inStock;
  const remainingStockForCart = Math.max(0, stock - cartQuantity);

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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* হেডার */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 leading-tight">পণ্যের বিস্তারিত বিবরণ</h2>
              <p className="text-xs text-slate-500 font-mono">আইডি: {product.ProductID}</p>
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
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-semibold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>এডিট</span>
                </button>

                {/* ডিলিট বাটন */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="পণ্যটি মুছে ফেলুন"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-semibold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>মুছুন</span>
                </button>

                <span className="w-px h-5 bg-slate-300 mx-1" />
              </>
            )}

            {/* ক্লোজ বাটন */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
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
              <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-square flex items-center justify-center relative shadow-2xs">
                {product.ImageUrl ? (
                  <img
                    src={product.ImageUrl}
                    alt={product.ImageCaption || product.ProductName}
                    title={product.ImageCaption || product.ProductName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center text-slate-400"><svg class="w-12 h-12 stroke-1 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">ছবি লোড হয়নি</span></div>';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <Package className="w-16 h-16 stroke-1 text-slate-300 mb-2" />
                    <span className="text-xs font-medium">কোনো ছবি যুক্ত করা হয়নি</span>
                  </div>
                )}

                {/* স্টক ব্যাজ ওভারলে */}
                <div className="absolute top-2.5 right-2.5">
                {isOutOfStock ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-600 text-white shadow-sm">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    স্টক নেই
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-500 text-white shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    কম স্টক
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    মজুত আছে
                  </span>
                )}
              </div>
            </div>

            {/* ছবির ক্যাপশন (SEO Alt Text প্রদর্শন) */}
            {product.ImageCaption && (
              <p className="text-[11px] text-slate-500 italic text-center px-1 bg-slate-50 py-1 rounded-md border border-slate-100">
                {product.ImageCaption}
              </p>
            )}
          </div>

            {/* টাইটেল এবং প্রাথমিক তথ্য */}
            <div className="sm:col-span-7 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {product.Category || 'General'}
                  </span>
                  {product.SubCategory && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {product.SubCategory}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    একক: {product.Unit || 'Pcs'}
                  </span>
                </div>

                <h1 className="text-xl font-bold text-slate-900 leading-snug">
                  {product.ProductName}
                </h1>
              </div>

              {/* বারকোড কার্ড */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Barcode className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium">বারকোড / SKU:</span>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {product.Barcode ? product.Barcode : 'নির্ধারিত নেই'}
                  </span>
                </div>
                {product.Barcode && (
                  <button
                    type="button"
                    onClick={() => setIsStickerModalOpen(true)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-all flex items-center space-x-1 cursor-pointer"
                    title="এই পণ্যের বারকোড স্টিকার প্রিন্ট করুন"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>স্টিকার প্রিন্ট</span>
                  </button>
                )}
              </div>

              {/* বিক্রয়মূল্য ও মজুত হাইলাইট */}
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-700 font-medium block">বিক্রয়মূল্য (প্রতি {product.Unit || 'একক'})</span>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className="text-sm font-semibold text-indigo-600">{currencySymbol}</span>
                    <span className="text-2xl font-black text-indigo-900">
                      {selling.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ফেজ ৩: ক্যাশিয়ারের জন্য কেনা দাম সুরক্ষা */}
                {canViewCostPrice(activeUser) ? (
                  <div className="text-center px-3 border-x border-indigo-200/60">
                    <span className="text-[11px] text-slate-500 font-bold block">কেনা দাম</span>
                    <span className="text-base font-black text-slate-800 font-mono">
                      {currencySymbol}{Number(product.CostPrice || 0).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="text-center px-3 border-x border-indigo-200/60">
                    <span className="text-[10px] text-slate-400 font-bold block">কেনা দাম</span>
                    <span className="text-xs font-bold text-slate-400">🔒 সুরক্ষিত</span>
                  </div>
                )}

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium block">দোকানে মজুত</span>
                  <span className={`text-xl font-extrabold block ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {stock} <span className="text-xs font-semibold text-slate-500">{product.Unit || 'Pcs'}</span>
                  </span>
                </div>
              </div>

              {/* গোডাউন বনাম দোকান স্টক বিভাজন */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
                <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 block">🏬 দোকান স্টক</span>
                  <span className="text-base font-black text-emerald-950 block">
                    {stock} <span className="text-[10px] font-medium text-emerald-700">{product.Unit || 'Pcs'}</span>
                  </span>
                </div>
                <div className="p-2 bg-indigo-50/80 rounded-xl border border-indigo-200 text-center">
                  <span className="text-[10px] font-bold text-indigo-800 block">🏭 গোডাউন স্টক</span>
                  <span className="text-base font-black text-indigo-950 block">
                    {Number(product.GodownStock || 0)} <span className="text-[10px] font-medium text-indigo-700">{product.Unit || 'Pcs'}</span>
                  </span>
                </div>
                <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-700 block">📦 মোট স্টক</span>
                  <span className="text-base font-black text-slate-900 block">
                    {stock + Number(product.GodownStock || 0)} <span className="text-[10px] font-medium text-slate-600">{product.Unit || 'Pcs'}</span>
                  </span>
                </div>
              </div>

              {/* কাপড় পরিমাপ ও থান-গজ বিশদ বিবরণ */}
              {(Number(product.YardsPerThan) > 0 || String(product.Unit || '').includes('থান')) && (
                <div className="bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200 mt-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-amber-950 font-bold border-b border-amber-200/70 pb-1.5">
                    <span className="flex items-center space-x-1.5">
                      <span className="text-amber-600">📏</span>
                      <span>কাপড় পরিমাপ (থান ও গজ বিশ্লেষণ)</span>
                    </span>
                    <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-900 font-black">
                      বস্ত্রালয় হিসাব
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-amber-800 font-bold block">প্রতি থানে গজ</span>
                      <span className="text-sm font-black text-amber-950 block">
                        {Number(product.YardsPerThan) || 0} গজ
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-amber-800 font-bold block">দোকানে গজ</span>
                      <span className="text-sm font-black text-amber-950 block">
                        {stock * (Number(product.YardsPerThan) || 0)} গজ
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">({stock} থান)</span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-amber-800 font-bold block">গোডাউনে গজ</span>
                      <span className="text-sm font-black text-indigo-950 block">
                        {(Number(product.GodownStock) || 0) * (Number(product.YardsPerThan) || 0)} গজ
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">({Number(product.GodownStock) || 0} থান)</span>
                    </div>
                  </div>

                  <div className="p-2 bg-amber-100/70 rounded-xl border border-amber-200 flex items-center justify-between font-bold text-amber-950">
                    <span className="text-[11px]">মোট কাপড়ের মজুদ (দোকান + গোডাউন):</span>
                    <span className="text-sm font-black text-amber-950">
                      {(stock + (Number(product.GodownStock) || 0)) * (Number(product.YardsPerThan) || 0)} গজ
                      <span className="text-[10px] font-normal text-amber-800 ml-1">
                        ({stock + (Number(product.GodownStock) || 0)} থান)
                      </span>
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ব্যাচ নম্বর ও মেয়াদোত্তীর্ণ তথ্য (Phase 6) */}
          {(product.BatchNumber || product.ExpiryDate || product.MfgDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {product.BatchNumber && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">ব্যাচ নম্বর</span>
                  <span className="font-mono font-bold text-slate-800">{product.BatchNumber}</span>
                </div>
              )}
              {product.MfgDate && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">উৎপাদন তারিখ</span>
                  <span className="font-semibold text-slate-700">{product.MfgDate}</span>
                </div>
              )}
              {product.ExpiryDate && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">মেয়াদোত্তীর্ণ তারিখ</span>
                  <span className="font-bold text-rose-600">{product.ExpiryDate}</span>
                </div>
              )}
            </div>
          )}

          {/* ভ্যারিয়েন্ট তালিকা (Phase 6) */}
          {product.HasVariants && Array.isArray(product.Variants) && product.Variants.length > 0 && (
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-2">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>সাইজ ও কালার ভ্যারিয়েন্ট তালিকা ({product.Variants.length} টি অপশন)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.Variants.map((v, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {(v.Attributes && typeof v.Attributes === 'object' && Object.keys(v.Attributes).length > 0)
                          ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
                          : ([v.Size, v.Color, v.Weight, v.Title].filter(Boolean).join(' / ') || `ভ্যারিয়েন্ট #${idx + 1}`)}
                      </span>
                      {v.Barcode && <span className="font-mono text-[10px] text-slate-400">#{v.Barcode}</span>}
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">{currencySymbol}{Number(v.SellingPrice || product.SellingPrice).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 font-medium">মজুদ: {v.StockQuantity || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* কম্বো প্যাকেজ কম্পোনেন্ট তালিকা (Phase 6) */}
          {product.IsBundle && Array.isArray(product.BundleItems) && product.BundleItems.length > 0 && (
            <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 space-y-2">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>প্যাকেজ উপাদান ({product.BundleItems.length} টি পণ্য অন্তর্ভুক্ত)</span>
              </span>
              <div className="space-y-1.5">
                {product.BundleItems.map((bi, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{bi.productName || bi.ProductName || bi.productId}</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      x{bi.quantity || bi.Quantity || 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* সংক্ষিপ্ত বিবরণ (Short Description) */}
          {product.ShortDescription && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block mb-1 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>সংক্ষিপ্ত বিবরণ</span>
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {product.ShortDescription}
              </p>
            </div>
          )}

          {/* মাল্টি ফিচার / পণ্যের বৈশিষ্ট্য (Features) */}
          {productFeatures.length > 0 && (
            <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-2.5">
              <h4 className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>পণ্যের প্রধান বৈশিষ্ট্যসমূহ (Key Features)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {productFeatures.map((feat, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start space-x-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-indigo-100 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* বিস্তারিত বিবরণ (Description) - রিচ টেক্সট ফরম্যাটেড রেন্ডারিং */}
          {product.Description ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>বিস্তারিত বিবরণ (Description)</span>
              </h4>
              {/<[a-z][\s\S]*>/i.test(product.Description) ? (
                <div 
                  className="rich-text-content text-xs text-slate-700 leading-relaxed font-normal prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_a]:text-indigo-600 [&_a]:underline [&_a]:font-medium [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: product.Description }}
                />
              ) : (
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                  {product.Description}
                </p>
              )}
            </div>
          ) : (
            !product.ShortDescription && productFeatures.length === 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                এই পণ্যের কোনো বিস্তারিত বিবরণ বা অতিরিক্ত বৈশিষ্ট্য এখনো যুক্ত করা হয়নি।
              </div>
            )
          )}

          {/* অতিরিক্ত তথ্য ও টাইমস্ট্যাম্প */}
          <div className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>যুক্ত করার সময়: <strong>{formatDate(product.CreatedAt)}</strong></span>
            </div>
            {cartQuantity > 0 && (
              <span className="text-indigo-600 font-medium">
                কার্টে ইতিমধ্যে যুক্ত আছে: <strong>{cartQuantity} {product.Unit || 'Pcs'}</strong>
              </span>
            )}
          </div>

        </div>

        {/* ফুটার অ্যাকশন বাটন */}
        <div className={`px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-3 ${isAdmin ? 'justify-between' : 'justify-end'}`}>
          
          {/* কুইক রিস্টক বাটন (শুধু এডমিনদের জন্য) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleRestockClick}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>নতুন স্টক ইনপুট</span>
            </button>
          )}

          {/* কার্টে যোগ করার সেকশন */}
          <div className="w-full sm:w-auto flex items-center space-x-3 justify-end">
            
            {inStock && remainingStockForCart > 0 && (
              <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-slate-800 font-mono">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= remainingStockForCart}
                  className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddToCartClick}
              disabled={isOutOfStock || remainingStockForCart <= 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {isOutOfStock
                  ? 'স্টক নেই'
                  : remainingStockForCart <= 0
                  ? 'কার্টে সীমা শেষ'
                  : `কার্টে যোগ করুন (${currencySymbol} ${(selling * quantity).toFixed(2)})`}
              </span>
            </button>
          </div>

        </div>

      </div>

      {/* ডিলিট কনফার্মেশন মডাল ডায়ালগ */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">পণ্যটি মুছে ফেলতে চান?</h4>
                <p className="text-xs text-slate-500 mt-0.5">ডাটাবেস থেকে স্থায়ীভাবে মুছে যাবে।</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              আপনি কি নিশ্চিতভাবে <strong className="text-slate-900">"{product.ProductName}"</strong> পণ্যটি মুছে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে আনা যাবে না।
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
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
