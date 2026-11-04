import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Layers,
  Scissors,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  DollarSign,
  Package,
  Calendar,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  FileSpreadsheet,
  AlertOctagon,
  Store,
  Warehouse,
  Truck,
  Tag,
  Barcode,
  Check,
  ShoppingBag,
  HelpCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity, parseGojGira, calculateThanBreakdown } from '../utils/fabricUtils';
import { playCashChime, playWarningBeep } from '../utils/soundEffects';
import BarcodeStickerModal from './BarcodeStickerModal';

export default function FabricWastageModal({
  isOpen,
  onClose,
  embedded = false,
  fabricWastageList = [],
  products = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = null,
  onRecordWastage,
  onDeleteWastageRecord,
  onCreateRemnantBundle,
  initialProduct = null,
  initialTab = 'list'
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'list'); // 'live_remnants' | 'bundles' | 'list' | 'new'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'Remnant' | 'Damaged'
  const [locationFilter, setLocationFilter] = useState('ALL'); // 'ALL' | 'Shop' | 'Godown'
  const [bundleStatusFilter, setBundleStatusFilter] = useState('ALL'); // 'ALL' | 'Available' | 'Sold'

  // নতুন এন্ট্রি ফর্ম স্টেট
  const [location, setLocation] = useState('Shop'); // 'Shop' | 'Godown'
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [entryType, setEntryType] = useState('Remnant'); // 'Remnant' | 'Damaged'
  const [goj, setGoj] = useState(1);
  const [gira, setGira] = useState(0);
  const [thans, setThans] = useState(1);
  const [reason, setReason] = useState('থানের শেষ ছাঁট (End-of-bolt Remnant)');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [createClearanceBundle, setCreateClearanceBundle] = useState(false);
  const [bundlePrice, setBundlePrice] = useState(100);

  // বারকোড স্টিকার প্রিন্ট মডাল স্টেট
  const [printStickerProduct, setPrintStickerProduct] = useState(null);

  // যদি initialProduct পাস করা থাকে, তবে স্বয়ংক্রিয়ভাবে ফর্ম ইনিশিয়ালাইজ করুন
  useEffect(() => {
    if (initialProduct && (initialProduct.ProductID || initialProduct.id)) {
      setSelectedProductId(String(initialProduct.ProductID || initialProduct.id));
      setActiveTab('new');
      if (initialProduct.remnantYards) {
        const parsed = parseGojGira(initialProduct.remnantYards);
        setGoj(parsed.goj || 1);
        setGira(parsed.gira || 0);
        setEntryType('Remnant');
        setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
      }
    }
  }, [initialProduct]);

  // থান ও গজ কাপড়ের পণ্য তালিকা
  const fabricProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const u = String(p.Unit || p.unit || '').toLowerCase();
      const cat = String(p.Category || p.category || '').toLowerCase();
      const name = String(p.ProductName || p.name || '').toLowerCase();
      return u.includes('গজ') || u.includes('yard') || u.includes('than') || u.includes('থান') || cat.includes('থান') || cat.includes('কাপড়') || name.includes('থান') || name.includes('কাপড়');
    });
  }, [products]);

  // দোকানে বর্তমানে সক্রিয় শেষ ছাঁট কাপড়ের তালিকা
  const liveShopRemnants = useMemo(() => {
    return fabricProducts.map((p) => {
      const u = String(p.Unit || p.unit || '');
      const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
      const remTh = Number(p.RemnantThreshold !== undefined ? p.RemnantThreshold : (p.remnantThreshold !== undefined ? p.remnantThreshold : 2));
      const sStock = Number(p.StockQuantity !== undefined ? p.StockQuantity : (p.CurrentStock || p.stock || 0));
      const bd = calculateThanBreakdown(sStock, ypt, remTh);
      if (bd.isRemnant) {
        return {
          product: p,
          breakdown: bd,
          remnantYards: bd.runningCutYards
        };
      }
      return null;
    }).filter(Boolean);
  }, [fabricProducts]);

  // ক্লিয়ারেন্স বান্ডেল তালিকা
  const clearanceBundles = useMemo(() => {
    return (fabricWastageList || []).filter(item => Boolean(item.CreateBundle || item.ActionTaken === 'ClearanceBundle'));
  }, [fabricWastageList]);

  // নির্বাচিত প্রোডাক্ট অবজেক্ট
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return (products || []).find((p) => String(p.ProductID || p.id).trim() === String(selectedProductId).trim());
  }, [selectedProductId, products]);

  // নির্বাচিত ভ্যারিয়েন্ট অবজেক্ট
  const selectedVariant = useMemo(() => {
    if (!selectedProduct || !selectedVariantId || !Array.isArray(selectedProduct.Variants)) return null;
    return selectedProduct.Variants.find((v) => String(v.VariantID || v.variantId).trim() === String(selectedVariantId).trim());
  }, [selectedProduct, selectedVariantId]);

  // থান প্রতি গজ
  const yardsPerThan = useMemo(() => {
    return Number(selectedProduct?.YardsPerThan || selectedProduct?.yardsPerThan || 0) || 25;
  }, [selectedProduct]);

  // মোট গজ ও আর্থিক ক্ষতি হিসাব
  const totalYards = useMemo(() => {
    if (location === 'Godown') {
      return (Number(thans) || 0) * yardsPerThan;
    }
    return calculateTotalYards(goj, gira);
  }, [location, thans, yardsPerThan, goj, gira]);

  // কার্যকরী ক্রয়মূল্য
  const costPrice = useMemo(() => {
    let cp = 0;
    if (selectedVariant && Number(selectedVariant.CostPrice || selectedVariant.costPrice) > 0) {
      cp = Number(selectedVariant.CostPrice || selectedVariant.costPrice);
    } else {
      cp = Number(selectedProduct?.CostPrice || selectedProduct?.costPrice || 0);
    }
    return cp;
  }, [selectedProduct, selectedVariant]);

  // আর্থিক ক্ষতির হিসাব
  const lossAmount = useMemo(() => {
    return Math.round(totalYards * costPrice);
  }, [totalYards, costPrice]);

  // বর্তমান মজুত হিসাব (লোকেশন ও ভ্যারিয়েন্ট অনুযায়ী)
  const currentStockInfo = useMemo(() => {
    if (!selectedProduct) return { amount: 0, text: '০' };
    if (location === 'Godown') {
      const gStk = selectedVariant
        ? Number(selectedVariant.GodownStock || 0)
        : Number(selectedProduct.GodownStock || 0);
      return {
        amount: gStk,
        unit: 'থান',
        text: `${gStk.toLocaleString('bn-BD')} থান (${(gStk * yardsPerThan).toLocaleString('bn-BD')} গজ)`
      };
    } else {
      const sStk = selectedVariant
        ? Number(selectedVariant.StockQuantity || 0)
        : Number(selectedProduct.StockQuantity !== undefined ? selectedProduct.StockQuantity : (selectedProduct.CurrentStock || selectedProduct.stock || 0));
      return {
        amount: sStk,
        unit: 'গজ',
        text: `${sStk.toLocaleString('bn-BD')} গজ`
      };
    }
  }, [selectedProduct, selectedVariant, location, yardsPerThan]);

  // ফর্ম সাবমিট
  const handleSubmitWastage = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('অনুগ্রহ করে একটি থান কাপড় নির্বাচন করুন!');
      return;
    }
    if (totalYards <= 0) {
      alert('গজ বা গিরার সঠিক পরিমাণ দিন!');
      return;
    }

    if (location === 'Godown') {
      if (thans > currentStockInfo.amount) {
        if (!confirm(`সতর্কতা: গোডাউন ড্যামেজ থানের পরিমাণ (${thans} থান) বর্তমান গোডাউন মজুতের (${currentStockInfo.amount} থান) চেয়ে বেশি! আপনি কি নিশ্চিতভাবে স্টক সমন্বয় করতে চান?`)) {
          return;
        }
      }
    } else {
      if (totalYards > currentStockInfo.amount) {
        if (!confirm(`সতর্কতা: নষ্ট/ছাঁট কাপড়ের পরিমাণ (${totalYards} গজ) বর্তমান দোকান মজুতের (${currentStockInfo.amount} গজ) চেয়ে বেশি! আপনি কি নিশ্চিতভাবে স্টক সমন্বয় করতে চান?`)) {
          return;
        }
      }
    }

    const finalReason = reason === 'অন্যান্য' ? (customReason.trim() || 'অন্যান্য কারণ') : reason;
    const bundleBarcode = `BND${Date.now().toString().slice(-6)}`;
    const bundleId = `BUNDLE-${Date.now().toString().slice(-6)}`;

    const payload = {
      ProductID: selectedProduct.ProductID || selectedProduct.id,
      ProductName: selectedProduct.ProductName || selectedProduct.name,
      VariantID: selectedVariant ? (selectedVariant.VariantID || selectedVariant.variantId) : '',
      VariantName: selectedVariant ? [selectedVariant.Color, selectedVariant.Size].filter(Boolean).join(' - ') : '',
      Category: selectedProduct.Category || selectedProduct.category || 'থান কাপড়',
      Location: location,
      Type: entryType,
      Goj: location === 'Shop' ? (Number(goj) || 0) : 0,
      Gira: location === 'Shop' ? (Number(gira) || 0) : 0,
      Thans: location === 'Godown' ? (Number(thans) || 0) : 0,
      TotalYards: totalYards,
      CostPricePerYard: costPrice,
      LossAmount: lossAmount,
      Reason: finalReason,
      ActionTaken: createClearanceBundle ? 'ClearanceBundle' : 'WrittenOff',
      LoggedBy: activeUser?.FullName || activeUser?.UserName || 'Admin',
      Notes: notes.trim(),
      CreateBundle: createClearanceBundle && entryType === 'Remnant',
      BundleProductID: createClearanceBundle ? bundleId : '',
      BundleBarcode: createClearanceBundle ? bundleBarcode : '',
      BundlePrice: createClearanceBundle ? (Number(bundlePrice) || 0) : 0,
      BundleStatus: createClearanceBundle ? 'Available' : 'WrittenOff'
    };

    if (onRecordWastage) {
      onRecordWastage(payload);
      playCashChime();
    }

    // যদি বান্ডেল তৈরি হয় এবং ইউজার চায়, সরাসরি প্রিন্ট অপশন দেওয়া যেতে পারে
    if (payload.CreateBundle) {
      setPrintStickerProduct({
        ProductID: payload.BundleProductID,
        ProductName: `[ছাঁট প্যাক] ${payload.ProductName}`,
        Barcode: payload.BundleBarcode,
        SellingPrice: payload.BundlePrice,
        Price: payload.BundlePrice,
        Unit: 'প্যাক'
      });
    }

    // ফর্ম রিসেট
    setSelectedProductId('');
    setSelectedVariantId('');
    setGoj(1);
    setGira(0);
    setThans(1);
    setNotes('');
    setCustomReason('');
    setCreateClearanceBundle(false);
    setActiveTab('list');
  };

  // ফিল্টার করা রেকর্ড খাতা তালিকা
  const filteredList = useMemo(() => {
    return (fabricWastageList || []).filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQ =
        !q ||
        (item.ProductName && item.ProductName.toLowerCase().includes(q)) ||
        (item.WastageID && item.WastageID.toLowerCase().includes(q)) ||
        (item.Reason && item.Reason.toLowerCase().includes(q)) ||
        (item.VariantName && item.VariantName.toLowerCase().includes(q));

      const matchType = typeFilter === 'ALL' || item.Type === typeFilter;
      const matchLoc = locationFilter === 'ALL' || (item.Location || 'Shop') === locationFilter;
      return matchQ && matchType && matchLoc;
    });
  }, [fabricWastageList, searchQuery, typeFilter, locationFilter]);

  // ফিল্টার করা ক্লিয়ারেন্স বান্ডেল তালিকা
  const filteredBundles = useMemo(() => {
    return clearanceBundles.filter((b) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQ = !q || (b.ProductName && b.ProductName.toLowerCase().includes(q)) || (b.BundleBarcode && b.BundleBarcode.toLowerCase().includes(q));
      const matchStatus = bundleStatusFilter === 'ALL' || (b.BundleStatus || 'Available') === bundleStatusFilter;
      return matchQ && matchStatus;
    });
  }, [clearanceBundles, searchQuery, bundleStatusFilter]);

  // KPI হিসাব
  const kpi = useMemo(() => {
    let totalWastedYards = 0;
    let totalLoss = 0;
    let remnantCount = 0;
    let damagedCount = 0;
    let availableBundlesCount = 0;

    (fabricWastageList || []).forEach((r) => {
      totalWastedYards += Number(r.TotalYards) || 0;
      totalLoss += Number(r.LossAmount) || 0;
      if (r.Type === 'Remnant') remnantCount++;
      if (r.Type === 'Damaged') damagedCount++;
      if (r.CreateBundle && (r.BundleStatus === 'Available' || !r.BundleStatus)) availableBundlesCount++;
    });

    return {
      totalEntries: (fabricWastageList || []).length,
      totalWastedYards: Math.round(totalWastedYards * 100) / 100,
      totalLoss: Math.round(totalLoss),
      remnantCount,
      damagedCount,
      availableBundlesCount
    };
  }, [fabricWastageList]);

  if (!isOpen) return null;

  return (
    <div
      className={
        embedded
          ? 'w-full h-full flex flex-col bg-slate-50'
          : 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          embedded
            ? 'w-full h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'
            : 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200'
        }
      >
        {/* ================= ১. Fastkart এমারেল্ড হেডার ================= */}
        <div className="bg-gradient-to-r from-[#08775f] via-[#0da487] to-teal-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-sm border-b border-emerald-700/40">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Scissors className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  কাপড়ের ছাঁট ও ড্যামেজ হিসাব ট্র্যাকার
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-950/40 text-emerald-100 border border-emerald-400/30 uppercase tracking-wider">
                  Remnant & Damage Studio
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5 font-medium">
                থান কাপড়ের শেষ অবশিষ্টাংশ (ছাঁট), কাটা অপচয়, মিল ড্যামেজ নিখুঁতকরণ ও ক্লিয়ারেন্স সেল
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ৪টি ট্যাব পিলস */}
            <div className="bg-emerald-950/40 p-1 rounded-2xl flex items-center border border-white/20 text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('live_remnants')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'live_remnants'
                    ? 'bg-white text-[#0b8b72] shadow-sm font-black'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <span>🏬 সক্রিয় ছাঁট</span>
                {liveShopRemnants.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">
                    {liveShopRemnants.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bundles')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'bundles'
                    ? 'bg-white text-[#0b8b72] shadow-sm font-black'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <span>📦 ছাঁট বান্ডেল</span>
                {clearanceBundles.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 text-white font-bold">
                    {clearanceBundles.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-white text-[#0b8b72] shadow-sm font-black'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <span>📒 রেকর্ড খাতা</span>
                {(fabricWastageList || []).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 text-white font-bold">
                    {(fabricWastageList || []).length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'new'
                    ? 'bg-white text-[#0b8b72] shadow-sm font-black'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন এন্ট্রি</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= ২. মূল কনটেন্ট এরিয়া ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70 space-y-5">
          
          {/* ট্যাব ১: দোকানে সক্রিয় কাউন্টার ছাঁট কাপড় */}
          {activeTab === 'live_remnants' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-900 rounded-xl">
                    <Scissors className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950">
                      দোকানে চলমান থানের শেষ ছাঁট কাপড়ের খতিয়ান
                    </h3>
                    <p className="text-xs text-amber-900 mt-0.5">
                      কাউন্টার টেবিলে যে থানগুলোর কাপড় ছাঁট সতর্কতার সীমার নিচে নেমে এসেছে—এগুলো এখনও <strong>দোকানের মজুতেই সক্রিয় আছে</strong> এবং খুচরা টুকরা হিসেবে বিক্রয়যোগ্য।
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-800">মোট সক্রিয় ছাঁট:</span>
                  <div className="text-xl font-black text-amber-950 font-mono">
                    {liveShopRemnants.length}টি থান
                  </div>
                </div>
              </div>

              {liveShopRemnants.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0da487] mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">দোকানে কোনো শেষ ছাঁট কাপড় নেই</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    দোকানের প্রতিটি থান কাপড়ে পর্যাপ্ত গজ অবশিষ্ট রয়েছে অথবা কোনো থানের কাপড় ছাঁট সীমার নিচে নামেনি।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {liveShopRemnants.map(({ product: p, breakdown: bd, remnantYards }) => {
                    const gStock = Number(p.GodownStock || 0);
                    return (
                      <div key={p.ProductID} className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-2xs hover:shadow-md transition-all space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
                              {p.Category || 'গজ কাপড়'}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 mt-1 line-clamp-1">
                              {p.ProductName}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">
                              #{p.Barcode || p.ProductID}
                            </span>
                          </div>
                          <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                            <Scissors className="w-4 h-4" />
                          </span>
                        </div>

                        <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                            <span>✂️ থানের শেষ ছাঁট:</span>
                            <span className="text-amber-900 font-mono font-black text-sm">
                              {formatFabricQuantity(remnantYards, 'গজ', false)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium pt-1 border-t border-amber-200/50">
                            <span>দোকানে মোট গজ:</span>
                            <span className="font-mono font-bold text-slate-900">{p.StockQuantity || 0} গজ</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                            <span>ছাঁট সতর্কতা সীমা:</span>
                            <span className="font-mono text-slate-800">{p.RemnantThreshold !== undefined ? p.RemnantThreshold : (p.remnantThreshold || 2)} গজ</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {bd.needsRestock && (
                            <div className="p-2 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-[10.5px] font-bold flex items-center space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>কাটার মতো আস্ত থান নেই! গোডাউনে আছে: {gStock} থান</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductId(p.ProductID);
                                setLocation('Shop');
                                setEntryType('Remnant');
                                setGoj(bd.runningCutGojGira.goj);
                                setGira(bd.runningCutGojGira.gira);
                                setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                                setCreateClearanceBundle(true);
                                setBundlePrice(Math.round((remnantYards * Number(p.SellingPrice || p.Price || 100)) * 0.8));
                                setActiveTab('new');
                              }}
                              className="py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                            >
                              <Tag className="w-3 h-3" />
                              <span>ছাঁট বান্ডেল তৈরি</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPrintStickerProduct({
                                  ProductID: p.ProductID,
                                  ProductName: `${p.ProductName} (ছাঁট ${formatFabricQuantity(remnantYards, 'গজ', false)})`,
                                  Barcode: p.Barcode,
                                  SellingPrice: Math.round(remnantYards * Number(p.SellingPrice || p.Price || 100)),
                                  Price: Math.round(remnantYards * Number(p.SellingPrice || p.Price || 100)),
                                  Unit: 'টুকরা'
                                });
                              }}
                              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 border border-slate-200 cursor-pointer"
                              title="কাউন্টার বিক্রির জন্য ছোট প্রাইস ট্যাগ স্টিকার প্রিন্ট করুন"
                            >
                              <Printer className="w-3 h-3" />
                              <span>ট্যাগ প্রিন্ট</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ২: ক্লিয়ারেন্স বান্ডেল খতিয়ান */}
          {activeTab === 'bundles' && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-[#0da487]" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">ক্লিয়ারেন্স ছাঁট বান্ডেলসমূহ</h3>
                    <p className="text-[11px] text-slate-500">বিশেষ ছাঁট প্যাক হিসেবে ক্যাটালগে যুক্ত টুকরা কাপড়</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={bundleStatusFilter}
                    onChange={(e) => setBundleStatusFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-hidden"
                  >
                    <option value="ALL">সকল অবস্থা (All Status)</option>
                    <option value="Available">🟢 দোকানে মজুত আছে</option>
                    <option value="Sold">🟣 পিওএস-এ বিক্রিত</option>
                  </select>
                </div>
              </div>

              {filteredBundles.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">কোনো ক্লিয়ারেন্স বান্ডেল পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    থানের শেষ টুকরা কাপড় কম দামে বিক্রির জন্য "নতুন এন্ট্রি" থেকে ছাঁট বান্ডেল হিসেবে সংরক্ষণ করুন।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredBundles.map((b) => {
                    const isSold = b.BundleStatus === 'Sold';
                    return (
                      <div key={b.WastageID} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                              isSold
                                ? 'bg-purple-100 text-purple-900 border-purple-200'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            }`}>
                              {isSold ? '🟣 পিওএস-এ বিক্রিত' : '🟢 দোকানে বিক্রয়যোগ্য'}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 mt-1 line-clamp-1">
                              [ছাঁট প্যাক] {b.ProductName}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              বারকোড: {b.BundleBarcode || b.WastageID}
                            </span>
                          </div>
                          <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                            <Tag className="w-4 h-4" />
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-500">কাপড়ের পরিমাণ:</span>
                            <span className="font-mono font-black text-slate-800">
                              {formatFabricQuantity(b.TotalYards, 'গজ', true)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-500">ছাঁট অফার মূল্য:</span>
                            <span className="font-mono font-black text-[#0da487] text-sm">
                              {currencySymbol}{b.BundlePrice || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-medium text-[10.5px] text-slate-500 pt-1 border-t border-slate-200/50">
                            <span>মূল ক্রয়মূল্য:</span>
                            <span>{currencySymbol}{b.LossAmount || 0}</span>
                          </div>
                          {isSold && b.SoldAt && (
                            <div className="text-[10px] text-purple-700 font-semibold pt-0.5">
                              বিক্রির তারিখ: {new Date(b.SoldAt).toLocaleDateString('bn-BD')}
                            </div>
                          )}
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPrintStickerProduct({
                                ProductID: b.BundleProductID || b.WastageID,
                                ProductName: `[ছাঁট প্যাক] ${b.ProductName} (${b.TotalYards} গজ)`,
                                Barcode: b.BundleBarcode || b.WastageID,
                                SellingPrice: b.BundlePrice,
                                Price: b.BundlePrice,
                                Unit: 'প্যাক'
                              });
                            }}
                            className="w-full py-1.5 px-3 bg-slate-100 hover:bg-[#0da487] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-slate-200 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>বারকোড স্টিকার প্রিন্ট করুন</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ৩: রেকর্ড খাতা (ইতিহাস ও সামারি) */}
          {activeTab === 'list' && (
            <div className="space-y-5">
              {/* আধুনিক Fastkart Bento KPI স্ট্রিপ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">মোট অপচয় / ছাঁট গজ</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 font-mono">
                      {formatFabricQuantity(kpi.totalWastedYards, 'গজ', false)}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-slate-600" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-bold text-rose-700 uppercase tracking-wider block">মোট আর্থিক ক্ষতি</span>
                    <h3 className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5 font-mono">
                      {currencySymbol}{kpi.totalLoss.toLocaleString('bn-BD')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-rose-600" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block">থানের শেষ ছাঁট (Remnant)</span>
                    <h3 className="text-xl sm:text-2xl font-black text-amber-900 mt-0.5 font-mono">{kpi.remnantCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-amber-700" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-bold text-[#0b8b72] uppercase tracking-wider block">বিক্রয়যোগ্য ছাঁট প্যাক</span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#0da487] mt-0.5 font-mono">{kpi.availableBundlesCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0da487] flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#0da487]" />
                  </div>
                </div>
              </div>

              {/* ফিল্টার ও সার্চ বার */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কাপড়ের নাম, ভ্যারিয়েন্ট, আইডি বা কারণ দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0da487] font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-hidden"
                  >
                    <option value="ALL">সকল অবস্থান (Shop & Godown)</option>
                    <option value="Shop">🏬 দোকান ফ্লোর</option>
                    <option value="Godown">🏭 গোডাউন</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-hidden"
                  >
                    <option value="ALL">সকল ধরণ (All Types)</option>
                    <option value="Remnant">থানের শেষ ছাঁট (Remnant)</option>
                    <option value="Damaged">নষ্ট / ড্যামেজ (Damaged)</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* রেকর্ড তালিকা টেবিল */}
              {filteredList.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Layers className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">কোনো ছাঁট বা ড্যামেজ রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    থান কাপড়ের শেষ অবশিষ্টাংশ বা নষ্ট কাপড় থাকলে "নতুন এন্ট্রি" থেকে রেকর্ড সংরক্ষণ করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 bg-[#0da487] hover:bg-[#0b8b72] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন এন্ট্রি যোগ করুন</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                          <th className="p-3.5">তারিখ ও আইডি</th>
                          <th className="p-3.5">কাপড়ের বিবরণ ও ভ্যারিয়েন্ট</th>
                          <th className="p-3.5 text-center">অবস্থান</th>
                          <th className="p-3.5">ধরণ</th>
                          <th className="p-3.5 text-center">পরিমাণ</th>
                          <th className="p-3.5 text-center">আর্থিক ক্ষতি</th>
                          <th className="p-3.5">কারণ ও গৃহীত ব্যবস্থা</th>
                          <th className="p-3.5">এন্ট্রি কারী</th>
                          <th className="p-3.5 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredList.map((item) => (
                          <tr key={item.WastageID} className="hover:bg-emerald-50/15 transition-colors">
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-slate-800 block">{item.WastageID}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.CreatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <strong className="text-slate-900 block font-bold">{item.ProductName}</strong>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                {item.VariantName && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                    {item.VariantName}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{item.Category}</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              {item.Location === 'Godown' ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  🏭 গোডাউন
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  🏬 দোকান
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              {item.Type === 'Remnant' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  ✂️ থানের ছাঁট
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  🚨 ড্যামেজ / নষ্ট
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-900 font-mono">
                              {item.Location === 'Godown' && item.Thans > 0 ? (
                                <div>
                                  <span>{item.Thans} থান</span>
                                  <span className="block text-[10px] text-slate-500 font-normal">
                                    ({formatFabricQuantity(item.TotalYards, 'গজ', false)})
                                  </span>
                                </div>
                              ) : (
                                formatFabricQuantity(item.TotalYards, 'গজ', true)
                              )}
                            </td>
                            <td className="p-3.5 text-center font-black text-rose-700 font-mono">
                              {currencySymbol}{item.LossAmount}
                              <span className="block text-[9.5px] text-slate-400 font-normal font-sans">
                                @{currencySymbol}{item.CostPricePerYard}/গজ
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-bold text-slate-800 block">{item.Reason}</span>
                              <span className="text-[10px] text-slate-500 block">
                                {item.ActionTaken === 'ClearanceBundle' ? (
                                  <span className="text-[#0da487] font-semibold">✨ ক্লিয়ারেন্স প্যাক (৳{item.BundlePrice})</span>
                                ) : (
                                  'সরাসরি রাইট-অফ (বাদ)'
                                )}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium">
                              {item.LoggedBy}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {item.CreateBundle && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPrintStickerProduct({
                                        ProductID: item.BundleProductID || item.WastageID,
                                        ProductName: `[ছাঁট প্যাক] ${item.ProductName} (${item.TotalYards} গজ)`,
                                        Barcode: item.BundleBarcode || item.WastageID,
                                        SellingPrice: item.BundlePrice,
                                        Price: item.BundlePrice,
                                        Unit: 'প্যাক'
                                      });
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-[#0da487] hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                    title="প্রাইস ট্যাগ স্টিকার প্রিন্ট করুন"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onDeleteWastageRecord && (
                                  <button
                                    onClick={() => {
                                      if (confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছে ফেলতে চান? এটি মুছে দিলে কাপড়ের স্টক পূর্বের অবস্থায় পুনরুদ্ধার হবে।')) {
                                        onDeleteWastageRecord(item.WastageID);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="রেকর্ড মুছে ফেলুন ও স্টক পুনরুদ্ধার করুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ৪: নতুন ছাঁট বা ড্যামেজ রেকর্ড ফরম */}
          {activeTab === 'new' && (
            <form onSubmit={handleSubmitWastage} className="space-y-5">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
                
                {/* ধাপ ১: অবস্থান ও কাপড় নির্বাচন */}
                <div className="space-y-3 pb-4 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0da487] flex items-center justify-center text-xs">১</span>
                    <span>অপচয়ের অবস্থান ও কাপড় নির্বাচন</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* অবস্থান নির্বাচন */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">কোন অবস্থানের কাপড় নষ্ট/ছাঁট হয়েছে? *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLocation('Shop');
                            setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                          }}
                          className={`py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                            location === 'Shop'
                              ? 'bg-[#0da487] text-white border-[#0da487] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Store className="w-4 h-4" />
                          <span>🏬 দোকান ফ্লোর (কাউন্টার)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocation('Godown');
                            setEntryType('Damaged');
                            setReason('মিলের ত্রুটি / কালার ফল্ট (Mill Defect)');
                            setCreateClearanceBundle(false);
                          }}
                          className={`py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                            location === 'Godown'
                              ? 'bg-[#0da487] text-white border-[#0da487] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Warehouse className="w-4 h-4" />
                          <span>🏭 গোডাউন (আস্ত থান/লট)</span>
                        </button>
                      </div>
                    </div>

                    {/* অপচয়ের ধরণ */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">অপচয়ের ধরণ নির্বাচন করুন *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={location === 'Godown'}
                          onClick={() => {
                            setEntryType('Remnant');
                            setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                          }}
                          className={`py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                            location === 'Godown'
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                              : entryType === 'Remnant'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs cursor-pointer'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                          <Scissors className="w-4 h-4" />
                          <span>✂️ থানের শেষ ছাঁট</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEntryType('Damaged');
                            setReason(location === 'Godown' ? 'মিলের ত্রুটি / কালার ফল্ট (Mill Defect)' : 'ছেঁড়া বা কাটা ভুল (Torn / Cut Mistake)');
                            setCreateClearanceBundle(false);
                          }}
                          className={`py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                            entryType === 'Damaged'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <AlertOctagon className="w-4 h-4" />
                          <span>🚨 নষ্ট / ড্যামেজ কাপড়</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* থান কাপড় ও ভ্যারিয়েন্ট ড্রপডাউন */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">থান কাপড় নির্বাচন করুন *</label>
                      <select
                        required
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          setSelectedVariantId('');
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-bold text-slate-800"
                      >
                        <option value="">তালিকায় থাকা থান কাপড় বাছাই করুন...</option>
                        {fabricProducts.map((p) => {
                          const sQty = Number(p.StockQuantity !== undefined ? p.StockQuantity : (p.CurrentStock || 0));
                          const gQty = Number(p.GodownStock || 0);
                          return (
                            <option key={p.ProductID || p.id} value={p.ProductID || p.id}>
                              {p.ProductName || p.name} (দোকানে: {sQty} গজ | গোডাউনে: {gQty} থান)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* ভ্যারিয়েন্ট ড্রপডাউন (যদি থাকে) */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        নির্দিষ্ট কালার / ভ্যারিয়েন্ট (ঐচ্ছিক)
                      </label>
                      {selectedProduct && Array.isArray(selectedProduct.Variants) && selectedProduct.Variants.length > 0 ? (
                        <select
                          value={selectedVariantId}
                          onChange={(e) => setSelectedVariantId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-bold text-slate-800"
                        >
                          <option value="">সাধারণ / সকল ভ্যারিয়েন্ট</option>
                          {selectedProduct.Variants.map((v, vIdx) => {
                            const vLabel = [v.Color, v.Size].filter(Boolean).join(' - ') || `ভ্যারিয়েন্ট #${vIdx + 1}`;
                            const vStock = location === 'Godown' ? `${v.GodownStock || 0} থান` : `${v.StockQuantity || 0} গজ`;
                            return (
                              <option key={v.VariantID || vIdx} value={v.VariantID || v.variantId || vIdx}>
                                {vLabel} (মজুত: {vStock})
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder="এই পণ্যে কোনো ভ্যারিয়েন্ট নেই"
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 font-medium cursor-not-allowed text-xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* নির্বাচিত পণ্যের বর্তমান মজুত কার্ড */}
                  {selectedProduct && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">নির্বাচিত অবস্থানে বর্তমান মজুত:</span>
                        <strong className="text-emerald-950 font-black ml-2 font-mono text-sm">
                          {currentStockInfo.text}
                        </strong>
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        ক্রয়মূল্য: {currencySymbol}{costPrice}/গজ
                      </div>
                    </div>
                  )}
                </div>

                {/* ধাপ ২: পরিমাপ ইনপুট (গজ ও গিরা অথবা থান) */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0da487] flex items-center justify-center text-xs">২</span>
                    <span>{location === 'Godown' ? 'নষ্ট আস্ত থানের সংখ্যা' : 'ছাঁট বা নষ্ট কাপড়ের পরিমাণ (গজ ও গিরা)'}</span>
                  </h4>

                  {location === 'Godown' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">ড্যামেজ থানের সংখ্যা (Thans) *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={thans}
                          onChange={(e) => setThans(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-black text-slate-900 text-sm font-mono"
                        />
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">মোট হিসাব (১ থান = {yardsPerThan} গজ)</span>
                        <span className="text-base font-black text-slate-900 font-mono">
                          {totalYards.toLocaleString('bn-BD')} গজ কাপড়
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">গজ (Yards)</label>
                        <input
                          type="number"
                          min="0"
                          value={goj}
                          onChange={(e) => setGoj(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-black text-slate-900 text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">গিরা (Gira - ১ গজ = ১৬ গিরা)</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={gira}
                          onChange={(e) => setGira(Math.min(15, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-black text-slate-900 text-sm font-mono"
                        />
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">মোট পরিমাণ</span>
                        <span className="text-base font-black text-[#0b8b72] font-mono">
                          {formatFabricQuantity(totalYards, 'গজ', true)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ধাপ ৩: কারণ ও আর্থিক ক্ষতি */}
                <div className="space-y-3 pb-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0da487] flex items-center justify-center text-xs">৩</span>
                    <span>অপচয়ের কারণ ও আর্থিক ক্ষতির হিসাব</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">অপচয় বা ছাঁটের কারণ নির্বাচন করুন *</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(location === 'Godown' ? [
                          'মিলের ত্রুটি / কালার ফল্ট (Mill Defect)',
                          'ইঁদুরে কাটা / কীট-পতঙ্গের ক্ষতি',
                          'পানি বা স্যাঁতসেঁতে নষ্ট (Water Damage)',
                          'মহাজন চালানে ড্যামেজ',
                          'অন্যান্য'
                        ] : entryType === 'Remnant' ? [
                          'থানের শেষ ছাঁট (End-of-bolt Remnant)',
                          'কাটিং অপচয় (Cutting Scrap)',
                          'কাস্টমার অর্ডার বাতিল ছাঁট',
                          'অন্যান্য'
                        ] : [
                          'ছেঁড়া বা কাটা ভুল (Torn / Cut Mistake)',
                          'ডিসপ্লে নষ্ট / ময়লা',
                          'কাউন্টার ড্যামেজ',
                          'অন্যান্য'
                        ]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setReason(r)}
                            className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                              reason === r
                                ? 'bg-[#0da487] text-white border-[#0da487] shadow-2xs font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>

                      {reason === 'অন্যান্য' && (
                        <input
                          type="text"
                          required
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="সুনির্দিষ্ট কারণটি লিখুন..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-medium text-xs"
                        />
                      )}
                    </div>

                    {/* আর্থিক ক্ষতির হিসাব কার্ড */}
                    <div className="bg-rose-950 text-white p-4 rounded-2xl flex items-center justify-between border border-rose-900 shadow-xs">
                      <div>
                        <span className="text-[10px] text-rose-300 uppercase font-bold block">আনুমানিক আর্থিক ক্ষতি</span>
                        <h4 className="text-2xl font-black text-white mt-0.5 font-mono">{currencySymbol}{lossAmount.toLocaleString('bn-BD')}</h4>
                        <span className="text-[10px] text-rose-300 block mt-1 font-mono">
                          (কেনা দর: {currencySymbol}{costPrice} × {totalYards} গজ)
                        </span>
                      </div>

                      <div className="w-11 h-11 rounded-2xl bg-rose-800/60 text-rose-300 flex items-center justify-center font-bold">
                        <TrendingDown className="w-6 h-6 text-rose-300" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* অপশন: ক্লিয়ারেন্স ছাঁট প্যাক হিসেবে কম দামে বিক্রি */}
                {entryType === 'Remnant' && location === 'Shop' && (
                  <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/90 space-y-2 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createClearanceBundle}
                        onChange={(e) => setCreateClearanceBundle(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0da487] focus:ring-[#0da487] border-amber-300"
                      />
                      <span className="font-bold text-amber-950 text-xs">
                        ✨ এই ছাঁট কাপড়টি ডিসকাউন্ট প্যাক হিসেবে ক্যাটালগে যুক্ত করুন (Clearance Remnant Bundle)
                      </span>
                    </label>

                    {createClearanceBundle && (
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2">
                          <label className="font-bold text-slate-700">ছাঁট প্যাক বিক্রয় মূল্য ({currencySymbol}):</label>
                          <input
                            type="number"
                            min="1"
                            value={bundlePrice}
                            onChange={(e) => setBundlePrice(parseFloat(e.target.value) || 0)}
                            className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-black text-amber-950 w-32 focus:ring-2 focus:ring-[#0da487] font-mono"
                          />
                        </div>
                        <span className="text-[11px] text-slate-600">
                          স্বয়ংক্রিয়ভাবে পিওএস কাউন্টারে <strong>[ছাঁট প্যাক]</strong> নামে পাওয়া যাবে এবং স্টিকার প্রিন্ট করা যাবে।
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* অতিরিক্ত মন্তব্য */}
                <div className="text-xs">
                  <label className="block text-slate-700 font-bold mb-1">অতিরিক্ত নোট / বিবরণ (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="যেমন: এই থানটি শেষ হওয়ার পর ১ গজ ছাঁট পাওয়া গেছে বা মিল ফল্ট..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-medium"
                  />
                </div>
              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0da487] hover:bg-[#0b8b72] active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>রেকর্ড সংরক্ষণ ও স্টক সমন্বয় করুন</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* বারকোড স্টিকার প্রিন্ট সাব-মডাল */}
        {printStickerProduct && (
          <BarcodeStickerModal
            isOpen={!!printStickerProduct}
            onClose={() => setPrintStickerProduct(null)}
            product={printStickerProduct}
            currencySymbol={currencySymbol}
            storeName={storeSettings?.StoreName || 'Pabna Bostraloy'}
          />
        )}
      </div>
    </div>
  );
}
