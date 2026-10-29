import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Barcode,
  Layers,
  Image as ImageIcon,
  PlusCircle,
  Tag,
  Check,
  FileText,
  AlignLeft,
  ListPlus,
  PackageCheck,
  Upload,
  Globe,
  Loader2,
  Camera,
  Printer,
  Wand2,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  Box,
  Sparkles,
  Palette,
  Plus,
  Trash2,
  Scissors,
  Store,
  Package
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeStickerModal from './BarcodeStickerModal';
import { canViewCostPrice } from '../utils/permissionUtils';
import { getProductDisplayUnit } from '../services/storage';
import {
  calculateThanBreakdown,
  calculateInitialShopYards,
  parseGojGira,
  formatFabricQuantity,
  isFabricUnit,
  isThanUnit
} from '../utils/fabricUtils';

// ছবি কম্প্রেস ও অপটিমাইজ ফাংশন (যাতে দ্রুত ড্রাইভে আপলোড হয়)
const compressImageForUpload = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('ছবি লোড করতে সমস্যা হয়েছে'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ফাইল পড়তে ব্যর্থ হয়েছে'));
    reader.readAsDataURL(file);
  });
};

// রঙের হেক্স কোড নির্ধারণ ফাংশন
const getColorHex = (colorName = '') => {
  if (!colorName) return null;
  const c = String(colorName).trim().toLowerCase();
  const map = {
    'লাল': '#ef4444', 'red': '#ef4444',
    'নীল': '#3b82f6', 'blue': '#3b82f6',
    'কালো': '#1e293b', 'black': '#0f172a',
    'সাদা': '#f8fafc', 'white': '#ffffff',
    'সবুজ': '#10b981', 'green': '#10b981',
    'হলুদ': '#f59e0b', 'yellow': '#f59e0b',
    'গোলাপি': '#ec4899', 'pink': '#ec4899',
    'মেরুন': '#881337', 'maroon': '#881337',
    'নেভি ব্লু': '#1e3a8a', 'navy': '#1e3a8a',
    'অফ-হোয়াইট': '#f1f5f9', 'off white': '#f1f5f9',
    'ছাই': '#64748b', 'grey': '#64748b', 'gray': '#64748b',
    'বেগুনি': '#8b5cf6', 'purple': '#8b5cf6',
    'ফিরোজা': '#06b6d4', 'turquoise': '#06b6d4',
    'জলপাই': '#65a30d', 'olive': '#65a30d',
    'কমলা': '#f97316', 'orange': '#f97316',
    'বাদামি': '#78350f', 'brown': '#78350f',
    'ম্যাজেন্টা': '#d946ef', 'magenta': '#d946ef'
  };
  return map[c] || null;
};

