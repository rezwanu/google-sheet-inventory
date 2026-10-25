import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Truck,
  ArrowRightLeft,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  Search,
  Check,
  Boxes,
  Phone,
  Warehouse,
  Store,
  FileSpreadsheet,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Layers,
  Filter,
  Scissors,
  ShoppingBag,
  RotateCcw,
  SlidersHorizontal,
  Package,
  PackageCheck,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Palette,
  Edit3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  PlusCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  exportGodownOutflowExcelCSV,
  exportShopOutflowExcelCSV,
  exportLocationStockExcelCSV,
  getGodownOutflowLedger,
  getShopOutflowLedger
} from '../services/storage';

export default function StockTransferModal({
  isOpen,
  onClose,
  embedded = false,
  products = [],
  stockTransfers = [],
  stockMovements = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  onSaveStockTransfer,
  onUpdateStockTransferStatus,
  onAdjustLocationStock,
  initialTab = 'overview',
  initialTransferSubTab = 'new',
  initialFilter = 'ALL',
  onDeleteProduct,
  onUpdateProductVariants,
  onEditProduct,
  onDirectGodownToShopTransfer,
  variantAttributes = [],
  onAddVariantOption
}) {
  // প্রধান ট্যাব নেভিগেশন: 'overview' | 'transfers' | 'godown_outflow' | 'shop_outflow'
  const [activeMainTab, setActiveMainTab] = useState(() => {
    if (initialTab === 'godown_stock' || initialTab === 'shop_stock') return 'overview';
    return initialTab || 'overview';
  });

  // ট্রান্সফার সাব-ট্যাব: 'new' | 'list'
  const [transferSubTab, setTransferSubTab] = useState(() => initialTransferSubTab || 'new');

  // =========================================================================
  // ১. চালান তৈরি স্টেটসমূহ
  // =========================================================================
  const [challanNo, setChallanNo] = useState(() => `CHL-${Date.now().toString().slice(-6)}`);
  const [fromLocation, setFromLocation] = useState('Main Warehouse');
  const [toLocation, setToLocation] = useState('Main Shop');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');

  // চালান আইটেম পিকার
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [challanItems, setChallanItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // প্রিন্ট প্রিভিউ
  const [printableChallan, setPrintableChallan] = useState(null);

  // চালান তালিকা ফিল্টার
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // =========================================================================
  // ২. লাইভ স্টক ওভারভিউ ফিল্টার স্টেট
  // =========================================================================
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewFilter, setOverviewFilter] = useState(() => {
    if (initialTab === 'godown_stock') return 'IN_GODOWN';
    if (initialTab === 'shop_stock') return 'IN_SHOP';
    return initialFilter || 'ALL';
  });
  const [overviewCategory, setOverviewCategory] = useState('ALL');

  // ভ্যারিয়েন্ট স্টক এক্সপ্যান্ড ও ভিউ মোড স্টেট
  const [stockViewMode, setStockViewMode] = useState('grouped'); // 'grouped' | 'variants'
  const [expandedProductIds, setExpandedProductIds] = useState({});

  // পণ্য থেকে ভ্যারিয়েন্ট তালিকা নিরাপদ এক্সট্র্যাক্ট ও স্টক ফিল্ড স্বাভাবিকীকরণ
  const getVariantsOfProduct = (p) => {
    if (!p) return [];
    let vars = p.Variants || p.variants;
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch { vars = []; }
    }
    if ((!vars || !vars.length) && (p.VariantsJSON || p.variantsJSON)) {
      try { vars = JSON.parse(p.VariantsJSON || p.variantsJSON); } catch { vars = []; }
    }
    if (!Array.isArray(vars)) return [];
    return vars.map((v) => {
      const gStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0)) || 0;
      const sStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : (v.ShopStock !== undefined ? v.ShopStock : 0))) || 0;
      return {
        ...v,
        GodownStock: gStock,
        godownStock: gStock,
        StockQuantity: sStock,
        stockQuantity: sStock,
        TotalStock: gStock + sStock
      };
    });
  };

  const toggleExpandProduct = (prodId) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [prodId]: !prev[prodId]
    }));
  };

  const handleExpandAll = () => {
    const all = {};
    products.forEach((p) => {
      all[p.ProductID] = true;
    });
    setExpandedProductIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedProductIds({});
  };

  useEffect(() => {
    if (initialTab === 'godown_stock') {
      setActiveMainTab('overview');
      setOverviewFilter('IN_GODOWN');
    } else if (initialTab === 'shop_stock') {
      setActiveMainTab('overview');
      setOverviewFilter('IN_SHOP');
    } else if (initialTab) {
      setActiveMainTab(initialTab);
      if (initialFilter) setOverviewFilter(initialFilter);
    }
    if (initialTransferSubTab) {
      setTransferSubTab(initialTransferSubTab);
    }
  }, [initialTab, initialTransferSubTab, initialFilter, isOpen]);

  // =========================================================================
  // ৩. গোডাউন ও দোকান নির্গমন খাতা ফিল্টার স্টেট
  // =========================================================================
  const [godownSearch, setGodownSearch] = useState('');
  const [godownReasonFilter, setGodownReasonFilter] = useState('ALL');
  const [godownDateFilter, setGodownDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | '7DAYS' | '30DAYS'

  const [shopSearch, setShopSearch] = useState('');
  const [shopTypeFilter, setShopTypeFilter] = useState('ALL');
  const [shopDateFilter, setShopDateFilter] = useState('ALL');

  // =========================================================================
  // ৪. স্টক অ্যাডজাস্টমেন্ট সাব-মডাল স্টেট
  // =========================================================================
  const [adjustTargetProduct, setAdjustTargetProduct] = useState(null);
  const [adjustLocation, setAdjustLocation] = useState('Godown'); // 'Godown' | 'Shop'
  const [adjustAction, setAdjustAction] = useState('ADD'); // 'ADD' | 'DEDUCT' | 'SET'
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('নতুন লট গোডাউনে আগমন');
  const [adjustNotes, setAdjustNotes] = useState('');

  // ভ্যারিয়েন্ট লেভেল রিস্টক ও স্টক সমন্বয় সাব-মডাল স্টেট
  const [variantRestockModal, setVariantRestockModal] = useState(null);
  const [isSubmittingVariantRestock, setIsSubmittingVariantRestock] = useState(false);

  // নতুন কালার / ভ্যারিয়েন্ট যোগ সাব-মডাল স্টেট
  const [newColorModal, setNewColorModal] = useState(null);
  const [isSubmittingNewColor, setIsSubmittingNewColor] = useState(false);

  // ভ্যারিয়েন্ট এডিট সাব-মডাল স্টেট
  const [editVariantModal, setEditVariantModal] = useState(null);
  const [isSubmittingEditVariant, setIsSubmittingEditVariant] = useState(false);

  // গোডাউন থেকে দোকানে সরাসরি পণ্য স্থানান্তর সাব-মডাল স্টেট
  const [directTransferModal, setDirectTransferModal] = useState(null);
  const [isSubmittingDirectTransfer, setIsSubmittingDirectTransfer] = useState(false);

  // =========================================================================
  // পরিগণিত মেট্রিক্স ও ফিল্টারসমূহ
  // =========================================================================

  // সামগ্রিক স্টক পরিসংখ্যান
  const stockKpis = useMemo(() => {
    let totalGodown = 0;
    let totalShop = 0;
    let needTransferCount = 0;
    let totalVariants = 0;
    let fabricGodownYards = 0;
    let fabricShopYards = 0;

    products.forEach((p) => {
      const gStock = Number(p.GodownStock || 0);
      const sStock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      const isThan = Boolean(p.TotalThan || p.YardsPerThan || /than|থান/i.test(p.Unit || ''));
      const yardsPerThan = Number(p.YardsPerThan) || 0;

      totalGodown += gStock;
      totalShop += sStock;

      if (isThan && yardsPerThan > 0) {
        fabricGodownYards += (gStock * yardsPerThan);
        fabricShopYards += (sStock * yardsPerThan);
      }

      const vars = getVariantsOfProduct(p);
      if (vars.length > 0) {
        totalVariants += vars.length;
      }

      if (sStock <= minAlert && gStock > 0) {
        needTransferCount++;
      }
    });

    const inTransitChallans = stockTransfers.filter((t) => t.Status === 'In Transit').length;

    return {
      totalGodown,
      totalShop,
      totalAll: totalGodown + totalShop,
      needTransferCount,
      inTransitChallans,
      totalVariants,
      fabricGodownYards,
      fabricShopYards
    };
  }, [products, stockTransfers]);

  // অনন্য ক্যাটাগরি তালিকা
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.Category) set.add(p.Category);
    });
    return Array.from(set);
  }, [products]);

  // ওভারভিউ পণ্য ফিল্টার
  const filteredOverviewProducts = useMemo(() => {
    return products.filter((p) => {
      const q = overviewSearch.trim().toLowerCase();
      const vars = getVariantsOfProduct(p);

      const matchProd = !q ||
        String(p.ProductName || '').toLowerCase().includes(q) ||
        String(p.Barcode || '').toLowerCase().includes(q) ||
        String(p.ProductID || '').toLowerCase().includes(q);

      const matchVar = !q || vars.some((v) => {
        const c = String(v.Attributes?.Color || v.Color || '').toLowerCase();
        const s = String(v.Attributes?.Size || v.Size || '').toLowerCase();
        const b = String(v.Barcode || '').toLowerCase();
        return c.includes(q) || s.includes(q) || b.includes(q);
      });

      const matchSearch = matchProd || matchVar;
      const matchCat = overviewCategory === 'ALL' || p.Category === overviewCategory;

      const gStock = Number(p.GodownStock || 0);
      const sStock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);

      let matchFilter = true;
      if (overviewFilter === 'NEED_TRANSFER') {
        matchFilter = sStock <= minAlert && gStock > 0;
      } else if (overviewFilter === 'IN_GODOWN') {
        matchFilter = gStock > 0;
      } else if (overviewFilter === 'IN_SHOP') {
        matchFilter = sStock > 0;
      } else if (overviewFilter === 'OUT_OF_STOCK') {
        matchFilter = gStock <= 0 && sStock <= 0;
      }

      return matchSearch && matchCat && matchFilter;
    });
  }, [products, overviewSearch, overviewCategory, overviewFilter]);

  // সরাসরি ফ্ল্যাট ভ্যারিয়েন্ট তালিকা
  const flattenedVariantList = useMemo(() => {
    const list = [];
    filteredOverviewProducts.forEach((p) => {
      const vars = getVariantsOfProduct(p);
      const isThan = Boolean(p.TotalThan || p.YardsPerThan || /than|থান/i.test(p.Unit || ''));
      const yardsPerThan = Number(p.YardsPerThan) || 0;

      if (vars.length > 0) {
        vars.forEach((v, vIdx) => {
          const vGStock = Number(v.GodownStock) || 0;
          const vSStock = Number(v.StockQuantity) || 0;
          list.push({
            parentProduct: p,
            variant: v,
            variantIndex: vIdx,
            isVariant: true,
            productId: p.ProductID,
            productName: p.ProductName,
            variantId: v.VariantID || v.variantId,
            color: v.Attributes?.Color || v.Color || '',
            size: v.Attributes?.Size || v.Size || '',
            otherAttrs: v.Attributes ? Object.entries(v.Attributes).filter(([k]) => k !== 'Color' && k !== 'Size').map(([k, val]) => `${k}: ${val}`).join(', ') : '',
            barcode: v.Barcode || p.Barcode || '',
            category: p.Category,
            unit: p.Unit || 'Pcs',
            isThanUnit: isThan,
            yardsPerThan: yardsPerThan,
            godownStock: vGStock,
            shopStock: vSStock,
            totalStock: vGStock + vSStock,
            godownYards: isThan ? (vGStock * yardsPerThan) : 0,
            shopYards: isThan ? (vSStock * yardsPerThan) : 0,
            totalYards: isThan ? ((vGStock + vSStock) * yardsPerThan) : 0,
          });
        });
      } else {
        const gStock = Number(p.GodownStock || 0);
        const sStock = Number(p.StockQuantity || 0);
        list.push({
          parentProduct: p,
          variant: null,
          isVariant: false,
          productId: p.ProductID,
          productName: p.ProductName,
          variantId: null,
          color: '',
          size: '',
          otherAttrs: '',
          barcode: p.Barcode || '',
          category: p.Category,
          unit: p.Unit || 'Pcs',
          isThanUnit: isThan,
          yardsPerThan: yardsPerThan,
          godownStock: gStock,
          shopStock: sStock,
          totalStock: gStock + sStock,
          godownYards: isThan ? (gStock * yardsPerThan) : 0,
          shopYards: isThan ? (sStock * yardsPerThan) : 0,
          totalYards: isThan ? ((gStock + sStock) * yardsPerThan) : 0,
        });
      }
    });
    return list;
  }, [filteredOverviewProducts]);

  // চালান তৈরির পণ্য সাজেশন্স
  const filteredChallanSuggestions = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((p) => {
        const name = String(p.ProductName || '').toLowerCase();
        const code = String(p.Barcode || p.ProductID || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 8);
  }, [products, productSearch]);

  // নির্বাচিত পণ্যের ভ্যারিয়েন্ট তালিকা
  const productVariants = useMemo(() => {
    if (!selectedProduct) return [];
    let vars = selectedProduct.Variants || selectedProduct.variants || [];
    if (typeof vars === 'string') {
      try {
        vars = JSON.parse(vars);
      } catch {
        vars = [];
      }
    }
    return Array.isArray(vars) ? vars : [];
  }, [selectedProduct]);

  // নির্বাচিত পণ্যের প্রেরক স্থানে উপলব্ধ স্টক
  const availableSourceStock = useMemo(() => {
    if (!selectedProduct) return 0;
    const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(fromLocation);
    if (isFromWarehouse) {
      return Number(selectedProduct.GodownStock || 0);
    }
    return Number(selectedProduct.StockQuantity || 0);
  }, [selectedProduct, fromLocation]);

  // চালানের মোট পরিমাণ
  const totalChallanQty = challanItems.reduce((sum, itm) => sum + itm.quantity, 0);

  // চালান তালিকা ফিল্টার
  const filteredChallans = useMemo(() => {
    return stockTransfers.filter((t) => {
      const q = listSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(t.ChallanNo || '').toLowerCase().includes(q) ||
        String(t.FromLocation || '').toLowerCase().includes(q) ||
        String(t.ToLocation || '').toLowerCase().includes(q) ||
        String(t.DriverName || '').toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'ALL' || String(t.Status || '').toUpperCase() === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [stockTransfers, listSearch, statusFilter]);

  // গোডাউন স্টক কমার খাতা
  const godownOutflowData = useMemo(() => {
    const list = getGodownOutflowLedger(stockMovements);
    const now = new Date();

    return list.filter((m) => {
      const q = godownSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(m.productName || '').toLowerCase().includes(q) ||
        String(m.barcode || '').toLowerCase().includes(q) ||
        String(m.referenceNo || '').toLowerCase().includes(q);

      const matchReason = godownReasonFilter === 'ALL' || m.type === godownReasonFilter;

      let matchDate = true;
      if (godownDateFilter !== 'ALL' && m.timestamp) {
        const itemDate = new Date(m.timestamp);
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        if (godownDateFilter === 'TODAY') matchDate = diffDays <= 1;
        else if (godownDateFilter === '7DAYS') matchDate = diffDays <= 7;
        else if (godownDateFilter === '30DAYS') matchDate = diffDays <= 30;
      }

      return matchSearch && matchReason && matchDate;
    });
  }, [stockMovements, godownSearch, godownReasonFilter, godownDateFilter]);

  // দোকান স্টক কমার খাতা
  const shopOutflowData = useMemo(() => {
    const list = getShopOutflowLedger(stockMovements);
    const now = new Date();

    return list.filter((m) => {
      const q = shopSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(m.productName || '').toLowerCase().includes(q) ||
        String(m.barcode || '').toLowerCase().includes(q) ||
        String(m.referenceNo || '').toLowerCase().includes(q);

      const matchType = shopTypeFilter === 'ALL' || m.type === shopTypeFilter;

      let matchDate = true;
      if (shopDateFilter !== 'ALL' && m.timestamp) {
        const itemDate = new Date(m.timestamp);
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
        if (shopDateFilter === 'TODAY') matchDate = diffDays <= 1;
        else if (shopDateFilter === '7DAYS') matchDate = diffDays <= 7;
        else if (shopDateFilter === '30DAYS') matchDate = diffDays <= 30;
      }

      return matchSearch && matchType && matchDate;
    });
  }, [stockMovements, shopSearch, shopTypeFilter, shopDateFilter]);

  // =========================================================================
  // হ্যান্ডলারসমূহ
  // =========================================================================

  // ক্যাটালগ থেকে এক ক্লিকে "দোকানে চালান করুন" অ্যাকশন (সাপোর্টস নির্দিষ্ট ভ্যারিয়েন্ট)
  const handleInitiateQuickTransfer = (product, targetVariant = null) => {
    setFromLocation('Main Warehouse');
    setToLocation('Main Shop');
    setSelectedProduct(product);
    setProductSearch('');
    if (targetVariant) {
      setSelectedVariantId(targetVariant.VariantID || targetVariant.variantId || '');
    } else {
      const vars = getVariantsOfProduct(product);
      if (Array.isArray(vars) && vars.length > 0) {
        setSelectedVariantId(vars[0].VariantID || vars[0].variantId || '');
      } else {
        setSelectedVariantId('');
      }
    }
    setTransferQty(1);
    setActiveMainTab('transfers');
    setTransferSubTab('new');
    setPrintableChallan(null);
  };

  // গোডাউন থেকে দোকানে পণ্য নিয়ে যাওয়ার জন্য ডেডিকেটেড ডিরেক্ট ট্রান্সফার মডাল ওপেন
  const handleOpenDirectTransfer = (product, targetVariant = null) => {
    const vars = getVariantsOfProduct(product);
    let initialVariantId = '';
    let initialVariant = null;

    if (targetVariant) {
      initialVariant = targetVariant;
      initialVariantId = targetVariant.VariantID || targetVariant.variantId || '';
    } else if (Array.isArray(vars) && vars.length > 0) {
      // স্টক আছে এমন ভ্যারিয়েন্ট খুঁজুন অথবা প্রথমটি
      const withStock = vars.find((v) => Number(v.GodownStock !== undefined ? v.GodownStock : v.StockQuantity) > 0);
      initialVariant = withStock || vars[0];
      initialVariantId = initialVariant.VariantID || initialVariant.variantId || '';
    }

    const availableGodown = initialVariant
      ? Number(initialVariant.GodownStock !== undefined ? initialVariant.GodownStock : 0)
      : Number(product.GodownStock || 0);

    const initialBulk = {};
    if (Array.isArray(vars)) {
      vars.forEach((v) => {
        const vId = v.VariantID || v.variantId;
        const gStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
        initialBulk[vId] = (initialVariantId === vId && gStk > 0) ? 1 : 0;
      });
    }

    setDirectTransferModal({
      product,
      mode: 'single', // 'single' | 'all'
      selectedVariantId: initialVariantId,
      quantity: availableGodown > 0 ? 1 : 0,
      bulkQuantities: initialBulk,
      notes: ''
    });
  };

  // গোডাউন থেকে সরাসরি দোকানে স্থানান্তর সাবমিট (ডাটাবেস ও স্টোরেজ সিঙ্ক)
  const handleConfirmDirectTransferSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!directTransferModal || isSubmittingDirectTransfer) return;

    const { product, mode, selectedVariantId, quantity, bulkQuantities, notes } = directTransferModal;
    const vars = getVariantsOfProduct(product);
    const hasVariants = Array.isArray(vars) && vars.length > 0;

    let itemsToTransfer = [];

    if (!hasVariants) {
      const qty = Number(quantity) || 0;
      const gStk = Number(product.GodownStock || 0);
      if (qty <= 0) {
        alert('অনুগ্রহ করে সঠিক পরিমাণ (কমপক্ষে ১) উল্লেখ করুন!');
        return;
      }
      if (qty > gStk) {
        alert(`গোডাউনে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${gStk} ${product.Unit || 'Pcs'} আছে।`);
        return;
      }
      itemsToTransfer.push({
        variantId: null,
        variantName: '',
        quantity: qty
      });
    } else if (mode === 'single') {
      const targetVar = vars.find((v) => String(v.VariantID || v.variantId) === String(selectedVariantId));
      if (!targetVar) {
        alert('অনুগ্রহ করে একটি ভ্যারিয়েন্ট নির্বাচন করুন!');
        return;
      }
      const qty = Number(quantity) || 0;
      const vGStk = Number(targetVar.GodownStock !== undefined ? targetVar.GodownStock : 0);
      if (qty <= 0) {
        alert('অনুগ্রহ করে সঠিক পরিমাণ (কমপক্ষে ১) উল্লেখ করুন!');
        return;
      }
      if (qty > vGStk) {
        alert(`এই ভ্যারিয়েন্টের গোডাউনে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${vGStk} ${product.Unit || 'Pcs'} আছে।`);
        return;
      }
      const attrs = targetVar.Attributes || {};
      const vName = Object.values(attrs).filter(Boolean).join(' / ') || targetVar.Color || targetVar.Size || targetVar.VariantID;
      itemsToTransfer.push({
        variantId: targetVar.VariantID || targetVar.variantId,
        variantName: vName,
        quantity: qty
      });
    } else {
      // Bulk mode: all variants
      for (const v of vars) {
        const vId = v.VariantID || v.variantId;
        const qty = Number(bulkQuantities[vId]) || 0;
        const vGStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
        if (qty > 0) {
          if (qty > vGStk) {
            const vName = v.Color || v.Size || vId;
            alert(`ভ্যারিয়েন্ট '${vName}'-এর গোডাউন স্টক (${vGStk}) অতিক্রম করেছে!`);
            return;
          }
          const attrs = v.Attributes || {};
          const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
          itemsToTransfer.push({
            variantId: vId,
            variantName: vName,
            quantity: qty
          });
        }
      }

      if (itemsToTransfer.length === 0) {
        alert('কমপক্ষে একটি ভ্যারিয়েন্টে স্থানান্তরের পরিমাণ বসান!');
        return;
      }
    }

    setIsSubmittingDirectTransfer(true);
    try {
      if (onDirectGodownToShopTransfer) {
        await onDirectGodownToShopTransfer({
          product,
          items: itemsToTransfer,
          notes: notes || 'গোডাউন থেকে সরাসরি দোকানে স্থানান্তর',
          operatorName: activeUser?.FullName || 'Admin'
        });
      } else if (onSaveStockTransfer) {
        const challanNo = `TRF-${Date.now().toString().slice(-6)}`;
        const payload = {
          challanNo,
          fromLocation: 'Main Warehouse',
          toLocation: 'Main Shop',
          driverName: 'সরাসরি স্থানান্তর',
          notes: notes || 'গোডাউন থেকে সরাসরি দোকানে স্থানান্তর',
          items: itemsToTransfer.map((itm) => ({
            productId: product.ProductID,
            productName: product.ProductName,
            variantId: itm.variantId,
            variantName: itm.variantName,
            quantity: itm.quantity,
            unit: product.Unit || 'Pcs',
            costPrice: Number(product.CostPrice) || 0
          })),
          status: 'Received',
          createdBy: activeUser?.FullName || 'Admin'
        };
        await onSaveStockTransfer(payload);
      }

      setDirectTransferModal(null);
    } catch (err) {
      alert(`স্থানান্তর ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setIsSubmittingDirectTransfer(false);
    }
  };

  // ডিরেক্ট মডাল থেকে চালান (In-Transit) মোডে সুইচ করা
  const handleSwitchToChallanFromDirectModal = () => {
    if (!directTransferModal) return;
    const { product, selectedVariantId } = directTransferModal;
    handleInitiateQuickTransfer(
      product,
      selectedVariantId ? { VariantID: selectedVariantId } : null
    );
    setDirectTransferModal(null);
  };

  // পণ্য সিলেক্ট করা
  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setProductSearch('');
    const vars = p.Variants || p.variants || [];
    if (Array.isArray(vars) && vars.length > 0) {
      setSelectedVariantId(vars[0].VariantID || vars[0].variantId || '');
    } else {
      setSelectedVariantId('');
    }
    setTransferQty(1);
  };

  // চালানে আইটেম যোগ
  const handleAddItemToChallan = () => {
    if (!selectedProduct) return;
    const qty = Number(transferQty) || 0;
    if (qty <= 0) {
      alert('সঠিক স্থানান্তর পরিমাণ উল্লেখ করুন।');
      return;
    }

    if (qty > availableSourceStock) {
      alert(`প্রেরক স্থানে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${availableSourceStock} ${selectedProduct.Unit || 'Pcs'} মজুত আছে।`);
      return;
    }

    const pid = selectedProduct.ProductID || selectedProduct.id;
    const pName = selectedProduct.ProductName || selectedProduct.productName;
    const unit = selectedProduct.Unit || selectedProduct.unit || 'Pcs';

    let variantName = '';
    let costPrice = Number(selectedProduct.CostPrice || selectedProduct.costPrice || 0);

    if (selectedVariantId && productVariants.length > 0) {
      const v = productVariants.find((vr) => String(vr.VariantID || vr.variantId) === String(selectedVariantId));
      if (v) {
        const attrs = v.Attributes || v.attributes || {};
        variantName = Object.values(attrs).filter(Boolean).join(' / ') || v.VariantID;
        if (v.CostPrice) costPrice = Number(v.CostPrice);
      }
    }

    // ডুপ্লিকেট আইটেম চেক
    const existingIdx = challanItems.findIndex(
      (item) => item.productId === pid && String(item.variantId || '') === String(selectedVariantId || '')
    );

    if (existingIdx !== -1) {
      const updated = [...challanItems];
      updated[existingIdx].quantity += qty;
      setChallanItems(updated);
    } else {
      setChallanItems((prev) => [
        ...prev,
        {
          productId: pid,
          productName: pName,
          variantId: selectedVariantId || null,
          variantName: variantName,
          quantity: qty,
          unit: unit,
          costPrice: costPrice
        }
      ]);
    }

    setSelectedProduct(null);
    setSelectedVariantId('');
    setTransferQty(1);
  };

  const handleRemoveChallanItem = (index) => {
    setChallanItems((prev) => prev.filter((_, i) => i !== index));
  };

  // চালান সাবমিট হ্যান্ডলার
  const handleSubmitChallan = async (shouldPrint = true) => {
    if (challanItems.length === 0) {
      alert('চালানে অন্তত ১টি পণ্য যোগ করুন।');
      return;
    }
    if (fromLocation === toLocation) {
      alert('উৎস এবং গন্তব্য একই হতে পারে না। অনুগ্রহ করে ভিন্ন লোকেশন নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const transferPayload = {
        challanNo: challanNo.trim() || `CHL-${Date.now().toString().slice(-6)}`,
        fromLocation,
        toLocation,
        driverName: `${driverName.trim()} ${driverPhone.trim() ? `(${driverPhone.trim()})` : ''} ${vehicleNo.trim() ? `[${vehicleNo.trim()}]` : ''}`.trim(),
        notes: notes.trim(),
        items: challanItems,
        status: 'In Transit', // ডিফল্ট স্ট্যাটাস পথে আছে
        createdBy: activeUser?.FullName || activeUser?.UserName || 'Admin'
      };

      const result = await onSaveStockTransfer(transferPayload);

      if (result && result.record) {
        if (shouldPrint) {
          setPrintableChallan(result.record);
        } else {
          alert(`স্টক ট্রান্সফার চালান #${result.record.ChallanNo} সফলভাবে তৈরি হয়েছে!`);
          handleResetChallan();
          setTransferSubTab('list');
        }
      }
    } catch (e) {
      alert(`চালান তৈরি ব্যর্থ: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetChallan = () => {
    setChallanNo(`CHL-${Date.now().toString().slice(-6)}`);
    setChallanItems([]);
    setDriverName('');
    setDriverPhone('');
    setVehicleNo('');
    setNotes('');
    setPrintableChallan(null);
  };

  // চালান রিসিভ ও স্টকে যোগ হ্যান্ডলার
  const handleReceiveChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    const confirmMsg = `আপনি কি নিশ্চিত যে চালান #${cNo}-এর সকল পণ্য (${challan.TotalQuantity || challan.totalQuantity} পিস/গজ) বুঝে পেয়েছেন?\n\nএটি স্বয়ংক্রিয়ভাবে আপনার দোকানের স্টকে পণ্য যোগ করবে এবং রিসিভিং খতিয়ানে রেকর্ড করবে।`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await onUpdateStockTransferStatus({
        transferId: challan.TransferID || challan.transferId || cNo,
        status: 'Received',
        receivedBy: activeUser?.FullName || activeUser?.UserName || 'Manager'
      });
      alert(`চালান #${cNo} সফলভাবে গ্রহণ করা হয়েছে এবং দোকানের স্টকে যোগ হয়েছে!`);
    } catch (e) {
      alert(`চালান রিসিভ করতে সমস্যা হয়েছে: ${e.message}`);
    }
  };

  // চালান বাতিল হ্যান্ডলার
  const handleCancelChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    if (!window.confirm(`আপনি কি চালান #${cNo} বাতিল করতে চান?\n\nবাতিল করলে পণ্য পুনরায় গোডাউনের স্টকে ফেরত যাবে।`)) return;

    try {
      await onUpdateStockTransferStatus({
        transferId: challan.TransferID || challan.transferId || cNo,
        status: 'Cancelled',
        receivedBy: activeUser?.FullName || activeUser?.UserName || 'Manager'
      });
      alert(`চালান #${cNo} বাতিল করা হয়েছে এবং গোডাউনে স্টক ফেরত দেওয়া হয়েছে।`);
    } catch (e) {
      alert(`চালান বাতিল করতে সমস্যা হয়েছে: ${e.message}`);
    }
  };

  // দ্রুত স্টক অ্যাডজাস্টমেন্ট সম্পন্ন করা
  const handleExecuteStockAdjust = () => {
    if (!adjustTargetProduct) return;
    const qty = Number(adjustQty) || 0;
    if (qty <= 0 && adjustAction !== 'SET') {
      alert('সঠিক পরিমাণ উল্লেখ করুন।');
      return;
    }

    if (onAdjustLocationStock) {
      onAdjustLocationStock({
        productId: adjustTargetProduct.ProductID,
        location: adjustLocation,
        actionType: adjustAction,
        quantity: qty,
        reason: adjustReason,
        notes: adjustNotes
      });
    }

    setAdjustTargetProduct(null);
    setAdjustQty(1);
    setAdjustNotes('');
  };

  // =========================================================================
  // ৪.১ ভ্যারিয়েন্ট লেভেল রিস্টক, লট বৃদ্ধি, অপসারন ও যোগফল সমন্বয় হ্যান্ডলারসমূহ
  // =========================================================================

  // ভ্যারিয়েন্ট রিস্টক মডাল ওপেন
  const handleOpenVariantRestock = (product, variant, variantIdx, defaultLocation = 'Godown') => {
    setVariantRestockModal({
      product,
      variant,
      variantIdx,
      location: defaultLocation, // 'Godown' | 'Shop'
      action: 'ADD', // 'ADD' | 'DEDUCT' | 'SET'
      quantity: 1,
      reason: defaultLocation === 'Godown' ? 'নতুন লট গোডাউনে আগমন' : 'দোকান সেলফ বৃদ্ধি / সমন্বয়',
      notes: ''
    });
  };

  // ভ্যারিয়েন্ট রিস্টক / লট বৃদ্ধি ও সমন্বয় সাবমিট
  const handleSaveVariantRestockSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!variantRestockModal || !onUpdateProductVariants) return;
    const { product, variantIdx, location, action, quantity, reason, notes } = variantRestockModal;
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0 || (qty === 0 && action !== 'SET')) {
      alert('সঠিক পরিমাণ উল্লেখ করুন।');
      return;
    }

    const currentVariants = getVariantsOfProduct(product);
    if (variantIdx < 0 || variantIdx >= currentVariants.length) return;

    const targetVar = currentVariants[variantIdx];
    const prevGStock = Number(targetVar.GodownStock || 0);
    const prevSStock = Number(targetVar.StockQuantity || 0);

    let newGStock = prevGStock;
    let newSStock = prevSStock;

    if (location === 'Godown') {
      if (action === 'ADD') newGStock = prevGStock + qty;
      else if (action === 'DEDUCT') newGStock = Math.max(0, prevGStock - qty);
      else if (action === 'SET') newGStock = qty;
    } else {
      if (action === 'ADD') newSStock = prevSStock + qty;
      else if (action === 'DEDUCT') newSStock = Math.max(0, prevSStock - qty);
      else if (action === 'SET') newSStock = qty;
    }

    const updatedVariants = currentVariants.map((v, i) => {
      if (i === variantIdx) {
        return {
          ...v,
          GodownStock: newGStock,
          StockQuantity: newSStock
        };
      }
      return v;
    });

    setIsSubmittingVariantRestock(true);
    try {
      const varLabel = targetVar.Color ? `রং: ${targetVar.Color}` : targetVar.Size ? `সাইজ: ${targetVar.Size}` : (targetVar.VariantID || `#${variantIdx + 1}`);
      await onUpdateProductVariants(product.ProductID, updatedVariants, {
        location,
        type: action === 'ADD' ? 'RESTOCK' : action === 'DEDUCT' ? 'OUTFLOW' : 'ADJUSTMENT',
        variantName: varLabel,
        qty: action === 'SET' ? Math.abs(newGStock - prevGStock) : qty,
        prevStock: location === 'Godown' ? prevGStock : prevSStock,
        newStock: location === 'Godown' ? newGStock : newSStock,
        reason: reason || `ভ্যারিয়েন্ট রিস্টক (${varLabel})`,
        notes: notes || `ভ্যারিয়েন্ট স্টক সমন্বয়: ${action} ${qty}`
      });
      setVariantRestockModal(null);
    } catch (err) {
      alert(`স্টক সংরক্ষণ করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmittingVariantRestock(false);
    }
  };

  // নির্দিষ্ট ভ্যারিয়েন্ট স্থায়ীভাবে অপসারণ (Remove Variant)
  const handleRemoveVariant = async (product, variant, variantIdx) => {
    if (!onUpdateProductVariants) return;
    const varLabel = variant.Color ? `রং: ${variant.Color}` : variant.Size ? `সাইজ: ${variant.Size}` : (variant.VariantID || `#${variantIdx + 1}`);
    const confirmMsg = `আপনি কি নিশ্চিত যে '${product.ProductName}' পণ্যের ভ্যারিয়েন্ট (${varLabel}) স্থায়ীভাবে মুছে ফেলতে চান?\n\nএটি মুছে ফেললে মোট স্টক স্বয়ংক্রিয়ভাবে পুনর্গণনা হয়ে ডাটাবেসে সেভ হবে।`;
    if (!window.confirm(confirmMsg)) return;

    const currentVariants = getVariantsOfProduct(product);
    const updatedVariants = currentVariants.filter((_, i) => i !== variantIdx);

    try {
      await onUpdateProductVariants(product.ProductID, updatedVariants, {
        location: 'Godown',
        type: 'ADJUSTMENT',
        variantName: varLabel,
        qty: Number(variant.GodownStock || 0) + Number(variant.StockQuantity || 0),
        prevStock: Number(variant.GodownStock || 0),
        newStock: 0,
        reason: `ভ্যারিয়েন্ট অপসারণ (${varLabel})`,
        notes: 'ভ্যারিয়েন্ট মুছে ফেলা হয়েছে'
      });
    } catch (err) {
      alert(`ভ্যারিয়েন্ট মুছে ফেলতে সমস্যা হয়েছে: ${err.message}`);
    }
  };

  // মূল গোডাউন ও দোকান স্টক ভ্যারিয়েন্টে সমান বণ্টন
  const handleDistributeParentStockToVariants = async (product) => {
    if (!onUpdateProductVariants) return;
    const currentVariants = getVariantsOfProduct(product);
    if (currentVariants.length === 0) return;

    const parentGodown = Number(product.GodownStock || 0);
    const parentShop = Number(product.StockQuantity || 0);

    const confirmMsg = `পণ্য '${product.ProductName}' এর মূল গোডাউন স্টক (${parentGodown}) এবং দোকান স্টক (${parentShop}) মোট ${currentVariants.length}টি ভ্যারিয়েন্টে সমানভাবে বণ্টন করতে চান?\n\nগোডাউন প্রতি ভ্যারিয়েন্টে: ${(parentGodown / currentVariants.length).toFixed(1)}\nদোকান প্রতি ভ্যারিয়েন্টে: ${(parentShop / currentVariants.length).toFixed(1)}\n\nএটি ডাটাবেস এবং ফ্রন্টএন্ডে অবিলম্বে সেভ হবে।`;
    if (!window.confirm(confirmMsg)) return;

    const count = currentVariants.length;
    const baseG = Math.floor(parentGodown / count);
    const remG = parentGodown % count;

    const baseS = Math.floor(parentShop / count);
    const remS = parentShop % count;

    const updatedVariants = currentVariants.map((v, i) => {
      const g = baseG + (i < remG ? 1 : 0);
      const s = baseS + (i < remS ? 1 : 0);
      return {
        ...v,
        GodownStock: g,
        godownStock: g,
        StockQuantity: s,
        stockQuantity: s,
        TotalStock: g + s
      };
    });

    await onUpdateProductVariants(product.ProductID, updatedVariants, {
      location: 'Godown',
      type: 'ADJUSTMENT',
      variantName: 'সকল ভ্যারিয়েন্ট',
      qty: parentGodown,
      prevStock: 0,
      newStock: parentGodown,
      reason: 'মূল স্টক ভ্যারিয়েন্টে সমান বণ্টন',
      notes: `গোডাউন ${parentGodown} ও দোকান ${parentShop} সমান বণ্টন`
    });
  };

  // ভ্যারিয়েন্টগুলোর যোগফল দিয়ে মূল স্টক সিঙ্ক
  const handleSyncParentFromVariants = async (product) => {
    if (!onUpdateProductVariants) return;
    const currentVariants = getVariantsOfProduct(product);
    if (currentVariants.length === 0) return;

    const sumG = currentVariants.reduce((sum, v) => sum + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0);
    const sumS = currentVariants.reduce((sum, v) => sum + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0);

    const confirmMsg = `ভ্যারিয়েন্টগুলোর বর্তমান যোগফল অনুযায়ী পণ্যের মূল স্টক নির্ধারণ করতে চান?\n\nনূতন গোডাউন স্টক হবে: ${sumG}\nনূতন দোকান স্টক হবে: ${sumS}\n\nএটি ডাটাবেসে সেভ হবে ও ফ্রন্টএন্ড সিঙ্ক হবে।`;
    if (!window.confirm(confirmMsg)) return;

    await onUpdateProductVariants(product.ProductID, currentVariants, {
      location: 'Godown',
      type: 'ADJUSTMENT',
      variantName: 'সকল ভ্যারিয়েন্ট',
      qty: sumG,
      prevStock: Number(product.GodownStock || 0),
      newStock: sumG,
      reason: 'ভ্যারিয়েন্ট যোগফল দিয়ে মূল স্টক সিঙ্ক',
      notes: 'ভ্যারিয়েন্ট অনুযায়ী মোট স্টক সিঙ্ক'
    });
  };

  // নতুন ভ্যারিয়েন্ট যোগ মডাল ওপেন
  const handleOpenNewColor = (product) => {
    const isThan = Boolean(product.TotalThan || product.YardsPerThan || /than|থান/i.test(product.Unit || ''));
    const isWeight = /kg|gm|কেজি|গ্রাম/i.test(product.Unit || '');
    const defaultType = isThan ? 'Color' : (isWeight ? 'Weight' : 'Color');
    const prodBarcode = product.Barcode || `prod-${product.ProductID}`;
    setNewColorModal({
      product,
      variantType: defaultType,
      variantName: '',
      colorName: '',
      godownStock: 1, // ডিফল্ট ১ থান বা ১ পিস
      shopStock: 0,
      costPrice: product.CostPrice || 0,
      sellingPrice: product.SellingPrice || 0,
      wholesalePrice: product.WholesalePrice || product.WholeSalePrice || product.CostPrice || 0,
      barcode: `${prodBarcode}-${Date.now().toString().slice(-4)}`
    });
  };

  // নতুন ভ্যারিয়েন্ট ডাটাবেস ও প্রোডাক্টে যোগ ও সিঙ্ক
  const handleSaveNewColorSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newColorModal || !onUpdateProductVariants) return;
    const { product, variantType, variantName, colorName, godownStock, shopStock, costPrice, sellingPrice, wholesalePrice, barcode } = newColorModal;
    const vType = variantType || 'Color';
    const cleanVarName = String(variantName || colorName || '').trim();
    if (!cleanVarName) {
      alert(`দয়া করে ${vType === 'Color' ? 'রঙের' : vType === 'Size' ? 'সাইজের' : 'ভ্যারিয়েন্টের'} নাম ড্রপডাউন থেকে নির্বাচন করুন অথবা লিখুন।`);
      return;
    }

    const currentVariants = getVariantsOfProduct(product);
    const isDuplicate = currentVariants.some((v) => {
      const c = v.Attributes?.[vType] || v[vType] || v.Color || v.color || v.Attributes?.Color || v.VariantID;
      return String(c || '').trim().toLowerCase() === cleanVarName.toLowerCase();
    });
    if (isDuplicate) {
      alert(`'${cleanVarName}' নামের একটি ভ্যারিয়েন্ট ইতোমধ্যে এই পণ্যে বিদ্যমান রয়েছে!`);
      return;
    }

    // নতুন অপশন ডাটাবেসে সেভ (যদি আগে ডাটাবেসে না থাকে)
    if (onAddVariantOption) {
      const existsInDb = (variantAttributes || []).some((va) => {
        const t = String(va.Type || va.type || va.AttributeType || va.attributeType || 'Color').trim().toLowerCase();
        const n = String(va.Name || va.name || va.OptionName || va.optionName || '').trim().toLowerCase();
        return t === vType.toLowerCase() && n === cleanVarName.toLowerCase();
      });
      if (!existsInDb) {
        try {
          await onAddVariantOption({ type: vType, name: cleanVarName });
        } catch (dbErr) {
          console.warn('Could not auto-add variant to DB:', dbErr);
        }
      }
    }

    const gStock = Math.max(0, Number(godownStock) || 0);
    const sStock = Math.max(0, Number(shopStock) || 0);
    const baseBarcode = product.Barcode || `pb-${product.ProductID}`;
    const finalBarcode = barcode ? barcode.trim() : `${baseBarcode}-${cleanVarName.toLowerCase().replace(/\s+/g, '-')}`;

    const newVariantObj = {
      VariantID: `VAR-${vType.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${cleanVarName.toUpperCase().replace(/\s+/g, '_')}`,
      Attributes: { [vType]: cleanVarName },
      Color: vType === 'Color' ? cleanVarName : (product.Color || ''),
      Size: vType === 'Size' ? cleanVarName : '',
      Weight: vType === 'Weight' ? cleanVarName : '',
      Barcode: finalBarcode,
      CostPrice: Number(costPrice) || Number(product.CostPrice) || 0,
      SellingPrice: Number(sellingPrice) || Number(product.SellingPrice) || 0,
      WholesalePrice: Number(wholesalePrice) || Number(product.WholesalePrice) || 0,
      GodownStock: gStock,
      godownStock: gStock,
      StockQuantity: sStock,
      stockQuantity: sStock,
      TotalStock: gStock + sStock
    };

    const updatedVariants = [...currentVariants, newVariantObj];

    setIsSubmittingNewColor(true);
    try {
      await onUpdateProductVariants(product.ProductID, updatedVariants, {
        location: 'Godown',
        type: 'NEW_VARIANT',
        variantName: `${vType === 'Color' ? 'রং' : vType === 'Size' ? 'সাইজ' : 'ভ্যারিয়েন্ট'}: ${cleanVarName}`,
        qty: gStock,
        prevStock: 0,
        newStock: gStock,
        reason: `নতুন ভ্যারিয়েন্ট যোগ ও রিস্টক (${cleanVarName})`,
        notes: `নতুন ভ্যারিয়েন্ট (${vType}): গোডাউন ${gStock}, দোকান ${sStock}`
      });
      setNewColorModal(null);
    } catch (err) {
      alert(`নতুন ভ্যারিয়েন্ট সংরক্ষণ করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmittingNewColor(false);
    }
  };

  // ভ্যারিয়েন্ট এডিট মডাল ওপেন
  const handleOpenEditVariant = (product, variant, variantIdx) => {
    const colorVal = variant.Color || variant.color || variant.Attributes?.Color || variant.Attributes?.color || '';
    setEditVariantModal({
      product,
      variant,
      variantIdx,
      colorName: colorVal,
      barcode: variant.Barcode || variant.barcode || '',
      godownStock: Number(variant.GodownStock !== undefined ? variant.GodownStock : variant.godownStock) || 0,
      shopStock: Number(variant.StockQuantity !== undefined ? variant.StockQuantity : variant.stockQuantity) || 0,
      costPrice: Number(variant.CostPrice !== undefined ? variant.CostPrice : (product.CostPrice || 0)),
      sellingPrice: Number(variant.SellingPrice !== undefined ? variant.SellingPrice : (product.SellingPrice || 0)),
      wholesalePrice: Number(variant.WholesalePrice !== undefined ? variant.WholesalePrice : (product.WholesalePrice || product.CostPrice || 0)),
    });
  };

  // ভ্যারিয়েন্ট এডিট সংরক্ষণ ও ডাটাবেস সিঙ্ক
  const handleSaveEditVariantSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editVariantModal || !onUpdateProductVariants) return;
    const { product, variantIdx, colorName, barcode, godownStock, shopStock, costPrice, sellingPrice, wholesalePrice } = editVariantModal;
    const cleanColor = String(colorName || '').trim();
    if (!cleanColor) {
      alert('দয়া করে রঙের নাম উল্লেখ করুন।');
      return;
    }

    const currentVariants = getVariantsOfProduct(product);
    // অন্য কোনো ভ্যারিয়েন্টে একই নাম আছে কি না যাচাই
    const isDuplicate = currentVariants.some((v, idx) => {
      if (idx === variantIdx) return false;
      const c = v.Color || v.color || v.Attributes?.Color || v.Attributes?.color || v.VariantID;
      return String(c).trim().toLowerCase() === cleanColor.toLowerCase();
    });
    if (isDuplicate) {
      alert(`'${cleanColor}' নামের আরেকটি ভ্যারিয়েন্ট ইতোমধ্যে এই পণ্যে বিদ্যমান রয়েছে!`);
      return;
    }

    const gStock = Math.max(0, Number(godownStock) || 0);
    const sStock = Math.max(0, Number(shopStock) || 0);

    const updatedVariants = currentVariants.map((v, idx) => {
      if (idx === variantIdx) {
        return {
          ...v,
          Color: cleanColor,
          Attributes: { ...(v.Attributes || {}), Color: cleanColor },
          Barcode: barcode ? barcode.trim() : (v.Barcode || ''),
          GodownStock: gStock,
          godownStock: gStock,
          StockQuantity: sStock,
          stockQuantity: sStock,
          TotalStock: gStock + sStock,
          totalStock: gStock + sStock,
          CostPrice: Number(costPrice) || 0,
          SellingPrice: Number(sellingPrice) || 0,
          WholesalePrice: Number(wholesalePrice) || 0
        };
      }
      return v;
    });

    setIsSubmittingEditVariant(true);
    try {
      await onUpdateProductVariants(product.ProductID, updatedVariants, {
        location: 'Godown',
        type: 'ADJUSTMENT',
        variantName: `রং: ${cleanColor}`,
        qty: gStock,
        prevStock: Number(editVariantModal.variant.GodownStock || 0),
        newStock: gStock,
        reason: `ভ্যারিয়েন্ট এডিট (${cleanColor})`,
        notes: `ভ্যারিয়েন্ট তথ্য ও স্টক আপডেট: গোডাউন ${gStock}, দোকান ${sStock}`
      });
      setEditVariantModal(null);
    } catch (err) {
      alert(`ভ্যারিয়েন্ট আপডেট করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmittingEditVariant(false);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto"}>
      <div className={embedded ? "relative w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)]" : "relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]"}>
        
        {/* =================================================================== */}
        {/* হেডার ও প্রধান ৪টি ট্যাব নেভিগেশন */}
        {/* =================================================================== */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">গোডাউন ও দোকান স্টক ট্র্যাকার</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/20">
                  মাল্টি-লোকেশন
                </span>
              </div>
              <p className="text-xs text-slate-300">
                গোডাউন ও দোকান স্টক পৃথকীকরণ, চালান স্থানান্তর ও কমার পৃথক খতিয়ান
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* ৪টি মূল ট্যাব */}
            <div className="bg-slate-800/90 p-1 rounded-xl flex items-center border border-slate-700/60 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setActiveMainTab('overview'); setPrintableChallan(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeMainTab === 'overview'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>স্টক খতিয়ান</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMainTab('transfers'); setPrintableChallan(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeMainTab === 'transfers'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>চালান স্থানান্তর</span>
                {stockKpis.inTransitChallans > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-mono font-bold animate-pulse">
                    {stockKpis.inTransitChallans}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setActiveMainTab('godown_outflow'); setPrintableChallan(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeMainTab === 'godown_outflow'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                <span>গোডাউন কমার খাতা</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMainTab('shop_outflow'); setPrintableChallan(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeMainTab === 'shop_outflow'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>দোকান কমার খাতা</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className={`rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 shadow-xs'
                  : 'p-2 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-bold">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* প্রিন্ট প্রিভিউ ভিউয়ার */}
        {/* =================================================================== */}
        {printableChallan ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-0 print:border-none print:shadow-none">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
                <span className="text-xs font-bold text-slate-600">ডেলিভারি চালান ও গেটপাস প্রিন্ট ভিউ</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>চালান প্রিন্ট করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPrintableChallan(null); handleResetChallan(); setTransferSubTab('list'); }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>

              {/* চালান ফরম্যাট */}
              <div className="space-y-6 text-slate-800 text-xs">
                <div className="text-center pb-4 border-b-2 border-slate-900">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {storeSettings?.StoreName || 'Pabna Bostraloy'}
                  </h3>
                  <p className="text-xs text-slate-500">{storeSettings?.Address || 'Bosila, Mohammadpur, Dhaka'}</p>
                  <p className="text-xs text-slate-500">ফোন: {storeSettings?.Phone || '01675934919'}</p>
                  <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                    পণ্য স্থানান্তর ডেলিভারি চালান ও গেটপাস
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-medium">চালান নম্বর:</span>
                    <span className="font-bold font-mono text-sm text-indigo-700">{printableChallan.ChallanNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">চালান তৈরির তারিখ:</span>
                    <span className="font-bold">{new Date(printableChallan.TransferDate || printableChallan.CreatedAt).toLocaleString('bn-BD')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">উৎস (প্রেরক স্থান):</span>
                    <span className="font-bold text-slate-900">{printableChallan.FromLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">গন্তব্য (প্রাপক স্থান):</span>
                    <span className="font-bold text-emerald-700">{printableChallan.ToLocation}</span>
                  </div>
                  {printableChallan.DriverName && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-medium">বাহক / ড্রাইভার তথ্য:</span>
                      <span className="font-medium text-slate-800">{printableChallan.DriverName}</span>
                    </div>
                  )}
                </div>

                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 bg-slate-100">
                      <th className="py-2 px-3">ক্রমিক</th>
                      <th className="py-2 px-3">পণ্যের বিবরণ</th>
                      <th className="py-2 px-3 text-center">একক</th>
                      <th className="py-2 px-3 text-right">স্থানান্তরিত পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(printableChallan.Items || []).map((itm, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{itm.productName}</strong>
                          {itm.variantName && (
                            <span className="text-[10px] text-slate-500 font-medium">ভ্যারিয়েন্ট: {itm.variantName}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{itm.unit || 'Pcs'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-slate-900">
                          {itm.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                      <td colSpan="3" className="py-2.5 px-3 text-right uppercase">মোট স্থানান্তর পরিমাণ:</td>
                      <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-emerald-800">
                        {printableChallan.TotalQuantity || (printableChallan.Items || []).reduce((s, itm) => s + Number(itm.quantity), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {printableChallan.Notes && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                    <span className="font-bold text-amber-900 block">মন্তব্য:</span>
                    <span className="text-amber-800">{printableChallan.Notes}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-10 pt-12 text-center text-xs text-slate-500">
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-medium">প্রেরক / গোডাউন ইনচার্জ স্বাক্ষর</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-medium">প্রাপক / দোকান রিসিভার স্বাক্ষর</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
            
            {/* =============================================================== */}
            {/* ট্যাব ১: 📦 স্টক খতিয়ান (গোডাউন বনাম দোকান ওভারভিউ) */}
            {/* =============================================================== */}
            {activeMainTab === 'overview' && (
              <div className="space-y-5">
                
                {/* কেপিআই কার্ডস */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl text-white shadow-sm">
                    <div className="flex items-center justify-between opacity-80 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">গোডাউন মোট স্টক</span>
                      <Warehouse className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-black">{stockKpis.totalGodown.toLocaleString('bn-BD')}</div>
                    <div className="text-[10px] text-indigo-100 font-medium flex items-center justify-between mt-0.5">
                      <span>গোডাউনে সামগ্রিক মজুত</span>
                      {stockKpis.fabricGodownYards > 0 && (
                        <span className="bg-white/20 px-1.5 py-0.2 rounded font-bold">{stockKpis.fabricGodownYards.toLocaleString('bn-BD')} গজ</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl text-white shadow-sm">
                    <div className="flex items-center justify-between opacity-80 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">দোকান মোট স্টক</span>
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-black">{stockKpis.totalShop.toLocaleString('bn-BD')}</div>
                    <div className="text-[10px] text-emerald-100 font-medium flex items-center justify-between mt-0.5">
                      <span>কাউন্টারে বিক্রির প্রস্তুত</span>
                      {stockKpis.fabricShopYards > 0 && (
                        <span className="bg-white/20 px-1.5 py-0.2 rounded font-bold">{stockKpis.fabricShopYards.toLocaleString('bn-BD')} গজ</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-800 rounded-2xl text-white shadow-sm">
                    <div className="flex items-center justify-between opacity-80 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">ভ্যারিয়েন্ট আইটেম</span>
                      <Palette className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-black">{(stockKpis.totalVariants || 0).toLocaleString('bn-BD')} টি</div>
                    <span className="text-[10px] text-purple-100 font-medium">রং, সাইজ ও থান পৃথক তালিকাভুক্ত</span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl text-white shadow-sm">
                    <div className="flex items-center justify-between opacity-80 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">চলতি পথে চালান</span>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-black">{stockKpis.inTransitChallans.toLocaleString('bn-BD')} টি</div>
                    <span className="text-[10px] text-slate-300 font-medium">ট্রানজিটে থাকা ডেলিভারি চালান</span>
                  </div>
                </div>

                {/* ফিল্টার এবং কন্ট্রোল বার */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 w-full sm:w-auto flex-1">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={overviewSearch}
                          onChange={(e) => setOverviewSearch(e.target.value)}
                          placeholder="পণ্য নাম, কোড, রং, সাইজ বা বারকোড দিয়ে খুঁজুন..."
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <select
                        value={overviewCategory}
                        onChange={(e) => setOverviewCategory(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="ALL">সকল ক্যাটাগরি</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-2">
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setOverviewFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${overviewFilter === 'ALL' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          সকল ({products.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverviewFilter('NEED_TRANSFER')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${overviewFilter === 'NEED_TRANSFER' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          ⚠️ দোকানে কম ({stockKpis.needTransferCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverviewFilter('IN_GODOWN')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${overviewFilter === 'IN_GODOWN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          🏭 গোডাউনে আছে
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverviewFilter('IN_SHOP')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${overviewFilter === 'IN_SHOP' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          🏬 দোকানে আছে
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => exportLocationStockExcelCSV(products)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-xs cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>এক্সেল রিপোর্ট</span>
                      </button>
                    </div>
                  </div>

                  {/* ভিউ মোড টগল (গ্রুপ ভিউ বনাম বিস্তারিত ভ্যারিয়েন্ট ভিউ) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-500">প্রদর্শন মোড:</span>
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setStockViewMode('grouped')}
                          className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                            stockViewMode === 'grouped'
                              ? 'bg-white shadow-xs text-indigo-700 font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>📦 পণ্য ভিত্তিক গ্রুপ ভিউ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStockViewMode('variants')}
                          className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                            stockViewMode === 'variants'
                              ? 'bg-indigo-600 shadow-xs text-white font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>🎨 ভ্যারিয়েন্ট ভিত্তিক বিস্তারিত ভিউ</span>
                        </button>
                      </div>
                    </div>

                    {stockViewMode === 'grouped' && (
                      <div className="flex items-center space-x-1.5 text-xs">
                        <button
                          type="button"
                          onClick={handleExpandAll}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                        >
                          সকল ভ্যারিয়েন্ট বিস্তার করুন ▾
                        </button>
                        <button
                          type="button"
                          onClick={handleCollapseAll}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                        >
                          সংক্ষেপ করুন ▴
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* পণ্য স্টক তালিকা টেবিল */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">
                            {stockViewMode === 'grouped' ? 'পণ্য ও বিবরণ' : 'পণ্য ও ভ্যারিয়েন্ট বিবরণ'}
                          </th>
                          <th className="py-3 px-3">ক্যাটাগরি</th>
                          <th className="py-3 px-3 text-center">একক</th>
                          <th className="py-3 px-4 text-center bg-indigo-50/60 text-indigo-900 font-black">🏭 গোডাউন স্টক</th>
                          <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-900 font-black">🏬 দোকান স্টক</th>
                          <th className="py-3 px-3 text-center">📦 মোট স্টক</th>
                          <th className="py-3 px-3 text-center">অবস্থা</th>
                          <th className="py-3 px-4 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockViewMode === 'grouped' ? (
                          // =========================================================
                          // ১. গ্রুপড ভিউ (পণ্য ভিত্তিক রো + এক্সপ্যান্ডেবল ভ্যারিয়েন্ট টেবিল)
                          // =========================================================
                          filteredOverviewProducts.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                                কোনো পণ্য খুঁজে পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            filteredOverviewProducts.map((p) => {
                              const gStock = Number(p.GodownStock || 0);
                              const sStock = Number(p.StockQuantity || 0);
                              const total = gStock + sStock;
                              const minAlert = Number(p.MinStockAlert || 5);
                              const isLowShop = sStock <= minAlert;
                              const isZeroShop = sStock <= 0;
                              const vars = getVariantsOfProduct(p);
                              const hasVars = vars.length > 0;
                              const isExpanded = Boolean(expandedProductIds[p.ProductID]);
                              const isThan = Boolean(p.TotalThan || p.YardsPerThan || /than|থান/i.test(p.Unit || ''));
                              const yardsPerThan = Number(p.YardsPerThan) || 0;

                              return (
                                <React.Fragment key={p.ProductID}>
                                  <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                                    <td className="py-3 px-4">
                                      <div className="flex items-start space-x-2">
                                        {hasVars && (
                                          <button
                                            type="button"
                                            onClick={() => toggleExpandProduct(p.ProductID)}
                                            className="mt-0.5 p-1 rounded-md text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                                            title={isExpanded ? 'সংক্ষেপ করুন' : 'ভ্যারিয়েন্ট বিস্তারিত দেখুন'}
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                            )}
                                          </button>
                                        )}
                                        <div>
                                          <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                                            <span>{p.ProductName}</span>
                                            {hasVars && (
                                              <span
                                                onClick={() => toggleExpandProduct(p.ProductID)}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer"
                                              >
                                                <Palette className="w-2.5 h-2.5 mr-1" />
                                                {vars.length}টি ভ্যারিয়েন্ট
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                            ID: {p.ProductID} {p.Barcode ? `| #${p.Barcode}` : ''}
                                          </div>
                                          {isThan && (
                                            <div className="text-[10.5px] text-indigo-700 font-bold mt-0.5 flex items-center space-x-1.5">
                                              <span>গোডাউন থান: {gStock}</span>
                                              {yardsPerThan > 0 && <span>• গজ/থান: {yardsPerThan}</span>}
                                              {yardsPerThan > 0 && <span>• মোট: {gStock * yardsPerThan} গজ</span>}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 font-medium">
                                      {p.Category}
                                    </td>
                                    <td className="py-3 px-3 text-center font-medium text-slate-500">
                                      {p.Unit || 'Pcs'}
                                    </td>
                                    <td className="py-3 px-4 text-center bg-indigo-50/30">
                                      <span className={`text-sm font-black font-mono ${gStock > 0 ? 'text-indigo-700' : 'text-slate-300'}`}>
                                        {gStock}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center bg-emerald-50/30">
                                      <span className={`text-sm font-black font-mono ${isZeroShop ? 'text-rose-600' : isLowShop ? 'text-amber-600' : 'text-emerald-700'}`}>
                                        {sStock}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-black font-mono text-slate-900">
                                      {total}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      {isZeroShop && gStock > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                          দোকানে আনুন
                                        </span>
                                      ) : isZeroShop && gStock <= 0 ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                          উভয় স্থানে শেষ
                                        </span>
                                      ) : isLowShop && gStock > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                          দোকানে কম
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          পর্যাপ্ত
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end space-x-1.5">
                                        <button
                                          type="button"
                                          disabled={gStock <= 0}
                                          onClick={() => handleOpenDirectTransfer(p)}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-all ${
                                            gStock <= 0
                                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                          }`}
                                          title={gStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে দোকানে পণ্য আনুন'}
                                        >
                                          <Truck className="w-3 h-3" />
                                          <span>দোকানে আনুন</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAdjustTargetProduct(p);
                                            setAdjustLocation('Godown');
                                            setAdjustAction('ADD');
                                            setAdjustQty(1);
                                          }}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-all cursor-pointer"
                                          title="স্টক সংশোধন বা সমন্বয়"
                                        >
                                          <SlidersHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                        {onEditProduct && (
                                          <button
                                            type="button"
                                            onClick={() => onEditProduct(p)}
                                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs transition-all cursor-pointer border border-indigo-200"
                                            title="পণ্য এডিট করুন (নাম, ক্যাটাগরি, দর ইত্যাদি)"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {onDeleteProduct && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (window.confirm(`আপনি কি নিশ্চিত যে '${p.ProductName}' পণ্যটি ফ্রন্টএন্ড ও গুগল শিট ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?\n\nমুছে ফেলার পর এটি উভয় স্থান থেকে মুছে যাবে এবং স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।`)) {
                                                onDeleteProduct(p.ProductID);
                                              }
                                            }}
                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition-all cursor-pointer border border-rose-200"
                                            title="পণ্যটি সম্পূর্ণ মুছে ফেলুন (Delete)"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>

                                  {/* ভ্যারিয়েন্ট এক্সপ্যান্ডেবল ড্রপডাউন সাব-টেবিল */}
                                  {hasVars && isExpanded && (
                                    <tr className="bg-slate-50/90 border-y border-indigo-100">
                                      <td colSpan="8" className="p-3 pl-8 sm:pl-12">
                                        {(() => {
                                          const sumVarGodown = vars.reduce((s, item) => s + (Number(item.GodownStock) || 0), 0);
                                          const sumVarShop = vars.reduce((s, item) => s + (Number(item.StockQuantity) || 0), 0);
                                          const pGodown = Number(p.GodownStock) || 0;
                                          const pShop = Number(p.StockQuantity) || 0;
                                          const isMismatch = (sumVarGodown !== pGodown) || (sumVarShop !== pShop);

                                          return (
                                            <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-xs">
                                              <div className="px-3 py-2 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center space-x-1.5">
                                                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                                                  <span className="text-[11px] font-bold text-indigo-900">{p.ProductName} — ভ্যারিয়েন্ট অনুযায়ী আলাদা মজুত</span>
                                                  <span className="text-[10px] text-indigo-700 font-semibold ml-2">
                                                    (মোট {vars.length}টি ভ্যারিয়েন্ট)
                                                  </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-[10.5px]">
                                                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold">
                                                    ভ্যারিয়েন্ট গোডাউন মোট: <strong className="font-mono">{sumVarGodown}</strong> {isThan ? 'থান' : (p.Unit || 'Pcs')}
                                                  </span>
                                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                                                    ভ্যারিয়েন্ট দোকান মোট: <strong className="font-mono">{sumVarShop}</strong> {isThan ? 'থান' : (p.Unit || 'Pcs')}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenNewColor(p)}
                                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold inline-flex items-center space-x-1 shadow-xs cursor-pointer transition-all shrink-0"
                                                    title="এই পণ্যে নতুন একটি ভ্যারিয়েন্ট যোগ করুন"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                    <span>নতুন ভ্যারিয়েন্ট যোগ</span>
                                                  </button>
                                                </div>
                                              </div>

                                              {/* গরমিল নোটিশ ও ১-ক্লিক সমাধান বাটন */}
                                              {isMismatch && (
                                                <div className="px-3 py-2 bg-amber-50/95 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                  <div className="flex items-center space-x-2 text-amber-900">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                    <div>
                                                      <span className="font-bold">স্টক অমিল রয়েছে:</span>{' '}
                                                      <span>মূল গোডাউন: <strong className="font-mono text-indigo-950">{pGodown}</strong> vs ভ্যারিয়েন্ট গোডাউন: <strong className="font-mono text-indigo-700">{sumVarGodown}</strong></span>
                                                      {pShop !== sumVarShop && (
                                                        <span className="ml-2 font-medium">| মূল দোকান: <strong className="font-mono text-emerald-950">{pShop}</strong> vs ভ্যারিয়েন্ট দোকান: <strong className="font-mono text-emerald-700">{sumVarShop}</strong></span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center space-x-1.5 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDistributeParentStockToVariants(p)}
                                                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs transition-all"
                                                      title="মূল গোডাউন স্টক সকল ভ্যারিয়েন্টে সমানভাবে বণ্টন করুন"
                                                    >
                                                      <Sparkles className="w-3 h-3" />
                                                      <span>ভ্যারিয়েন্টে সমান বণ্টন</span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleSyncParentFromVariants(p)}
                                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs transition-all"
                                                      title="ভ্যারিয়েন্টগুলোর বর্তমান যোগফল দিয়ে মূল পণ্যের স্টক আপডেট করুন"
                                                    >
                                                      <RefreshCw className="w-3 h-3" />
                                                      <span>যোগফল দিয়ে সিঙ্ক</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                              <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                                                  <tr>
                                                    <th className="py-2 px-3">ভ্যারিয়েন্ট বিবরণ (রং / সাইজ)</th>
                                                    <th className="py-2 px-3">বারকোড</th>
                                                    <th className="py-2 px-3 text-center bg-indigo-50/40 text-indigo-900">🏭 গোডাউন স্টক</th>
                                                    <th className="py-2 px-3 text-center bg-emerald-50/40 text-emerald-900">🏬 দোকান স্টক</th>
                                                    <th className="py-2 px-3 text-center">📦 মোট</th>
                                                    <th className="py-2 px-3 text-center">অবস্থা</th>
                                                    <th className="py-2 px-3 text-right">কার্যক্রম / অ্যাকশন</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {vars.map((v, vIdx) => {
                                                    const vGStock = Number(v.GodownStock) || 0;
                                                    const vSStock = Number(v.StockQuantity) || 0;
                                                    const vTotal = vGStock + vSStock;
                                                    const vColor = v.Attributes?.Color || v.Color || '';
                                                    const vSize = v.Attributes?.Size || v.Size || '';
                                                    const isVZero = vSStock <= 0;
                                                    const isVLow = vSStock <= 2;

                                                    return (
                                                      <tr key={v.VariantID || vIdx} className="hover:bg-indigo-50/20">
                                                        <td className="py-2 px-3">
                                                          <div className="flex items-center space-x-1.5">
                                                            {vColor && (
                                                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                                                রং: {vColor}
                                                              </span>
                                                            )}
                                                            {vSize && (
                                                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                সাইজ: {vSize}
                                                              </span>
                                                            )}
                                                            {v.Attributes && Object.entries(v.Attributes).map(([key, val]) => {
                                                              if (key === 'Color' || key === 'Size') return null;
                                                              return (
                                                                <span key={key} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                                                                  {key}: {val}
                                                                </span>
                                                              );
                                                            })}
                                                          </div>
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-[10.5px] text-slate-500">
                                                          {v.Barcode || p.Barcode || '—'}
                                                        </td>
                                                        <td className="py-2 px-3 text-center bg-indigo-50/20">
                                                          <span className="font-mono font-bold text-indigo-700">
                                                            {vGStock} {isThan ? 'থান' : (p.Unit || 'Pcs')}
                                                          </span>
                                                          {isThan && yardsPerThan > 0 && (
                                                            <div className="text-[9.5px] text-indigo-500 font-semibold">
                                                              ({vGStock * yardsPerThan} গজ)
                                                            </div>
                                                          )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center bg-emerald-50/20">
                                                          <span className={`font-mono font-bold ${isVZero ? 'text-rose-600' : isVLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                            {vSStock} {isThan ? 'থান' : (p.Unit || 'Pcs')}
                                                          </span>
                                                          {isThan && yardsPerThan > 0 && (
                                                            <div className="text-[9.5px] text-emerald-600 font-semibold">
                                                              ({vSStock * yardsPerThan} গজ)
                                                            </div>
                                                          )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                                          {vTotal}
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                          {isVZero && vGStock > 0 ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                                                              দোকানে নেই
                                                            </span>
                                                          ) : isVZero && vGStock <= 0 ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-700">
                                                              শেষ
                                                            </span>
                                                          ) : (
                                                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                                                              উপলব্ধ
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                          <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                              type="button"
                                                              disabled={vGStock <= 0}
                                                              onClick={() => handleOpenDirectTransfer(p, v)}
                                                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center space-x-1 transition-all shadow-xs ${
                                                                vGStock <= 0
                                                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                                              }`}
                                                              title={vGStock <= 0 ? 'গোডাউনে এই ভ্যারিয়েন্টের কোনো স্টক নেই' : 'এই নির্দিষ্ট ভ্যারিয়েন্ট গোডাউন থেকে দোকানে আনুন'}
                                                            >
                                                              <Truck className="w-2.5 h-2.5" />
                                                              <span>দোকানে আনুন</span>
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() => handleOpenVariantRestock(p, v, vIdx, 'Godown')}
                                                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                              title="এই ভ্যারিয়েন্টে রিস্টক বা স্টক সমন্বয় করুন"
                                                            >
                                                              <PlusCircle className="w-2.5 h-2.5" />
                                                              <span>রিস্টক</span>
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() => handleOpenEditVariant(p, v, vIdx)}
                                                              className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs transition-all cursor-pointer"
                                                              title="ভ্যারিয়েন্ট এডিট করুন (রং, বারকোড ও স্টক)"
                                                            >
                                                              <Edit3 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() => handleRemoveVariant(p, v, vIdx)}
                                                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded text-xs transition-all cursor-pointer"
                                                              title="এই ভ্যারিয়েন্টটি স্থায়ীভাবে মুছে ফেলুন"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                                <tfoot className="bg-slate-50 border-t border-indigo-100">
                                                  <tr>
                                                    <td colSpan="7" className="py-2 px-3 text-center">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleOpenNewColor(p)}
                                                        className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-300 rounded-lg text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                                                      >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>+ নতুন ভ্যারিয়েন্ট যোগ করুন</span>
                                                      </button>
                                                    </td>
                                                  </tr>
                                                </tfoot>
                                              </table>
                                            </div>
                                          );
                                        })()}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )
                        ) : (
                          // =========================================================
                          // ২. ফ্ল্যাট ভ্যারিয়েন্ট ভিউ (সরাসরি প্রতিটি ভ্যারিয়েন্ট আলাদা রো আকারে)
                          // =========================================================
                          flattenedVariantList.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                                কোনো ভ্যারিয়েন্ট খুঁজে পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            flattenedVariantList.map((item, idx) => {
                              const isZeroShop = item.shopStock <= 0;
                              const isLowShop = item.shopStock <= 2;

                              return (
                                <tr key={item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 text-sm">
                                      {item.productName}
                                    </div>
                                    <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                                      {item.color && (
                                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                          রং: {item.color}
                                        </span>
                                      )}
                                      {item.size && (
                                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                          সাইজ: {item.size}
                                        </span>
                                      )}
                                      {item.otherAttrs && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                                          {item.otherAttrs}
                                        </span>
                                      )}
                                      {!item.isVariant && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 italic">
                                          সাধারণ পণ্য
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                                      ID: {item.productId} {item.barcode ? `| #${item.barcode}` : ''}
                                    </div>
                                    {item.isThanUnit && (
                                      <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                                        গজ/থান: {item.yardsPerThan} • গোডাউন: {item.godownYards} গজ • দোকান: {item.shopYards} গজ
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-slate-600 font-medium">
                                    {item.category}
                                  </td>
                                  <td className="py-3 px-3 text-center font-medium text-slate-500">
                                    {item.unit}
                                  </td>
                                  <td className="py-3 px-4 text-center bg-indigo-50/30">
                                    <span className={`text-sm font-black font-mono ${item.godownStock > 0 ? 'text-indigo-700' : 'text-slate-300'}`}>
                                      {item.godownStock}
                                    </span>
                                    {item.isThanUnit && item.godownYards > 0 && (
                                      <div className="text-[9.5px] text-indigo-500 font-semibold">
                                        ({item.godownYards} গজ)
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center bg-emerald-50/30">
                                    <span className={`text-sm font-black font-mono ${isZeroShop ? 'text-rose-600' : isLowShop ? 'text-amber-600' : 'text-emerald-700'}`}>
                                      {item.shopStock}
                                    </span>
                                    {item.isThanUnit && item.shopYards > 0 && (
                                      <div className="text-[9.5px] text-emerald-600 font-semibold">
                                        ({item.shopYards} গজ)
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center font-black font-mono text-slate-900">
                                    {item.totalStock}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {isZeroShop && item.godownStock > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        দোকানে আনুন
                                      </span>
                                    ) : isZeroShop && item.godownStock <= 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        শেষ
                                      </span>
                                    ) : isLowShop && item.godownStock > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        দোকানে কম
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        পর্যাপ্ত
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        type="button"
                                        disabled={item.godownStock <= 0}
                                        onClick={() => handleOpenDirectTransfer(item.parentProduct, item.variant)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 shadow-2xs transition-all ${
                                          item.godownStock <= 0
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                        }`}
                                        title={item.godownStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে এই ভ্যারিয়েন্ট সরাসরি দোকানে আনুন'}
                                      >
                                        <Truck className="w-3 h-3" />
                                        <span>দোকানে আনুন</span>
                                      </button>
                                      {item.isVariant ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenVariantRestock(item.parentProduct, item.variant, item.variantIndex, 'Godown')}
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                            title="এই ভ্যারিয়েন্টে রিস্টক বা স্টক সমন্বয় করুন"
                                          >
                                            <PlusCircle className="w-3 h-3" />
                                            <span>রিস্টক</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditVariant(item.parentProduct, item.variant, item.variantIndex)}
                                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs transition-all cursor-pointer"
                                            title="ভ্যারিয়েন্ট এডিট করুন (রং, বারকোড ও স্টক)"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveVariant(item.parentProduct, item.variant, item.variantIndex)}
                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition-all cursor-pointer border border-rose-200"
                                            title="এই ভ্যারিয়েন্টটি মুছে ফেলুন (Delete Variant)"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {onEditProduct && (
                                            <button
                                              type="button"
                                              onClick={() => onEditProduct(item.parentProduct)}
                                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs transition-all cursor-pointer border border-indigo-200"
                                              title="পণ্য এডিট করুন"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {onDeleteProduct && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (window.confirm(`আপনি কি নিশ্চিত যে '${item.productName}' পণ্যটি ফ্রন্টএন্ড ও গুগল শিট ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?\n\nমুছে ফেলার পর এটি উভয় স্থান থেকে মুছে যাবে এবং স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।`)) {
                                                  onDeleteProduct(item.productId);
                                                }
                                              }}
                                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition-all cursor-pointer border border-rose-200"
                                              title="পণ্যটি সম্পূর্ণ মুছে ফেলুন (Delete)"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* =============================================================== */}
            {/* ট্যাব ২: 🚚 স্থানান্তর চালান (নতুন চালান ও তালিকা) */}
            {/* =============================================================== */}
            {activeMainTab === 'transfers' && (
              <div className="space-y-4">
                
                {/* সাব-ট্যাব বার */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setTransferSubTab('new')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        transferSubTab === 'new'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      নতুন চালান তৈরি
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferSubTab('list')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                        transferSubTab === 'list'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>চালান তালিকা ও ট্র্যাকিং</span>
                      {stockTransfers.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 text-slate-800 font-mono">
                          {stockTransfers.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* ২.১ নতুন চালান তৈরি ভিউ */}
                {transferSubTab === 'new' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    
                    {/* চালান ফরম */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">চালান নম্বর</label>
                          <input
                            type="text"
                            value={challanNo}
                            onChange={(e) => setChallanNo(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">প্রেরক স্থান (উৎস)</label>
                          <select
                            value={fromLocation}
                            onChange={(e) => setFromLocation(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Main Warehouse">🏭 কেন্দ্রীয় গোডাউন (Main Warehouse)</option>
                            <option value="Main Shop">🏬 প্রধান দোকান (Main Shop)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">প্রাপক স্থান (গন্তব্য)</label>
                          <select
                            value={toLocation}
                            onChange={(e) => setToLocation(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Main Shop">🏬 প্রধান দোকান (Main Shop)</option>
                            <option value="Main Warehouse">🏭 কেন্দ্রীয় গোডাউন (Main Warehouse)</option>
                          </select>
                        </div>
                      </div>

                      {/* আইটেম পিকার বক্স */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <span className="text-xs font-bold text-slate-800 block">চালানে পণ্য যোগ করুন</span>

                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="পণ্য অনুসন্ধান করুন..."
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />

                          {filteredChallanSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                              {filteredChallanSuggestions.map((p) => (
                                <button
                                  key={p.ProductID}
                                  type="button"
                                  onClick={() => handleSelectProduct(p)}
                                  className="w-full text-left p-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <strong className="text-slate-900 block">{p.ProductName}</strong>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      গোডাউন: {p.GodownStock || 0} | দোকান: {p.StockQuantity || 0} {p.Unit || 'Pcs'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">বাছাই</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {selectedProduct && (
                          <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs">{selectedProduct.ProductName}</span>
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                প্রেরক স্থানে মজুত: {availableSourceStock} {selectedProduct.Unit || 'Pcs'}
                              </span>
                            </div>

                            {productVariants.length > 0 && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">ভ্যারিয়েন্ট নির্বাচন</label>
                                <select
                                  value={selectedVariantId}
                                  onChange={(e) => setSelectedVariantId(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                >
                                  {productVariants.map((v) => (
                                    <option key={v.VariantID} value={v.VariantID}>
                                      {Object.values(v.Attributes || {}).filter(Boolean).join(' / ') || v.VariantID} (মজুত: {v.StockQuantity || 0})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex items-center space-x-2 pt-1">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">স্থানান্তর পরিমাণ</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={availableSourceStock}
                                  value={transferQty}
                                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value) || 1))}
                                  className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-slate-900"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAddItemToChallan}
                                className="mt-4 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>যোগ করুন</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* চালানের পণ্য তালিকা */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">চালানে অন্তর্ভুক্ত পণ্যসমূহ ({challanItems.length})</span>
                          <span className="text-xs font-mono font-bold text-indigo-700">মোট: {totalChallanQty} একক</span>
                        </div>

                        {challanItems.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                            এখনও কোনো পণ্য চালানে যোগ করা হয়নি। উপরের বক্স থেকে পণ্য যোগ করুন।
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {challanItems.map((itm, i) => (
                              <div key={i} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                                <div>
                                  <strong className="text-slate-900 block">{itm.productName}</strong>
                                  {itm.variantName && <span className="text-[10px] text-slate-400">{itm.variantName}</span>}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    {itm.quantity} {itm.unit}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveChallanItem(i)}
                                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* বাহক তথ্য ও সাবমিট */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
                          বাহক ও গাড়ির তথ্য
                        </span>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">বাহক / ড্রাইভারের নাম</label>
                          <input
                            type="text"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">মোবাইল নম্বর</label>
                          <input
                            type="text"
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            placeholder="017xxxxxxxx"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">গাড়ি / ভ্যান নম্বর</label>
                          <input
                            type="text"
                            value={vehicleNo}
                            onChange={(e) => setVehicleNo(e.target.value)}
                            placeholder="ঢাকা মেট্রো-ন..."
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">মন্তব্য / নোট</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows="2"
                            placeholder="প্রয়োজনীয় নির্দেশনা..."
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isSubmitting || challanItems.length === 0}
                          onClick={() => handleSubmitChallan(true)}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>চালান নিশ্চিত ও প্রিন্ট করুন</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting || challanItems.length === 0}
                          onClick={() => handleSubmitChallan(false)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          শুধুমাত্র সংরক্ষণ করুন
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* ২.২ চালান তালিকা ভিউ */}
                {transferSubTab === 'list' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={listSearch}
                          onChange={(e) => setListSearch(e.target.value)}
                          placeholder="চালান নং বা লোকেশন দিয়ে খুঁজুন..."
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-700"
                      >
                        <option value="ALL">সকল স্ট্যাটাস</option>
                        <option value="IN TRANSIT">ইন ট্রানজিট (পথে আছে)</option>
                        <option value="RECEIVED">রিসিভড (দোকানে গ্রহণ)</option>
                        <option value="CANCELLED">বাতিল</option>
                      </select>
                    </div>

                    {filteredChallans.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        কোনো স্টক স্থানান্তর চালান পাওয়া যায়নি।
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredChallans.map((ch) => {
                          const isInTransit = ch.Status === 'In Transit';
                          const isReceived = ch.Status === 'Received';
                          const isCancelled = ch.Status === 'Cancelled';
                          const items = Array.isArray(ch.Items) ? ch.Items : [];

                          return (
                            <div key={ch.TransferID || ch.ChallanNo} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-black text-sm text-indigo-700">#{ch.ChallanNo}</span>
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    {new Date(ch.TransferDate || ch.CreatedAt).toLocaleString('bn-BD')}
                                  </span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  isInTransit ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                                  isReceived ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {isInTransit ? 'পথে আছে' : isReceived ? 'দোকানে রিসিভড' : 'বাতিল'}
                                </span>
                              </div>

                              <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">প্রেরক ➔ প্রাপক:</span>
                                  <strong className="text-slate-800">{ch.FromLocation} ➔ {ch.ToLocation}</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">মোট আইটেম ও পরিমাণ:</span>
                                  <span className="font-mono font-bold text-slate-900">{items.length} আইটেম ({ch.TotalQuantity} একক)</span>
                                </div>
                                {ch.DriverName && (
                                  <div className="text-[11px] text-slate-500 truncate">
                                    বাহক: {ch.DriverName}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => setPrintableChallan(ch)}
                                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>প্রিন্ট চালান</span>
                                </button>

                                {isInTransit && (
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleReceiveChallan(ch)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>দোকানে রিসিভ করুন</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelChallan(ch)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                      title="চালান বাতিল"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* =============================================================== */}
            {/* ট্যাব ৩: 🏭 গোডাউন স্টক কমার খাতা */}
            {/* =============================================================== */}
            {activeMainTab === 'godown_outflow' && (
              <div className="space-y-4">
                
                {/* পরিচিতি ব্যানার */}
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-950">গোডাউনে কী কী স্টক কমেছে তার খাতা</h3>
                      <p className="text-xs text-amber-800">
                        গোডাউন থেকে দোকানে চালান স্থানান্তর, ড্যামেজ বা অন্য কারণে স্টক কমার পৃথক খতিয়ান
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportGodownOutflowExcelCSV(stockMovements)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>গোডাউন কমার এক্সেল রিপোর্ট</span>
                  </button>
                </div>

                {/* ফিল্টার বার */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={godownSearch}
                      onChange={(e) => setGodownSearch(e.target.value)}
                      placeholder="পণ্য, চালান নং বা কোড দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <select
                      value={godownReasonFilter}
                      onChange={(e) => setGodownReasonFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল কারণ</option>
                      <option value="TRANSFER_OUT">দোকানে স্থানান্তর</option>
                      <option value="DAMAGE">গোডাউন ড্যামেজ</option>
                      <option value="ADJUSTMENT">স্টক সমন্বয়</option>
                    </select>

                    <select
                      value={godownDateFilter}
                      onChange={(e) => setGodownDateFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল সময়</option>
                      <option value="TODAY">আজকের</option>
                      <option value="7DAYS">বিগত ৭ দিন</option>
                      <option value="30DAYS">বিগত ৩০ দিন</option>
                    </select>
                  </div>
                </div>

                {/* খতিয়ান টেবিল */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">তারিখ ও সময়</th>
                          <th className="py-3 px-4">পণ্যের বিবরণ</th>
                          <th className="py-3 px-3">কমার কারণ ও চালান নং</th>
                          <th className="py-3 px-3 text-center text-amber-900 bg-amber-50/60 font-black">কমেছে (পরিমাণ)</th>
                          <th className="py-3 px-3 text-center">পূর্বে গোডাউনে</th>
                          <th className="py-3 px-3 text-center">অবশিষ্ট গোডাউনে</th>
                          <th className="py-3 px-4">অনুমোদনকারী/চালক</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {godownOutflowData.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                              গোডাউন থেকে কমার কোনো রেকর্ড পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          godownOutflowData.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {new Date(m.timestamp).toLocaleString('bn-BD')}
                              </td>
                              <td className="py-3 px-4">
                                <strong className="text-slate-900 block">{m.productName}</strong>
                                {m.barcode && <span className="text-[10px] text-slate-400 font-mono">#{m.barcode}</span>}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-800 block">{m.reasonBangla}</span>
                                {m.referenceNo && (
                                  <span className="text-[10px] font-mono text-indigo-600 font-bold">
                                    রেফারেন্স: {m.referenceNo}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center bg-amber-50/30">
                                <span className="font-mono font-black text-amber-700 text-sm">
                                  -{m.quantity} {m.unit}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500">
                                {m.previousStock !== '-' ? m.previousStock : '-'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                                {m.remainingStock !== '-' ? m.remainingStock : '-'}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <span className="block font-medium">{m.operatorName || 'Admin'}</span>
                                {m.notes && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{m.notes}</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* =============================================================== */}
            {/* ট্যাব ৪: 🏬 দোকান স্টক কমার খাতা */}
            {/* =============================================================== */}
            {activeMainTab === 'shop_outflow' && (
              <div className="space-y-4">
                
                {/* পরিচিতি ব্যানার */}
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-emerald-950">দোকানে আনার পর কী কী স্টক কমেছে তার খাতা</h3>
                      <p className="text-xs text-emerald-800">
                        কাউন্টার পিওএস বিক্রয়, টেইলারিং থান কাপড় ব্যবহার, ছাঁট/ওয়েস্টেজ ও ড্যামেজ কর্তনের পৃথক খতিয়ান
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportShopOutflowExcelCSV(stockMovements)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>দোকান কমার এক্সেল রিপোর্ট</span>
                  </button>
                </div>

                {/* ফিল্টার বার */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={shopSearch}
                      onChange={(e) => setShopSearch(e.target.value)}
                      placeholder="পণ্য, মেমো নং বা অর্ডার নং দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <select
                      value={shopTypeFilter}
                      onChange={(e) => setShopTypeFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল উৎস</option>
                      <option value="SALE">কাউন্টার বিক্রয় (POS)</option>
                      <option value="TAILORING">টেইলারিং কার্যাদেশ</option>
                      <option value="WASTAGE">থান কাপড়ের ছাঁট/অপচয়</option>
                      <option value="DAMAGE">দোকান ড্যামেজ</option>
                    </select>

                    <select
                      value={shopDateFilter}
                      onChange={(e) => setShopDateFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল সময়</option>
                      <option value="TODAY">আজকের</option>
                      <option value="7DAYS">বিগত ৭ দিন</option>
                      <option value="30DAYS">বিগত ৩০ দিন</option>
                    </select>
                  </div>
                </div>

                {/* খতিয়ান টেবিল */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">তারিখ ও সময়</th>
                          <th className="py-3 px-4">পণ্যের বিবরণ</th>
                          <th className="py-3 px-3">কমার উৎস ও রেফারেন্স</th>
                          <th className="py-3 px-3 text-center text-emerald-900 bg-emerald-50/60 font-black">কমেছে (পরিমাণ)</th>
                          <th className="py-3 px-3 text-center">পূর্বে দোকানে</th>
                          <th className="py-3 px-3 text-center">অবশিষ্ট দোকানে</th>
                          <th className="py-3 px-4">ক্যাশিয়ার/সেলসম্যান</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shopOutflowData.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                              দোকান থেকে কমার কোনো রেকর্ড পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          shopOutflowData.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {new Date(m.timestamp).toLocaleString('bn-BD')}
                              </td>
                              <td className="py-3 px-4">
                                <strong className="text-slate-900 block">{m.productName}</strong>
                                {m.barcode && <span className="text-[10px] text-slate-400 font-mono">#{m.barcode}</span>}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-800 block">{m.reasonBangla}</span>
                                {m.referenceNo && (
                                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                                    রেফারেন্স: {m.referenceNo}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center bg-emerald-50/30">
                                <span className="font-mono font-black text-rose-600 text-sm">
                                  -{m.quantity} {m.unit}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500">
                                {m.previousStock !== '-' ? m.previousStock : '-'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                                {m.remainingStock !== '-' ? m.remainingStock : '-'}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <span className="block font-medium">{m.operatorName || 'Cashier'}</span>
                                {m.notes && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{m.notes}</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* দ্রুত স্টক অ্যাডজাস্টমেন্ট পপআপ সাব-মডাল */}
        {/* =================================================================== */}
        {adjustTargetProduct && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">স্টক সমন্বয় ও সংশোধন</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustTargetProduct(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <strong className="text-slate-900 text-sm block">{adjustTargetProduct.ProductName}</strong>
                <div className="flex items-center space-x-3 text-xs text-slate-600">
                  <span>🏬 বর্তমান দোকান স্টক: <strong>{adjustTargetProduct.StockQuantity || 0}</strong></span>
                  <span>🏭 বর্তমান গোডাউন স্টক: <strong>{adjustTargetProduct.GodownStock || 0}</strong></span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">কোন স্থানের স্টক পরিবর্তন করবেন?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setAdjustLocation('Godown'); setAdjustReason('নতুন লট গোডাউনে আগমন'); }}
                      className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                        adjustLocation === 'Godown' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Warehouse className="w-4 h-4" />
                      <span>🏭 গোডাউন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdjustLocation('Shop'); setAdjustReason('দোকান সেলফ গণনা সংশোধন'); }}
                      className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                        adjustLocation === 'Shop' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>🏬 দোকান</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">সমন্বয়ের ধরন</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustAction('ADD')}
                      className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        adjustAction === 'ADD' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      + যোগ করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustAction('DEDUCT')}
                      className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        adjustAction === 'DEDUCT' ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      - হ্রাস করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustAction('SET')}
                      className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        adjustAction === 'SET' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      = নতুন মান
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {adjustAction === 'SET' ? 'নতুন নির্ধারিত স্টক' : 'সমন্বয়ের পরিমাণ'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">পরিবর্তনের কারণ</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    {adjustLocation === 'Godown' ? (
                      <>
                        <option value="নতুন লট গোডাউনে আগমন">নতুন লট গোডাউনে আগমন</option>
                        <option value="গোডাউন গণনা ভুল সংশোধন">গোডাউন গণনা ভুল সংশোধন</option>
                        <option value="গোডাউন ড্যামেজ/ইঁদুর বা পানি নষ্ট">গোডাউন ড্যামেজ/ইঁদুর বা পানি নষ্ট</option>
                        <option value="মহাজনকে ফেরত">মহাজনকে ফেরত</option>
                        <option value="অন্যান্য সমন্বয়">অন্যান্য সমন্বয়</option>
                      </>
                    ) : (
                      <>
                        <option value="দোকান সেলফ গণনা সংশোধন">দোকান সেলফ গণনা সংশোধন</option>
                        <option value="কাউন্টার ডিসপ্লে ড্যামেজ">কাউন্টার ডিসপ্লে ড্যামেজ</option>
                        <option value="নমুনা হিসেবে প্রদান">নমুনা হিসেবে প্রদান</option>
                        <option value="অন্যান্য সমন্বয়">অন্যান্য সমন্বয়</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">মন্তব্য (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="অতিরিক্ত তথ্য..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteStockAdjust}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  সমন্বয় নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTargetProduct(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* ৫. ভ্যারিয়েন্ট লেভেল রিস্টক ও সমন্বয় পপআপ মডাল */}
        {/* =============================================================== */}
        {variantRestockModal && (() => {
          const prod = variantRestockModal.product;
          const targetV = variantRestockModal.variant;
          const isProdThan = Boolean(prod?.TotalThan || prod?.YardsPerThan || /than|থান/i.test(prod?.Unit || ''));
          const prodYardsPerThan = Number(prod?.YardsPerThan) || 0;
          const varLabel = targetV.Color ? `রং: ${targetV.Color}` : targetV.Size ? `সাইজ: ${targetV.Size}` : (targetV.VariantID || `#${variantRestockModal.variantIdx + 1}`);

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* হেডার */}
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                      <PlusCircle className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">ভ্যারিয়েন্ট রিস্টক ও স্টক সমন্বয়</h3>
                      <p className="text-[11px] text-indigo-200">
                        {prod.ProductName} — <span className="font-semibold">{varLabel}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariantRestockModal(null)}
                    className="text-indigo-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ফর্ম কন্টেন্ট */}
                <form onSubmit={handleSaveVariantRestockSubmit} className="p-5 space-y-4">
                  
                  {/* বর্তমান স্টক কার্ড */}
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div className="text-center flex-1 border-r border-indigo-200/60">
                      <span className="text-[10.5px] font-semibold text-slate-500 block">🏭 বর্তমান গোডাউন</span>
                      <span className="text-sm font-black text-indigo-950 font-mono">
                        {targetV.GodownStock || 0} {isProdThan ? 'থান' : (prod.Unit || 'Pcs')}
                      </span>
                      {isProdThan && prodYardsPerThan > 0 && (
                        <span className="text-[9.5px] text-indigo-600 block font-semibold">
                          ({(targetV.GodownStock || 0) * prodYardsPerThan} গজ)
                        </span>
                      )}
                    </div>
                    <div className="text-center flex-1">
                      <span className="text-[10.5px] font-semibold text-slate-500 block">🏬 বর্তমান দোকান</span>
                      <span className="text-sm font-black text-emerald-950 font-mono">
                        {targetV.StockQuantity || 0} {isProdThan ? 'থান' : (prod.Unit || 'Pcs')}
                      </span>
                      {isProdThan && prodYardsPerThan > 0 && (
                        <span className="text-[9.5px] text-emerald-600 block font-semibold">
                          ({(targetV.StockQuantity || 0) * prodYardsPerThan} গজ)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* অবস্থান বাছাই (গোডাউন নাকি দোকান) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">কোন অবস্থানে স্টক পরিবর্তন করবেন?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({
                          ...prev,
                          location: 'Godown',
                          reason: 'নতুন লট গোডাউনে আগমন'
                        }))}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                          variantRestockModal.location === 'Godown'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Warehouse className="w-4 h-4" />
                        <span>🏭 গোডাউন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({
                          ...prev,
                          location: 'Shop',
                          reason: 'দোকান সেলফ বৃদ্ধি / সমন্বয়'
                        }))}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                          variantRestockModal.location === 'Shop'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Store className="w-4 h-4" />
                        <span>🏬 দোকান</span>
                      </button>
                    </div>
                  </div>

                  {/* অ্যাকশন টাইপ (ADD, DEDUCT, SET) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">সমন্বয়ের ধরন</label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({ ...prev, action: 'ADD' }))}
                        className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                          variantRestockModal.action === 'ADD'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ➕ যোগ (রিস্টক)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({ ...prev, action: 'DEDUCT' }))}
                        className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                          variantRestockModal.action === 'DEDUCT'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ➖ বিয়োগ
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({ ...prev, action: 'SET' }))}
                        className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                          variantRestockModal.action === 'SET'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ✏️ সরাসরি সেট
                      </button>
                    </div>
                  </div>

                  {/* পরিমাণ ইনপুট ও লাইভ গজ প্রিভিউ */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      {variantRestockModal.action === 'SET' ? 'নতুন নির্ধারিত স্টক সংখ্যা' : 'সমন্বয়ের পরিমাণ / রিস্টক সংখ্যা'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={variantRestockModal.quantity}
                        onChange={(e) => setVariantRestockModal(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm font-black font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        {isProdThan ? 'থান' : (prod.Unit || 'Pcs')}
                      </span>
                    </div>
                    {isProdThan && prodYardsPerThan > 0 && (
                      <div className="mt-1.5 px-3 py-1.5 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between text-xs text-indigo-900 font-semibold">
                        <span>মোট গজ হিসাব ({prodYardsPerThan} গজ/থান):</span>
                        <span className="font-bold font-mono">
                          {(Number(variantRestockModal.quantity) || 0) * prodYardsPerThan} গজ
                        </span>
                      </div>
                    )}
                  </div>

                  {/* পরিবর্তনের কারণ */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">পরিবর্তনের কারণ</label>
                    <input
                      type="text"
                      value={variantRestockModal.reason}
                      onChange={(e) => setVariantRestockModal(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      placeholder="যেমন: নতুন লট আগমন, গণনা ভুল সংশোধন..."
                    />
                  </div>

                  {/* মন্তব্য (ঐচ্ছিক) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">মন্তব্য (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={variantRestockModal.notes}
                      onChange={(e) => setVariantRestockModal(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      placeholder="চালান নম্বর বা অতিরিক্ত বিবরণ..."
                    />
                  </div>

                  {/* নতুন ভ্যারিয়েন্ট স্টক যোগ করার শর্টকাট */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">অন্য নতুন কোনো ভ্যারিয়েন্টের স্টক বাড়াতে চান?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const prod = variantRestockModal.product;
                        setVariantRestockModal(null);
                        handleOpenNewColor(prod);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ নতুন ভ্যারিয়েন্ট স্টক যোগ করুন</span>
                    </button>
                  </div>

                  {/* অ্যাকশন বাটনসমূহ */}
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingVariantRestock}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                    >
                      {isSubmittingVariantRestock ? (
                        <span>সংরক্ষণ ও সিঙ্ক হচ্ছে...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>সংরক্ষণ ও ডাটাবেস সিঙ্ক</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingVariantRestock}
                      onClick={() => setVariantRestockModal(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      বাতিল
                    </button>
                  </div>

                </form>
              </div>
            </div>
          );
        })()}

        {/* নতুন ভ্যারিয়েন্ট যোগ ও গোডাউন রিস্টক সাব-মডাল */}
        {newColorModal && (() => {
          const prod = newColorModal.product;
          const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
          const prodYardsPerThan = Number(prod.YardsPerThan) || 0;
          const currentType = newColorModal.variantType || 'Color';

          // ডাটাবেস থেকে নির্বাচিত টাইপের ভ্যারিয়েন্ট তালিকা ফিল্টার
          const dbOptionsForType = (variantAttributes || [])
            .filter((va) => {
              const t = String(va.Type || va.type || va.AttributeType || va.attributeType || 'Color').trim().toLowerCase();
              return t === currentType.toLowerCase();
            })
            .map((va) => String(va.Name || va.name || va.OptionName || va.optionName || '').trim())
            .filter(Boolean);

          const fallbackOptions = currentType === 'Color' 
            ? ['লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'গোলাপি', 'মেরুন', 'নেভি ব্লু', 'অফ-হোয়াইট', 'ছাই', 'বেগুনি', 'ফিরোজা', 'জলপাই', 'কমলা', 'ম্যাজেন্টা', 'বাসন্তী', 'লাল খয়েরি']
            : currentType === 'Size'
            ? ['S', 'M', 'L', 'XL', '2XL', '3XL', '38', '40', '42', '44', 'Free']
            : ['500gm', '1kg', '2kg', '5kg', '10kg', '25kg', '50kg'];

          const displayOptions = dbOptionsForType.length > 0 ? dbOptionsForType : fallbackOptions;

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-indigo-200" />
                    <div>
                      <h3 className="text-sm font-bold">নতুন ভ্যারিয়েন্ট যোগ ও গোডাউন রিস্টক</h3>
                      <p className="text-[11px] text-indigo-200">{prod.ProductName} ({prod.Category || 'পণ্য'})</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewColorModal(null)}
                    className="p-1 text-indigo-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSaveNewColorSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
                  {/* ১. ভ্যারিয়েন্টের ধরণ নির্বাচন (Variant Type) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ১. ভ্যারিয়েন্টের ধরণ নির্বাচন করুন <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={currentType}
                        onChange={(e) => setNewColorModal(prev => ({ 
                          ...prev, 
                          variantType: e.target.value,
                          variantName: '',
                          colorName: ''
                        }))}
                        className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Color">🎨 রঙ / কালার (Color)</option>
                        <option value="Size">📏 সাইজ / মাপ (Size)</option>
                        <option value="Weight">⚖️ ওজন / পরিমাপ (Weight)</option>
                      </select>
                    </div>

                    {/* ২. ডাটাবেসের ভ্যারিয়েন্ট ড্রপডাউন লিস্ট */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ২. ডাটাবেসের তালিকা ({dbOptionsForType.length}টি সংরক্ষিত):
                      </label>
                      <select
                        value={newColorModal.variantName || newColorModal.colorName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewColorModal(prev => ({ ...prev, variantName: val, colorName: val }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">
                          -- {currentType === 'Color' ? 'রং নির্বাচন করুন' : currentType === 'Size' ? 'সাইজ নির্বাচন করুন' : 'ওজন নির্বাচন করুন'} --
                        </option>
                        {dbOptionsForType.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ৩. ভ্যারিয়েন্টের নাম ইনপুট */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ৩. {currentType === 'Color' ? 'রঙের' : currentType === 'Size' ? 'সাইজের' : 'ভ্যারিয়েন্টের'} নাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={`যেমন: ${currentType === 'Color' ? 'ফিরোজা, ম্যাজেন্টা, জলপাই...' : currentType === 'Size' ? 'XL, XXL, 42...' : '1kg, 500gm, 25kg...'}`}
                      value={newColorModal.variantName || newColorModal.colorName || ''}
                      onChange={(e) => setNewColorModal(prev => ({ ...prev, variantName: e.target.value, colorName: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  {/* ১-ক্লিক দ্রুত বাছাই চিপস */}
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>১-ক্লিকে দ্রুত বাছাই ({currentType} তালিকা):</span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold">{displayOptions.length}টি অপশন</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                      {displayOptions.map(c => {
                        const isSelected = (newColorModal.variantName || newColorModal.colorName) === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewColorModal(prev => ({ ...prev, variantName: c, colorName: c }))}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            + {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* প্রারম্ভিক স্টক ইনপুট */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                        গোডাউন স্টক ({isThan ? 'থান' : (prod.Unit || 'Pcs')})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.godownStock}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, godownStock: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {isThan && prodYardsPerThan > 0 && (
                        <div className="text-[10px] text-indigo-700 font-bold mt-1">
                          = {(Number(newColorModal.godownStock) || 0) * prodYardsPerThan} গজ
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        দোকান স্টক ({isThan ? 'থান' : (prod.Unit || 'Pcs')})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.shopStock}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, shopStock: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {isThan && prodYardsPerThan > 0 && (
                        <div className="text-[10px] text-emerald-700 font-bold mt-1">
                          = {(Number(newColorModal.shopStock) || 0) * prodYardsPerThan} গজ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* দাম ও বারকোড (ঐচ্ছিক) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">ক্রয়মূল্য</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.costPrice}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, costPrice: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">খুচরা বিক্রয়মূল্য</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.sellingPrice}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, sellingPrice: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">পাইকারি মূল্য</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.wholesalePrice}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, wholesalePrice: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-amber-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">বারকোড (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={newColorModal.barcode}
                      onChange={(e) => setNewColorModal(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="বারকোড খালি রাখলে স্বয়ংক্রিয় তৈরি হবে"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>

                  {/* Footer buttons */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setNewColorModal(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNewColor}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmittingNewColor ? 'সংরক্ষণ হচ্ছে...' : 'নতুন ভ্যারিয়েন্ট সংরক্ষণ করুন'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ভ্যারিয়েন্ট তথ্য ও স্টক এডিট সাব-মডাল */}
        {editVariantModal && (() => {
          const prod = editVariantModal.product;
          const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
          const prodYardsPerThan = Number(prod.YardsPerThan) || 0;
          const currentUnit = isThan ? 'থান' : (prod.Unit || 'পিস');

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* মডাল হেডার */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <Edit3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">ভ্যারিয়েন্ট এডিট ও স্টক আপডেট</h3>
                      <p className="text-[11px] text-amber-100 font-medium truncate max-w-[280px]">
                        {prod.ProductName} — {editVariantModal.colorName || 'ভ্যারিয়েন্ট'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditVariantModal(null)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ফর্ম বডি */}
                <form onSubmit={handleSaveEditVariantSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* রঙের নাম */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ভ্যারিয়েন্টের নাম / রং <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editVariantModal.colorName}
                      onChange={(e) => setEditVariantModal(prev => ({ ...prev, colorName: e.target.value }))}
                      placeholder="যেমন: লাল, নীল, কালো, White ইত্যাদি"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* গোডাউন ও দোকান স্টক ইনপুট */}
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      <span>মজুত সমন্বয় (একক: {currentUnit})</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                          🏭 গোডাউন স্টক ({currentUnit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={editVariantModal.godownStock}
                          onChange={(e) => setEditVariantModal(prev => ({ ...prev, godownStock: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {isThan && prodYardsPerThan > 0 && (
                          <div className="text-[10px] text-indigo-700 font-bold mt-1">
                            = {(Number(editVariantModal.godownStock) || 0) * prodYardsPerThan} গজ
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          🏬 দোকান স্টক ({currentUnit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={editVariantModal.shopStock}
                          onChange={(e) => setEditVariantModal(prev => ({ ...prev, shopStock: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {isThan && prodYardsPerThan > 0 && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-1">
                            = {(Number(editVariantModal.shopStock) || 0) * prodYardsPerThan} গজ
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ক্রয়মূল্য, বিক্রয়মূল্য, পাইকারি মূল্য */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">ক্রয়মূল্য</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editVariantModal.costPrice}
                        onChange={(e) => setEditVariantModal(prev => ({ ...prev, costPrice: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">খুচরা বিক্রয়মূল্য</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editVariantModal.sellingPrice}
                        onChange={(e) => setEditVariantModal(prev => ({ ...prev, sellingPrice: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">পাইকারি মূল্য</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editVariantModal.wholesalePrice}
                        onChange={(e) => setEditVariantModal(prev => ({ ...prev, wholesalePrice: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-amber-800"
                      />
                    </div>
                  </div>

                  {/* বারকোড */}
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">বারকোড</label>
                    <input
                      type="text"
                      value={editVariantModal.barcode}
                      onChange={(e) => setEditVariantModal(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="বারকোড বা খালি রাখলে আগের বারকোড বহাল থাকবে"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>

                  {/* Footer buttons */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditVariantModal(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEditVariant}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmittingEditVariant ? 'সংরক্ষণ হচ্ছে...' : 'ভ্যারিয়েন্ট আপডেট সংরক্ষণ করুন'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* ৪.৪ গোডাউন থেকে দোকানে সরাসরি পণ্য নিয়ে যাওয়ার ডেডিকেটেড ইন-ডেপথ মডাল */}
        {/* ========================================================================= */}
        {directTransferModal && (() => {
          const prod = directTransferModal.product;
          if (!prod) return null;
          const vars = getVariantsOfProduct(prod);
          const hasVars = Array.isArray(vars) && vars.length > 0;
          const isThan = Boolean(prod.TotalThan || prod.YardsPerThan || /than|থান/i.test(prod.Unit || ''));
          const prodYardsPerThan = Number(prod.YardsPerThan) || 0;
          const unitLabel = isThan ? 'থান' : (prod.Unit || 'Pcs');

          const currentTargetVar = hasVars
            ? vars.find((v) => String(v.VariantID || v.variantId) === String(directTransferModal.selectedVariantId)) || vars[0]
            : null;

          const currentAvailableGodown = currentTargetVar
            ? Number(currentTargetVar.GodownStock !== undefined ? currentTargetVar.GodownStock : 0)
            : Number(prod.GodownStock || 0);

          const currentShopStock = currentTargetVar
            ? Number(currentTargetVar.StockQuantity !== undefined ? currentTargetVar.StockQuantity : 0)
            : Number(prod.StockQuantity || 0);

          const transferQty = Math.max(0, Number(directTransferModal.quantity) || 0);

          // বালক মোডে মোট পরিমাণ
          const bulkTotalQty = Object.values(directTransferModal.bulkQuantities || {}).reduce(
            (sum, q) => sum + (Number(q) || 0), 0
          );

          const effectiveTransferQty = directTransferModal.mode === 'all' ? bulkTotalQty : transferQty;
          const effectiveYards = isThan ? (effectiveTransferQty * prodYardsPerThan) : 0;

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-teal-800 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Truck className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold flex items-center space-x-1.5">
                        <span>গোডাউন থেকে দোকানে পণ্য আনুন</span>
                        <span className="text-[10px] bg-teal-500/30 text-teal-200 border border-teal-400/40 px-2 py-0.5 rounded-full font-mono">
                          স্টক স্থানান্তর
                        </span>
                      </h3>
                      <p className="text-[11px] text-indigo-200">
                        {prod.ProductName} {prod.Category ? `• ${prod.Category}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDirectTransferModal(null)}
                    className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleConfirmDirectTransferSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
                  {/* প্রোডাক্ট পরিচিতি ও একক কার্ড */}
                  <div className="p-3 bg-gradient-to-br from-indigo-50/70 to-teal-50/50 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">
                        পণ্য: <strong className="text-indigo-950 font-black">{prod.ProductName}</strong>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        আইডি: {prod.ProductID} {prod.Barcode ? `| বারকোড: #${prod.Barcode}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 text-indigo-800 text-xs font-bold shadow-2xs">
                        একক: {unitLabel}
                      </span>
                      {isThan && prodYardsPerThan > 0 && (
                        <span className="px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs font-bold">
                          {prodYardsPerThan} গজ / থান
                        </span>
                      )}
                    </div>
                  </div>

                  {/* যদি পণ্যে একাধিক ভ্যারিয়েন্ট থাকে */}
                  {hasVars && (
                    <div className="space-y-3">
                      {/* মোড নির্বাচন: একক ভ্যারিয়েন্ট বনাম সকল ভ্যারিয়েন্ট */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <label className="text-xs font-bold text-slate-800">
                          ভ্যারিয়েন্ট স্থানান্তর মোড:
                        </label>
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setDirectTransferModal(prev => ({ ...prev, mode: 'single' }))}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              directTransferModal.mode === 'single'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            একক ভ্যারিয়েন্ট
                          </button>
                          <button
                            type="button"
                            onClick={() => setDirectTransferModal(prev => ({ ...prev, mode: 'all' }))}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              directTransferModal.mode === 'all'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            সকল ভ্যারিয়েন্ট ({vars.length}টি)
                          </button>
                        </div>
                      </div>

                      {/* মোড ১: একক ভ্যারিয়েন্ট নির্বাচন */}
                      {directTransferModal.mode === 'single' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              ১. কোন ভ্যারিয়েন্টটি আনতে চান? <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={directTransferModal.selectedVariantId}
                              onChange={(e) => {
                                const newVId = e.target.value;
                                const match = vars.find(v => String(v.VariantID || v.variantId) === newVId);
                                const avail = match ? Number(match.GodownStock !== undefined ? match.GodownStock : 0) : 0;
                                setDirectTransferModal(prev => ({
                                  ...prev,
                                  selectedVariantId: newVId,
                                  quantity: avail > 0 ? 1 : 0
                                }));
                              }}
                              className="w-full px-3 py-2 bg-indigo-50/40 border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              {vars.map((v) => {
                                const vId = v.VariantID || v.variantId;
                                const attrs = v.Attributes || {};
                                const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
                                const gStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                                const sStk = Number(v.StockQuantity !== undefined ? v.StockQuantity : 0);
                                return (
                                  <option key={vId} value={vId}>
                                    {vName} — (গোডাউনে আছে: {gStk} {unitLabel} | দোকানে: {sStk} {unitLabel})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* স্টক স্ট্যাটাস ও দ্রুত পরিমাণ নির্ধারণ */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-center">
                              <span className="text-[10.5px] font-bold text-indigo-700 block">🏭 গোডাউন বর্তমান স্টক</span>
                              <span className="text-lg font-black font-mono text-indigo-950">
                                {currentAvailableGodown} <span className="text-xs font-bold">{unitLabel}</span>
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center">
                              <span className="text-[10.5px] font-bold text-emerald-700 block">🏬 দোকান বর্তমান স্টক</span>
                              <span className="text-lg font-black font-mono text-emerald-950">
                                {currentShopStock} <span className="text-xs font-bold">{unitLabel}</span>
                              </span>
                            </div>
                          </div>

                          {/* স্থানান্তরের পরিমাণ */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700">
                                ২. দোকানে আনার পরিমাণ ({unitLabel}) <span className="text-rose-500">*</span>
                              </label>
                              <span className="text-[10px] text-slate-500">
                                সর্বোচ্চ গোডাউন থেকে: <strong className="font-mono text-indigo-700">{currentAvailableGodown}</strong>
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="1"
                                max={currentAvailableGodown}
                                value={directTransferModal.quantity}
                                onChange={(e) => setDirectTransferModal(prev => ({ ...prev, quantity: e.target.value }))}
                                className="flex-1 px-3 py-2 text-base font-black font-mono text-indigo-900 bg-white border border-slate-300 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="1"
                              />
                              <div className="flex items-center space-x-1">
                                {[1, 2, 5, 10].map((step) => (
                                  <button
                                    key={step}
                                    type="button"
                                    disabled={step > currentAvailableGodown}
                                    onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: step }))}
                                    className="px-2 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                                  >
                                    +{step}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  disabled={currentAvailableGodown <= 0}
                                  onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: currentAvailableGodown }))}
                                  className="px-2.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                                  title="সম্পূর্ণ গোডাউন স্টক দোকানে আনুন"
                                >
                                  সব
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* স্থানান্তরের পর ফলাফল প্রিভিউ */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-[11px] font-bold text-slate-600">স্থানান্তরের পর অবস্থা:</span>
                            <div className="flex items-center space-x-3 text-[11px]">
                              <span>
                                গোডাউনে থাকবে: <strong className="font-mono text-rose-600 font-bold">{Math.max(0, currentAvailableGodown - transferQty)}</strong>
                              </span>
                              <span>➔</span>
                              <span>
                                দোকানে হবে: <strong className="font-mono text-emerald-600 font-bold">{currentShopStock + transferQty}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* মোড ২: সকল ভ্যারিয়েন্ট একসাথে (বাল্ক) */}
                      {directTransferModal.mode === 'all' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 text-[11px]">
                            <span className="font-bold text-slate-700">প্রতিটি ভ্যারিয়েন্টের পরিমাণ বসান:</span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const fill = {};
                                  vars.forEach(v => {
                                    const g = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                                    fill[v.VariantID || v.variantId] = g > 0 ? 1 : 0;
                                  });
                                  setDirectTransferModal(prev => ({ ...prev, bulkQuantities: fill }));
                                }}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10.5px] font-bold cursor-pointer"
                              >
                                সবগুলোতে ১ দিন
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const fill = {};
                                  vars.forEach(v => {
                                    fill[v.VariantID || v.variantId] = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                                  });
                                  setDirectTransferModal(prev => ({ ...prev, bulkQuantities: fill }));
                                }}
                                className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-[10.5px] font-bold cursor-pointer"
                              >
                                সম্পূর্ণ স্টক
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const fill = {};
                                  vars.forEach(v => { fill[v.VariantID || v.variantId] = 0; });
                                  setDirectTransferModal(prev => ({ ...prev, bulkQuantities: fill }));
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10.5px] font-bold cursor-pointer"
                              >
                                রিসেট
                              </button>
                            </div>
                          </div>

                          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {vars.map((v) => {
                              const vId = v.VariantID || v.variantId;
                              const attrs = v.Attributes || {};
                              const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
                              const gStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                              const sStk = Number(v.StockQuantity !== undefined ? v.StockQuantity : 0);
                              const currentVal = directTransferModal.bulkQuantities[vId] !== undefined ? directTransferModal.bulkQuantities[vId] : 0;

                              return (
                                <div key={vId} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                  <div className="min-w-0 flex-1 pr-2">
                                    <span className="font-bold text-slate-800 text-xs block truncate">{vName}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      গোডাউন: <strong className="text-indigo-700 font-bold">{gStk}</strong> | দোকান: <strong className="text-emerald-700 font-bold">{sStk}</strong>
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    <input
                                      type="number"
                                      min="0"
                                      max={gStk}
                                      value={currentVal}
                                      disabled={gStk <= 0}
                                      onChange={(e) => {
                                        const val = Math.max(0, Math.min(gStk, Number(e.target.value) || 0));
                                        setDirectTransferModal(prev => ({
                                          ...prev,
                                          bulkQuantities: { ...prev.bulkQuantities, [vId]: val }
                                        }));
                                      }}
                                      className="w-16 px-2 py-1 text-xs font-bold text-center font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                                      placeholder="0"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">{unitLabel}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-900">মোট নির্বাচিত পরিমাণ:</span>
                            <span className="font-black font-mono text-indigo-950 text-sm">
                              {bulkTotalQty} {unitLabel} {isThan && prodYardsPerThan > 0 ? `(${effectiveYards} গজ)` : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* পণ্য যদি সাধারণ (কোনো ভ্যারিয়েন্ট ছাড়া) হয় */}
                  {!hasVars && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-center">
                          <span className="text-[10.5px] font-bold text-indigo-700 block">🏭 গোডাউন বর্তমান স্টক</span>
                          <span className="text-lg font-black font-mono text-indigo-950">
                            {currentAvailableGodown} <span className="text-xs font-bold">{unitLabel}</span>
                          </span>
                        </div>
                        <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center">
                          <span className="text-[10.5px] font-bold text-emerald-700 block">🏬 দোকান বর্তমান স্টক</span>
                          <span className="text-lg font-black font-mono text-emerald-950">
                            {currentShopStock} <span className="text-xs font-bold">{unitLabel}</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            দোকানে আনার পরিমাণ ({unitLabel}) <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-500">
                            সর্বোচ্চ: <strong className="font-mono text-indigo-700">{currentAvailableGodown}</strong>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            max={currentAvailableGodown}
                            value={directTransferModal.quantity}
                            onChange={(e) => setDirectTransferModal(prev => ({ ...prev, quantity: e.target.value }))}
                            className="flex-1 px-3 py-2 text-base font-black font-mono text-indigo-900 bg-white border border-slate-300 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="1"
                          />
                          <div className="flex items-center space-x-1">
                            {[1, 2, 5, 10].map((step) => (
                              <button
                                key={step}
                                type="button"
                                disabled={step > currentAvailableGodown}
                                onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: step }))}
                                className="px-2 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                              >
                                +{step}
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={currentAvailableGodown <= 0}
                              onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: currentAvailableGodown }))}
                              className="px-2.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                            >
                              সব
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-600">স্থানান্তরের পর অবস্থা:</span>
                        <div className="flex items-center space-x-3 text-[11px]">
                          <span>
                            গোডাউনে থাকবে: <strong className="font-mono text-rose-600 font-bold">{Math.max(0, currentAvailableGodown - transferQty)}</strong>
                          </span>
                          <span>➔</span>
                          <span>
                            দোকানে হবে: <strong className="font-mono text-emerald-600 font-bold">{currentShopStock + transferQty}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* থান কাপড়ের জন্য গজ সারাংশ */}
                  {isThan && prodYardsPerThan > 0 && effectiveTransferQty > 0 && (
                    <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center space-x-1">
                        <Scissors className="w-3.5 h-3.5 text-amber-600" />
                        <span>স্থানান্তরিত মোট কাপড়:</span>
                      </span>
                      <strong className="font-mono font-bold text-amber-950 text-sm">
                        {effectiveYards} গজ ({effectiveTransferQty} থান × {prodYardsPerThan} গজ/থান)
                      </strong>
                    </div>
                  )}

                  {/* মন্তব্য (ঐচ্ছিক) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      স্থানান্তর সংক্রান্ত নোট বা বিবরণ (ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      value={directTransferModal.notes}
                      onChange={(e) => setDirectTransferModal(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="যেমন: আজকের কাস্টমার চাহিদার জন্য বা সেলফে তোলার জন্য..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  {/* অ্যাকশন বাটনসমূহ */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmittingDirectTransfer || effectiveTransferQty <= 0}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all flex items-center justify-center space-x-2"
                    >
                      {isSubmittingDirectTransfer ? (
                        <span>স্থানান্তর ও ডাটাবেসে সেভ হচ্ছে...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>⚡ সরাসরি দোকানে যোগ করুন ({effectiveTransferQty} {unitLabel})</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={handleSwitchToChallanFromDirectModal}
                        className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>ড্রাইভার চালান তৈরি করুন (ইন-ট্রানজিট)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectTransferModal(null)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
