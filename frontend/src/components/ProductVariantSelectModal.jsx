import React, { useState, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Check, 
  ShoppingCart, 
  Tag, 
  Barcode, 
  Boxes, 
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';

export default function ProductVariantSelectModal({
  isOpen,
  onClose,
  product,
  currencySymbol = '৳',
  onAddToCart,
  cartItems = []
}) {
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // ভ্যারিয়েন্ট তালিকা নিরাপদ এক্সট্র্যাক্ট
  const variants = useMemo(() => {
    if (!product || !product.Variants || !Array.isArray(product.Variants)) {
      return [];
    }
    return product.Variants;
  }, [product]);

  // ডিফল্ট সিলেক্টেড ভ্যারিয়েন্ট সেট করা
  React.useEffect(() => {
    if (variants.length > 0) {
      // প্রথম যে ভ্যারিয়েন্টের স্টক আছে সেটা নির্বাচন করুন, নতুবা প্রথম ভ্যারিয়েন্ট
      const inStockVariant = variants.find((v) => Number(v.StockQuantity || 0) > 0);
      setSelectedVariantId(inStockVariant ? inStockVariant.VariantID : variants[0].VariantID);
      setQuantity(1);
    }
  }, [variants, isOpen]);

  if (!isOpen || !product) return null;

  const currentVariant = variants.find((v) => v.VariantID === selectedVariantId) || variants[0];
  const variantStock = currentVariant ? Number(currentVariant.StockQuantity || 0) : 0;
  const variantPrice = currentVariant ? Number(currentVariant.SellingPrice || product.SellingPrice || 0) : Number(product.SellingPrice || 0);

  // কার্টে অলরেডি এই ভ্যারিয়েন্ট কয়টি আছে
  const alreadyInCartQty = useMemo(() => {
    if (!currentVariant) return 0;
    const match = (cartItems || []).find((ci) => ci.variantId === currentVariant.VariantID && ci.productId === product.ProductID);
    return match ? Number(match.quantity || 0) : 0;
  }, [cartItems, currentVariant, product]);

  const maxSelectable = Math.max(0, variantStock - alreadyInCartQty);

  const handleConfirmAddToCart = () => {
    if (!currentVariant) return;
    if (variantStock <= 0) return;
    if (quantity > maxSelectable) return;

    // বিশেষ প্রোডাক্ট অবজেক্ট তৈরি যা কার্টে ভ্যারিয়েন্টের সব ডেটাসহ যাবে
    const attributesText = currentVariant.Attributes
      ? Object.entries(currentVariant.Attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
      : '';

    const productWithVariant = {
      ...product,
      SellingPrice: variantPrice,
      CostPrice: Number(currentVariant.CostPrice || product.CostPrice || 0),
      Barcode: currentVariant.Barcode || product.Barcode,
      variantId: currentVariant.VariantID,
      variantName: attributesText || currentVariant.VariantID,
      variantAttributes: currentVariant.Attributes || {},
      _selectedVariant: currentVariant,
    };

    if (onAddToCart) {
      onAddToCart(productWithVariant, quantity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* হেডার */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-purple-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                ভ্যারিয়েন্ট বাছাই করুন
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                সাইজ, রঙ বা ওজন অনুযায়ী সঠিক ভ্যারিয়েন্ট নির্বাচন করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* পণ্য পরিচিতি কার্ড */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
            {product.ImageUrl ? (
              <img 
                src={product.ImageUrl} 
                alt={product.ProductName}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <Layers className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900 truncate">
              {product.ProductName}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
              <span>{product.Category}</span>
              <span>•</span>
              <span className="font-bold text-indigo-600">
                ভ্যারিয়েন্ট অপশন: {variants.length}টি
              </span>
            </div>
          </div>
        </div>

        {/* ভ্যারিয়েন্ট সিলেক্টর লিস্ট */}
        <div className="p-4 sm:p-6 max-h-72 overflow-y-auto space-y-2.5">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            উপলব্ধ ভ্যারিয়েন্টসমূহ ({variants.length})
          </label>

          {variants.map((v) => {
            const isSelected = v.VariantID === selectedVariantId;
            const vStock = Number(v.StockQuantity || 0);
            const isOutOfStock = vStock <= 0;
            const attrText = v.Attributes 
              ? Object.entries(v.Attributes).map(([key, val]) => `${key}: ${val}`).join(' | ') 
              : v.VariantID;

            return (
              <div
                key={v.VariantID}
                onClick={() => !isOutOfStock && setSelectedVariantId(v.VariantID)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                    : isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {attrText}
                    </div>
                    {v.Barcode && (
                      <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                        <Barcode className="w-3 h-3" />
                        <span>{v.Barcode}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs sm:text-sm font-black text-indigo-700">
                    {currencySymbol}{Number(v.SellingPrice || product.SellingPrice || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] mt-0.5 font-semibold">
                    {isOutOfStock ? (
                      <span className="text-rose-600">স্টক শেষ</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">{vStock} পিস মজুদ</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* কোয়ান্টিটি ও সাবটোটাল ফুটার */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">পরিমাণ (Quantity):</span>
            
            <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-black text-slate-900 w-8 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))}
                disabled={quantity >= maxSelectable}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 font-medium">সাবটোটাল:</span>
            <span className="text-base font-black text-slate-900">
              {currencySymbol}{(variantPrice * quantity).toLocaleString('en-IN')}
            </span>
          </div>

          {/* অ্যাকশন বাটন */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleConfirmAddToCart}
              disabled={variantStock <= 0 || maxSelectable <= 0}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>কার্টে যোগ করুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