export default function EditProductModal({
  isOpen,
  onClose,
  product,
  currencySymbol = '৳',
  onSubmitUpdate,
  categories = [],
  onAddCategory,
  units = [],
  onAddUnit,
  products = [],
  activeUser = null,
  settings = {},
  onDeleteProduct
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    barcode: '',
    productName: '',
    category: 'General',
    subCategory: '',
    costPrice: '',
    minSellingPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockAlert: '5',
    unit: 'Pcs',
    yardsPerThan: '25',
    remnantThreshold: '',
    imageUrl: '',
    imageCaption: '',
    shortDescription: '',
    description: '',
  });

  // বারকোড স্ক্যানার ও স্টিকার স্টেট
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [barcodePrefix, setBarcodePrefix] = useState(settings?.StorePrefix || 'PB-');
  const [scannedNotification, setScannedNotification] = useState('');

  // ইমেজ আপলোড মোড ও ড্রাইভ প্রসেসিং স্টেট
  const [imageUploadMode, setImageUploadMode] = useState('url'); // 'upload' | 'url'
  const [localImagePreview, setLocalImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitShortName, setNewUnitShortName] = useState('');

  // Phase 6: পণ্য ধরন, ভ্যারিয়েন্ট, ব্যাচ ও কম্বো বান্ডেল স্টেট
  const [productType, setProductType] = useState('simple'); // 'simple' | 'variable' | 'bundle'
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // ভ্যারিয়েন্ট স্টেট
  const [variants, setVariants] = useState([]);
  const [attributeSizes, setAttributeSizes] = useState('');
  const [attributeColors, setAttributeColors] = useState('');
  const [quickColorInput, setQuickColorInput] = useState('');
  const [quickColorThans, setQuickColorThans] = useState(1);

  // বস্ত্রালয় থান ও গজ ক্যালকুলেটর স্টেট (সিম্পল পণ্যের জন্য)
  const [shopFullThans, setShopFullThans] = useState('0');
  const [shopCutGoj, setShopCutGoj] = useState('0');
  const [shopCutGira, setShopCutGira] = useState('0');

  // ভ্যারিয়েন্ট পণ্যের থান ক্যালকুলেটর মোডাল স্টেট
  const [fabricVariantModal, setFabricVariantModal] = useState(null); // { idx, variantName, fullThans, cutGoj, cutGira }

  // কম্বো বান্ডেল স্টেট
  const [bundleItems, setBundleItems] = useState([]);
  const [selectedBundleProduct, setSelectedBundleProduct] = useState('');
  const [bundleItemQty, setBundleItemQty] = useState(1);

  // ভ্যারিয়েন্ট জেনারেটর ও হ্যান্ডলারসমূহ
  const handleAutoGenerateVariants = () => {
    const sizes = attributeSizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = attributeColors.split(',').map((c) => c.trim()).filter(Boolean);

    const generated = [];
    const baseCost = Number(formData.costPrice) || 0;
    const baseSell = Number(formData.sellingPrice) || 0;
    const baseMinSell = formData.minSellingPrice !== '' ? Number(formData.minSellingPrice) : baseCost;

    if (sizes.length > 0 && colors.length > 0) {
      sizes.forEach((size) => {
        colors.forEach((color) => {
          const varId = `VAR-${size.toUpperCase()}-${color.toUpperCase()}`;
          generated.push({
            VariantID: varId,
            Attributes: { Size: size, Color: color },
            Barcode: `${formData.barcode || 'VAR'}-${size}-${color}`.toLowerCase(),
            CostPrice: baseCost,
            MinSellingPrice: baseMinSell,
            SellingPrice: baseSell,
            StockQuantity: 10
          });
        });
      });
    } else if (sizes.length > 0) {
      sizes.forEach((size) => {
        generated.push({
          VariantID: `VAR-${size.toUpperCase()}`,
          Attributes: { Size: size },
          Barcode: `${formData.barcode || 'VAR'}-${size}`.toLowerCase(),
          CostPrice: baseCost,
          MinSellingPrice: baseMinSell,
          SellingPrice: baseSell,
          StockQuantity: 10
        });
      });
    } else if (colors.length > 0) {
      colors.forEach((color) => {
        generated.push({
          VariantID: `VAR-${color.toUpperCase()}`,
          Attributes: { Color: color },
          Barcode: `${formData.barcode || 'VAR'}-${color}`.toLowerCase(),
          CostPrice: baseCost,
          MinSellingPrice: baseMinSell,
          SellingPrice: baseSell,
          StockQuantity: 10
        });
      });
    }

    if (generated.length > 0) {
      setVariants(generated);
      const sumStock = generated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
      setFormData((prev) => ({ ...prev, stockQuantity: String(sumStock) }));
    }
  };

  const handleAddQuickColor = (colorName, thans = 1) => {
    const cleanColor = String(colorName || quickColorInput || '').trim();
    if (!cleanColor) return;
    const isDuplicate = variants.some((v) => {
      const c = v.Color || v.color || v.Attributes?.Color || v.Attributes?.color || v.VariantID;
      return String(c).trim().toLowerCase() === cleanColor.toLowerCase();
    });
    if (isDuplicate) {
      alert(`'${cleanColor}' রঙের ভ্যারিয়েন্ট ইতোমধ্যে বিদ্যমান রয়েছে!`);
      return;
    }

    const thanQty = Math.max(0, Number(thans !== undefined ? thans : quickColorThans) || 1);
    const baseBarcode = formData.barcode || `pb-${Date.now().toString().slice(-4)}`;
    const newV = {
      VariantID: `VAR-${cleanColor.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      Attributes: { Color: cleanColor },
      Color: cleanColor,
      Barcode: `${baseBarcode}-${cleanColor.toLowerCase().replace(/\s+/g, '-')}`,
      CostPrice: Number(formData.costPrice) || 0,
      MinSellingPrice: Number(formData.minSellingPrice) || Number(formData.costPrice) || 0,
      SellingPrice: Number(formData.sellingPrice) || 0,
      WholesalePrice: Number(formData.wholesalePrice) || Number(formData.costPrice) || 0,
      GodownStock: thanQty,
      godownStock: thanQty,
      StockQuantity: 0,
      stockQuantity: 0,
      TotalStock: thanQty
    };
    const updated = [...variants, newV];
    setVariants(updated);
    setQuickColorInput('');

    const sumG = updated.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0);
    const sumS = updated.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      godownStock: String(sumG),
      stockQuantity: String(sumS),
      totalStock: String(sumG + sumS)
    }));
  };

  const handleAddManualVariant = () => {
    const nextIdx = variants.length + 1;
    const newV = {
      VariantID: `VAR-${nextIdx}`,
      Attributes: { Option: `অপশন ${nextIdx}` },
      Barcode: `${formData.barcode || 'VAR'}-${nextIdx}`.toLowerCase(),
      CostPrice: Number(formData.costPrice) || 0,
      SellingPrice: Number(formData.sellingPrice) || 0,
      GodownStock: 10,
      godownStock: 10,
      StockQuantity: 0,
      stockQuantity: 0,
      TotalStock: 10
    };
    const updated = [...variants, newV];
    setVariants(updated);
    const sumG = updated.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0);
    const sumS = updated.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      godownStock: String(sumG),
      stockQuantity: String(sumS),
      totalStock: String(sumG + sumS)
    }));
  };

  const handleUpdateVariantField = (idx, field, value) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: value };
    setVariants(updated);
    const sumG = updated.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0);
    const sumS = updated.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      godownStock: String(sumG),
      stockQuantity: String(sumS),
      totalStock: String(sumG + sumS)
    }));
  };

  const handleRemoveVariant = (idx) => {
    const updated = variants.filter((_, i) => i !== idx);
    setVariants(updated);
    const sumG = updated.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0);
    const sumS = updated.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      godownStock: String(sumG),
      stockQuantity: String(sumS),
      totalStock: String(sumG + sumS)
    }));
  };

  // বস্ত্রালয় সিম্পল কাপড়ের ক্ষেত্রে থান, গজ ও গিরা পরিবর্তনের হ্যান্ডলার
  const handleFabricShopStockChange = (field, val) => {
    let nextFull = field === 'fullThans' ? val : shopFullThans;
    let nextGoj = field === 'cutGoj' ? val : shopCutGoj;
    let nextGira = field === 'cutGira' ? val : shopCutGira;

    if (field === 'fullThans') setShopFullThans(val);
    if (field === 'cutGoj') setShopCutGoj(val);
    if (field === 'cutGira') setShopCutGira(val);

    const fT = Math.max(0, parseInt(nextFull, 10) || 0);
    const cG = Math.max(0, parseInt(nextGoj, 10) || 0);
    const cGi = Math.max(0, Math.min(15, parseInt(nextGira, 10) || 0));
    const ypt = Math.max(0.1, parseFloat(formData.yardsPerThan) || 25);

    const calcYards = calculateInitialShopYards(fT, cG, cGi, ypt);
    setFormData((prev) => ({
      ...prev,
      stockQuantity: String(calcYards)
    }));
  };

  // ভ্যারিয়েন্ট থান ক্যালকুলেটর ওপেন হ্যান্ডলার
  const handleOpenFabricVariantModal = (idx, v) => {
    const sStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
    const ypt = Math.max(0.1, Number(formData.yardsPerThan) || 25);
    const remTh = formData.remnantThreshold !== '' && !isNaN(Number(formData.remnantThreshold)) ? Math.max(0, parseFloat(formData.remnantThreshold)) : 0;
    const bd = calculateThanBreakdown(sStock, ypt, remTh);
    const varName = v.Attributes ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ') : (v.Color || v.VariantID || `ভ্যারিয়েন্ট #${idx + 1}`);

    setFabricVariantModal({
      idx,
      variantName: varName,
      fullThans: String(bd.fullThans || 0),
      cutGoj: String(bd.runningCutGojGira?.goj || 0),
      cutGira: String(bd.runningCutGojGira?.gira || 0)
    });
  };

  // ভ্যারিয়েন্ট থান ক্যালকুলেটর ফলাফল প্রয়োগ হ্যান্ডলার
  const handleApplyFabricVariantModal = () => {
    if (!fabricVariantModal) return;
    const { idx, fullThans, cutGoj, cutGira } = fabricVariantModal;
    const fT = Math.max(0, parseInt(fullThans, 10) || 0);
    const cG = Math.max(0, parseInt(cutGoj, 10) || 0);
    const cGi = Math.max(0, Math.min(15, parseInt(cutGira, 10) || 0));
    const ypt = Math.max(0.1, parseFloat(formData.yardsPerThan) || 25);

    const calcYards = calculateInitialShopYards(fT, cG, cGi, ypt);
    handleUpdateVariantField(idx, 'StockQuantity', calcYards);
    setFabricVariantModal(null);
  };

  const handleAddBundleItem = () => {
    if (!selectedBundleProduct) return;
    const p = products.find((prod) => prod.ProductID === selectedBundleProduct);
    if (!p) return;
    if (bundleItems.some((bi) => bi.ProductID === p.ProductID)) {
      alert('এই পণ্যটি ইতিমধ্যে বান্ডেলে যুক্ত করা হয়েছে!');
      return;
    }

    const newItem = {
      ProductID: p.ProductID,
      ProductName: p.ProductName,
      Quantity: Math.max(1, Number(bundleItemQty) || 1),
      SellingPrice: Number(p.SellingPrice) || 0
    };

    const newBundle = [...bundleItems, newItem];
    setBundleItems(newBundle);
    setSelectedBundleProduct('');
    setBundleItemQty(1);

    const totalBundleCost = newBundle.reduce((sum, item) => {
      const orig = products.find((x) => x.ProductID === item.ProductID);
      return sum + ((Number(orig?.CostPrice) || 0) * item.Quantity);
    }, 0);
    const totalBundleValue = newBundle.reduce((sum, item) => sum + (item.SellingPrice * item.Quantity), 0);

    setFormData((prev) => ({
      ...prev,
      costPrice: prev.costPrice || String(totalBundleCost),
      sellingPrice: prev.sellingPrice || String(totalBundleValue)
    }));
  };

  const handleRemoveBundleItem = (productId) => {
    setBundleItems(bundleItems.filter((bi) => bi.ProductID !== productId));
  };

  // প্রপস থেকে প্রোডাক্ট ডাটা স্টেট-এ লোড করা
  useEffect(() => {
    if (product) {
      setFormData({
        productId: product.ProductID || '',
        barcode: product.Barcode || '',
        productName: product.ProductName || '',
        category: product.Category || 'General',
        subCategory: product.SubCategory || '',
        costPrice: product.CostPrice !== undefined ? String(product.CostPrice) : '',
        minSellingPrice: product.MinSellingPrice !== undefined ? String(product.MinSellingPrice) : (product.minSellingPrice !== undefined ? String(product.minSellingPrice) : ''),
        sellingPrice: product.SellingPrice !== undefined ? String(product.SellingPrice) : '',
        stockQuantity: product.StockQuantity !== undefined ? String(product.StockQuantity) : '0',
        godownStock: product.GodownStock !== undefined ? String(product.GodownStock) : '0',
        minStockAlert: product.MinStockAlert !== undefined ? String(product.MinStockAlert) : '5',
        unit: getProductDisplayUnit(product),
        yardsPerThan: product.YardsPerThan !== undefined ? String(product.YardsPerThan) : (product.yardsPerThan !== undefined ? String(product.yardsPerThan) : '25'),
        remnantThreshold: product.RemnantThreshold !== undefined ? String(product.RemnantThreshold) : (product.remnantThreshold !== undefined ? String(product.remnantThreshold) : ''),
        imageUrl: product.ImageUrl || '',
        imageCaption: product.ImageCaption || '',
        shortDescription: product.ShortDescription || '',
        description: product.Description || '',
      });

      // Phase 6 ডাটা লোড
      if (product.HasVariants && Array.isArray(product.Variants) && product.Variants.length > 0) {
        setProductType('variable');
        setVariants(product.Variants);
      } else if (product.IsBundle && Array.isArray(product.BundleItems) && product.BundleItems.length > 0) {
        setProductType('bundle');
        setBundleItems(product.BundleItems);
      } else {
        setProductType('simple');
        setVariants([]);
        setBundleItems([]);
      }
      setBatchNumber(product.BatchNumber || '');
      setMfgDate(product.MfgDate || '');
      setExpiryDate(product.ExpiryDate || '');

      // ইমেজ মোড ও প্রিভিউ রিসেট
      setLocalImagePreview('');
      setImageBase64('');
      if (product.ImageUrl) {
        setImageUploadMode('url');
      } else {
        setImageUploadMode('upload');
      }

      // ফিচার অ্যারে রূপান্তর
      if (Array.isArray(product.Features)) {
        setFeatures(product.Features);
      } else if (typeof product.Features === 'string' && product.Features.trim()) {
        setFeatures(product.Features.split('|').map((s) => s.trim()).filter(Boolean));
      } else {
        setFeatures([]);
      }

      // বস্ত্রালয় কাপড়ের ক্ষেত্রে স্টকের প্রাথমিক থান, গজ ও গিরা বিভাজন
      const effectiveUnit = getProductDisplayUnit(product);
      const ypt = Number(product.YardsPerThan !== undefined ? product.YardsPerThan : (product.yardsPerThan !== undefined ? product.yardsPerThan : 25));
      const remTh = Number(product.RemnantThreshold !== undefined ? product.RemnantThreshold : (product.remnantThreshold !== undefined ? product.remnantThreshold : 0));
      const sStock = Number(product.StockQuantity !== undefined ? product.StockQuantity : 0);
      const bd = calculateThanBreakdown(sStock, ypt, remTh);

      setShopFullThans(String(bd.fullThans || 0));
      setShopCutGoj(String(bd.runningCutGojGira?.goj || 0));
      setShopCutGira(String(bd.runningCutGojGira?.gira || 0));
      setFabricVariantModal(null);
    }
  }, [product, isOpen]);

  // অনন্য পরিমাপক একক (Units) তালিকা বের করা
  const uniqueUnits = useMemo(() => {
    const list = new Set();
    list.add('থান');
    list.add('গজ');
    units.forEach((u) => {
      const name = (u.ShortName || u.UnitName || '').trim();
      if (name) list.add(name);
    });
    ['Pcs', 'Packet', 'Kg', 'gm', 'Ltr', 'ml', 'Box', 'Bottle', 'Dozen', 'Pair', 'Meter', 'Roll'].forEach(d => list.add(d));
    return Array.from(list);
  }, [units]);

  // অনন্য প্রধান ক্যাটাগরি তালিকা বের করা
  const uniqueCategories = useMemo(() => {
    const list = new Set();
    categories.forEach((c) => {
      if (c.CategoryName) list.add(c.CategoryName);
    });
    return Array.from(list);
  }, [categories]);

  // নির্বাচিত ক্যাটাগরির অধীনে থাকা সাব-ক্যাটাগরি তালিকা ফিল্টার করা
  const availableSubCategories = useMemo(() => {
    return categories
      .filter((c) => c.CategoryName === formData.category && c.SubCategoryName)
      .map((c) => c.SubCategoryName);
  }, [categories, formData.category]);

  // বারকোড কনফ্লিক্ট বা ডুপ্লিকেট শনাক্তকরণ (বর্তমান এডিট করা পণ্য ব্যতীত)
  const barcodeConflictProduct = useMemo(() => {
    if (!formData.barcode || !formData.barcode.trim()) return null;
    const clean = formData.barcode.trim().toLowerCase();
    return products.find(
      (p) => 
        p.ProductID !== formData.productId &&
        p.Barcode && 
        String(p.Barcode).trim().toLowerCase() === clean
    );
  }, [formData.barcode, formData.productId, products]);

  // রিয়েল-টাইম মার্জিন, ফ্লোর প্রাইস ও মুনাফা হিসাব
  const cost = parseFloat(formData.costPrice) || 0;
  const sell = parseFloat(formData.sellingPrice) || 0;
  const minSell = parseFloat(formData.minSellingPrice) || 0;
  const netProfit = sell - cost;
  const profitMarginPercent = cost > 0 
    ? ((netProfit / cost) * 100).toFixed(1) 
    : (sell > 0 ? '100' : '0');
  const isProfitable = netProfit >= 0;

  // ফ্লোর প্রাইস বিশ্লেষণ (দামাদামির সর্বনিম্ন সীমা)
  const effectiveFloorPrice = minSell > 0 ? minSell : cost;
  const minFloorProfit = effectiveFloorPrice - cost;
  const minFloorMarginPercent = cost > 0 
    ? ((minFloorProfit / cost) * 100).toFixed(1) 
    : (effectiveFloorPrice > 0 ? '100' : '0');
  const isFloorBelowCost = cost > 0 && minSell > 0 && minSell < cost;
  const isFloorAboveSell = sell > 0 && minSell > 0 && minSell > sell;

  if (!isOpen || !product) return null;

  const handleDeleteProduct = async () => {
    if (!product || !onDeleteProduct) return;
    const name = formData.productName || product.ProductName || product.ProductID;
    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে '${name}' পণ্যটি ফ্রন্টএন্ড ও ডাটাবেস (গুগল শিট) থেকে স্থায়ীভাবে মুছে ফেলতে চান?\n\nমুছে ফেলার পর এটি স্বয়ংক্রিয়ভাবে ডাটাবেসের সাথে সিঙ্ক হয়ে যাবে।`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const ok = await onDeleteProduct(product.ProductID);
      if (ok !== false) {
        onClose();
      }
    } catch (err) {
      alert(`পণ্য মুছে ফেলা ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      const subs = categories.filter((c) => c.CategoryName === value);
      setFormData((prev) => ({
        ...prev,
        category: value,
        subCategory: subs.length > 0 ? subs[0].SubCategoryName : ''
      }));
    } else if (name === 'costPrice') {
      const newCost = Number(value) || 0;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (newCost > 0 && Array.isArray(variants)) {
        setVariants((prevVars) => prevVars.map((v) => {
          if (!v.CostPrice || Number(v.CostPrice) <= 0) {
            return { ...v, CostPrice: newCost, costPrice: newCost };
          }
          return v;
        }));
      }
    } else if (name === 'stockQuantity') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (isThanUnit(formData.unit)) {
        const num = Math.max(0, parseFloat(value) || 0);
        const ypt = Math.max(0.1, parseFloat(formData.yardsPerThan) || 25);
        const remTh = formData.remnantThreshold !== '' && !isNaN(Number(formData.remnantThreshold)) ? Math.max(0, parseFloat(formData.remnantThreshold)) : 0;
        const bd = calculateThanBreakdown(num, ypt, remTh);
        setShopFullThans(String(bd.fullThans || 0));
        setShopCutGoj(String(bd.runningCutGojGira?.goj || 0));
        setShopCutGira(String(bd.runningCutGojGira?.gira || 0));
      }
    } else if (name === 'yardsPerThan') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (isThanUnit(formData.unit) && productType === 'simple') {
        const fT = Math.max(0, parseInt(shopFullThans, 10) || 0);
        const cG = Math.max(0, parseInt(shopCutGoj, 10) || 0);
        const cGi = Math.max(0, Math.min(15, parseInt(shopCutGira, 10) || 0));
        const ypt = Math.max(0.1, parseFloat(value) || 25);
        const calcYards = calculateInitialShopYards(fT, cG, cGi, ypt);
        setFormData((prev) => ({ ...prev, stockQuantity: String(calcYards) }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // নতুন ক্যাটাগরি যুক্ত
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('অনুগ্রহ করে ক্যাটাগরির নাম লিখুন।');
      return;
    }

    try {
      if (onAddCategory) {
        await onAddCategory({
          categoryName: newCategoryName.trim(),
          subCategoryName: newSubCategoryName.trim(),
          description: 'ম্যানুয়াল তৈরি'
        });
      }

      setFormData((prev) => ({
        ...prev,
        category: newCategoryName.trim(),
        subCategory: newSubCategoryName.trim()
      }));

      setNewCategoryName('');
      setNewSubCategoryName('');
      setIsAddingNewCategory(false);
    } catch (err) {
      alert(`ক্যাটাগরি যুক্ত করা যায়নি: ${err.message}`);
    }
  };

  // নতুন একক যুক্ত
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) {
      alert('অনুগ্রহ করে পরিমাপক এককের নাম লিখুন।');
      return;
    }

    try {
      const shortName = newUnitShortName.trim() || newUnitName.trim();
      if (onAddUnit) {
        await onAddUnit({
          unitName: newUnitName.trim(),
          shortName: shortName,
          description: 'নতুন পরিমাপক একক'
        });
      }

      setFormData((prev) => ({
        ...prev,
        unit: shortName
      }));

      setNewUnitName('');
      setNewUnitShortName('');
      setIsAddingNewUnit(false);
    } catch (err) {
      alert(`একক যুক্ত করা যায়নি: ${err.message}`);
    }
  };

  // ফিচার যুক্ত ও অপসারণ
  const handleAddFeature = () => {
    const trimmed = featureInput.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures([...features, trimmed]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (indexToRemove) => {
    setFeatures(features.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFeatureKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFeature();
    }
  };

  // ডিভাইস থেকে ছবি নির্বাচন ও অপটিমাইজেশন হ্যান্ডলার
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
      return;
    }

    setIsProcessingImage(true);
    try {
      const compressedDataUrl = await compressImageForUpload(file, 1200, 1200, 0.8);
      setLocalImagePreview(compressedDataUrl);
      setImageBase64(compressedDataUrl);
      setImageMimeType(file.type || 'image/jpeg');

      // যদি ছবির ক্যাপশন খালি থাকে তবে প্রাথমিক ক্যাপশন সেট করা
      if (!formData.imageCaption) {
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFormData((prev) => ({
          ...prev,
          imageCaption: `${prev.productName || baseName} image`,
        }));
      }
    } catch (err) {
      alert(`ছবি প্রস্তুত করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // স্বয়ংক্রিয় অনন্য বারকোড / SKU জেনারেটর (১০০% কনফ্লিক্ট-মুক্ত)
  const handleGenerateRandomBarcode = () => {
    const existingBarcodes = new Set(
      products
        .filter((p) => p.ProductID !== formData.productId)
        .map((p) => p.Barcode && String(p.Barcode).trim().toLowerCase())
        .filter(Boolean)
    );

    const prefix = barcodePrefix.trim() || 'PB-';
    let uniqueBarcode = '';
    let attempts = 0;

    while (attempts < 2000) {
      attempts++;
      const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
      const candidate = `${prefix}${randomSuffix}`;
      if (!existingBarcodes.has(candidate.toLowerCase())) {
        uniqueBarcode = candidate;
        break;
      }
    }

    if (uniqueBarcode) {
      setFormData((prev) => ({
        ...prev,
        barcode: uniqueBarcode
      }));
      setScannedNotification('✓ কনফ্লিক্ট-মুক্ত অনন্য বারকোড তৈরি হয়েছে!');
      setTimeout(() => setScannedNotification(''), 3000);
    }
  };

  // ক্যামেরা স্ক্যানার দিয়ে বারকোড গ্রহণ
  const handleCameraScanSuccess = (scannedCode) => {
    setFormData((prev) => ({
      ...prev,
      barcode: scannedCode
    }));
    setScannedNotification(`✓ ক্যামেরা থেকে কোড গ্রহণ: ${scannedCode}`);
    setTimeout(() => setScannedNotification(''), 3000);
  };

  // হ্যান্ডহেল্ড স্ক্যানার Enter চাপলে ফর্ম সাবমিট প্রতিরোধ
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setScannedNotification('✓ বারকোড স্ক্যানার ইনপুট গৃহীত হয়েছে!');
      setTimeout(() => setScannedNotification(''), 2500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.sellingPrice) {
      alert('পণ্যের নাম এবং বিক্রয়মূল্য দেওয়া আবশ্যক।');
      return;
    }

    const costNum = Number(formData.costPrice) || 0;
    const sellNum = Number(formData.sellingPrice) || 0;
    const minSellNum = formData.minSellingPrice !== '' ? Number(formData.minSellingPrice) : costNum;

    if (formData.minSellingPrice !== '' && minSellNum > sellNum) {
      alert(`নূন্যতম বিক্রয়মূল্য (${currencySymbol}${minSellNum}) সাধারণ বিক্রয়মূল্যের (${currencySymbol}${sellNum}) চেয়ে বেশি হতে পারে না!`);
      return;
    }

    if (formData.minSellingPrice !== '' && costNum > 0 && minSellNum < costNum) {
      const confirmLow = window.confirm(`সতর্কতা: নূন্যতম বিক্রয়মূল্য (${currencySymbol}${minSellNum}) কেনা দামের (${currencySymbol}${costNum}) চেয়ে কম! আপনি কি নিশ্চিতভাবে লোকসানে বিক্রির অনুমতি দিতে চান?`);
      if (!confirmLow) return;
    }

    if (barcodeConflictProduct) {
      alert(`সতর্কতা: এই বারকোডটি (${formData.barcode}) ইতিমধ্যে "${barcodeConflictProduct.ProductName}" পণ্যে ব্যবহৃত হয়েছে! দয়া করে অনন্য বারকোড দিন বা স্বয়ংক্রিয়ভাবে তৈরি করুন।`);
      return;
    }

    setIsSubmitting(true);
    try {
      const safeVariants = productType === 'variable'
        ? variants.map(v => {
            const g = Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0;
            const s = Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0;
            let c = Number(v.CostPrice !== undefined ? v.CostPrice : (v.costPrice !== undefined ? v.costPrice : costNum)) || 0;
            if (c <= 0 && costNum > 0) c = costNum;
            if (costNum > 0 && c > costNum * 10) c = costNum;
            let sp = Number(v.SellingPrice !== undefined ? v.SellingPrice : (v.sellingPrice !== undefined ? v.sellingPrice : sellNum)) || 0;
            if (sp <= 0 && sellNum > 0) sp = sellNum;
            let minSp = Number(v.MinSellingPrice !== undefined ? v.MinSellingPrice : (v.minSellingPrice !== undefined ? v.minSellingPrice : minSellNum)) || 0;
            if (minSp <= 0 && minSellNum > 0) minSp = minSellNum;
            return {
              ...v,
              CostPrice: c,
              costPrice: c,
              SellingPrice: sp,
              sellingPrice: sp,
              MinSellingPrice: minSp,
              minSellingPrice: minSp,
              GodownStock: g,
              godownStock: g,
              StockQuantity: s,
              stockQuantity: s,
              TotalStock: g + s
            };
          })
        : [];
      const varGodownTotal = safeVariants.reduce((sum, v) => sum + v.GodownStock, 0);
      const varShopTotal = safeVariants.reduce((sum, v) => sum + v.StockQuantity, 0);

      const effectiveGodownStock = productType === 'variable' && safeVariants.length > 0 ? varGodownTotal : (Number(formData.godownStock) || 0);
      const effectiveShopStock = productType === 'variable' && safeVariants.length > 0 ? varShopTotal : (Number(formData.stockQuantity) || 0);

      await onSubmitUpdate({
        ...formData,
        unit: formData.unit,
        Unit: formData.unit,
        productId: product.ProductID,
        costPrice: costNum,
        minSellingPrice: minSellNum,
        sellingPrice: sellNum,
        stockQuantity: effectiveShopStock,
        godownStock: effectiveGodownStock,
        totalStock: effectiveGodownStock + effectiveShopStock,
        minStockAlert: Number(formData.minStockAlert) || 5,
        yardsPerThan: Number(formData.yardsPerThan) || 25,
        YardsPerThan: Number(formData.yardsPerThan) || 25,
        remnantThreshold: formData.remnantThreshold !== '' && !isNaN(Number(formData.remnantThreshold)) ? Math.max(0, parseFloat(formData.remnantThreshold)) : 0,
        RemnantThreshold: formData.remnantThreshold !== '' && !isNaN(Number(formData.remnantThreshold)) ? Math.max(0, parseFloat(formData.remnantThreshold)) : 0,
        imageUrl: imageUploadMode === 'url' ? formData.imageUrl.trim() : (formData.imageUrl || ''),
        imageCaption: formData.imageCaption.trim(),
        imageBase64: imageUploadMode === 'upload' ? imageBase64 : '',
        imageMimeType: imageMimeType,
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        features: features,
        // Phase 6
        hasVariants: productType === 'variable',
        variants: safeVariants,
        variantsJSON: productType === 'variable' ? JSON.stringify(safeVariants) : '',
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate.trim(),
        mfgDate: mfgDate.trim(),
        isBundle: productType === 'bundle',
        bundleItems: productType === 'bundle' ? bundleItems : [],
        bundleItemsJSON: productType === 'bundle' ? JSON.stringify(bundleItems) : ''
      });

      onClose();
    } catch (err) {
      alert(`পণ্য আপডেট করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
        
        {/* মডাল হেডার (আধুনিক ডার্ক প্রিমিয়াম হেডার) */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-indigo-300 shadow-inner">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  পণ্য সম্পাদনা (Edit Product)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {product.ProductID}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">পণ্যের তথ্য, দাম, মজুত ও ভ্যারিয়েন্ট হালনাগাদ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ফর্ম কন্টেন্ট (স্ক্রোলেবল বডি + ফিক্সড ফুটার) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50/50">
          
          {/* স্ক্রোলেবল কন্টেন্ট এরিয়া */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* পণ্য ধরন নির্বাচন (সাধারণ পণ্য vs ভ্যারিয়েন্ট vs কম্বো বান্ডেল) */}
            <div className="bg-white p-1.5 rounded-2xl flex items-center space-x-2 border border-slate-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setProductType('simple')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  productType === 'simple'
                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>সাধারণ পণ্য</span>
              </button>

              <button
                type="button"
                onClick={() => setProductType('variable')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  productType === 'variable'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs shadow-indigo-500/25'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ভ্যারিয়েন্ট</span>
              </button>

              <button
                type="button"
                onClick={() => setProductType('bundle')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  productType === 'bundle'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-xs shadow-amber-500/25'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>কম্বো বান্ডেল</span>
              </button>
            </div>

            {/* মূল ২-কলাম গ্রিড (Left: Basic, Barcode, Pricing, Media | Right: Inventory, Fabric, Batch, Short Desc & Features) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* ========================================================
                  কলাম ১ (বাম পাশ): পরিচিতি, বারকোড, আর্থিক তথ্য ও ছবি
                  ======================================================== */}
              <div className="space-y-4">
                
                {/* ১. প্রাথমিক পরিচিতি ও ক্যাটাগরি কার্ড */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>প্রাথমিক পরিচিতি ও ক্যাটাগরি</span>
                  </h4>

                  {/* পণ্যের নাম */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      পণ্যের নাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="productName"
                      required
                      value={formData.productName}
                      onChange={handleChange}
                      placeholder="যেমন: রুবেল ভয়েল / সুতি কাপড়"
                      className="w-full px-3.5 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  {/* ক্যাটাগরি ও সাব-ক্যাটাগরি গ্রিড */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">ক্যাটাগরি</label>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                          className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3 mr-0.5" />
                          {isAddingNewCategory ? 'বাতিল' : '+ নতুন'}
                        </button>
                      </div>

                      {!isAddingNewCategory ? (
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white text-slate-800 font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          {uniqueCategories.map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                          ))}
                          {uniqueCategories.length === 0 && <option value="General">General</option>}
                        </select>
                      ) : (
                        <div className="space-y-1.5 p-2 bg-indigo-50/70 rounded-xl border border-indigo-200/80">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="প্রধান ক্যাটাগরির নাম"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                          <input
                            type="text"
                            value={newSubCategoryName}
                            onChange={(e) => setNewSubCategoryName(e.target.value)}
                            placeholder="সাব-ক্যাটাগরি (ঐচ্ছিক)"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            className="w-full py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            যুক্ত করুন
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        সাব-ক্যাটাগরি (ঐচ্ছিক)
                      </label>
                      {availableSubCategories.length > 0 ? (
                        <select
                          name="subCategory"
                          value={formData.subCategory}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white text-slate-800 font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">-- সাব-ক্যাটাগরি নির্বাচন --</option>
                          {availableSubCategories.map((sub, idx) => (
                            <option key={idx} value={sub}>{sub}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="subCategory"
                          value={formData.subCategory}
                          onChange={handleChange}
                          placeholder="যেমন: চিনিগুঁড়া বা সাধারণ"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white text-slate-800 font-medium transition-all shadow-2xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ২. আধুনিক কমপ্যাক্ট বারকোড / SKU প্যানেল */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                      <Barcode className="w-4 h-4 text-indigo-600" />
                      <span>বারকোড / SKU কোড</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateRandomBarcode}
                        className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                        title="কনফ্লিক্ট-মুক্ত কোড তৈরি করুন"
                      >
                        <Wand2 className="w-3 h-3 text-indigo-600" />
                        <span>অটো কোড</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCameraScannerOpen(true)}
                        className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                        title="ক্যামেরা দিয়ে স্ক্যান করুন"
                      >
                        <Camera className="w-3 h-3 text-emerald-600" />
                        <span>ক্যামেরা</span>
                      </button>

                      {formData.barcode && (
                        <button
                          type="button"
                          onClick={() => setIsStickerModalOpen(true)}
                          className="text-[10.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                          title="বারকোড স্টিকার প্রিন্ট করুন"
                        >
                          <Printer className="w-3 h-3" />
                          <span>স্টিকার</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ইনপুট গ্রুপ: বামে প্রিফিক্স পিল, মাঝে বারকোড ইনপুট, ডানে ক্লিয়ার বাটন */}
                  <div className="flex items-stretch rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 bg-white overflow-hidden shadow-2xs transition-all">
                    <div className="bg-slate-100/80 border-r border-slate-200 px-2.5 flex items-center space-x-1 shrink-0">
                      <span className="text-[10px] font-bold text-slate-500">প্রিফিক্স:</span>
                      <input
                        type="text"
                        value={barcodePrefix}
                        onChange={(e) => setBarcodePrefix(e.target.value)}
                        placeholder="PB-"
                        className="w-10 font-mono font-black text-indigo-700 uppercase bg-transparent focus:outline-none text-xs"
                      />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder="বারকোড স্ক্যান করুন বা লিখুন..."
                        className={`w-full pl-3 pr-8 py-2 text-xs font-mono font-bold focus:outline-none bg-white transition-all ${
                          barcodeConflictProduct
                            ? 'text-rose-900 bg-rose-50/30'
                            : 'text-slate-800'
                        }`}
                      />
                      {formData.barcode && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, barcode: '' }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {scannedNotification && (
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{scannedNotification}</span>
                    </div>
                  )}

                  {barcodeConflictProduct && (
                    <div className="text-[11px] font-bold text-rose-700 flex items-center space-x-1.5 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>সতর্কতা: এই বারকোডটি "{barcodeConflictProduct.ProductName}" পণ্যে ব্যবহৃত হয়েছে!</span>
                    </div>
                  )}
                </div>

                {/* ৩. আর্থিক তথ্য ও বিক্রয়মূল্য নির্ধারণ কার্ড */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>আর্থিক তথ্য ও বিক্রয়মূল্য নির্ধারণ</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* কেনা দাম */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        কেনা দাম / Cost
                      </label>
                      <div className="relative">
                        {canViewCostPrice(activeUser) ? (
                          <>
                            <input
                              type="number"
                              name="costPrice"
                              step="any"
                              min="0"
                              value={formData.costPrice}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{currencySymbol}</span>
                          </>
                        ) : (
                          <div className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-between">
                            <span>🔒 সুরক্ষিত</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ফ্লোর প্রাইস */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-amber-950">
                          ফ্লোর প্রাইস
                        </label>
                        <span className="text-[9.5px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                          নূন্যতম দর
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          name="minSellingPrice"
                          step="any"
                          min="0"
                          value={formData.minSellingPrice}
                          onChange={handleChange}
                          placeholder={formData.costPrice ? `${formData.costPrice}` : "0.00"}
                          className={`w-full pl-7 pr-3 py-2 text-xs font-mono font-black text-amber-950 border rounded-xl focus:ring-2 focus:outline-none bg-amber-50/60 transition-all shadow-2xs ${
                            isFloorBelowCost 
                              ? 'border-rose-400 focus:ring-rose-500' 
                              : isFloorAboveSell 
                                ? 'border-rose-400 focus:ring-rose-500' 
                                : 'border-amber-300 focus:ring-amber-500'
                          }`}
                          title="কাস্টমার দামাদামি করলেও এর নিচে বিক্রি করা যাবে না"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-bold">{currencySymbol}</span>
                      </div>
                    </div>

                    {/* বিক্রয়মূল্য */}
                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1">
                        বিক্রয়মূল্য / Selling <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="sellingPrice"
                          step="any"
                          min="0"
                          required
                          value={formData.sellingPrice}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 text-xs font-mono font-black text-indigo-950 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-indigo-50/30 hover:bg-white transition-all shadow-2xs"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-indigo-600 font-bold">{currencySymbol}</span>
                      </div>
                    </div>
                  </div>

                  {/* সতর্কবার্তা যদি ফ্লোর প্রাইস কেনা দামের নিচে বা বিক্রয়মূল্যের উপরে যায় */}
                  {isFloorBelowCost && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>সতর্কতা: নূন্যতম বিক্রয়মূল্য ({currencySymbol}{minSell}) কেনা দামের চেয়ে কম (লোকসান হতে পারে)।</span>
                    </div>
                  )}
                  {isFloorAboveSell && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>ত্রুটি: নূন্যতম বিক্রয়মূল্য সাধারণ বিক্রয়মূল্যের চেয়ে বেশি হতে পারে না।</span>
                    </div>
                  )}

                  {/* লাইভ লাভ ও মার্জিন প্রিভিউ বার */}
                  {(cost > 0 || sell > 0 || minSell > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold font-mono border shadow-2xs ${
                        isProfitable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                          : 'bg-rose-50 text-rose-800 border-rose-200/80'
                      }`}>
                        স্বাভাবিক লাভ: {currencySymbol}{netProfit.toFixed(2)} ({isProfitable ? `+${profitMarginPercent}%` : `${profitMarginPercent}%`})
                      </span>
                      {minSell > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs">
                          ফ্লোর দর লাভ: {currencySymbol}{minFloorProfit.toFixed(2)} ({minFloorProfit >= 0 ? `+${minFloorMarginPercent}%` : `${minFloorMarginPercent}%`})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ৪. পণ্যের প্রধান ছবি ও মিডিয়া */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span>পণ্যের প্রধান ছবি</span>
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('upload')}
                        className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all cursor-pointer ${
                          imageUploadMode === 'upload' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>ডিভাইস আপলোড</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('url')}
                        className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-all cursor-pointer ${
                          imageUploadMode === 'url' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        <span>ইমেজ URL</span>
                      </button>
                    </div>
                  </div>

                  {/* অপশন ১: ডিভাইস থেকে আপলোড */}
                  {imageUploadMode === 'upload' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        id="edit-product-image-upload"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {isProcessingImage ? (
                        <div className="p-4 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center space-x-2 bg-indigo-50/50 text-indigo-600 text-xs font-medium">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>ছবি প্রস্তুত করা হচ্ছে...</span>
                        </div>
                      ) : localImagePreview ? (
                        <div className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200">
                          <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 shadow-2xs">
                            <img
                              src={localImagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              নতুন ছবি প্রস্তুত হয়েছে
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              গুগল ড্রাইভ 'products image' ফোল্ডারে সেভ হবে
                            </span>
                            <label
                              htmlFor="edit-product-image-upload"
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline inline-block mt-0.5"
                            >
                              ছবি পরিবর্তন করুন
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalImagePreview('');
                              setImageBase64('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="নতুন ছবি বাদ দিন"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : formData.imageUrl ? (
                        <div className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200">
                          <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 shadow-2xs">
                            <img
                              src={formData.imageUrl}
                              alt="Current"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Error'; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              বর্তমান সংরক্ষিত ছবি রয়েছে
                            </span>
                            <label
                              htmlFor="edit-product-image-upload"
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline inline-block mt-0.5"
                            >
                              নতুন ছবি আপলোড করে পরিবর্তন করুন
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="edit-product-image-upload"
                          className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 flex items-center justify-center space-x-2 bg-slate-50/50 hover:bg-indigo-50/20 cursor-pointer transition-all text-center"
                        >
                          <Upload className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-700">
                            কম্পিউটার বা মোবাইল থেকে ছবি নির্বাচন করুন
                          </span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* অপশন ২: অনলাইন ইমেজ লিংক */}
                  {imageUploadMode === 'url' && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        name="imageUrl"
                        placeholder="https://example.com/product-image.jpg"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                      />
                      {formData.imageUrl ? (
                        <div className="w-9 h-9 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Error'; }}
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl border border-dashed border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ছবির ক্যাপশন (SEO অপটিমাইজেশন ফিল্ড) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>ছবির ক্যাপশন / Alt Text (SEO)</span>
                      <span className="text-[10px] text-slate-400 font-normal">সার্চ অপটিমাইজেশন</span>
                    </label>
                    <input
                      type="text"
                      name="imageCaption"
                      placeholder="যেমন: প্রিমিয়াম ভয়েল কাপড় ফ্রন্ট ভিউ"
                      value={formData.imageCaption}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>

              </div>

              {/* ========================================================
                  কলাম ২ (ডান পাশ): মজুত, একক, কাপড় সেটিংস, ব্যাচ ও ফিচার
                  ======================================================== */}
              <div className="space-y-4">
                
                {/* ১. বর্তমান মজুত ও পরিমাপক একক কার্ড */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>বর্তমান মজুত ও পরিমাপক একক</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* দোকান স্টক */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🏬 দোকান স্টক {productType === 'variable' && '(ভ্যারিয়েন্টের মোট)'}</span>
                      </label>
                      <input
                        type="number"
                        name="stockQuantity"
                        step="any"
                        min="0"
                        disabled={productType === 'variable'}
                        value={productType === 'variable' ? variants.reduce((s, v) => s + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0) : formData.stockQuantity}
                        onChange={handleChange}
                        placeholder="0"
                        className={`w-full px-3.5 py-2 text-xs font-mono font-bold border rounded-xl focus:outline-none transition-all shadow-2xs ${
                          productType === 'variable'
                            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                            : 'text-slate-900 border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                        }`}
                      />
                      {isThanUnit(formData.unit) && (
                        <span className="text-[10.5px] text-emerald-700 font-bold block mt-1">
                          {productType === 'variable' ? 'নিচের ভ্যারিয়েন্ট টেবিল থেকে নির্ধারিত' : `= ${formData.stockQuantity} গজ`}
                        </span>
                      )}
                    </div>

                    {/* গোডাউন স্টক */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                        <span>🏭 গোডাউন স্টক {productType === 'variable' && '(ভ্যারিয়েন্টের মোট)'}</span>
                      </label>
                      <input
                        type="number"
                        name="godownStock"
                        step="any"
                        min="0"
                        disabled={productType === 'variable'}
                        value={productType === 'variable' ? variants.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0) : (formData.godownStock !== undefined ? formData.godownStock : '0')}
                        onChange={handleChange}
                        placeholder="0"
                        className={`w-full px-3.5 py-2 text-xs font-mono font-bold border rounded-xl focus:outline-none transition-all shadow-2xs ${
                          productType === 'variable'
                            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                            : 'text-slate-900 border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                        }`}
                      />
                      {isThanUnit(formData.unit) && (
                        <span className="text-[10.5px] text-indigo-700 font-bold block mt-1">
                          {productType === 'variable' 
                            ? `= ${(variants.reduce((s, v) => s + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0) * (Number(formData.yardsPerThan) || 25)).toLocaleString('bn-BD')} গজ`
                            : `= ${((Number(formData.godownStock) || 0) * (Number(formData.yardsPerThan) || 25)).toLocaleString('bn-BD')} গজ`}
                        </span>
                      )}
                    </div>

                    {/* সতর্কতা সীমা */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        সতর্কবার্তা সীমা (Min Stock)
                      </label>
                      <input
                        type="number"
                        name="minStockAlert"
                        min="0"
                        value={formData.minStockAlert}
                        onChange={handleChange}
                        placeholder="5"
                        className="w-full px-3.5 py-2 text-xs font-mono font-semibold text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                      />
                    </div>

                    {/* পরিমাপক একক */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">পরিমাপক একক</label>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewUnit(!isAddingNewUnit)}
                          className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3 mr-0.5" />
                          {isAddingNewUnit ? 'বাতিল' : '+ নতুন'}
                        </button>
                      </div>

                      {!isAddingNewUnit ? (
                        <select
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white text-slate-800 font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          {uniqueUnits.map((u, idx) => (
                            <option key={idx} value={u}>{u}</option>
                          ))}
                          {formData.unit && !uniqueUnits.includes(formData.unit) && (
                            <option value={formData.unit}>{formData.unit}</option>
                          )}
                        </select>
                      ) : (
                        <div className="space-y-1.5 p-2 bg-indigo-50/70 rounded-xl border border-indigo-200/80">
                          <input
                            type="text"
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            placeholder="একক (যেমন: বস্তা, ডজন)"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                          <input
                            type="text"
                            value={newUnitShortName}
                            onChange={(e) => setNewUnitShortName(e.target.value)}
                            placeholder="সংক্ষিপ্ত রূপ (যেমন: Bosta)"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleCreateUnit}
                            className="w-full py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            যুক্ত করুন
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ২. বস্ত্রালয় থান ও গজ কাপড় সেটিংস (Conditional) */}
                {(isThanUnit(formData.unit) || isFabricUnit(formData.unit)) && (
                  <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/60">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-700">
                          <Scissors className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-950">থান, গজ ও শেষ ছাঁট সেটিংস (বস্ত্রালয়)</h4>
                          <p className="text-[10px] text-amber-800">প্রতি থানের দৈর্ঘ্য ও শেষ ছাঁট সতর্কতার সীমানা নির্ধারণ</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                        টেক্সটাইল
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 mb-1">
                          📏 প্রতি থানে কত গজ?
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          name="yardsPerThan"
                          value={formData.yardsPerThan}
                          onChange={handleChange}
                          placeholder="যেমন: ২৫"
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                        />
                        <span className="text-[10px] text-amber-700">১ থানে মোট গজের পরিমাণ</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                          <span>✂️ থানের শেষ ছাঁট সীমা (গজ)</span>
                          <span className="text-[9px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.2 rounded">অটো-অ্যালার্ট</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="remnantThreshold"
                          value={formData.remnantThreshold}
                          onChange={handleChange}
                          placeholder="যেমন: ২ বা ০"
                          className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-black text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                        />
                        <span className="text-[10px] text-amber-700">এর নিচে নামলে ছাঁট খাতা ও নতুন থান চালানের অ্যালার্ট</span>
                      </div>
                    </div>

                    {/* সিম্পল থান কাপড়ের ক্ষেত্রে দোকানে আস্ত থান ও খোলা গজের ক্যালকুলেটর ইনপুট */}
                    {productType === 'simple' && isThanUnit(formData.unit) && (
                      <div className="p-3 bg-white/95 rounded-xl border border-amber-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                            <Store className="w-3.5 h-3.5 text-amber-600" />
                            <span>দোকানের প্রাথমিক কাপড় স্টক বিভাজন (থান + খোলা গজ):</span>
                          </span>
                          <span className="text-[10px] text-amber-800 font-semibold">
                            স্বয়ংক্রিয়ভাবে মোট গজে রূপান্তর হবে
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                              📦 আস্ত থান সংখ্যা
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={shopFullThans}
                              onChange={(e) => handleFabricShopStockChange('fullThans', e.target.value)}
                              placeholder="০"
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                              ✂️ খোলা থানের গজ
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={shopCutGoj}
                              onChange={(e) => handleFabricShopStockChange('cutGoj', e.target.value)}
                              placeholder="০"
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                              ✂️ গিরা (০-১৫)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="15"
                              step="1"
                              value={shopCutGira}
                              onChange={(e) => handleFabricShopStockChange('cutGira', e.target.value)}
                              placeholder="০"
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* বর্তমান স্টকের লাইভ অ্যানালাইসিস */}
                    {(() => {
                      const isVariable = productType === 'variable';
                      const sStock = isVariable
                        ? variants.reduce((sum, v) => sum + (Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0), 0)
                        : (Number(formData.stockQuantity) || 0);
                      const gStock = isVariable
                        ? variants.reduce((sum, v) => sum + (Number(v.GodownStock !== undefined ? v.GodownStock : v.godownStock) || 0), 0)
                        : (Number(formData.godownStock) || 0);
                      const ypt = Number(formData.yardsPerThan) || 25;
                      const remTh = formData.remnantThreshold !== '' && !isNaN(Number(formData.remnantThreshold)) ? Math.max(0, parseFloat(formData.remnantThreshold)) : 0;
                      
                      const varFullThans = isVariable
                        ? variants.reduce((sum, v) => {
                            const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0;
                            return sum + (calculateThanBreakdown(vS, ypt, remTh).fullThans || 0);
                          }, 0)
                        : 0;
                      const varCutYards = isVariable
                        ? variants.reduce((sum, v) => {
                            const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0;
                            return sum + (calculateThanBreakdown(vS, ypt, remTh).runningCutYards || 0);
                          }, 0)
                        : 0;

                      const breakdown = isVariable
                        ? {
                            displayText: varFullThans > 0 && varCutYards > 0
                              ? `${varFullThans}টি আস্ত থান + ${formatFabricQuantity(varCutYards, 'গজ', false)} খোলা`
                              : varFullThans > 0
                              ? `${varFullThans}টি আস্ত থান`
                              : varCutYards > 0
                              ? `${formatFabricQuantity(varCutYards, 'গজ', false)} খোলা`
                              : '০ গজ (মজুত শেষ)',
                            isRemnant: variants.some(v => {
                              const vS = Number(v.StockQuantity !== undefined ? v.StockQuantity : v.stockQuantity) || 0;
                              return calculateThanBreakdown(vS, ypt, remTh).isRemnant;
                            })
                          }
                        : calculateThanBreakdown(sStock, ypt, remTh);

                      const totalCombinedYards = (gStock * ypt) + sStock;

                      return (
                        <div className="bg-white/90 p-3 rounded-xl border border-amber-300/80 text-xs text-amber-950 space-y-2 shadow-2xs">
                          <div className="font-bold flex items-center justify-between">
                            <span>🏬 দোকানে বর্তমান ফ্লোর মজুত:</span>
                            <strong className="text-emerald-700 font-mono font-black">{sStock.toLocaleString('bn-BD')} গজ</strong>
                          </div>
                          <div className="text-[11px] text-slate-700 flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                              {breakdown.displayText}
                            </span>
                            {breakdown.isRemnant && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold border border-rose-200">
                                ⚠️ রানিং থানটি ছাঁট সীমায় নেমে এসেছে!
                              </span>
                            )}
                          </div>
                          <div className="pt-1.5 border-t border-amber-200/60 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-1">
                            <span>🏭 গোডাউনে আছে: <strong className="text-indigo-900 font-bold">{gStock} থান</strong> (= {(gStock * ypt).toLocaleString('bn-BD')} গজ)</span>
                            <span>🌐 সর্বমোট কাপড়: <strong className="text-slate-900 font-mono font-bold">{totalCombinedYards.toLocaleString('bn-BD')} গজ</strong></span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ৩. ব্যাচ নম্বর ও মেয়াদ ট্র্যাকিং কার্ড */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <CalendarClock className="w-4 h-4 text-rose-600" />
                      <span>ব্যাচ নম্বর ও মেয়াদ ট্র্যাকিং (অপশনাল)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      অটো মেয়াদ সতর্কতা
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ব্যাচ নম্বর (Batch No.)
                      </label>
                      <input
                        type="text"
                        placeholder="BATCH-2026-A1"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        উৎপাদন (Mfg Date)
                      </label>
                      <input
                        type="date"
                        value={mfgDate}
                        onChange={(e) => setMfgDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        মেয়াদ (Expiry Date)
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* ৪. সংক্ষিপ্ত বিবরণ ও প্রধান বৈশিষ্ট্য কার্ড */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>সংক্ষিপ্ত বিবরণ ও বৈশিষ্ট্যসমূহ</span>
                  </h4>

                  {/* সংক্ষিপ্ত বিবরণ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      সংক্ষিপ্ত বিবরণ (Short Description)
                    </label>
                    <textarea
                      name="shortDescription"
                      rows={2}
                      value={formData.shortDescription}
                      onChange={handleChange}
                      placeholder="এক বা দুই লাইনে পণ্যের পরিচিতি..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  {/* প্রধান বৈশিষ্ট্যসমূহ */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <ListPlus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>প্রধান বৈশিষ্ট্যসমূহ (Features)</span>
                    </label>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyDown={handleFeatureKeyDown}
                        placeholder="বৈশিষ্ট্য লিখে Enter বা 'যোগ' চাপুন..."
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddFeature}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer"
                      >
                        যোগ
                      </button>
                    </div>

                    {/* ফিচার ব্যাজ তালিকা */}
                    {features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {features.map((feat, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80 shadow-2xs"
                          >
                            <Check className="w-3 h-3 text-emerald-600 mr-1" />
                            <span>{feat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(idx)}
                              className="ml-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="মুছুন"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* ========================================================
                ফুল-উইডথ সেকশন: ভ্যারিয়েন্ট কনফিগারেশন (Variable Product)
                ======================================================== */}
            {productType === 'variable' && (
              <div className="bg-indigo-50/40 border border-indigo-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-200/70">
                  <span className="text-xs font-black text-indigo-950 flex items-center space-x-2 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>ভ্যারিয়েন্ট ম্যানেজার (সাইজ, রঙ, ওজন)</span>
                  </span>
                  <span className="text-[11px] text-indigo-700 bg-indigo-100 px-3 py-0.5 rounded-full font-black border border-indigo-200">
                    {variants.length}টি ভ্যারিয়েন্ট সক্রিয়
                  </span>
                </div>

                {/* স্বয়ংক্রিয় ভ্যারিয়েন্ট জেনারেটর ফর্ম */}
                <div className="p-4 bg-white rounded-2xl border border-indigo-100 space-y-2.5 shadow-2xs">
                  <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    অটো জেনারেটর (কমা দিয়ে একাধিক মান লিখুন):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="সাইজ / ওজন (যেমন: S, M, L, XL অথবা 500g, 1kg)"
                      value={attributeSizes}
                      onChange={(e) => setAttributeSizes(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="রঙ / কালার (যেমন: Black, Navy, White)"
                      value={attributeColors}
                      onChange={(e) => setAttributeColors(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAutoGenerateVariants}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>স্বয়ংক্রিয় তৈরি করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualVariant}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      + ম্যানুয়াল রো যোগ
                    </button>
                  </div>
                </div>

                {/* দ্রুত কালার ভ্যারিয়েন্ট যোগ */}
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-950 flex items-center space-x-1.5 uppercase tracking-wider">
                      <Palette className="w-3.5 h-3.5 text-amber-600" />
                      <span>দ্রুত কালার / রঙ ভ্যারিয়েন্ট যোগ:</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="রঙের নাম (যেমন: ফিরোজা, জলপাই, ম্যাজেন্টা)"
                      value={quickColorInput}
                      onChange={(e) => setQuickColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuickColor();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <div className="flex items-center space-x-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="গোডাউন"
                        value={quickColorThans}
                        onChange={(e) => setQuickColorThans(e.target.value)}
                        className="w-18 px-2 py-2 bg-white border border-amber-200 rounded-xl text-xs font-black text-center text-amber-950 focus:outline-none"
                      />
                      <span className="text-[11px] font-bold text-amber-900">থান/পিস</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddQuickColor()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ কালার যোগ</span>
                    </button>
                  </div>
                  {/* জনপ্রিয় কালার চিপস */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold text-amber-800 shrink-0">জনপ্রিয় কালার:</span>
                    {['লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'গোলাপি', 'মেরুন', 'নেভি ব্লু', 'অফ-হোয়াইট', 'ছাই', 'বেগুনি', 'ফিরোজা', 'জলপাই'].map((c) => {
                      const hex = getColorHex(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleAddQuickColor(c, quickColorThans || 1)}
                          className="px-2.5 py-1 text-[10.5px] font-bold bg-white hover:bg-amber-100 text-amber-950 border border-amber-200/90 rounded-lg transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
                        >
                          {hex && (
                            <span
                              className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: hex }}
                            />
                          )}
                          <span>+ {c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ভ্যারিয়েন্ট তালিকা টেবিল (প্রশান্ত ও সুন্দর টেবিল) */}
                {variants.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px]">
                        <tr>
                          <th className="py-3 px-4 min-w-36">বৈশিষ্ট্য / রঙ</th>
                          <th className="py-3 px-3 min-w-32">বারকোড</th>
                          <th className="py-3 px-3 w-24">কেনা</th>
                          <th className="py-3 px-3 w-24">বিক্রি</th>
                          <th className="py-3 px-3 min-w-28 text-indigo-900 bg-indigo-50/50">
                            {isThanUnit(formData.unit) ? '🏭 গোডাউন (থান)' : '🏭 গোডাউন'}
                          </th>
                          <th className="py-3 px-3 min-w-44 text-emerald-900 bg-emerald-50/40">
                            {isThanUnit(formData.unit) ? '🏬 দোকান স্টক' : '🏬 দোকান'}
                          </th>
                          <th className="py-3 px-3 pr-4 text-center w-14">মুছুন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {variants.map((v, idx) => {
                          const isThan = isThanUnit(formData.unit);
                          const ypt = Number(formData.yardsPerThan) || 25;
                          const remTh = formData.remnantThreshold !== '' && !isNaN(Number(formData.remnantThreshold)) ? Math.max(0, parseFloat(formData.remnantThreshold)) : 0;
                          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0));
                          const vSStock = Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0));
                          const vBd = isThan ? calculateThanBreakdown(vSStock, ypt, remTh) : null;
                          const vColor = v.Attributes?.Color || v.Color || '';
                          const hexColor = getColorHex(vColor);

                          return (
                            <tr key={v.VariantID || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center space-x-1.5">
                                  {hexColor && (
                                    <span
                                      className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-2xs"
                                      style={{ backgroundColor: hexColor }}
                                      title={vColor}
                                    />
                                  )}
                                  <span className="font-bold text-slate-800">
                                    {v.Attributes ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ') : (v.Color || v.VariantID)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={v.Barcode || ''}
                                  onChange={(e) => handleUpdateVariantField(idx, 'Barcode', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono focus:bg-white focus:outline-none"
                                  placeholder="বারকোড"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  value={v.CostPrice}
                                  onChange={(e) => handleUpdateVariantField(idx, 'CostPrice', Number(e.target.value) || 0)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold focus:bg-white focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  value={v.SellingPrice}
                                  onChange={(e) => handleUpdateVariantField(idx, 'SellingPrice', Number(e.target.value) || 0)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700 focus:bg-white focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 px-3 bg-indigo-50/20">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={vGStock}
                                  onChange={(e) => handleUpdateVariantField(idx, 'GodownStock', Number(e.target.value) || 0)}
                                  className="w-full px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-[11px] font-black text-indigo-950 focus:bg-white focus:outline-none"
                                  title="গোডাউন স্টক"
                                />
                                {isThan && (
                                  <span className="text-[10px] text-indigo-700 font-bold block mt-0.5 whitespace-nowrap">
                                    = {(vGStock * ypt).toLocaleString('bn-BD')} গজ
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 bg-emerald-50/20">
                                {isThan ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={vSStock}
                                        onChange={(e) => handleUpdateVariantField(idx, 'StockQuantity', Number(e.target.value) || 0)}
                                        className="w-18 px-2 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px] font-black text-emerald-800 focus:bg-white focus:outline-none"
                                        title="দোকান স্টক (মোট গজ)"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleOpenFabricVariantModal(idx, v)}
                                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10.5px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs whitespace-nowrap"
                                        title="থান ও গজ ক্যালকুলেটরে হিসাব করুন"
                                      >
                                        <Scissors className="w-3 h-3 text-white" />
                                        <span>থান হিসাব</span>
                                      </button>
                                    </div>
                                    {/* লাইভ ব্রেকডাউন */}
                                    <div className="text-[10px] text-slate-600 font-semibold">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block whitespace-nowrap">
                                        {vBd.fullThans > 0 ? `${vBd.fullThans} থান` : '০ থান'}
                                        {vBd.runningCutYards > 0 ? ` + ${vBd.runningCutText || `${vBd.runningCutYards} গজ`}` : ''}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={vSStock}
                                    onChange={(e) => handleUpdateVariantField(idx, 'StockQuantity', Number(e.target.value) || 0)}
                                    className="w-full px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px] font-black text-emerald-800 focus:bg-white focus:outline-none"
                                    title="দোকান স্টক"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-3 pr-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="মুছুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                ফুল-উইডথ সেকশন: কম্বো বান্ডেল কনফিগারেশন (Bundle Package)
                ======================================================== */}
            {productType === 'bundle' && (
              <div className="bg-amber-50/50 border border-amber-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/70">
                  <span className="text-xs font-black text-amber-950 flex items-center space-x-2 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>কম্বো বান্ডেল আইটেম নির্বাচন</span>
                  </span>
                  <span className="text-[11px] text-amber-800 bg-amber-100/80 px-3 py-0.5 rounded-full font-black border border-amber-200">
                    {bundleItems.length}টি সাব-আইটেম
                  </span>
                </div>

                {/* সাব-আইটেম অ্যাড ড্রপডাউন */}
                <div className="p-4 bg-white rounded-2xl border border-amber-100 space-y-2.5 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <select
                        value={selectedBundleProduct}
                        onChange={(e) => setSelectedBundleProduct(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="">-- অন্তর্ভুক্ত পণ্য বাছাই করুন --</option>
                        {products.map((p) => (
                          <option key={p.ProductID} value={p.ProductID}>
                            {p.ProductName} ({currencySymbol}{p.SellingPrice} • স্টক: {p.StockQuantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={bundleItemQty}
                        onChange={(e) => setBundleItemQty(e.target.value)}
                        placeholder="পরিমাণ"
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                        title="কতটি অন্তর্ভুক্ত থাকবে"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddBundleItem}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>+ যোগ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* বান্ডেল তালিকা */}
                {bundleItems.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                    {bundleItems.map((bi) => (
                      <div key={bi.ProductID} className="p-3 px-4 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{bi.ProductName}</span>
                          <span className="text-[11px] text-slate-500 ml-2">x {bi.Quantity} পিস</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-amber-700 font-mono">
                            {currencySymbol}{(bi.SellingPrice * bi.Quantity).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBundleItem(bi.ProductID)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                ফুল-উইডথ সেকশন: বিস্তারিত বিবরণ (Rich Text Editor)
                ======================================================== */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                <AlignLeft className="w-4 h-4 text-indigo-600" />
                <span>বিস্তারিত বিবরণ (Description) - রিচ টেক্সট ও ফরম্যাটিং</span>
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(newHtml) => setFormData((prev) => ({ ...prev, description: newHtml }))}
                placeholder="পণ্যের পূর্ণ বিবরণ, ব্যবহারবিধি লিখুন বা ছবি যুক্ত করুন..."
              />
            </div>

          </div>

          {/* ========================================================
              স্টিকি মডাল ফুটার (Sticky Action Bar at Bottom)
              ======================================================== */}
          <div className="px-6 py-3.5 bg-white border-t border-slate-200/90 flex items-center justify-between shrink-0 shadow-xs">
            {onDeleteProduct ? (
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="পণ্যটি সম্পূর্ণ মুছে ফেলুন (Delete)"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'পণ্যটি মুছে ফেলুন'}</span>
              </button>
            ) : <div />}
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-500/25 transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isSubmitting ? 'আপডেট হচ্ছে...' : 'হালনাগাদ সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>


      {/* মোবাইল/ওয়েবক্যাম ক্যামেরা বারকোড স্ক্যানার মডাল */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleCameraScanSuccess}
        title="পণ্যের বারকোড স্ক্যানার"
      />

      {/* বারকোড স্টিকার প্রিন্ট ও প্রিভিউ মডাল */}
      {isStickerModalOpen && (
        <BarcodeStickerModal
          isOpen={isStickerModalOpen}
          onClose={() => setIsStickerModalOpen(false)}
          product={{
            ProductName: formData.productName || product?.ProductName || 'পণ্য',
            Barcode: formData.barcode,
            SellingPrice: Number(formData.sellingPrice) || Number(product?.SellingPrice) || 0,
            Unit: formData.unit || product?.Unit,
            StockQuantity: Number(formData.stockQuantity) || Number(product?.StockQuantity) || 10
          }}
          initialQuantity={Number(formData.stockQuantity) || 10}
          currencySymbol={currencySymbol}
          storeName={settings?.StoreName || 'Pabna Bostraloy'}
        />
      )}

      {/* বস্ত্রালয় ভ্যারিয়েন্ট থান ও গজ ক্যালকুলেটর পপআপ মডাল */}
      {fabricVariantModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Scissors className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950">ভ্যারিয়েন্ট থান ও গজ ক্যালকুলেটর</h4>
                  <p className="text-xs text-amber-800 font-semibold">{fabricVariantModal.variantName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFabricVariantModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 font-medium">
              📏 প্রতি থানে <strong>{formData.yardsPerThan || 25} গজ</strong> ধরে মোট গজে রূপান্তর হবে।
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  📦 আস্ত থান
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={fabricVariantModal.fullThans}
                  onChange={(e) => setFabricVariantModal(prev => ({ ...prev, fullThans: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="০"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ✂️ খোলা গজ
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={fabricVariantModal.cutGoj}
                  onChange={(e) => setFabricVariantModal(prev => ({ ...prev, cutGoj: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="০"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ✂️ গিরা (০-১৫)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="1"
                  value={fabricVariantModal.cutGira}
                  onChange={(e) => setFabricVariantModal(prev => ({ ...prev, cutGira: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="০"
                />
              </div>
            </div>

            {/* লাইভ ফলাফল প্রদর্শন */}
            {(() => {
              const fT = Math.max(0, parseInt(fabricVariantModal.fullThans, 10) || 0);
              const cG = Math.max(0, parseInt(fabricVariantModal.cutGoj, 10) || 0);
              const cGi = Math.max(0, Math.min(15, parseInt(fabricVariantModal.cutGira, 10) || 0));
              const ypt = Math.max(0.1, parseFloat(formData.yardsPerThan) || 25);
              const calcYards = calculateInitialShopYards(fT, cG, cGi, ypt);
              return (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-800 block">দোকানে মোট প্রস্তুতকৃত স্টক:</span>
                  <div className="text-base font-black text-emerald-700 font-mono">
                    {calcYards.toLocaleString('bn-BD')} গজ
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    ({fT > 0 ? `${fT}টি আস্ত থান` : '০টি আস্ত থান'} {cG > 0 || cGi > 0 ? `+ ${cG} গজ ${cGi} গিরা` : ''})
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFabricVariantModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleApplyFabricVariantModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors shadow-xs flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>✓ প্রয়োগ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

