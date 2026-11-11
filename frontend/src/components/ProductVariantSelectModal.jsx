import React, { useState, useMemo, useEffect } from 'react';
import { isFabricUnit, isFabricProduct, calculateTotalYards, formatFabricQuantity, parseGojGira } from '../utils/fabricUtils';
import {
  X,
  Layers,
  Check,
  ShoppingCart,
  Barcode,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';

// রঙের বাংলা/ইংরেজি নাম থেকে হেক্স কালার কোড
const getColorHex = (colorName = '') => {
  if (!colorName) return null;
  const c = String(colorName).trim().toLowerCase();
  const map = {
    'লাল': '#EF4444', 'red': '#EF4444',
    'নীল': '#2563EB', 'blue': '#2563EB',
    'কালো': '#0F172A', 'black': '#0F172A',
    'সাদা': '#F8FAFC', 'white': '#F8FAFC',
    'সবুজ': '#10B981', 'green': '#10B981',
    'হলুদ': '#EAB308', 'yellow': '#EAB308',
    'গোলাপি': '#EC4899', 'pink': '#EC4899', 'গোলাপী': '#EC4899',
    'মেরুন': '#881337', 'maroon': '#881337',
    'অফ-হোয়াইট': '#FEF3C7', 'off-white': '#FEF3C7', 'offwhite': '#FEF3C7',
    'বেগুনি': '#8B5CF6', 'purple': '#8B5CF6',
    'কমলা': '#F97316', 'orange': '#F97316',
    'আকাশি': '#0284C7', 'sky': '#0284C7', 'আকাশী': '#0284C7',
    'ছাই': '#64748B', 'grey': '#64748B', 'gray': '#64748B',
    'বাদামি': '#78350F', 'brown': '#78350F', 'বাদামী': '#78350F',
    'গোল্ডেন': '#D97706', 'golden': '#D97706',
    'সিলভার': '#94A3B8', 'silver': '#94A3B8',
    'পেস্ট': '#0D9488', 'paste': '#0D9488',
    'ম্যাজেন্টা': '#C026D3', 'magenta': '#C026D3',
    'জলপাই': '#65A30D', 'olive': '#65A30D',
    'নেভি ব্লু': '#1E3A8A', 'navy': '#1E3A8A', 'navy blue': '#1E3A8A',
    'টিয়া': '#84CC16', 'lime': '#84CC16',
    'খয়েরি': '#78350F', 'খয়েরী': '#78350F'
  };
  return map[c] || '#6366F1';
};

// ভ্যারিয়েন্ট অবজেক্ট থেকে রং এর নাম বের করার হেল্পার
const extractVariantColor = (v) => {
  if (!v) return null;
  if (v.Color) return v.Color;
  if (v.Attributes) {
    if (v.Attributes.Color) return v.Attributes.Color;
    if (v.Attributes.color) return v.Attributes.color;
    if (v.Attributes['রং']) return v.Attributes['রং'];
    if (v.Attributes.Colour) return v.Attributes.Colour;
  }
  return null;
};

// ভ্যারিয়েন্ট এট্রিবিউট লেবেল সুন্দর করে উপস্থাপন
const formatVariantLabel = (v) => {
  if (v.VariantName && v.VariantName.trim()) {
    return v.VariantName;
  }
  if (!v.Attributes || typeof v.Attributes !== 'object') {
    return v.VariantID || '';
  }
  const entries = Object.entries(v.Attributes);
  if (entries.length === 0) return v.VariantID || '';

  return entries
    .map(([key, val]) => {
      const kLower = key.toLowerCase();
      let label = key;
      if (kLower === 'color') label = 'রং';
      else if (kLower === 'size') label = 'সাইজ';
      else if (kLower === 'weight') label = 'ওজন';
      return `${label}: ${val}`;
    })
    .join(' | ');
};

// স্টক পরিমাণ সুন্দর করে উপস্থাপন (গজ কাপড়ের ক্ষেত্রে গজ-গিরা ও থান ব্রেকডাউন)
const formatVariantStockText = (vStock, isFabric, yardsPerThan, unit = 'পিস') => {
  if (vStock <= 0) return 'স্টক শেষ';
  if (!isFabric) {
    return `${vStock} ${unit || 'পিস'} মজুদ`;
  }

  if (yardsPerThan && yardsPerThan > 0) {
    const fullThans = Math.floor(vStock / yardsPerThan);
    const cutYards = Math.round((vStock % yardsPerThan) * 10000) / 10000;
    const cutText = formatFabricQuantity(cutYards, 'গজ', false);

    if (fullThans > 0 && cutYards > 0) {
      return `${fullThans} থান + ${cutText} (${vStock} গজ) মজুদ`;
    }
    if (fullThans > 0 && cutYards === 0) {
      return `${fullThans} থান (${vStock} গজ) মজুদ`;
    }
  }

  return `${formatFabricQuantity(vStock, 'গজ', true)} মজুদ`;
};

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
  const [fabricGoj, setFabricGoj] = useState(1);
  const [fabricGira, setFabricGira] = useState(0);

  const isFabric = isFabricProduct(product);
  const yardsPerThan = isFabric ? (Number(product?.YardsPerThan || product?.yardsPerThan || 0) || 20) : 0;
  const effectiveQuantity = isFabric ? calculateTotalYards(fabricGoj, fabricGira) : quantity;

  // ভ্যারিয়েন্ট তালিকা নিরাপদ এক্সট্র্যাক্ট
  const variants = useMemo(() => {
    if (!product || !product.Variants || !Array.isArray(product.Variants)) {
      return [];
    }
    return product.Variants;
  }, [product]);

  // ডিফল্ট সিলেক্টেড ভ্যারিয়েন্ট সেট করা
  useEffect(() => {
    if (variants.length > 0) {
      // প্রথম যে ভ্যারিয়েন্টের স্টক আছে সেটা নির্বাচন করুন, নতুবা প্রথম ভ্যারিয়েন্ট
      const inStockVariant = variants.find((v) => Number(v.StockQuantity || 0) > 0);
      const chosen = inStockVariant || variants[0];
      setSelectedVariantId(chosen.VariantID);
      setQuantity(1);
      if (isFabric) {
        const initialStock = Number(chosen?.StockQuantity || 0);
        if (initialStock > 0 && initialStock < 1) {
          const { goj, gira } = parseGojGira(initialStock);
          setFabricGoj(goj);
          setFabricGira(gira);
        } else {
          setFabricGoj(1);
          setFabricGira(0);
        }
      } else {
        setFabricGoj(1);
        setFabricGira(0);
      }
    }
  }, [variants, isOpen, isFabric]);

  const currentVariant = variants.find((v) => v.VariantID === selectedVariantId) || variants[0];
  const variantStock = currentVariant ? Number(currentVariant.StockQuantity || 0) : 0;
  const variantPrice = currentVariant ? Number(currentVariant.SellingPrice || product?.SellingPrice || 0) : Number(product?.SellingPrice || 0);

  // কার্টে অলরেডি এই ভ্যারিয়েন্ট কয়টি আছে (সবসময় রেন্ডার হুক হিসেবে কল হবে)
  const alreadyInCartQty = useMemo(() => {
    if (!currentVariant || !product) return 0;
    const match = (cartItems || []).find((ci) => {
      const vid = ci.variantId || ci.VariantID || (ci.cartItemId ? ci.cartItemId.split('__')[1] : null);
      const pid = ci.productId || ci.ProductID || (ci.cartItemId ? ci.cartItemId.split('__')[0] : null);
      return vid === currentVariant.VariantID && pid === product.ProductID;
    });
    return match ? Number(match.quantity || 0) : 0;
  }, [cartItems, currentVariant, product]);

  const maxSelectable = Math.max(0, variantStock - alreadyInCartQty);

  // ভ্যারিয়েন্ট ক্লিক হ্যান্ডলার (স্টক সীমা অনুযায়ী কোয়ান্টিটি স্বয়ংক্রিয় সমন্বিত)
  const handleSelectVariant = (v) => {
    const vStock = Number(v.StockQuantity || 0);
    if (vStock <= 0) return;
    setSelectedVariantId(v.VariantID);

    const inCart = (cartItems || []).find((ci) => {
      const vid = ci.variantId || ci.VariantID || (ci.cartItemId ? ci.cartItemId.split('__')[1] : null);
      const pid = ci.productId || ci.ProductID || (ci.cartItemId ? ci.cartItemId.split('__')[0] : null);
      return vid === v.VariantID && pid === product.ProductID;
    });
    const inCartQty = inCart ? Number(inCart.quantity || 0) : 0;
    const vMax = Math.max(0, vStock - inCartQty);

    if (isFabric) {
      const curTotal = calculateTotalYards(fabricGoj, fabricGira);
      if (curTotal > vMax) {
        if (vMax < 1 && vMax > 0) {
          const { goj, gira } = parseGojGira(vMax);
          setFabricGoj(goj);
          setFabricGira(gira);
        } else {
          const { goj, gira } = parseGojGira(Math.max(0, vMax));
          setFabricGoj(goj);
          setFabricGira(gira);
        }
      }
    } else {
      if (quantity > vMax) {
        setQuantity(Math.max(1, Math.min(vMax, quantity)));
      }
    }
  };

  const handleConfirmAddToCart = () => {
    if (!currentVariant || !product) return;
    if (variantStock <= 0) return;
    if (effectiveQuantity <= 0) return;
    if (effectiveQuantity > maxSelectable) return;

    // বিশেষ প্রোডাক্ট অবজেক্ট তৈরি যা কার্টে ভ্যারিয়েন্টের সব ডেটাসহ যাবে
    const attributesText = currentVariant.Attributes
      ? Object.entries(currentVariant.Attributes).map(([k, v]) => {
          const kLower = k.toLowerCase();
          const label = kLower === 'color' ? 'রং' : (kLower === 'size' ? 'সাইজ' : k);
          return `${label}: ${v}`;
        }).join(', ')
      : (currentVariant.VariantName || '');

    const productWithVariant = {
      ...product,
      SellingPrice: variantPrice,
      CostPrice: Number(currentVariant.CostPrice || product.CostPrice || 0),
      MinSellingPrice: Number(currentVariant.MinSellingPrice !== undefined ? currentVariant.MinSellingPrice : (product.MinSellingPrice !== undefined ? product.MinSellingPrice : (currentVariant.CostPrice || product.CostPrice || 0))),
      StockQuantity: Number(currentVariant.StockQuantity !== undefined ? currentVariant.StockQuantity : product.StockQuantity),
      GodownStock: Number(currentVariant.GodownStock !== undefined ? currentVariant.GodownStock : product.GodownStock),
      Barcode: currentVariant.Barcode || product.Barcode,
      variantId: currentVariant.VariantID,
      variantName: attributesText || currentVariant.VariantID,
      variantAttributes: currentVariant.Attributes || {},
      _selectedVariant: currentVariant,
    };

    if (onAddToCart) {
      onAddToCart(productWithVariant, effectiveQuantity, true);
    }
    onClose();
  };

  // সব হুক ও মেমো কল করার পর সেফ গার্ড রিটার্ন
  if (!isOpen || !product) return null;

  const subTotal = Math.round(variantPrice * effectiveQuantity * 100) / 100;
  const isOverStock = effectiveQuantity > maxSelectable;

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
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>{product.Category || 'সাধারণ'}</span>
              <span>•</span>
              <span className="font-bold text-indigo-600">
                ভ্যারিয়েন্ট অপশন: {variants.length}টি
              </span>
              {isFabric && yardsPerThan > 0 && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    প্রতি থান: {yardsPerThan} গজ
                  </span>
                </>
              )}
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
            const vGStock = Number(v.GodownStock || 0);
            const isOutOfStock = vStock <= 0;
            const vColor = extractVariantColor(v);
            const hexColor = vColor ? getColorHex(vColor) : null;
            const attrText = formatVariantLabel(v);
            const stockDisplayText = formatVariantStockText(vStock, isFabric, yardsPerThan, product?.Unit);

            return (
              <div
                key={v.VariantID}
                onClick={() => handleSelectVariant(v)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                    : isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="flex items-center space-x-2.5 min-w-0">
                    {vColor && (
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0 inline-block"
                        style={{ backgroundColor: hexColor }}
                        title={`রং: ${vColor}`}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {attrText}
                      </div>
                      {v.Barcode && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                          <Barcode className="w-3 h-3 shrink-0" />
                          <span className="truncate">{v.Barcode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <div className="text-xs sm:text-sm font-black text-indigo-700">
                    {currencySymbol}{Number(v.SellingPrice || product.SellingPrice || 0).toLocaleString('en-IN')}
                    {isFabric && <span className="text-[10px] font-normal text-slate-500"> / গজ</span>}
                  </div>
                  <div className="text-[10px] mt-0.5 font-semibold">
                    {isOutOfStock ? (
                      <span className="text-rose-600 font-bold">স্টক শেষ</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">{stockDisplayText}</span>
                    )}
                  </div>
                  {vGStock > 0 && (
                    <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                      গোডাউন: {vGStock} {isFabric ? 'থান' : (product?.Unit || 'টি')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* কোয়ান্টিটি ও সাবটোটাল ফুটার */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-600">
              পরিমাণ {isFabric ? '(গজ ও গিরা)' : '(Quantity)'}:
            </span>
            
            {isFabric ? (
              <div className="flex items-center gap-1.5 p-1 bg-amber-50/90 border border-amber-300 rounded-xl shadow-2xs">
                {/* গজ */}
                <div className="flex items-center bg-white border border-amber-300 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setFabricGoj((g) => Math.max(0, g - 1))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={fabricGoj}
                    onChange={(e) => setFabricGoj(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-9 text-center font-black text-xs text-slate-900 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] font-black text-amber-900 pr-0.5 select-none">গজ</span>
                  <button
                    type="button"
                    onClick={() => setFabricGoj((g) => g + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-xs font-black text-amber-600">+</span>

                {/* গিরা */}
                <div className="flex items-center bg-white border border-amber-300 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setFabricGira((gi) => Math.max(0, gi - 1))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={fabricGira}
                    onChange={(e) => setFabricGira(Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)))}
                    className="w-7 text-center font-black text-xs text-slate-900 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] font-black text-amber-900 pr-0.5 select-none">গিরা</span>
                  <button
                    type="button"
                    onClick={() => setFabricGira((gi) => (gi + 1 >= 16 ? 0 : gi + 1))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {isFabric && (
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500">পরিমাপ বিশ্লেষণ:</span>
              <span className="text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                নির্বাচিত: {formatFabricQuantity(effectiveQuantity, 'গজ', true)}
              </span>
            </div>
          )}

          {/* স্টক সতর্কতা বা কার্ট ইনফো */}
          {isOverStock ? (
            <div className="flex items-center space-x-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                মজুদের চেয়ে বেশি পরিমাণ নির্বাচন করা হয়েছে (সর্বোচ্চ: {isFabric ? formatFabricQuantity(maxSelectable, 'গজ') : `${maxSelectable} ${product?.Unit || 'পিস'}`})
              </span>
            </div>
          ) : alreadyInCartQty > 0 ? (
            <div className="text-right text-[11px] font-medium text-indigo-600">
              (কার্টে ইতিমধ্যে {isFabric ? formatFabricQuantity(alreadyInCartQty, 'গজ') : `${alreadyInCartQty} ${product?.Unit || 'পিস'}`} রয়েছে)
            </div>
          ) : null}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 font-medium">সাবটোটাল:</span>
            <span className="text-base font-black text-slate-900">
              {currencySymbol}{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
              disabled={variantStock <= 0 || maxSelectable <= 0 || effectiveQuantity <= 0 || isOverStock}
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
