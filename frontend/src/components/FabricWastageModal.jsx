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
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Palette
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
  const [recordsViewMode, setRecordsViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

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
  const [recordAsExpense, setRecordAsExpense] = useState(true);

  // বারকোড স্টিকার প্রিন্ট মডাল স্টেট
  const [printStickerProduct, setPrintStickerProduct] = useState(null);

  // যদি initialProduct পাস করা থাকে, তবে স্বয়ংক্রিয়ভাবে ফর্ম ইনিশিয়ালাইজ করুন
  useEffect(() => {
    if (initialProduct && (initialProduct.ProductID || initialProduct.id)) {
      const pId = String(initialProduct.ProductID || initialProduct.id).trim();
      setSelectedProductId(pId);

      const prod = (products || []).find((p) => String(p.ProductID || p.id).trim() === pId);
      let matchedVal = '';
      if (prod && Array.isArray(prod.Variants) && prod.Variants.length > 0) {
        const targetId = String(initialProduct.VariantID || initialProduct.variantId || '').trim().toLowerCase();
        const targetBar = String(initialProduct.Barcode || initialProduct.VariantBarcode || '').trim().toLowerCase();
        const targetName = String(initialProduct.VariantName || initialProduct.variantName || initialProduct.Color || '').trim().toLowerCase();

        const matchIdx = prod.Variants.findIndex((v, idx) => {
          const vId = String(v.VariantID || v.variantId || '').trim().toLowerCase();
          const vBar = String(v.Barcode || v.barcode || '').trim().toLowerCase();
          const vCol = String(v.Attributes?.Color || v.Color || v.ColorName || v.VariantName || '').trim().toLowerCase();
          return (targetId && (vId === targetId || String(idx) === targetId || vBar === targetId)) ||
                 (targetBar && (vBar === targetBar || vId === targetBar)) ||
                 (targetName && (vCol === targetName || targetName.includes(vCol) || vCol.includes(targetName)));
        });

        if (matchIdx !== -1) {
          const mv = prod.Variants[matchIdx];
          matchedVal = String(mv.VariantID || mv.variantId || mv.Barcode || mv.Attributes?.Color || mv.Color || matchIdx);
        }
      }

      if (matchedVal) {
        setSelectedVariantId(matchedVal);
      } else if (initialProduct.VariantID || initialProduct.variantId || initialProduct.VariantName || initialProduct.Barcode) {
        setSelectedVariantId(String(initialProduct.VariantID || initialProduct.variantId || initialProduct.Barcode || initialProduct.VariantName || ''));
      } else {
        setSelectedVariantId('');
      }

      setLocation('Shop');
      setActiveTab('new');
      if (initialProduct.remnantYards !== undefined && initialProduct.remnantYards !== null) {
        const parsed = parseGojGira(initialProduct.remnantYards);
        setGoj(parsed.goj !== undefined ? parsed.goj : 0);
        setGira(parsed.gira !== undefined ? parsed.gira : 0);
        setEntryType('Remnant');
        setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
      }
    }
  }, [initialProduct, products]);

  // থান ও গজ কাপড়ের পণ্য তালিকা
  const fabricProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const u = String(p.Unit || p.unit || '').toLowerCase();
      const cat = String(p.Category || p.category || '').toLowerCase();
      const name = String(p.ProductName || p.name || '').toLowerCase();
      return u.includes('গজ') || u.includes('yard') || u.includes('than') || u.includes('থান') || cat.includes('থান') || cat.includes('কাপড়') || name.includes('থান') || name.includes('কাপড়');
    });
  }, [products]);

  // দোকানে বর্তমানে সক্রিয় শেষ ছাঁট কাপড়ের তালিকা (ভ্যারিয়েন্ট অনুযায়ী ১ গজ বা কম ও সাধারণ পণ্য উভয়ই শনাক্তকরণ)
  const liveShopRemnants = useMemo(() => {
    const list = [];
    fabricProducts.forEach((p) => {
      const u = String(p.Unit || p.unit || '');
      const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
      const remTh = Number(
        p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
          ? p.RemnantThreshold
          : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
            ? p.remnantThreshold
            : 1)
      );

      const hasVars = Array.isArray(p.Variants) && p.Variants.length > 0;
      if (hasVars) {
        p.Variants.forEach((v) => {
          const vStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          const bd = calculateThanBreakdown(vStock, ypt, remTh);
          if (bd.isRemnant) {
            list.push({
              key: `${p.ProductID || p.id}_${v.VariantID || v.variantId || v.Barcode || Math.random()}`,
              product: p,
              variant: v,
              isVariant: true,
              breakdown: bd,
              remnantYards: bd.runningCutYards,
              shopStock: vStock,
              godownStock: vGStock,
              threshold: remTh
            });
          }
        });
      } else {
        const sStock = Number(p.StockQuantity !== undefined ? p.StockQuantity : (p.CurrentStock || p.stock || 0));
        const gStock = Number(p.GodownStock || 0);
        const bd = calculateThanBreakdown(sStock, ypt, remTh);
        if (bd.isRemnant) {
          list.push({
            key: String(p.ProductID || p.id),
            product: p,
            variant: null,
            isVariant: false,
            breakdown: bd,
            remnantYards: bd.runningCutYards,
            shopStock: sStock,
            godownStock: gStock,
            threshold: remTh
          });
        }
      }
    });
    return list;
  }, [fabricProducts]);

  // দোকানে বর্তমানে সক্রিয় শেষ ছাঁট কাপড়ের গ্রুপভিত্তিক খতিয়ান (প্যারেন্ট নামের অধীনে ভ্যারিয়েন্ট তালিকা)
  const groupedLiveRemnants = useMemo(() => {
    const groupMap = new Map();

    liveShopRemnants.forEach((item) => {
      const prodId = String(item.product.ProductID || item.product.id);
      if (!groupMap.has(prodId)) {
        groupMap.set(prodId, {
          productId: prodId,
          product: item.product,
          hasVariants: Array.isArray(item.product.Variants) && item.product.Variants.length > 0,
          totalRemnantYards: 0,
          totalShopStock: 0,
          totalGodownStock: Number(item.product.GodownStock || 0),
          items: []
        });
      }
      const grp = groupMap.get(prodId);
      grp.items.push(item);
      grp.totalRemnantYards = Math.round((grp.totalRemnantYards + (Number(item.remnantYards) || 0)) * 10000) / 10000;
      grp.totalShopStock = Math.round((grp.totalShopStock + (Number(item.shopStock) || 0)) * 10000) / 10000;
    });

    return Array.from(groupMap.values());
  }, [liveShopRemnants]);

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
    const target = String(selectedVariantId).trim().toLowerCase();
    return selectedProduct.Variants.find((v, idx) => {
      const vId = String(v.VariantID || v.variantId || '').trim().toLowerCase();
      const vCol = String(v.Attributes?.Color || v.Color || v.ColorName || v.VariantName || '').trim().toLowerCase();
      const vBar = String(v.Barcode || v.barcode || '').trim().toLowerCase();
      const vKey = String(v.VariantID || v.variantId || v.Barcode || v.Attributes?.Color || v.Color || idx).trim().toLowerCase();
      return (target && (vKey === target || vId === target || vBar === target || String(idx) === target)) ||
             (vCol && (vCol === target || target.includes(vCol) || vCol.includes(target)));
    });
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
      VariantID: selectedVariant ? (selectedVariant.VariantID || selectedVariant.variantId || selectedVariant.Barcode || selectedVariant.Color || '') : '',
      VariantName: selectedVariant ? (selectedVariant.ColorName || selectedVariant.Attributes?.Color || selectedVariant.Color || selectedVariant.VariantName || selectedVariant.name || [selectedVariant.Color, selectedVariant.Size].filter(Boolean).join(' - ') || 'ভ্যারিয়েন্ট') : '',
      Barcode: selectedVariant?.Barcode || selectedProduct.Barcode || '',
      VariantBarcode: selectedVariant?.Barcode || '',
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
      RecordAsExpense: Boolean(recordAsExpense && entryType === 'Damaged'),
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

  // পণ্য ও ভ্যারিয়েন্ট অনুযায়ী গ্রুপ করা রেকর্ড তালিকা
  const groupedWastageRecords = useMemo(() => {
    const map = new Map();
    filteredList.forEach((r) => {
      const pid = String(r.ProductID || r.ProductName || 'unknown').trim();
      if (!map.has(pid)) {
        const matchedProd = (products || []).find((p) => String(p.ProductID || p.id).trim() === pid);
        const hasVars = Boolean(
          (matchedProd && Array.isArray(matchedProd.Variants) && matchedProd.Variants.length > 0) ||
          r.VariantID ||
          r.VariantName
        );

        map.set(pid, {
          productId: pid,
          productName: r.ProductName || matchedProd?.ProductName || 'পণ্য',
          category: r.Category || matchedProd?.Category || 'থান কাপড়',
          hasVariants: hasVars,
          totalYards: 0,
          totalLoss: 0,
          records: []
        });
      }
      const grp = map.get(pid);
      grp.records.push(r);
      grp.totalYards = Math.round((grp.totalYards + (Number(r.TotalYards) || 0)) * 10000) / 10000;
      grp.totalLoss += (Number(r.LossAmount) || 0);
      if (r.VariantID || r.VariantName) {
        grp.hasVariants = true;
      }
    });
    return Array.from(map.values());
  }, [filteredList, products]);

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
          ? 'w-full h-full flex flex-col bg-[#FAFAFA]'
          : 'fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          embedded
            ? 'w-full h-full flex flex-col bg-white rounded-lg border border-neutral-200/80 overflow-hidden'
            : 'bg-white rounded-lg border border-neutral-200/80 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200'
        }
      >
        {/* ================= ১. হেডার ================= */}
        <div className="bg-[#FAFAFA] text-[#111111] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#111111]">
                  কাপড়ের ছাঁট ও ড্যামেজ হিসাব ট্র্যাকার
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 uppercase tracking-wider">
                  Remnant & Damage Studio
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5 font-medium">
                থান কাপড়ের শেষ অবশিষ্টাংশ (ছাঁট), কাটা অপচয়, মিল ড্যামেজ নিখুঁতকরণ ও ক্লিয়ারেন্স সেল
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ৪টি ট্যাব পিলস */}
            <div className="bg-[#F5F5F5] p-1 rounded-lg flex items-center border border-neutral-200/80 text-xs font-semibold gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('live_remnants')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'live_remnants'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:text-[#111111]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>সক্রিয় ছাঁট</span>
                {liveShopRemnants.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-50 text-[#B45309] border border-amber-200 font-mono tabular-nums font-bold">
                    {liveShopRemnants.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bundles')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'bundles'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:text-[#111111]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>ছাঁট বান্ডেল</span>
                {clearanceBundles.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold ${
                    activeTab === 'bundles' ? 'bg-white/20 text-white' : 'bg-white border border-neutral-200/80 text-[#111111]'
                  }`}>
                    {clearanceBundles.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:text-[#111111]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>রেকর্ড খাতা</span>
                {(fabricWastageList || []).length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold ${
                    activeTab === 'list' ? 'bg-white/20 text-white' : 'bg-white border border-neutral-200/80 text-[#111111]'
                  }`}>
                    {(fabricWastageList || []).length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'new'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#525252] hover:text-[#111111]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন এন্ট্রি</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-2 rounded-md bg-white border border-neutral-200/80 text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= ২. মূল কনটেন্ট এরিয়া ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] space-y-5">
          
          {/* ট্যাব ১: দোকানে সক্রিয় কাউন্টার ছাঁট কাপড় */}
          {activeTab === 'live_remnants' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white border border-amber-200 text-[#B45309] rounded-md">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                      দোকানে চলমান থানের শেষ ছাঁট কাপড়ের খতিয়ান
                    </h3>
                    <p className="text-xs text-[#525252] mt-0.5">
                      কাউন্টার টেবিলে যে থানগুলোর কাপড় ছাঁট সতর্কতার সীমার নিচে নেমে এসেছে—এগুলো এখনও <strong className="text-[#111111]">দোকানের মজুতেই সক্রিয় আছে</strong> এবং খুচরা টুকরা হিসেবে বিক্রয়যোগ্য।
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-[#B45309]">মোট সক্রিয় ছাঁট:</span>
                  <div className="text-xl font-bold text-[#111111] font-mono tabular-nums">
                    {liveShopRemnants.length}টি লট ({groupedLiveRemnants.length}টি কাপড়)
                  </div>
                </div>
              </div>

              {liveShopRemnants.length === 0 ? (
                <div className="bg-white rounded-lg p-10 text-center border border-neutral-200/80 space-y-3">
                  <div className="w-16 h-16 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-[#111111]">দোকানে কোনো শেষ ছাঁট কাপড় নেই</h3>
                  <p className="text-xs text-[#525252] max-w-md mx-auto">
                    দোকানের প্রতিটি থান কাপড়ে পর্যাপ্ত গজ অবশিষ্ট রয়েছে অথবা কোনো থানের কাপড় ছাঁট সীমার নিচে নামেনি।
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedLiveRemnants.map((grp) => {
                    if (grp.hasVariants) {
                      // ভ্যারিয়েন্টভিত্তিক কাপড়: মূল পণ্যের ব্যানারের নিচে ভ্যারিয়েন্টগুলোর তালিকা
                      return (
                        <div key={grp.productId} className="bg-white rounded-lg border border-amber-200 overflow-hidden">
                          {/* প্যারেন্ট কাপড়ের হেডার */}
                          <div className="p-3.5 sm:p-4 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-2 bg-white border border-amber-200 text-[#B45309] rounded-md">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-[#B45309] border border-amber-200 uppercase tracking-wide">
                                    {grp.product.Category || 'থান কাপড়'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-[#111111] border border-neutral-200/80 font-mono tabular-nums inline-flex items-center space-x-1">
                                    <Palette className="w-3 h-3 text-[#0F172A]" />
                                    <span>{grp.items.length}টি ভ্যারিয়েন্টে ছাঁট</span>
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold tracking-tight text-[#111111] mt-1">
                                  {grp.product.ProductName}
                                </h4>
                                <span className="text-[10px] font-mono tabular-nums text-[#737373]">
                                  ID: {grp.product.ProductID} {grp.product.Barcode ? `• #${grp.product.Barcode}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 text-right">
                              <div>
                                <span className="text-[10.5px] font-semibold text-[#525252] block">মোট ছাঁট অবশিষ্টাংশ:</span>
                                <span className="text-sm font-bold text-[#B45309] font-mono tabular-nums">
                                  {formatFabricQuantity(grp.totalRemnantYards, 'গজ', false)}
                                </span>
                              </div>
                              <div className="pl-3 border-l border-amber-200">
                                <span className="text-[10.5px] font-semibold text-[#525252] block">দোকানে মোট কাপড়:</span>
                                <span className="text-xs font-bold text-[#111111] font-mono tabular-nums">
                                  {Number(grp.totalShopStock || 0).toLocaleString('bn-BD')} গজ
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* প্যারেন্ট কাপড়ের আন্ডারে ভ্যারিয়েন্টগুলোর তালিকা */}
                          <div className="p-3.5 sm:p-4 bg-[#FAFAFA] space-y-2.5">
                            <div className="text-[11px] font-semibold text-[#525252] flex items-center space-x-1.5 px-0.5">
                              <Scissors className="w-3.5 h-3.5 text-[#B45309]" />
                              <span>এই থানের ছাঁট হওয়া ভ্যারিয়েন্টসমূহ (<span className="font-mono tabular-nums">{grp.items.length}</span>টি):</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {grp.items.map(({ key, product: p, variant: v, breakdown: bd, remnantYards, shopStock, godownStock, threshold }) => {
                                const variantLabel = v ? (v.ColorName || v.Attributes?.Color || v.Color || v.VariantName || v.name || Object.values(v.Attributes || {})[0] || 'ভ্যারিয়েন্ট') : '';
                                const effSellingPrice = Number(v?.SellingPrice || v?.sellingPrice || p.SellingPrice || p.Price || 100);

                                return (
                                  <div key={key} className="bg-white p-3.5 rounded-lg border border-neutral-200/80 hover:border-amber-300 transition-colors space-y-2.5">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 inline-flex items-center space-x-1">
                                          <Palette className="w-3 h-3 text-[#0F172A]" />
                                          <span>{variantLabel}</span>
                                        </span>
                                        <span className="text-[10px] font-mono tabular-nums text-[#737373] block mt-1">
                                          #{v?.Barcode || p.Barcode || '—'}
                                        </span>
                                      </div>
                                      <span className="p-1 bg-amber-50 text-[#B45309] border border-amber-200 rounded-md">
                                        <Scissors className="w-3.5 h-3.5" />
                                      </span>
                                    </div>

                                    <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200 space-y-1">
                                      <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                                        <span className="flex items-center space-x-1 text-[#B45309]">
                                          <Scissors className="w-3 h-3" />
                                          <span>থানের শেষ ছাঁট:</span>
                                        </span>
                                        <span className="text-[#B45309] font-mono tabular-nums font-bold text-sm">
                                          {formatFabricQuantity(remnantYards, 'গজ', false)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10.5px] text-[#525252] font-medium pt-1 border-t border-amber-200">
                                        <span>দোকানে মোট গজ:</span>
                                        <span className="font-mono tabular-nums font-bold text-[#111111]">{Number(shopStock || 0).toLocaleString('bn-BD')} গজ</span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10.5px] text-[#525252] font-medium">
                                        <span>ছাঁট সতর্কতা সীমা:</span>
                                        <span className="font-mono tabular-nums text-[#111111]">{threshold} গজ</span>
                                      </div>
                                    </div>

                                    {bd.needsRestock && (
                                      <div className="p-1.5 bg-red-50 text-[#B91C1C] rounded-md border border-red-200 text-[10px] font-semibold font-mono tabular-nums flex items-center space-x-1">
                                        <AlertTriangle className="w-3 h-3 text-[#B91C1C] shrink-0" />
                                        <span>আস্ত থান নেই! গোডাউনে আছে: {godownStock} থান</span>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedProductId(p.ProductID || p.id);
                                          setSelectedVariantId(v.VariantID || v.variantId || '');
                                          setLocation('Shop');
                                          setEntryType('Remnant');
                                          setGoj(bd.runningCutGojGira.goj !== undefined ? bd.runningCutGojGira.goj : 0);
                                          setGira(bd.runningCutGojGira.gira !== undefined ? bd.runningCutGojGira.gira : 0);
                                          setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                                          setCreateClearanceBundle(true);
                                          setBundlePrice(Math.round((remnantYards * effSellingPrice) * 0.8));
                                          setActiveTab('new');
                                        }}
                                        className="min-h-[44px] sm:min-h-[36px] py-1.5 px-2 bg-[#B45309] hover:bg-amber-800 text-white rounded-md text-[10.5px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                                      >
                                        <Tag className="w-3 h-3" />
                                        <span>বান্ডেল তৈরি</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPrintStickerProduct({
                                            ProductID: p.ProductID || p.id,
                                            VariantID: v.VariantID || v.variantId || null,
                                            ProductName: `${p.ProductName} (${variantLabel}) (ছাঁট ${formatFabricQuantity(remnantYards, 'গজ', false)})`,
                                            Barcode: v?.Barcode || p.Barcode,
                                            SellingPrice: Math.round(remnantYards * effSellingPrice),
                                            Price: Math.round(remnantYards * effSellingPrice),
                                            Unit: 'টুকরা'
                                          });
                                        }}
                                        className="min-h-[44px] sm:min-h-[36px] py-1.5 px-2 bg-[#F5F5F5] hover:bg-neutral-200 text-[#111111] rounded-md text-[10.5px] font-semibold transition-colors flex items-center justify-center space-x-1 border border-neutral-200/80 cursor-pointer"
                                        title="কাউন্টার বিক্রির জন্য ছোট প্রাইস ট্যাগ স্টিকার প্রিন্ট করুন"
                                      >
                                        <Printer className="w-3 h-3" />
                                        <span>ট্যাগ প্রিন্ট</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // সাধারণ কাপড় (কোনো ভ্যারিয়েন্ট নেই): সরাসরি মূল পণ্যের কার্ড
                      const item = grp.items[0];
                      if (!item) return null;
                      const { breakdown: bd, remnantYards, shopStock, godownStock, threshold } = item;
                      const p = grp.product;
                      const effSellingPrice = Number(p.SellingPrice || p.Price || 100);

                      return (
                        <div key={grp.productId} className="bg-white p-4 rounded-lg border border-amber-200 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-[#B45309] border border-amber-200 uppercase tracking-wide">
                                  {p.Category || 'থান কাপড়'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                                  সাধারণ থান
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold tracking-tight text-[#111111] mt-1 line-clamp-1">
                                {p.ProductName}
                              </h4>
                              <span className="text-[10px] font-mono tabular-nums text-[#737373]">
                                #{p.Barcode || p.ProductID}
                              </span>
                            </div>
                            <span className="p-1.5 bg-amber-50 text-[#B45309] border border-amber-200 rounded-md">
                              <Scissors className="w-4 h-4" />
                            </span>
                          </div>

                          <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200 space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                              <span className="flex items-center space-x-1 text-[#B45309]">
                                <Scissors className="w-3 h-3" />
                                <span>থানের শেষ ছাঁট:</span>
                              </span>
                              <span className="text-[#B45309] font-mono tabular-nums font-bold text-sm">
                                {formatFabricQuantity(remnantYards, 'গজ', false)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#525252] font-medium pt-1 border-t border-amber-200">
                              <span>দোকানে মোট গজ:</span>
                              <span className="font-mono tabular-nums font-bold text-[#111111]">{Number(shopStock || 0).toLocaleString('bn-BD')} গজ</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#525252] font-medium">
                              <span>ছাঁট সতর্কতা সীমা:</span>
                              <span className="font-mono tabular-nums text-[#111111]">{threshold} গজ</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {bd.needsRestock && (
                              <div className="p-2 bg-red-50 text-[#B91C1C] rounded-md border border-red-200 text-[10.5px] font-semibold font-mono tabular-nums flex items-center space-x-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                                <span>কাটার মতো আস্ত থান নেই! গোডাউনে আছে: {godownStock} থান</span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(p.ProductID || p.id);
                                  setSelectedVariantId('');
                                  setLocation('Shop');
                                  setEntryType('Remnant');
                                  setGoj(bd.runningCutGojGira.goj !== undefined ? bd.runningCutGojGira.goj : 0);
                                  setGira(bd.runningCutGojGira.gira !== undefined ? bd.runningCutGojGira.gira : 0);
                                  setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                                  setCreateClearanceBundle(true);
                                  setBundlePrice(Math.round((remnantYards * effSellingPrice) * 0.8));
                                  setActiveTab('new');
                                }}
                                className="min-h-[44px] sm:min-h-[36px] py-1.5 px-2 bg-[#B45309] hover:bg-amber-800 text-white rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <Tag className="w-3 h-3" />
                                <span>ছাঁট বান্ডেল তৈরি</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPrintStickerProduct({
                                    ProductID: p.ProductID || p.id,
                                    ProductName: `${p.ProductName} (ছাঁট ${formatFabricQuantity(remnantYards, 'গজ', false)})`,
                                    Barcode: p.Barcode,
                                    SellingPrice: Math.round(remnantYards * effSellingPrice),
                                    Price: Math.round(remnantYards * effSellingPrice),
                                    Unit: 'টুকরা'
                                  });
                                }}
                                className="min-h-[44px] sm:min-h-[36px] py-1.5 px-2 bg-[#F5F5F5] hover:bg-neutral-200 text-[#111111] rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1 border border-neutral-200/80 cursor-pointer"
                                title="কাউন্টার বিক্রির জন্য ছোট প্রাইস ট্যাগ স্টিকার প্রিন্ট করুন"
                              >
                                <Printer className="w-3 h-3" />
                                <span>ট্যাগ প্রিন্ট</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ২: ক্লিয়ারেন্স বান্ডেল খতিয়ান */}
          {activeTab === 'bundles' && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-[#0F172A]" />
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-[#111111]">ক্লিয়ারেন্স ছাঁট বান্ডেলসমূহ</h3>
                    <p className="text-[11px] text-[#525252]">বিশেষ ছাঁট প্যাক হিসেবে ক্যাটালগে যুক্ত টুকরা কাপড়</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={bundleStatusFilter}
                    onChange={(e) => setBundleStatusFilter(e.target.value)}
                    className="min-h-[44px] sm:min-h-[36px] text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md px-3 py-1.5 font-semibold text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ALL">সকল অবস্থা (All Status)</option>
                    <option value="Available">দোকানে মজুত আছে</option>
                    <option value="Sold">পিওএস-এ বিক্রিত</option>
                  </select>
                </div>
              </div>

              {filteredBundles.length === 0 ? (
                <div className="bg-white rounded-lg p-10 text-center border border-neutral-200/80 space-y-3">
                  <div className="w-16 h-16 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 text-[#737373] mx-auto flex items-center justify-center">
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-[#111111]">কোনো ক্লিয়ারেন্স বান্ডেল পাওয়া যায়নি</h3>
                  <p className="text-xs text-[#525252] max-w-md mx-auto">
                    থানের শেষ টুকরা কাপড় কম দামে বিক্রির জন্য "নতুন এন্ট্রি" থেকে ছাঁট বান্ডেল হিসেবে সংরক্ষণ করুন।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredBundles.map((b) => {
                    const isSold = b.BundleStatus === 'Sold';
                    return (
                      <div key={b.WastageID} className="bg-white p-4 rounded-lg border border-neutral-200/80 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border inline-flex items-center space-x-1 uppercase tracking-wider ${
                              isSold
                                ? 'bg-[#F5F5F5] text-[#111111] border-neutral-300'
                                : 'bg-emerald-50 text-[#15803D] border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isSold ? 'bg-[#0F172A]' : 'bg-[#15803D]'}`}></span>
                              <span>{isSold ? 'পিওএস-এ বিক্রিত' : 'দোকানে বিক্রয়যোগ্য'}</span>
                            </span>
                            <h4 className="text-xs font-semibold tracking-tight text-[#111111] mt-1.5 line-clamp-1">
                              [ছাঁট প্যাক] {b.ProductName} {b.VariantName ? `(${b.VariantName})` : ''}
                            </h4>
                            <span className="text-[10px] font-mono tabular-nums text-[#737373] block">
                              বারকোড: {b.BundleBarcode || b.WastageID}
                            </span>
                          </div>
                          <span className="p-1.5 bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 rounded-md">
                            <Tag className="w-4 h-4" />
                          </span>
                        </div>

                        <div className="p-2.5 bg-[#FAFAFA] rounded-md border border-neutral-200/80 space-y-1 text-xs">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-[#525252]">কাপড়ের পরিমাণ:</span>
                            <span className="font-mono tabular-nums font-bold text-[#111111]">
                              {formatFabricQuantity(b.TotalYards, 'গজ', true)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-[#525252]">ছাঁট অফার মূল্য:</span>
                            <span className="font-mono tabular-nums font-bold text-[#15803D] text-sm">
                              {currencySymbol}{b.BundlePrice || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-medium text-[10.5px] text-[#525252] pt-1 border-t border-neutral-200/80">
                            <span>মূল ক্রয়মূল্য:</span>
                            <span className="font-mono tabular-nums">{currencySymbol}{b.LossAmount || 0}</span>
                          </div>
                          {isSold && b.SoldAt && (
                            <div className="text-[10px] text-[#525252] font-mono tabular-nums font-semibold pt-0.5">
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
                            className="min-h-[44px] sm:min-h-[36px] w-full py-1.5 px-3 bg-[#F5F5F5] hover:bg-[#0F172A] hover:text-white text-[#111111] rounded-md text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 border border-neutral-200/80 cursor-pointer"
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
              {/* KPI স্ট্রিপ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-[#525252] uppercase tracking-wider block">মোট অপচয় / ছাঁট গজ</span>
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] mt-0.5 font-mono tabular-nums">
                      {formatFabricQuantity(kpi.totalWastedYards, 'গজ', false)}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                    <Scissors className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-[#B91C1C] uppercase tracking-wider block">মোট আর্থিক ক্ষতি</span>
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#B91C1C] mt-0.5 font-mono tabular-nums">
                      {currencySymbol}{kpi.totalLoss.toLocaleString('bn-BD')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-red-50 border border-red-200 text-[#B91C1C] flex items-center justify-center">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-[#B45309] uppercase tracking-wider block">থানের শেষ ছাঁট (Remnant)</span>
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#B45309] mt-0.5 font-mono tabular-nums">{kpi.remnantCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-[#15803D] uppercase tracking-wider block">বিক্রয়যোগ্য ছাঁট প্যাক</span>
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#15803D] mt-0.5 font-mono tabular-nums">{kpi.availableBundlesCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* ফিল্টার ও সার্চ বার */}
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কাপড়ের নাম, ভ্যারিয়েন্ট, আইডি বা কারণ দিয়ে খুঁজুন..."
                    className="min-h-[44px] sm:min-h-[36px] w-full pl-9 pr-4 py-2 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-medium text-[#111111]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="min-h-[44px] sm:min-h-[36px] px-2 absolute right-2 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] text-xs cursor-pointer"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="min-h-[44px] sm:min-h-[36px] text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md px-3 py-2 font-semibold text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ALL">সকল অবস্থান (Shop & Godown)</option>
                    <option value="Shop">দোকান ফ্লোর</option>
                    <option value="Godown">গোডাউন</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="min-h-[44px] sm:min-h-[36px] text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md px-3 py-2 font-semibold text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ALL">সকল ধরণ (All Types)</option>
                    <option value="Remnant">থানের শেষ ছাঁট (Remnant)</option>
                    <option value="Damaged">নষ্ট / ড্যামেজ (Damaged)</option>
                  </select>

                  <div className="flex items-center p-0.5 bg-[#F5F5F5] rounded-md border border-neutral-200/80">
                    <button
                      type="button"
                      onClick={() => setRecordsViewMode('grouped')}
                      className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                        recordsViewMode === 'grouped'
                          ? 'bg-[#0F172A] text-white'
                          : 'text-[#525252] hover:text-[#111111]'
                      }`}
                      title="পণ্য ও ভ্যারিয়েন্ট অনুযায়ী গ্রুপকৃত হিসাব"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>পণ্য গ্রুপ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordsViewMode('flat')}
                      className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                        recordsViewMode === 'flat'
                          ? 'bg-[#0F172A] text-white'
                          : 'text-[#525252] hover:text-[#111111]'
                      }`}
                      title="সকল এন্ট্রি কালানুক্রমিক একক তালিকায় দেখুন"
                    >
                      <span>একক তালিকা</span>
                    </button>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#F5F5F5] hover:bg-neutral-200 text-[#111111] border border-neutral-200/80 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* রেকর্ড তালিকা টেবিল */}
              {filteredList.length === 0 ? (
                <div className="bg-white rounded-lg p-10 text-center border border-neutral-200/80 space-y-3">
                  <div className="w-16 h-16 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 text-[#737373] mx-auto flex items-center justify-center">
                    <Layers className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-[#111111]">কোনো ছাঁট বা ড্যামেজ রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-[#525252] max-w-md mx-auto">
                    থান কাপড়ের শেষ অবশিষ্টাংশ বা নষ্ট কাপড় থাকলে "নতুন এন্ট্রি" থেকে রেকর্ড সংরক্ষণ করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন এন্ট্রি যোগ করুন</span>
                  </button>
                </div>
              ) : recordsViewMode === 'grouped' ? (
                /* গ্রুপ ভিউ: মূল পণ্যের ব্যানারের নিচে ভ্যারিয়েন্টগুলোর তালিকা */
                <div className="space-y-4">
                  {groupedWastageRecords.map((grp) => (
                    <div key={grp.productId} className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden">
                      {/* গ্রুপ হেডার */}
                      <div className="p-3.5 bg-[#FAFAFA] border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-white border border-neutral-200/80 text-[#0F172A] rounded-md">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 uppercase tracking-wide">
                                {grp.category || 'থান কাপড়'}
                              </span>
                              {grp.hasVariants ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-[#111111] border border-neutral-200/80 inline-flex items-center space-x-1">
                                  <Palette className="w-3 h-3 text-[#0F172A]" />
                                  <span>ভ্যারিয়েন্টভিত্তিক কাপড়</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                                  সাধারণ থান
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold tracking-tight text-[#111111] mt-1">
                              {grp.productName}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-right">
                          <div>
                            <span className="text-[10px] font-semibold text-[#525252] block">মোট অপচয়/ছাঁট:</span>
                            <span className="text-xs font-bold text-[#111111] font-mono tabular-nums">
                              {formatFabricQuantity(grp.totalYards, 'গজ', false)}
                            </span>
                          </div>
                          <div className="pl-3 border-l border-neutral-200/80">
                            <span className="text-[10px] font-semibold text-[#525252] block">মোট আর্থিক ক্ষতি:</span>
                            <span className="text-xs font-bold text-[#B91C1C] font-mono tabular-nums">
                              {currencySymbol}{grp.totalLoss.toLocaleString('bn-BD')}
                            </span>
                          </div>
                          <div className="pl-3 border-l border-neutral-200/80">
                            <span className="text-[10px] font-semibold text-[#525252] block">রেকর্ড সংখ্যা:</span>
                            <span className="text-xs font-bold text-[#111111] font-mono tabular-nums">
                              {grp.records.length}টি
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* রেকর্ড সাব-টেবিল */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#FAFAFA] border-b border-neutral-200/80 text-[#525252] font-semibold text-[10.5px]">
                              <th className="p-3 pl-4">তারিখ ও আইডি</th>
                              {grp.hasVariants && <th className="p-3">ভ্যারিয়েন্ট</th>}
                              <th className="p-3 text-center">অবস্থান</th>
                              <th className="p-3">ধরণ</th>
                              <th className="p-3 text-center">পরিমাণ</th>
                              <th className="p-3 text-center">আর্থিক ক্ষতি</th>
                              <th className="p-3">কারণ ও গৃহীত ব্যবস্থা</th>
                              <th className="p-3">এন্ট্রি কারী</th>
                              <th className="p-3 pr-4 text-right">অ্যাকশন</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200/80">
                            {grp.records.map((item) => (
                              <tr key={item.WastageID} className="hover:bg-[#FAFAFA] transition-colors">
                                <td className="p-3 pl-4">
                                  <span className="font-mono tabular-nums font-bold text-[#111111] block">{item.WastageID}</span>
                                  <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                                    {new Date(item.CreatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </td>
                                {grp.hasVariants && (
                                  <td className="p-3">
                                    {item.VariantName ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 inline-flex items-center space-x-1">
                                        <Palette className="w-3 h-3 text-[#0F172A]" />
                                        <span>{item.VariantName}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10.5px] text-[#737373] italic">সাধারণ</span>
                                    )}
                                  </td>
                                )}
                                <td className="p-3 text-center">
                                  {item.Location === 'Godown' ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 inline-flex items-center space-x-1">
                                      <Warehouse className="w-3 h-3" />
                                      <span>গোডাউন</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200 inline-flex items-center space-x-1">
                                      <Store className="w-3 h-3" />
                                      <span>দোকান</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {item.Type === 'Remnant' ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-[#B45309] border border-amber-200 inline-flex items-center space-x-1">
                                      <Scissors className="w-3 h-3" />
                                      <span>থানের ছাঁট</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-[#B91C1C] border border-red-200 inline-flex items-center space-x-1">
                                      <AlertOctagon className="w-3 h-3" />
                                      <span>ড্যামেজ / নষ্ট</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-bold text-[#111111] font-mono tabular-nums">
                                  {item.Location === 'Godown' && item.Thans > 0 ? (
                                    <div>
                                      <span>{item.Thans} থান</span>
                                      <span className="block text-[10px] text-[#525252] font-normal">
                                        ({formatFabricQuantity(item.TotalYards, 'গজ', false)})
                                      </span>
                                    </div>
                                  ) : (
                                    formatFabricQuantity(item.TotalYards, 'গজ', true)
                                  )}
                                </td>
                                <td className="p-3 text-center font-bold text-[#B91C1C] font-mono tabular-nums">
                                  {currencySymbol}{item.LossAmount}
                                  <span className="block text-[9px] text-[#737373] font-normal">
                                    @{currencySymbol}{item.CostPricePerYard}/গজ
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-semibold text-[#111111] block text-xs">{item.Reason}</span>
                                  <span className="text-[10px] text-[#525252] block">
                                    {item.ActionTaken === 'ClearanceBundle' ? (
                                      <span className="text-[#15803D] font-semibold font-mono tabular-nums inline-flex items-center space-x-1">
                                        <Tag className="w-3 h-3" />
                                        <span>ক্লিয়ারেন্স প্যাক ({currencySymbol}{item.BundlePrice})</span>
                                      </span>
                                    ) : (
                                      'সরাসরি রাইট-অফ (বাদ)'
                                    )}
                                  </span>
                                </td>
                                <td className="p-3 text-[#525252] font-medium">
                                  {item.LoggedBy}
                                </td>
                                <td className="p-3 pr-4 text-right">
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
                                        className="min-h-[44px] sm:min-h-[36px] px-2 text-[#525252] hover:text-[#15803D] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
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
                                        className="min-h-[44px] sm:min-h-[36px] px-2 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
                  ))}
                </div>
              ) : (
                /* ফ্ল্যাট ভিউ: কালানুক্রমিক সাধারণ টেবিল */
                <div className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-neutral-200/80 text-[#525252] font-semibold text-[11px] uppercase tracking-wider">
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
                      <tbody className="divide-y divide-neutral-200/80">
                        {filteredList.map((item) => (
                          <tr key={item.WastageID} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-3.5">
                              <span className="font-mono tabular-nums font-bold text-[#111111] block">{item.WastageID}</span>
                              <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                                {new Date(item.CreatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <strong className="text-[#111111] block font-semibold">{item.ProductName}</strong>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                {item.VariantName && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 font-semibold">
                                    {item.VariantName}
                                  </span>
                                )}
                                <span className="text-[10px] text-[#737373]">{item.Category}</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              {item.Location === 'Godown' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 inline-flex items-center space-x-1">
                                  <Warehouse className="w-3 h-3" />
                                  <span>গোডাউন</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200 inline-flex items-center space-x-1">
                                  <Store className="w-3 h-3" />
                                  <span>দোকান</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              {item.Type === 'Remnant' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-[#B45309] border border-amber-200 inline-flex items-center space-x-1">
                                  <Scissors className="w-3 h-3" />
                                  <span>থানের ছাঁট</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-red-50 text-[#B91C1C] border border-red-200 inline-flex items-center space-x-1">
                                  <AlertOctagon className="w-3 h-3" />
                                  <span>ড্যামেজ / নষ্ট</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-bold text-[#111111] font-mono tabular-nums">
                              {item.Location === 'Godown' && item.Thans > 0 ? (
                                <div>
                                  <span>{item.Thans} থান</span>
                                  <span className="block text-[10px] text-[#525252] font-normal">
                                    ({formatFabricQuantity(item.TotalYards, 'গজ', false)})
                                  </span>
                                </div>
                              ) : (
                                formatFabricQuantity(item.TotalYards, 'গজ', true)
                              )}
                            </td>
                            <td className="p-3.5 text-center font-bold text-[#B91C1C] font-mono tabular-nums">
                              {currencySymbol}{item.LossAmount}
                              <span className="block text-[9.5px] text-[#737373] font-normal">
                                @{currencySymbol}{item.CostPricePerYard}/গজ
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-[#111111] block">{item.Reason}</span>
                              <span className="text-[10px] text-[#525252] block">
                                {item.ActionTaken === 'ClearanceBundle' ? (
                                  <span className="text-[#15803D] font-semibold font-mono tabular-nums inline-flex items-center space-x-1">
                                    <Tag className="w-3 h-3" />
                                    <span>ক্লিয়ারেন্স প্যাক ({currencySymbol}{item.BundlePrice})</span>
                                  </span>
                                ) : (
                                  'সরাসরি রাইট-অফ (বাদ)'
                                )}
                              </span>
                            </td>
                            <td className="p-3.5 text-[#525252] font-medium">
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
                                    className="min-h-[44px] sm:min-h-[36px] px-2 text-[#525252] hover:text-[#15803D] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
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
                                    className="min-h-[44px] sm:min-h-[36px] px-2 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
              <div className="bg-white p-5 sm:p-6 rounded-lg border border-neutral-200/80 space-y-4">
                
                {/* ধাপ ১: অবস্থান ও কাপড় নির্বাচন */}
                <div className="space-y-3 pb-4 border-b border-neutral-200/80">
                  <h3 className="text-sm font-semibold tracking-tight text-[#111111] flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-mono tabular-nums">১</span>
                    <span>অপচয়ের অবস্থান ও কাপড় নির্বাচন</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* অবস্থান নির্বাচন */}
                    <div>
                      <label className="block text-[#111111] font-semibold mb-1.5">কোন অবস্থানের কাপড় নষ্ট/ছাঁট হয়েছে? *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLocation('Shop');
                            setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                          }}
                          className={`min-h-[44px] sm:min-h-[36px] py-2 px-3 rounded-md font-semibold transition-colors flex items-center justify-center space-x-1.5 border cursor-pointer ${
                            location === 'Shop'
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                          }`}
                        >
                          <Store className="w-4 h-4" />
                          <span>দোকান ফ্লোর (কাউন্টার)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocation('Godown');
                            setEntryType('Damaged');
                            setReason('মিলের ত্রুটি / কালার ফল্ট (Mill Defect)');
                            setCreateClearanceBundle(false);
                          }}
                          className={`min-h-[44px] sm:min-h-[36px] py-2 px-3 rounded-md font-semibold transition-colors flex items-center justify-center space-x-1.5 border cursor-pointer ${
                            location === 'Godown'
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                          }`}
                        >
                          <Warehouse className="w-4 h-4" />
                          <span>গোডাউন (আস্ত থান/লট)</span>
                        </button>
                      </div>
                    </div>

                    {/* অপচয়ের ধরণ */}
                    <div>
                      <label className="block text-[#111111] font-semibold mb-1.5">অপচয়ের ধরণ নির্বাচন করুন *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={location === 'Godown'}
                          onClick={() => {
                            setEntryType('Remnant');
                            setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                          }}
                          className={`min-h-[44px] sm:min-h-[36px] py-2 px-3 rounded-md font-semibold transition-colors flex items-center justify-center space-x-1.5 border ${
                            location === 'Godown'
                              ? 'opacity-40 cursor-not-allowed bg-[#F5F5F5] text-[#737373] border-neutral-200/80'
                              : entryType === 'Remnant'
                              ? 'bg-[#B45309] text-white border-[#B45309] cursor-pointer'
                              : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5] cursor-pointer'
                          }`}
                        >
                          <Scissors className="w-4 h-4" />
                          <span>থানের শেষ ছাঁট</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEntryType('Damaged');
                            setReason(location === 'Godown' ? 'মিলের ত্রুটি / কালার ফল্ট (Mill Defect)' : 'ছেঁড়া বা কাটা ভুল (Torn / Cut Mistake)');
                            setCreateClearanceBundle(false);
                          }}
                          className={`min-h-[44px] sm:min-h-[36px] py-2 px-3 rounded-md font-semibold transition-colors flex items-center justify-center space-x-1.5 border cursor-pointer ${
                            entryType === 'Damaged'
                              ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                              : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
                          }`}
                        >
                          <AlertOctagon className="w-4 h-4" />
                          <span>নষ্ট / ড্যামেজ কাপড়</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* থান কাপড় ও ভ্যারিয়েন্ট ড্রপডাউন */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <label className="block text-[#111111] font-semibold mb-1">থান কাপড় নির্বাচন করুন *</label>
                      <select
                        required
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          setSelectedVariantId('');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-semibold text-[#111111]"
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
                      <label className="block text-[#111111] font-semibold mb-1">
                        নির্দিষ্ট কালার / ভ্যারিয়েন্ট (ঐচ্ছিক)
                      </label>
                      {selectedProduct && Array.isArray(selectedProduct.Variants) && selectedProduct.Variants.length > 0 ? (
                        <select
                          value={selectedVariantId}
                          onChange={(e) => setSelectedVariantId(e.target.value)}
                          className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-semibold text-[#111111]"
                        >
                          <option value="">সাধারণ / সকল ভ্যারিয়েন্ট</option>
                          {selectedProduct.Variants.map((v, vIdx) => {
                            const vKey = String(v.VariantID || v.variantId || v.Barcode || v.Attributes?.Color || v.Color || vIdx);
                            const vLabel = v.ColorName || v.Attributes?.Color || [v.Color, v.Size].filter(Boolean).join(' - ') || v.VariantName || v.name || Object.values(v.Attributes || {})[0] || `ভ্যারিয়েন্ট #${vIdx + 1}`;
                            const vStock = location === 'Godown' ? `${v.GodownStock || 0} থান` : `${v.StockQuantity || 0} গজ`;
                            return (
                              <option key={vKey} value={vKey}>
                                {vLabel} (মজুত: {vStock})
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder="এই সাধারণ পণ্যে কোনো ভ্যারিয়েন্ট নেই (একক কাপড়)"
                          className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-2 bg-[#F5F5F5] border border-neutral-200/80 rounded-md text-[#737373] font-medium cursor-not-allowed text-xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* নির্বাচিত পণ্যের বর্তমান মজুত কার্ড */}
                  {selectedProduct && (
                    <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#525252] font-medium">নির্বাচিত অবস্থানে বর্তমান মজুত:</span>
                        <strong className="text-[#15803D] font-bold ml-2 font-mono tabular-nums text-sm">
                          {currentStockInfo.text}
                        </strong>
                      </div>
                      <div className="text-[#525252] font-mono tabular-nums text-[11px]">
                        ক্রয়মূল্য: {currencySymbol}{costPrice}/গজ
                      </div>
                    </div>
                  )}
                </div>

                {/* ধাপ ২: পরিমাপ ইনপুট (গজ ও গিরা অথবা থান) */}
                <div className="bg-[#FAFAFA] p-4 rounded-lg border border-neutral-200/80 space-y-3">
                  <h4 className="text-xs font-semibold tracking-tight text-[#111111] flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-mono tabular-nums">২</span>
                    <span>{location === 'Godown' ? 'নষ্ট আস্ত থানের সংখ্যা' : 'ছাঁট বা নষ্ট কাপড়ের পরিমাণ (গজ ও গিরা)'}</span>
                  </h4>

                  {location === 'Godown' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[#111111] font-semibold mb-1">ড্যামেজ থানের সংখ্যা (Thans) *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={thans}
                          onChange={(e) => setThans(Math.max(1, parseInt(e.target.value) || 1))}
                          className="min-h-[44px] sm:min-h-[36px] w-full px-3.5 py-2 bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-bold text-[#111111] text-sm font-mono tabular-nums"
                        />
                      </div>
                      <div className="bg-white p-3 rounded-md border border-neutral-200/80 flex flex-col justify-center">
                        <span className="text-[10px] text-[#737373] font-semibold uppercase font-mono tabular-nums">মোট হিসাব (১ থান = {yardsPerThan} গজ)</span>
                        <span className="text-base font-bold text-[#111111] font-mono tabular-nums">
                          {totalYards.toLocaleString('bn-BD')} গজ কাপড়
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-[#111111] font-semibold mb-1">গজ (Yards)</label>
                        <input
                          type="number"
                          min="0"
                          value={goj}
                          onChange={(e) => setGoj(Math.max(0, parseInt(e.target.value) || 0))}
                          className="min-h-[44px] sm:min-h-[36px] w-full px-3.5 py-2 bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-bold text-[#111111] text-sm font-mono tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[#111111] font-semibold mb-1">গিরা (Gira - ১ গজ = ১৬ গিরা)</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={gira}
                          onChange={(e) => setGira(Math.min(15, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="min-h-[44px] sm:min-h-[36px] w-full px-3.5 py-2 bg-white border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-bold text-[#111111] text-sm font-mono tabular-nums"
                        />
                      </div>

                      <div className="bg-white p-3 rounded-md border border-neutral-200/80 flex flex-col justify-center">
                        <span className="text-[10px] text-[#737373] font-semibold uppercase">মোট পরিমাণ</span>
                        <span className="text-base font-bold text-[#15803D] font-mono tabular-nums">
                          {formatFabricQuantity(totalYards, 'গজ', true)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ধাপ ৩: কারণ ও আর্থিক ক্ষতি */}
                <div className="space-y-3 pb-2">
                  <h4 className="text-xs font-semibold tracking-tight text-[#111111] flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-mono tabular-nums">৩</span>
                    <span>অপচয়ের কারণ ও আর্থিক ক্ষতির হিসাব</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[#111111] font-semibold mb-1.5">অপচয় বা ছাঁটের কারণ নির্বাচন করুন *</label>
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
                            className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                              reason === r
                                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'
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
                          className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-medium text-xs text-[#111111]"
                        />
                      )}
                    </div>

                    {/* আর্থিক ক্ষতির হিসাব কার্ড */}
                    <div className="bg-red-50 text-[#B91C1C] p-4 rounded-lg flex items-center justify-between border border-red-200">
                      <div>
                        <span className="text-[10px] text-[#B91C1C] uppercase font-semibold block">আনুমানিক আর্থিক ক্ষতি</span>
                        <h4 className="text-2xl font-bold text-[#B91C1C] mt-0.5 font-mono tabular-nums">{currencySymbol}{lossAmount.toLocaleString('bn-BD')}</h4>
                        <span className="text-[10px] text-[#B91C1C] block mt-1 font-mono tabular-nums">
                          (কেনা দর: {currencySymbol}{costPrice} × {totalYards} গজ)
                        </span>
                      </div>

                      <div className="w-11 h-11 rounded-md bg-white border border-red-200 text-[#B91C1C] flex items-center justify-center">
                        <TrendingDown className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gap 5: অপশন: ড্যামেজ কাপড়ের আর্থিক ক্ষতি খরচের খাতায় অপচয় ক্ষতি (Loss Write-Off) হিসেবে এন্ট্রি */}
                {entryType === 'Damaged' && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-2 text-xs">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recordAsExpense}
                        onChange={(e) => setRecordAsExpense(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#B91C1C] border-red-300 mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-[#B91C1C] text-xs inline-flex items-center space-x-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>পরিচালন ক্ষতি (Loss Write-Off) হিসেবে ব্যয়ের খাতায় অন্তর্ভুক্ত করুন</span>
                        </span>
                        <span className="text-[11px] text-[#525252] block mt-0.5 font-mono tabular-nums">
                          সক্রিয় থাকলে খরচের খাতায় ({currencySymbol}{lossAmount.toLocaleString('bn-BD')}) টাকা নন-ক্যাশ পরিচালন অপচয় ক্ষতি হিসেবে এন্ট্রি হবে, যা প্রফিট-লস রিপোর্টে সঠিক ক্ষতি প্রদর্শন করবে।
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* অপশন: ক্লিয়ারেন্স ছাঁট প্যাক হিসেবে কম দামে বিক্রি */}
                {entryType === 'Remnant' && location === 'Shop' && (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-2 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createClearanceBundle}
                        onChange={(e) => setCreateClearanceBundle(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#B45309] border-amber-300"
                      />
                      <span className="font-semibold text-[#B45309] text-xs inline-flex items-center space-x-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span>এই ছাঁট কাপড়টি ডিসকাউন্ট প্যাক হিসেবে ক্যাটালগে যুক্ত করুন (Clearance Remnant Bundle)</span>
                      </span>
                    </label>

                    {createClearanceBundle && (
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2">
                          <label className="font-semibold text-[#111111]">ছাঁট প্যাক বিক্রয় মূল্য ({currencySymbol}):</label>
                          <input
                            type="number"
                            min="1"
                            value={bundlePrice}
                            onChange={(e) => setBundlePrice(parseFloat(e.target.value) || 0)}
                            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-white border border-amber-300 rounded-md font-bold text-[#111111] w-32 focus:ring-2 focus:ring-[#B45309]/20 font-mono tabular-nums"
                          />
                        </div>
                        <span className="text-[11px] text-[#525252]">
                          স্বয়ংক্রিয়ভাবে পিওএস কাউন্টারে <strong className="text-[#111111]">[ছাঁট প্যাক]</strong> নামে পাওয়া যাবে এবং স্টিকার প্রিন্ট করা যাবে।
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* অতিরিক্ত মন্তব্য */}
                <div className="text-xs">
                  <label className="block text-[#111111] font-semibold mb-1">অতিরিক্ত নোট / বিবরণ (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="যেমন: এই থানটি শেষ হওয়ার পর ১ গজ ছাঁট পাওয়া গেছে বা মিল ফল্ট..."
                    className="min-h-[44px] sm:min-h-[36px] w-full px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#0F172A] font-medium text-[#111111]"
                  />
                </div>
              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#525252] hover:text-[#111111] rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-[36px] px-6 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors flex items-center space-x-2 cursor-pointer"
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
