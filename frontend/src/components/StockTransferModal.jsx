import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Truck,
  ArrowRightLeft,
  Plus,
  Minus,
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
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Tag,
  Loader2,
  SearchX,
  Info,
  HelpCircle
} from 'lucide-react';
import BarcodeStickerModal from './BarcodeStickerModal';
import {
  calculateThanBreakdown,
  calculateInitialShopYards,
  parseGojGira,
  formatFabricQuantity,
  isFabricUnit,
  isThanUnit,
  getSafeRunningCutText
} from '../utils/fabricUtils';
import {
  exportGodownOutflowExcelCSV,
  exportShopOutflowExcelCSV,
  exportLocationStockExcelCSV,
  getGodownOutflowLedger,
  getShopOutflowLedger,
  getProductDisplayUnit
} from '../services/storage';

// রঙের নামের বাংলা/ইংরেজি নাম থেকে হেক্স কালার বের করার হেল্পার
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
    'জলপাই': '#65A30D', 'olive': '#65A30D'
  };
  return map[c] || '#6366F1';
};

export default function StockTransferModal({
  isOpen,
  onClose,
  embedded = false,
  isLoading = false,
  products = [],
  stockTransfers = [],
  stockMovements = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  onSaveStockTransfer,
  onUpdateStockTransferStatus,
  onDeleteStockTransfer,
  onAdjustLocationStock,
  initialTab = 'overview',
  initialTransferSubTab = 'new',
  initialFilter = 'ALL',
  onDeleteProduct,
  onUpdateProductVariants,
  onEditProduct,
  onDirectGodownToShopTransfer,
  variantAttributes = [],
  onAddVariantOption,
  onOpenFabricWastageModal
}) {
  // =========================================================================
  // ১. সকল স্টেট ও রেফারেন্স (All State & Ref Declarations at Component Root)
  // =========================================================================

  // প্রধান ট্যাব নেভিগেশন: 'overview' | 'transfers' | 'godown_outflow' | 'shop_outflow'
  const [activeMainTab, setActiveMainTab] = useState(() => {
    if (initialTab === 'godown_stock' || initialTab === 'shop_stock') return 'overview';
    return initialTab || 'overview';
  });

  // ট্রান্সফার সাব-ট্যাব: 'new' | 'list'
  const [transferSubTab, setTransferSubTab] = useState(() => initialTransferSubTab || 'new');

  // এন্টারপ্রাইজ UX ও ইন্টার‍্যাকশন স্টেটসমূহ (4 UI States, Feedback & Forgiving UX)
  const [toast, setToast] = useState(null); // { id, message, type, title }
  const [inlineError, setInlineError] = useState(null); // { message, onRetry }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmLabel, cancelLabel, isDestructive, onConfirm }

  // চালান তৈরি স্টেটসমূহ
  const [challanNo, setChallanNo] = useState(() => `CHL-${Date.now().toString().slice(-6)}`);
  const [transferDate, setTransferDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [fromLocation, setFromLocation] = useState('Main Warehouse');
  const [toLocation, setToLocation] = useState('Main Shop');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');

  // চালান আইটেম পিকার ও ড্রপডাউন স্টেট
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [challanItems, setChallanItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // প্রিন্ট প্রিভিউ স্টেট
  const [printableChallan, setPrintableChallan] = useState(null);
  const [isPrintableGodownOutflow, setIsPrintableGodownOutflow] = useState(false);
  const [isPrintableShopStockAudit, setIsPrintableShopStockAudit] = useState(false);
  const [printStickerProduct, setPrintStickerProduct] = useState(null);

  // চালান তালিকা ফিল্টার
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // লাইভ স্টক ওভারভিউ ফিল্টার স্টেট
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewFilter, setOverviewFilter] = useState(() => {
    if (initialTab === 'godown_low_stock' || initialFilter === 'LOW_GODOWN') return 'LOW_GODOWN';
    if (initialTab === 'godown_stock') return 'IN_GODOWN';
    if (initialTab === 'shop_stock') return 'IN_SHOP';
    return initialFilter || 'ALL';
  });
  const [overviewCategory, setOverviewCategory] = useState('ALL');
  const [stockViewMode, setStockViewMode] = useState('grouped'); // 'grouped' | 'variants'
  const [expandedProductIds, setExpandedProductIds] = useState({});

  // গোডাউন ও দোকান নির্গমন খাতা ফিল্টার স্টেট
  const [godownSearch, setGodownSearch] = useState('');
  const [godownReasonFilter, setGodownReasonFilter] = useState('ALL');
  const [godownDateFilter, setGodownDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | '7DAYS' | '30DAYS'

  const [shopSearch, setShopSearch] = useState('');
  const [shopTypeFilter, setShopTypeFilter] = useState('ALL');
  const [shopDateFilter, setShopDateFilter] = useState('ALL');

  // স্টক অ্যাডজাস্টমেন্ট সাব-মডাল স্টেট
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

  // রেফারেন্স
  const searchInputRef = useRef(null);

  // =========================================================================
  // ২. ড্রাইভড ভেরিয়েবলসমূহ (Derived Booleans)
  // =========================================================================

  // দোকানে বর্তমান মজুদ ভিউ মোড কিনা
  const isShopStockView = initialTab === 'shop_stock' || initialTab === 'shop_outflow' || (
    initialTab !== 'godown_stock' && initialTab !== 'godown_outflow' && [
      'IN_SHOP',
      'SHOP_ZERO_IN_GODOWN',
      'LOW_SHOP',
      'SHOP_FABRIC',
      'SHOP_SUFFICIENT',
      'SHOP_REMNANT',
      'SHOP_NEED_BOLT'
    ].includes(overviewFilter)
  );

  // গোডাউনে বর্তমান মজুদ ভিউ মোড কিনা
  const isGodownStockView = initialTab === 'godown_stock' || initialTab === 'godown_outflow' || initialTab === 'godown_low_stock' || (
    initialTab !== 'shop_stock' && initialTab !== 'shop_outflow' && [
      'IN_GODOWN',
      'LOW_GODOWN'
    ].includes(overviewFilter)
  );

  // =========================================================================
  // ৩. হেল্পার ফাংশনসমূহ (Helpers)
  // =========================================================================

  const showToast = (message, type = 'success', title = '') => {
    setToast({
      id: Date.now(),
      message,
      type,
      title: title || (type === 'error' ? 'ত্রুটি' : type === 'info' ? 'তথ্য' : 'সফল হয়েছে')
    });
  };

  const handleResetFilters = () => {
    setOverviewSearch('');
    setOverviewCategory('ALL');
    setOverviewFilter(isShopStockView ? 'IN_SHOP' : 'ALL');
  };

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
    const parentCost = Number(p.CostPrice || p.costPrice || p.PurchasePrice || p.purchasePrice || p.Cost || p.cost || p.BuyingPrice || p.BuyPrice || 0);
    const parentSelling = Number(p.SellingPrice || p.sellingPrice || p.Price || p.price || p.MRP || p.mrp || 0);
    const parentMinSelling = Number(
      p.MinSellingPrice !== undefined && p.MinSellingPrice !== null && p.MinSellingPrice !== ''
        ? p.MinSellingPrice
        : (p.minSellingPrice !== undefined && p.minSellingPrice !== null && p.minSellingPrice !== ''
          ? p.minSellingPrice
          : (p.FloorPrice !== undefined && p.FloorPrice !== null && p.FloorPrice !== ''
            ? p.FloorPrice
            : (p.floorPrice || parentSelling)))
    ) || parentSelling;

    return vars.map((v) => {
      const gStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : (v.warehouseStock || 0)));
      const sStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : (v.ShopStock !== undefined ? v.ShopStock : (v.shopStock || 0))));
      let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice || parentCost));
      let vSell = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice || (v.Price || (v.price || parentSelling))));
      let vMinSell = Number(
        v.MinSellingPrice !== undefined && v.MinSellingPrice !== null && v.MinSellingPrice !== ''
          ? v.MinSellingPrice
          : (v.minSellingPrice !== undefined && v.minSellingPrice !== null && v.minSellingPrice !== ''
            ? v.minSellingPrice
            : (v.FloorPrice !== undefined && v.FloorPrice !== null && v.FloorPrice !== ''
              ? v.FloorPrice
              : (v.floorPrice || parentMinSelling)))
      ) || parentMinSelling;

      const vYpt = Number(
        v.YardsPerThan !== undefined && v.YardsPerThan !== null && v.YardsPerThan !== ''
          ? v.YardsPerThan
          : (v.yardsPerThan !== undefined && v.yardsPerThan !== null && v.yardsPerThan !== ''
            ? v.yardsPerThan
            : 0)
      );

      return {
        ...v,
        GodownStock: isNaN(gStock) ? 0 : gStock,
        godownStock: isNaN(gStock) ? 0 : gStock,
        StockQuantity: isNaN(sStock) ? 0 : sStock,
        stockQuantity: isNaN(sStock) ? 0 : sStock,
        CostPrice: isNaN(vCost) ? parentCost : vCost,
        costPrice: isNaN(vCost) ? parentCost : vCost,
        SellingPrice: isNaN(vSell) ? parentSelling : vSell,
        sellingPrice: isNaN(vSell) ? parentSelling : vSell,
        MinSellingPrice: isNaN(vMinSell) ? parentMinSelling : vMinSell,
        minSellingPrice: isNaN(vMinSell) ? parentMinSelling : vMinSell,
        YardsPerThan: vYpt > 0 ? vYpt : (v.YardsPerThan !== undefined ? v.YardsPerThan : (v.yardsPerThan || undefined)),
        yardsPerThan: vYpt > 0 ? vYpt : (v.yardsPerThan !== undefined ? v.yardsPerThan : (v.YardsPerThan || undefined))
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

  // =========================================================================
  // ৪. সাইড ইফেক্ট ও হুকস (useEffect Hooks - Safe after all state initialized)
  // =========================================================================

  // টোস্ট নোটিফিকেশন অটো-ডিসমিস টাইমার
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // কীবোর্ড শর্টকাট লিসেনার (Human Pro POS Ergonomics & Accessibility)
  useEffect(() => {
    if (!isOpen && !embedded) return;

    const handleKeyDown = (e) => {
      // '/' চাপলে সার্চ বক্সে ফোকাস (যদি অন্য কোনো ইনপুটে ফোকাস না থাকে)
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
      // Alt + N -> নতুন চালান তৈরি মোড
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setActiveMainTab('transfers');
        setTransferSubTab('new');
        setPrintableChallan(null);
        setIsPrintableGodownOutflow(false);
      }
      // Alt + A -> অডিট প্রিন্ট শিট
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsPrintableShopStockAudit(true);
      }
      // Alt + E -> এক্সেল রিপোর্ট
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (typeof exportLocationStockExcelCSV === 'function') {
          exportLocationStockExcelCSV(products);
        }
      }
      // Esc কি হ্যান্ডলার (হায়ারার্কিক্যাল ডিসমিস)
      if (e.key === 'Escape') {
        if (confirmDialog) {
          e.preventDefault();
          setConfirmDialog(null);
        } else if (directTransferModal) {
          e.preventDefault();
          setDirectTransferModal(null);
        } else if (editVariantModal) {
          e.preventDefault();
          setEditVariantModal(null);
        } else if (variantRestockModal) {
          e.preventDefault();
          setVariantRestockModal(null);
        } else if (newColorModal) {
          e.preventDefault();
          setNewColorModal(null);
        } else if (isPrintableShopStockAudit) {
          e.preventDefault();
          setIsPrintableShopStockAudit(false);
        } else if (printableChallan) {
          e.preventDefault();
          setPrintableChallan(null);
        } else if (printStickerProduct) {
          e.preventDefault();
          setPrintStickerProduct(null);
        } else if (overviewSearch) {
          e.preventDefault();
          setOverviewSearch('');
        } else if (!embedded && onClose) {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    embedded,
    overviewSearch,
    products,
    confirmDialog,
    directTransferModal,
    editVariantModal,
    variantRestockModal,
    newColorModal,
    isPrintableShopStockAudit,
    printableChallan,
    printStickerProduct,
    onClose
  ]);

  // প্রাথমিক ট্যাব এবং ফিল্টার সিঙ্ক
  useEffect(() => {
    if (initialTab === 'godown_low_stock') {
      setActiveMainTab('overview');
      setOverviewFilter('LOW_GODOWN');
    } else if (initialTab === 'godown_stock') {
      setActiveMainTab('overview');
      setOverviewFilter(initialFilter === 'LOW_GODOWN' ? 'LOW_GODOWN' : 'IN_GODOWN');
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
  // পরিগণিত মেট্রিক্স ও ফিল্টারসমূহ
  // =========================================================================

  // সামগ্রিক স্টক পরিসংখ্যান
  const stockKpis = useMemo(() => {
    let totalGodown = 0;
    let totalShop = 0;
    let needTransferCount = 0;
    let godownLowCount = 0;
    let totalVariants = 0;
    let fabricGodownThans = 0;
    let fabricGodownYards = 0;
    let generalGodownPcs = 0;
    let fabricShopYards = 0;
    let generalShopPcs = 0;
    let fabricGodownValuation = 0;
    let fabricGodownSellingValuation = 0;
    let fabricGodownMinSellingValuation = 0;
    let generalGodownValuation = 0;
    let generalGodownSellingValuation = 0;
    let generalGodownMinSellingValuation = 0;
    let totalGodownValuation = 0;
    let totalGodownSellingValuation = 0;
    let totalGodownMinSellingValuation = 0;
    let totalShopCostValuation = 0;
    let totalShopSellingValuation = 0;
    let shopLowCount = 0;
    let shopZeroInGodownCount = 0;
    let fabricShopThanCount = 0;
    let fabricShopFullThans = 0;
    let fabricShopRunningCutYards = 0;
    let fabricShopRemnantsCount = 0;
    let fabricShopNeedsRestockCount = 0;
    let shopProductCount = 0;

    products.forEach((p) => {
      const unitCost = Number(p.CostPrice || p.costPrice || p.PurchasePrice || p.purchasePrice || p.Cost || p.cost || p.BuyingPrice || p.BuyPrice || 0);
      const sellingPrice = Number(p.SellingPrice || p.sellingPrice || p.Price || p.price || p.MRP || p.mrp || 0);
      const minSellingPrice = Number(
        p.MinSellingPrice !== undefined && p.MinSellingPrice !== null && p.MinSellingPrice !== ''
          ? p.MinSellingPrice
          : (p.minSellingPrice !== undefined && p.minSellingPrice !== null && p.minSellingPrice !== ''
            ? p.minSellingPrice
            : (p.FloorPrice !== undefined && p.FloorPrice !== null && p.FloorPrice !== ''
              ? p.FloorPrice
              : (p.floorPrice || sellingPrice)))
      ) || sellingPrice;
      const gStock = Number(p.GodownStock || 0);
      const sStock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      const unit = getProductDisplayUnit(p);
      const isThan = /than|থান/i.test(unit);
      const isGoj = !isThan && /গজ|yard/i.test(unit);
      const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
      const remTh = Number(
        p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
          ? p.RemnantThreshold
          : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
            ? p.remnantThreshold
            : 1)
      );

      const vars = getVariantsOfProduct(p);
      const hasVars = vars.length > 0;
      if (hasVars) {
        totalVariants += vars.length;
      }

      const varGStockSum = hasVars ? vars.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0), 0) : 0;
      const varSStockSum = hasVars ? vars.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0), 0) : 0;

      const effectiveGStock = hasVars && varGStockSum > 0 ? varGStockSum : gStock;
      const effectiveSStock = hasVars && varSStockSum > 0 ? varSStockSum : sStock;

      totalGodown += effectiveGStock;
      totalShop += effectiveSStock;

      if (effectiveSStock > 0) {
        shopProductCount++;
      }

      if (isThan && yardsPerThan > 0) {
        fabricGodownThans += effectiveGStock;
        fabricGodownYards += (effectiveGStock * yardsPerThan);
        fabricShopYards += effectiveSStock;

        if (hasVars) {
          vars.forEach((v) => {
            const vYpt = Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan;
            const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
            const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
            const vBd = calculateThanBreakdown(vS, vYpt, remTh);
            fabricShopFullThans += vBd.fullThans;
            fabricShopRunningCutYards += vBd.runningCutYards;
            fabricShopThanCount += (vBd.fullThans + (vBd.runningCutYards > 0 ? 1 : 0));
            if (vBd.isRemnant) fabricShopRemnantsCount++;
            if (vBd.needsRestock && vG > 0) fabricShopNeedsRestockCount++;

            let vC = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
            if (vC <= 0 && unitCost > 0) vC = unitCost;
            if (unitCost > 0 && vC > unitCost * 10) vC = unitCost;
            let vSPrice = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : sellingPrice)) || 0;
            if (vSPrice <= 0 && sellingPrice > 0) vSPrice = sellingPrice;
            let vMinSell = Number(
              v.MinSellingPrice !== undefined && v.MinSellingPrice !== null && v.MinSellingPrice !== ''
                ? v.MinSellingPrice
                : (v.minSellingPrice !== undefined && v.minSellingPrice !== null && v.minSellingPrice !== ''
                  ? v.minSellingPrice
                  : (v.FloorPrice !== undefined && v.FloorPrice !== null && v.FloorPrice !== ''
                    ? v.FloorPrice
                    : (v.floorPrice || minSellingPrice)))
            ) || minSellingPrice;
            if (vMinSell <= 0 && minSellingPrice > 0) vMinSell = minSellingPrice;
            if (vMinSell <= 0 && vSPrice > 0) vMinSell = vSPrice;

            fabricGodownValuation += (vG * vYpt * vC);
            fabricGodownSellingValuation += (vG * vYpt * vSPrice);
            fabricGodownMinSellingValuation += (vG * vYpt * vMinSell);
            totalShopCostValuation += (vS * vC);
            totalShopSellingValuation += (vS * vSPrice);
          });
          if (varGStockSum > 0) {
            fabricGodownYards -= (effectiveGStock * yardsPerThan);
            fabricGodownYards += vars.reduce((acc, v) => {
              const vg = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
              const vy = Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan;
              return acc + (vg * vy);
            }, 0);
          }
          // ফলব্যাক: যদি ভ্যারিয়েন্টগুলোতে আলাদা দোকান স্টক ০ থাকে কিন্তু প্যারেন্ট পণ্যে দোকান স্টক বিদ্যমান
          if (varSStockSum === 0 && effectiveSStock > 0) {
            totalShopCostValuation += (effectiveSStock * unitCost);
            totalShopSellingValuation += (effectiveSStock * sellingPrice);
          }
          if (varGStockSum === 0 && effectiveGStock > 0) {
            fabricGodownValuation += (effectiveGStock * yardsPerThan * unitCost);
            fabricGodownSellingValuation += (effectiveGStock * yardsPerThan * sellingPrice);
            fabricGodownMinSellingValuation += (effectiveGStock * yardsPerThan * minSellingPrice);
          }
        } else {
          const bd = calculateThanBreakdown(sStock, yardsPerThan, remTh);
          fabricShopFullThans += bd.fullThans;
          fabricShopRunningCutYards += bd.runningCutYards;
          fabricShopThanCount += (bd.fullThans + (bd.runningCutYards > 0 ? 1 : 0));
          if (bd.isRemnant) fabricShopRemnantsCount++;
          if (bd.needsRestock && gStock > 0) fabricShopNeedsRestockCount++;

          fabricGodownValuation += (effectiveGStock * yardsPerThan * unitCost);
          fabricGodownSellingValuation += (effectiveGStock * yardsPerThan * sellingPrice);
          fabricGodownMinSellingValuation += (effectiveGStock * yardsPerThan * minSellingPrice);
          totalShopCostValuation += (effectiveSStock * unitCost);
          totalShopSellingValuation += (effectiveSStock * sellingPrice);
        }
      } else if (isGoj) {
        fabricGodownYards += effectiveGStock;
        fabricShopYards += effectiveSStock;
        if (effectiveSStock > 0 && effectiveSStock <= remTh) fabricShopRemnantsCount++;
        if (effectiveSStock <= remTh && effectiveGStock > 0) fabricShopNeedsRestockCount++;

        fabricGodownValuation += (effectiveGStock * unitCost);
        fabricGodownSellingValuation += (effectiveGStock * sellingPrice);
        fabricGodownMinSellingValuation += (effectiveGStock * minSellingPrice);
        totalShopCostValuation += (effectiveSStock * unitCost);
        totalShopSellingValuation += (effectiveSStock * sellingPrice);
      } else {
        generalGodownPcs += effectiveGStock;
        generalShopPcs += effectiveSStock;

        if (hasVars) {
          vars.forEach((v) => {
            const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
            const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
            let vC = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
            if (vC <= 0 && unitCost > 0) vC = unitCost;
            if (unitCost > 0 && vC > unitCost * 10) vC = unitCost;
            let vSPrice = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : sellingPrice)) || 0;
            if (vSPrice <= 0 && sellingPrice > 0) vSPrice = sellingPrice;
            let vMinSell = Number(
              v.MinSellingPrice !== undefined && v.MinSellingPrice !== null && v.MinSellingPrice !== ''
                ? v.MinSellingPrice
                : (v.minSellingPrice !== undefined && v.minSellingPrice !== null && v.minSellingPrice !== ''
                  ? v.minSellingPrice
                  : (v.FloorPrice !== undefined && v.FloorPrice !== null && v.FloorPrice !== ''
                    ? v.FloorPrice
                    : (v.floorPrice || minSellingPrice)))
            ) || minSellingPrice;
            if (vMinSell <= 0 && minSellingPrice > 0) vMinSell = minSellingPrice;
            if (vMinSell <= 0 && vSPrice > 0) vMinSell = vSPrice;

            generalGodownValuation += (vG * vC);
            generalGodownSellingValuation += (vG * vSPrice);
            generalGodownMinSellingValuation += (vG * vMinSell);
            totalShopCostValuation += (vS * vC);
            totalShopSellingValuation += (vS * vSPrice);
          });
          // ফলব্যাক: যদি সাধারণ পণ্যে ভ্যারিয়েন্ট থাকে কিন্তু ভ্যারিয়েন্টগুলোর দোকান স্টক ০ এবং মূল পণ্যে দোকান স্টক থাকে
          if (varSStockSum === 0 && effectiveSStock > 0) {
            totalShopCostValuation += (effectiveSStock * unitCost);
            totalShopSellingValuation += (effectiveSStock * sellingPrice);
          }
          if (varGStockSum === 0 && effectiveGStock > 0) {
            generalGodownValuation += (effectiveGStock * unitCost);
            generalGodownSellingValuation += (effectiveGStock * sellingPrice);
            generalGodownMinSellingValuation += (effectiveGStock * minSellingPrice);
          }
        } else {
          generalGodownValuation += (effectiveGStock * unitCost);
          generalGodownSellingValuation += (effectiveGStock * sellingPrice);
          generalGodownMinSellingValuation += (effectiveGStock * minSellingPrice);
          totalShopCostValuation += (effectiveSStock * unitCost);
          totalShopSellingValuation += (effectiveSStock * sellingPrice);
        }
      }

      if (effectiveSStock <= minAlert && effectiveGStock > 0) {
        needTransferCount++;
      }

      const hasLowGodownVar = hasVars && vars.some(v => (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0) <= 2);
      if (effectiveGStock <= minAlert || hasLowGodownVar) {
        godownLowCount++;
      }

      const hasLowShopVar = hasVars && vars.some(v => {
        const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
        return vS <= 2 && vS > 0;
      });
      if ((effectiveSStock <= minAlert && effectiveSStock > 0) || hasLowShopVar) {
        shopLowCount++;
      }

      const hasZeroShopWithGodownVar = hasVars && vars.some(v => {
        const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
        const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
        return vS <= 0 && vG > 0;
      });
      if ((effectiveSStock <= 0 && effectiveGStock > 0) || hasZeroShopWithGodownVar) {
        shopZeroInGodownCount++;
      }
    });

    totalGodownValuation = fabricGodownValuation + generalGodownValuation;
    totalGodownSellingValuation = fabricGodownSellingValuation + generalGodownSellingValuation;
    totalGodownMinSellingValuation = fabricGodownMinSellingValuation + generalGodownMinSellingValuation;
    const totalGodownPotentialProfit = Math.max(0, totalGodownSellingValuation - totalGodownValuation);

    const inTransitChallans = stockTransfers.filter((t) => t.Status === 'In Transit').length;
    const totalShopPotentialProfit = Math.max(0, totalShopSellingValuation - totalShopCostValuation);

    return {
      totalGodown,
      totalShop,
      totalAll: totalGodown + totalShop,
      fabricGodownThans,
      generalGodownPcs,
      fabricGodownYards,
      fabricShopYards,
      generalShopPcs,
      fabricGodownValuation,
      fabricGodownSellingValuation,
      fabricGodownMinSellingValuation,
      generalGodownValuation,
      generalGodownSellingValuation,
      generalGodownMinSellingValuation,
      totalGodownValuation,
      totalGodownSellingValuation,
      totalGodownMinSellingValuation,
      totalGodownPotentialProfit,
      totalShopCostValuation,
      totalShopSellingValuation,
      totalShopPotentialProfit,
      needTransferCount,
      godownLowCount,
      inTransitChallans,
      shopLowCount,
      shopZeroInGodownCount,
      fabricShopThanCount,
      fabricShopFullThans,
      fabricShopRunningCutYards,
      fabricShopRemnantsCount,
      fabricShopNeedsRestockCount,
      shopProductCount,
      totalVariants
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
      const unit = getProductDisplayUnit(p);
      const hasVars = vars.length > 0;
      const varGStockSum = hasVars ? vars.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0), 0) : 0;
      const varSStockSum = hasVars ? vars.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0), 0) : 0;

      const effectiveGStock = hasVars && varGStockSum > 0 ? varGStockSum : gStock;
      const effectiveSStock = hasVars && varSStockSum > 0 ? varSStockSum : sStock;

      let matchFilter = true;
      if (overviewFilter === 'NEED_TRANSFER') {
        const hasVarNeedTransfer = hasVars && vars.some(v => {
          const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          return vS <= minAlert && vG > 0;
        });
        matchFilter = (effectiveSStock <= minAlert && effectiveGStock > 0) || hasVarNeedTransfer;
      } else if (overviewFilter === 'LOW_GODOWN' || overviewFilter === 'GODOWN_ALERT') {
        const hasLowVar = hasVars && vars.some(v => (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0) <= 2);
        matchFilter = effectiveGStock <= minAlert || hasLowVar;
      } else if (overviewFilter === 'IN_GODOWN') {
        matchFilter = effectiveGStock > 0;
      } else if (overviewFilter === 'IN_SHOP') {
        matchFilter = effectiveSStock > 0;
      } else if (overviewFilter === 'SHOP_ZERO_IN_GODOWN') {
        const hasZeroShopWithGodownVar = hasVars && vars.some(v => {
          const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          return vS <= 0 && vG > 0;
        });
        matchFilter = (effectiveSStock <= 0 && effectiveGStock > 0) || hasZeroShopWithGodownVar;
      } else if (overviewFilter === 'LOW_SHOP') {
        const hasLowShopVar = hasVars && vars.some(v => {
          const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          return vS <= 2 && vS > 0;
        });
        matchFilter = (effectiveSStock <= minAlert && effectiveSStock > 0) || hasLowShopVar;
      } else if (overviewFilter === 'SHOP_FABRIC') {
        matchFilter = (/than|থান|গজ|yard/i.test(unit)) && effectiveSStock > 0;
      } else if (overviewFilter === 'SHOP_REMNANT') {
        const isFab = /than|থান|গজ|yard/i.test(unit);
        if (!isFab) return false;
        const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
        const remTh = Number(
          p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
            ? p.RemnantThreshold
            : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
              ? p.remnantThreshold
              : 1)
        );
        if (hasVars) {
          matchFilter = vars.some((v) => {
            const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
            const vYpt = Number(v.YardsPerThan || v.yardsPerThan || 0) || ypt;
            return calculateThanBreakdown(vS, vYpt, remTh).isRemnant;
          });
        } else {
          const bd = calculateThanBreakdown(effectiveSStock, ypt, remTh);
          matchFilter = bd.isRemnant;
        }
      } else if (overviewFilter === 'SHOP_NEED_BOLT') {
        const isFab = /than|থান|গজ|yard/i.test(unit);
        if (!isFab) return false;
        const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
        const remTh = Number(
          p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
            ? p.RemnantThreshold
            : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
              ? p.remnantThreshold
              : 1)
        );
        if (hasVars) {
          matchFilter = vars.some((v) => {
            const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
            const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
            const vYpt = Number(v.YardsPerThan || v.yardsPerThan || 0) || ypt;
            const bd = calculateThanBreakdown(vS, vYpt, remTh);
            return bd.needsRestock && vG > 0;
          });
        } else {
          const bd = calculateThanBreakdown(effectiveSStock, ypt, remTh);
          matchFilter = bd.needsRestock && effectiveGStock > 0;
        }
      } else if (overviewFilter === 'SHOP_SUFFICIENT') {
        matchFilter = effectiveSStock > minAlert;
      } else if (overviewFilter === 'OUT_OF_STOCK') {
        matchFilter = effectiveGStock <= 0 && effectiveSStock <= 0;
      }

      return matchSearch && matchCat && matchFilter;
    });
  }, [products, overviewSearch, overviewCategory, overviewFilter]);

  // সরাসরি ফ্ল্যাট ভ্যারিয়েন্ট তালিকা
  const flattenedVariantList = useMemo(() => {
    const list = [];
    filteredOverviewProducts.forEach((p) => {
      const vars = getVariantsOfProduct(p);
      const unit = getProductDisplayUnit(p);
      const isThan = /than|থান/i.test(unit);
      const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
      const remTh = Number(
        p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
          ? p.RemnantThreshold
          : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
            ? p.remnantThreshold
            : 1)
      );
      const unitCost = Number(p.CostPrice || p.costPrice || p.PurchasePrice || p.purchasePrice || p.Cost || p.cost || p.BuyingPrice || p.BuyPrice || 0);
      const unitSelling = Number(p.SellingPrice || p.sellingPrice || p.Price || p.price || p.MRP || p.mrp || 0);

      if (vars.length > 0) {
        vars.forEach((v, vIdx) => {
          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
          if (vCost <= 0 && unitCost > 0) vCost = unitCost;
          if (unitCost > 0 && vCost > unitCost * 10) vCost = unitCost;
          let vSelling = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : unitSelling)) || 0;
          if (vSelling <= 0 && unitSelling > 0) vSelling = unitSelling;
          const vYpt = isThan ? (Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan) : 0;
          const vBd = isThan ? calculateThanBreakdown(vSStock, vYpt, remTh) : null;
          const vGodownYards = isThan ? (vGStock * vYpt) : 0;
          const vShopYards = isThan ? vSStock : 0;
          const vTotalYards = isThan ? (vGodownYards + vShopYards) : 0;
          const vTotalThans = isThan ? (vGStock + (vBd ? vBd.fullThans : 0)) : (vGStock + vSStock);

          // ফ্ল্যাট ভিউতে নির্দিষ্ট ফিল্টার সক্রিয় থাকলে ভ্যারিয়েন্ট লেভেলে ম্যাচ যাচাই
          let varMatch = true;
          const minAlert = Number(p.MinStockAlert || 5);
          if (overviewFilter === 'IN_SHOP') {
            varMatch = vSStock > 0;
          } else if (overviewFilter === 'IN_GODOWN') {
            varMatch = vGStock > 0;
          } else if (overviewFilter === 'SHOP_ZERO_IN_GODOWN') {
            varMatch = vSStock <= 0 && vGStock > 0;
          } else if (overviewFilter === 'LOW_SHOP') {
            varMatch = vSStock <= minAlert && vSStock > 0;
          } else if (overviewFilter === 'LOW_GODOWN' || overviewFilter === 'GODOWN_ALERT') {
            varMatch = vGStock <= minAlert;
          } else if (overviewFilter === 'SHOP_FABRIC') {
            varMatch = isThan && vSStock > 0;
          } else if (overviewFilter === 'SHOP_REMNANT') {
            varMatch = isThan && Boolean(vBd?.isRemnant);
          } else if (overviewFilter === 'SHOP_NEED_BOLT') {
            varMatch = isThan && Boolean(vBd?.needsRestock && vGStock > 0);
          } else if (overviewFilter === 'SHOP_SUFFICIENT') {
            varMatch = vSStock > minAlert;
          } else if (overviewFilter === 'OUT_OF_STOCK') {
            varMatch = vGStock <= 0 && vSStock <= 0;
          } else if (overviewFilter === 'NEED_TRANSFER') {
            varMatch = vSStock <= minAlert && vGStock > 0;
          }

          if (!varMatch) return;

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
            unit: getProductDisplayUnit(p),
            costPrice: vCost,
            sellingPrice: vSelling,
            isThanUnit: isThan,
            yardsPerThan: vYpt,
            remnantThreshold: remTh,
            thanBreakdown: vBd,
            godownStock: vGStock,
            shopStock: vSStock,
            totalStock: vTotalThans,
            godownYards: vGodownYards,
            shopYards: vShopYards,
            totalYards: vTotalYards,
          });
        });
      } else {
        const gStock = Number(p.GodownStock || 0);
        const sStock = Number(p.StockQuantity || 0);
        const bd = isThan ? calculateThanBreakdown(sStock, yardsPerThan, remTh) : null;
        const gYards = isThan ? (gStock * yardsPerThan) : 0;
        const sYards = isThan ? sStock : 0;
        const tYards = isThan ? (gYards + sYards) : 0;
        const totalThans = isThan ? (gStock + (bd ? bd.fullThans : 0)) : (gStock + sStock);

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
          unit: getProductDisplayUnit(p),
          costPrice: unitCost,
          sellingPrice: unitSelling,
          isThanUnit: isThan,
          yardsPerThan: yardsPerThan,
          remnantThreshold: remTh,
          thanBreakdown: bd,
          godownStock: gStock,
          shopStock: sStock,
          totalStock: totalThans,
          godownYards: gYards,
          shopYards: sYards,
          totalYards: tYards,
        });
      }
    });
    return list;
  }, [filteredOverviewProducts, overviewFilter]);

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

  // গোডাউনে মজুত থাকা ভ্যারিয়েন্ট ও পণ্যসমূহের ড্রপডাউন তালিকা (ডাটাবেস ভিত্তিক)
  const godownAvailableItems = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      const vars = getVariantsOfProduct(p);
      const unit = getProductDisplayUnit(p);
      const isThan = /than|থান/i.test(unit);
      const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;

      if (vars.length > 0) {
        vars.forEach((v, vIdx) => {
          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          const vColor = v.Attributes?.Color || v.Color || '';
          const vSize = v.Attributes?.Size || v.Size || '';
          const otherAttrs = v.Attributes
            ? Object.entries(v.Attributes)
                .filter(([k]) => k !== 'Color' && k !== 'Size')
                .map(([k, val]) => `${k}: ${val}`)
                .join(', ')
            : '';
          const vLabelParts = [vColor && `রং: ${vColor}`, vSize && `সাইজ: ${vSize}`, otherAttrs].filter(Boolean);
          const vName = vLabelParts.length > 0 ? vLabelParts.join(' / ') : `ভ্যারিয়েন্ট #${vIdx + 1}`;

          const vYpt = isThan ? (Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan) : 0;
          list.push({
            key: `${p.ProductID}:::${v.VariantID || vIdx}`,
            productId: p.ProductID,
            productName: p.ProductName,
            variantId: v.VariantID || v.variantId || String(vIdx),
            variantName: vName,
            color: vColor,
            size: vSize,
            otherAttrs,
            godownStock: vGStock,
            shopStock: vSStock,
            unit: unit,
            isThan,
            yardsPerThan: vYpt,
            costPrice: Number(v.CostPrice || p.CostPrice || 0),
            barcode: v.Barcode || p.Barcode || '',
            parentProduct: p,
            variant: v
          });
        });
      } else {
        const gStock = Number(p.GodownStock || 0);
        const sStock = Number(p.StockQuantity || 0);
        list.push({
          key: `${p.ProductID}:::SIMPLE`,
          productId: p.ProductID,
          productName: p.ProductName,
          variantId: null,
          variantName: '',
          color: '',
          size: '',
          otherAttrs: '',
          godownStock: gStock,
          shopStock: sStock,
          unit: unit,
          isThan,
          yardsPerThan,
          costPrice: Number(p.CostPrice || 0),
          barcode: p.Barcode || '',
          parentProduct: p,
          variant: null
        });
      }
    });

    // সাজানো: গোডাউন স্টক বেশি থাকা আইটেমগুলো উপরে ও বর্ণানুক্রমিক
    return list.sort((a, b) => {
      if (a.godownStock > 0 && b.godownStock <= 0) return -1;
      if (a.godownStock <= 0 && b.godownStock > 0) return 1;
      return a.productName.localeCompare(b.productName);
    });
  }, [products]);

  // ফিল্টার করা ড্রপডাউন আইটেম (সার্চ ফিল্টারের জন্য)
  const filteredDropdownItems = useMemo(() => {
    if (!dropdownSearch.trim()) return godownAvailableItems;
    const q = dropdownSearch.trim().toLowerCase();
    return godownAvailableItems.filter((item) => {
      return (
        String(item.productName || '').toLowerCase().includes(q) ||
        String(item.variantName || '').toLowerCase().includes(q) ||
        String(item.color || '').toLowerCase().includes(q) ||
        String(item.size || '').toLowerCase().includes(q) ||
        String(item.barcode || '').toLowerCase().includes(q) ||
        String(item.productId || '').toLowerCase().includes(q)
      );
    });
  }, [godownAvailableItems, dropdownSearch]);

  // বর্তমানে নির্বাচিত ড্রপডাউন আইটেম
  const selectedGodownItem = useMemo(() => {
    if (!selectedItemKey) return null;
    return godownAvailableItems.find((it) => it.key === selectedItemKey) || null;
  }, [godownAvailableItems, selectedItemKey]);

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
    if (selectedGodownItem) {
      const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(fromLocation);
      return isFromWarehouse ? Number(selectedGodownItem.godownStock || 0) : Number(selectedGodownItem.shopStock || 0);
    }
    if (!selectedProduct) return 0;
    const isFromWarehouse = /warehouse|godown|গোডাউন/i.test(fromLocation);
    if (selectedVariantId && productVariants.length > 0) {
      const v = productVariants.find((vr) => String(vr.VariantID || vr.variantId) === String(selectedVariantId));
      if (v) {
        return isFromWarehouse
          ? Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0))
          : Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0));
      }
    }
    return isFromWarehouse ? Number(selectedProduct.GodownStock || 0) : Number(selectedProduct.StockQuantity || 0);
  }, [selectedGodownItem, selectedProduct, selectedVariantId, productVariants, fromLocation]);

  // চালানের মোট পরিমাণ
  const totalChallanQty = challanItems.reduce((sum, itm) => sum + itm.quantity, 0);

  // চালান তালিকা ফিল্টার ও তারিখ অনুযায়ী সাজানো (Newest Date first)
  const filteredChallans = useMemo(() => {
    const list = stockTransfers.filter((t) => {
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

    return list.sort((a, b) => {
      const timeA = new Date(a.TransferDate || a.CreatedAt || 0).getTime();
      const timeB = new Date(b.TransferDate || b.CreatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [stockTransfers, listSearch, statusFilter]);

  // গোডাউন স্টক কমার খাতা (ভ্যারিয়েন্ট অনুযায়ী সমৃদ্ধ ফিল্টার)
  const godownOutflowData = useMemo(() => {
    const list = getGodownOutflowLedger(stockMovements, products);
    const now = new Date();

    return list.filter((m) => {
      const q = godownSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(m.productName || '').toLowerCase().includes(q) ||
        String(m.variantName || '').toLowerCase().includes(q) ||
        String(m.color || '').toLowerCase().includes(q) ||
        String(m.size || '').toLowerCase().includes(q) ||
        String(m.category || '').toLowerCase().includes(q) ||
        String(m.barcode || '').toLowerCase().includes(q) ||
        String(m.referenceNo || '').toLowerCase().includes(q) ||
        String(m.reasonBangla || '').toLowerCase().includes(q) ||
        String(m.notes || '').toLowerCase().includes(q);

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
  }, [stockMovements, products, godownSearch, godownReasonFilter, godownDateFilter]);

  // গোডাউন স্টক কমার সারসংক্ষেপ হিসাব (KPIs)
  const godownOutflowSummary = useMemo(() => {
    let totalQty = 0;
    let transferQty = 0;
    let damageQty = 0;
    let adjustQty = 0;

    godownOutflowData.forEach((m) => {
      const q = Number(m.quantity) || 0;
      totalQty += q;
      if (m.type === 'TRANSFER_OUT') {
        transferQty += q;
      } else if (m.type === 'DAMAGE') {
        damageQty += q;
      } else {
        adjustQty += q;
      }
    });

    return {
      count: godownOutflowData.length,
      totalQty: Math.round(totalQty * 100) / 100,
      transferQty: Math.round(transferQty * 100) / 100,
      damageQty: Math.round(damageQty * 100) / 100,
      adjustQty: Math.round(adjustQty * 100) / 100
    };
  }, [godownOutflowData]);

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
        showToast('অনুগ্রহ করে সঠিক পরিমাণ (কমপক্ষে ১) উল্লেখ করুন!', 'error');
        return;
      }
      if (qty > gStk) {
        showToast(`গোডাউনে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${gStk} ${getProductDisplayUnit(product)} আছে।`, 'error');
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
        showToast('অনুগ্রহ করে একটি ভ্যারিয়েন্ট নির্বাচন করুন!', 'error');
        return;
      }
      const qty = Number(quantity) || 0;
      const vGStk = Number(targetVar.GodownStock !== undefined ? targetVar.GodownStock : 0);
      if (qty <= 0) {
        showToast('অনুগ্রহ করে সঠিক পরিমাণ (কমপক্ষে ১) উল্লেখ করুন!', 'error');
        return;
      }
      if (qty > vGStk) {
        showToast(`এই ভ্যারিয়েন্টের গোডাউনে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${vGStk} ${getProductDisplayUnit(product)} আছে।`, 'error');
        return;
      }
      const attrs = targetVar.Attributes || {};
      const vName = Object.values(attrs).filter(Boolean).join(' / ') || targetVar.Color || targetVar.Size || targetVar.VariantID;
      const vYpt = Number(targetVar.YardsPerThan || targetVar.yardsPerThan || product.YardsPerThan || product.yardsPerThan || 25);
      itemsToTransfer.push({
        variantId: targetVar.VariantID || targetVar.variantId,
        variantName: vName,
        quantity: qty,
        yardsPerThan: vYpt
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
            showToast(`ভ্যারিয়েন্ট '${vName}'-এর গোডাউন স্টক (${vGStk}) অতিক্রম করেছে!`, 'error');
            return;
          }
          const attrs = v.Attributes || {};
          const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
          const vYpt = Number(v.YardsPerThan || v.yardsPerThan || product.YardsPerThan || product.yardsPerThan || 25);
          itemsToTransfer.push({
            variantId: vId,
            variantName: vName,
            quantity: qty,
            yardsPerThan: vYpt
          });
        }
      }

      if (itemsToTransfer.length === 0) {
        showToast('কমপক্ষে একটি ভ্যারিয়েন্টে স্থানান্তরের পরিমাণ বসান!', 'error');
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
            unit: getProductDisplayUnit(product),
            costPrice: Number(product.CostPrice) || 0
          })),
          status: 'Received',
          createdBy: activeUser?.FullName || 'Admin'
        };
        await onSaveStockTransfer(payload);
      }

      showToast('গোডাউন থেকে দোকানে পণ্য সফলভাবে স্থানান্তর সম্পন্ন হয়েছে!', 'success');
      setDirectTransferModal(null);
    } catch (err) {
      showToast(`স্থানান্তর ব্যর্থ হয়েছে: ${err.message}`, 'error');
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

  // ড্রপডাউন থেকে গোডাউনে থাকা নির্দিষ্ট ভ্যারিয়েন্ট বা পণ্য সিলেক্ট করা
  const handleSelectItemFromDropdown = (key) => {
    setSelectedItemKey(key);
    if (!key) {
      setSelectedProduct(null);
      setSelectedVariantId('');
      setTransferQty(1);
      return;
    }
    const chosen = godownAvailableItems.find((it) => it.key === key);
    if (chosen) {
      setSelectedProduct(chosen.parentProduct);
      setSelectedVariantId(chosen.variantId || '');
      setTransferQty(1);
    }
  };

  // পণ্য সিলেক্ট করা (সার্চ ড্রপডাউন থেকে)
  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setProductSearch('');
    const vars = p.Variants || p.variants || [];
    if (Array.isArray(vars) && vars.length > 0) {
      // গোডাউন স্টক থাকা প্রথম ভ্যারিয়েন্ট আগে সিলেক্ট করা
      const firstWithStock = vars.find(v => Number(v.GodownStock || v.godownStock || 0) > 0);
      const chosenVar = firstWithStock || vars[0];
      const vId = chosenVar.VariantID || chosenVar.variantId || '';
      setSelectedVariantId(vId);
      setSelectedItemKey(`${p.ProductID}:::${vId}`);
    } else {
      setSelectedVariantId('');
      setSelectedItemKey(`${p.ProductID}:::SIMPLE`);
    }
    setTransferQty(1);
  };

  // চালানে আইটেম যোগ
  const handleAddItemToChallan = () => {
    const targetItem = selectedGodownItem;
    const targetProduct = selectedProduct || (targetItem ? targetItem.parentProduct : null);

    if (!targetProduct && !targetItem) {
      showToast('অনুগ্রহ করে গোডাউনে থাকা একটি পণ্য বা ভ্যারিয়েন্ট ড্রপডাউন থেকে নির্বাচন করুন।', 'error');
      return;
    }

    const qty = Number(transferQty) || 0;
    if (qty <= 0) {
      showToast('সঠিক স্থানান্তর পরিমাণ উল্লেখ করুন।', 'error');
      return;
    }

    if (qty > availableSourceStock) {
      showToast(`প্রেরক স্থানে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${availableSourceStock} ${targetItem?.unit || getProductDisplayUnit(targetProduct)} মজুত আছে।`, 'error');
      return;
    }

    const pid = targetProduct?.ProductID || targetItem?.productId;
    const pName = targetProduct?.ProductName || targetItem?.productName;
    const unit = targetItem?.unit || getProductDisplayUnit(targetProduct);
    const variantId = targetItem?.variantId || selectedVariantId || null;
    let variantName = targetItem?.variantName || '';
    let costPrice = targetItem?.costPrice || Number(targetProduct?.CostPrice || 0);

    if (!variantName && variantId && productVariants.length > 0) {
      const v = productVariants.find((vr) => String(vr.VariantID || vr.variantId) === String(variantId));
      if (v) {
        const attrs = v.Attributes || v.attributes || {};
        variantName = Object.values(attrs).filter(Boolean).join(' / ') || v.VariantID;
        if (v.CostPrice) costPrice = Number(v.CostPrice);
      }
    }

    // ডুপ্লিকেট আইটেম চেক
    const existingIdx = challanItems.findIndex(
      (item) => item.productId === pid && String(item.variantId || '') === String(variantId || '')
    );

    if (existingIdx !== -1) {
      const updated = [...challanItems];
      if (updated[existingIdx].quantity + qty > availableSourceStock) {
        showToast(`মোট যোগ করা পরিমাণ (${updated[existingIdx].quantity + qty}) গোডাউনের মজুত (${availableSourceStock}) অতিক্রম করেছে!`, 'error');
        return;
      }
      updated[existingIdx].quantity += qty;
      setChallanItems(updated);
    } else {
      setChallanItems((prev) => [
        ...prev,
        {
          productId: pid,
          productName: pName,
          variantId: variantId,
          variantName: variantName,
          quantity: qty,
          unit: unit,
          costPrice: costPrice,
          isThan: targetItem?.isThan || false,
          yardsPerThan: targetItem?.yardsPerThan || 0
        }
      ]);
    }

    setSelectedItemKey('');
    setSelectedProduct(null);
    setSelectedVariantId('');
    setTransferQty(1);
  };

  const handleRemoveChallanItem = (index) => {
    setChallanItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetChallan = () => {
    setChallanNo(`CHL-${Date.now().toString().slice(-6)}`);
    setTransferDate(new Date().toISOString().split('T')[0]);
    setSelectedItemKey('');
    setDropdownSearch('');
    setProductSearch('');
    setSelectedProduct(null);
    setSelectedVariantId('');
    setChallanItems([]);
    setDriverName('');
    setDriverPhone('');
    setVehicleNo('');
    setNotes('');
    setPrintableChallan(null);
  };

  // চালান সাবমিট হ্যান্ডলার
  const handleSubmitChallan = async (shouldPrint = true) => {
    if (challanItems.length === 0) {
      showToast('চালানে অন্তত ১টি পণ্য যোগ করুন।', 'error');
      return;
    }
    if (fromLocation === toLocation) {
      showToast('উৎস এবং গন্তব্য একই হতে পারে না। অনুগ্রহ করে ভিন্ন লোকেশন নির্বাচন করুন।', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const transferPayload = {
        challanNo: challanNo.trim() || `CHL-${Date.now().toString().slice(-6)}`,
        transferDate: transferDate || new Date().toISOString().split('T')[0],
        fromLocation,
        toLocation,
        driverName: `${driverName.trim()} ${driverPhone.trim() ? `(${driverPhone.trim()})` : ''} ${vehicleNo.trim() ? `[${vehicleNo.trim()}]` : ''}`.trim(),
        notes: notes.trim(),
        items: challanItems,
        status: 'In Transit', // ডিফল্ট স্ট্যাটাস পথে আছে (কখনও অটো রিসিভ হবে না)
        createdBy: activeUser?.FullName || activeUser?.UserName || 'Admin'
      };

      const result = await onSaveStockTransfer(transferPayload);

      if (result && result.record) {
        if (shouldPrint) {
          setPrintableChallan(result.record);
        } else {
          showToast(`স্টক ট্রান্সফার চালান #${result.record.ChallanNo} সফলভাবে তৈরি হয়েছে!`, 'success');
          handleResetChallan();
          setTransferSubTab('list');
        }
      }
    } catch (e) {
      showToast(`চালান তৈরি ব্যর্থ: ${e.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // চালান রিসিভ ও স্টকে যোগ হ্যান্ডলার (Forgiving UX Confirm Dialog)
  const handleReceiveChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    const confirmMsg = `আপনি কি নিশ্চিত যে চালান #${cNo}-এর সকল পণ্য (${challan.TotalQuantity || challan.totalQuantity} পিস/গজ) বুঝে পেয়েছেন?\n\nএটি স্বয়ংক্রিয়ভাবে আপনার দোকানের স্টকে পণ্য যোগ করবে এবং রিসিভিং খতিয়ানে রেকর্ড করবে।`;
    setConfirmDialog({
      title: 'চালান রিসিভ ও স্টকে যোগ',
      message: confirmMsg,
      confirmLabel: 'হ্যাঁ, পণ্য বুঝে পেয়েছি',
      cancelLabel: 'না, পরে করব',
      isDestructive: false,
      onConfirm: async () => {
        try {
          await onUpdateStockTransferStatus({
            transferId: challan.TransferID || challan.transferId || cNo,
            status: 'Received',
            receivedBy: activeUser?.FullName || activeUser?.UserName || 'Manager'
          });
          showToast(`চালান #${cNo} সফলভাবে গ্রহণ করা হয়েছে এবং দোকানের স্টকে যোগ হয়েছে!`, 'success');
        } catch (e) {
          showToast(`চালান রিসিভ করতে সমস্যা হয়েছে: ${e.message}`, 'error');
        }
      }
    });
  };

  // চালান বাতিল হ্যান্ডলার
  const handleCancelChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    setConfirmDialog({
      title: 'চালান বাতিল নিশ্চিতকরণ',
      message: `আপনি কি চালান #${cNo} বাতিল করতে চান?\n\nবাতিল করলে পণ্য পুনরায় গোডাউনের স্টকে ফেরত যাবে।`,
      confirmLabel: 'হ্যাঁ, চালান বাতিল করুন',
      cancelLabel: 'না, ফিরে যান',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await onUpdateStockTransferStatus({
            transferId: challan.TransferID || challan.transferId || cNo,
            status: 'Cancelled',
            receivedBy: activeUser?.FullName || activeUser?.UserName || 'Manager'
          });
          showToast(`চালান #${cNo} বাতিল করা হয়েছে এবং গোডাউনে স্টক ফেরত দেওয়া হয়েছে।`, 'info');
        } catch (e) {
          showToast(`চালান বাতিল করতে সমস্যা হয়েছে: ${e.message}`, 'error');
        }
      }
    });
  };

  // চালান মুছে ফেলা হ্যান্ডলার (ডাটাবেস ও লোকাল স্টোরেজ থেকে রিমুভ)
  const handleDeleteChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    const trfId = challan.TransferID || challan.transferId || cNo;
    const isTransit = challan.Status === 'In Transit' || challan.Status === 'Pending';
    const confirmMsg = `আপনি কি নিশ্চিত যে চালান #${cNo} মুছে ফেলতে চান?\n\nএটি ডাটাবেস থেকেও মুছে ফেলা হবে।${isTransit ? '\n(যেহেতু চালানটি এখনও দোকানে রিসিভ করা হয়নি, তাই পণ্যের স্টক গোডাউনে স্বয়ংক্রিয়ভাবে ফেরত যুক্ত হবে)' : ''}`;

    setConfirmDialog({
      title: 'চালান স্থায়ীভাবে মুছে ফেলা',
      message: confirmMsg,
      confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
      cancelLabel: 'না, ফিরে যান',
      isDestructive: true,
      onConfirm: async () => {
        try {
          if (onDeleteStockTransfer) {
            await onDeleteStockTransfer({ transferId: trfId, challanNo: cNo });
            showToast(`চালান #${cNo} সফলভাবে মুছে ফেলা হয়েছে।`, 'info');
          }
        } catch (e) {
          showToast(`চালান মুছতে সমস্যা হয়েছে: ${e.message}`, 'error');
        }
      }
    });
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
    const prodUnit = getProductDisplayUnit(product);
    const isThan = /than|থান/i.test(prodUnit);
    const prodYardsPerThan = isThan ? (Number(product.YardsPerThan || product.yardsPerThan || 0) || 25) : 0;
    const currentShopStock = Number(variant.StockQuantity !== undefined ? variant.StockQuantity : variant.stockQuantity) || 0;

    let initGoj = 0;
    let initGira = 0;
    if (isThan && prodYardsPerThan > 0 && currentShopStock > 0 && defaultLocation === 'Shop') {
      const parsed = parseGojGira(currentShopStock);
      initGoj = parsed.goj || 0;
      initGira = parsed.gira || 0;
    }

    setVariantRestockModal({
      product,
      variant,
      variantIdx,
      location: defaultLocation, // 'Godown' | 'Shop'
      action: 'ADD', // 'ADD' | 'DEDUCT' | 'SET'
      quantity: 1,
      fabricGoj: initGoj,
      fabricGira: initGira,
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
      showToast(`ভ্যারিয়েন্ট '${varLabel}'-এর মজুত সফলভাবে সমন্বয় করা হয়েছে।`, 'success');
      setVariantRestockModal(null);
    } catch (err) {
      showToast(`স্টক সংরক্ষণ করতে সমস্যা হয়েছে: ${err.message}`, 'error');
    } finally {
      setIsSubmittingVariantRestock(false);
    }
  };

  // নির্দিষ্ট ভ্যারিয়েন্ট স্থায়ীভাবে অপসারণ (Remove Variant - Forgiving UX)
  const handleRemoveVariant = async (product, variant, variantIdx) => {
    if (!onUpdateProductVariants) return;
    const varLabel = variant.Color ? `রং: ${variant.Color}` : variant.Size ? `সাইজ: ${variant.Size}` : (variant.VariantID || `#${variantIdx + 1}`);
    const confirmMsg = `আপনি কি নিশ্চিত যে '${product.ProductName}' পণ্যের ভ্যারিয়েন্ট (${varLabel}) স্থায়ীভাবে মুছে ফেলতে চান?\n\nএটি মুছে ফেললে মোট স্টক স্বয়ংক্রিয়ভাবে পুনর্গণনা হয়ে ডাটাবেসে সেভ হবে।`;
    
    setConfirmDialog({
      title: 'ভ্যারিয়েন্ট অপসারণ নিশ্চিতকরণ',
      message: confirmMsg,
      confirmLabel: 'হ্যাঁ, ভ্যারিয়েন্ট মুছে ফেলুন',
      cancelLabel: 'না, ফিরে যান',
      isDestructive: true,
      onConfirm: async () => {
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
          showToast(`ভ্যারিয়েন্ট (${varLabel}) সফলভাবে মুছে ফেলা হয়েছে।`, 'info');
        } catch (err) {
          showToast(`ভ্যারিয়েন্ট মুছে ফেলতে সমস্যা হয়েছে: ${err.message}`, 'error');
        }
      }
    });
  };

  // মূল গোডাউন ও দোকান স্টক ভ্যারিয়েন্টে সমান বণ্টন
  const handleDistributeParentStockToVariants = async (product) => {
    if (!onUpdateProductVariants) return;
    const currentVariants = getVariantsOfProduct(product);
    if (currentVariants.length === 0) return;

    const parentGodown = Number(product.GodownStock || 0);
    const parentShop = Number(product.StockQuantity || 0);

    const confirmMsg = `পণ্য '${product.ProductName}' এর মূল গোডাউন স্টক (${parentGodown}) এবং দোকান স্টক (${parentShop}) মোট ${currentVariants.length}টি ভ্যারিয়েন্টে সমানভাবে বণ্টন করতে চান?\n\nগোডাউন প্রতি ভ্যারিয়েন্টে: ${(parentGodown / currentVariants.length).toFixed(1)}\nদোকান প্রতি ভ্যারিয়েন্টে: ${(parentShop / currentVariants.length).toFixed(1)}\n\nএটি ডাটাবেস এবং ফ্রন্টএন্ডে অবিলম্বে সেভ হবে।`;
    setConfirmDialog({
      title: 'স্টক সমান বণ্টন নিশ্চিতকরণ',
      message: confirmMsg,
      confirmLabel: 'হ্যাঁ, বণ্টন করুন',
      cancelLabel: 'না, ফিরে যান',
      isDestructive: false,
      onConfirm: async () => {
        // Execute distribution
        const count = currentVariants.length;
        const unit = getProductDisplayUnit(product);
        const isThan = /than|থান/i.test(unit);
        const baseG = Math.floor(parentGodown / count);
        const remG = parentGodown % count;
        const baseS = Math.floor(parentShop / count);
        const remS = parentShop % count;

        const updatedVariants = currentVariants.map((v, idx) => ({
          ...v,
          GodownStock: baseG + (idx < remG ? 1 : 0),
          godownStock: baseG + (idx < remG ? 1 : 0),
          StockQuantity: baseS + (idx < remS ? 1 : 0),
          stockQuantity: baseS + (idx < remS ? 1 : 0),
          TotalStock: (baseG + (idx < remG ? 1 : 0)) + (baseS + (idx < remS ? 1 : 0)),
          totalStock: (baseG + (idx < remG ? 1 : 0)) + (baseS + (idx < remS ? 1 : 0))
        }));

        try {
          await onUpdateProductVariants(product.ProductID, updatedVariants, {
            location: 'Godown',
            type: 'ADJUSTMENT',
            variantName: 'সকল ভ্যারিয়েন্ট',
            qty: parentGodown,
            prevStock: 0,
            newStock: parentGodown,
            reason: 'মূল স্টক সমান বণ্টন',
            notes: 'সকল ভ্যারিয়েন্টে মূল স্টক সমান বণ্টন'
          });
          showToast('ভ্যারিয়েন্টগুলোতে স্টক সফলভাবে বণ্টন করা হয়েছে।', 'success');
        } catch (err) {
          showToast(`স্টক বণ্টনে সমস্যা হয়েছে: ${err.message}`, 'error');
        }
      }
    });

    const count = currentVariants.length;
    const unit = getProductDisplayUnit(product);
    const isThan = /than|থান/i.test(unit);

    const baseG = Math.floor(parentGodown / count);
    const remG = parentGodown % count;

    let updatedVariants;
    if (isThan) {
      // কাপড়ের ক্ষেত্রে গিরা ভিত্তিক নিখুঁত বণ্টন (১ গজ = ১৬ গিরা) যাতে দশমিক গজ হারিয়ে না যায়
      const totalGiras = Math.round(parentShop * 16);
      const baseGira = Math.floor(totalGiras / count);
      const remGira = totalGiras % count;

      updatedVariants = currentVariants.map((v, i) => {
        const g = baseG + (i < remG ? 1 : 0);
        const vGiras = baseGira + (i < remGira ? 1 : 0);
        const s = Math.round((vGiras / 16) * 10000) / 10000;
        return {
          ...v,
          GodownStock: g,
          godownStock: g,
          StockQuantity: s,
          stockQuantity: s,
          TotalStock: g + s
        };
      });
    } else {
      const baseS = Math.floor(parentShop / count);
      const remS = parentShop % count;

      updatedVariants = currentVariants.map((v, i) => {
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
    }

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
    setConfirmDialog({
      title: 'মূল স্টক সিঙ্ক নিশ্চিতকরণ',
      message: confirmMsg,
      confirmLabel: 'হ্যাঁ, সিঙ্ক করুন',
      cancelLabel: 'না, ফিরে যান',
      isDestructive: false,
      onConfirm: async () => {
        try {
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
          showToast('ভ্যারিয়েন্টের যোগফল অনুযায়ী মূল স্টক সফলভাবে সিঙ্ক হয়েছে।', 'success');
        } catch (err) {
          showToast(`সিঙ্ক করতে সমস্যা হয়েছে: ${err.message}`, 'error');
        }
      }
    });
  };

  // নতুন ভ্যারিয়েন্ট যোগ মডাল ওপেন
  const handleOpenNewColor = (product) => {
    const prodUnit = getProductDisplayUnit(product);
    const isThan = /than|থান/i.test(prodUnit);
    const isWeight = /kg|gm|কেজি|গ্রাম/i.test(prodUnit);
    const defaultType = isThan ? 'Color' : (isWeight ? 'Weight' : 'Color');
    const prodBarcode = product.Barcode || `prod-${product.ProductID}`;
    setNewColorModal({
      product,
      variantType: defaultType,
      variantName: '',
      colorName: '',
      yardsPerThan: '', // খালি রাখলে মূল পণ্যের গজ কার্যকর হবে
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
    const { product, variantType, variantName, colorName, godownStock, shopStock, costPrice, sellingPrice, wholesalePrice, barcode, yardsPerThan } = newColorModal;
    const vType = variantType || 'Color';
    const cleanVarName = String(variantName || colorName || '').trim();
    if (!cleanVarName) {
      showToast(`দয়া করে ${vType === 'Color' ? 'রঙের' : vType === 'Size' ? 'সাইজের' : 'ভ্যারিয়েন্টের'} নাম ড্রপডাউন থেকে নির্বাচন করুন অথবা লিখুন।`, 'error');
      return;
    }

    const currentVariants = getVariantsOfProduct(product);
    const isDuplicate = currentVariants.some((v) => {
      const c = v.Attributes?.[vType] || v[vType] || v.Color || v.color || v.Attributes?.Color || v.VariantID;
      return String(c || '').trim().toLowerCase() === cleanVarName.toLowerCase();
    });
    if (isDuplicate) {
      showToast(`'${cleanVarName}' নামের একটি ভ্যারিয়েন্ট ইতোমধ্যে এই পণ্যে বিদ্যমান রয়েছে!`, 'error');
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
    const finalBarcode = (barcode || `${baseBarcode}-${cleanVarName.toLowerCase()}`).trim().replace(/\s+/g, '-');

    const cleanYpt = yardsPerThan !== undefined && yardsPerThan !== '' && !isNaN(Number(yardsPerThan)) && Number(yardsPerThan) > 0 ? Number(yardsPerThan) : null;
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
      TotalStock: gStock + sStock,
      ...(cleanYpt ? { YardsPerThan: cleanYpt, yardsPerThan: cleanYpt } : {})
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
      showToast(`নতুন ভ্যারিয়েন্ট '${cleanVarName}' সফলভাবে যুক্ত হয়েছে!`, 'success');
      setNewColorModal(null);
    } catch (err) {
      showToast(`নতুন ভ্যারিয়েন্ট সংরক্ষণ করতে সমস্যা হয়েছে: ${err.message}`, 'error');
    } finally {
      setIsSubmittingNewColor(false);
    }
  };

  // ভ্যারিয়েন্ট এডিট মডাল ওপেন
  const handleOpenEditVariant = (product, variant, variantIdx) => {
    const colorVal = variant.Color || variant.color || variant.Attributes?.Color || variant.Attributes?.color || '';
    const prodUnit = getProductDisplayUnit(product);
    const isThan = /than|থান/i.test(prodUnit);
    const customYpt = variant.YardsPerThan !== undefined && variant.YardsPerThan !== null && variant.YardsPerThan !== ''
      ? variant.YardsPerThan
      : (variant.yardsPerThan !== undefined && variant.yardsPerThan !== null && variant.yardsPerThan !== '' ? variant.yardsPerThan : '');
    const prodYardsPerThan = isThan ? (Number(customYpt || product.YardsPerThan || product.yardsPerThan || 0) || 25) : 0;
    const currentShopStock = Number(variant.StockQuantity !== undefined ? variant.StockQuantity : (variant.stockQuantity !== undefined ? variant.stockQuantity : (variant.ShopStock || 0))) || 0;

    let fullThans = 0;
    let cutGoj = 0;
    let cutGira = 0;
    if (isThan && prodYardsPerThan > 0 && currentShopStock > 0) {
      const bd = calculateThanBreakdown(currentShopStock, prodYardsPerThan, 0);
      fullThans = bd.fullThans || 0;
      const parsedCut = parseGojGira(bd.runningCutYards);
      cutGoj = parsedCut.goj || 0;
      cutGira = parsedCut.gira || 0;
    }

    setEditVariantModal({
      product,
      variant,
      variantIdx,
      colorName: colorVal,
      barcode: variant.Barcode || variant.barcode || '',
      yardsPerThan: customYpt !== undefined && customYpt !== '' ? customYpt : '',
      godownStock: Number(variant.GodownStock !== undefined ? variant.GodownStock : variant.godownStock) || 0,
      shopStock: currentShopStock,
      fullThans: fullThans,
      cutGoj: cutGoj,
      cutGira: cutGira,
      costPrice: Number(variant.CostPrice !== undefined ? variant.CostPrice : (product.CostPrice || 0)),
      sellingPrice: Number(variant.SellingPrice !== undefined ? variant.SellingPrice : (product.SellingPrice || 0)),
      wholesalePrice: Number(variant.WholesalePrice !== undefined ? variant.WholesalePrice : (product.WholesalePrice || product.CostPrice || 0)),
    });
  };

  // ভ্যারিয়েন্ট এডিট সংরক্ষণ ও ডাটাবেস সিঙ্ক
  const handleSaveEditVariantSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editVariantModal || !onUpdateProductVariants) return;
    const { product, variantIdx, colorName, barcode, godownStock, shopStock, fullThans, cutGoj, cutGira, costPrice, sellingPrice, wholesalePrice, yardsPerThan } = editVariantModal;
    const cleanColor = String(colorName || '').trim();
    if (!cleanColor) {
      showToast('দয়া করে রঙের নাম উল্লেখ করুন।', 'error');
      return;
    }

    const prodUnit = getProductDisplayUnit(product);
    const isThan = /than|থান/i.test(prodUnit);
    const cleanYpt = yardsPerThan !== undefined && yardsPerThan !== '' && !isNaN(Number(yardsPerThan)) && Number(yardsPerThan) > 0 ? Number(yardsPerThan) : null;
    const effectiveYpt = isThan ? (cleanYpt || Number(product.YardsPerThan || product.yardsPerThan || 0) || 25) : 0;

    const currentVariants = getVariantsOfProduct(product);
    // অন্য কোনো ভ্যারিয়েন্টে একই নাম আছে কি না যাচাই
    const isDuplicate = currentVariants.some((v, idx) => {
      if (idx === variantIdx) return false;
      const c = v.Color || v.color || v.Attributes?.Color || v.Attributes?.color || v.VariantID;
      return String(c).trim().toLowerCase() === cleanColor.toLowerCase();
    });
    if (isDuplicate) {
      showToast(`'${cleanColor}' নামের আরেকটি ভ্যারিয়েন্ট ইতোমধ্যে এই পণ্যে বিদ্যমান রয়েছে!`, 'error');
      return;
    }

    const gStock = Math.max(0, Number(godownStock) || 0);
    const sStock = (isThan && effectiveYpt > 0)
      ? calculateInitialShopYards(fullThans, cutGoj, cutGira, effectiveYpt)
      : Math.max(0, Number(shopStock) || 0);

    const updatedVariants = currentVariants.map((v, idx) => {
      if (idx === variantIdx) {
        const updated = {
          ...v,
          Color: cleanColor,
          Attributes: { ...(v.Attributes || {}), Color: cleanColor },
          Barcode: barcode ? barcode.trim() : (v.Barcode || ''),
          GodownStock: gStock,
          godownStock: gStock,
          StockQuantity: sStock,
          stockQuantity: sStock,
          ShopStock: sStock,
          shopStock: sStock,
          TotalStock: gStock + sStock,
          totalStock: gStock + sStock,
          CostPrice: Number(costPrice) || 0,
          costPrice: Number(costPrice) || 0,
          SellingPrice: Number(sellingPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          WholesalePrice: Number(wholesalePrice) || 0,
          wholesalePrice: Number(wholesalePrice) || 0
        };
        if (cleanYpt) {
          updated.YardsPerThan = cleanYpt;
          updated.yardsPerThan = cleanYpt;
        } else {
          delete updated.YardsPerThan;
          delete updated.yardsPerThan;
        }
        return updated;
      }
      return v;
    });

    setIsSubmittingEditVariant(true);
    try {
      await onUpdateProductVariants(product.ProductID, updatedVariants, {
        location: isShopStockView ? 'Shop' : 'Godown',
        type: 'ADJUSTMENT',
        variantName: `রং: ${cleanColor}`,
        qty: isShopStockView ? sStock : gStock,
        prevStock: Number(isShopStockView ? (editVariantModal.variant.StockQuantity || 0) : (editVariantModal.variant.GodownStock || 0)),
        newStock: isShopStockView ? sStock : gStock,
        reason: `ভ্যারিয়েন্ট এডিট (${cleanColor})`,
        notes: `ভ্যারিয়েন্ট তথ্য ও স্টক আপডেট: গোডাউন ${gStock} ${isThan ? 'থান' : prodUnit}, দোকান ${sStock} ${isThan ? 'গজ' : prodUnit}`
      });
      showToast(`ভ্যারিয়েন্ট '${cleanColor}' সফলভাবে আপডেট করা হয়েছে।`, 'success');
      setEditVariantModal(null);
    } catch (err) {
      showToast(`ভ্যারিয়েন্ট আপডেট করতে সমস্যা হয়েছে: ${err.message}`, 'error');
    } finally {
      setIsSubmittingEditVariant(false);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40  overflow-y-auto"}>
      <div className={embedded ? "relative w-full bg-white rounded-md shadow-sm border border-[#E5E5E5] overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)]" : "relative w-full max-w-6xl bg-white rounded-lg shadow-none border border-[#E5E5E5] overflow-hidden my-auto flex flex-col max-h-[94vh]"}>
        
        {/* =================================================================== */}
        {/* হেডার ও প্রধান ৪টি ট্যাব নেভিগেশন (Modern Clean Header) */}
        {/* =================================================================== */}
        <div className="px-6 py-4 bg-white border-b border-[#E5E5E5] text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-none">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-md border flex items-center justify-center shadow-none ${
              isShopStockView
                ? 'bg-emerald-50 border-emerald-200/80 text-[#0F172A]'
                : 'bg-emerald-50 border-emerald-200/80 text-[#0F172A]'
            }`}>
              {isShopStockView ? <Store className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  {initialTab === 'godown_stock' 
                    ? 'গোডাউন বর্তমান মজুত ও ইনভেন্টরি'
                    : isShopStockView 
                    ? 'দোকান ফ্লোর ও কাউন্টার মজুত খতিয়ান' 
                    : 'গোডাউন ও দোকান স্টক ট্র্যাকার'}
                </h2>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isShopStockView
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                    : 'bg-[#F5F5F5] text-slate-700 border-[#E5E5E5]'
                }`}>
                  {initialTab === 'godown_stock' ? (
                    <>
                      <Warehouse className="w-3.5 h-3.5 text-slate-600" />
                      <span>কেন্দ্রীয় গোডাউন</span>
                    </>
                  ) : isShopStockView ? (
                    <>
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>দোকান কাউন্টার স্টক</span>
                    </>
                  ) : (
                    <>
                      <Boxes className="w-3.5 h-3.5 text-slate-600" />
                      <span>মাল্টি-লোকেশন</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {initialTab === 'godown_stock'
                  ? 'কেন্দ্রীয় গোডাউনের থান, গজ ও তৈরি পোশাকের রিয়েল-টাইম ব্যালেন্স ও স্থানান্তর খতিয়ান'
                  : isShopStockView
                  ? 'দোকানের ডিসপ্লে ফ্লোর, কাউন্টার মজুত, থান-গজ হিসাব ও ঘাটতি সমন্বয়'
                  : 'গোডাউন ও দোকান স্টক পৃথকীকরণ, চালান স্থানান্তর ও কমার পৃথক খতিয়ান'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* ৪টি মূল ট্যাব */}
            <div className="bg-[#F5F5F5] p-1 rounded-md flex items-center border border-[#E5E5E5] shadow-none overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => { setActiveMainTab('overview'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeMainTab === 'overview'
                    ? 'bg-[#0F172A] text-white shadow-none font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>স্টক খতিয়ান</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMainTab('transfers'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeMainTab === 'transfers'
                    ? 'bg-[#0F172A] text-white shadow-none font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>চালান স্থানান্তর</span>
                {stockKpis.inTransitChallans > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#FFFBEB]0 text-white font-mono font-black animate-pulse">
                    {stockKpis.inTransitChallans}
                  </span>
                )}
              </button>

              {!isShopStockView && (
                <button
                  type="button"
                  onClick={() => { setActiveMainTab('godown_outflow'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeMainTab === 'godown_outflow'
                      ? 'bg-[#0F172A] text-white shadow-none font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>গোডাউন কমার খাতা</span>
                </button>
              )}

              {!isGodownStockView && (
                <button
                  type="button"
                  onClick={() => { setActiveMainTab('shop_outflow'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeMainTab === 'shop_outflow'
                      ? 'bg-[#0F172A] text-white shadow-none font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>দোকান কমার খাতা</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className={`rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                embedded
                  ? 'px-3.5 py-1.5 bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 font-bold text-xs border border-[#E5E5E5] shadow-none active:scale-95'
                  : 'p-2 text-slate-400 hover:text-slate-700 hover:bg-[#F5F5F5]'
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
          <div className="flex-1 overflow-y-auto p-6 bg-[#F5F5F5] flex flex-col items-center">
            <div id="printable-challan-container" className="w-full max-w-2xl bg-white rounded-md shadow-none border border-[#E5E5E5] p-8 print:p-0 print:border-none print:shadow-none">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] mb-6 print:hidden">
                <span className="text-xs font-bold text-slate-600">ডেলিভারি চালান ও গেটপাস প্রিন্ট ভিউ</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>চালান প্রিন্ট করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPrintableChallan(null); handleResetChallan(); setTransferSubTab('list'); }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-md cursor-pointer"
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

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#FAFAFA] rounded-md border border-[#E5E5E5]">
                  <div>
                    <span className="text-slate-400 block font-medium">চালান নম্বর:</span>
                    <span className="font-bold font-mono text-sm text-neutral-700">{printableChallan.ChallanNo}</span>
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
                    <tr className="border-b-2 border-[#E5E5E5] text-slate-700 bg-[#F5F5F5]">
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
                    <tr className="border-t-2 border-slate-900 bg-[#FAFAFA] font-bold">
                      <td colSpan="3" className="py-2.5 px-3 text-right uppercase">মোট স্থানান্তর পরিমাণ:</td>
                      <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-emerald-800">
                        {printableChallan.TotalQuantity || (printableChallan.Items || []).reduce((s, itm) => s + Number(itm.quantity), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {printableChallan.Notes && (
                  <div className="p-3 bg-[#FFFBEB] rounded-md border border-[#FEF3C7] text-xs">
                    <span className="font-bold text-[#B45309] block">মন্তব্য:</span>
                    <span className="text-[#B45309]">{printableChallan.Notes}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-10 pt-12 text-center text-xs text-slate-500">
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-medium">প্রেরক / গোডাউন ইনচার্জ স্বাক্ষর</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-medium">প্রাপক / দোকান রিসিভার স্বাক্ষর</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isPrintableGodownOutflow ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F5F5F5] flex flex-col items-center">
            <div id="printable-godown-outflow-container" className="w-full max-w-4xl bg-white rounded-md shadow-none border border-[#E5E5E5] p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:max-w-none">
              
              {/* অ্যাকশন কন্ট্রোল বার (প্রিন্টে লুকানো থাকবে) */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] mb-6 print:hidden">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">গোডাউন স্টক কমার ভ্যারিয়েন্ট খতিয়ান (A4 পিডিএফ প্রিন্ট ভিউ)</h4>
                    <p className="text-[11px] text-slate-500">ব্রাউজারের প্রিন্ট ডায়ালগ থেকে 'Save as PDF' নির্বাচন করে সরাসরি ডাউনলোড করুন</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট / PDF ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportGodownOutflowExcelCSV(stockMovements, products)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>এক্সেল CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintableGodownOutflow(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-md cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>

              {/* অফিশিয়াল রিপোর্ট ফরম্যাট */}
              <div className="space-y-6 text-slate-800 text-xs">
                {/* শপ হেডার */}
                <div className="text-center pb-4 border-b-2 border-slate-900">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {storeSettings?.StoreName || 'Pabna Bostraloy'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">{storeSettings?.Address || 'Bosila, Mohammadpur, Dhaka'}</p>
                  <p className="text-xs text-slate-500">ফোন: {storeSettings?.Phone || '01675934919'}</p>
                  
                  <div className="inline-block mt-3 px-5 py-1.5 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                    গোডাউন ভ্যারিয়েন্ট অনুযায়ী স্টক হ্রাস / কমার খতিয়ান ও অডিট রিপোর্ট
                  </div>
                </div>

                {/* ফিল্টার ও মেটা তথ্য বার */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] text-[11px]">
                  <div>
                    <span className="text-slate-500 block font-medium">রিপোর্ট তৈরির সময়:</span>
                    <span className="font-bold text-slate-800">{new Date().toLocaleString('bn-BD')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">সময়কাল / ফিল্টার:</span>
                    <span className="font-bold text-slate-800">
                      {godownDateFilter === 'TODAY' ? 'আজকের' : godownDateFilter === '7DAYS' ? 'বিগত ৭ দিন' : godownDateFilter === '30DAYS' ? 'বিগত ৩০ দিন' : 'সকল সময়'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">মোট কমার ঘটনা:</span>
                    <span className="font-bold font-mono text-slate-900">{godownOutflowData.length}টি এন্ট্রি</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">মোট হ্রাসকৃত পরিমাণ:</span>
                    <span className="font-black font-mono text-rose-700 text-sm">
                      {godownOutflowSummary.totalQty}
                    </span>
                  </div>
                </div>

                {/* অডিট টেবিল */}
                <table className="w-full text-xs text-left border-collapse border border-[#E5E5E5]">
                  <thead>
                    <tr className="border-b-2 border-[#E5E5E5] text-slate-800 bg-[#F5F5F5] font-bold">
                      <th className="py-2 px-2.5 border border-[#E5E5E5] text-center w-10">ক্রমিক</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">তারিখ ও সময়</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">পণ্যের বিবরণ</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">ভ্যারিয়েন্ট (রং / সাইজ)</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">কমার কারণ ও চালান নং</th>
                      <th className="py-2 px-2.5 border border-[#E5E5E5] text-center">একক</th>
                      <th className="py-2 px-3 border border-[#E5E5E5] text-right text-rose-900 bg-rose-50/50">কমেছে</th>
                      <th className="py-2 px-2.5 border border-[#E5E5E5] text-center">পূর্বে</th>
                      <th className="py-2 px-2.5 border border-[#E5E5E5] text-center">অবশিষ্ট</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">অনুমোদক / চালক</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {godownOutflowData.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-slate-400 font-medium border border-[#E5E5E5]">
                          নির্বাচিত ফিল্টারে কোনো গোডাউন স্টক কমার রেকর্ড নেই।
                        </td>
                      </tr>
                    ) : (
                      godownOutflowData.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-[#FAFAFA]">
                          <td className="py-2 px-2.5 text-center font-mono text-slate-500 border border-[#E5E5E5]">{idx + 1}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap border border-[#E5E5E5]">
                            {new Date(m.timestamp).toLocaleString('bn-BD')}
                          </td>
                          <td className="py-2 px-3 border border-[#E5E5E5]">
                            <strong className="text-slate-900 block">{m.productName}</strong>
                            {m.category && <span className="text-[10px] text-slate-500 block">{m.category}</span>}
                          </td>
                          <td className="py-2 px-3 border border-[#E5E5E5]">
                            {m.variantName || m.color || m.size ? (
                              <div>
                                {m.color && <span className="font-bold text-neutral-700 block">রং: {m.color}</span>}
                                {m.size && <span className="font-bold text-neutral-700 block">সাইজ: {m.size}</span>}
                                {m.variantName && !m.color && !m.size && <span className="font-bold text-neutral-700 block">{m.variantName}</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400">সাধারণ</span>
                            )}
                          </td>
                          <td className="py-2 px-3 border border-[#E5E5E5]">
                            <span className="font-medium text-slate-800 block">{m.reasonBangla}</span>
                            {m.referenceNo && (
                              <span className="text-[10px] font-mono text-neutral-600 font-bold block">
                                চালান: {m.referenceNo}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-600 border border-[#E5E5E5]">{m.unit || 'Pcs'}</td>
                          <td className="py-2 px-3 text-right font-black font-mono text-rose-700 text-sm bg-rose-50/30 border border-[#E5E5E5]">
                            -{m.quantity}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-500 border border-[#E5E5E5]">
                            {m.previousStock !== '-' ? m.previousStock : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-900 border border-[#E5E5E5]">
                            {m.remainingStock !== '-' ? m.remainingStock : '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 border border-[#E5E5E5]">
                            <span className="block font-medium">{m.operatorName || 'Admin'}</span>
                            {m.notes && <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{m.notes}</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {godownOutflowData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 bg-[#F5F5F5] font-bold">
                        <td colSpan="6" className="py-2.5 px-3 text-right uppercase border border-[#E5E5E5]">
                          সর্বমোট কমার পরিমাণ:
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-rose-800 border border-[#E5E5E5]">
                          {godownOutflowSummary.totalQty}
                        </td>
                        <td colSpan="3" className="border border-[#E5E5E5]"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* স্বাক্ষর ও ভেরিফিকেশন ব্লক */}
                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-500">
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-bold text-slate-800">রিপোর্ট প্রস্তুতকারক</span>
                    <span className="text-[10px] text-slate-400">{activeUser?.FullName || 'অপারেটর'}</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-bold text-slate-800">গোডাউন ইনচার্জ স্বাক্ষর</span>
                    <span className="text-[10px] text-slate-400">স্টক যাচাইকারী</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-bold text-slate-800">অনুমোদনকারী / স্বত্বাধিকারী</span>
                    <span className="text-[10px] text-slate-400">কর্তৃপক্ষ সিল ও স্বাক্ষর</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : isPrintableShopStockAudit ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F5F5F5] flex flex-col items-center">
            <div id="printable-shop-stock-audit-container" className="w-full max-w-4xl bg-white rounded-md shadow-none border border-[#E5E5E5] p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:max-w-none">
              
              {/* অ্যাকশন কন্ট্রোল বার (প্রিন্টে লুকানো থাকবে) */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] mb-6 print:hidden">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">দোকান ফিজিক্যাল স্টক অডিট ও গণনা শিট (A4 প্রিন্ট ভিউ)</h4>
                    <p className="text-[11px] text-slate-500">প্রিন্ট কপি বের করে ডিসপ্লে ফ্লোর ও কাউন্টারের পণ্যের শারীরিক গণনা যাচাই ও হিসাব সমন্বয় করুন</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট / PDF ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportLocationStockExcelCSV(products)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>এক্সেল CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintableShopStockAudit(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-md cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>

              {/* অফিশিয়াল রিপোর্ট ফরম্যাট */}
              <div className="space-y-6 text-slate-800 text-xs">
                {/* শপ হেডার */}
                <div className="text-center pb-4 border-b-2 border-slate-900">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {storeSettings?.StoreName || 'Pabna Bostraloy'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">{storeSettings?.Address || 'Bosila, Mohammadpur, Dhaka'}</p>
                  <p className="text-xs text-slate-500">ফোন: {storeSettings?.Phone || '01675934919'}</p>
                  
                  <div className="inline-block mt-3 px-5 py-1.5 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                    দোকান ফ্লোর ও কাউন্টার ফিজিক্যাল স্টক অডিট ও গণনা খতিয়ান
                  </div>
                </div>

                {/* ফিল্টার ও মেটা তথ্য বার */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] text-[11px]">
                  <div>
                    <span className="text-slate-500 block font-medium">অডিট তারিখ ও সময়:</span>
                    <span className="font-bold text-slate-800">{new Date().toLocaleString('bn-BD')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">শাখা / কাউন্টার:</span>
                    <span className="font-bold text-slate-800">মূল বিক্রয় কেন্দ্র (Shop Floor)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">অডিট আইটেম সংখ্যা:</span>
                    <span className="font-bold font-mono text-slate-900">{filteredOverviewProducts.length}টি পণ্য</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">সিস্টেম মোট দোকান স্টক:</span>
                    <span className="font-black font-mono text-emerald-700 text-sm">
                      {stockKpis.fabricShopYards > 0 && stockKpis.generalShopPcs > 0
                        ? `${stockKpis.fabricShopYards.toLocaleString('bn-BD')} গজ + ${stockKpis.generalShopPcs.toLocaleString('bn-BD')} Pcs`
                        : (stockKpis.fabricShopYards > 0 ? `${stockKpis.fabricShopYards.toLocaleString('bn-BD')} গজ` : `${(stockKpis.totalShop || 0).toLocaleString('bn-BD')} Pcs`)}
                    </span>
                  </div>
                </div>

                {/* অডিট টেবিল */}
                <table className="w-full text-xs text-left border-collapse border border-[#E5E5E5]">
                  <thead>
                    <tr className="border-b-2 border-[#E5E5E5] text-slate-800 bg-[#F5F5F5] font-bold">
                      <th className="py-2 px-2 border border-[#E5E5E5] text-center w-8">ক্রমিক</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">পণ্যের বিবরণ ও ভ্যারিয়েন্ট</th>
                      <th className="py-2 px-2.5 border border-[#E5E5E5] text-center">কোড / বারকোড</th>
                      <th className="py-2 px-2 border border-[#E5E5E5] text-center">একক</th>
                      <th className="py-2 px-3 border border-[#E5E5E5] text-center bg-emerald-50/60 text-emerald-950 font-bold">সিস্টেম রেকর্ড</th>
                      <th className="py-2 px-3 border border-[#E5E5E5] text-center w-24 bg-[#FFFBEB]/40 text-amber-950 font-bold">ফিজিক্যাল গণনা</th>
                      <th className="py-2 px-3 border border-[#E5E5E5] text-center w-20">গরমিল (+ / -)</th>
                      <th className="py-2 px-3 border border-[#E5E5E5]">মন্তব্য (নষ্ট/কাটা স্যাম্পল)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOverviewProducts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400 font-medium border border-[#E5E5E5]">
                          তালিকাভুক্ত কোনো পণ্য নেই।
                        </td>
                      </tr>
                    ) : (
                      filteredOverviewProducts.map((p, idx) => {
                        const vars = getVariantsOfProduct(p);
                        const unit = getProductDisplayUnit(p);
                        const isThan = /than|থান/i.test(unit);
                        const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
                        const sStock = Number(p.StockQuantity || 0);

                        if (vars.length > 0) {
                          return (
                            <React.Fragment key={p.ProductID}>
                              <tr className="bg-[#FAFAFA] font-bold">
                                <td className="py-1.5 px-2 text-center font-mono text-slate-600 border border-[#E5E5E5]">{idx + 1}</td>
                                <td colSpan="3" className="py-1.5 px-3 border border-[#E5E5E5] text-slate-900">
                                  {p.ProductName} <span className="text-[10px] text-slate-500 font-normal">({p.Category}) — {vars.length}টি ভ্যারিয়েন্ট</span>
                                </td>
                                <td className="py-1.5 px-3 text-center font-mono font-bold text-emerald-800 border border-[#E5E5E5] bg-emerald-50/30">
                                  {sStock} {isThan ? `থান (${sStock * yardsPerThan} গজ)` : unit}
                                </td>
                                <td className="py-1.5 px-3 border border-[#E5E5E5] bg-white"></td>
                                <td className="py-1.5 px-3 border border-[#E5E5E5]"></td>
                                <td className="py-1.5 px-3 border border-[#E5E5E5] text-[10px] text-slate-500"></td>
                              </tr>
                              {vars.map((v, vIdx) => {
                                const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : 0);
                                const vColor = v.Attributes?.Color || v.Color || '';
                                const vSize = v.Attributes?.Size || v.Size || '';
                                const vLabel = [vColor && `রং: ${vColor}`, vSize && `সাইজ: ${vSize}`].filter(Boolean).join(' | ');

                                return (
                                  <tr key={v.VariantID || vIdx} className="hover:bg-[#FAFAFA]">
                                    <td className="py-1.5 px-2 text-center font-mono text-slate-400 border border-[#E5E5E5] text-[10px]">{idx + 1}.{vIdx + 1}</td>
                                    <td className="py-1.5 px-3 pl-6 border border-[#E5E5E5]">
                                      <span className="font-semibold text-slate-800 block text-[11px]">{vLabel || v.VariantID}</span>
                                    </td>
                                    <td className="py-1.5 px-2.5 text-center font-mono text-[10px] text-slate-500 border border-[#E5E5E5]">
                                      {v.Barcode || p.Barcode || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center text-slate-600 border border-[#E5E5E5] text-[10px]">{unit}</td>
                                    <td className="py-1.5 px-3 text-center font-mono font-bold text-slate-800 border border-[#E5E5E5]">
                                      {vSStock} {isThan ? `থান (${vSStock * yardsPerThan} গজ)` : ''}
                                    </td>
                                    <td className="py-1.5 px-3 border border-[#E5E5E5] bg-white text-center font-mono">
                                      <div className="h-4 border-b border-dashed border-[#E5E5E5]"></div>
                                    </td>
                                    <td className="py-1.5 px-3 border border-[#E5E5E5] text-center font-mono">
                                      <div className="h-4 border-b border-dashed border-[#E5E5E5]"></div>
                                    </td>
                                    <td className="py-1.5 px-3 border border-[#E5E5E5]"></td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        }

                        return (
                          <tr key={p.ProductID} className="hover:bg-[#FAFAFA]">
                            <td className="py-2 px-2 text-center font-mono text-slate-500 border border-[#E5E5E5]">{idx + 1}</td>
                            <td className="py-2 px-3 border border-[#E5E5E5]">
                              <span className="font-bold text-slate-900 block">{p.ProductName}</span>
                              <span className="text-[10px] text-slate-500 block">{p.Category}</span>
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono text-[10.5px] text-slate-600 border border-[#E5E5E5]">
                              {p.Barcode || p.ProductID}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-600 border border-[#E5E5E5]">{unit}</td>
                            <td className="py-2 px-3 text-center font-black font-mono text-emerald-800 bg-emerald-50/30 border border-[#E5E5E5]">
                              {(() => {
                                if (isThan) {
                                  const bd = calculateThanBreakdown(sStock, yardsPerThan, p.RemnantThreshold !== undefined ? p.RemnantThreshold : (p.remnantThreshold !== undefined ? p.remnantThreshold : 0));
                                  return (
                                    <span>{bd.displayText} <span className="text-[10px] text-slate-500 font-normal">({bd.totalYards} গজ)</span></span>
                                  );
                                }
                                return `${sStock} ${unit}`;
                              })()}
                            </td>
                            <td className="py-2 px-3 border border-[#E5E5E5] bg-white text-center font-mono text-[10px] text-slate-400">
                              {isThan ? '[   ] থান + [   ] গজ [   ] গিরা' : <div className="h-4 border-b border-dashed border-[#E5E5E5]"></div>}
                            </td>
                            <td className="py-2 px-3 border border-[#E5E5E5] text-center font-mono">
                              <div className="h-4 border-b border-dashed border-[#E5E5E5]"></div>
                            </td>
                            <td className="py-2 px-3 border border-[#E5E5E5]"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredOverviewProducts.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 bg-[#F5F5F5] font-bold">
                        <td colSpan="4" className="py-2.5 px-3 text-right uppercase border border-[#E5E5E5]">
                          সর্বমোট সিস্টেম দোকান মজুত:
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-sm font-mono text-emerald-800 border border-[#E5E5E5]">
                          {stockKpis.fabricShopYards > 0 && stockKpis.generalShopPcs > 0
                            ? `${stockKpis.fabricShopYards.toLocaleString('bn-BD')} গজ + ${stockKpis.generalShopPcs.toLocaleString('bn-BD')} Pcs`
                            : (stockKpis.fabricShopYards > 0 ? `${stockKpis.fabricShopYards.toLocaleString('bn-BD')} গজ` : `${(stockKpis.totalShop || 0).toLocaleString('bn-BD')} Pcs`)}
                        </td>
                        <td colSpan="3" className="border border-[#E5E5E5]"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* স্বাক্ষর ও ভেরিফিকেশন ব্লক */}
                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-500">
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-bold text-slate-800">স্টক গণনাকারী সেলসম্যান</span>
                    <span className="text-[10px] text-slate-400">স্বাক্ষর ও তারিখ</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-bold text-slate-800">দোকান / কাউন্টার ইনচার্জ</span>
                    <span className="text-[10px] text-slate-400">যাচাইকারী স্বাক্ষর</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-2">
                    <span className="block font-bold text-slate-800">মালিক / শাখা ব্যবস্থাপক</span>
                    <span className="text-[10px] text-slate-400">অনুমোদন সিল ও স্বাক্ষর</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA]">
            
            {/* =============================================================== */}
            {/* ট্যাব ১: স্টক খতিয়ান (গোডাউন বনাম দোকান ওভারভিউ) */}
            {/* =============================================================== */}
            {activeMainTab === 'overview' && (
              <div className="space-y-4">
                
                {/* ১. কেপিআই কার্ডস - এন্টারপ্রাইজ মেট্রিক্স গ্রিড (Human Pro POS Standard) */}
                {isShopStockView ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* কার্ড ১: দোকান মোট মজুত */}
                    <div
                      onClick={() => setOverviewFilter('IN_SHOP')}
                      className={`p-4 bg-white rounded-md border transition-all cursor-pointer shadow-none hover:shadow-none ${
                        overviewFilter === 'IN_SHOP' ? 'border-[#0F172A] ring-2 ring-[#0F172A]/15' : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">দোকান মোট মজুত</span>
                        <span className="p-1.5 rounded-lg bg-emerald-50 text-[#0F172A] border border-emerald-100">
                          <Store className="w-4 h-4" />
                        </span>
                      </div>
                      {stockKpis.fabricShopYards > 0 && stockKpis.generalShopPcs > 0 ? (
                        <>
                          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                              {(stockKpis.fabricShopYards || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-[#0F172A]">গজ</span>
                            </div>
                            <span className="text-sm font-bold text-slate-300">+</span>
                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono tracking-tight tabular-nums">
                              {(stockKpis.generalShopPcs || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-slate-500">Pcs</span>
                            </div>
                          </div>

                          {/* কাপড় ও পিসের আনুপাতিক ভিজ্যুয়াল বার */}
                          {(() => {
                            const tot = (stockKpis.fabricShopYards || 0) + (stockKpis.generalShopPcs || 0);
                            const fabricPct = tot > 0 ? Math.round(((stockKpis.fabricShopYards || 0) / tot) * 100) : 100;
                            return (
                              <div className="w-full h-1 bg-[#F5F5F5] rounded-full overflow-hidden flex mt-2.5" title={`কাপড়: ${fabricPct}% | রেডি পণ্য: ${100 - fabricPct}%`}>
                                <div style={{ width: `${fabricPct}%` }} className="bg-[#0F172A] h-full rounded-full" />
                                <div style={{ width: `${100 - fabricPct}%` }} className="bg-slate-300 h-full rounded-full" />
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                          {((stockKpis.fabricShopYards > 0 ? stockKpis.fabricShopYards : (stockKpis.generalShopPcs > 0 ? stockKpis.generalShopPcs : stockKpis.totalShop)) || 0).toLocaleString('bn-BD')}{' '}
                          <span className="text-xs font-bold text-slate-500">
                            {stockKpis.fabricShopYards > 0 ? 'গজ' : (stockKpis.generalShopPcs > 0 ? 'Pcs' : 'আইটেম')}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ফ্লোরে উপস্থিত</span>
                        </span>
                        <span className="text-slate-500 font-mono font-medium">
                          {(stockKpis.shopProductCount || 0).toLocaleString('bn-BD')}টি পণ্য
                        </span>
                        {stockKpis.fabricShopYards > 0 && stockKpis.generalShopPcs > 0 && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            ({(stockKpis.fabricShopYards || 0).toLocaleString('bn-BD')} গজ + {(stockKpis.generalShopPcs || 0).toLocaleString('bn-BD')} পিস)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ২: দোকানে কাপড়ের মোট থান ও গজ */}
                    <div
                      onClick={() => setOverviewFilter('SHOP_FABRIC')}
                      className={`p-4 bg-white rounded-md border transition-all cursor-pointer shadow-none hover:shadow-none ${
                        overviewFilter === 'SHOP_FABRIC' ? 'border-[#0F172A] ring-2 ring-[#0F172A]/15' : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">দোকানে থান ও গজ কাপড়</span>
                        <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                          <Layers className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                        {(stockKpis.fabricShopYards || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-[#0F172A]">গজ</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#F5F5F5] text-slate-800 border border-[#E5E5E5] font-mono">
                          <Package className="w-3 h-3 text-slate-600" />
                          <span>{stockKpis.fabricShopFullThans || 0}টি আস্ত থান</span>
                        </span>
                        {stockKpis.fabricShopRemnantsCount > 0 && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7] font-mono">
                            <Scissors className="w-3 h-3 text-amber-700" />
                            <span>ছাঁট: {stockKpis.fabricShopRemnantsCount}টি</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ৩: দোকান মজুত সম্পদ মূল্য (Valuation) */}
                    <div className="p-4 bg-white rounded-md border border-[#E5E5E5] hover:border-[#D4D4D4] transition-all shadow-none hover:shadow-none">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">দোকান মজুত সম্পদ মূল্য</span>
                        <span className="p-1.5 rounded-lg bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5]">
                          <Sparkles className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                        {currencySymbol}{Math.round(stockKpis.totalShopCostValuation || 0).toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#F5F5F5] text-slate-800 border border-[#E5E5E5] font-mono" title="সম্ভাব্য বিক্রয় মূল্য">
                          <Tag className="w-3 h-3 text-slate-600" />
                          <span>বিক্রয়: {currencySymbol}{Math.round(stockKpis.totalShopSellingValuation || 0).toLocaleString('bn-BD')}</span>
                        </span>
                        {stockKpis.totalShopPotentialProfit > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            +{(Math.round((stockKpis.totalShopPotentialProfit / (stockKpis.totalShopCostValuation || 1)) * 100))}% মার্জিন
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ৪: দোকানে ঘাটতি ও রি-অর্ডার অ্যালার্ট */}
                    <div
                      onClick={() => setOverviewFilter(stockKpis.shopZeroInGodownCount > 0 ? 'SHOP_ZERO_IN_GODOWN' : 'LOW_SHOP')}
                      className={`p-4 bg-white rounded-md border transition-all cursor-pointer shadow-none hover:shadow-none ${
                        (overviewFilter === 'LOW_SHOP' || overviewFilter === 'SHOP_ZERO_IN_GODOWN')
                          ? 'border-rose-500 ring-2 ring-rose-500/20'
                          : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">দোকানে ঘাটতি ও অ্যালার্ট</span>
                        <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tracking-tight tabular-nums">
                        {((stockKpis.shopLowCount || 0) + (stockKpis.shopZeroInGodownCount || 0)).toLocaleString('bn-BD')}{' '}
                        <span className="text-xs font-bold text-slate-500">আইটেম</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                        {stockKpis.shopZeroInGodownCount > 0 && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>শেষ (গোডাউনে আছে): {stockKpis.shopZeroInGodownCount}</span>
                          </span>
                        )}
                        {stockKpis.fabricShopNeedsRestockCount > 0 && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                            <Truck className="w-3 h-3 text-rose-600" />
                            <span>থান প্রয়োজন: {stockKpis.fabricShopNeedsRestockCount}</span>
                          </span>
                        )}
                        {stockKpis.shopLowCount > 0 && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7] font-mono">
                            <span>কম: {stockKpis.shopLowCount}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* কার্ড ১: গোডাউন মোট মজুত */}
                    <div
                      onClick={() => setOverviewFilter('IN_GODOWN')}
                      className={`p-4 bg-white rounded-md border transition-all cursor-pointer shadow-none hover:shadow-none hover:-translate-y-0.5 duration-200 ${
                        overviewFilter === 'IN_GODOWN' ? 'border-[#0F172A] ring-2 ring-[#0F172A]/15' : 'border-[#E5E5E5] hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">গোডাউন মোট মজুত</span>
                        <span className="p-2 rounded-md bg-emerald-50 text-[#0F172A] border border-emerald-100 shadow-none">
                          <Warehouse className="w-4 h-4" />
                        </span>
                      </div>
                      
                      {stockKpis.fabricGodownThans > 0 && stockKpis.generalGodownPcs > 0 ? (
                        <>
                          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                              {(stockKpis.fabricGodownThans || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-[#0F172A]">থান</span>
                            </div>
                            <span className="text-sm font-black text-slate-300">+</span>
                            <div className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tracking-tight">
                              {(stockKpis.generalGodownPcs || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-slate-500">Pcs</span>
                            </div>
                          </div>

                          {/* কাপড় ও পিসের আনুপাতিক মিনি ভিজ্যুয়াল বার */}
                          {(() => {
                            const tot = (stockKpis.fabricGodownThans || 0) + (stockKpis.generalGodownPcs || 0);
                            const fabricPct = tot > 0 ? Math.round(((stockKpis.fabricGodownThans || 0) / tot) * 100) : 100;
                            return (
                              <div className="w-full h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden flex mt-2.5" title={`কাপড়: ${fabricPct}% | রেডি পণ্য: ${100 - fabricPct}%`}>
                                <div style={{ width: `${fabricPct}%` }} className="bg-[#0F172A] h-full rounded-full" />
                                <div style={{ width: `${100 - fabricPct}%` }} className="bg-slate-300 h-full rounded-full" />
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                          {(stockKpis.totalGodown || 0).toLocaleString('bn-BD')}{' '}
                          <span className="text-xs font-bold text-slate-500">
                            {stockKpis.fabricGodownThans > 0 ? 'থান' : (stockKpis.generalGodownPcs > 0 ? 'Pcs' : 'আইটেম')}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          <Warehouse className="w-3 h-3 text-slate-500 inline mr-1" />কেন্দ্রীয় গোডাউন
                        </span>
                        {stockKpis.fabricGodownYards > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                            মোট {(stockKpis.fabricGodownYards || 0).toLocaleString('bn-BD')} গজ
                          </span>
                        )}
                        {stockKpis.generalGodownPcs > 0 && stockKpis.fabricGodownThans > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-[#F5F5F5] text-slate-800 border border-[#E5E5E5]">
                            <Package className="w-3 h-3 text-slate-500 inline mr-1" />{(stockKpis.generalGodownPcs || 0).toLocaleString('bn-BD')} পিস রেডি
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ২: গোডাউন মোট মজুদ মূল্য (Valuation) */}
                    <div
                      className="p-4 bg-white rounded-md border border-[#E5E5E5] hover:border-emerald-300 transition-all cursor-pointer shadow-none hover:shadow-none hover:-translate-y-0.5 duration-200"
                      title="গোডাউন মোট সম্পদ মূল্য (ক্রয়মূল্য ভিত্তিক): কাপড়ের মোট গজ × মিল রেট + রেডি পণ্যের পিস × কেনা দাম"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">গোডাউন মোট সম্পদ মূল্য</span>
                        <span className="p-2 rounded-md bg-teal-50 text-teal-700 border border-teal-100/80 shadow-none">
                          <Sparkles className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {currencySymbol}{Math.round(stockKpis.totalGodownValuation || 0).toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {stockKpis.totalGodownSellingValuation > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-[#F5F5F5] text-slate-800 border border-[#E5E5E5] font-mono" title="গোডাউনের সকল পণ্যের সম্ভাব্য মোট বিক্রয়মূল্য">
                            <Tag className="w-3 h-3 text-slate-500 inline mr-1" />বিক্রয়: {currencySymbol}{Math.round(stockKpis.totalGodownSellingValuation || 0).toLocaleString('bn-BD')}
                          </span>
                        )}
                        {stockKpis.totalGodownMinSellingValuation > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]/90 font-mono" title="নূন্যতম বিক্রয়মূল্য (ফ্লোর প্রাইস) অনুযায়ী গোডাউনের মোট সম্পদ বিক্রয়মূল্য">
                            নূন্যতম বিক্রয়: {currencySymbol}{Math.round(stockKpis.totalGodownMinSellingValuation || 0).toLocaleString('bn-BD')}
                          </span>
                        )}
                        {stockKpis.totalGodownPotentialProfit > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-[#0F172A] border border-emerald-200/80 font-mono" title="সম্ভাব্য গ্রস লাভ মার্জিন">
                            +{(Math.round((stockKpis.totalGodownPotentialProfit / (stockKpis.totalGodownValuation || 1)) * 100))}% মার্জিন
                          </span>
                        )}
                        {stockKpis.fabricGodownValuation > 0 && stockKpis.generalGodownValuation > 0 ? (
                          <>
                            <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-mono">
                              <Layers className="w-3 h-3 text-emerald-600 inline mr-1" />কাপড়: {currencySymbol}{Math.round(stockKpis.fabricGodownValuation || 0).toLocaleString('bn-BD')}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-[#F5F5F5] text-slate-800 border border-[#E5E5E5] font-mono">
                              <Package className="w-3 h-3 text-slate-500 inline mr-1" />পিস: {currencySymbol}{Math.round(stockKpis.generalGodownValuation || 0).toLocaleString('bn-BD')}
                            </span>
                          </>
                        ) : stockKpis.fabricGodownYards > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/70 font-mono" title="গজ কাপড়ের মোট গজ অনুযায়ী ক্রয়মূল্য">
                            {(stockKpis.fabricGodownYards || 0).toLocaleString('bn-BD')} গজ কাপড় (গজ দর ভিত্তিক)
                          </span>
                        ) : stockKpis.generalGodownPcs > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-[#F5F5F5] text-slate-800 border border-[#E5E5E5] font-mono">
                            <Package className="w-3 h-3 text-slate-500 inline mr-1" />{(stockKpis.generalGodownPcs || 0).toLocaleString('bn-BD')} পিস রেডি পণ্য
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-semibold text-slate-500 font-mono">
                            {(stockKpis.totalVariants || 0)}টি ভ্যারিয়েন্ট
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ৩: গোডাউন স্টক অ্যালার্ট ও ঘাটতি */}
                    <div
                      onClick={() => setOverviewFilter('LOW_GODOWN')}
                      className={`p-4 bg-white rounded-md border transition-all cursor-pointer shadow-none hover:shadow-none hover:-translate-y-0.5 duration-200 ${
                        overviewFilter === 'LOW_GODOWN' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-[#E5E5E5] hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">গোডাউনে ঘাটতি / সতর্কতা</span>
                        <span className="p-2 rounded-md bg-rose-50 text-rose-600 border border-rose-100/80 shadow-none">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono tracking-tight">
                        {(stockKpis.godownLowCount || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-slate-500">আইটেমে ঘাটতি</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <AlertCircle className="w-3 h-3 text-rose-600 inline mr-1" />রিস্টক প্রয়োজন
                        </span>
                        {stockKpis.inTransitChallans > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]">
                            <Truck className="w-3 h-3 text-amber-600 inline mr-1" />{stockKpis.inTransitChallans}টি ট্রানজিটে
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ২. ফিল্টার এবং কন্ট্রোল বার */}
                <div className="p-4 bg-white rounded-md border border-[#E5E5E5]/90 shadow-none flex flex-col gap-3">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* সার্চ বক্স ও ক্যাটাগরি */}
                    <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={overviewSearch}
                          onChange={(e) => setOverviewSearch(e.target.value)}
                          placeholder="পণ্য, কোড, রং বা বারকোড খুঁজুন (শর্টকাট: /)..."
                          className="w-full pl-10 pr-16 py-2 bg-[#FAFAFA]/70 hover:bg-[#FAFAFA] focus:bg-white text-xs font-semibold text-slate-800 border border-[#E5E5E5] hover:border-[#D4D4D4] rounded-md focus:ring-2 focus:ring-[#0F172A]/15 focus:border-emerald-500 focus:outline-none transition-all shadow-none"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                          {overviewSearch ? (
                            <button
                              type="button"
                              onClick={() => setOverviewSearch('')}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="সার্চ ক্লিয়ার করুন (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#F5F5F5] rounded border border-[#E5E5E5]" title="কীবোর্ড শর্টকাট">
                              /
                            </kbd>
                          )}
                        </div>
                      </div>

                      <select
                        value={overviewCategory}
                        onChange={(e) => setOverviewCategory(e.target.value)}
                        className="px-3 py-2 text-xs border border-[#E5E5E5] hover:border-[#D4D4D4] rounded-md bg-[#FAFAFA]/70 hover:bg-white text-slate-700 font-bold focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 focus:outline-none cursor-pointer shadow-none shrink-0"
                      >
                        <option value="ALL">সকল ক্যাটাগরি ({categories.length})</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* ফিল্টার পিল সেগমেন্টেড কন্ট্রোল */}
                    <div className="flex items-center shrink-0 overflow-x-auto">
                      {isShopStockView ? (
                        <div className="flex items-center bg-[#F5F5F5] p-1 rounded-md text-xs font-bold border border-[#E5E5E5] overflow-x-auto shadow-none gap-1">
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('IN_SHOP')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'IN_SHOP'
                                ? 'bg-white text-[#0F172A] shadow-none font-bold border border-emerald-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Store className="w-3.5 h-3.5 text-emerald-600" />
                            <span>দোকান পণ্য</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                              overviewFilter === 'IN_SHOP' ? 'bg-emerald-100 text-[#0F172A] font-bold' : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {stockKpis.shopProductCount || 0}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_ZERO_IN_GODOWN')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'SHOP_ZERO_IN_GODOWN'
                                ? 'bg-white text-rose-700 shadow-none font-bold border border-rose-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>শেষ (গোডাউনে আছে)</span>
                            {(stockKpis.shopZeroInGodownCount || 0) > 0 && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                                {stockKpis.shopZeroInGodownCount || 0}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setOverviewFilter('LOW_SHOP')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'LOW_SHOP'
                                ? 'bg-white text-[#B45309] shadow-none font-bold border border-[#FEF3C7]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>দোকানে কম</span>
                            {(stockKpis.shopLowCount || 0) > 0 && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7] font-bold">
                                {stockKpis.shopLowCount || 0}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_FABRIC')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'SHOP_FABRIC'
                                ? 'bg-white text-[#0F172A] shadow-none font-bold border border-emerald-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5 text-teal-600" />
                            <span>থান ও গজ কাপড়</span>
                          </button>

                          {(stockKpis.fabricShopRemnantsCount || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setOverviewFilter('SHOP_REMNANT')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                                overviewFilter === 'SHOP_REMNANT'
                                  ? 'bg-white text-[#B45309] shadow-none font-bold border border-[#FEF3C7]'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Scissors className="w-3.5 h-3.5 text-amber-600" />
                              <span>শেষ ছাঁট ({stockKpis.fabricShopRemnantsCount || 0})</span>
                            </button>
                          )}

                          {(stockKpis.fabricShopNeedsRestockCount || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setOverviewFilter('SHOP_NEED_BOLT')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                                overviewFilter === 'SHOP_NEED_BOLT'
                                  ? 'bg-white text-rose-700 shadow-none font-bold border border-rose-200/80'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Truck className="w-3.5 h-3.5 text-rose-600" />
                              <span>নতুন থান প্রয়োজন ({stockKpis.fabricShopNeedsRestockCount || 0})</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center bg-[#F5F5F5] p-1 rounded-md text-xs font-bold border border-[#E5E5E5] overflow-x-auto shadow-none gap-1">
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'ALL'
                                ? 'bg-white shadow-none text-[#0F172A] font-bold border border-emerald-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>সকল পণ্য</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                              overviewFilter === 'ALL' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {products.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('IN_GODOWN')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'IN_GODOWN'
                                ? 'bg-white text-[#0F172A] shadow-none font-bold border border-emerald-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Warehouse className="w-3.5 h-3.5 text-emerald-600 inline mr-1" /><span>গোডাউনে আছে</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                              overviewFilter === 'IN_GODOWN' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {products.filter(prod => Number(prod.GodownStock || 0) > 0 || getVariantsOfProduct(prod).some(v => Number(v.GodownStock || 0) > 0)).length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('LOW_GODOWN')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'LOW_GODOWN'
                                ? 'bg-white text-rose-800 shadow-none font-bold border border-rose-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 inline mr-1" /><span>গোডাউনে কম</span>
                            {(stockKpis.godownLowCount || 0) > 0 && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-rose-100 text-rose-800 font-bold">
                                {stockKpis.godownLowCount || 0}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('NEED_TRANSFER')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'NEED_TRANSFER'
                                ? 'bg-white text-[#B45309] shadow-none font-bold border border-[#FEF3C7]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline mr-1" /><span>দোকানে ঘাটতি</span>
                            {(stockKpis.needTransferCount || 0) > 0 && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-amber-100 text-[#B45309] font-bold">
                                {stockKpis.needTransferCount}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('IN_SHOP')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                              overviewFilter === 'IN_SHOP'
                                ? 'bg-white text-emerald-900 shadow-none font-bold border border-emerald-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Store className="w-3.5 h-3.5 text-slate-600 inline mr-1" /><span>দোকানে আছে</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                              overviewFilter === 'IN_SHOP' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {stockKpis.shopProductCount || 0}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ভিউ মোড টগল ও অ্যাকশন স্ট্রিপ */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-[#E5E5E5] gap-3">
                    {/* ভিউ মোড ও বিস্তার/সংক্ষেপ */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11.5px] font-bold text-slate-500 whitespace-nowrap">প্রদর্শন মোড:</span>
                        <div className="flex items-center bg-[#F5F5F5] p-1 rounded-md text-xs font-bold border border-[#E5E5E5] shadow-none">
                          <button
                            type="button"
                            onClick={() => setStockViewMode('grouped')}
                            className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
                              stockViewMode === 'grouped'
                                ? 'bg-white shadow-none text-[#0F172A] font-black border border-emerald-200/60'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            <Boxes className="w-3.5 h-3.5 inline mr-1" /><span>পণ্য ভিত্তিক গ্রুপ ভিউ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStockViewMode('variants')}
                            className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
                              stockViewMode === 'variants'
                                ? 'bg-[#0F172A] shadow-none text-white font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>ভ্যারিয়েন্ট বিস্তারিত ভিউ</span>
                          </button>
                        </div>
                      </div>

                      {stockViewMode === 'grouped' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={handleExpandAll}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <span>সকল বিস্তার</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCollapseAll}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-[#F5F5F5] hover:bg-slate-200 border border-[#E5E5E5] rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <span>সংক্ষেপ</span>
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ভিজ্যুয়াল হায়ারার্কি: ১টি মাত্র প্রাইমারি সলিড CTA + আউটলাইন সেকেন্ডারি অ্যাকশনস */}
                    <div className="flex items-center justify-end space-x-2 shrink-0">
                      {/* একক প্রাইমারি সলিড CTA বাটন */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMainTab('transfers');
                          setTransferSubTab('new');
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
                        title="গোডাউন থেকে দোকানে পণ্য পাঠানোর নতুন চালান তৈরি করুন (Alt + N)"
                      >
                        <Truck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+ নতুন চালান</span>
                        <kbd className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300 border border-slate-700">Alt+N</kbd>
                      </button>

                      {/* সেকেন্ডারি আউটলাইন বাটনসমূহ */}
                      {onOpenFabricWastageModal && (
                        <button
                          type="button"
                          onClick={() => onOpenFabricWastageModal()}
                          className="px-3 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none transition-all cursor-pointer shrink-0"
                          title="কাপড়ের ছাঁট ও ড্যামেজ হিসাব ট্র্যাকার ওপেন করুন"
                        >
                          <Scissors className="w-3.5 h-3.5 text-amber-600" />
                          <span>ছাঁট ট্র্যাকার</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => exportLocationStockExcelCSV(products)}
                        className="px-3 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none transition-all cursor-pointer shrink-0"
                        title="স্টক খতিয়ানের এক্সেল ফাইল ডাউনলোড করুন (Alt + E)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>এক্সেল</span>
                        <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.5 bg-[#F5F5F5] text-slate-500 rounded font-mono border border-[#E5E5E5]">Alt+E</kbd>
                      </button>

                      {isShopStockView && (
                        <button
                          type="button"
                          onClick={() => setIsPrintableShopStockAudit(true)}
                          className="px-3 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none transition-all cursor-pointer shrink-0"
                          title="দোকানের ফিজিক্যাল স্টক অডিট ও ফ্লোর গণনা শিট প্রিন্ট করুন (Alt + A)"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
                          <span>গণনা শিট</span>
                          <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.5 bg-[#F5F5F5] text-slate-500 rounded font-mono border border-[#E5E5E5]">Alt+A</kbd>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ইনলাইন এরর ব্যানার (Error State with Retry) */}
                {inlineError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between gap-3 text-xs text-rose-900 animate-in fade-in duration-150 shadow-none">
                    <div className="flex items-center space-x-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">{inlineError.message}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {inlineError.onRetry && (
                        <button
                          type="button"
                          onClick={() => {
                            const fn = inlineError.onRetry;
                            setInlineError(null);
                            if (typeof fn === 'function') fn();
                          }}
                          className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          পুনরায় চেষ্টা করুন
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setInlineError(null)}
                        className="p-1 text-rose-500 hover:text-rose-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ৩. পণ্য স্টক তালিকা টেবিল (Human Pro Sticky Data Grid) */}
                <div className="bg-white rounded-md border border-[#E5E5E5] shadow-none overflow-hidden">
                  <div className="overflow-x-auto max-h-[calc(100vh-23rem)]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-[#FAFAFA]/95  text-slate-700 border-b border-[#E5E5E5] font-bold uppercase tracking-wider text-[11px] shadow-none">
                        <tr>
                          <th className="py-3.5 px-4 min-w-[240px]">
                            {stockViewMode === 'grouped' ? 'পণ্য ও বিবরণ' : 'পণ্য ও ভ্যারিয়েন্ট বিবরণ'}
                          </th>
                          {isShopStockView ? (
                            <>
                              <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-900 font-extrabold min-w-[140px] border-x border-emerald-100/60">
                                <div className="inline-flex items-center space-x-1">
                                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>দোকান ফ্লোর মজুত</span>
                                </div>
                              </th>
                              <th className="py-3 px-4 text-center bg-[#FAFAFA] text-slate-700 font-bold min-w-[130px]">
                                <div className="inline-flex items-center space-x-1">
                                  <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                                  <span>গোডাউন ব্যাকআপ</span>
                                </div>
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-900 font-extrabold min-w-[130px] border-x border-emerald-100/60">
                                <div className="inline-flex items-center space-x-1">
                                  <Warehouse className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>গোডাউন মজুত</span>
                                </div>
                              </th>
                              <th className="py-3 px-4 text-center bg-[#FAFAFA] text-slate-700 font-bold min-w-[140px]">
                                <div className="inline-flex items-center space-x-1">
                                  <Store className="w-3.5 h-3.5 text-slate-500" />
                                  <span>দোকান স্টক</span>
                                </div>
                              </th>
                            </>
                          )}
                          <th className="py-3 px-4 text-center text-slate-800 font-bold min-w-[130px] bg-[#FAFAFA]">
                            <div className="inline-flex items-center space-x-1">
                              <Boxes className="w-3.5 h-3.5 text-slate-500" />
                              <span>মোট মজুত</span>
                            </div>
                          </th>
                          <th className="py-3.5 px-3 text-center text-slate-800 font-bold min-w-[105px]">
                            অবস্থা
                          </th>
                          <th className="py-3.5 px-4 text-right min-w-[155px]">
                            কার্যক্রম
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockViewMode === 'grouped' ? (
                          // =========================================================
                          // ১. গ্রুপড ভিউ (পণ্য ভিত্তিক রো + এক্সপ্যান্ডেবল ভ্যারিয়েন্ট)
                          // =========================================================
                          isLoading ? (
                            <tr>
                              <td colSpan="6" className="p-0">
                                <div className="divide-y divide-slate-100 animate-pulse">
                                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sIdx) => (
                                    <div key={sIdx} className="px-5 py-4 flex items-center justify-between gap-4">
                                      <div className="flex items-center space-x-3 flex-1">
                                        <div className="w-9 h-9 bg-slate-200 rounded-md shrink-0"></div>
                                        <div className="space-y-1.5 flex-1 max-w-xs">
                                          <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
                                          <div className="h-2.5 bg-[#F5F5F5] rounded w-1/2"></div>
                                        </div>
                                      </div>
                                      <div className="h-4 w-24 bg-slate-200 rounded shrink-0"></div>
                                      <div className="h-4 w-28 bg-slate-200 rounded shrink-0"></div>
                                      <div className="h-4 w-20 bg-slate-200 rounded shrink-0"></div>
                                      <div className="h-8 w-24 bg-slate-200 rounded-md shrink-0"></div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ) : filteredOverviewProducts.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-16 text-center">
                                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3 px-4">
                                  <div className="w-12 h-12 rounded-md bg-[#F5F5F5] flex items-center justify-center text-slate-400 border border-[#E5E5E5]">
                                    <SearchX className="w-6 h-6 stroke-[1.75]" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                      {overviewSearch
                                        ? `"${overviewSearch}" এর সাথে মিলে এমন কোনো পণ্য দোকানের বর্তমান মজুতে পাওয়া যায়নি।`
                                        : "নির্বাচিত ফিল্টারে প্রদর্শনের মতো কোনো পণ্য বর্তমানে মজুত নেই।"}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="px-4 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] rounded-md text-xs font-bold transition-all shadow-none cursor-pointer inline-flex items-center space-x-1.5 hover:border-slate-400"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                    <span>সার্চ ও ফিল্টার রিসেট করুন</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredOverviewProducts.map((p) => {
                              const gStock = Number(p.GodownStock || 0);
                              const sStock = Number(p.StockQuantity || 0);
                              const unit = getProductDisplayUnit(p);
                              const isThan = /than|থান/i.test(unit);
                              const isGoj = !isThan && /গজ|yard/i.test(unit);
                              const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
                              const remTh = Number(
        p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
          ? p.RemnantThreshold
          : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
            ? p.remnantThreshold
            : 1)
      );
                              const vars = getVariantsOfProduct(p);
                              const hasVars = vars.length > 0;
                              const isExpanded = Boolean(expandedProductIds[p.ProductID]);
                              const varGStockSum = vars.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0), 0);
                              const varSStockSum = vars.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0), 0);
                              const effectiveGStock = hasVars && varGStockSum > 0 ? varGStockSum : gStock;
                              const effectiveSStock = hasVars && varSStockSum > 0 ? varSStockSum : sStock;

                              // কাপড়ের ভ্যারিয়েন্ট থাকলে প্রতিটি ভ্যারিয়েন্টের আলাদা আস্ত থান ও খোলা গজ হিসাব করা (যাতে ভিন্ন রঙের কাপড় জোড়া না লাগে)
                              const varFullThansSum = hasVars && isThan
                                ? vars.reduce((sum, v) => {
                                    const vQty = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                    const vYpt = Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan;
                                    return sum + (calculateThanBreakdown(vQty, vYpt, remTh).fullThans || 0);
                                  }, 0)
                                : 0;
                              const varRunningCutYardsSum = hasVars && isThan
                                ? vars.reduce((sum, v) => {
                                    const vQty = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                    const vYpt = Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan;
                                    return sum + (calculateThanBreakdown(vQty, vYpt, remTh).runningCutYards || 0);
                                  }, 0)
                                : 0;

                              const bd = isThan ? calculateThanBreakdown(effectiveSStock, yardsPerThan, remTh) : null;
                              const total = isThan
                                ? (effectiveGStock + (hasVars ? varFullThansSum : (bd ? bd.fullThans : 0)))
                                : (effectiveGStock + effectiveSStock);
                              const minAlert = Number(p.MinStockAlert || 5);
                              const isZeroShop = effectiveSStock <= 0;
                              const isLowShop = isThan
                                ? (hasVars
                                    ? (varFullThansSum === 0 || effectiveSStock <= yardsPerThan)
                                    : (bd ? (bd.needsRestock || bd.fullThans === 0 || effectiveSStock <= yardsPerThan) : (effectiveSStock <= minAlert)))
                                : (effectiveSStock <= minAlert);
                              const isUnallocatedShopStock = hasVars && sStock > 0 && varSStockSum === 0;
                              const totalGoj = isThan ? (effectiveGStock * yardsPerThan) : (isGoj ? effectiveGStock : 0);
                              const unitCost = Number(p.CostPrice || p.costPrice || p.PurchasePrice || p.purchasePrice || p.Cost || p.cost || p.BuyingPrice || p.BuyPrice || 0);
                              const unitSelling = Number(p.SellingPrice || p.sellingPrice || p.Price || p.price || p.MRP || p.mrp || 0);
                              const totalGodownCost = isThan
                                ? (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0));
                                        const vYpt = Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan;
                                        const vGoj = vGStock * vYpt;
                                        let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
                                        if (vCost <= 0 && unitCost > 0) vCost = unitCost;
                                        if (unitCost > 0 && vCost > unitCost * 10) vCost = unitCost;
                                        return sum + (vGoj * vCost);
                                      }, 0)
                                    : (totalGoj * unitCost))
                                : isGoj
                                ? (totalGoj * unitCost)
                                : (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0));
                                        let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
                                        if (vCost <= 0 && unitCost > 0) vCost = unitCost;
                                        if (unitCost > 0 && vCost > unitCost * 10) vCost = unitCost;
                                        return sum + (vGStock * vCost);
                                      }, 0)
                                    : (gStock * unitCost));

                              const totalShopCost = isThan
                                ? (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                                        let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
                                        if (vCost <= 0 && unitCost > 0) vCost = unitCost;
                                        if (unitCost > 0 && vCost > unitCost * 10) vCost = unitCost;
                                        return sum + (vSStock * vCost);
                                      }, 0)
                                    : (sStock * unitCost))
                                : isGoj
                                ? (sStock * unitCost)
                                : (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                                        let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
                                        if (vCost <= 0 && unitCost > 0) vCost = unitCost;
                                        if (unitCost > 0 && vCost > unitCost * 10) vCost = unitCost;
                                        return sum + (vSStock * vCost);
                                      }, 0)
                                    : (sStock * unitCost));

                              const totalShopSelling = isThan
                                ? (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                                        const vSell = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : unitSelling));
                                        return sum + (vSStock * vSell);
                                      }, 0)
                                    : (sStock * unitSelling))
                                : isGoj
                                ? (sStock * unitSelling)
                                : (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                                        const vSell = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : unitSelling));
                                        return sum + (vSStock * vSell);
                                      }, 0)
                                    : (sStock * unitSelling));

                              return (
                                <React.Fragment key={p.ProductID}>
                                  <tr className={`hover:bg-emerald-50/15 transition-colors ${isExpanded ? 'bg-emerald-50/20' : ''}`}>
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-start space-x-2.5">
                                        {hasVars ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleExpandProduct(p.ProductID)}
                                            className="mt-0.5 p-1 rounded-lg text-slate-600 bg-[#FAFAFA] hover:bg-emerald-50 hover:text-[#0F172A] border border-[#E5E5E5] transition-all cursor-pointer shadow-none"
                                            title={isExpanded ? 'সংক্ষেপ করুন' : 'ভ্যারিয়েন্ট বিস্তারিত দেখুন'}
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                            )}
                                          </button>
                                        ) : (
                                          <div className="w-6 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-slate-900 text-sm flex items-center space-x-2 flex-wrap gap-y-1">
                                            <span className="truncate">{p.ProductName}</span>
                                            {hasVars && (
                                              <div className="inline-flex items-center space-x-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleExpandProduct(p.ProductID)}
                                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-[#0F172A] border border-emerald-200/70 hover:bg-emerald-100 cursor-pointer transition-colors shadow-none"
                                                >
                                                  <Palette className="w-2.5 h-2.5 mr-1" />
                                                  {vars.length}টি ভ্যারিয়েন্ট
                                                </button>
                                                {/* কালার সোয়াচ প্রিভিউ ডট */}
                                                <div className="flex items-center -space-x-1" title={vars.map(v => v.Attributes?.Color || v.Color).filter(Boolean).join(', ')}>
                                                  {vars.slice(0, 4).map((v, vIdx) => {
                                                    const col = v.Attributes?.Color || v.Color;
                                                    if (!col) return null;
                                                    const hex = getColorHex(col);
                                                    return (
                                                      <span
                                                        key={v.VariantID || vIdx}
                                                        className="inline-block w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-none border border-black/10 shrink-0"
                                                        style={{ backgroundColor: hex || '#94a3b8' }}
                                                        title={col}
                                                      />
                                                    );
                                                  })}
                                                  {vars.length > 4 && (
                                                    <span className="text-[9.5px] font-bold text-slate-400 pl-1 font-mono">
                                                      +{vars.length - 4}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* একীভূত মেটাডাটা সাব-ব্যাজ (ক্যাটাগরি, একক ও আইডি) */}
                                          <div className="mt-1 flex items-center space-x-1.5 flex-wrap gap-y-1">
                                            {p.Category && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5F5F5] text-slate-700 border border-[#E5E5E5]">
                                                {p.Category}
                                              </span>
                                            )}
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-[#0F172A] border border-emerald-200/70 font-mono">
                                              {unit}{isThan && yardsPerThan > 0 ? ` (${yardsPerThan} গজ)` : ''}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                              ID: {p.ProductID} {p.Barcode && String(p.Barcode).trim() !== String(p.ProductID).trim() ? `• #${p.Barcode}` : ''}
                                            </span>
                                          </div>

                                          {/* শুধুমাত্র দোকান মজুত খতিয়ান ট্যাবে কাপড়ের বিস্তারিত বিবরণী প্রদর্শিত হবে */}
                                          {isShopStockView && isThan && (() => {
                                            const ypt = yardsPerThan || 25;
                                            const remTh = Number(
        p.RemnantThreshold !== undefined && p.RemnantThreshold !== null && p.RemnantThreshold !== '' && Number(p.RemnantThreshold) > 0
          ? p.RemnantThreshold
          : (p.remnantThreshold !== undefined && p.remnantThreshold !== null && p.remnantThreshold !== '' && Number(p.remnantThreshold) > 0
            ? p.remnantThreshold
            : 1)
      );
                                            const effectiveShopFullThans = hasVars ? varFullThansSum : (bd ? bd.fullThans : 0);
                                            const effectiveShopCutYards = hasVars ? varRunningCutYardsSum : (bd ? bd.runningCutYards : 0);
                                            const effectiveCutText = hasVars
                                              ? (effectiveShopCutYards > 0 ? formatFabricQuantity(effectiveShopCutYards, 'গজ', false) : '')
                                              : getSafeRunningCutText(bd);
                                            const isEffectiveRemnant = hasVars
                                              ? vars.some(v => {
                                                  const vQty = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                                  return calculateThanBreakdown(vQty, ypt, remTh).isRemnant;
                                                })
                                              : Boolean(bd?.isRemnant);
                                            const zeroShopVars = hasVars ? vars.filter(v => {
                                              const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                              const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
                                              return vS <= 0 && vG > 0;
                                            }) : [];
                                            const needsRestockVars = hasVars ? vars.filter(v => {
                                              const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                              const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
                                              return calculateThanBreakdown(vS, ypt, remTh).needsRestock && vG > 0;
                                            }) : [];
                                            const isEffectiveNeedsRestock = hasVars
                                              ? (needsRestockVars.length > 0 || (effectiveShopFullThans === 0 && effectiveGStock > 0))
                                              : Boolean(bd?.needsRestock && effectiveGStock > 0);

                                            return (
                                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                                <span className="inline-flex items-center space-x-1 text-slate-600 bg-[#F5F5F5] px-2 py-0.5 rounded text-[11px] font-medium border border-[#E5E5E5]">
                                                  <Layers className="w-3 h-3 text-slate-500" />
                                                  <span>১ থান = {ypt} গজ</span>
                                                </span>

                                                {effectiveShopFullThans > 0 ? (
                                                  <span className="inline-flex items-center text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 font-semibold font-mono">
                                                    দোকানে {effectiveShopFullThans}টি আস্ত থান {effectiveShopCutYards > 0 ? `+ টেবিলে ${effectiveCutText} কাটা` : ''}
                                                  </span>
                                                ) : effectiveShopCutYards > 0 ? (
                                                  <span className="inline-flex items-center text-[#B45309] bg-[#FFFBEB] px-2 py-0.5 rounded text-[11px] border border-[#FEF3C7] font-semibold font-mono">
                                                    দোকানে ০টি আস্ত থান (টেবিলে {effectiveCutText} কাটা)
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200 font-semibold">
                                                    দোকানে থান বা গজ নেই
                                                  </span>
                                                )}

                                                {isEffectiveRemnant && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (!onOpenFabricWastageModal) return;
                                                      if (hasVars && Array.isArray(vars)) {
                                                        const remVar = vars.find(v => {
                                                          const vQty = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                                          return calculateThanBreakdown(vQty, yardsPerThan, remTh).isRemnant;
                                                        });
                                                        if (remVar) {
                                                          const vQty = Number(remVar.StockQuantity !== undefined ? remVar.StockQuantity : (remVar.stockQuantity || 0)) || 0;
                                                          const vBd = calculateThanBreakdown(vQty, yardsPerThan, remTh);
                                                          const varLabel = remVar.Attributes?.Color || remVar.Color || remVar.VariantName || 'ভ্যারিয়েন্ট';
                                                    onOpenFabricWastageModal({
                                                      ProductID: p.ProductID,
                                                      VariantID: remVar.VariantID || remVar.variantId || remVar.Barcode || varLabel,
                                                      VariantName: varLabel,
                                                      Barcode: remVar.Barcode || p.Barcode,
                                                      ProductName: `${p.ProductName} - ${varLabel}`,
                                                      remnantYards: vBd.runningCutYards
                                                    });
                                                          return;
                                                        }
                                                      }
                                                      onOpenFabricWastageModal({
                                                        ProductID: p.ProductID,
                                                        ProductName: p.ProductName,
                                                        remnantYards: effectiveShopCutYards
                                                      });
                                                    }}
                                                    className="inline-flex items-center space-x-1 text-[#B45309] bg-[#FFFBEB] hover:bg-amber-100 px-2 py-0.5 rounded border border-[#FEF3C7] font-semibold text-[11px] cursor-pointer transition-colors"
                                                    title="এই কাপড়ের ছাঁট রেকর্ড বা বান্ডেল তৈরি করতে ক্লিক করুন"
                                                  >
                                                    <Scissors className="w-3 h-3 text-amber-600" />
                                                    <span>ছাঁট রেকর্ড</span>
                                                  </button>
                                                )}
                                                {zeroShopVars.length > 0 && (
                                                  <span className="inline-flex items-center space-x-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold text-[11px]" title="দোকানে এই ভ্যারিয়েন্টের কোনো মজুত নেই, গোডাউন থেকে চালান দিন">
                                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                                    <span>{zeroShopVars.map(v => v.Attributes?.Color || v.Color || v.VariantName || 'ভ্যারিয়েন্ট').join(', ')} শেষ (গোডাউনে আছে)</span>
                                                  </span>
                                                )}
                                                {isEffectiveNeedsRestock && (
                                                  <span className="inline-flex items-center space-x-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold text-[11px]">
                                                    <Truck className="w-3 h-3 text-rose-600" />
                                                    <span>{hasVars && needsRestockVars.length > 0 ? `${needsRestockVars.map(v => v.Attributes?.Color || v.Color || v.VariantName || 'ভ্যারিয়েন্ট').join(', ')}: ` : ''}নতুন থান চালান প্রয়োজন</span>
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </td>
                                    {/* কলাম ২ ও ৩: দোকান স্টক ভিউতে দোকান আগে (হিরো), গোডাউন ভিউতে গোডাউন আগে */}
                                    {isShopStockView ? (
                                      <>
                                        {/* দোকান ফ্লোর মজুত - হিরো কলাম */}
                                        <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                                          <div className="flex flex-col items-center">
                                            <div className={`text-sm font-bold font-mono tracking-tight tabular-nums ${
                                              isZeroShop
                                                ? 'text-rose-600 font-black'
                                                : isLowShop
                                                ? 'text-amber-700 font-black'
                                                : 'text-slate-900'
                                            }`}>
                                              {isThan ? (
                                                effectiveSStock <= 0 ? '০ গজ' : (
                                                  (() => {
                                                    if (hasVars) {
                                                      if (varFullThansSum > 0 && varRunningCutYardsSum > 0) {
                                                        return `${varFullThansSum} থান + ${formatFabricQuantity(varRunningCutYardsSum, 'গজ', false)}`;
                                                      }
                                                      if (varFullThansSum > 0) return `${varFullThansSum} থান`;
                                                      return formatFabricQuantity(varRunningCutYardsSum, 'গজ', false) || `${effectiveSStock} গজ`;
                                                    }
                                                    const effBd = calculateThanBreakdown(effectiveSStock, yardsPerThan, remTh);
                                                    if (effBd.fullThans > 0 && effBd.runningCutYards > 0) {
                                                      return `${effBd.fullThans} থান + ${getSafeRunningCutText(effBd)}`;
                                                    }
                                                    if (effBd.fullThans > 0) return `${effBd.fullThans} থান`;
                                                    return getSafeRunningCutText(effBd) || `${effectiveSStock} গজ`;
                                                  })()
                                                )
                                              ) : (
                                                `${effectiveSStock.toLocaleString('bn-BD')} ${unit}`
                                              )}
                                            </div>
                                            {isThan && effectiveSStock > 0 && (
                                              <span className="mt-0.5 text-[10.5px] font-semibold text-emerald-800 font-mono" title="দোকানের মোট কাপড় (গজে)">
                                                মোট: {effectiveSStock.toLocaleString('bn-BD')} গজ
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* গোডাউন ব্যাকআপ - সেকেন্ডারি রেফারেন্স */}
                                        <td className="py-3 px-4 text-center bg-[#FAFAFA]">
                                          <div className="flex flex-col items-center">
                                            <span className={`text-xs font-mono font-bold tabular-nums ${
                                              effectiveGStock > 0
                                                ? 'text-slate-800'
                                                : 'text-slate-400'
                                            }`}>
                                              {effectiveGStock > 0 ? effectiveGStock.toLocaleString('bn-BD') : '০'} {isThan ? 'থান' : unit}
                                            </span>
                                            {isThan && yardsPerThan > 0 && effectiveGStock > 0 && (
                                              <span className="mt-0.5 text-[10px] text-slate-500 font-mono">
                                                ({(effectiveGStock * yardsPerThan).toLocaleString('bn-BD')} গজ)
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        {/* গোডাউন স্টক - হিরো কলাম */}
                                        <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                                          <div className="flex flex-col items-center">
                                            <div className={`text-sm font-bold font-mono tracking-tight tabular-nums ${
                                              effectiveGStock > 0 ? 'text-slate-900' : 'text-slate-400'
                                            }`}>
                                              <span>{effectiveGStock > 0 ? effectiveGStock.toLocaleString('bn-BD') : '০'}</span>
                                              <span className="text-xs font-semibold text-emerald-800 ml-1">{isThan ? 'থান' : unit}</span>
                                            </div>
                                            {isThan && yardsPerThan > 0 && effectiveGStock > 0 && (
                                              <span className="mt-0.5 text-[10.5px] font-semibold text-[#0F172A] font-mono">
                                                ({(effectiveGStock * yardsPerThan).toLocaleString('bn-BD')} গজ)
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* দোকান স্টক - সেকেন্ডারি রেফারেন্স */}
                                        <td className="py-3 px-4 text-center bg-[#FAFAFA]">
                                          <div className="flex flex-col items-center">
                                            <span className={`text-xs font-mono font-bold tabular-nums ${
                                              isZeroShop ? 'text-rose-600' : isLowShop ? 'text-amber-700' : 'text-slate-800'
                                            }`}>
                                              {isThan ? (
                                                effectiveSStock <= 0 ? '০ গজ' : (
                                                  (() => {
                                                    if (hasVars) {
                                                      if (varFullThansSum > 0 && varRunningCutYardsSum > 0) {
                                                        return `${varFullThansSum} থান + ${formatFabricQuantity(varRunningCutYardsSum, 'গজ', false)}`;
                                                      }
                                                      if (varFullThansSum > 0) return `${varFullThansSum} থান`;
                                                      return formatFabricQuantity(varRunningCutYardsSum, 'গজ', false) || `${effectiveSStock} গজ`;
                                                    }
                                                    const effBd = calculateThanBreakdown(effectiveSStock, yardsPerThan, remTh);
                                                    if (effBd.fullThans > 0 && effBd.runningCutYards > 0) {
                                                      return `${effBd.fullThans} থান + ${getSafeRunningCutText(effBd)}`;
                                                    }
                                                    if (effBd.fullThans > 0) return `${effBd.fullThans} থান`;
                                                    return getSafeRunningCutText(effBd) || `${effectiveSStock} গজ`;
                                                  })()
                                                )
                                              ) : (
                                                `${effectiveSStock.toLocaleString('bn-BD')} ${unit}`
                                              )}
                                            </span>
                                            {isThan && effectiveSStock > 0 && (
                                              <span className="mt-0.5 text-[10px] text-slate-500 font-mono" title="দোকানের মোট কাপড় (গজে)">
                                                মোট: {effectiveSStock.toLocaleString('bn-BD')} গজ
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </>
                                    )}

                                    {/* মোট স্টক - পরিচ্ছন্ন সংখ্যা ও মেটাডাটা */}
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                                          {isThan ? (
                                            (() => {
                                              const shopThans = hasVars ? varFullThansSum : (bd ? bd.fullThans : 0);
                                              const cutStr = hasVars
                                                ? (varRunningCutYardsSum > 0 ? formatFabricQuantity(varRunningCutYardsSum, 'গজ', false) : '')
                                                : (bd ? getSafeRunningCutText(bd) : '');
                                              const totalFullThans = effectiveGStock + shopThans;
                                              const hasRunningCut = Boolean(cutStr);
                                              if (totalFullThans <= 0 && !hasRunningCut) return '০ গজ';
                                              if (totalFullThans > 0 && hasRunningCut) {
                                                return `${totalFullThans} থান + ${cutStr}`;
                                              }
                                              if (totalFullThans > 0) return `${totalFullThans} থান`;
                                              return cutStr || '০ গজ';
                                            })()
                                          ) : (
                                            `${total.toLocaleString('bn-BD')} ${unit}`
                                          )}
                                        </span>
                                        {isThan && (
                                          <span className="mt-0.5 text-[10px] text-slate-500 font-mono" title="গোডাউন ও দোকান মিলিয়ে মোট গজ">
                                            মোট: {((effectiveGStock * yardsPerThan) + effectiveSStock).toLocaleString('bn-BD')} গজ
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* অবস্থা - সলিড ডট ইনডিকেটর পিল */}
                                    <td className="py-3 px-3 text-center">
                                      {isUnallocatedShopStock ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]" title="মূল পণ্যে দোকান স্টক রয়েছে কিন্তু ভ্যারিয়েন্টে বণ্টন করা হয়নি">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFBEB]0" />
                                          <span>ভ্যারিয়েন্টে অবণ্টিত</span>
                                        </span>
                                      ) : isZeroShop && effectiveGStock > 0 ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFBEB]0" />
                                          <span>দোকানে আনুন</span>
                                        </span>
                                      ) : isZeroShop && effectiveGStock <= 0 ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          <span>স্টক শেষ</span>
                                        </span>
                                      ) : isLowShop && effectiveGStock > 0 ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFBEB]0" />
                                          <span>দোকানে কম</span>
                                        </span>
                                      ) : hasVars && vars.some(v => {
                                        const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                        const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
                                        return vS <= 0 && vG > 0;
                                      }) ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200" title="দোকানে কিছু ভ্যারিয়েন্ট শেষ হলেও গোডাউনে মজুত আছে">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          <span>ভ্যারিয়েন্ট শেষ</span>
                                        </span>
                                      ) : hasVars && vars.some(v => {
                                        const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                        const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
                                        const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
                                        const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 1);
                                        return isThan && calculateThanBreakdown(vS, ypt, remTh).needsRestock && vG > 0;
                                      }) ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200" title="কিছু ভ্যারিয়েন্টে নতুন থান চালান প্রয়োজন">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          <span>থান প্রয়োজন</span>
                                        </span>
                                      ) : hasVars && vars.some(v => (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0) <= 2) ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200" title="কিছু ভ্যারিয়েন্টে গোডাউন স্টক কম রয়েছে">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          <span>ভ্যারিয়েন্টে কম</span>
                                        </span>
                                      ) : effectiveGStock <= minAlert ? (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          <span>গোডাউনে কম</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          <span>পর্যাপ্ত</span>
                                        </span>
                                      )}
                                    </td>

                                    {/* কার্যক্রম - স্লীক প্রাইমারি চালান বাটন ও আইকন গ্রুপ */}
                                    <td className="py-3.5 px-4 text-right">
                                      <div className="flex items-center justify-end space-x-1.5">
                                        <button
                                          type="button"
                                          disabled={effectiveGStock <= 0}
                                          onClick={() => handleOpenDirectTransfer(p)}
                                          className={`px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center space-x-1.5 shadow-none transition-all ${
                                            effectiveGStock <= 0
                                              ? 'bg-[#F5F5F5] text-slate-400 border border-[#E5E5E5] cursor-not-allowed shadow-none'
                                              : 'bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-white cursor-pointer shadow-emerald-600/20'
                                          }`}
                                          title={effectiveGStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে দোকানে পণ্য আনুন'}
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          <span>চালান</span>
                                        </button>
                                        <div className="flex items-center bg-[#FAFAFA] p-1 rounded-md border border-[#E5E5E5]/90 shadow-none">
                                          <button
                                            type="button"
                                            onClick={() => setPrintStickerProduct(p)}
                                            className="p-1.5 hover:bg-white hover:text-[#0F172A] text-slate-500 rounded-lg text-xs transition-colors cursor-pointer"
                                            title="প্রাইস ট্যাগ / বারকোড স্টিকার প্রিন্ট করুন"
                                          >
                                            <Printer className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAdjustTargetProduct(p);
                                              setAdjustLocation(isShopStockView ? 'Shop' : 'Godown');
                                              setAdjustAction(isShopStockView ? 'DEDUCT' : 'ADD');
                                              setAdjustReason(isShopStockView ? 'দোকানে কাটা/নষ্ট/স্যাম্পল' : 'নতুন লট গোডাউনে আগমন');
                                              setAdjustQty(1);
                                            }}
                                            className="p-1.5 hover:bg-white hover:text-amber-600 text-slate-500 rounded-lg text-xs transition-colors cursor-pointer"
                                            title={isShopStockView ? 'দোকানের কাউন্টার স্টক সংশোধন বা সমন্বয়' : 'গোডাউন স্টক সংশোধন বা সমন্বয়'}
                                          >
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                          </button>
                                          {isThan && onOpenFabricWastageModal && (!hasVars ? Boolean(bd && bd.isRemnant) : vars.some(v => {
                                            const vQty = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                            return calculateThanBreakdown(vQty, yardsPerThan, remTh).isRemnant;
                                          })) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (hasVars) {
                                                  const remVar = vars.find(v => {
                                                    const vQty = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
                                                    return calculateThanBreakdown(vQty, yardsPerThan, remTh).isRemnant;
                                                  });
                                                  if (remVar) {
                                                    const varLabel = remVar.Attributes?.Color || remVar.Color || remVar.VariantName || 'ভ্যারিয়েন্ট';
                                                    onOpenFabricWastageModal({
                                                      ProductID: p.ProductID,
                                                      VariantID: remVar.VariantID || remVar.variantId || remVar.Barcode || varLabel,
                                                      VariantName: varLabel,
                                                      Barcode: remVar.Barcode || p.Barcode,
                                                      ProductName: `${p.ProductName} - ${varLabel}`,
                                                      remnantYards: vBd.runningCutYards
                                                    });
                                                    return;
                                                  }
                                                }
                                                onOpenFabricWastageModal({
                                                  ProductID: p.ProductID,
                                                  ProductName: p.ProductName,
                                                  Barcode: p.Barcode,
                                                  remnantYards: bd ? bd.runningCutYards : 0
                                                });
                                              }}
                                              className="p-1.5 hover:bg-amber-100 hover:text-[#B45309] text-amber-700 bg-[#FFFBEB] rounded-lg text-xs transition-colors cursor-pointer border border-[#FEF3C7]"
                                              title="এই কাপড়ের শেষ ছাঁট রেকর্ড করুন"
                                            >
                                              <Scissors className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {onEditProduct && (
                                            <button
                                              type="button"
                                              onClick={() => onEditProduct(p)}
                                              className="p-1.5 hover:bg-white hover:text-[#0F172A] text-slate-500 rounded-lg text-xs transition-colors cursor-pointer"
                                              title="পণ্য এডিট করুন"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {!isShopStockView && onDeleteProduct && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmDialog({
                                                  title: 'পণ্য মুছে ফেলা নিশ্চিতকরণ',
                                                  message: `আপনি কি নিশ্চিত যে '${p.ProductName}' পণ্যটি মুছে ফেলতে চান?\n\nএতে পণ্যটি এবং সংশ্লিষ্ট সকল মজুদ তথ্য ডাটাবেস থেকে মুছে যাবে।`,
                                                  confirmLabel: 'হ্যাঁ, পণ্য মুছে ফেলুন',
                                                  cancelLabel: 'না, ফিরে যান',
                                                  isDestructive: true,
                                                  onConfirm: () => {
                                                    onDeleteProduct(p.ProductID);
                                                    showToast(`'${p.ProductName}' পণ্যটি মুছে ফেলা হয়েছে।`, 'info');
                                                  }
                                                });
                                              }}
                                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg text-xs transition-colors cursor-pointer"
                                              title="পণ্যটি সম্পূর্ণ মুছে ফেলুন (Delete)"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* ভ্যারিয়েন্ট বিস্তারিত সাব-টেবিল */}
                                  {hasVars && isExpanded && (
                                    <tr className="bg-[#FAFAFA]/60 border-y border-[#E5E5E5]">
                                      <td colSpan="6" className="p-3 pl-6 sm:pl-10">
                                        {(() => {
                                          const sumVarGodown = vars.reduce((s, item) => s + (Number(item.GodownStock) || 0), 0);
                                          const sumVarShop = vars.reduce((s, item) => s + (Number(item.StockQuantity) || 0), 0);
                                          const pGodown = Number(p.GodownStock) || 0;
                                          const pShop = Number(p.StockQuantity) || 0;
                                          const isMismatch = (sumVarGodown !== pGodown) || (sumVarShop !== pShop);

                                          return (
                                            <div className="bg-white rounded-md border border-[#E5E5E5] overflow-hidden shadow-none">
                                              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center space-x-2">
                                                  <span className="p-1.5 rounded-lg bg-[#0F172A] text-white shadow-none">
                                                    <Palette className="w-3.5 h-3.5" />
                                                  </span>
                                                  <span className="text-xs font-bold text-slate-800">{p.ProductName} — ভ্যারিয়েন্ট অনুযায়ী আলাদা মজুত</span>
                                                  <span className="text-[11px] text-slate-600 bg-[#F5F5F5] border border-[#E5E5E5] px-2 py-0.5 rounded-md font-semibold">
                                                    মোট {vars.length}টি ভ্যারিয়েন্ট
                                                  </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-xs">
                                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#0F172A] font-semibold border border-emerald-200/80">
                                                    ভ্যারিয়েন্ট গোডাউন মোট: <strong className="font-mono font-bold">{sumVarGodown}</strong> {isThan ? 'থান' : getProductDisplayUnit(p)}
                                                  </span>
                                                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F5F5] text-slate-700 font-semibold border border-[#E5E5E5]">
                                                    ভ্যারিয়েন্ট দোকান মোট: <strong className="font-mono font-bold">{sumVarShop}</strong> {isThan ? 'গজ' : getProductDisplayUnit(p)}
                                                    {isThan && varFullThansSum > 0 && ` (${varFullThansSum}টি আস্ত থান${varRunningCutYardsSum > 0 ? ` + ${formatFabricQuantity(varRunningCutYardsSum, 'গজ', false)} খোলা` : ''})`}
                                                  </span>
                                                  {!isShopStockView && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenNewColor(p)}
                                                      className="px-3 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg font-semibold inline-flex items-center space-x-1 shadow-none cursor-pointer transition-all"
                                                      title="এই পণ্যে নতুন একটি ভ্যারিয়েন্ট যোগ করুন"
                                                    >
                                                      <Plus className="w-3 h-3" />
                                                      <span>নতুন ভ্যারিয়েন্ট যোগ</span>
                                                    </button>
                                                  )}
                                                </div>
                                              </div>

                                              {/* গরমিল নোটিশ ও ১-ক্লিক সমাধান বাটন */}
                                              {isMismatch && (
                                                <div className="px-3 py-2 bg-[#FFFBEB]/95 border-b border-[#FEF3C7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                  <div className="flex items-center space-x-2 text-[#B45309]">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                    <div>
                                                      <span className="font-bold">স্টক অমিল রয়েছে:</span>{' '}
                                                      <span>মূল গোডাউন: <strong className="font-mono text-slate-900">{pGodown}</strong> vs ভ্যারিয়েন্ট গোডাউন: <strong className="font-mono text-[#0F172A]">{sumVarGodown}</strong></span>
                                                      {pShop !== sumVarShop && (
                                                        <span className="ml-2 font-medium">| মূল দোকান: <strong className="font-mono text-slate-900">{pShop}</strong> vs ভ্যারিয়েন্ট দোকান: <strong className="font-mono text-slate-700">{sumVarShop}</strong></span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center space-x-1.5 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDistributeParentStockToVariants(p)}
                                                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-none transition-all"
                                                      title="মূল গোডাউন স্টক সকল ভ্যারিয়েন্টে সমানভাবে বণ্টন করুন"
                                                    >
                                                      <Sparkles className="w-3 h-3" />
                                                      <span>ভ্যারিয়েন্টে সমান বণ্টন</span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleSyncParentFromVariants(p)}
                                                      className="px-2.5 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-none transition-all"
                                                      title="ভ্যারিয়েন্টগুলোর বর্তমান যোগফল দিয়ে মূল পণ্যের স্টক আপডেট করুন"
                                                    >
                                                      <RefreshCw className="w-3 h-3" />
                                                      <span>যোগফল দিয়ে সিঙ্ক</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                              <table className="w-full text-xs text-left">
                                                <thead className="bg-[#FAFAFA] text-slate-600 font-bold uppercase text-[10px] border-b border-[#E5E5E5]">
                                                  <tr>
                                                    <th className="py-2.5 px-3">ভ্যারিয়েন্ট বিবরণ (রং / সাইজ)</th>
                                                    <th className="py-2.5 px-3">বারকোড</th>
                                                    {isShopStockView ? (
                                                      <>
                                                        <th className="py-2.5 px-3 text-center bg-emerald-50/60 text-emerald-900 font-bold border-x border-emerald-100/50">
                                                          <div className="inline-flex items-center space-x-1">
                                                            <Store className="w-3 h-3 text-emerald-700" />
                                                            <span>দোকান ফ্লোর</span>
                                                          </div>
                                                        </th>
                                                        <th className="py-2.5 px-3 text-center bg-[#FAFAFA] text-slate-700 font-bold">
                                                          <div className="inline-flex items-center space-x-1">
                                                            <Warehouse className="w-3 h-3 text-slate-500" />
                                                            <span>গোডাউন ব্যাকআপ</span>
                                                          </div>
                                                        </th>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <th className="py-2.5 px-3 text-center bg-emerald-50/50 text-emerald-900 font-bold border-x border-emerald-100/50">
                                                          <div className="inline-flex items-center space-x-1">
                                                            <Warehouse className="w-3 h-3 text-emerald-700" />
                                                            <span>গোডাউন স্টক</span>
                                                          </div>
                                                        </th>
                                                        <th className="py-2.5 px-3 text-center bg-[#FAFAFA] text-slate-700 font-bold">
                                                          <div className="inline-flex items-center space-x-1">
                                                            <Store className="w-3 h-3 text-slate-500" />
                                                            <span>দোকান স্টক</span>
                                                          </div>
                                                        </th>
                                                      </>
                                                    )}
                                                    <th className="py-2.5 px-3 text-center">
                                                      <div className="inline-flex items-center space-x-1">
                                                        <Boxes className="w-3 h-3 text-slate-500" />
                                                        <span>মোট</span>
                                                      </div>
                                                    </th>
                                                    <th className="py-2.5 px-3 text-center">অবস্থা</th>
                                                    <th className="py-2.5 px-3 text-right">{isShopStockView ? 'নির্দিষ্ট চালান' : 'কার্যক্রম'}</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {vars.map((v, vIdx) => {
                                                    const vGStock = Number(v.GodownStock) || 0;
                                                    const vSStock = Number(v.StockQuantity) || 0;
                                                    let vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost)) || 0;
                                                    if (vCost <= 0 && unitCost > 0) vCost = unitCost;
                                                    if (unitCost > 0 && vCost > unitCost * 10) vCost = unitCost;
                                                    const vColor = v.Attributes?.Color || v.Color || '';
                                                    const vSize = v.Attributes?.Size || v.Size || '';
                                                    const vYpt = isThan ? (Number(v.YardsPerThan || v.yardsPerThan || 0) || yardsPerThan) : 0;
                                                    const vBd = isThan ? calculateThanBreakdown(vSStock, vYpt, remTh) : null;
                                                    const vTotal = isThan ? (vGStock + (vBd ? vBd.fullThans : 0)) : (vGStock + vSStock);
                                                    const isVZero = vSStock <= 0;
                                                    const isVLow = isThan
                                                      ? (vBd ? (vBd.needsRestock || vBd.fullThans === 0 || vSStock <= vYpt) : (vSStock <= 2))
                                                      : (vSStock <= 2);
                                                    const hexColor = getColorHex(vColor);

                                                    return (
                                                      <tr key={v.VariantID || vIdx} className="hover:bg-emerald-50/15 transition-colors">
                                                        <td className="py-2.5 px-3">
                                                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                                            {vColor && (
                                                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-[#E5E5E5] shadow-none">
                                                                <span
                                                                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                                                  style={{ backgroundColor: hexColor }}
                                                                />
                                                                <span>রং: {vColor}</span>
                                                                {isThan && Number(v.YardsPerThan || v.yardsPerThan || 0) > 0 && (
                                                                  <span className="text-[10px] font-bold text-amber-700 bg-[#FFFBEB] px-1.5 py-0.2 rounded border border-[#FEF3C7]" title="এই ভ্যারিয়েন্টের বিশেষ থানের সাইজ">
                                                                    {Number(v.YardsPerThan || v.yardsPerThan)} গজ/থান
                                                                  </span>
                                                                )}
                                                               </span>
                                                            )}
                                                            {vSize && (
                                                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                সাইজ: {vSize}
                                                              </span>
                                                            )}
                                                            {v.Attributes && Object.entries(v.Attributes).map(([key, val]) => {
                                                              if (key === 'Color' || key === 'Size') return null;
                                                              return (
                                                                <span key={key} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F5F5] text-slate-600">
                                                                  {key}: {val}
                                                                </span>
                                                              );
                                                            })}
                                                          </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono text-[10.5px] text-slate-500">
                                                          {v.Barcode || p.Barcode || '—'}
                                                        </td>
                                                        {/* ভ্যারিয়েন্ট স্টক কলাম: দোকান ভিউতে দোকান আগে (হিরো), গোডাউন ভিউতে গোডাউন আগে */}
                                                        {isShopStockView ? (
                                                          <>
                                                            {/* ভ্যারিয়েন্ট দোকান ফ্লোর স্টক - হিরো কলাম */}
                                                            <td className="py-2.5 px-3 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                                                              <div className="flex flex-col items-center">
                                                                <span className={`text-xs font-mono font-bold tabular-nums ${
                                                                  isVZero
                                                                    ? 'text-rose-600 font-black'
                                                                    : isVLow
                                                                    ? 'text-amber-700 font-black'
                                                                    : 'text-slate-900'
                                                                }`}>
                                                                  {isThan ? (
                                                                    vSStock <= 0 ? '০ গজ' : (
                                                                      vBd && vBd.fullThans > 0 && vBd.runningCutYards > 0
                                                                        ? `${vBd.fullThans} থান + ${getSafeRunningCutText(vBd)}`
                                                                        : vBd && vBd.fullThans > 0
                                                                        ? `${vBd.fullThans} থান`
                                                                        : vBd && vBd.runningCutYards > 0
                                                                        ? `${getSafeRunningCutText(vBd)}`
                                                                        : `${vSStock} গজ`
                                                                      )
                                                                    ) : (
                                                                      `${vSStock} ${unit}`
                                                                    )}
                                                                </span>
                                                                {isThan && vSStock > 0 && (
                                                                  <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 font-mono">
                                                                    মোট: {vSStock.toLocaleString('bn-BD')} গজ
                                                                  </span>
                                                                )}
                                                                {isThan && vBd && vBd.isRemnant && (
                                                                  <span className="inline-flex items-center space-x-0.5 text-[#B45309] bg-[#FFFBEB] px-1.5 py-0.2 rounded text-[9.5px] font-semibold border border-[#FEF3C7] mt-0.5">
                                                                    <Scissors className="w-2.5 h-2.5 text-amber-600" />
                                                                    <span>শেষ ছাঁট</span>
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* ভ্যারিয়েন্ট গোডাউন ব্যাকআপ - সেকেন্ডারি রেফারেন্স */}
                                                            <td className="py-2.5 px-3 text-center bg-[#FAFAFA]">
                                                              <div className="flex flex-col items-center">
                                                                <span className={`text-xs font-mono font-bold tabular-nums ${
                                                                  vGStock > 0 ? 'text-slate-800' : 'text-slate-400'
                                                                }`}>
                                                                  {vGStock} {isThan ? 'থান' : unit}
                                                                </span>
                                                                {isThan && vYpt > 0 && vGStock > 0 && (
                                                                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                                    ({(vGStock * vYpt).toLocaleString('bn-BD')} গজ)
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </td>
                                                          </>
                                                        ) : (
                                                          <>
                                                            {/* ভ্যারিয়েন্ট গোডাউন স্টক - হিরো কলাম */}
                                                            <td className="py-2.5 px-3 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                                                              <div className="inline-flex flex-col items-center">
                                                                <span className={`text-xs font-mono font-bold tabular-nums ${
                                                                  vGStock > 0 ? 'text-[#0F172A]' : 'text-slate-400'
                                                                }`}>
                                                                  {vGStock} {isThan ? 'থান' : unit}
                                                                </span>
                                                                {isThan && vYpt > 0 && vGStock > 0 && (
                                                                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono">
                                                                    ({(vGStock * vYpt).toLocaleString('bn-BD')} গজ)
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* ভ্যারিয়েন্ট দোকান স্টক - সেকেন্ডারি রেফারেন্স */}
                                                            <td className="py-2.5 px-3 text-center bg-[#FAFAFA]/40">
                                                              <div className="inline-flex flex-col items-center">
                                                                <span className={`text-xs font-mono font-bold tabular-nums ${
                                                                  isVZero ? 'text-rose-600' : isVLow ? 'text-amber-700' : 'text-slate-800'
                                                                }`}>
                                                                  {isThan ? (
                                                                    vSStock <= 0 ? '০ গজ' : (
                                                                      vBd && vBd.fullThans > 0 && vBd.runningCutYards > 0
                                                                        ? `${vBd.fullThans} থান + ${getSafeRunningCutText(vBd)}`
                                                                        : vBd && vBd.fullThans > 0
                                                                        ? `${vBd.fullThans} থান`
                                                                        : vBd && vBd.runningCutYards > 0
                                                                        ? `${getSafeRunningCutText(vBd)}`
                                                                        : `${vSStock} গজ`
                                                                      )
                                                                    ) : (
                                                                      `${vSStock} ${unit}`
                                                                    )}
                                                                </span>
                                                                {isThan && vSStock > 0 && (
                                                                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono">
                                                                    মোট: {vSStock.toLocaleString('bn-BD')} গজ
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </td>
                                                          </>
                                                        )}
                                                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                                                          {isThan ? (
                                                            (() => {
                                                              const vTotalThans = vGStock + (vBd ? vBd.fullThans : 0);
                                                              const vTotalAllYards = (vGStock * yardsPerThan) + vSStock;
                                                              const hasRunningCut = vBd && vBd.runningCutYards > 0;
                                                              const cutStr = getSafeRunningCutText(vBd);
                                                              return (
                                                                <div className="flex flex-col items-center">
                                                                  <span className="text-xs font-mono font-bold text-slate-800">
                                                                    {vTotalThans <= 0 && !hasRunningCut
                                                                      ? '০ গজ'
                                                                      : vTotalThans > 0 && hasRunningCut
                                                                      ? `${vTotalThans} থান + ${cutStr}`
                                                                      : vTotalThans > 0
                                                                      ? `${vTotalThans} থান`
                                                                      : (cutStr || '০ গজ')}
                                                                  </span>
                                                                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                                    ({vTotalAllYards.toLocaleString('bn-BD')} গজ)
                                                                  </span>
                                                                </div>
                                                              );
                                                            })()
                                                          ) : (
                                                            <span className="text-xs font-mono font-bold text-slate-800">
                                                              {vTotal} {unit}
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                          {isVZero && vGStock > 0 ? (
                                                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-[#FFFBEB]0" />
                                                              <span>দোকানে নেই</span>
                                                            </span>
                                                          ) : isVZero && vGStock <= 0 ? (
                                                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                              <span>শেষ</span>
                                                            </span>
                                                          ) : isThan && vBd?.needsRestock && vGStock > 0 ? (
                                                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 shadow-none" title="টেবিলে কাপড়ের শেষ কাটা গজ চলছে, গোডাউন থেকে নতুন থান আনুন">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                              <span>থান প্রয়োজন</span>
                                                            </span>
                                                          ) : (
                                                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                              <span>উপলব্ধ</span>
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                          <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                              type="button"
                                                              disabled={vGStock <= 0}
                                                              onClick={() => handleOpenDirectTransfer(p, v)}
                                                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-all shadow-none ${
                                                                vGStock <= 0
                                                                  ? 'bg-[#F5F5F5] text-slate-400 border border-[#E5E5E5] cursor-not-allowed shadow-none'
                                                                  : 'bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-white cursor-pointer shadow-emerald-100'
                                                              }`}
                                                              title={vGStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে এই ভ্যারিয়েন্ট দোকানে আনুন'}
                                                            >
                                                              <Truck className="w-3 h-3" />
                                                              <span>চালান</span>
                                                            </button>
                                                            {isShopStockView ? (
                                                              <>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    const vCol = v.Attributes?.Color || v.Color || '';
                                                                    const vSz = v.Attributes?.Size || v.Size || '';
                                                                    const vN = [p.ProductName, vCol, vSz].filter(Boolean).join(' - ');
                                                                    setPrintStickerProduct({
                                                                      ...p,
                                                                      ProductName: vN,
                                                                      Barcode: v.Barcode || p.Barcode,
                                                                      SellingPrice: v.SellingPrice || p.SellingPrice,
                                                                      Price: v.SellingPrice || p.SellingPrice
                                                                    });
                                                                  }}
                                                                  className="p-1 bg-[#FAFAFA] hover:bg-[#0F172A]/10 text-slate-600 hover:text-[#0F172A] border border-[#E5E5E5] rounded-lg text-xs transition-all cursor-pointer"
                                                                  title="এই ভ্যারিয়েন্টের প্রাইস ট্যাগ বা স্টিকার প্রিন্ট করুন"
                                                                >
                                                                  <Printer className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenVariantRestock(p, v, vIdx, 'Shop')}
                                                                  className="px-2 py-1 bg-[#FFFBEB] hover:bg-amber-100 text-[#B45309] border border-[#FEF3C7] rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                                  title="দোকানের এই ভ্যারিয়েন্ট স্টক সমন্বয় করুন"
                                                                >
                                                                  <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                                                                  <span>সমন্বয়</span>
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenEditVariant(p, v, vIdx)}
                                                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                                  title="এই ভ্যারিয়েন্টের তথ্য ও কাটা থান (গজ/গিরা) এডিট করুন"
                                                                >
                                                                  <Edit3 className="w-3 h-3" />
                                                                  <span>এডিট</span>
                                                                </button>
                                                                {isThan && vBd && vBd.isRemnant && (
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      const varLabel = v.Attributes?.Color || v.Color || v.VariantName || 'ভ্যারিয়েন্ট';
                                                                      onOpenFabricWastageModal && onOpenFabricWastageModal({
                                                                        ProductID: p.ProductID,
                                                                        VariantID: v.VariantID || v.variantId || '',
                                                                        VariantName: varLabel,
                                                                        Barcode: v.Barcode || p.Barcode,
                                                                        ProductName: `${p.ProductName} - ${varLabel}`,
                                                                        remnantYards: vBd.runningCutYards
                                                                      });
                                                                    }}
                                                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-[#B45309] border border-amber-300 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                                    title="এই ভ্যারিয়েন্টের শেষ ছাঁট কাপড় ট্র্যাকার বা বান্ডেলে পাঠান"
                                                                  >
                                                                    <Scissors className="w-3 h-3 text-amber-700" />
                                                                    <span>ছাঁট</span>
                                                                  </button>
                                                                )}
                                                              </>
                                                            ) : (
                                                              <>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenVariantRestock(p, v, vIdx, 'Godown')}
                                                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                                  title="এই ভ্যারিয়েন্টে রিস্টক বা স্টক সমন্বয় করুন"
                                                                >
                                                                  <PlusCircle className="w-3 h-3" />
                                                                  <span>রিস্টক</span>
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenEditVariant(p, v, vIdx)}
                                                                  className="p-1 bg-[#FAFAFA] hover:bg-[#F5F5F5] text-slate-600 border border-[#E5E5E5] rounded-lg text-xs transition-all cursor-pointer"
                                                                  title="ভ্যারিয়েন্ট এডিট করুন"
                                                                >
                                                                  <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleRemoveVariant(p, v, vIdx)}
                                                                  className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs transition-all cursor-pointer"
                                                                  title="ভ্যারিয়েন্ট মুছে ফেলুন"
                                                                >
                                                                  <Trash2 className="w-3 h-3" />
                                                                </button>
                                                              </>
                                                            )}
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                                {!isShopStockView && (
                                                  <tfoot className="bg-[#FAFAFA] border-t border-[#E5E5E5]">
                                                    <tr>
                                                      <td colSpan="7" className="py-2.5 px-3 text-center">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleOpenNewColor(p)}
                                                          className="w-full py-2 px-3 bg-emerald-50/50 hover:bg-emerald-50 text-[#0F172A] border border-dashed border-emerald-300 rounded-md text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                                                        >
                                                          <Plus className="w-3.5 h-3.5" />
                                                          <span>+ এই পণ্যে নতুন ভ্যারিয়েন্ট যোগ করুন</span>
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  </tfoot>
                                                )}
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
                          isLoading ? (
                            <tr>
                              <td colSpan="6" className="p-0">
                                <div className="divide-y divide-slate-100 animate-pulse">
                                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sIdx) => (
                                    <div key={sIdx} className="px-5 py-4 flex items-center justify-between gap-4">
                                      <div className="flex items-center space-x-3 flex-1">
                                        <div className="w-9 h-9 bg-slate-200 rounded-md shrink-0"></div>
                                        <div className="space-y-1.5 flex-1 max-w-xs">
                                          <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
                                          <div className="h-2.5 bg-[#F5F5F5] rounded w-1/2"></div>
                                        </div>
                                      </div>
                                      <div className="h-4 w-24 bg-slate-200 rounded shrink-0"></div>
                                      <div className="h-4 w-28 bg-slate-200 rounded shrink-0"></div>
                                      <div className="h-4 w-20 bg-slate-200 rounded shrink-0"></div>
                                      <div className="h-8 w-24 bg-slate-200 rounded-md shrink-0"></div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ) : flattenedVariantList.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-16 text-center">
                                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3 px-4">
                                  <div className="w-12 h-12 rounded-md bg-[#F5F5F5] flex items-center justify-center text-slate-400 border border-[#E5E5E5]">
                                    <SearchX className="w-6 h-6 stroke-[1.75]" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-800">কোনো ভ্যারিয়েন্ট পাওয়া যায়নি</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                      {overviewSearch
                                        ? `"${overviewSearch}" এর সাথে মিলে এমন কোনো ভ্যারিয়েন্ট বর্তমান তালিকায় নেই।`
                                        : "বর্তমান ফিল্টারে প্রদর্শনের মতো কোনো ভ্যারিয়েন্ট নেই।"}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="px-4 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] rounded-md text-xs font-bold transition-all shadow-none cursor-pointer inline-flex items-center space-x-1.5 hover:border-slate-400"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                    <span>সার্চ ও ফিল্টার রিসেট করুন</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            flattenedVariantList.map((item, idx) => {
                              const isZeroShop = item.shopStock <= 0;
                              const isLowShop = item.shopStock <= 2;
                              const hexColor = getColorHex(item.color);

                              return (
                                <tr key={item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${idx}`} className="hover:bg-[#FAFAFA]/70 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900 text-sm">
                                      {item.productName}
                                    </div>
                                    <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                                      {item.color && (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-[#E5E5E5] shadow-none">
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                            style={{ backgroundColor: hexColor }}
                                          />
                                          <span>রং: {item.color}</span>
                                        </span>
                                      )}
                                      {item.size && (
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                          সাইজ: {item.size}
                                        </span>
                                      )}
                                      {item.otherAttrs && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F5F5] text-slate-600">
                                          {item.otherAttrs}
                                        </span>
                                      )}
                                      {!item.isVariant && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F5F5] text-slate-500 italic">
                                          সাধারণ পণ্য
                                        </span>
                                      )}
                                    </div>

                                    {/* মেটাডাটা সাব-ব্যাজ (ক্যাটাগরি, একক ও আইডি) */}
                                    <div className="mt-1.5 flex items-center space-x-1.5 flex-wrap gap-y-1">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5F5F5] text-slate-700 border border-[#E5E5E5]">
                                        {item.category || 'সাধারণ'}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-[#0F172A] border border-emerald-200/70 font-mono">
                                        {item.unit || getProductDisplayUnit(item.parentProduct)}{item.isThanUnit && item.yardsPerThan > 0 ? ` (${item.yardsPerThan} গজ)` : ''}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        ID: {item.productId} {item.barcode ? `• #${item.barcode}` : ''}
                                      </span>
                                      {(Number(item.costPrice || 0) > 0 || Number(item.sellingPrice || 0) > 0) && (
                                        <span className="text-[10.5px] text-slate-500 font-mono">
                                          ({Number(item.costPrice || 0) > 0 && `ক্রয়: ${currencySymbol}${Math.round(Number(item.costPrice || 0)).toLocaleString('bn-BD')}`}
                                          {Number(item.costPrice || 0) > 0 && Number(item.sellingPrice || 0) > 0 && ' | '}
                                          {Number(item.sellingPrice || 0) > 0 && `বিক্রয়: ${currencySymbol}${Math.round(Number(item.sellingPrice || 0)).toLocaleString('bn-BD')}`})
                                        </span>
                                      )}
                                    </div>

                                    {/* আধুনিক ও পরিচ্ছন্ন কাপড় বিবরণী */}
                                    <div className="mt-1 flex flex-col gap-0.5">
                                      {isShopStockView ? (
                                        item.isThanUnit && (() => {
                                          const ypt = item.yardsPerThan || 25;
                                          const remTh = Number(
                                            item.parentProduct?.RemnantThreshold !== undefined && item.parentProduct?.RemnantThreshold !== null && item.parentProduct?.RemnantThreshold !== '' && Number(item.parentProduct?.RemnantThreshold) > 0
                                              ? item.parentProduct?.RemnantThreshold
                                              : (item.parentProduct?.remnantThreshold !== undefined && item.parentProduct?.remnantThreshold !== null && item.parentProduct?.remnantThreshold !== '' && Number(item.parentProduct?.remnantThreshold) > 0
                                                ? item.parentProduct?.remnantThreshold
                                                : 1)
                                          );
                                          const bd = calculateThanBreakdown(item.shopStock, ypt, remTh);
                                          return (
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                              <span className="inline-flex items-center space-x-1 text-slate-600 bg-[#F5F5F5] px-2 py-0.5 rounded text-[11px] font-medium border border-[#E5E5E5]">
                                                <Layers className="w-3 h-3 text-slate-500" />
                                                <span>১ থান = {ypt} গজ</span>
                                              </span>
                                              {bd.fullThans > 0 ? (
                                                <span className="inline-flex items-center text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 font-semibold font-mono">
                                                  দোকানে {bd.fullThans}টি আস্ত থান {bd.runningCutYards > 0 ? `+ টেবিলে ${bd.runningCutText} কাটা` : ''}
                                                </span>
                                              ) : bd.runningCutYards > 0 ? (
                                                <span className="inline-flex items-center text-[#B45309] bg-[#FFFBEB] px-2 py-0.5 rounded text-[11px] border border-[#FEF3C7] font-semibold font-mono">
                                                  দোকানে ০টি আস্ত থান (টেবিলে {bd.runningCutText} কাটা)
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200 font-semibold">
                                                  দোকানে থান বা গজ নেই
                                                </span>
                                              )}
                                              {bd.isRemnant && (
                                                <button
                                                  type="button"
                                                  onClick={() => onOpenFabricWastageModal && onOpenFabricWastageModal({
                                                    ProductID: item.parentProduct?.ProductID || item.productId,
                                                    VariantID: item.isVariant ? (item.variant?.VariantID || item.variant?.variantId) : '',
                                                    ProductName: item.isVariant ? `${item.productName} - ${item.color || item.size || 'ভ্যারিয়েন্ট'}` : item.productName,
                                                    remnantYards: bd.runningCutYards
                                                  })}
                                                  className="inline-flex items-center space-x-1 text-[#B45309] bg-[#FFFBEB] hover:bg-amber-100 px-2 py-0.5 rounded text-[10px] font-semibold border border-[#FEF3C7] cursor-pointer transition-colors"
                                                  title="এই কাপড়ের ছাঁট রেকর্ড বা বান্ডেল তৈরি করতে ক্লিক করুন"
                                                >
                                                  <Scissors className="w-2.5 h-2.5 text-amber-600" />
                                                  <span>শেষ ছাঁট (রেকর্ড)</span>
                                                </button>
                                              )}
                                              {bd.needsRestock && item.godownStock > 0 && (
                                                <span className="inline-flex items-center space-x-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200 font-semibold">
                                                  <Truck className="w-2.5 h-2.5 text-rose-600" />
                                                  <span>নতুন থান প্রয়োজন</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()
                                      ) : (
                                        item.isThanUnit && (
                                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="inline-flex items-center text-[#0F172A] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 font-medium">
                                              <Layers className="w-3 h-3 text-slate-500 inline mr-1" />১ থান = {item.yardsPerThan || 25} গজ
                                            </span>
                                            {item.godownYards > 0 && (
                                              <span className="inline-flex items-center text-slate-600 bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-[#E5E5E5]/60 font-medium">
                                                গোডাউনে মোট: {item.godownYards.toLocaleString('bn-BD')} গজ
                                              </span>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </td>

                                  {/* স্টক কলাম (দোকান ভিউতে দোকান আগে, গোডাউন ভিউতে গোডাউন আগে) */}
                                  {isShopStockView ? (
                                    <>
                                      {/* দোকান ফ্লোর মজুত - হিরো কলাম */}
                                      <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                                        <div className="flex flex-col items-center">
                                          <div className={`text-sm font-bold font-mono tracking-tight tabular-nums ${
                                            isZeroShop
                                              ? 'text-rose-600 font-black'
                                              : isLowShop
                                              ? 'text-amber-700 font-black'
                                              : 'text-slate-900'
                                          }`}>
                                            {item.isThanUnit ? (
                                              item.shopStock <= 0 ? '০ গজ' : (
                                                item.thanBreakdown && item.thanBreakdown.fullThans > 0 && item.thanBreakdown.runningCutYards > 0
                                                  ? `${item.thanBreakdown.fullThans} থান + ${getSafeRunningCutText(item.thanBreakdown)}`
                                                  : item.thanBreakdown && item.thanBreakdown.fullThans > 0
                                                  ? `${item.thanBreakdown.fullThans} থান`
                                                  : item.thanBreakdown && item.thanBreakdown.runningCutYards > 0
                                                  ? `${getSafeRunningCutText(item.thanBreakdown)}`
                                                  : `${item.shopStock} গজ`
                                              )
                                            ) : (
                                              `${item.shopStock.toLocaleString('bn-BD')} ${item.unit || 'থান'}`
                                            )}
                                          </div>
                                          {item.isThanUnit && item.shopStock > 0 && (
                                            <span className="mt-0.5 text-[10.5px] font-semibold text-emerald-800 font-mono" title="দোকানের মোট কাপড় (গজে)">
                                              মোট: {item.shopStock.toLocaleString('bn-BD')} গজ
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* গোডাউন ব্যাকআপ - সেকেন্ডারি রেফারেন্স */}
                                      <td className="py-3 px-4 text-center bg-[#FAFAFA]">
                                        <div className="flex flex-col items-center">
                                          <span className={`text-xs font-mono font-bold tabular-nums ${
                                            item.godownStock > 0
                                              ? 'text-slate-800'
                                              : 'text-slate-400'
                                          }`}>
                                            {item.godownStock > 0 ? item.godownStock.toLocaleString('bn-BD') : '০'} {item.unit || 'থান'}
                                          </span>
                                          {item.isThanUnit && item.godownYards > 0 && (
                                            <span className="mt-0.5 text-[10px] text-slate-500 font-mono">
                                              ({item.godownYards.toLocaleString('bn-BD')} গজ)
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      {/* গোডাউন স্টক - হিরো কলাম */}
                                      <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                                        <div className="flex flex-col items-center">
                                          <div className={`text-sm font-bold font-mono tracking-tight tabular-nums ${
                                            item.godownStock > 0 ? 'text-slate-900' : 'text-slate-400'
                                          }`}>
                                            <span>{item.godownStock > 0 ? item.godownStock.toLocaleString('bn-BD') : '০'}</span>
                                            <span className="text-xs font-semibold text-emerald-800 ml-1">{item.unit || 'থান'}</span>
                                          </div>
                                          {item.isThanUnit && item.godownYards > 0 && (
                                            <span className="mt-0.5 text-[10.5px] font-semibold text-[#0F172A] font-mono">
                                              ({item.godownYards.toLocaleString('bn-BD')} গজ)
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* দোকান স্টক - সেকেন্ডারি রেফারেন্স */}
                                      <td className="py-3 px-4 text-center bg-[#FAFAFA]">
                                        <div className="flex flex-col items-center">
                                          <span className={`text-xs font-mono font-bold tabular-nums ${
                                            isZeroShop ? 'text-rose-600' : isLowShop ? 'text-amber-700' : 'text-slate-800'
                                          }`}>
                                            {item.isThanUnit ? (
                                              item.shopStock <= 0 ? '০ গজ' : (
                                                item.thanBreakdown && item.thanBreakdown.fullThans > 0 && item.thanBreakdown.runningCutYards > 0
                                                  ? `${item.thanBreakdown.fullThans} থান + ${getSafeRunningCutText(item.thanBreakdown)}`
                                                  : item.thanBreakdown && item.thanBreakdown.fullThans > 0
                                                  ? `${item.thanBreakdown.fullThans} থান`
                                                  : item.thanBreakdown && item.thanBreakdown.runningCutYards > 0
                                                  ? `${getSafeRunningCutText(item.thanBreakdown)}`
                                                  : `${item.shopStock} গজ`
                                              )
                                            ) : (
                                              `${item.shopStock.toLocaleString('bn-BD')} ${item.unit || 'থান'}`
                                            )}
                                          </span>
                                          {item.isThanUnit && item.shopStock > 0 && (
                                            <span className="mt-0.5 text-[10px] text-slate-500 font-mono" title="দোকানের মোট কাপড় (গজে)">
                                              মোট: {item.shopStock.toLocaleString('bn-BD')} গজ
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  {/* মোট স্টক - পরিচ্ছন্ন সংখ্যা ও মেটাডাটা */}
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                                        {item.isThanUnit ? (
                                          (() => {
                                            const bd = item.thanBreakdown;
                                            const totalFullThans = item.godownStock + (bd ? bd.fullThans : 0);
                                            const hasRunningCut = bd && bd.runningCutYards > 0;
                                            const cutStr = getSafeRunningCutText(bd);
                                            if (totalFullThans <= 0 && !hasRunningCut) return '০ গজ';
                                            if (totalFullThans > 0 && hasRunningCut) return `${totalFullThans} থান + ${cutStr}`;
                                            if (totalFullThans > 0) return `${totalFullThans} থান`;
                                            return cutStr || '০ গজ';
                                          })()
                                        ) : (
                                          `${item.totalStock.toLocaleString('bn-BD')} ${item.unit || 'থান'}`
                                        )}
                                      </span>
                                      {item.isThanUnit && (
                                        <span className="mt-0.5 text-[10px] text-slate-500 font-mono">
                                          মোট: {item.totalYards.toLocaleString('bn-BD')} গজ
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* অবস্থা - সলিড ডট ইনডিকেটর পিল */}
                                  <td className="py-3 px-3 text-center">
                                    {isZeroShop && item.godownStock > 0 ? (
                                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFFBEB]0" />
                                        <span>দোকানে আনুন</span>
                                      </span>
                                    ) : isZeroShop && item.godownStock <= 0 ? (
                                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span>স্টক শেষ</span>
                                      </span>
                                    ) : isLowShop && item.godownStock > 0 ? (
                                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFFBEB]0" />
                                        <span>দোকানে কম</span>
                                      </span>
                                    ) : item.isThanUnit && item.thanBreakdown?.needsRestock && item.godownStock > 0 ? (
                                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200" title="কিছু ভ্যারিয়েন্টে নতুন থান চালান প্রয়োজন">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span>থান প্রয়োজন</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>পর্যাপ্ত</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* কার্যক্রম - স্লীক প্রাইমারি চালান বাটন ও আইকন গ্রুপ */}
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        type="button"
                                        disabled={item.godownStock <= 0}
                                        onClick={() => handleOpenDirectTransfer(item.parentProduct, item.variant)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center space-x-1.5 shadow-none transition-all ${
                                          item.godownStock <= 0
                                            ? 'bg-[#F5F5F5] text-slate-400 border border-[#E5E5E5] cursor-not-allowed shadow-none'
                                            : 'bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-white cursor-pointer shadow-emerald-100'
                                        }`}
                                        title={item.godownStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে এই ভ্যারিয়েন্ট সরাসরি দোকানে আনুন'}
                                      >
                                        <Truck className="w-3.5 h-3.5" />
                                        <span>চালান</span>
                                      </button>
                                      {item.isVariant ? (
                                        <div className="flex items-center bg-[#FAFAFA] p-1 rounded-md border border-[#E5E5E5]/90 shadow-none">
                                          {isShopStockView ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const vN = [item.productName, item.color, item.size].filter(Boolean).join(' - ');
                                                  setPrintStickerProduct({
                                                    ...item.parentProduct,
                                                    ProductName: vN,
                                                    Barcode: item.barcode || item.parentProduct?.Barcode,
                                                    SellingPrice: item.sellingPrice || item.parentProduct?.SellingPrice,
                                                    Price: item.sellingPrice || item.parentProduct?.SellingPrice
                                                  });
                                                }}
                                                className="p-1.5 hover:bg-white hover:text-[#0F172A] text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                                title="প্রাইস ট্যাগ বা স্টিকার প্রিন্ট করুন"
                                              >
                                                <Printer className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenVariantRestock(item.parentProduct, item.variant, item.variantIndex, 'Shop')}
                                                className="px-2 py-1 bg-[#FFFBEB] hover:bg-amber-100 text-[#B45309] border border-[#FEF3C7] rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                title="দোকানের স্টক সমন্বয় করুন"
                                              >
                                                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                                                <span>সমন্বয়</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditVariant(item.parentProduct, item.variant, item.variantIndex)}
                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                title="এই ভ্যারিয়েন্টের তথ্য ও কাটা থান (গজ/গিরা) এডিট করুন"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span>এডিট</span>
                                              </button>
                                              {item.isThanUnit && (() => {
                                                const ypt = item.yardsPerThan || 25;
                                                const remTh = Number(
                                                  item.parentProduct?.RemnantThreshold !== undefined && item.parentProduct?.RemnantThreshold !== null && item.parentProduct?.RemnantThreshold !== '' && Number(item.parentProduct?.RemnantThreshold) > 0
                                                    ? item.parentProduct?.RemnantThreshold
                                                    : (item.parentProduct?.remnantThreshold !== undefined && item.parentProduct?.remnantThreshold !== null && item.parentProduct?.remnantThreshold !== '' && Number(item.parentProduct?.remnantThreshold) > 0
                                                      ? item.parentProduct?.remnantThreshold
                                                      : 1)
                                                );
                                                const bd = calculateThanBreakdown(item.shopStock, ypt, remTh);
                                                if (!bd || !bd.isRemnant) return null;
                                                return (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const varLabel = item.color || item.size || item.variant?.VariantName || 'ভ্যারিয়েন্ট';
                                                      onOpenFabricWastageModal && onOpenFabricWastageModal({
                                                        ProductID: item.parentProduct?.ProductID || item.productId,
                                                        VariantID: item.variant?.VariantID || item.variant?.variantId || item.barcode || item.color || varLabel,
                                                        VariantName: varLabel,
                                                        Barcode: item.barcode || item.variant?.Barcode || '',
                                                        ProductName: `${item.productName} - ${varLabel}`,
                                                        remnantYards: bd.runningCutYards
                                                      });
                                                    }}
                                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-[#B45309] border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                    title="এই ভ্যারিয়েন্টের শেষ ছাঁট কাপড় ট্র্যাকার বা বান্ডেলে পাঠান"
                                                  >
                                                    <Scissors className="w-3.5 h-3.5 text-amber-700" />
                                                    <span>ছাঁট</span>
                                                  </button>
                                                );
                                              })()}
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenVariantRestock(item.parentProduct, item.variant, item.variantIndex, 'Godown')}
                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                title="এই ভ্যারিয়েন্টে রিস্টক বা স্টক সমন্বয় করুন"
                                              >
                                                <PlusCircle className="w-3 h-3" />
                                                <span>রিস্টক</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditVariant(item.parentProduct, item.variant, item.variantIndex)}
                                                className="p-1.5 hover:bg-white hover:text-[#0F172A] text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                                title="ভ্যারিয়েন্ট এডিট করুন"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveVariant(item.parentProduct, item.variant, item.variantIndex)}
                                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg text-xs transition-colors cursor-pointer"
                                                title="ভ্যারিয়েন্ট মুছে ফেলুন"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center bg-[#FAFAFA] p-1 rounded-md border border-[#E5E5E5]/90 shadow-none">
                                          <button
                                            type="button"
                                            onClick={() => setPrintStickerProduct(item.parentProduct)}
                                            className="p-1.5 hover:bg-white hover:text-[#0F172A] text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                            title="প্রাইস ট্যাগ বা স্টিকার প্রিন্ট করুন"
                                          >
                                            <Printer className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAdjustTargetProduct(item.parentProduct);
                                              setAdjustLocation(isShopStockView ? 'Shop' : 'Godown');
                                              setAdjustAction(isShopStockView ? 'DEDUCT' : 'ADD');
                                              setAdjustReason(isShopStockView ? 'দোকানে কাটা/নষ্ট/স্যাম্পল' : 'নতুন লট গোডাউনে আগমন');
                                              setAdjustQty(1);
                                            }}
                                            className="p-1.5 hover:bg-white hover:text-amber-600 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                            title={isShopStockView ? 'দোকানের কাউন্টার স্টক সংশোধন বা সমন্বয়' : 'গোডাউন স্টক সমন্বয় করুন'}
                                          >
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                          </button>
                                          {item.isThanUnit && isShopStockView && (() => {
                                            const ypt = item.yardsPerThan || 25;
                                            const remTh = Number(
                                              item.parentProduct?.RemnantThreshold !== undefined && item.parentProduct?.RemnantThreshold !== null && item.parentProduct?.RemnantThreshold !== '' && Number(item.parentProduct?.RemnantThreshold) > 0
                                                ? item.parentProduct?.RemnantThreshold
                                                : (item.parentProduct?.remnantThreshold !== undefined && item.parentProduct?.remnantThreshold !== null && item.parentProduct?.remnantThreshold !== '' && Number(item.parentProduct?.remnantThreshold) > 0
                                                  ? item.parentProduct?.remnantThreshold
                                                  : 1)
                                            );
                                            const bd = calculateThanBreakdown(item.shopStock, ypt, remTh);
                                            if (!bd || !bd.isRemnant) return null;
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => onOpenFabricWastageModal && onOpenFabricWastageModal({
                                                  ProductID: item.parentProduct?.ProductID || item.productId,
                                                  ProductName: item.productName,
                                                  remnantYards: bd.runningCutYards
                                                })}
                                                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-[#B45309] border border-amber-300 rounded-lg text-xs transition-colors cursor-pointer"
                                                title="এই কাপড়ের শেষ ছাঁট ট্র্যাকার বা বান্ডেলে পাঠান"
                                              >
                                                <Scissors className="w-3.5 h-3.5 text-amber-700" />
                                              </button>
                                            );
                                          })()}
                                        </div>
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
            {/* ট্যাব ২: স্থানান্তর চালান (নতুন চালান ও তালিকা) */}
            {/* =============================================================== */}
            {activeMainTab === 'transfers' && (
              <div className="space-y-4">
                
                {/* সাব-ট্যাব বার */}
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setTransferSubTab('new')}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        transferSubTab === 'new'
                          ? 'bg-[#0F172A] text-white shadow-none'
                          : 'bg-white text-slate-600 hover:bg-[#F5F5F5] border border-[#E5E5E5]'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>গোডাউন থেকে চালান তৈরি</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferSubTab('list')}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        transferSubTab === 'list'
                          ? 'bg-[#0F172A] text-white shadow-none'
                          : 'bg-white text-slate-600 hover:bg-[#F5F5F5] border border-[#E5E5E5]'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>দোকানে আসা চালান ও ট্র্যাকিং</span>
                      {stockTransfers.filter(t => t.Status === 'In Transit' || t.Status === 'Pending').length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FFFBEB]0 text-white font-mono font-bold animate-pulse shadow-none">
                          {stockTransfers.filter(t => t.Status === 'In Transit' || t.Status === 'Pending').length}টি পথে
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* ২.১ নতুন চালান তৈরি ভিউ */}
                {transferSubTab === 'new' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    
                    {/* চালান ফরম */}
                    <div className="lg:col-span-2 bg-white rounded-md border border-[#E5E5E5] p-5 shadow-none space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">চালান নম্বর</label>
                          <input
                            type="text"
                            value={challanNo}
                            onChange={(e) => setChallanNo(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono font-bold border border-[#E5E5E5] rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">চালানের তারিখ</label>
                          <input
                            type="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold border border-[#E5E5E5] rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">প্রেরক স্থান (উৎস)</label>
                          <select
                            value={fromLocation}
                            onChange={(e) => setFromLocation(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          >
                            <option value="Main Warehouse">কেন্দ্রীয় গোডাউন (Main Warehouse)</option>
                            <option value="Main Shop">প্রধান দোকান (Main Shop)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">প্রাপক স্থান (গন্তব্য)</label>
                          <select
                            value={toLocation}
                            onChange={(e) => setToLocation(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          >
                            <option value="Main Shop">প্রধান দোকান (Main Shop)</option>
                            <option value="Main Warehouse">কেন্দ্রীয় গোডাউন (Main Warehouse)</option>
                          </select>
                        </div>
                      </div>

                      {/* আইটেম পিকার বক্স */}
                      <div className="p-4 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-neutral-600" />
                            <span>চালানে পণ্য ও ভ্যারিয়েন্ট যোগ করুন</span>
                          </span>
                          <span className="text-[11px] font-bold text-neutral-700 bg-neutral-50 px-2.5 py-0.5 rounded-full border border-neutral-200">
                            গোডাউনে মোট {godownAvailableItems.filter((i) => i.godownStock > 0).length}টি আইটেম মজুত আছে
                          </span>
                        </div>

                        {/* ড্রপডাউন সার্চ ফিল্টার (ঐচ্ছিক দ্রুত ফিল্টার) */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                            placeholder="ড্রপডাউনে পণ্য বা রঙের নাম দিয়ে দ্রুত খুঁজুন..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5E5E5] rounded-md bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                          />
                        </div>

                        {/* মূল ডাটাবেস ড্রপডাউন সিলেক্টর */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            গোডাউনে মজুদ থাকা ভ্যারিয়েন্ট তালিকা থেকে নির্বাচন করুন:
                          </label>
                          <select
                            value={selectedItemKey}
                            onChange={(e) => handleSelectItemFromDropdown(e.target.value)}
                            className="w-full px-3 py-2 text-xs border-2 border-neutral-300 rounded-md bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-none"
                          >
                            <option value="">-- গোডাউনে মজুত থাকা ভ্যারিয়েন্ট বা পণ্য বেছে নিন --</option>
                            {filteredDropdownItems.map((item) => {
                              const isOut = item.godownStock <= 0;
                              return (
                                <option
                                  key={item.key}
                                  value={item.key}
                                  disabled={isOut}
                                  className={isOut ? 'text-slate-400 bg-[#F5F5F5]' : 'text-slate-900 font-semibold'}
                                >
                                  {item.productName} {item.variantName ? `→ [ভ্যারিয়েন্ট: ${item.variantName}]` : '→ [সাধারণ পণ্য]'} — গোডাউন মজুত: {item.godownStock} {item.unit} {isOut ? '(মজুত শূন্য)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* নির্বাচিত পণ্যের প্রিভিউ ও পরিমাণ নির্ধারণ */}
                        {selectedGodownItem && (
                          <div className="p-3 bg-white rounded-md border border-neutral-200 space-y-2 shadow-none">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div>
                                <span className="font-black text-slate-900 text-xs block">
                                  {selectedGodownItem.productName}
                                </span>
                                {selectedGodownItem.variantName && (
                                  <span className="text-[11px] text-neutral-700 font-bold bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200 inline-block mt-0.5">
                                    ভ্যারিয়েন্ট: {selectedGodownItem.variantName}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-neutral-700 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-200 inline-block font-mono">
                                  গোডাউনে মজুত: {selectedGodownItem.godownStock} {selectedGodownItem.unit}
                                </span>
                                {selectedGodownItem.isThan && selectedGodownItem.yardsPerThan > 0 && (
                                  <span className="text-[10px] text-neutral-500 block font-semibold mt-0.5">
                                    ({selectedGodownItem.godownStock * selectedGodownItem.yardsPerThan} গজ)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-1 border-t border-[#E5E5E5]">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  চালানের পরিমাণ ({selectedGodownItem.unit}) — সর্বোচ্চ: {selectedGodownItem.godownStock}
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max={selectedGodownItem.godownStock}
                                  value={transferQty}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 1;
                                    setTransferQty(Math.max(1, Math.min(selectedGodownItem.godownStock || 1, val)));
                                  }}
                                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-[#E5E5E5] rounded-lg text-slate-900 focus:ring-2 focus:ring-neutral-900"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={selectedGodownItem.godownStock <= 0}
                                onClick={handleAddItemToChallan}
                                className="mt-4 px-4 py-2 bg-[#0F172A] hover:bg-[#0F172A] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-none cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>চালানে যোগ করুন</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* চালানের পণ্য তালিকা */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">চালানে অন্তর্ভুক্ত পণ্যসমূহ ({challanItems.length})</span>
                          <span className="text-xs font-mono font-bold text-neutral-700">মোট: {totalChallanQty} একক</span>
                        </div>

                        {challanItems.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-[#FAFAFA] rounded-md border border-dashed border-[#E5E5E5] text-xs">
                            এখনও কোনো পণ্য চালানে যোগ করা হয়নি। উপরের বক্স থেকে পণ্য যোগ করুন।
                          </div>
                        ) : (
                          <div className="border border-[#E5E5E5] rounded-md overflow-hidden divide-y divide-slate-100">
                            {challanItems.map((itm, i) => (
                              <div key={i} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#FAFAFA]">
                                <div>
                                  <strong className="text-slate-900 block">{itm.productName}</strong>
                                  {itm.variantName && <span className="text-[10px] text-slate-400">{itm.variantName}</span>}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-mono font-bold text-slate-800 bg-[#F5F5F5] px-2 py-0.5 rounded">
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
                    <div className="bg-white rounded-md border border-[#E5E5E5] p-5 shadow-none space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-900 block border-b border-[#E5E5E5] pb-2">
                          বাহক ও গাড়ির তথ্য
                        </span>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">বাহক / ড্রাইভারের নাম</label>
                          <input
                            type="text"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                            className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">মোবাইল নম্বর</label>
                          <input
                            type="text"
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            placeholder="017xxxxxxxx"
                            className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">গাড়ি / ভ্যান নম্বর</label>
                          <input
                            type="text"
                            value={vehicleNo}
                            onChange={(e) => setVehicleNo(e.target.value)}
                            placeholder="ঢাকা মেট্রো-ন..."
                            className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">মন্তব্য / নোট</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows="2"
                            placeholder="প্রয়োজনীয় নির্দেশনা..."
                            className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-[#E5E5E5]">
                        <button
                          type="button"
                          disabled={isSubmitting || challanItems.length === 0}
                          onClick={() => handleSubmitChallan(true)}
                          className="w-full py-2.5 bg-[#0F172A] hover:bg-[#0F172A] disabled:opacity-50 text-white text-xs font-bold rounded-md flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>চালান নিশ্চিত ও প্রিন্ট করুন</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting || challanItems.length === 0}
                          onClick={() => handleSubmitChallan(false)}
                          className="w-full py-2 bg-[#F5F5F5] hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-md cursor-pointer"
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
                    <div className="p-3 bg-white rounded-md border border-[#E5E5E5] shadow-none flex items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={listSearch}
                          onChange={(e) => setListSearch(e.target.value)}
                          placeholder="চালান নং বা লোকেশন দিয়ে খুঁজুন..."
                          className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-semibold text-slate-700"
                      >
                        <option value="ALL">সকল স্ট্যাটাস</option>
                        <option value="IN TRANSIT">ইন ট্রানজিট (পথে আছে)</option>
                        <option value="RECEIVED">রিসিভড (দোকানে গ্রহণ)</option>
                        <option value="CANCELLED">বাতিল</option>
                      </select>
                    </div>

                    {filteredChallans.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-white rounded-md border border-[#E5E5E5]">
                        কোনো স্টক স্থানান্তর চালান পাওয়া যায়নি।
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredChallans.map((ch) => {
                          const isInTransit = ch.Status === 'In Transit' || ch.Status === 'Pending';
                          const isReceived = ch.Status === 'Received';
                          const isCancelled = ch.Status === 'Cancelled';

                          const rawItems = ch.Items || ch.items || ch.ItemsJSON;
                          let items = [];
                          if (Array.isArray(rawItems)) {
                            items = rawItems;
                          } else if (typeof rawItems === 'string') {
                            try { items = JSON.parse(rawItems); } catch { items = []; }
                          }

                          const formattedDate = ch.TransferDate 
                            ? new Date(ch.TransferDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })
                            : (ch.CreatedAt ? new Date(ch.CreatedAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' }) : 'তারিখহীন');

                          return (
                            <div key={ch.TransferID || ch.ChallanNo} className="p-4 bg-white rounded-md border border-[#E5E5E5] shadow-none space-y-3 hover:shadow-none transition-shadow">
                              {/* কার্ড হেডার: চালান নং, তারিখ, স্ট্যাটাস ও রিমুভ আইকন */}
                              <div className="flex items-start justify-between gap-2 border-b border-[#E5E5E5] pb-2.5">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-black text-sm text-neutral-700">#{ch.ChallanNo}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      isInTransit ? 'bg-amber-100 text-[#B45309] border border-[#FEF3C7] animate-pulse' :
                                      isReceived ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                      'bg-[#F5F5F5] text-slate-600'
                                    }`}>
                                      {isInTransit ? 'পথে আছে (অপেক্ষমাণ)' : isReceived ? 'দোকানে রিসিভড' : 'বাতিল'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                    চালানের তারিখ: {formattedDate}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChallan(ch)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="চালানটি ডাটাবেস থেকে মুছে ফেলুন (Delete Challan)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* রুট ও বাহক বিবরণ */}
                              <div className="p-2.5 bg-[#FAFAFA] rounded-md text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">প্রেরক → প্রাপক:</span>
                                  <strong className="text-slate-800">{ch.FromLocation} → {ch.ToLocation}</strong>
                                </div>
                                {ch.DriverName && (
                                  <div className="text-[11px] text-slate-500 truncate">
                                    বাহক: <span className="font-semibold text-slate-700">{ch.DriverName}</span>
                                  </div>
                                )}
                                {ch.Notes && (
                                  <div className="text-[10.5px] text-slate-500 italic truncate">
                                    নোট: {ch.Notes}
                                  </div>
                                )}
                              </div>

                              {/* কী কী প্রোডাক্ট ও ভ্যারিয়েন্ট দোকানে পাঠানো হয়েছে তার বিস্তারিত তালিকা */}
                              <div className="bg-[#FAFAFA]/90 rounded-md border border-[#E5E5E5] overflow-hidden text-xs">
                                <div className="px-3 py-1.5 bg-[#F5F5F5] border-b border-[#E5E5E5] flex items-center justify-between text-[11px] font-bold text-slate-700">
                                  <span className="flex items-center space-x-1">
                                    <Package className="w-3 h-3 text-neutral-600" />
                                    <span>চালানের পণ্য ও ভ্যারিয়েন্ট বিস্তারিত ({items.length}টি)</span>
                                  </span>
                                  <span className="font-mono text-neutral-700 font-black">
                                    মোট: {ch.TotalQuantity} {items[0]?.unit || 'একক'}
                                  </span>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                  {items.length === 0 ? (
                                    <div className="p-3 text-center text-slate-400 text-[11px]">
                                      কোনো পণ্যের বিবরণ পাওয়া যায়নি।
                                    </div>
                                  ) : (
                                    items.map((itm, itmIdx) => (
                                      <div key={itmIdx} className="px-3 py-2 flex items-center justify-between hover:bg-white transition-colors">
                                        <div className="flex-1 pr-2">
                                          <strong className="text-slate-900 block font-bold text-xs">
                                            {itm.productName || itm.ProductName}
                                          </strong>
                                          <div className="flex items-center space-x-1 mt-0.5 flex-wrap">
                                            {itm.variantName && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-neutral-50 text-neutral-700 border border-neutral-200">
                                                ভ্যারিয়েন্ট: {itm.variantName}
                                              </span>
                                            )}
                                            {itm.variantId && !itm.variantName && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#F5F5F5] text-slate-600">
                                                ID: {itm.variantId}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-neutral-50 text-neutral-800 border border-neutral-200">
                                            {itm.quantity || itm.Quantity} {itm.unit || itm.Unit || 'Pcs'}
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* কার্ড ফুটার বাটনসমূহ */}
                              <div className="flex items-center justify-between pt-1 border-t border-[#E5E5E5]">
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
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-none cursor-pointer transition-all"
                                      title="দোকানে পণ্য বুঝে নিন এবং দোকানের স্টকে যুক্ত করুন"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>দোকানে রিসিভ করুন</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelChallan(ch)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                                      title="চালান বাতিল (গোডাউনে স্টক ফেরত)"
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
            {/* ট্যাব ৩: গোডাউন স্টক কমার খাতা (ভ্যারিয়েন্ট ভিত্তিক ও পিডিএফ রিপোর্ট) */}
            {/* =============================================================== */}
            {activeMainTab === 'godown_outflow' && (
              <div className="space-y-4">
                
                {/* পরিচিতি ব্যানার */}
                <div className="p-4 bg-white rounded-md border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-md bg-amber-600 text-white flex items-center justify-center shadow-none">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-950 flex items-center space-x-2">
                        <span>গোডাউনে ভ্যারিয়েন্ট অনুযায়ী স্টক কমার খাতা</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-[#B45309] font-bold border border-amber-300">
                          ভ্যারিয়েন্ট অডিট
                        </span>
                      </h3>
                      <p className="text-xs text-amber-850 mt-0.5">
                        দোকানে চালান স্থানান্তর, গোডাউন ড্যামেজ বা অন্য কারণে কোন কোন ভ্যারিয়েন্টের স্টক কমেছে তার বিশদ হিসাব
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    <button
                      type="button"
                      onClick={() => setIsPrintableGodownOutflow(true)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none cursor-pointer transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>পিডিএফ ডাউনলোড / প্রিন্ট</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportGodownOutflowExcelCSV(stockMovements, products)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none cursor-pointer transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>গোডাউন কমার এক্সেল রিপোর্ট</span>
                    </button>
                  </div>
                </div>

                {/* সারসংক্ষেপ কেপিআই কার্ডস */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white rounded-md border border-[#E5E5E5] shadow-none">
                    <span className="text-[11px] font-bold text-slate-500 block mb-0.5">মোট কমার ঘটনা</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-slate-900">{godownOutflowSummary.count}</span>
                      <span className="text-xs text-slate-500">টি এন্ট্রি</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-50/60 rounded-md border border-rose-200/80 shadow-none">
                    <span className="text-[11px] font-bold text-rose-800 block mb-0.5">মোট হ্রাসকৃত স্টক</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-rose-700">-{godownOutflowSummary.totalQty}</span>
                      <span className="text-xs text-rose-600 font-medium">(থান/গজ/পিস)</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-neutral-50/60 rounded-md border border-neutral-200/80 shadow-none">
                    <span className="text-[11px] font-bold text-neutral-800 block mb-0.5">চালানে স্থানান্তর</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-neutral-700">-{godownOutflowSummary.transferQty}</span>
                      <span className="text-xs text-neutral-600 font-medium">দোকানে পাঠানো</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FFFBEB]/60 rounded-md border border-[#FEF3C7] shadow-none">
                    <span className="text-[11px] font-bold text-[#B45309] block mb-0.5">ড্যামেজ ও সমন্বয় হ্রাস</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-amber-700">
                        -{Math.round((godownOutflowSummary.damageQty + godownOutflowSummary.adjustQty) * 100) / 100}
                      </span>
                      <span className="text-xs text-amber-600 font-medium">গোডাউন হ্রাস</span>
                    </div>
                  </div>
                </div>

                {/* ফিল্টার বার */}
                <div className="p-3 bg-white rounded-md border border-[#E5E5E5] shadow-none flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={godownSearch}
                      onChange={(e) => setGodownSearch(e.target.value)}
                      placeholder="পণ্য, ভ্যারিয়েন্ট, রঙ, সাইজ বা চালান নং দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <select
                      value={godownReasonFilter}
                      onChange={(e) => setGodownReasonFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল কারণ</option>
                      <option value="TRANSFER_OUT">দোকানে স্থানান্তর চালান</option>
                      <option value="DAMAGE">গোডাউন ড্যামেজ</option>
                      <option value="ADJUSTMENT">স্টক সমন্বয় / কর্তন</option>
                    </select>

                    <select
                      value={godownDateFilter}
                      onChange={(e) => setGodownDateFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল সময়</option>
                      <option value="TODAY">আজকের</option>
                      <option value="7DAYS">বিগত ৭ দিন</option>
                      <option value="30DAYS">বিগত ৩০ দিন</option>
                    </select>
                  </div>
                </div>

                {/* খতিয়ান টেবিল */}
                <div className="bg-white rounded-md border border-[#E5E5E5] overflow-hidden shadow-none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F5F5F5] text-slate-700 border-b border-[#E5E5E5] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">তারিখ ও সময়</th>
                          <th className="py-3 px-4">পণ্যের বিবরণ</th>
                          <th className="py-3 px-4">ভ্যারিয়েন্ট বিবরণ (রং / সাইজ)</th>
                          <th className="py-3 px-3">কমার কারণ ও চালান নং</th>
                          <th className="py-3 px-3 text-center text-rose-900 bg-rose-50/60 font-black">কমেছে (পরিমাণ)</th>
                          <th className="py-3 px-3 text-center">পূর্বে গোডাউনে</th>
                          <th className="py-3 px-3 text-center">অবশিষ্ট গোডাউনে</th>
                          <th className="py-3 px-4">অনুমোদনকারী/চালক</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {godownOutflowData.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                              নির্বাচিত সময়ে গোডাউন থেকে ভ্যারিয়েন্ট স্টক কমার কোনো রেকর্ড পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          godownOutflowData.map((m) => (
                            <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {new Date(m.timestamp).toLocaleString('bn-BD')}
                              </td>
                              <td className="py-3 px-4">
                                <strong className="text-slate-900 block">{m.productName}</strong>
                                <div className="flex items-center space-x-2 mt-0.5">
                                  {m.category && <span className="text-[10px] text-slate-500 font-medium">{m.category}</span>}
                                  {m.barcode && <span className="text-[10px] text-slate-400 font-mono">#{m.barcode}</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {m.variantName || m.color || m.size ? (
                                  <div className="flex flex-col space-y-1">
                                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                                      {m.color && (
                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-50 text-neutral-700 border border-neutral-200">
                                          <span className="w-2 h-2 rounded-full bg-neutral-500 inline-block"></span>
                                          <span>রং: {m.color}</span>
                                        </span>
                                      )}
                                      {m.size && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-neutral-50 text-neutral-700 border border-neutral-200">
                                          সাইজ: {m.size}
                                        </span>
                                      )}
                                      {m.variantName && !m.color && !m.size && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-neutral-50 text-neutral-700 border border-neutral-200">
                                          {m.variantName}
                                        </span>
                                      )}
                                    </div>
                                    {m.variantId && (
                                      <span className="text-[10px] text-slate-400 font-mono">আইডি: {m.variantId}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] text-slate-500 bg-[#F5F5F5] font-medium">
                                    সাধারণ / নন-ভ্যারিয়েন্ট
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-800 block">{m.reasonBangla}</span>
                                {m.referenceNo && (
                                  <span className="text-[10px] font-mono text-neutral-600 font-bold">
                                    রেফারেন্স: {m.referenceNo}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center bg-rose-50/40">
                                <span className="font-mono font-black text-rose-700 text-sm">
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
            {/* ট্যাব ৪: দোকান স্টক কমার খাতা */}
            {/* =============================================================== */}
            {activeMainTab === 'shop_outflow' && (
              <div className="space-y-4">
                
                {/* পরিচিতি ব্যানার */}
                <div className="p-4 bg-white rounded-md border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-none">
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
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 shadow-none cursor-pointer self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>দোকান কমার এক্সেল রিপোর্ট</span>
                  </button>
                </div>

                {/* ফিল্টার বার */}
                <div className="p-3 bg-white rounded-md border border-[#E5E5E5] shadow-none flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={shopSearch}
                      onChange={(e) => setShopSearch(e.target.value)}
                      placeholder="পণ্য, মেমো নং বা অর্ডার নং দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <select
                      value={shopTypeFilter}
                      onChange={(e) => setShopTypeFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-medium text-slate-700"
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
                      className="px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">সকল সময়</option>
                      <option value="TODAY">আজকের</option>
                      <option value="7DAYS">বিগত ৭ দিন</option>
                      <option value="30DAYS">বিগত ৩০ দিন</option>
                    </select>
                  </div>
                </div>

                {/* খতিয়ান টেবিল */}
                <div className="bg-white rounded-md border border-[#E5E5E5] overflow-hidden shadow-none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F5F5F5] text-slate-700 border-b border-[#E5E5E5] font-bold uppercase tracking-wider">
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
                            <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors">
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
        {/* দ্রুত স্টক অ্যাডজাস্টমেন্ট পপআপ সাব-মডাল (Modern Fastkart Style) */}
        {/* =================================================================== */}
        {adjustTargetProduct && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/40  animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-none border border-[#E5E5E5] overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
              
              {/* হেডার */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E5E5]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 rounded-md bg-emerald-50 text-[#0F172A] border border-emerald-100/80 shadow-none">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">স্টক সমন্বয় ও সংশোধন</h3>
                    <p className="text-[11px] text-slate-500 font-medium">কাউন্টার ডিসপ্লে ও গোডাউন ফ্লোরের সঠিক হিসাব নির্ধারণ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustTargetProduct(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* পণ্য ও বর্তমান স্টক কার্ড */}
              <div className="p-3.5 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 text-sm font-bold truncate">{adjustTargetProduct.ProductName}</strong>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-[#E5E5E5] shrink-0">
                    ID: {adjustTargetProduct.ProductID}
                  </span>
                </div>
                {(() => {
                  const isT = /than|থান/i.test(getProductDisplayUnit(adjustTargetProduct));
                  const u = getProductDisplayUnit(adjustTargetProduct);
                  const sStk = Number(adjustTargetProduct.StockQuantity || 0);
                  const gStk = Number(adjustTargetProduct.GodownStock || 0);
                  return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-md border border-emerald-100 shadow-none">
                        <span className="text-[10.5px] font-semibold text-slate-500 block mb-0.5">বর্তমান দোকান</span>
                        <span className="text-sm font-black text-[#0b8b72] font-mono">
                          {sStk.toLocaleString('bn-BD')} {isT ? 'গজ' : u}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-md border border-[#E5E5E5]/90 shadow-none">
                        <span className="text-[10.5px] font-semibold text-slate-500 block mb-0.5">বর্তমান গোডাউন</span>
                        <span className="text-sm font-black text-slate-800 font-mono">
                          {gStk.toLocaleString('bn-BD')} {isT ? 'থান' : u}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-3.5 text-xs">
                {/* ১. লোকেশন নির্বাচন */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">কোন অবস্থানের স্টক পরিবর্তন করবেন?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setAdjustLocation('Shop'); setAdjustReason('দোকান সেলফ গণনা সংশোধন'); }}
                      className={`py-2.5 px-3 rounded-md font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                        adjustLocation === 'Shop' ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none' : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>দোকান ফ্লোর</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdjustLocation('Godown'); setAdjustReason('নতুন লট গোডাউনে আগমন'); }}
                      className={`py-2.5 px-3 rounded-md font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                        adjustLocation === 'Godown' ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none' : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <Warehouse className="w-4 h-4" />
                      <span>গোডাউন</span>
                    </button>
                  </div>
                </div>

                {/* ২. সমন্বয়ের ধরন */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">সমন্বয়ের ধরন</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustAction('ADD')}
                      className={`py-2 rounded-md font-bold border transition-all cursor-pointer ${
                        adjustAction === 'ADD' ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-black shadow-none' : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      যোগ (ADD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustAction('DEDUCT')}
                      className={`py-2 rounded-md font-bold border transition-all cursor-pointer ${
                        adjustAction === 'DEDUCT' ? 'bg-rose-50 text-rose-950 border-rose-300 font-black shadow-none' : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      হ্রাস (DEDUCT)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustAction('SET')}
                      className={`py-2 rounded-md font-bold border transition-all cursor-pointer ${
                        adjustAction === 'SET' ? 'bg-blue-50 text-blue-950 border-blue-300 font-black shadow-none' : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      নতুন মান (SET)
                    </button>
                  </div>
                </div>

                {/* ৩. পরিমাণ ও লাইভ প্রিভিউ */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">
                    {adjustAction === 'SET' ? 'নতুন নির্ধারিত স্টক' : 'সমন্বয়ের পরিমাণ'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-black font-mono border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-hidden"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                      {/than|থান/i.test(getProductDisplayUnit(adjustTargetProduct))
                        ? (adjustLocation === 'Shop' ? 'গজ' : 'থান')
                        : getProductDisplayUnit(adjustTargetProduct)}
                    </span>
                  </div>

                  {/* লাইভ হিসাব প্রিভিউ */}
                  {(() => {
                    const isT = /than|থান/i.test(getProductDisplayUnit(adjustTargetProduct));
                    const unitName = isT ? (adjustLocation === 'Shop' ? 'গজ' : 'থান') : getProductDisplayUnit(adjustTargetProduct);
                    const cur = Number(adjustLocation === 'Shop' ? (adjustTargetProduct.StockQuantity || 0) : (adjustTargetProduct.GodownStock || 0));
                    const q = Number(adjustQty) || 0;
                    let next = cur;
                    if (adjustAction === 'ADD') next = cur + q;
                    else if (adjustAction === 'DEDUCT') next = Math.max(0, cur - q);
                    else if (adjustAction === 'SET') next = q;
                    return (
                      <div className="mt-2 p-2.5 bg-emerald-50/50 rounded-md border border-emerald-100 flex items-center justify-between text-xs text-emerald-950">
                        <span className="text-slate-600 font-medium">হিসাব ফলাফল:</span>
                        <div className="font-mono font-bold flex items-center space-x-1.5">
                          <span className="text-slate-500 line-through">{cur}</span>
                          <span className="text-[#0F172A]">→</span>
                          <span className="text-[#0b8b72] text-sm font-black underline">{next} {unitName}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ৪. পরিবর্তনের কারণ (দ্রুত বাটন ও ইনপুট) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">পরিবর্তনের কারণ বা খাত</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(adjustLocation === 'Shop' ? [
                      'কাটিং শর্টেজ/ছাঁট',
                      'দোকান সেলফ গণনা সংশোধন',
                      'কাউন্টার ডিসপ্লে ড্যামেজ',
                      'নমুনা হিসেবে প্রদান',
                      'কাস্টমার ট্রায়াল নষ্ট',
                      'অন্যান্য সমন্বয়'
                    ] : [
                      'নতুন লট গোডাউনে আগমন',
                      'গোডাউন গণনা ভুল সংশোধন',
                      'গোডাউন ড্যামেজ/পানি নষ্ট',
                      'মহাজনকে ফেরত',
                      'অন্যান্য সমন্বয়'
                    ]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAdjustReason(r)}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                          adjustReason === r
                            ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none font-bold'
                            : 'bg-white text-slate-600 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md bg-white font-medium focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-hidden"
                    placeholder="সরাসরি কারণ লিখুন বা উপরের বাটনে চাপ দিন..."
                  />
                </div>

                {/* ৫. মন্তব্য (ঐচ্ছিক) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">মন্তব্য (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="অতিরিক্ত কোনো তথ্য বা চালান নম্বর..."
                    className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* বাটন গ্রুপ */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteStockAdjust}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-[#111111] font-medium text-sm font-heading rounded-md text-xs shadow-none shadow-emerald-600/20 cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>সমন্বয় নিশ্চিত ও ডাটাবেস সিঙ্ক</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTargetProduct(null)}
                  className="px-4 py-2.5 bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 font-bold rounded-md text-xs cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* ৫. ভ্যারিয়েন্ট লেভেল রিস্টক ও সমন্বয় পপআপ মডাল (Modern Fastkart Style) */}
        {/* =============================================================== */}
        {variantRestockModal && (() => {
          const prod = variantRestockModal.product;
          const targetV = variantRestockModal.variant;
          const prodUnit = getProductDisplayUnit(prod);
          const isProdThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isProdThan ? (Number(prod?.YardsPerThan || prod?.yardsPerThan || 0) || 25) : 0;
          const varLabel = targetV.Color ? `রং: ${targetV.Color}` : targetV.Size ? `সাইজ: ${targetV.Size}` : (targetV.VariantID || `#${variantRestockModal.variantIdx + 1}`);

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/40  animate-in fade-in duration-200">
              <div className="relative w-full max-w-md bg-white rounded-lg shadow-none border border-[#E5E5E5] overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
                
                {/* হেডার */}
                <div className="px-5 py-3.5 bg-white border-b border-[#E5E5E5] text-[#111111] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-[#F5F5F5] rounded-sm border border-[#E5E5E5]">
                      <PlusCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">ভ্যারিয়েন্ট রিস্টক ও সমন্বয়</h3>
                      <p className="text-[11px] text-[#525252] font-medium">
                        {prod.ProductName} — <span className="font-bold underline">{varLabel}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariantRestockModal(null)}
                    className="text-[#737373] hover:text-[#111111] p-1 rounded-sm hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ফর্ম কন্টেন্ট */}
                <form onSubmit={handleSaveVariantRestockSubmit} className="p-5 space-y-4">
                  
                  {/* বর্তমান স্টক কার্ড */}
                  <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-100/90 flex items-center justify-between">
                    <div className="text-center flex-1 border-r border-emerald-200/60">
                      <span className="text-[10.5px] font-semibold text-slate-500 block">বর্তমান গোডাউন</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {targetV.GodownStock || 0} {isProdThan ? 'থান' : getProductDisplayUnit(prod)}
                      </span>
                      {isProdThan && prodYardsPerThan > 0 && (
                        <span className="text-[9.5px] text-slate-500 block font-medium">
                          ({(targetV.GodownStock || 0) * prodYardsPerThan} গজ)
                        </span>
                      )}
                    </div>
                    <div className="text-center flex-1">
                      <span className="text-[10.5px] font-semibold text-slate-500 block">বর্তমান দোকান</span>
                      <span className="text-sm font-black text-[#0b8b72] font-mono">
                        {targetV.StockQuantity || 0} {isProdThan ? 'গজ' : getProductDisplayUnit(prod)}
                      </span>
                      {isProdThan && prodYardsPerThan > 0 && Number(targetV.StockQuantity || 0) > 0 && (
                        <span className="text-[9.5px] text-[#0F172A] block font-semibold">
                          ({calculateThanBreakdown(targetV.StockQuantity, prodYardsPerThan, 2).displayText})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* অবস্থান বাছাই (গোডাউন নাকি দোকান) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">কোন অবস্থানে পরিবর্তন করবেন?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({
                          ...prev,
                          location: 'Shop',
                          reason: 'দোকান সেলফ বৃদ্ধি / সমন্বয়'
                        }))}
                        className={`py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                          variantRestockModal.location === 'Shop'
                            ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none'
                            : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        <Store className="w-4 h-4" />
                        <span>দোকান</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({
                          ...prev,
                          location: 'Godown',
                          reason: 'নতুন লট গোডাউনে আগমন'
                        }))}
                        className={`py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                          variantRestockModal.location === 'Godown'
                            ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none'
                            : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        <Warehouse className="w-4 h-4" />
                        <span>গোডাউন</span>
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
                        className={`py-2 rounded-md font-bold border transition-all cursor-pointer ${
                          variantRestockModal.action === 'ADD'
                            ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-black shadow-none'
                            : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        যোগ (ADD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({ ...prev, action: 'DEDUCT' }))}
                        className={`py-2 rounded-md font-bold border transition-all cursor-pointer ${
                          variantRestockModal.action === 'DEDUCT'
                            ? 'bg-rose-50 text-rose-950 border-rose-300 font-black shadow-none'
                            : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        বিয়োগ
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariantRestockModal(prev => ({ ...prev, action: 'SET' }))}
                        className={`py-2 rounded-md font-bold border transition-all cursor-pointer ${
                          variantRestockModal.action === 'SET'
                            ? 'bg-blue-50 text-blue-950 border-blue-300 font-black shadow-none'
                            : 'bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        সরাসরি সেট
                      </button>
                    </div>
                  </div>

                  {/* পরিমাণ ইনপুট ও লাইভ গজ প্রিভিউ */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      {variantRestockModal.action === 'SET' ? 'নতুন নির্ধারিত স্টক সংখ্যা' : 'সমন্বয়ের পরিমাণ / রিস্টক সংখ্যা'}
                    </label>

                    {isProdThan && variantRestockModal.location === 'Shop' ? (
                      <div className="p-3 bg-emerald-50/70 rounded-md border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                          <span>দোকানে গজ ও গিরা ইনপুট</span>
                          <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">১ গজ = ১৬ গিরা</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">গজ</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={variantRestockModal.fabricGoj !== undefined ? variantRestockModal.fabricGoj : ''}
                              onChange={(e) => {
                                const g = parseFloat(e.target.value) || 0;
                                const gi = parseFloat(variantRestockModal.fabricGira) || 0;
                                const tot = Math.round((g + (gi / 16)) * 10000) / 10000;
                                setVariantRestockModal(prev => ({
                                  ...prev,
                                  fabricGoj: e.target.value,
                                  quantity: tot
                                }));
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 text-xs font-bold font-mono border border-[#E5E5E5] rounded-lg bg-white focus:ring-2 focus:ring-1 focus:ring-[#0F172A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">গিরা (০-১৫)</label>
                            <input
                              type="number"
                              min="0"
                              max="15"
                              step="1"
                              value={variantRestockModal.fabricGira !== undefined ? variantRestockModal.fabricGira : ''}
                              onChange={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val)) val = 0;
                                if (val < 0) val = 0;
                                if (val > 15) val = 15;
                                const g = parseFloat(variantRestockModal.fabricGoj) || 0;
                                const tot = Math.round((g + (val / 16)) * 10000) / 10000;
                                setVariantRestockModal(prev => ({
                                  ...prev,
                                  fabricGira: val === 0 && e.target.value === '' ? '' : val,
                                  quantity: tot
                                }));
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 text-xs font-bold font-mono border border-[#E5E5E5] rounded-lg bg-white focus:ring-2 focus:ring-1 focus:ring-[#0F172A]"
                            />
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-900 bg-white p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                          <span>মোট পরিমাণ:</span>
                          <span className="font-mono text-xs font-bold text-[#0F172A]">
                            {(Number(variantRestockModal.quantity) || 0).toLocaleString('bn-BD')} গজ
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={variantRestockModal.quantity}
                          onChange={(e) => setVariantRestockModal(prev => ({ ...prev, quantity: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm font-black font-mono border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-hidden"
                          placeholder="0"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                          {isProdThan
                            ? (variantRestockModal.location === 'Shop' ? 'গজ' : 'থান')
                            : getProductDisplayUnit(prod)}
                        </span>
                      </div>
                    )}
                    {isProdThan && prodYardsPerThan > 0 && variantRestockModal.location === 'Godown' && (
                      <div className="mt-1.5 px-3 py-1.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-semibold">
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
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(variantRestockModal.location === 'Shop' ? [
                        'কাটিং শর্টেজ/ছাঁট',
                        'দোকান সেলফ বৃদ্ধি / সমন্বয়',
                        'কাউন্টার ড্যামেজ',
                        'নমুনা প্রদান',
                        'অন্যান্য'
                      ] : [
                        'নতুন লট গোডাউনে আগমন',
                        'গোডাউন গণনা ভুল সংশোধন',
                        'ড্যামেজ/নষ্ট',
                        'মহাজনকে ফেরত',
                        'অন্যান্য'
                      ]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setVariantRestockModal(prev => ({ ...prev, reason: r }))}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                            variantRestockModal.reason === r
                              ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none font-bold'
                              : 'bg-white text-slate-600 border-[#E5E5E5] hover:bg-[#F5F5F5]'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={variantRestockModal.reason}
                      onChange={(e) => setVariantRestockModal(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-hidden"
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
                      className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-md focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-hidden"
                      placeholder="চালান নম্বর বা অতিরিক্ত বিবরণ..."
                    />
                  </div>

                  {/* নতুন ভ্যারিয়েন্ট স্টক যোগ করার শর্টকাট */}
                  <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">অন্য নতুন কোনো ভ্যারিয়েন্টের স্টক বাড়াতে চান?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const prod = variantRestockModal.product;
                        setVariantRestockModal(null);
                        handleOpenNewColor(prod);
                      }}
                      className="text-[#0F172A] hover:text-[#0b8b72] font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
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
                      className="flex-1 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-[#111111] font-medium text-sm font-heading rounded-md text-xs shadow-none shadow-emerald-600/20 cursor-pointer transition-all flex items-center justify-center space-x-1.5 disabled:cursor-not-allowed"
                    >
                      {isSubmittingVariantRestock ? (
                        <span className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>মজুত সমন্বয় সংরক্ষণ হচ্ছে...</span>
                        </span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>দোকানের মজুত সমন্বয় সংরক্ষণ করুন</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingVariantRestock}
                      onClick={() => setVariantRestockModal(null)}
                      className="px-4 py-2.5 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] font-bold rounded-md text-xs cursor-pointer shadow-none transition-colors"
                    >
                      বাতিল করে ফিরে যান
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
          const prodUnit = getProductDisplayUnit(prod);
          const isThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isThan ? (Number(prod.YardsPerThan || prod.yardsPerThan || 0) || 25) : 0;
          const effNewColorYpt = isThan ? (Number(newColorModal.yardsPerThan) > 0 ? Number(newColorModal.yardsPerThan) : prodYardsPerThan) : 0;
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
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/40  animate-in fade-in duration-200">
              <div className="bg-white rounded-md shadow-none border border-[#E5E5E5] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-3.5 bg-white border-b border-[#E5E5E5] text-[#111111] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-neutral-300" />
                    <div>
                      <h3 className="text-sm font-bold">নতুন ভ্যারিয়েন্ট যোগ ও গোডাউন রিস্টক</h3>
                      <p className="text-[11px] text-neutral-300">{prod.ProductName} ({prod.Category || 'পণ্য'})</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewColorModal(null)}
                    className="p-1 text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
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
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                      >
                        <option value="Color">রঙ / কালার (Color)</option>
                        <option value="Size">সাইজ / মাপ (Size)</option>
                        <option value="Weight">ওজন / পরিমাপ (Weight)</option>
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
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
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
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white"
                    />
                  </div>

                  {/* ১-ক্লিক দ্রুত বাছাই চিপস */}
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-neutral-600" />
                        <span>১-ক্লিকে দ্রুত বাছাই ({currentType} তালিকা):</span>
                      </div>
                      <span className="text-[10px] text-neutral-600 font-semibold">{displayOptions.length}টি অপশন</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#FAFAFA] rounded-md border border-[#E5E5E5]">
                      {displayOptions.map(c => {
                        const isSelected = (newColorModal.variantName || newColorModal.colorName) === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewColorModal(prev => ({ ...prev, variantName: c, colorName: c }))}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none'
                                : 'bg-white hover:bg-neutral-50 text-slate-700 border-[#E5E5E5]'
                            }`}
                          >
                            + {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* থান কাপড়ের জন্য বিশেষ গজ/থান ইনপুট */}
                  {isThan && (
                    <div className="p-3 bg-[#FFFBEB]/50 rounded-md border border-[#FEF3C7]/70">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-amber-950 flex items-center space-x-1.5">
                          <Scissors className="w-3.5 h-3.5 text-amber-600" />
                          <span>এই ভ্যারিয়েন্টের প্রতি থানের দৈর্ঘ্য (গজ)</span>
                        </label>
                        <span className="text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-medium">
                          ঐচ্ছিক / বিশেষ সাইজ
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={newColorModal.yardsPerThan !== undefined ? newColorModal.yardsPerThan : ''}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, yardsPerThan: e.target.value }))}
                        placeholder={`ডিফল্ট: ${prodYardsPerThan} গজ (মূল পণ্য)`}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        খালি রাখলে মূল পণ্যের ডিফল্ট ({prodYardsPerThan} গজ) কার্যকর থাকবে। বিশেষ সাইজ (যেমন ২০ বা ৩০ গজ) হলে লিখুন।
                      </p>
                    </div>
                  )}

                  {/* প্রারম্ভিক স্টক ইনপুট */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-900 mb-1">
                        গোডাউন স্টক ({isThan ? 'থান' : getProductDisplayUnit(prod)})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.godownStock}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, godownStock: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-black text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                      {isThan && effNewColorYpt > 0 && (
                        <div className="text-[10px] text-neutral-700 font-bold mt-1">
                          = {(Number(newColorModal.godownStock) || 0) * effNewColorYpt} গজ
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        দোকান স্টক ({isThan ? 'গজ' : getProductDisplayUnit(prod)})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newColorModal.shopStock}
                        onChange={(e) => setNewColorModal(prev => ({ ...prev, shopStock: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {isThan && effNewColorYpt > 0 && Number(newColorModal.shopStock || 0) > 0 && (
                        <div className="text-[10px] text-emerald-700 font-bold mt-1">
                          = {calculateThanBreakdown(newColorModal.shopStock, effNewColorYpt, 2).displayText}
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
                        className="w-full px-2 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs font-semibold"
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
                        className="w-full px-2 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs font-bold text-neutral-700"
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
                        className="w-full px-2 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#B45309]"
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
                      className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-[11px] font-mono"
                    />
                  </div>

                  {/* Footer buttons */}
                  <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setNewColorModal(null)}
                      className="px-4 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] rounded-md font-bold transition-all cursor-pointer shadow-none"
                    >
                      বাতিল করে ফিরে যান
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNewColor}
                      className="px-5 py-2 bg-[#0F172A] hover:bg-[#0F172A] text-white rounded-md font-bold transition-all shadow-none flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingNewColor ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>ভ্যারিয়েন্ট তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>নতুন রঙের ভ্যারিয়েন্ট সংরক্ষণ করুন</span>
                        </>
                      )}
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
          const prodUnit = getProductDisplayUnit(prod);
          const isThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isThan ? (Number(prod.YardsPerThan || prod.yardsPerThan || 0) || 25) : 0;
          const effVariantYpt = isThan ? (Number(editVariantModal.yardsPerThan) > 0 ? Number(editVariantModal.yardsPerThan) : prodYardsPerThan) : 0;
          const currentUnit = isThan ? 'থান' : prodUnit;
          const effRemTh = Number(
            prod.RemnantThreshold !== undefined && prod.RemnantThreshold !== null && prod.RemnantThreshold !== '' && Number(prod.RemnantThreshold) > 0
              ? prod.RemnantThreshold
              : (prod.remnantThreshold !== undefined && prod.remnantThreshold !== null && prod.remnantThreshold !== '' && Number(prod.remnantThreshold) > 0
                ? prod.remnantThreshold
                : 1)
          );

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/40  animate-in fade-in duration-150">
              <div className="relative w-full max-w-lg bg-white rounded-md shadow-none border border-[#E5E5E5] overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* মডাল হেডার */}
                <div className="px-5 py-3.5 bg-white border-b border-[#E5E5E5] text-[#111111] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
                      <Edit3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight">ভ্যারিয়েন্ট এডিট ও স্টক আপডেট</h3>
                      <p className="text-[11px] text-[#525252] font-medium truncate max-w-[280px]">
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
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* থান কাপড়ের জন্য বিশেষ গজ/থান ইনপুট */}
                  {isThan && (
                    <div className="p-3 bg-[#FFFBEB]/50 rounded-md border border-[#FEF3C7]/70">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-amber-950 flex items-center space-x-1.5">
                          <Scissors className="w-3.5 h-3.5 text-amber-600" />
                          <span>এই ভ্যারিয়েন্টের প্রতি থানের দৈর্ঘ্য (গজ)</span>
                        </label>
                        <span className="text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-medium">
                          ঐচ্ছিক / বিশেষ সাইজ
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={editVariantModal.yardsPerThan !== undefined ? editVariantModal.yardsPerThan : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newYpt = Number(val) > 0 ? Number(val) : prodYardsPerThan;
                          const ft = Math.max(0, parseInt(editVariantModal.fullThans, 10) || 0);
                          const cg = Math.max(0, parseInt(editVariantModal.cutGoj, 10) || 0);
                          const cgi = Math.max(0, parseInt(editVariantModal.cutGira, 10) || 0);
                          const totalYards = calculateInitialShopYards(ft, cg, cgi, newYpt);
                          setEditVariantModal(prev => ({
                            ...prev,
                            yardsPerThan: val,
                            shopStock: totalYards
                          }));
                        }}
                        placeholder={`ডিফল্ট: ${prodYardsPerThan} গজ (মূল পণ্য)`}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        খালি রাখলে মূল পণ্যের ডিফল্ট ({prodYardsPerThan} গজ) কার্যকর থাকবে। বিশেষ সাইজ (যেমন ২০ বা ৩০ গজ) হলে লিখুন।
                      </p>
                    </div>
                  )}

                  {/* গোডাউন ও দোকান স্টক ইনপুট */}
                  <div className="p-3.5 bg-[#FFFBEB]/60 rounded-md border border-[#FEF3C7] space-y-2.5">
                    <div className="text-[11px] font-bold text-[#B45309] flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      <span>মজুত সমন্বয় (একক: {currentUnit})</span>
                    </div>

                    <div className={isThan && effVariantYpt > 0 ? "space-y-3" : "grid grid-cols-2 gap-3"}>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-900 mb-1">
                          গোডাউন স্টক ({currentUnit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={editVariantModal.godownStock}
                          onChange={(e) => setEditVariantModal(prev => ({ ...prev, godownStock: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-black text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                        {isThan && effVariantYpt > 0 && (
                          <div className="text-[10px] text-neutral-700 font-bold mt-1">
                            = {(Number(editVariantModal.godownStock) || 0) * effVariantYpt} গজ
                          </div>
                        )}
                      </div>

                      {isThan && effVariantYpt > 0 ? (
                        <div className="p-3 bg-emerald-50/70 rounded-md border border-emerald-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-bold text-emerald-950 flex items-center space-x-1">
                              <Store className="w-3.5 h-3.5 text-[#0F172A]" />
                              <span>দোকানে বর্তমান মজুত (আস্ত থান + কাটা থান গজ ও গিরা)</span>
                            </label>
                            <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-none">
                              ১ থান = {effVariantYpt} গজ | ১ গজ = ১৬ গিরা
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                                আস্ত থান
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={editVariantModal.fullThans !== undefined ? editVariantModal.fullThans : ''}
                                onChange={(e) => {
                                  const ft = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  const cg = Math.max(0, parseInt(editVariantModal.cutGoj, 10) || 0);
                                  const cgi = Math.max(0, parseInt(editVariantModal.cutGira, 10) || 0);
                                  const totalYards = calculateInitialShopYards(ft, cg, cgi, effVariantYpt);
                                  setEditVariantModal(prev => ({
                                    ...prev,
                                    fullThans: e.target.value,
                                    shopStock: totalYards
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-1 focus:ring-[#0F172A]"
                              />
                              <span className="text-[9.5px] text-slate-500 font-semibold block mt-0.5">
                                = {((parseInt(editVariantModal.fullThans, 10) || 0) * effVariantYpt)} গজ
                              </span>
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                                কাটা গজ
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={editVariantModal.cutGoj !== undefined ? editVariantModal.cutGoj : ''}
                                onChange={(e) => {
                                  const ft = Math.max(0, parseInt(editVariantModal.fullThans, 10) || 0);
                                  const cg = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  const cgi = Math.max(0, parseInt(editVariantModal.cutGira, 10) || 0);
                                  const totalYards = calculateInitialShopYards(ft, cg, cgi, effVariantYpt);
                                  setEditVariantModal(prev => ({
                                    ...prev,
                                    cutGoj: e.target.value,
                                    shopStock: totalYards
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-1 focus:ring-[#0F172A]"
                              />
                              <span className="text-[9.5px] text-slate-500 font-semibold block mt-0.5">
                                রানিং কাটা থান
                              </span>
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                                কাটা গিরা (০-১৫)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="15"
                                step="1"
                                value={editVariantModal.cutGira !== undefined ? editVariantModal.cutGira : ''}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value, 10);
                                  if (isNaN(val)) val = 0;
                                  if (val < 0) val = 0;
                                  if (val > 15) val = 15;
                                  const ft = Math.max(0, parseInt(editVariantModal.fullThans, 10) || 0);
                                  const cg = Math.max(0, parseInt(editVariantModal.cutGoj, 10) || 0);
                                  const totalYards = calculateInitialShopYards(ft, cg, val, effVariantYpt);
                                  setEditVariantModal(prev => ({
                                    ...prev,
                                    cutGira: val === 0 && e.target.value === '' ? '' : val,
                                    shopStock: totalYards
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-1 focus:ring-[#0F172A]"
                              />
                              <span className="text-[9.5px] text-slate-500 font-semibold block mt-0.5">
                                = {((parseInt(editVariantModal.cutGira, 10) || 0) / 16).toFixed(4)} গজ
                              </span>
                            </div>
                          </div>

                          {/* লাইভ মোট গজ ও সম্পদ মূল্য প্রিভিউ */}
                          <div className="mt-2.5 p-2 bg-white rounded-lg border border-emerald-200/90 flex flex-wrap items-center justify-between gap-1.5">
                            <div className="text-[11px] font-black text-emerald-900">
                              মোট দোকান গজ: <span className="font-mono text-xs text-[#0F172A] font-bold">{Number(editVariantModal.shopStock || 0).toLocaleString('bn-BD')} গজ</span>
                              <span className="text-[10px] text-slate-500 font-medium ml-1.5">
                                ({calculateThanBreakdown(editVariantModal.shopStock || 0, effVariantYpt, effRemTh).displayText})
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-slate-800">
                              সম্পদ মূল্য: <span className="font-mono text-xs text-amber-700 font-bold">{currencySymbol}{Math.round((Number(editVariantModal.shopStock || 0)) * (Number(editVariantModal.costPrice) || Number(prod.CostPrice || 0))).toLocaleString('bn-BD')}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                            দোকান স্টক ({currentUnit})
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
                          {isThan && effVariantYpt > 0 && Number(editVariantModal.shopStock || 0) > 0 && (
                            <div className="text-[10px] text-emerald-700 font-bold mt-1">
                              = {calculateThanBreakdown(editVariantModal.shopStock, effVariantYpt, effRemTh).displayText}
                            </div>
                          )}
                        </div>
                      )}
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
                        className="w-full px-2 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs font-semibold"
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
                        className="w-full px-2 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs font-bold text-neutral-700"
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
                        className="w-full px-2 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#B45309]"
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
                      className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-[11px] font-mono"
                    />
                  </div>

                  {/* Footer buttons */}
                  <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditVariantModal(null)}
                      className="px-4 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] rounded-md font-bold transition-all cursor-pointer shadow-none"
                    >
                      বাতিল করে ফিরে যান
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEditVariant}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold transition-all shadow-none flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingEditVariant ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>তথ্য সংরক্ষণ হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ভ্যারিয়েন্টের বিবরণ সংরক্ষণ করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* ৪.৪ গোডাউন থেকে দোকানে সরাসরি পণ্য নিয়ে যাওয়ার আধুনিক ও পরিচ্ছন্ন মডাল */}
        {/* ========================================================================= */}
        {directTransferModal && (() => {
          const prod = directTransferModal.product;
          if (!prod) return null;
          const vars = getVariantsOfProduct(prod);
          const hasVars = Array.isArray(vars) && vars.length > 0;
          const prodUnit = getProductDisplayUnit(prod);
          const isThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isThan ? (Number(prod.YardsPerThan || prod.yardsPerThan || 0) || 25) : 0;
          const unitLabel = isThan ? 'থান' : prodUnit;

          const currentTargetVar = hasVars
            ? vars.find((v) => String(v.VariantID || v.variantId) === String(directTransferModal.selectedVariantId)) || vars[0]
            : null;

          const currentTargetYpt = isThan
            ? (Number(currentTargetVar?.YardsPerThan || currentTargetVar?.yardsPerThan || prodYardsPerThan) || 25)
            : 0;

          const currentAvailableGodown = currentTargetVar
            ? Number(currentTargetVar.GodownStock !== undefined ? currentTargetVar.GodownStock : 0)
            : Number(prod.GodownStock || 0);

          const currentShopStock = currentTargetVar
            ? Number(currentTargetVar.StockQuantity !== undefined ? currentTargetVar.StockQuantity : 0)
            : Number(prod.StockQuantity || 0);

          const transferQty = Math.max(0, Number(directTransferModal.quantity) || 0);

          // বালক মোডে মোট পরিমাণ ও মোট গজ
          const bulkTotalQty = Object.values(directTransferModal.bulkQuantities || {}).reduce(
            (sum, q) => sum + (Number(q) || 0), 0
          );
          const bulkTotalYards = hasVars && isThan
            ? vars.reduce((sum, v) => {
                const q = Number(directTransferModal.bulkQuantities?.[v.VariantID || v.variantId] || 0);
                const vy = Number(v.YardsPerThan || v.yardsPerThan || prodYardsPerThan) || 25;
                return sum + (q * vy);
              }, 0)
            : 0;

          const effectiveTransferQty = directTransferModal.mode === 'all' ? bulkTotalQty : transferQty;
          const effectiveYards = isThan
            ? (directTransferModal.mode === 'all' ? bulkTotalYards : (effectiveTransferQty * currentTargetYpt))
            : 0;

          return (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/40  animate-in fade-in duration-200">
              <div className="bg-white rounded-lg shadow-none border border-[#E5E5E5] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* ১. স্লিম ও পরিচ্ছন্ন হেডার */}
                <div className="px-5 py-4 bg-slate-900 text-[#111111] flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[#0F172A] flex items-center justify-center shadow-none shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                          দোকানে স্টক স্থানান্তর
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F172A]/20 text-emerald-300 border border-emerald-400/30">
                          সরাসরি চালান
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium truncate max-w-[260px] sm:max-w-sm mt-0.5">
                        {prod.ProductName} {prod.Category ? `• ${prod.Category}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDirectTransferModal(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    title="বন্ধ করুন"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ২. ফর্ম বডি */}
                <form onSubmit={handleConfirmDirectTransferSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
                  
                  {/* ভিজ্যুয়াল মুভমেন্ট ফ্লো ব্যানার (উৎস → গন্তব্য) */}
                  <div className="p-3.5 bg-[#FAFAFA]/90 rounded-md border border-[#E5E5E5]/90 flex items-center justify-between shadow-none">
                    {/* উৎস: গোডাউন */}
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 block uppercase tracking-wider">
                        কেন্দ্রীয় গোডাউন
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
                        {currentAvailableGodown} <span className="text-xs font-bold text-slate-600">{unitLabel}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">বর্তমান মজুত</span>
                    </div>

                    {/* মাঝের মুভমেন্ট আইকন ও অ্যারো */}
                    <div className="flex flex-col items-center justify-center px-3 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#0F172A] flex items-center justify-center shadow-none">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-[#0F172A] mt-1 uppercase tracking-tight">স্থানান্তর</span>
                    </div>

                    {/* গন্তব্য: দোকান */}
                    <div className="text-right flex-1 min-w-0">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 block uppercase tracking-wider">
                        শপ ফ্লোর ও কাউন্টার
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-700 block mt-0.5">
                        {isThan ? `${currentShopStock} গজ` : `${currentShopStock} ${unitLabel}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium truncate block">
                        {isThan && prodYardsPerThan > 0 && currentShopStock > 0
                          ? `(${calculateThanBreakdown(currentShopStock, prodYardsPerThan, 2).displayText})`
                          : 'বর্তমান মজুত'}
                      </span>
                    </div>
                  </div>

                  {/* ৩. ভ্যারিয়েন্ট সিলেকশন (যদি পণ্যটিতে ভ্যারিয়েন্ট থাকে) */}
                  {hasVars && (
                    <div className="space-y-3">
                      {/* মোড নির্বাচন: একক ভ্যারিয়েন্ট বনাম সকল ভ্যারিয়েন্ট */}
                      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                        <label className="text-xs font-bold text-slate-800">
                          স্থানান্তর মোড:
                        </label>
                        <div className="flex items-center bg-[#F5F5F5] p-0.5 rounded-md border border-[#E5E5E5] text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setDirectTransferModal(prev => ({ ...prev, mode: 'single' }))}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              directTransferModal.mode === 'single'
                                ? 'bg-white text-slate-900 shadow-none font-black'
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
                                ? 'bg-white text-slate-900 shadow-none font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            সকল ভ্যারিয়েন্ট (${vars.length})
                          </button>
                        </div>
                      </div>

                      {/* মোড ১: একক ভ্যারিয়েন্ট নির্বাচন */}
                      {directTransferModal.mode === 'single' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                              কোন ভ্যারিয়েন্টটি আনতে চান? <span className="text-rose-500">*</span>
                            </label>

                            {vars.length <= 8 ? (
                              /* চিপস / পিল বাটন সিলেক্টর (ক্লিন ও দ্রুত ক্লিকের জন্য) */
                              <div className="flex flex-wrap gap-1.5">
                                {vars.map((v) => {
                                  const vId = v.VariantID || v.variantId;
                                  const attrs = v.Attributes || {};
                                  const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
                                  const gStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                                  const isSelected = String(directTransferModal.selectedVariantId) === String(vId);
                                  const isOutOfStock = gStk <= 0;

                                  return (
                                    <button
                                      key={vId}
                                      type="button"
                                      disabled={isOutOfStock}
                                      onClick={() => {
                                        setDirectTransferModal(prev => ({
                                          ...prev,
                                          selectedVariantId: vId,
                                          quantity: gStk > 0 ? (Number(prev.quantity) > gStk ? gStk : (Number(prev.quantity) || 1)) : 0
                                        }));
                                      }}
                                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                                        isSelected
                                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-none'
                                          : isOutOfStock
                                          ? 'bg-[#F5F5F5] text-slate-400 border-[#E5E5E5]/60 cursor-not-allowed opacity-60'
                                          : 'bg-white hover:bg-[#FAFAFA] text-slate-700 border-[#E5E5E5] shadow-none'
                                      }`}
                                    >
                                      <span>{vName}</span>
                                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                        isSelected ? 'bg-white/20 text-white' : isOutOfStock ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-800'
                                      }`}>
                                        {gStk}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              /* ৮ টির বেশি ভ্যারিয়েন্ট হলে স্লিক ড্রপডাউন */
                              <select
                                value={directTransferModal.selectedVariantId}
                                onChange={(e) => {
                                  const newVId = e.target.value;
                                  const match = vars.find(v => String(v.VariantID || v.variantId) === newVId);
                                  const avail = match ? Number(match.GodownStock !== undefined ? match.GodownStock : 0) : 0;
                                  setDirectTransferModal(prev => ({
                                    ...prev,
                                    selectedVariantId: newVId,
                                    quantity: avail > 0 ? (Number(prev.quantity) > avail ? avail : (Number(prev.quantity) || 1)) : 0
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-1 focus:ring-[#0F172A]/15 focus:border-[#0F172A] cursor-pointer"
                              >
                                {vars.map((v) => {
                                  const vId = v.VariantID || v.variantId;
                                  const attrs = v.Attributes || {};
                                  const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
                                  const gStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                                  const sStk = Number(v.StockQuantity !== undefined ? v.StockQuantity : 0);
                                  return (
                                    <option key={vId} value={vId} disabled={gStk <= 0}>
                                      {vName} — (গোডাউনে আছে: {gStk} {unitLabel} | দোকানে: {sStk} {unitLabel})
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>

                          {/* স্থানান্তরের পরিমাণ নির্ধারণ (Hero Stepper) */}
                          <div className="bg-[#FAFAFA] p-4 rounded-md border border-[#E5E5E5]/90 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800">
                                দোকানে কত {unitLabel} আনতে চান? <span className="text-rose-500">*</span>
                              </label>
                              <span className="text-[11px] font-medium text-slate-500">
                                গোডাউনে আছে: <strong className="font-mono text-emerald-700 font-black">{currentAvailableGodown}</strong> {unitLabel}
                              </span>
                            </div>

                            {/* +/- কাউন্টার স্টাইল বড় ইনপুট */}
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                type="button"
                                disabled={transferQty <= 1}
                                onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: Math.max(1, (Number(prev.quantity) || 1) - 1) }))}
                                className="w-11 h-11 rounded-md bg-white border border-[#E5E5E5] text-slate-700 hover:bg-[#F5F5F5] active:scale-95 flex items-center justify-center text-lg font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-none"
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <div className="relative flex-1 max-w-[160px]">
                                <input
                                  type="number"
                                  min="1"
                                  max={currentAvailableGodown}
                                  value={directTransferModal.quantity}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(currentAvailableGodown, Number(e.target.value) || 0));
                                    setDirectTransferModal(prev => ({ ...prev, quantity: e.target.value === '' ? '' : val }));
                                  }}
                                  className="w-full py-2.5 px-3 text-xl font-black font-mono text-center text-slate-900 bg-white border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-1 focus:ring-[#0F172A]/15 focus:border-[#0F172A] shadow-none"
                                  placeholder="1"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                  {unitLabel}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={transferQty >= currentAvailableGodown}
                                onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: Math.min(currentAvailableGodown, (Number(prev.quantity) || 0) + 1) }))}
                                className="w-11 h-11 rounded-md bg-white border border-[#E5E5E5] text-slate-700 hover:bg-[#F5F5F5] active:scale-95 flex items-center justify-center text-lg font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-none"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* দ্রুত প্রেসেট বাটনসমূহ */}
                            <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1">
                              {[1, 2, 5, 10].map((step) => (
                                <button
                                  key={step}
                                  type="button"
                                  disabled={step > currentAvailableGodown}
                                  onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: step }))}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    Number(directTransferModal.quantity) === step
                                      ? 'bg-slate-900 text-white shadow-none'
                                      : 'bg-white hover:bg-[#F5F5F5] text-slate-700 border border-[#E5E5E5]/90 disabled:opacity-30 disabled:cursor-not-allowed'
                                  }`}
                                >
                                  +{step}
                                </button>
                              ))}
                              <button
                                type="button"
                                disabled={currentAvailableGodown <= 0}
                                onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: currentAvailableGodown }))}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  Number(directTransferModal.quantity) === currentAvailableGodown && currentAvailableGodown > 0
                                    ? 'bg-[#0F172A] text-white shadow-none'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200/80 disabled:opacity-30 disabled:cursor-not-allowed'
                                }`}
                                title="সম্পূর্ণ গোডাউন স্টক দোকানে আনুন"
                              >
                                সব ({currentAvailableGodown})
                              </button>
                            </div>
                          </div>

                          {/* থান কাপড়ের জন্য গজ হিসাব ও স্থানান্তরের পর লাইভ ফলাফল */}
                          <div className="space-y-2">
                            {isThan && prodYardsPerThan > 0 && effectiveTransferQty > 0 && (
                              <div className="p-2.5 bg-[#FFFBEB] rounded-md border border-[#FEF3C7] text-[#B45309] flex items-center justify-between text-xs">
                                <span className="font-bold flex items-center space-x-1.5">
                                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                                  <span>স্থানান্তরিত মোট কাপড়:</span>
                                </span>
                                <span className="font-mono font-black text-amber-950">
                                  {effectiveYards} গজ <span className="font-normal text-[11px] text-[#B45309]">({effectiveTransferQty} থান × {currentTargetYpt} গজ)</span>
                                </span>
                              </div>
                            )}

                            <div className="px-3 py-2 bg-[#F5F5F5]/70 rounded-md border border-[#E5E5E5] flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-500">স্থানান্তরের পর ব্যালেন্স:</span>
                              <div className="flex items-center space-x-2 font-mono">
                                <span>গোডাউনে: <strong className="text-slate-800">{Math.max(0, currentAvailableGodown - transferQty)} {unitLabel}</strong></span>
                                <span className="text-slate-400">|</span>
                                <span>দোকানে: <strong className="text-emerald-700">{currentShopStock + transferQty} {unitLabel}</strong></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* মোড ২: সকল ভ্যারিয়েন্ট একসাথে (বাল্ক) */}
                      {directTransferModal.mode === 'all' && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between pb-1 text-[11px]">
                            <span className="font-bold text-slate-700">ভ্যারিয়েন্ট অনুযায়ী পরিমাণ বসান:</span>
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
                                className="px-2.5 py-1 bg-white hover:bg-[#F5F5F5] text-slate-700 border border-[#E5E5E5] rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors shadow-none"
                              >
                                সবগুলোতে ১টি
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
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors shadow-none"
                              >
                                সব স্টক
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const fill = {};
                                  vars.forEach(v => { fill[v.VariantID || v.variantId] = 0; });
                                  setDirectTransferModal(prev => ({ ...prev, bulkQuantities: fill }));
                                }}
                                className="px-2.5 py-1 bg-[#F5F5F5] hover:bg-slate-200 text-slate-600 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors"
                              >
                                রিসেট
                              </button>
                            </div>
                          </div>

                          <div className="max-h-56 overflow-y-auto border border-[#E5E5E5] rounded-md divide-y divide-slate-100 bg-white">
                            {vars.map((v) => {
                              const vId = v.VariantID || v.variantId;
                              const attrs = v.Attributes || {};
                              const vName = Object.values(attrs).filter(Boolean).join(' / ') || v.Color || v.Size || vId;
                              const gStk = Number(v.GodownStock !== undefined ? v.GodownStock : 0);
                              const sStk = Number(v.StockQuantity !== undefined ? v.StockQuantity : 0);
                              const currentVal = directTransferModal.bulkQuantities[vId] !== undefined ? directTransferModal.bulkQuantities[vId] : 0;

                              return (
                                <div key={vId} className="p-2.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                                  <div className="min-w-0 flex-1 pr-2">
                                    <span className="font-bold text-slate-800 text-xs block truncate">
                                      {vName}
                                      {isThan && Number(v.YardsPerThan || v.yardsPerThan || 0) > 0 && (
                                        <span className="text-[10px] text-amber-700 font-medium ml-1">
                                          ({Number(v.YardsPerThan || v.yardsPerThan)} গজ/থান)
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      গোডাউন: <strong className="text-slate-700 font-bold">{gStk}</strong> | দোকান: <strong className="text-emerald-700 font-bold">{sStk}</strong>
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
                                      className="w-16 px-2 py-1 text-xs font-bold text-center font-mono bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg focus:bg-white focus:ring-2 focus:ring-1 focus:ring-[#0F172A] focus:outline-none disabled:opacity-40"
                                      placeholder="0"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">{unitLabel}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-2.5 bg-emerald-50/80 rounded-md border border-emerald-200/80 flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-950">মোট নির্বাচিত পরিমাণ:</span>
                            <span className="font-black font-mono text-emerald-950 text-sm">
                              {bulkTotalQty} {unitLabel} {isThan && prodYardsPerThan > 0 ? `(${effectiveYards} গজ)` : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ৪. পণ্য যদি সাধারণ (কোনো ভ্যারিয়েন্ট ছাড়া) হয় */}
                  {!hasVars && (
                    <div className="space-y-3">
                      {/* স্থানান্তরের পরিমাণ নির্ধারণ (Hero Stepper) */}
                      <div className="bg-[#FAFAFA] p-4 rounded-md border border-[#E5E5E5]/90 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            দোকানে কত {unitLabel} আনতে চান? <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] font-medium text-slate-500">
                            গোডাউনে আছে: <strong className="font-mono text-emerald-700 font-black">{currentAvailableGodown}</strong> {unitLabel}
                          </span>
                        </div>

                        {/* +/- কাউন্টার স্টাইল বড় ইনপুট */}
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            disabled={transferQty <= 1}
                            onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: Math.max(1, (Number(prev.quantity) || 1) - 1) }))}
                            className="w-11 h-11 rounded-md bg-white border border-[#E5E5E5] text-slate-700 hover:bg-[#F5F5F5] active:scale-95 flex items-center justify-center text-lg font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-none"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <div className="relative flex-1 max-w-[160px]">
                            <input
                              type="number"
                              min="1"
                              max={currentAvailableGodown}
                              value={directTransferModal.quantity}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(currentAvailableGodown, Number(e.target.value) || 0));
                                setDirectTransferModal(prev => ({ ...prev, quantity: e.target.value === '' ? '' : val }));
                              }}
                              className="w-full py-2.5 px-3 text-xl font-black font-mono text-center text-slate-900 bg-white border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-1 focus:ring-[#0F172A]/15 focus:border-[#0F172A] shadow-none"
                              placeholder="1"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                              {unitLabel}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={transferQty >= currentAvailableGodown}
                            onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: Math.min(currentAvailableGodown, (Number(prev.quantity) || 0) + 1) }))}
                            className="w-11 h-11 rounded-md bg-white border border-[#E5E5E5] text-slate-700 hover:bg-[#F5F5F5] active:scale-95 flex items-center justify-center text-lg font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-none"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* দ্রুত প্রেসেট বাটনসমূহ */}
                        <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1">
                          {[1, 2, 5, 10].map((step) => (
                            <button
                              key={step}
                              type="button"
                              disabled={step > currentAvailableGodown}
                              onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: step }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                Number(directTransferModal.quantity) === step
                                  ? 'bg-slate-900 text-white shadow-none'
                                  : 'bg-white hover:bg-[#F5F5F5] text-slate-700 border border-[#E5E5E5]/90 disabled:opacity-30 disabled:cursor-not-allowed'
                              }`}
                            >
                              +{step}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={currentAvailableGodown <= 0}
                            onClick={() => setDirectTransferModal(prev => ({ ...prev, quantity: currentAvailableGodown }))}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              Number(directTransferModal.quantity) === currentAvailableGodown && currentAvailableGodown > 0
                                ? 'bg-[#0F172A] text-white shadow-none'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-[#0F172A] border border-emerald-200/80 disabled:opacity-30 disabled:cursor-not-allowed'
                            }`}
                            title="সম্পূর্ণ গোডাউন স্টক দোকানে আনুন"
                          >
                            সব ({currentAvailableGodown})
                          </button>
                        </div>
                      </div>

                      {/* থান কাপড়ের জন্য গজ হিসাব ও স্থানান্তরের পর লাইভ ফলাফল */}
                      <div className="space-y-2">
                        {isThan && prodYardsPerThan > 0 && effectiveTransferQty > 0 && (
                          <div className="p-2.5 bg-[#FFFBEB] rounded-md border border-[#FEF3C7] text-[#B45309] flex items-center justify-between text-xs">
                            <span className="font-bold flex items-center space-x-1.5">
                              <Scissors className="w-3.5 h-3.5 text-amber-600" />
                              <span>স্থানান্তরিত মোট কাপড়:</span>
                            </span>
                            <span className="font-mono font-black text-amber-950">
                              {effectiveYards} গজ <span className="font-normal text-[11px] text-[#B45309]">({effectiveTransferQty} থান × ${prodYardsPerThan} গজ)</span>
                            </span>
                          </div>
                        )}

                        <div className="px-3 py-2 bg-[#F5F5F5]/70 rounded-md border border-[#E5E5E5] flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-500">স্থানান্তরের পর ব্যালেন্স:</span>
                          <div className="flex items-center space-x-2 font-mono">
                            <span>গোডাউনে: <strong className="text-slate-800">{Math.max(0, currentAvailableGodown - transferQty)} {unitLabel}</strong></span>
                            <span className="text-slate-400">|</span>
                            <span>দোকানে: <strong className="text-emerald-700">{currentShopStock + transferQty} {unitLabel}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ৫. মন্তব্য বা নোট (ঐচ্ছিক - দৃশ্যমান লেবেল সহ) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      স্থানান্তর নোট বা বিবরণ (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={directTransferModal.notes}
                      onChange={(e) => setDirectTransferModal(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="চালান বিবরণ বা মন্তব্য লিখুন..."
                      className="w-full px-3.5 py-2 text-xs bg-[#FAFAFA]/70 border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-1 focus:ring-[#0F172A]/15 focus:border-[#0F172A] focus:bg-white transition-all shadow-none"
                    />
                  </div>

                  {/* ৬. অ্যাকশন বাটনসমূহ (Instant Feedback & Action Verbs) */}
                  <div className="pt-2 border-t border-[#E5E5E5] space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmittingDirectTransfer || effectiveTransferQty <= 0}
                      className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-md text-xs sm:text-sm shadow-none shadow-none cursor-pointer transition-all flex items-center justify-center space-x-2"
                    >
                      {isSubmittingDirectTransfer ? (
                        <span className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>চালান স্থানান্তর সম্পন্ন হচ্ছে...</span>
                        </span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>চালান স্থানান্তর নিশ্চিত করুন ({effectiveTransferQty} {unitLabel})</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1 px-1">
                      <button
                        type="button"
                        onClick={handleSwitchToChallanFromDirectModal}
                        className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold inline-flex items-center space-x-1.5 cursor-pointer transition-colors"
                        title="চালান গেটপাস ও ইন-ট্রানজিট মুভমেন্ট তৈরি করতে"
                      >
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <span>ড্রাইভার চালান ও গেটপাস ভিউ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectTransferModal(null)}
                        className="px-3.5 py-1.5 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] font-bold rounded-lg cursor-pointer shadow-none transition-colors text-xs"
                      >
                        বাতিল করে ফিরে যান
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* বারকোড স্টিকার প্রিন্ট মডাল */}
        {printStickerProduct && (
          <BarcodeStickerModal
            isOpen={!!printStickerProduct}
            onClose={() => setPrintStickerProduct(null)}
            product={printStickerProduct}
            currencySymbol={currencySymbol}
            storeName={storeSettings?.StoreName || 'Pabna Bostraloy'}
          />
        )}

        {/* =============================================================== */}
        {/* এন্টারপ্রাইজ কনফার্মেশন ডায়ালগ (Forgiving UX: Destructive Confirm) */}
        {/* =============================================================== */}
        {confirmDialog && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60  animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white rounded-md shadow-none border border-[#E5E5E5] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 space-y-3.5">
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-md shrink-0 ${confirmDialog.isDestructive ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-[#FFFBEB] text-amber-700 border border-amber-100'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{confirmDialog.title || 'আপনি কি নিশ্চিত?'}</h4>
                    <p className="text-xs text-slate-600 mt-1 font-medium whitespace-pre-line leading-relaxed">{confirmDialog.message}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2 bg-white hover:bg-[#FAFAFA] text-slate-700 border border-[#E5E5E5] rounded-md text-xs font-bold transition-all cursor-pointer shadow-none"
                  >
                    {confirmDialog.cancelLabel || 'না, ফিরে যান'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const action = confirmDialog.onConfirm;
                      setConfirmDialog(null);
                      if (typeof action === 'function') action();
                    }}
                    className={`px-4 py-2 rounded-md text-xs font-bold text-white transition-all shadow-none cursor-pointer ${
                      confirmDialog.isDestructive
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {confirmDialog.confirmLabel || 'হ্যাঁ, নিশ্চিত করুন'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* এন্টারপ্রাইজ টোস্ট নোটিফিকেশন (Subtle Toast for Success & Info) */}
        {/* =============================================================== */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className={`p-4 rounded-md shadow-none border flex items-start space-x-3 ${
              toast.type === 'error'
                ? 'bg-white border-rose-200 text-rose-900 shadow-rose-500/10'
                : toast.type === 'info'
                ? 'bg-white border-blue-200 text-blue-900 shadow-blue-500/10'
                : 'bg-white border-emerald-200 text-emerald-950 shadow-emerald-500/10'
            }`}>
              <span className="shrink-0 mt-0.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : toast.type === 'info' ? (
                  <Info className="w-5 h-5 text-blue-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#0F172A]" />
                )}
              </span>
              <div className="flex-1 text-xs">
                <p className="font-bold">{toast.title || (toast.type === 'error' ? 'ত্রুটি' : 'সফল হয়েছে')}</p>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
