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
  RefreshCw,
  ClipboardList
} from 'lucide-react';
import BarcodeStickerModal from './BarcodeStickerModal';
import {
  calculateThanBreakdown,
  calculateInitialShopYards,
  parseGojGira,
  formatFabricQuantity,
  isFabricUnit,
  isThanUnit
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

  // প্রিন্ট প্রিভিউ
  const [printableChallan, setPrintableChallan] = useState(null);
  const [isPrintableGodownOutflow, setIsPrintableGodownOutflow] = useState(false);
  const [isPrintableShopStockAudit, setIsPrintableShopStockAudit] = useState(false);
  const [printStickerProduct, setPrintStickerProduct] = useState(null);

  // চালান তালিকা ফিল্টার
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // =========================================================================
  // ২. লাইভ স্টক ওভারভিউ ফিল্টার স্টেট
  // =========================================================================
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewFilter, setOverviewFilter] = useState(() => {
    if (initialTab === 'godown_low_stock' || initialFilter === 'LOW_GODOWN') return 'LOW_GODOWN';
    if (initialTab === 'godown_stock') return 'IN_GODOWN';
    if (initialTab === 'shop_stock') return 'IN_SHOP';
    return initialFilter || 'ALL';
  });
  const [overviewCategory, setOverviewCategory] = useState('ALL');

  // দোকানে বর্তমান মজুদ ভিউ মোড কিনা
  const isShopStockView = initialTab === 'shop_stock' || [
    'IN_SHOP',
    'SHOP_ZERO_IN_GODOWN',
    'LOW_SHOP',
    'SHOP_FABRIC',
    'SHOP_SUFFICIENT',
    'SHOP_REMNANT',
    'SHOP_NEED_BOLT'
  ].includes(overviewFilter);

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
    let godownLowCount = 0;
    let totalVariants = 0;
    let fabricGodownYards = 0;
    let fabricShopYards = 0;
    let totalGodownValuation = 0;
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
      const gStock = Number(p.GodownStock || 0);
      const sStock = Number(p.StockQuantity || 0);
      const minAlert = Number(p.MinStockAlert || 5);
      const unit = getProductDisplayUnit(p);
      const isThan = /than|থান/i.test(unit);
      const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;

      totalGodown += gStock;
      totalShop += sStock;

      if (sStock > 0) {
        shopProductCount++;
      }

      if (isThan && yardsPerThan > 0) {
        fabricGodownYards += (gStock * yardsPerThan);
        const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
        const bd = calculateThanBreakdown(sStock, yardsPerThan, remTh);
        fabricShopYards += sStock;
        fabricShopFullThans += bd.fullThans;
        fabricShopRunningCutYards += bd.runningCutYards;
        fabricShopThanCount += (bd.fullThans + (bd.runningCutYards > 0 ? 1 : 0));
        if (bd.isRemnant) fabricShopRemnantsCount++;
        if (bd.needsRestock && gStock > 0) fabricShopNeedsRestockCount++;

        totalGodownValuation += (gStock * yardsPerThan * unitCost);
        totalShopCostValuation += (sStock * unitCost);
        totalShopSellingValuation += (sStock * sellingPrice);
      } else if (!isThan && /গজ|yard/i.test(unit)) {
        fabricGodownYards += gStock;
        fabricShopYards += sStock;
        const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
        if (sStock > 0 && sStock <= remTh) fabricShopRemnantsCount++;
        if (sStock <= remTh && gStock > 0) fabricShopNeedsRestockCount++;

        totalGodownValuation += (gStock * unitCost);
        totalShopCostValuation += (sStock * unitCost);
        totalShopSellingValuation += (sStock * sellingPrice);
      } else {
        totalGodownValuation += (gStock * unitCost);
        totalShopCostValuation += (sStock * unitCost);
        totalShopSellingValuation += (sStock * sellingPrice);
      }

      const vars = getVariantsOfProduct(p);
      if (vars.length > 0) {
        totalVariants += vars.length;
      }

      if (sStock <= minAlert && gStock > 0) {
        needTransferCount++;
      }

      const hasLowGodownVar = vars.length > 0 && vars.some(v => (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0) <= 2);
      if (gStock <= minAlert || hasLowGodownVar) {
        godownLowCount++;
      }

      const hasLowShopVar = vars.length > 0 && vars.some(v => {
        const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
        return vS <= 2 && vS > 0;
      });
      if ((sStock <= minAlert && sStock > 0) || hasLowShopVar) {
        shopLowCount++;
      }

      const hasZeroShopWithGodownVar = vars.length > 0 && vars.some(v => {
        const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
        const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
        return vS <= 0 && vG > 0;
      });
      if ((sStock <= 0 && gStock > 0) || hasZeroShopWithGodownVar) {
        shopZeroInGodownCount++;
      }
    });

    const inTransitChallans = stockTransfers.filter((t) => t.Status === 'In Transit').length;
    const totalShopPotentialProfit = Math.max(0, totalShopSellingValuation - totalShopCostValuation);

    return {
      totalGodown,
      totalShop,
      totalAll: totalGodown + totalShop,
      needTransferCount,
      godownLowCount,
      inTransitChallans,
      totalVariants,
      fabricGodownYards,
      fabricShopYards,
      totalGodownValuation,
      totalShopCostValuation,
      totalShopSellingValuation,
      totalShopPotentialProfit,
      shopLowCount,
      shopZeroInGodownCount,
      fabricShopThanCount,
      fabricShopFullThans,
      fabricShopRunningCutYards,
      fabricShopRemnantsCount,
      fabricShopNeedsRestockCount,
      shopProductCount
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

      let matchFilter = true;
      if (overviewFilter === 'NEED_TRANSFER') {
        matchFilter = sStock <= minAlert && gStock > 0;
      } else if (overviewFilter === 'LOW_GODOWN' || overviewFilter === 'GODOWN_ALERT') {
        const hasLowVar = vars.length > 0 && vars.some(v => (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0) <= 2);
        matchFilter = gStock <= minAlert || hasLowVar;
      } else if (overviewFilter === 'IN_GODOWN') {
        matchFilter = gStock > 0;
      } else if (overviewFilter === 'IN_SHOP') {
        matchFilter = sStock > 0;
      } else if (overviewFilter === 'SHOP_ZERO_IN_GODOWN') {
        const hasZeroShopWithGodownVar = vars.length > 0 && vars.some(v => {
          const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          const vG = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          return vS <= 0 && vG > 0;
        });
        matchFilter = (sStock <= 0 && gStock > 0) || hasZeroShopWithGodownVar;
      } else if (overviewFilter === 'LOW_SHOP') {
        const hasLowShopVar = vars.length > 0 && vars.some(v => {
          const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          return vS <= 2 && vS > 0;
        });
        matchFilter = (sStock <= minAlert && sStock > 0) || hasLowShopVar;
      } else if (overviewFilter === 'SHOP_FABRIC') {
        matchFilter = (/than|থান|গজ|yard/i.test(unit)) && sStock > 0;
      } else if (overviewFilter === 'SHOP_REMNANT') {
        const isFab = /than|থান|গজ|yard/i.test(unit);
        if (!isFab) return false;
        const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
        const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
        const bd = calculateThanBreakdown(sStock, ypt, remTh);
        matchFilter = bd.isRemnant;
      } else if (overviewFilter === 'SHOP_NEED_BOLT') {
        const isFab = /than|থান|গজ|yard/i.test(unit);
        if (!isFab) return false;
        const ypt = Number(p.YardsPerThan || p.yardsPerThan || 0) || 25;
        const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
        const bd = calculateThanBreakdown(sStock, ypt, remTh);
        matchFilter = bd.needsRestock && gStock > 0;
      } else if (overviewFilter === 'SHOP_SUFFICIENT') {
        matchFilter = sStock > minAlert;
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
      const unit = getProductDisplayUnit(p);
      const isThan = /than|থান/i.test(unit);
      const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
      const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
      const unitCost = Number(p.CostPrice || p.costPrice || p.PurchasePrice || p.purchasePrice || p.Cost || p.cost || p.BuyingPrice || p.BuyPrice || 0);
      const unitSelling = Number(p.SellingPrice || p.sellingPrice || p.Price || p.price || p.MRP || p.mrp || 0);

      if (vars.length > 0) {
        vars.forEach((v, vIdx) => {
          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0;
          const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity || 0)) || 0;
          const vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost));
          const vSelling = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : unitSelling));
          const vBd = isThan ? calculateThanBreakdown(vSStock, yardsPerThan, remTh) : null;
          const vGodownYards = isThan ? (vGStock * yardsPerThan) : 0;
          const vShopYards = isThan ? vSStock : 0;
          const vTotalYards = isThan ? (vGodownYards + vShopYards) : 0;
          const vTotalThans = isThan ? (vGStock + (vBd ? vBd.fullThans : 0)) : (vGStock + vSStock);

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
            yardsPerThan: yardsPerThan,
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
            yardsPerThan,
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
        alert('অনুগ্রহ করে সঠিক পরিমাণ (কমপক্ষে ১) উল্লেখ করুন!');
        return;
      }
      if (qty > gStk) {
        alert(`গোডাউনে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${gStk} ${getProductDisplayUnit(product)} আছে।`);
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
        alert(`এই ভ্যারিয়েন্টের গোডাউনে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${vGStk} ${getProductDisplayUnit(product)} আছে।`);
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
            unit: getProductDisplayUnit(product),
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
      alert('অনুগ্রহ করে গোডাউনে থাকা একটি পণ্য বা ভ্যারিয়েন্ট ড্রপডাউন থেকে নির্বাচন করুন।');
      return;
    }

    const qty = Number(transferQty) || 0;
    if (qty <= 0) {
      alert('সঠিক স্থানান্তর পরিমাণ উল্লেখ করুন।');
      return;
    }

    if (qty > availableSourceStock) {
      alert(`প্রেরক স্থানে পর্যাপ্ত স্টক নেই! বর্তমানে মাত্র ${availableSourceStock} ${targetItem?.unit || getProductDisplayUnit(targetProduct)} মজুত আছে।`);
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
        alert(`মোট যোগ করা পরিমাণ (${updated[existingIdx].quantity + qty}) গোডাউনের মজুত (${availableSourceStock}) অতিক্রম করেছে!`);
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

  // চালান রিসিভ ও স্টকে যোগ হ্যান্ডলার (কখনও অটো রিসিভ হবে না, বাটন প্রেস করতে হবে)
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

  // চালান মুছে ফেলা হ্যান্ডলার (ডাটাবেস ও লোকাল স্টোরেজ থেকে রিমুভ)
  const handleDeleteChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    const trfId = challan.TransferID || challan.transferId || cNo;
    const isTransit = challan.Status === 'In Transit' || challan.Status === 'Pending';
    const confirmMsg = `আপনি কি নিশ্চিত যে চালান #${cNo} মুছে ফেলতে চান?\n\nএটি ডাটাবেস থেকেও মুছে ফেলা হবে।${isTransit ? '\n(যেহেতু চালানটি এখনও দোকানে রিসিভ করা হয়নি, তাই পণ্যের স্টক গোডাউনে স্বয়ংক্রিয়ভাবে ফেরত যুক্ত হবে)' : ''}`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (onDeleteStockTransfer) {
        await onDeleteStockTransfer({ transferId: trfId, challanNo: cNo });
      }
    } catch (e) {
      alert(`চালান মুছতে সমস্যা হয়েছে: ${e.message}`);
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
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-inner ${
              isShopStockView
                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
                : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-400'
            }`}>
              {isShopStockView ? <Store className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">
                  {isShopStockView ? 'দোকান ফ্লোর ও কাউন্টার মজুত খতিয়ান' : 'গোডাউন ও দোকান স্টক ট্র্যাকার'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isShopStockView
                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/20'
                    : 'bg-indigo-500/30 text-indigo-300 border-indigo-400/20'
                }`}>
                  {isShopStockView ? '🏬 শপ কাউন্টার স্টক' : 'মাল্টি-লোকেশন'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isShopStockView
                  ? 'দোকানের ডিসপ্লে ফ্লোর, কাউন্টার মজুত, থান-গজ হিসাব ও ঘাটতি সমন্বয়'
                  : 'গোডাউন ও দোকান স্টক পৃথকীকরণ, চালান স্থানান্তর ও কমার পৃথক খতিয়ান'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* ৪টি মূল ট্যাব */}
            <div className="bg-slate-800/90 p-1 rounded-xl flex items-center border border-slate-700/60 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setActiveMainTab('overview'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
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
                onClick={() => { setActiveMainTab('transfers'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
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
                onClick={() => { setActiveMainTab('godown_outflow'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
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
                onClick={() => { setActiveMainTab('shop_outflow'); setPrintableChallan(null); setIsPrintableGodownOutflow(false); }}
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
            <div id="printable-challan-container" className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-0 print:border-none print:shadow-none">
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
        ) : isPrintableGodownOutflow ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center">
            <div id="printable-godown-outflow-container" className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:max-w-none">
              
              {/* অ্যাকশন কন্ট্রোল বার (প্রিন্টে লুকানো থাকবে) */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
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
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট / PDF ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportGodownOutflowExcelCSV(stockMovements, products)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>এক্সেল CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintableGodownOutflow(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
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
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-800 bg-slate-100 font-bold">
                      <th className="py-2 px-2.5 border border-slate-300 text-center w-10">ক্রমিক</th>
                      <th className="py-2 px-3 border border-slate-300">তারিখ ও সময়</th>
                      <th className="py-2 px-3 border border-slate-300">পণ্যের বিবরণ</th>
                      <th className="py-2 px-3 border border-slate-300">ভ্যারিয়েন্ট (রং / সাইজ)</th>
                      <th className="py-2 px-3 border border-slate-300">কমার কারণ ও চালান নং</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">একক</th>
                      <th className="py-2 px-3 border border-slate-300 text-right text-rose-900 bg-rose-50/50">কমেছে</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">পূর্বে</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">অবশিষ্ট</th>
                      <th className="py-2 px-3 border border-slate-300">অনুমোদক / চালক</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {godownOutflowData.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-slate-400 font-medium border border-slate-200">
                          নির্বাচিত ফিল্টারে কোনো গোডাউন স্টক কমার রেকর্ড নেই।
                        </td>
                      </tr>
                    ) : (
                      godownOutflowData.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center font-mono text-slate-500 border border-slate-200">{idx + 1}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap border border-slate-200">
                            {new Date(m.timestamp).toLocaleString('bn-BD')}
                          </td>
                          <td className="py-2 px-3 border border-slate-200">
                            <strong className="text-slate-900 block">{m.productName}</strong>
                            {m.category && <span className="text-[10px] text-slate-500 block">{m.category}</span>}
                          </td>
                          <td className="py-2 px-3 border border-slate-200">
                            {m.variantName || m.color || m.size ? (
                              <div>
                                {m.color && <span className="font-bold text-pink-700 block">রং: {m.color}</span>}
                                {m.size && <span className="font-bold text-indigo-700 block">সাইজ: {m.size}</span>}
                                {m.variantName && !m.color && !m.size && <span className="font-bold text-purple-700 block">{m.variantName}</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400">সাধারণ</span>
                            )}
                          </td>
                          <td className="py-2 px-3 border border-slate-200">
                            <span className="font-medium text-slate-800 block">{m.reasonBangla}</span>
                            {m.referenceNo && (
                              <span className="text-[10px] font-mono text-indigo-600 font-bold block">
                                চালান: {m.referenceNo}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-600 border border-slate-200">{m.unit || 'Pcs'}</td>
                          <td className="py-2 px-3 text-right font-black font-mono text-rose-700 text-sm bg-rose-50/30 border border-slate-200">
                            -{m.quantity}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-500 border border-slate-200">
                            {m.previousStock !== '-' ? m.previousStock : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-900 border border-slate-200">
                            {m.remainingStock !== '-' ? m.remainingStock : '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 border border-slate-200">
                            <span className="block font-medium">{m.operatorName || 'Admin'}</span>
                            {m.notes && <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{m.notes}</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {godownOutflowData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                        <td colSpan="6" className="py-2.5 px-3 text-right uppercase border border-slate-300">
                          সর্বমোট কমার পরিমাণ:
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-rose-800 border border-slate-300">
                          {godownOutflowSummary.totalQty}
                        </td>
                        <td colSpan="3" className="border border-slate-300"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* স্বাক্ষর ও ভেরিফিকেশন ব্লক */}
                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-500">
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-bold text-slate-800">রিপোর্ট প্রস্তুতকারক</span>
                    <span className="text-[10px] text-slate-400">{activeUser?.FullName || 'অপারেটর'}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-bold text-slate-800">গোডাউন ইনচার্জ স্বাক্ষর</span>
                    <span className="text-[10px] text-slate-400">স্টক যাচাইকারী</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-bold text-slate-800">অনুমোদনকারী / স্বত্বাধিকারী</span>
                    <span className="text-[10px] text-slate-400">কর্তৃপক্ষ সিল ও স্বাক্ষর</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : isPrintableShopStockAudit ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center">
            <div id="printable-shop-stock-audit-container" className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:max-w-none">
              
              {/* অ্যাকশন কন্ট্রোল বার (প্রিন্টে লুকানো থাকবে) */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট / PDF ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportLocationStockExcelCSV(products)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>এক্সেল CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintableShopStockAudit(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
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
                      {stockKpis.totalShop} {stockKpis.fabricShopYards > 0 ? `(${stockKpis.fabricShopYards} গজ)` : ''}
                    </span>
                  </div>
                </div>

                {/* অডিট টেবিল */}
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-800 bg-slate-100 font-bold">
                      <th className="py-2 px-2 border border-slate-300 text-center w-8">ক্রমিক</th>
                      <th className="py-2 px-3 border border-slate-300">পণ্যের বিবরণ ও ভ্যারিয়েন্ট</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">কোড / বারকোড</th>
                      <th className="py-2 px-2 border border-slate-300 text-center">একক</th>
                      <th className="py-2 px-3 border border-slate-300 text-center bg-emerald-50/60 text-emerald-950 font-bold">সিস্টেম রেকর্ড</th>
                      <th className="py-2 px-3 border border-slate-300 text-center w-24 bg-amber-50/40 text-amber-950 font-bold">ফিজিক্যাল গণনা</th>
                      <th className="py-2 px-3 border border-slate-300 text-center w-20">গরমিল (+ / -)</th>
                      <th className="py-2 px-3 border border-slate-300">মন্তব্য (নষ্ট/কাটা স্যাম্পল)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOverviewProducts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400 font-medium border border-slate-200">
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
                              <tr className="bg-slate-50/80 font-bold">
                                <td className="py-1.5 px-2 text-center font-mono text-slate-600 border border-slate-200">{idx + 1}</td>
                                <td colSpan="3" className="py-1.5 px-3 border border-slate-200 text-slate-900">
                                  {p.ProductName} <span className="text-[10px] text-slate-500 font-normal">({p.Category}) — {vars.length}টি ভ্যারিয়েন্ট</span>
                                </td>
                                <td className="py-1.5 px-3 text-center font-mono font-bold text-emerald-800 border border-slate-200 bg-emerald-50/30">
                                  {sStock} {isThan ? `থান (${sStock * yardsPerThan} গজ)` : unit}
                                </td>
                                <td className="py-1.5 px-3 border border-slate-200 bg-white"></td>
                                <td className="py-1.5 px-3 border border-slate-200"></td>
                                <td className="py-1.5 px-3 border border-slate-200 text-[10px] text-slate-500"></td>
                              </tr>
                              {vars.map((v, vIdx) => {
                                const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : 0);
                                const vColor = v.Attributes?.Color || v.Color || '';
                                const vSize = v.Attributes?.Size || v.Size || '';
                                const vLabel = [vColor && `রং: ${vColor}`, vSize && `সাইজ: ${vSize}`].filter(Boolean).join(' | ');

                                return (
                                  <tr key={v.VariantID || vIdx} className="hover:bg-slate-50/30">
                                    <td className="py-1.5 px-2 text-center font-mono text-slate-400 border border-slate-200 text-[10px]">{idx + 1}.{vIdx + 1}</td>
                                    <td className="py-1.5 px-3 pl-6 border border-slate-200">
                                      <span className="font-semibold text-slate-800 block text-[11px]">{vLabel || v.VariantID}</span>
                                    </td>
                                    <td className="py-1.5 px-2.5 text-center font-mono text-[10px] text-slate-500 border border-slate-200">
                                      {v.Barcode || p.Barcode || '—'}
                                    </td>
                                    <td className="py-1.5 px-2 text-center text-slate-600 border border-slate-200 text-[10px]">{unit}</td>
                                    <td className="py-1.5 px-3 text-center font-mono font-bold text-slate-800 border border-slate-200">
                                      {vSStock} {isThan ? `থান (${vSStock * yardsPerThan} গজ)` : ''}
                                    </td>
                                    <td className="py-1.5 px-3 border border-slate-200 bg-white text-center font-mono">
                                      <div className="h-4 border-b border-dashed border-slate-300"></div>
                                    </td>
                                    <td className="py-1.5 px-3 border border-slate-200 text-center font-mono">
                                      <div className="h-4 border-b border-dashed border-slate-300"></div>
                                    </td>
                                    <td className="py-1.5 px-3 border border-slate-200"></td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        }

                        return (
                          <tr key={p.ProductID} className="hover:bg-slate-50/30">
                            <td className="py-2 px-2 text-center font-mono text-slate-500 border border-slate-200">{idx + 1}</td>
                            <td className="py-2 px-3 border border-slate-200">
                              <span className="font-bold text-slate-900 block">{p.ProductName}</span>
                              <span className="text-[10px] text-slate-500 block">{p.Category}</span>
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono text-[10.5px] text-slate-600 border border-slate-200">
                              {p.Barcode || p.ProductID}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-600 border border-slate-200">{unit}</td>
                            <td className="py-2 px-3 text-center font-black font-mono text-emerald-800 bg-emerald-50/30 border border-slate-200">
                              {(() => {
                                if (isThan) {
                                  const bd = calculateThanBreakdown(sStock, yardsPerThan, p.RemnantThreshold || 2);
                                  return (
                                    <span>{bd.displayText} <span className="text-[10px] text-slate-500 font-normal">({bd.totalYards} গজ)</span></span>
                                  );
                                }
                                return `${sStock} ${unit}`;
                              })()}
                            </td>
                            <td className="py-2 px-3 border border-slate-200 bg-white text-center font-mono text-[10px] text-slate-400">
                              {isThan ? '[   ] থান + [   ] গজ [   ] গিরা' : <div className="h-4 border-b border-dashed border-slate-300"></div>}
                            </td>
                            <td className="py-2 px-3 border border-slate-200 text-center font-mono">
                              <div className="h-4 border-b border-dashed border-slate-300"></div>
                            </td>
                            <td className="py-2 px-3 border border-slate-200"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredOverviewProducts.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                        <td colSpan="4" className="py-2.5 px-3 text-right uppercase border border-slate-300">
                          সর্বমোট সিস্টেম দোকান মজুত:
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-sm font-mono text-emerald-800 border border-slate-300">
                          {stockKpis.totalShop}
                        </td>
                        <td colSpan="3" className="border border-slate-300"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* স্বাক্ষর ও ভেরিফিকেশন ব্লক */}
                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-500">
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-bold text-slate-800">স্টক গণনাকারী সেলসম্যান</span>
                    <span className="text-[10px] text-slate-400">স্বাক্ষর ও তারিখ</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-bold text-slate-800">দোকান / কাউন্টার ইনচার্জ</span>
                    <span className="text-[10px] text-slate-400">যাচাইকারী স্বাক্ষর</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="block font-bold text-slate-800">মালিক / শাখা ব্যবস্থাপক</span>
                    <span className="text-[10px] text-slate-400">অনুমোদন সিল ও স্বাক্ষর</span>
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
              <div className="space-y-4">
                
                {/* ১. কেপিআই কার্ডস - আধুনিক বেন্তো গ্রিড (Modern Bento Cards) */}
                {isShopStockView ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* কার্ড ১: দোকান মোট মজুত */}
                    <div
                      onClick={() => setOverviewFilter('IN_SHOP')}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                        overviewFilter === 'IN_SHOP' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">দোকান মোট মজুত</span>
                        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <Store className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        {stockKpis.totalShop.toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          🏬 বিক্রয় ফ্লোরে উপস্থিত
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          {(stockKpis.shopProductCount || 0).toLocaleString('bn-BD')}টি পণ্য
                        </span>
                      </div>
                    </div>

                    {/* কার্ড ২: দোকানে কাপড়ের মোট থান ও গজ */}
                    <div
                      onClick={() => setOverviewFilter('SHOP_FABRIC')}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                        overviewFilter === 'SHOP_FABRIC' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">দোকানে থান ও গজ কাপড়</span>
                        <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <Layers className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono">
                        {stockKpis.fabricShopYards.toLocaleString('bn-BD')} <span className="text-xs font-bold text-slate-500">গজ</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          📦 {stockKpis.fabricShopFullThans || 0}টি আস্ত থান
                        </span>
                        {stockKpis.fabricShopRemnantsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 animate-pulse">
                            ✂️ শেষ ছাঁট: {stockKpis.fabricShopRemnantsCount}টি
                          </span>
                        )}
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          ফ্লোর কাটিং মজুত
                        </span>
                      </div>
                    </div>

                    {/* কার্ড ৩: দোকান মজুত সম্পদ মূল্য (Valuation) */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 transition-all shadow-2xs hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">দোকান মজুত সম্পদ মূল্য</span>
                        <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                          <Sparkles className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
                        {currencySymbol}{Math.round(stockKpis.totalShopCostValuation || 0).toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80" title="সম্ভাব্য বিক্রয় মূল্য">
                          🏷️ বিক্রয়: {currencySymbol}{Math.round(stockKpis.totalShopSellingValuation || 0).toLocaleString('bn-BD')}
                        </span>
                        {stockKpis.totalShopPotentialProfit > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            +{(Math.round((stockKpis.totalShopPotentialProfit / (stockKpis.totalShopCostValuation || 1)) * 100))}% সম্ভাব্য মার্জিন
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ৪: দোকানে ঘাটতি ও রি-অর্ডার অ্যালার্ট */}
                    <div
                      onClick={() => setOverviewFilter(stockKpis.shopZeroInGodownCount > 0 ? 'SHOP_ZERO_IN_GODOWN' : 'LOW_SHOP')}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                        (overviewFilter === 'LOW_SHOP' || overviewFilter === 'SHOP_ZERO_IN_GODOWN')
                          ? 'border-rose-500 ring-2 ring-rose-500/20'
                          : 'border-slate-200/80 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">দোকানে ঘাটতি ও অ্যালার্ট</span>
                        <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                        {((stockKpis.shopLowCount || 0) + (stockKpis.shopZeroInGodownCount || 0)).toLocaleString('bn-BD')}{' '}
                        <span className="text-xs font-bold text-slate-500">আইটেম</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {stockKpis.shopZeroInGodownCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                            🚨 শেষ (গোডাউনে আছে): {stockKpis.shopZeroInGodownCount}
                          </span>
                        )}
                        {stockKpis.fabricShopNeedsRestockCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            🧵 নতুন থান প্রয়োজন: {stockKpis.fabricShopNeedsRestockCount}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          ⚠️ কম স্টক: {stockKpis.shopLowCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* কার্ড ১: গোডাউন মোট মজুত */}
                    <div
                      onClick={() => setOverviewFilter('IN_GODOWN')}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                        overviewFilter === 'IN_GODOWN' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">গোডাউন মোট স্টক</span>
                        <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <Warehouse className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        {stockKpis.totalGodown.toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          🏭 কেন্দ্রীয় গোডাউন
                        </span>
                        {stockKpis.fabricGodownYards > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            📏 {stockKpis.fabricGodownYards.toLocaleString('bn-BD')} গজ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ২: দোকান মোট স্টক */}
                    <div
                      onClick={() => setOverviewFilter('IN_SHOP')}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                        overviewFilter === 'IN_SHOP' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">দোকান মোট স্টক</span>
                        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <Store className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        {stockKpis.totalShop.toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          🏬 বিক্রয়ের জন্য প্রস্তুত
                        </span>
                        {stockKpis.fabricShopYards > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                            📏 {stockKpis.fabricShopYards.toLocaleString('bn-BD')} গজ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* কার্ড ৩: গোডাউন মোট মজুদ মূল্য (Valuation) */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 transition-all shadow-2xs hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">গোডাউন স্টক মূল্য</span>
                        <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                          <Sparkles className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
                        {currencySymbol}{Math.round(stockKpis.totalGodownValuation || 0).toLocaleString('bn-BD')}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80">
                          💰 ক্রয়মূল্য ভিত্তিক সম্পদ
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          {(stockKpis.totalVariants || 0)}টি ভ্যারিয়েন্ট
                        </span>
                      </div>
                    </div>

                    {/* কার্ড ৪: গোডাউন স্টক অ্যালার্ট ও ঘাটতি */}
                    <div
                      onClick={() => setOverviewFilter('LOW_GODOWN')}
                      className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                        overviewFilter === 'LOW_GODOWN' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/80 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">গোডাউনে কম / শেষ</span>
                        <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                        {(stockKpis.godownLowCount || 0).toLocaleString('bn-BD')} <span className="text-xs font-bold text-slate-500">আইটেম</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                          🚨 রিস্টক প্রয়োজন
                        </span>
                        {stockKpis.inTransitChallans > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                            🚚 {stockKpis.inTransitChallans}টি ট্রানজিটে
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ২. ফিল্টার এবং কন্ট্রোল বার */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-3">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* সার্চ বক্স ও ক্যাটাগরি */}
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={overviewSearch}
                          onChange={(e) => setOverviewSearch(e.target.value)}
                          placeholder="পণ্য নাম, কোড, রং, সাইজ বা বারকোড দিয়ে খুঁজুন..."
                          className="w-full pl-10 pr-9 py-2 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                        {overviewSearch && (
                          <button
                            type="button"
                            onClick={() => setOverviewSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={overviewCategory}
                        onChange={(e) => setOverviewCategory(e.target.value)}
                        className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 hover:bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">সকল ক্যাটাগরি ({categories.length})</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* ফিল্টার পিল বাটনসমূহ */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                      {isShopStockView ? (
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('IN_SHOP')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'IN_SHOP'
                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🏬 সকল দোকান পণ্য ({stockKpis.shopProductCount || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_ZERO_IN_GODOWN')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'SHOP_ZERO_IN_GODOWN'
                                ? 'bg-rose-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🚨 দোকানে শেষ (গোডাউনে আছে: {stockKpis.shopZeroInGodownCount || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('LOW_SHOP')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'LOW_SHOP'
                                ? 'bg-amber-500 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>⚠️ দোকানে কম স্টক ({stockKpis.shopLowCount || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_FABRIC')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'SHOP_FABRIC'
                                ? 'bg-indigo-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🧵 শুধু থান ও গজ কাপড়</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_REMNANT')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'SHOP_REMNANT'
                                ? 'bg-amber-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>✂️ শেষ ছাঁট কাপড় ({stockKpis.fabricShopRemnantsCount || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_NEED_BOLT')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'SHOP_NEED_BOLT'
                                ? 'bg-rose-700 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🚨 নতুন থান প্রয়োজন ({stockKpis.fabricShopNeedsRestockCount || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('SHOP_SUFFICIENT')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'SHOP_SUFFICIENT'
                                ? 'bg-teal-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>✓ পর্যাপ্ত মজুত</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                              overviewFilter === 'ALL'
                                ? 'bg-white shadow-xs text-indigo-700 font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            সকল ({products.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('IN_GODOWN')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'IN_GODOWN'
                                ? 'bg-indigo-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🏭 গোডাউনে আছে</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('LOW_GODOWN')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'LOW_GODOWN'
                                ? 'bg-rose-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🚨 গোডাউনে কম ({stockKpis.godownLowCount || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('NEED_TRANSFER')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'NEED_TRANSFER'
                                ? 'bg-amber-500 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>⚠️ দোকানে ঘাটতি ({stockKpis.needTransferCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverviewFilter('IN_SHOP')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                              overviewFilter === 'IN_SHOP'
                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>🏬 দোকানে আছে</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => exportLocationStockExcelCSV(products)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                        title="স্টক খতিয়ানের এক্সেল ফাইল ডাউনলোড করুন"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">এক্সেল রিপোর্ট</span>
                      </button>

                      {isShopStockView && (
                        <button
                          type="button"
                          onClick={() => setIsPrintableShopStockAudit(true)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                          title="দোকানের ফিজিক্যাল স্টক অডিট ও ফ্লোর গণনা শিট প্রিন্ট করুন"
                        >
                          <ClipboardList className="w-4 h-4" />
                          <span className="hidden sm:inline">গণনা শিট (Audit)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ভিউ মোড টগল */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-500">প্রদর্শন মোড:</span>
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setStockViewMode('grouped')}
                          className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
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
                          className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                            stockViewMode === 'variants'
                              ? 'bg-indigo-600 shadow-xs text-white font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>🎨 ভ্যারিয়েন্ট বিস্তারিত ভিউ</span>
                        </button>
                      </div>
                    </div>

                    {stockViewMode === 'grouped' && (
                      <div className="flex items-center space-x-2 text-xs">
                        <button
                          type="button"
                          onClick={handleExpandAll}
                          className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer"
                        >
                          সকল ভ্যারিয়েন্ট বিস্তার করুন ▾
                        </button>
                        <button
                          type="button"
                          onClick={handleCollapseAll}
                          className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all cursor-pointer"
                        >
                          সংক্ষেপ করুন ▴
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ৩. পণ্য স্টক তালিকা টেবিল (বাটনের মতো কালারফুল ব্যাচ ডিজাইন) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-black uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3.5 px-4">
                            {stockViewMode === 'grouped' ? 'পণ্য ও বিবরণ' : 'পণ্য ও ভ্যারিয়েন্ট বিবরণ'}
                          </th>
                          <th className="py-3.5 px-3">ক্যাটাগরি</th>
                          <th className="py-3.5 px-3 text-center">একক</th>
                          <th className="py-3.5 px-4 text-center bg-indigo-50/70 text-indigo-950 font-black">
                            🏭 গোডাউন স্টক
                          </th>
                          <th className="py-3.5 px-4 text-center bg-emerald-50/70 text-emerald-950 font-black">
                            🏬 দোকান স্টক
                          </th>
                          <th className="py-3.5 px-3 text-center">📦 মোট স্টক</th>
                          <th className="py-3.5 px-3 text-center">অবস্থা</th>
                          <th className="py-3.5 px-4 text-right">কার্যক্রম</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockViewMode === 'grouped' ? (
                          // =========================================================
                          // ১. গ্রুপড ভিউ (পণ্য ভিত্তিক রো + এক্সপ্যান্ডেবল ভ্যারিয়েন্ট)
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
                              const unit = getProductDisplayUnit(p);
                              const isThan = /than|থান/i.test(unit);
                              const isGoj = !isThan && /গজ|yard/i.test(unit);
                              const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
                              const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
                              const bd = isThan ? calculateThanBreakdown(sStock, yardsPerThan, remTh) : null;
                              const total = isThan ? (gStock + (bd ? bd.fullThans : 0)) : (gStock + sStock);
                              const minAlert = Number(p.MinStockAlert || 5);
                              const isZeroShop = sStock <= 0;
                              const isLowShop = isThan
                                ? (bd ? (bd.needsRestock || bd.fullThans === 0 || sStock <= yardsPerThan) : (sStock <= minAlert))
                                : (sStock <= minAlert);
                              const vars = getVariantsOfProduct(p);
                              const hasVars = vars.length > 0;
                              const isExpanded = Boolean(expandedProductIds[p.ProductID]);
                              const varGStockSum = vars.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0), 0);
                              const effectiveGStock = hasVars && varGStockSum > 0 ? varGStockSum : gStock;
                              const totalGoj = isThan ? (gStock * yardsPerThan) : (isGoj ? gStock : 0);
                              const unitCost = Number(p.CostPrice || p.costPrice || p.PurchasePrice || p.purchasePrice || p.Cost || p.cost || p.BuyingPrice || p.BuyPrice || 0);
                              const unitSelling = Number(p.SellingPrice || p.sellingPrice || p.Price || p.price || p.MRP || p.mrp || 0);
                              const totalGodownCost = isThan
                                ? (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0));
                                        const vGoj = vGStock * yardsPerThan;
                                        const vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost));
                                        return sum + (vGoj * vCost);
                                      }, 0)
                                    : (totalGoj * unitCost))
                                : isGoj
                                ? (totalGoj * unitCost)
                                : (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0));
                                        const vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost));
                                        return sum + (vGStock * vCost);
                                      }, 0)
                                    : (gStock * unitCost));

                              const totalShopCost = isThan
                                ? (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                                        const vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost));
                                        return sum + (vSStock * vCost);
                                      }, 0)
                                    : (sStock * unitCost))
                                : isGoj
                                ? (sStock * unitCost)
                                : (hasVars
                                    ? vars.reduce((sum, v) => {
                                        const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                                        const vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost));
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
                                  <tr className={`hover:bg-indigo-50/10 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                                    <td className="py-3 px-4">
                                      <div className="flex items-start space-x-2">
                                        {hasVars && (
                                          <button
                                            type="button"
                                            onClick={() => toggleExpandProduct(p.ProductID)}
                                            className="mt-0.5 p-1 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all cursor-pointer"
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
                                          <div className="font-bold text-slate-900 text-sm flex items-center space-x-2 flex-wrap gap-y-1">
                                            <span>{p.ProductName}</span>
                                            {hasVars && (
                                              <span
                                                onClick={() => toggleExpandProduct(p.ProductID)}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer transition-colors"
                                              >
                                                <Palette className="w-2.5 h-2.5 mr-1" />
                                                {vars.length}টি ভ্যারিয়েন্ট
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                            ID: {p.ProductID} {p.Barcode ? `| #${p.Barcode}` : ''}
                                          </div>

                                          {/* বাটনের মতো কালারফুল ব্যাচ সারি */}
                                          {isShopStockView ? (
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                              {isThan ? (
                                                <>
                                                  {(() => {
                                                    const ypt = yardsPerThan || 25;
                                                    const remTh = Number(p.RemnantThreshold || p.remnantThreshold || 2);
                                                    const bd = calculateThanBreakdown(sStock, ypt, remTh);
                                                    return (
                                                      <>
                                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 shadow-2xs whitespace-nowrap transition-colors" title="দোকানের মোট গজ">
                                                          <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                                                          <span>দোকানে: {bd.totalYards.toLocaleString('bn-BD')} গজ</span>
                                                        </span>
                                                        {bd.fullThans > 0 && (
                                                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs whitespace-nowrap transition-colors" title="দোকানে অক্ষত আস্ত থান">
                                                            <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                                                            <span>{bd.fullThans}টি আস্ত থান</span>
                                                          </span>
                                                        )}
                                                        {bd.runningCutYards > 0 && !bd.isRemnant && (
                                                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 shadow-2xs whitespace-nowrap transition-colors" title="কাউন্টার টেবিলে রানিং কাটা থান">
                                                            <Scissors className="w-3 h-3 text-teal-600 shrink-0" />
                                                            <span>কাটা থানে: {formatFabricQuantity(bd.runningCutYards, 'গজ', false)}</span>
                                                          </span>
                                                        )}
                                                        {bd.isRemnant && (
                                                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap transition-colors animate-pulse" title="থানের শেষ ছাঁট (কাউন্টার টুকরা হিসেবে বিক্রয়যোগ্য)">
                                                            <Scissors className="w-3 h-3 text-amber-800 shrink-0" />
                                                            <span>✂️ শেষ ছাঁট: {formatFabricQuantity(bd.runningCutYards, 'গজ', false)} [বিক্রয়যোগ্য]</span>
                                                          </span>
                                                        )}
                                                        {bd.needsRestock && gStock > 0 && (
                                                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap transition-colors animate-pulse" title="কাউন্টারের থান শেষ বা ছাঁট সীমার নিচে! গোডাউন থেকে নতুন থান আনুন">
                                                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                                            <span>🚨 নতুন থান চালান প্রয়োজন</span>
                                                          </span>
                                                        )}
                                                      </>
                                                    );
                                                  })()}
                                                </>
                                              ) : (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs whitespace-nowrap transition-colors">
                                                  <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                                                  <span>দোকানে: {sStock} {unit}</span>
                                                </span>
                                              )}
                                              {totalShopCost > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap transition-colors">
                                                  <span>💰 ক্রয়: {currencySymbol}{Math.round(totalShopCost).toLocaleString('bn-BD')}</span>
                                                </span>
                                              )}
                                              {totalShopSelling > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 shadow-2xs whitespace-nowrap transition-colors">
                                                  <span>🏷️ বিক্রয়: {currencySymbol}{Math.round(totalShopSelling).toLocaleString('bn-BD')}</span>
                                                </span>
                                              )}
                                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border shadow-2xs whitespace-nowrap transition-colors ${
                                                gStock > 0
                                                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                                              }`}>
                                                <Warehouse className="w-3 h-3 text-slate-600 shrink-0" />
                                                <span>গোডাউনে আছে: {gStock > 0 ? `${gStock} ${isThan ? 'থান' : unit}` : 'নেই'}</span>
                                              </span>
                                            </div>
                                          ) : isThan ? (
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs whitespace-nowrap transition-colors">
                                                <Warehouse className="w-3 h-3 text-indigo-600 shrink-0" />
                                                <span>গোডাউন: {gStock} থান</span>
                                              </span>
                                              {yardsPerThan > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs whitespace-nowrap transition-colors">
                                                  <Scissors className="w-3 h-3 text-amber-700 shrink-0" />
                                                  <span>{yardsPerThan} গজ/থান</span>
                                                </span>
                                              )}
                                              {yardsPerThan > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap transition-colors">
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                  <span>মোট: {(gStock * yardsPerThan).toLocaleString('bn-BD')} গজ</span>
                                                </span>
                                              )}
                                              {totalGodownCost > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap transition-colors">
                                                  <span>💰 মূল্য: {currencySymbol}{Math.round(totalGodownCost).toLocaleString('bn-BD')}</span>
                                                </span>
                                              )}
                                            </div>
                                          ) : isGoj ? (
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                                <Warehouse className="w-3 h-3 text-emerald-600 shrink-0" />
                                                <span>গোডাউন: {gStock} গজ</span>
                                              </span>
                                              {totalGodownCost > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap">
                                                  <span>💰 মূল্য: {currencySymbol}{Math.round(totalGodownCost).toLocaleString('bn-BD')}</span>
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs whitespace-nowrap">
                                                <Warehouse className="w-3 h-3 text-sky-600 shrink-0" />
                                                <span>গোডাউন: {gStock} {unit}</span>
                                              </span>
                                              {totalGodownCost > 0 && (
                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs whitespace-nowrap">
                                                  <span>💰 মূল্য: {currencySymbol}{Math.round(totalGodownCost).toLocaleString('bn-BD')}</span>
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 font-semibold">
                                      {p.Category}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs">
                                        {getProductDisplayUnit(p)}
                                      </span>
                                    </td>
                                    {/* গোডাউন স্টক - রঙিন বাটন ব্যাজ */}
                                    <td className="py-3 px-4 text-center bg-indigo-50/20">
                                      <div className="inline-flex flex-col items-center">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm shadow-2xs transition-transform hover:scale-105 ${
                                          gStock > 0
                                            ? 'bg-indigo-600 text-white border border-indigo-700 shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                                        }`}>
                                          {gStock > 0 ? `${gStock} ${isThan ? 'থান' : unit}` : '০ মজুত'}
                                        </span>
                                        {isThan && yardsPerThan > 0 && gStock > 0 && (
                                          <span className="mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200/60 font-mono">
                                            {(gStock * yardsPerThan).toLocaleString('bn-BD')} গজ
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {/* দোকান স্টক - রঙিন বাটন ব্যাজ */}
                                    <td className="py-3 px-4 text-center bg-emerald-50/20">
                                      <div className="inline-flex flex-col items-center">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm shadow-2xs transition-transform hover:scale-105 ${
                                          isZeroShop
                                            ? 'bg-rose-500 text-white border border-rose-600 shadow-rose-200'
                                            : isLowShop
                                            ? 'bg-amber-500 text-white border border-amber-600 shadow-amber-200'
                                            : 'bg-emerald-600 text-white border border-emerald-700 shadow-emerald-200'
                                        }`}>
                                          {isThan ? (
                                            sStock <= 0 ? '০ গজ' : (
                                              bd && bd.fullThans > 0 && bd.runningCutYards > 0
                                                ? `${bd.fullThans} থান + ${bd.runningCutGojGira}`
                                                : bd && bd.fullThans > 0
                                                ? `${bd.fullThans} থান`
                                                : bd
                                                ? `${bd.runningCutGojGira}`
                                                : `${sStock} গজ`
                                            )
                                          ) : (
                                            `${sStock} ${unit}`
                                          )}
                                        </span>
                                        {isThan && sStock > 0 && (
                                          <span className="mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono" title="দোকানের মোট কাপড় (গজে)">
                                            মোট: {sStock.toLocaleString('bn-BD')} গজ
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {/* মোট স্টক - বাটন ব্যাজ */}
                                    <td className="py-3 px-3 text-center">
                                      <div className="inline-flex flex-col items-center">
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm bg-slate-800 text-white shadow-2xs border border-slate-900">
                                          {isThan ? (
                                            (() => {
                                              const totalFullThans = gStock + (bd ? bd.fullThans : 0);
                                              const hasRunningCut = bd && bd.runningCutYards > 0;
                                              if (totalFullThans <= 0 && !hasRunningCut) return '০ গজ';
                                              if (totalFullThans > 0 && hasRunningCut) {
                                                return `${totalFullThans} থান + ${bd.runningCutGojGira}`;
                                              }
                                              if (totalFullThans > 0) return `${totalFullThans} থান`;
                                              return `${bd ? bd.runningCutGojGira : '০ গজ'}`;
                                            })()
                                          ) : (
                                            `${total} ${unit}`
                                          )}
                                        </span>
                                        {isThan && (
                                          <span className="mt-1 text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-md border border-slate-600 font-mono" title="গোডাউন ও দোকান মিলিয়ে মোট গজ">
                                            মোট: {((gStock * yardsPerThan) + sStock).toLocaleString('bn-BD')} গজ
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {/* অবস্থা */}
                                    <td className="py-3 px-3 text-center">
                                      {isZeroShop && gStock > 0 ? (
                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                          <span>⚡ দোকানে আনুন</span>
                                        </span>
                                      ) : isZeroShop && gStock <= 0 ? (
                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                          <span>❌ শেষ</span>
                                        </span>
                                      ) : isLowShop && gStock > 0 ? (
                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          <span>⚠️ দোকানে কম</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <span>✓ পর্যাপ্ত</span>
                                        </span>
                                      )}
                                    </td>
                                    {/* অ্যাকশন বাটনসমূহ */}
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                        <button
                                          type="button"
                                          disabled={gStock <= 0}
                                          onClick={() => handleOpenDirectTransfer(p)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all ${
                                            gStock <= 0
                                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white cursor-pointer shadow-indigo-200'
                                          }`}
                                          title={gStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে দোকানে পণ্য আনুন'}
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          <span>দোকানে চালান</span>
                                        </button>
                                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                          <button
                                            type="button"
                                            onClick={() => setPrintStickerProduct(p)}
                                            className="p-1.5 hover:bg-white hover:text-indigo-600 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
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
                                            className="p-1.5 hover:bg-white hover:text-amber-600 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                            title={isShopStockView ? 'দোকানের কাউন্টার স্টক সংশোধন বা সমন্বয়' : 'গোডাউন স্টক সংশোধন বা সমন্বয়'}
                                          >
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                          </button>
                                          {onEditProduct && (
                                            <button
                                              type="button"
                                              onClick={() => onEditProduct(p)}
                                              className="p-1.5 hover:bg-white hover:text-indigo-600 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                              title="পণ্য এডিট করুন"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {!isShopStockView && onDeleteProduct && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (window.confirm(`আপনি কি নিশ্চিত যে '${p.ProductName}' পণ্যটি মুছে ফেলতে চান?`)) {
                                                  onDeleteProduct(p.ProductID);
                                                }
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
                                    <tr className="bg-slate-50/90 border-y border-indigo-100">
                                      <td colSpan="8" className="p-3 pl-6 sm:pl-10">
                                        {(() => {
                                          const sumVarGodown = vars.reduce((s, item) => s + (Number(item.GodownStock) || 0), 0);
                                          const sumVarShop = vars.reduce((s, item) => s + (Number(item.StockQuantity) || 0), 0);
                                          const pGodown = Number(p.GodownStock) || 0;
                                          const pShop = Number(p.StockQuantity) || 0;
                                          const isMismatch = (sumVarGodown !== pGodown) || (sumVarShop !== pShop);

                                          return (
                                            <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-xs">
                                              <div className="px-4 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center space-x-2">
                                                  <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                                                    <Palette className="w-3.5 h-3.5" />
                                                  </span>
                                                  <span className="text-xs font-black text-indigo-950">{p.ProductName} — ভ্যারিয়েন্ট অনুযায়ী আলাদা মজুত</span>
                                                  <span className="text-[10px] text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full font-bold">
                                                    মোট {vars.length}টি ভ্যারিয়েন্ট
                                                  </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-xs">
                                                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                                                    ভ্যারিয়েন্ট গোডাউন মোট: <strong className="font-mono">{sumVarGodown}</strong> {isThan ? 'থান' : getProductDisplayUnit(p)}
                                                  </span>
                                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                                    ভ্যারিয়েন্ট দোকান মোট: <strong className="font-mono">{sumVarShop}</strong> {isThan ? 'গজ' : getProductDisplayUnit(p)}
                                                  </span>
                                                  {!isShopStockView && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenNewColor(p)}
                                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold inline-flex items-center space-x-1 shadow-xs cursor-pointer transition-all"
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
                                                    <th className="py-2.5 px-3">ভ্যারিয়েন্ট বিবরণ (রং / সাইজ)</th>
                                                    <th className="py-2.5 px-3">বারকোড</th>
                                                    <th className="py-2.5 px-3 text-center bg-indigo-50/40 text-indigo-900 font-bold">🏭 গোডাউন স্টক</th>
                                                    <th className="py-2.5 px-3 text-center bg-emerald-50/40 text-emerald-900 font-bold">🏬 দোকান স্টক</th>
                                                    <th className="py-2.5 px-3 text-center">📦 মোট</th>
                                                    <th className="py-2.5 px-3 text-center">অবস্থা</th>
                                                    <th className="py-2.5 px-3 text-right">{isShopStockView ? 'নির্দিষ্ট চালান' : 'কার্যক্রম'}</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {vars.map((v, vIdx) => {
                                                    const vGStock = Number(v.GodownStock) || 0;
                                                    const vSStock = Number(v.StockQuantity) || 0;
                                                    const vCost = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : unitCost));
                                                    const vColor = v.Attributes?.Color || v.Color || '';
                                                    const vSize = v.Attributes?.Size || v.Size || '';
                                                    const vBd = isThan ? calculateThanBreakdown(vSStock, yardsPerThan, remTh) : null;
                                                    const vTotal = isThan ? (vGStock + (vBd ? vBd.fullThans : 0)) : (vGStock + vSStock);
                                                    const isVZero = vSStock <= 0;
                                                    const isVLow = isThan
                                                      ? (vBd ? (vBd.needsRestock || vBd.fullThans === 0 || vSStock <= yardsPerThan) : (vSStock <= 2))
                                                      : (vSStock <= 2);
                                                    const hexColor = getColorHex(vColor);

                                                    return (
                                                      <tr key={v.VariantID || vIdx} className="hover:bg-indigo-50/20 transition-colors">
                                                        <td className="py-2.5 px-3">
                                                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                                            {vColor && (
                                                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                                                <span
                                                                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                                                  style={{ backgroundColor: hexColor }}
                                                                />
                                                                <span>রং: {vColor}</span>
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
                                                                <span key={key} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                                                                  {key}: {val}
                                                                </span>
                                                              );
                                                            })}
                                                          </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono text-[10.5px] text-slate-500">
                                                          {v.Barcode || p.Barcode || '—'}
                                                        </td>
                                                        {/* ভ্যারিয়েন্ট গোডাউন স্টক - রঙিন ব্যাজ */}
                                                        <td className="py-2.5 px-3 text-center bg-indigo-50/20">
                                                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-indigo-600 text-white shadow-2xs">
                                                            {vGStock} {isThan ? 'থান' : unit}
                                                          </span>
                                                          {isThan && yardsPerThan > 0 && (
                                                            <div className="text-[10px] text-indigo-600 font-bold mt-0.5 font-mono">
                                                              {(vGStock * yardsPerThan).toLocaleString('bn-BD')} গজ
                                                            </div>
                                                          )}
                                                          {vCost > 0 && vGStock > 0 && (
                                                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-bold">
                                                              {currencySymbol}{Math.round((isThan ? (vGStock * yardsPerThan) : vGStock) * vCost).toLocaleString('bn-BD')}
                                                            </span>
                                                          )}
                                                        </td>
                                                        {/* ভ্যারিয়েন্ট দোকান স্টক - রঙিন ব্যাজ */}
                                                        <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                                                          <div className="inline-flex flex-col items-center">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-2xs ${
                                                              isVZero
                                                                ? 'bg-rose-500 text-white'
                                                                : isVLow
                                                                ? 'bg-amber-500 text-white'
                                                                : 'bg-emerald-600 text-white'
                                                            }`}>
                                                              {isThan ? (
                                                                vSStock <= 0 ? '০ গজ' : (
                                                                  vBd && vBd.fullThans > 0 && vBd.runningCutYards > 0
                                                                    ? `${vBd.fullThans} থান + ${vBd.runningCutGojGira}`
                                                                    : vBd && vBd.fullThans > 0
                                                                    ? `${vBd.fullThans} থান`
                                                                    : vBd
                                                                    ? `${vBd.runningCutGojGira}`
                                                                    : `${vSStock} গজ`
                                                                )
                                                              ) : (
                                                                `${vSStock} ${unit}`
                                                              )}
                                                            </span>
                                                            {isThan && vSStock > 0 && (
                                                              <div className="text-[10px] text-emerald-800 font-bold mt-0.5 font-mono">
                                                                মোট: {vSStock.toLocaleString('bn-BD')} গজ
                                                              </div>
                                                            )}
                                                          </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                                          {isThan ? (
                                                            (() => {
                                                              const vTotalThans = vGStock + (vBd ? vBd.fullThans : 0);
                                                              const vTotalAllYards = (vGStock * yardsPerThan) + vSStock;
                                                              const hasRunningCut = vBd && vBd.runningCutYards > 0;
                                                              return (
                                                                <div className="inline-flex flex-col items-center">
                                                                  <span className="text-xs font-black font-mono">
                                                                    {vTotalThans <= 0 && !hasRunningCut
                                                                      ? '০ গজ'
                                                                      : vTotalThans > 0 && hasRunningCut
                                                                      ? `${vTotalThans} থান + ${vBd.runningCutGojGira}`
                                                                      : vTotalThans > 0
                                                                      ? `${vTotalThans} থান`
                                                                      : `${vBd ? vBd.runningCutGojGira : '০ গজ'}`}
                                                                  </span>
                                                                  <span className="text-[10px] text-slate-500 font-mono font-normal">
                                                                    ({vTotalAllYards.toLocaleString('bn-BD')} গজ)
                                                                  </span>
                                                                </div>
                                                              );
                                                            })()
                                                          ) : (
                                                            vTotal
                                                          )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                          {isVZero && vGStock > 0 ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                              দোকানে নেই
                                                            </span>
                                                          ) : isVZero && vGStock <= 0 ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                                              শেষ
                                                            </span>
                                                          ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                              উপলব্ধ
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                          <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                              type="button"
                                                              disabled={vGStock <= 0}
                                                              onClick={() => handleOpenDirectTransfer(p, v)}
                                                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all shadow-xs ${
                                                                vGStock <= 0
                                                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                                              }`}
                                                              title={vGStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে এই ভ্যারিয়েন্ট দোকানে আনুন'}
                                                            >
                                                              <Truck className="w-3 h-3" />
                                                              <span>দোকানে চালান</span>
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
                                                                  className="p-1 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg text-xs transition-all cursor-pointer"
                                                                  title="এই ভ্যারিয়েন্টের প্রাইস ট্যাগ বা স্টিকার প্রিন্ট করুন"
                                                                >
                                                                  <Printer className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenVariantRestock(p, v, vIdx, 'Shop')}
                                                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                                  title="দোকানের এই ভ্যারিয়েন্ট স্টক সমন্বয় করুন"
                                                                >
                                                                  <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                                                                  <span>সমন্বয়</span>
                                                                </button>
                                                              </>
                                                            ) : (
                                                              <>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenVariantRestock(p, v, vIdx, 'Godown')}
                                                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                                  title="এই ভ্যারিয়েন্টে রিস্টক বা স্টক সমন্বয় করুন"
                                                                >
                                                                  <PlusCircle className="w-3 h-3" />
                                                                  <span>রিস্টক</span>
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleOpenEditVariant(p, v, vIdx)}
                                                                  className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs transition-all cursor-pointer"
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
                                                  <tfoot className="bg-slate-50 border-t border-indigo-100">
                                                    <tr>
                                                      <td colSpan="7" className="py-2.5 px-3 text-center">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleOpenNewColor(p)}
                                                          className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-300 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
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
                              const hexColor = getColorHex(item.color);

                              return (
                                <tr key={item.variantId ? `${item.productId}_${item.variantId}` : `${item.productId}_${idx}`} className="hover:bg-indigo-50/10 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 text-sm">
                                      {item.productName}
                                    </div>
                                    <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                                      {item.color && (
                                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
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
                                    {isShopStockView ? (
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                        {item.isThanUnit ? (
                                          <>
                                            {(() => {
                                              const ypt = item.yardsPerThan || 25;
                                              const remTh = Number(item.parentProduct?.RemnantThreshold || item.parentProduct?.remnantThreshold || 2);
                                              const bd = calculateThanBreakdown(item.shopStock, ypt, remTh);
                                              return (
                                                <>
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                                                    🏬 মোট: {bd.totalYards} গজ
                                                  </span>
                                                  {bd.fullThans > 0 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                                      📦 {bd.fullThans}টি আস্ত থান
                                                    </span>
                                                  )}
                                                  {bd.runningCutYards > 0 && !bd.isRemnant && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 whitespace-nowrap">
                                                      ✂️ কাটা থানে: {formatFabricQuantity(bd.runningCutYards, 'গজ', false)}
                                                    </span>
                                                  )}
                                                  {bd.isRemnant && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 whitespace-nowrap font-bold animate-pulse">
                                                      ✂️ শেষ ছাঁট: {formatFabricQuantity(bd.runningCutYards, 'গজ', false)} [বিক্রয়যোগ্য]
                                                    </span>
                                                  )}
                                                  {bd.needsRestock && item.godownStock > 0 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap font-bold animate-pulse">
                                                      🚨 নতুন থান প্রয়োজন
                                                    </span>
                                                  )}
                                                </>
                                              );
                                            })()}
                                          </>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                                            🏬 দোকানে: {item.shopStock} {item.unit || 'পিস'}
                                          </span>
                                        )}
                                        {Number(item.costPrice || 0) > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 whitespace-nowrap">
                                            💰 ক্রয়: {currencySymbol}{Math.round((item.isThanUnit ? item.shopYards : item.shopStock) * (item.costPrice || 0)).toLocaleString('bn-BD')}
                                          </span>
                                        )}
                                        {Number(item.sellingPrice || 0) > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 whitespace-nowrap">
                                            🏷️ বিক্রয়: {currencySymbol}{Math.round((item.isThanUnit ? item.shopYards : item.shopStock) * (item.sellingPrice || 0)).toLocaleString('bn-BD')}
                                          </span>
                                        )}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border whitespace-nowrap ${
                                          item.godownStock > 0 ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                          🏭 গোডাউনে আছে: {item.godownStock > 0 ? `${item.godownStock} ${item.unit || 'থান'}` : 'নেই'}
                                        </span>
                                      </div>
                                    ) : item.isThanUnit ? (
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
                                          📏 {item.yardsPerThan} গজ/থান
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                          🏭 গোডাউন: {item.godownYards} গজ
                                        </span>
                                        {Number(item.costPrice || 0) > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 whitespace-nowrap">
                                            💰 স্টক মূল্য: {currencySymbol}{Math.round((item.godownYards || item.godownStock) * (item.costPrice || 0)).toLocaleString('bn-BD')}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap">
                                          🏭 গোডাউন: {item.godownStock} {item.unit}
                                        </span>
                                        {Number(item.costPrice || 0) > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 whitespace-nowrap">
                                            💰 স্টক মূল্য: {currencySymbol}{Math.round(item.godownStock * (item.costPrice || 0)).toLocaleString('bn-BD')}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-slate-600 font-semibold">
                                    {item.category}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs">
                                      {item.unit || getProductDisplayUnit(item.parentProduct)}
                                    </span>
                                  </td>
                                  {/* গোডাউন স্টক রঙিন বাটন ব্যাজ */}
                                  <td className="py-3 px-4 text-center bg-indigo-50/20">
                                    <div className="inline-flex flex-col items-center">
                                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm shadow-2xs transition-transform hover:scale-105 ${
                                        item.godownStock > 0
                                          ? 'bg-indigo-600 text-white border border-indigo-700 shadow-indigo-200'
                                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                                      }`}>
                                        {item.godownStock} {item.unit || 'থান'}
                                      </span>
                                      {item.isThanUnit && item.godownYards > 0 && (
                                        <div className="text-[10px] text-indigo-700 font-bold mt-1 font-mono">
                                          ({item.godownYards} গজ)
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {/* দোকান স্টক রঙিন বাটন ব্যাজ */}
                                  <td className="py-3 px-4 text-center bg-emerald-50/20">
                                    <div className="inline-flex flex-col items-center">
                                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm shadow-2xs transition-transform hover:scale-105 ${
                                        isZeroShop
                                          ? 'bg-rose-500 text-white border border-rose-600 shadow-rose-200'
                                          : isLowShop
                                          ? 'bg-amber-500 text-white border border-amber-600 shadow-amber-200'
                                          : 'bg-emerald-600 text-white border border-emerald-700 shadow-emerald-200'
                                      }`}>
                                        {item.isThanUnit ? (
                                          item.shopStock <= 0 ? '০ গজ' : (
                                            item.thanBreakdown && item.thanBreakdown.fullThans > 0 && item.thanBreakdown.runningCutYards > 0
                                              ? `${item.thanBreakdown.fullThans} থান + ${item.thanBreakdown.runningCutGojGira}`
                                              : item.thanBreakdown && item.thanBreakdown.fullThans > 0
                                              ? `${item.thanBreakdown.fullThans} থান`
                                              : item.thanBreakdown
                                              ? `${item.thanBreakdown.runningCutGojGira}`
                                              : `${item.shopStock} গজ`
                                          )
                                        ) : (
                                          `${item.shopStock} ${item.unit || 'থান'}`
                                        )}
                                      </span>
                                      {item.isThanUnit && item.shopStock > 0 && (
                                        <div className="text-[10px] text-emerald-800 font-bold mt-1 font-mono">
                                          মোট: {item.shopStock.toLocaleString('bn-BD')} গজ
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center font-black font-mono text-slate-900">
                                    <div className="inline-flex flex-col items-center">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl font-black font-mono text-xs sm:text-sm bg-slate-800 text-white shadow-2xs border border-slate-900">
                                        {item.isThanUnit ? (
                                          (() => {
                                            const bd = item.thanBreakdown;
                                            const totalFullThans = item.godownStock + (bd ? bd.fullThans : 0);
                                            const hasRunningCut = bd && bd.runningCutYards > 0;
                                            if (totalFullThans <= 0 && !hasRunningCut) return '০ গজ';
                                            if (totalFullThans > 0 && hasRunningCut) return `${totalFullThans} থান + ${bd.runningCutGojGira}`;
                                            if (totalFullThans > 0) return `${totalFullThans} থান`;
                                            return `${bd ? bd.runningCutGojGira : '০ গজ'}`;
                                          })()
                                        ) : (
                                          `${item.totalStock} ${item.unit || 'থান'}`
                                        )}
                                      </span>
                                      {item.isThanUnit && (
                                        <span className="mt-1 text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-md border border-slate-600 font-mono">
                                          মোট: {item.totalYards.toLocaleString('bn-BD')} গজ
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {isZeroShop && item.godownStock > 0 ? (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                        <span>⚡ দোকানে আনুন</span>
                                      </span>
                                    ) : isZeroShop && item.godownStock <= 0 ? (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                        <span>❌ শেষ</span>
                                      </span>
                                    ) : isLowShop && item.godownStock > 0 ? (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        <span>⚠️ দোকানে কম</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span>✓ পর্যাপ্ত</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      <button
                                        type="button"
                                        disabled={item.godownStock <= 0}
                                        onClick={() => handleOpenDirectTransfer(item.parentProduct, item.variant)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all ${
                                          item.godownStock <= 0
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-200'
                                        }`}
                                        title={item.godownStock <= 0 ? 'গোডাউনে কোনো স্টক নেই' : 'গোডাউন থেকে এই ভ্যারিয়েন্ট সরাসরি দোকানে আনুন'}
                                      >
                                        <Truck className="w-3.5 h-3.5" />
                                        <span>দোকানে চালান</span>
                                      </button>
                                      {item.isVariant ? (
                                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
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
                                                className="p-1.5 hover:bg-white hover:text-indigo-600 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
                                                title="প্রাইস ট্যাগ বা স্টিকার প্রিন্ট করুন"
                                              >
                                                <Printer className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenVariantRestock(item.parentProduct, item.variant, item.variantIndex, 'Shop')}
                                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                title="দোকানের স্টক সমন্বয় করুন"
                                              >
                                                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                                                <span>সমন্বয়</span>
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenVariantRestock(item.parentProduct, item.variant, item.variantIndex, 'Godown')}
                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                                                title="এই ভ্যারিয়েন্টে রিস্টক বা স্টক সমন্বয় করুন"
                                              >
                                                <PlusCircle className="w-3 h-3" />
                                                <span>রিস্টক</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditVariant(item.parentProduct, item.variant, item.variantIndex)}
                                                className="p-1.5 hover:bg-white hover:text-amber-700 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
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
                                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                          <button
                                            type="button"
                                            onClick={() => setPrintStickerProduct(item.parentProduct)}
                                            className="p-1.5 hover:bg-white hover:text-indigo-600 text-slate-600 rounded-lg text-xs transition-colors cursor-pointer"
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
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        transferSubTab === 'new'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>গোডাউন থেকে চালান তৈরি</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferSubTab('list')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        transferSubTab === 'list'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>দোকানে আসা চালান ও ট্র্যাকিং</span>
                      {stockTransfers.filter(t => t.Status === 'In Transit' || t.Status === 'Pending').length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold animate-pulse shadow-xs">
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
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                          <label className="text-xs font-bold text-slate-700 block mb-1">চালানের তারিখ</label>
                          <input
                            type="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-600" />
                            <span>চালানে পণ্য ও ভ্যারিয়েন্ট যোগ করুন</span>
                          </span>
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
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
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                            className="w-full px-3 py-2 text-xs border-2 border-indigo-300 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                          >
                            <option value="">-- গোডাউনে মজুত থাকা ভ্যারিয়েন্ট বা পণ্য বেছে নিন --</option>
                            {filteredDropdownItems.map((item) => {
                              const isOut = item.godownStock <= 0;
                              return (
                                <option
                                  key={item.key}
                                  value={item.key}
                                  disabled={isOut}
                                  className={isOut ? 'text-slate-400 bg-slate-100' : 'text-slate-900 font-semibold'}
                                >
                                  {item.productName} {item.variantName ? `➔ [ভ্যারিয়েন্ট: ${item.variantName}]` : '➔ [সাধারণ পণ্য]'} — 🏭 গোডাউন মজুত: {item.godownStock} {item.unit} {isOut ? '(মজুত শূন্য)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* নির্বাচিত পণ্যের প্রিভিউ ও পরিমাণ নির্ধারণ */}
                        {selectedGodownItem && (
                          <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div>
                                <span className="font-black text-slate-900 text-xs block">
                                  {selectedGodownItem.productName}
                                </span>
                                {selectedGodownItem.variantName && (
                                  <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                                    ভ্যারিয়েন্ট: {selectedGodownItem.variantName}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 inline-block font-mono">
                                  🏭 গোডাউনে মজুত: {selectedGodownItem.godownStock} {selectedGodownItem.unit}
                                </span>
                                {selectedGodownItem.isThan && selectedGodownItem.yardsPerThan > 0 && (
                                  <span className="text-[10px] text-indigo-500 block font-semibold mt-0.5">
                                    ({selectedGodownItem.godownStock * selectedGodownItem.yardsPerThan} গজ)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
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
                                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={selectedGodownItem.godownStock <= 0}
                                onClick={handleAddItemToChallan}
                                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-xs cursor-pointer"
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
                            <div key={ch.TransferID || ch.ChallanNo} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:shadow-xs transition-shadow">
                              {/* কার্ড হেডার: চালান নং, তারিখ, স্ট্যাটাস ও রিমুভ আইকন */}
                              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-black text-sm text-indigo-700">#{ch.ChallanNo}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      isInTransit ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                                      isReceived ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {isInTransit ? '🚚 পথে আছে (অপেক্ষমাণ)' : isReceived ? '✅ দোকানে রিসিভড' : '❌ বাতিল'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                    📅 চালানের তারিখ: {formattedDate}
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
                              <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">প্রেরক ➔ প্রাপক:</span>
                                  <strong className="text-slate-800">{ch.FromLocation} ➔ {ch.ToLocation}</strong>
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
                              <div className="bg-slate-50/90 rounded-xl border border-slate-200 overflow-hidden text-xs">
                                <div className="px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                                  <span className="flex items-center space-x-1">
                                    <Package className="w-3 h-3 text-indigo-600" />
                                    <span>চালানের পণ্য ও ভ্যারিয়েন্ট বিস্তারিত ({items.length}টি)</span>
                                  </span>
                                  <span className="font-mono text-indigo-700 font-black">
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
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                ভ্যারিয়েন্ট: {itm.variantName}
                                              </span>
                                            )}
                                            {itm.variantId && !itm.variantName && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                                                ID: {itm.variantId}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                                            {itm.quantity || itm.Quantity} {itm.unit || itm.Unit || 'Pcs'}
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* কার্ড ফুটার বাটনসমূহ */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
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
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
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
            {/* ট্যাব ৩: 🏭 গোডাউন স্টক কমার খাতা (ভ্যারিয়েন্ট ভিত্তিক ও পিডিএফ রিপোর্ট) */}
            {/* =============================================================== */}
            {activeMainTab === 'godown_outflow' && (
              <div className="space-y-4">
                
                {/* পরিচিতি ব্যানার */}
                <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-950 flex items-center space-x-2">
                        <span>গোডাউনে ভ্যারিয়েন্ট অনুযায়ী স্টক কমার খাতা</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold border border-amber-300">
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
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>পিডিএফ ডাউনলোড / প্রিন্ট</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportGodownOutflowExcelCSV(stockMovements, products)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>গোডাউন কমার এক্সেল রিপোর্ট</span>
                    </button>
                  </div>
                </div>

                {/* সারসংক্ষেপ কেপিআই কার্ডস */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 block mb-0.5">মোট কমার ঘটনা</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-slate-900">{godownOutflowSummary.count}</span>
                      <span className="text-xs text-slate-500">টি এন্ট্রি</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-rose-800 block mb-0.5">মোট হ্রাসকৃত স্টক</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-rose-700">-{godownOutflowSummary.totalQty}</span>
                      <span className="text-xs text-rose-600 font-medium">(থান/গজ/পিস)</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-indigo-800 block mb-0.5">চালানে স্থানান্তর</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-indigo-700">-{godownOutflowSummary.transferQty}</span>
                      <span className="text-xs text-indigo-600 font-medium">দোকানে পাঠানো</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-amber-800 block mb-0.5">ড্যামেজ ও সমন্বয় হ্রাস</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black font-mono text-amber-700">
                        -{Math.round((godownOutflowSummary.damageQty + godownOutflowSummary.adjustQty) * 100) / 100}
                      </span>
                      <span className="text-xs text-amber-600 font-medium">গোডাউন হ্রাস</span>
                    </div>
                  </div>
                </div>

                {/* ফিল্টার বার */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={godownSearch}
                      onChange={(e) => setGodownSearch(e.target.value)}
                      placeholder="পণ্য, ভ্যারিয়েন্ট, রঙ, সাইজ বা চালান নং দিয়ে খুঁজুন..."
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
                      <option value="TRANSFER_OUT">দোকানে স্থানান্তর চালান</option>
                      <option value="DAMAGE">গোডাউন ড্যামেজ</option>
                      <option value="ADJUSTMENT">স্টক সমন্বয় / কর্তন</option>
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
                            <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
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
                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                                          <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
                                          <span>রং: {m.color}</span>
                                        </span>
                                      )}
                                      {m.size && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          সাইজ: {m.size}
                                        </span>
                                      )}
                                      {m.variantName && !m.color && !m.size && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                          {m.variantName}
                                        </span>
                                      )}
                                    </div>
                                    {m.variantId && (
                                      <span className="text-[10px] text-slate-400 font-mono">আইডি: {m.variantId}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] text-slate-500 bg-slate-100 font-medium">
                                    সাধারণ / নন-ভ্যারিয়েন্ট
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-800 block">{m.reasonBangla}</span>
                                {m.referenceNo && (
                                  <span className="text-[10px] font-mono text-indigo-600 font-bold">
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
                  {(() => {
                    const isT = /than|থান/i.test(getProductDisplayUnit(adjustTargetProduct));
                    return (
                      <>
                        <span>🏬 বর্তমান দোকান স্টক: <strong>{adjustTargetProduct.StockQuantity || 0} {isT ? 'গজ' : getProductDisplayUnit(adjustTargetProduct)}</strong></span>
                        <span>🏭 বর্তমান গোডাউন স্টক: <strong>{adjustTargetProduct.GodownStock || 0} {isT ? 'থান' : getProductDisplayUnit(adjustTargetProduct)}</strong></span>
                      </>
                    );
                  })()}
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
          const prodUnit = getProductDisplayUnit(prod);
          const isProdThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isProdThan ? (Number(prod?.YardsPerThan || prod?.yardsPerThan || 0) || 25) : 0;
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
                        {targetV.GodownStock || 0} {isProdThan ? 'থান' : getProductDisplayUnit(prod)}
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
                        {targetV.StockQuantity || 0} {isProdThan ? 'গজ' : getProductDisplayUnit(prod)}
                      </span>
                      {isProdThan && prodYardsPerThan > 0 && Number(targetV.StockQuantity || 0) > 0 && (
                        <span className="text-[9.5px] text-emerald-600 block font-semibold">
                          ({calculateThanBreakdown(targetV.StockQuantity, prodYardsPerThan, 2).displayText})
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
                        {isProdThan ? 'থান' : getProductDisplayUnit(prod)}
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
          const prodUnit = getProductDisplayUnit(prod);
          const isThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isThan ? (Number(prod.YardsPerThan || prod.yardsPerThan || 0) || 25) : 0;
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
                        গোডাউন স্টক ({isThan ? 'থান' : getProductDisplayUnit(prod)})
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
                      {isThan && prodYardsPerThan > 0 && Number(newColorModal.shopStock || 0) > 0 && (
                        <div className="text-[10px] text-emerald-700 font-bold mt-1">
                          = {calculateThanBreakdown(newColorModal.shopStock, prodYardsPerThan, 2).displayText}
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
          const prodUnit = getProductDisplayUnit(prod);
          const isThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isThan ? (Number(prod.YardsPerThan || prod.yardsPerThan || 0) || 25) : 0;
          const currentUnit = isThan ? 'থান' : prodUnit;

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
                          🏬 দোকান স্টক ({isThan ? 'গজ' : currentUnit})
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
                        {isThan && prodYardsPerThan > 0 && Number(editVariantModal.shopStock || 0) > 0 && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-1">
                            = {calculateThanBreakdown(editVariantModal.shopStock, prodYardsPerThan, 2).displayText}
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
          const prodUnit = getProductDisplayUnit(prod);
          const isThan = /than|থান/i.test(prodUnit);
          const prodYardsPerThan = isThan ? (Number(prod.YardsPerThan || prod.yardsPerThan || 0) || 25) : 0;
          const unitLabel = isThan ? 'থান' : prodUnit;

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
                                {isThan ? `${currentShopStock} গজ` : `${currentShopStock} ${unitLabel}`}
                              </span>
                              {isThan && prodYardsPerThan > 0 && currentShopStock > 0 && (
                                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                                  ({calculateThanBreakdown(currentShopStock, prodYardsPerThan, 2).displayText})
                                </span>
                              )}
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
                            {isThan ? `${currentShopStock} গজ` : `${currentShopStock} ${unitLabel}`}
                          </span>
                          {isThan && prodYardsPerThan > 0 && currentShopStock > 0 && (
                            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                              ({calculateThanBreakdown(currentShopStock, prodYardsPerThan, 2).displayText})
                            </span>
                          )}
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

      </div>
    </div>
  );
}
