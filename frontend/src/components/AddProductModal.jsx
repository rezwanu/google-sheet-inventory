import React, { useState, useMemo } from 'react';
import {
  X,
  PackagePlus,
  Barcode,
  Layers,
  Image as ImageIcon,
  PlusCircle,
  Tag,
  Check,
  FileText,
  AlignLeft,
  ListPlus,
  Upload,
  Globe,
  Loader2,
  Sparkles,
  Wand2,
  TrendingUp,
  Box,
  AlertCircle,
  Eye,
  CheckCircle2,
  Coins,
  UploadCloud,
  ShieldCheck,
  Trash2,
  Camera,
  Printer,
  CalendarClock,
  Palette,
  Plus
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeStickerModal from './BarcodeStickerModal';

// ছবি কম্প্রেস ও অপটিমাইজ ফাংশন (যাতে দ্রুত গুগল ড্রাইভে আপলোড হয়)
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

// দ্রুত বৈশিষ্ট্য (Quick Feature Presets)
const QUICK_FEATURE_PRESETS = [
  '১০০% খাঁটি ও আসল',
  'প্রিমিয়াম কোয়ালিটি',
  'দ্রুত ডেলিভারি',
  'অর্গানিক ও ফ্রেশ',
  'এক্সক্লুসিভ প্যাক',
  'কেমিক্যাল মুক্ত'
];

export default function AddProductModal({
  isOpen,
  onClose,
  embedded = false,
  currencySymbol = '৳',
  onSubmitProduct,
  categories = [],
  onAddCategory,
  units = [],
  onAddUnit,
  products = [],
  settings = {}
}) {
  const [formData, setFormData] = useState({
    barcode: '',
    productName: '',
    category: 'Grocery',
    subCategory: 'Rice & Grain',
    costPrice: '',
    wholesalePrice: '',
    minSellingPrice: '',
    sellingPrice: '',
    initialStock: '0',
    initialGodownStock: '10',
    minStockAlert: '5',
    unit: 'থান',
    yardsPerThan: '25',
    imageUrl: '',
    imageCaption: '',
    shortDescription: '',
    description: '',
  });

  // দ্রুত কালার ভ্যারিয়েন্ট ইনপুট স্টেট (থান কাপড়ের কালার ভিত্তিক স্টক)
  const [quickColorName, setQuickColorName] = useState('');
  const [quickColorThans, setQuickColorThans] = useState('1');

  // বারকোড স্ক্যানার, স্টিকার ও জেনারেটর স্টেট
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [barcodePrefix, setBarcodePrefix] = useState(settings?.StorePrefix || 'PB-');
  const [autoPrintStickersOnSave, setAutoPrintStickersOnSave] = useState(false);
  const [stickerPrintQuantity, setStickerPrintQuantity] = useState(10);
  const [scannedNotification, setScannedNotification] = useState('');
  const [pendingPrintProduct, setPendingPrintProduct] = useState(null);

  // ইমেজ আপলোড মোড ও ড্রাইভ প্রসেসিং স্টেট
  const [imageUploadMode, setImageUploadMode] = useState('upload'); // 'upload' | 'url'
  const [localImagePreview, setLocalImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // মাল্টি ফিচার স্টেট
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');

  // Phase 6: পণ্য ধরন, ভ্যারিয়েন্ট, ব্যাচ ও কম্বো বান্ডেল স্টেট
  const [productType, setProductType] = useState('simple'); // 'simple' | 'variable' | 'bundle'
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // ভ্যারিয়েন্ট স্টেট
  const [variants, setVariants] = useState([]);
  const [attributeSizes, setAttributeSizes] = useState('');
  const [attributeColors, setAttributeColors] = useState('');

  // কম্বো বান্ডেল স্টেট
  const [bundleItems, setBundleItems] = useState([]);
  const [selectedBundleProduct, setSelectedBundleProduct] = useState('');
  const [bundleItemQty, setBundleItemQty] = useState(1);

  // ভ্যারিয়েন্ট স্বয়ংক্রিয় জেনারেটর
  const handleAutoGenerateVariants = () => {
    const sizes = attributeSizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = attributeColors.split(',').map((c) => c.trim()).filter(Boolean);

    const generated = [];
    const baseCost = Number(formData.costPrice) || 0;
    const baseWholesale = Number(formData.wholesalePrice) || 0;
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
            WholesalePrice: baseWholesale,
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
          WholesalePrice: baseWholesale,
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
          WholesalePrice: baseWholesale,
          MinSellingPrice: baseMinSell,
          SellingPrice: baseSell,
          StockQuantity: 10
        });
      });
    }

    if (generated.length > 0) {
      setVariants(generated);
      const sumStock = generated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
      setFormData((prev) => ({ 
        ...prev, 
        initialGodownStock: String(sumStock),
        initialStock: '0' 
      }));
    }
  };

  const handleAddManualVariant = () => {
    const nextIdx = variants.length + 1;
    const baseCost = Number(formData.costPrice) || 0;
    const baseWholesale = Number(formData.wholesalePrice) || 0;
    const baseSell = Number(formData.sellingPrice) || 0;
    const newV = {
      VariantID: `VAR-${nextIdx}`,
      Attributes: { Option: `কালার/অপশন ${nextIdx}` },
      Barcode: `${formData.barcode || 'VAR'}-${nextIdx}`.toLowerCase(),
      CostPrice: baseCost,
      WholesalePrice: baseWholesale,
      SellingPrice: baseSell,
      StockQuantity: 10
    };
    const updated = [...variants, newV];
    setVariants(updated);
    const sumStock = updated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
    setFormData((prev) => ({ 
      ...prev, 
      initialGodownStock: String(sumStock),
      initialStock: '0' 
    }));
  };

  const handleUpdateVariantField = (idx, field, value) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: value };
    setVariants(updated);
    if (field === 'StockQuantity') {
      const sumStock = updated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
      setFormData((prev) => ({ 
        ...prev, 
        initialGodownStock: String(sumStock),
        initialStock: '0' 
      }));
    }
  };

  const handleRemoveVariant = (idx) => {
    const updated = variants.filter((_, i) => i !== idx);
    setVariants(updated);
    const sumStock = updated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
    setFormData((prev) => ({ 
      ...prev, 
      initialGodownStock: String(sumStock),
      initialStock: '0' 
    }));
  };

  // দ্রুত কালার ভ্যারিয়েন্ট যোগ ফাংশন (থান কাপড়ের ক্ষেত্রে সরাসরি গোডাউনে স্টক বৃদ্ধি)
  const handleAddQuickColor = (colorInput, thansInput) => {
    const cleanName = String(colorInput || quickColorName).trim();
    if (!cleanName) return;
    const qty = Math.max(0.1, Number(thansInput || quickColorThans) || 1);
    const baseCost = Number(formData.costPrice) || 0;
    const baseWholesale = Number(formData.wholesalePrice) || 0;
    const baseSell = Number(formData.sellingPrice) || 0;
    const baseMinSell = formData.minSellingPrice !== '' ? Number(formData.minSellingPrice) : baseCost;

    const existingIdx = variants.findIndex(v => 
      (v.Attributes?.Color && v.Attributes.Color.toLowerCase() === cleanName.toLowerCase()) ||
      (v.Attributes?.Option && v.Attributes.Option.toLowerCase() === cleanName.toLowerCase())
    );

    let updated = [];
    if (existingIdx !== -1) {
      updated = [...variants];
      updated[existingIdx] = {
        ...updated[existingIdx],
        StockQuantity: (Number(updated[existingIdx].StockQuantity) || 0) + qty
      };
    } else {
      const varId = `VAR-${cleanName.replace(/\s+/g, '-').toUpperCase()}`;
      const newV = {
        VariantID: varId,
        Attributes: { Color: cleanName },
        Barcode: `${formData.barcode || 'VAR'}-${cleanName}`.toLowerCase(),
        CostPrice: baseCost,
        WholesalePrice: baseWholesale,
        MinSellingPrice: baseMinSell,
        SellingPrice: baseSell,
        StockQuantity: qty
      };
      updated = [...variants, newV];
    }

    setVariants(updated);
    setProductType('variable');
    const sumStock = updated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
    setFormData(prev => ({
      ...prev,
      initialGodownStock: String(sumStock),
      initialStock: '0'
    }));
    setQuickColorName('');
    setQuickColorThans('1');
  };

  const handleUpdateVariantStock = (idx, newStock) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], StockQuantity: Math.max(0, Number(newStock) || 0) };
    setVariants(updated);
    const sumStock = updated.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
    setFormData(prev => ({
      ...prev,
      initialGodownStock: String(sumStock),
      initialStock: '0'
    }));
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  // নতুন পরিমাপক একক (Unit) তৈরি স্টেট
  const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitShortName, setNewUnitShortName] = useState('');

  // মোবাইল ভিউতে ট্যাব সুইচ (ফর্ম vs প্রিভিউ)
  const [mobileTab, setMobileTab] = useState('form'); // 'form' | 'preview'

  // অনন্য পরিমাপক একক (Units) তালিকা বের করা
  const uniqueUnits = useMemo(() => {
    const list = new Set();
    // অগ্রাধিকারভিত্তিক বস্ত্রালয় একক
    list.add('থান');
    list.add('গজ');
    units.forEach((u) => {
      const name = (u.ShortName || u.UnitName || '').trim();
      if (name) list.add(name);
    });
    // ডিফল্ট অন্যান্য মান নিশ্চিত করা
    ['Pcs', 'Packet', 'Kg', 'gm', 'Ltr', 'ml', 'Box', 'Bottle', 'Dozen', 'Pair', 'Meter', 'Roll'].forEach(d => list.add(d));
    return Array.from(list);
  }, [units]);

  // থান একক কি না তা যাচাই (কাপড়ের থান ও গজ পরিমাপক)
  const isThanUnit = useMemo(() => {
    const u = String(formData.unit || '').trim().toLowerCase();
    return u === 'থান' || u.includes('than') || u.includes('থান') || u.includes('bolt');
  }, [formData.unit]);

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

  // বারকোড কনফ্লিক্ট বা ডুপ্লিকেট শনাক্তকরণ
  const barcodeConflictProduct = useMemo(() => {
    if (!formData.barcode || !formData.barcode.trim()) return null;
    const clean = formData.barcode.trim().toLowerCase();
    return products.find(
      (p) => p.Barcode && String(p.Barcode).trim().toLowerCase() === clean
    );
  }, [formData.barcode, products]);

  // রিয়েল-টাইম মার্জিন, ফ্লোর প্রাইস, পাইকারি দর ও মুনাফা হিসাব
  const cost = parseFloat(formData.costPrice) || 0;
  const wholesale = parseFloat(formData.wholesalePrice) || 0;
  const sell = parseFloat(formData.sellingPrice) || 0;
  const minSell = parseFloat(formData.minSellingPrice) || 0;
  const initialStockNum = parseFloat(formData.initialStock) || 0;
  const minStockNum = parseFloat(formData.minStockAlert) || 5;
  const netProfit = sell - cost;
  const profitMarginPercent = cost > 0 
    ? ((netProfit / cost) * 100).toFixed(1) 
    : (sell > 0 ? '100' : '0');
  const isProfitable = netProfit >= 0;

  // পাইকারি মুনাফা বিশ্লেষণ
  const wholesaleProfit = wholesale > 0 ? wholesale - cost : 0;
  const wholesaleMarginPercent = cost > 0 && wholesale > 0
    ? ((wholesaleProfit / cost) * 100).toFixed(1)
    : (wholesale > 0 ? '100' : '0');

  // ফ্লোর প্রাইস বিশ্লেষণ (দামাদামির সর্বনিম্ন সীমা)
  const effectiveFloorPrice = minSell > 0 ? minSell : cost;
  const minFloorProfit = effectiveFloorPrice - cost;
  const minFloorMarginPercent = cost > 0 
    ? ((minFloorProfit / cost) * 100).toFixed(1) 
    : (effectiveFloorPrice > 0 ? '100' : '0');
  const isFloorBelowCost = cost > 0 && minSell > 0 && minSell < cost;
  const isFloorAboveSell = sell > 0 && minSell > 0 && minSell > sell;

  const totalVariantStock = useMemo(() => {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0);
  }, [variants]);

  const godownStockNum = parseFloat(formData.initialGodownStock) || 0;
  const totalCombinedStock = initialStockNum + godownStockNum;
  const totalStockInvestment = cost * totalCombinedStock;
  const totalPotentialRevenue = sell * totalCombinedStock;
  const totalPotentialProfit = netProfit * totalCombinedStock;

  // সক্রিয় ছবির সোর্স
  const currentImageSource = imageUploadMode === 'upload' 
    ? localImagePreview 
    : (formData.imageUrl ? formData.imageUrl.trim() : '');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      const subs = categories.filter((c) => c.CategoryName === value);
      setFormData((prev) => ({
        ...prev,
        category: value,
        subCategory: subs.length > 0 ? subs[0].SubCategoryName : ''
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // স্বয়ংক্রিয় অনন্য বারকোড / SKU জেনারেটর (১০০% কনফ্লিক্ট-মুক্ত গ্যারান্টি)
  const handleGenerateRandomBarcode = () => {
    const existingBarcodes = new Set(
      products
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

  // ক্যামেরা স্ক্যানারের মাধ্যমে বারকোড পাওয়া
  const handleCameraScanSuccess = (scannedCode) => {
    setFormData((prev) => ({
      ...prev,
      barcode: scannedCode
    }));
    setScannedNotification(`✓ ক্যামেরা থেকে কোড স্ক্যান সম্পন্ন: ${scannedCode}`);
    setTimeout(() => setScannedNotification(''), 3000);
  };

  // হ্যান্ডহেল্ড বারকোড স্ক্যানার Enter চাপলে ফর্ম সাবমিট প্রতিরোধ
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setScannedNotification('✓ বারকোড স্ক্যানার ইনপুট গৃহীত হয়েছে!');
      setTimeout(() => setScannedNotification(''), 2500);
    }
  };

  // নতুন ক্যাটাগরি অন-দ্য-ফ্লাই যোগ করার হ্যান্ডলার
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

  // নতুন একক অন-দ্য-ফ্লাই যোগ করার হ্যান্ডলার
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim()) {
      alert('অনুগ্রহ করে পরিমাপক এককের নাম লিখুন (যেমন: বস্তা, ডজন, কেজি)।');
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

  // মাল্টি ফিচার যুক্ত ও অপসারণ হ্যান্ডলার
  const handleAddFeature = (featureToAdd) => {
    const text = (featureToAdd || featureInput).trim();
    if (text && !features.includes(text)) {
      setFeatures([...features, text]);
      if (!featureToAdd) setFeatureInput('');
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
      alert(`নূন্যতম বিক্রয়মূল্য বা ফ্লোর প্রাইস (${currencySymbol}${minSellNum}) সাধারণ বিক্রয়মূল্যের (${currencySymbol}${sellNum}) চেয়ে বেশি হতে পারে না!`);
      return;
    }

    if (formData.minSellingPrice !== '' && costNum > 0 && minSellNum < costNum) {
      const confirmLow = window.confirm(`সতর্কতা: নূন্যতম বিক্রয়মূল্য (${currencySymbol}${minSellNum}) কেনা দামের (${currencySymbol}${costNum}) চেয়ে কম! আপনি কি নিশ্চিতভাবে লোকসানে বিক্রির ফ্লোর প্রাইস রাখতে চান?`);
      if (!confirmLow) return;
    }

    if (barcodeConflictProduct) {
      alert(`সতর্কতা: এই বারকোডটি (${formData.barcode}) ইতিমধ্যে "${barcodeConflictProduct.ProductName}" পণ্যে ব্যবহৃত হয়েছে! দয়া করে অনন্য বারকোড দিন বা স্বয়ংক্রিয়ভাবে তৈরি করুন।`);
      return;
    }

    const savedProdData = {
      ProductName: formData.productName.trim(),
      Barcode: formData.barcode.trim(),
      CostPrice: costNum,
      MinSellingPrice: minSellNum,
      SellingPrice: sellNum,
      Unit: formData.unit,
      StockQuantity: Number(formData.initialStock) || 0
    };

    const hasVar = productType === 'variable' || variants.length > 0;
    const effectiveVariants = hasVar ? variants : [];
    const thanCount = Number(formData.initialGodownStock) || Number(formData.initialStock) || 0;
    const yardsPerThan = Number(formData.yardsPerThan) || 0;
    const totalYards = (Number(formData.initialStock || 0) + Number(formData.initialGodownStock || 0)) * yardsPerThan;

    setIsSubmitting(true);
    try {
      await onSubmitProduct({
        ...formData,
        costPrice: costNum,
        wholesalePrice: Number(formData.wholesalePrice) || 0,
        WholesalePrice: Number(formData.wholesalePrice) || 0,
        minSellingPrice: minSellNum,
        sellingPrice: sellNum,
        initialStock: Number(formData.initialStock) || 0,
        initialGodownStock: Number(formData.initialGodownStock) || 0,
        godownStock: Number(formData.initialGodownStock) || 0,
        GodownStock: Number(formData.initialGodownStock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 5,
        yardsPerThan: yardsPerThan,
        YardsPerThan: yardsPerThan,
        thanCount: thanCount,
        ThanCount: thanCount,
        totalYards: totalYards,
        TotalYards: totalYards,
        imageUrl: imageUploadMode === 'url' ? formData.imageUrl.trim() : '',
        imageCaption: formData.imageCaption.trim(),
        imageBase64: imageUploadMode === 'upload' ? imageBase64 : '',
        imageMimeType: imageMimeType,
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        features: features,
        // Phase 6
        hasVariants: hasVar,
        variants: effectiveVariants,
        variantsJSON: hasVar ? JSON.stringify(effectiveVariants) : '',
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate.trim(),
        mfgDate: mfgDate.trim(),
        isBundle: productType === 'bundle',
        bundleItems: productType === 'bundle' ? bundleItems : [],
        bundleItemsJSON: productType === 'bundle' ? JSON.stringify(bundleItems) : ''
      });

      // রিসেট ও ক্লোজ
      setFormData({
        barcode: '',
        productName: '',
        category: uniqueCategories[0] || 'Grocery',
        subCategory: '',
        costPrice: '',
        wholesalePrice: '',
        minSellingPrice: '',
        sellingPrice: '',
        initialStock: '0',
        initialGodownStock: '10',
        minStockAlert: '5',
        unit: 'থান',
        yardsPerThan: '25',
        imageUrl: '',
        imageCaption: '',
        shortDescription: '',
        description: '',
      });
      setQuickColorName('');
      setQuickColorThans('1');
      setImageUploadMode('upload');
      setLocalImagePreview('');
      setImageBase64('');
      setFeatures([]);
      setFeatureInput('');

      // Phase 6 স্টেট রিসেট
      setProductType('simple');
      setVariants([]);
      setAttributeSizes('');
      setAttributeColors('');
      setBatchNumber('');
      setMfgDate('');
      setExpiryDate('');
      setBundleItems([]);
      setSelectedBundleProduct('');

      // যদি সেভ হওয়ার পর স্বয়ংক্রিয় স্টিকার প্রিন্ট সক্রিয় থাকে
      if (autoPrintStickersOnSave && savedProdData.Barcode) {
        setPendingPrintProduct(savedProdData);
        setIsStickerModalOpen(true);
      } else {
        onClose();
      }
    } catch (err) {
      alert(`পণ্য যোগ করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 sm:py-6 animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] overflow-hidden flex flex-col transition-all" : "bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-6xl w-full overflow-hidden flex flex-col max-h-[94vh] transition-all animate-in zoom-in-95 duration-200"}>
        
        {/* মডাল হেডার (Header Bar) */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-emerald-50/20 to-white relative select-none">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0 ring-4 ring-emerald-50">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  নতুন পণ্য ডাটাবেসে যোগ করুন
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-700 border border-emerald-200">
                  ইনভেন্টরি ক্যাটালগ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                গুগল শিট <span className="font-semibold text-emerald-600">Products</span> ডাটাবেসে নতুন পণ্য ও ছবি স্বয়ংক্রিয়ভাবে সেভ হবে
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* মোবাইল মোডে ট্যাব সুইচ বাটন */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl text-xs font-semibold mr-1">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  mobileTab === 'form' 
                    ? 'bg-white text-emerald-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ফর্ম
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1 transition-all ${
                  mobileTab === 'preview' 
                    ? 'bg-white text-emerald-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>প্রিভিউ</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 border border-slate-200 shadow-xs'
                  : 'w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 justify-center'
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

        {/* প্রধান কনটেন্ট এরিয়া (2-কলাম গ্রিড লেআউট) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
            
            {/* বাম কলাম: ফর্ম ইনপুটসমূহ (৭ কলাম) */}
            <div className={`lg:col-span-7 p-5 sm:p-7 space-y-6 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
              
              {/* পণ্য ধরন নির্বাচন (সাধারণ পণ্য vs ভ্যারিয়েন্ট vs কম্বো বান্ডেল) */}
              <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center space-x-1.5 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setProductType('simple')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    productType === 'simple'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white'
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
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ভ্যারিয়েন্ট পণ্য</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductType('bundle')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    productType === 'bundle'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>কম্বো বান্ডেল</span>
                </button>
              </div>

              {/* সেকশন ১: মৌলিক তথ্য */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>১. পণ্যের পরিচিতি ও বারকোড</span>
                  </span>
                  <span className="text-[11px] text-slate-400">* চিহ্নিত আবশ্যক</span>
                </div>

                {/* পণ্যের নাম */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    পণ্যের পূর্ণ নাম *
                  </label>
                  <input
                    type="text"
                    name="productName"
                    required
                    placeholder="যেমন: প্রিমিয়াম চিনিগুঁড়া সুগন্ধি চাল ১ কেজি প্যাকেট"
                    value={formData.productName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                  />
                </div>

                {/* ক্যাটাগরি ও সাব-ক্যাটাগরি */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ক্যাটাগরি ও সাব-ক্যাটাগরি *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 hover:underline transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isAddingNewCategory ? 'ড্রপডাউনে ফিরে যান' : '+ নতুন ক্যাটাগরি'}</span>
                    </button>
                  </div>

                  {/* অন-দ্য-ফ্লাই নতুন ক্যাটাগরি ড্রয়ার */}
                  {isAddingNewCategory ? (
                    <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">
                          নতুন ক্যাটাগরি ডাটাবেসে তৈরি করুন:
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-medium">
                          Categories ট্যাবে সেভ হবে
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="প্রধান ক্যাটাগরি (যেমন: Beverages)"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="সাব-ক্যাটাগরি (যেমন: Juice & Drinks)"
                          value={newSubCategoryName}
                          onChange={(e) => setNewSubCategoryName(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                        >
                          সংরক্ষণ করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewCategory(false)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          প্রধান ক্যাটাগরি
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        >
                          {uniqueCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          {!uniqueCategories.includes(formData.category) && (
                            <option value={formData.category}>{formData.category}</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          সাব-ক্যাটাগরি
                        </label>
                        <select
                          name="subCategory"
                          value={formData.subCategory}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        >
                          <option value="">-- সাব-ক্যাটাগরি নির্বাচন --</option>
                          {availableSubCategories.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                          {formData.subCategory && !availableSubCategories.includes(formData.subCategory) && (
                            <option value={formData.subCategory}>{formData.subCategory}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* বারকোড / SKU এবং বহুবিধ ইনপুট মেথড (হ্যান্ডহেল্ড স্ক্যানার, ক্যামেরা, প্রিফিক্স ও অটো-জেনারেটর) */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>বারকোড / SKU কোড</span>
                      <span className="text-[10px] text-slate-400 font-normal">(স্ক্যানার • ক্যামেরা • অটো কোড)</span>
                    </label>

                    {/* অ্যাকশন বাটনসমূহ */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* প্রিফিক্স ইনপুট */}
                      <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-[11px] shadow-2xs">
                        <span className="text-slate-400 font-semibold">প্রিফিক্স:</span>
                        <input
                          type="text"
                          value={barcodePrefix}
                          onChange={(e) => setBarcodePrefix(e.target.value)}
                          placeholder="PB-"
                          className="w-12 font-mono font-bold text-indigo-700 uppercase focus:outline-none"
                          title="বারকোডের শুরুতে যে প্রিফিক্স থাকবে (যেমন: PB-, PRD-, 890)"
                        />
                      </div>

                      {/* স্বয়ংক্রিয় কোড তৈরি বাটন */}
                      <button
                        type="button"
                        onClick={handleGenerateRandomBarcode}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-all shadow-2xs cursor-pointer"
                        title="ডাটাবেস চেক করে সম্পূর্ণ অনন্য ও কনফ্লিক্ট-মুক্ত কোড তৈরি করুন"
                      >
                        <Wand2 className="w-3 h-3 text-indigo-600" />
                        <span>অটো জেনারেট</span>
                      </button>

                      {/* মোবাইল ক্যামেরা দিয়ে স্ক্যান বাটন */}
                      <button
                        type="button"
                        onClick={() => setIsCameraScannerOpen(true)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all shadow-2xs cursor-pointer"
                        title="মোবাইল বা ল্যাপটপের ক্যামেরা দিয়ে বারকোড স্ক্যান করুন"
                      >
                        <Camera className="w-3 h-3 text-emerald-600" />
                        <span>ক্যামেরা স্ক্যান</span>
                      </button>
                    </div>
                  </div>

                  {/* বারকোড ইনপুট ফিল্ড (হ্যান্ডহেল্ড বারকোড স্ক্যানার সাপোর্টেড) */}
                  <div className="relative">
                    <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="barcode"
                      placeholder="বারকোড স্ক্যানার দিয়ে স্ক্যান করুন অথবা লিখুন (যেমন: PB-12345678)..."
                      value={formData.barcode}
                      onChange={handleChange}
                      onKeyDown={handleBarcodeKeyDown}
                      className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-4 transition-all shadow-2xs ${
                        barcodeConflictProduct
                          ? 'border-rose-400 text-rose-900 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/20'
                          : formData.barcode.trim()
                          ? 'border-emerald-400 text-emerald-900 focus:ring-emerald-500/10 focus:border-emerald-500 bg-emerald-50/20'
                          : 'border-slate-300 text-slate-800 focus:ring-emerald-500/10 focus:border-emerald-500'
                      }`}
                    />
                    {formData.barcode && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, barcode: '' }))}
                        className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        title="মুছে ফেলুন"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* নোটিফিকেশন মেসেজ */}
                  {scannedNotification && (
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{scannedNotification}</span>
                    </div>
                  )}

                  {/* বারকোড কনফ্লিক্ট সতর্কতা ব্যানার */}
                  {barcodeConflictProduct && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-900 text-xs animate-in shake duration-200">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">কনফ্লিক্ট সতর্কতা: বারকোড ডুপ্লিকেট!</strong>
                        <span>
                          এই বারকোডটি ইতিমধ্যে <strong>"{barcodeConflictProduct.ProductName}"</strong> পণ্যে ব্যবহৃত হয়েছে। অন্য কোড দিন বা 'অটো জেনারেট' চাপুন।
                        </span>
                      </div>
                    </div>
                  )}

                  {/* কনফ্লিক্ট মুক্ত ও সঠিক বারকোড ভেরিফিকেশন ব্যাজ */}
                  {!barcodeConflictProduct && formData.barcode.trim() && (
                    <div className="p-2 bg-emerald-50/80 border border-emerald-200/90 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                      <span className="flex items-center space-x-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>অনন্য বারকোড (ডাটাবেসের কারো সাথে মিল নেই)</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                        100% Unique
                      </span>
                    </div>
                  )}

                  {/* বারকোড স্টিকার প্রিন্ট অপশন বক্স */}
                  <div className="p-3 bg-gradient-to-r from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>বারকোড স্টিকার প্রিন্ট সেটিংস:</span>
                      </span>

                      {/* প্রিভিউ ও সরাসরি প্রিন্ট বাটন */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.barcode.trim()) {
                            alert('স্টিকার প্রিন্ট করার পূর্বে একটি বারকোড নির্ধারণ করুন বা অটো জেনারেট চাপুন।');
                            return;
                          }
                          setPendingPrintProduct({
                            ProductName: formData.productName || 'নতুন পণ্য',
                            Barcode: formData.barcode,
                            SellingPrice: Number(formData.sellingPrice) || 0,
                            Unit: formData.unit,
                            StockQuantity: Number(formData.initialStock) || 0
                          });
                          setIsStickerModalOpen(true);
                        }}
                        disabled={!formData.barcode.trim()}
                        className="text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>স্টিকার প্রিভিউ ও প্রিন্ট</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-100/70">
                      {/* প্রিন্ট সংখ্যা ইনপুট */}
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-600 font-semibold">প্রিন্ট সংখ্যা:</span>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={stickerPrintQuantity}
                          onChange={(e) => setStickerPrintQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-indigo-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-slate-500 text-[11px]">টি</span>

                        {/* দ্রুত কোয়ান্টিটি বাটন */}
                        <div className="hidden sm:flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setStickerPrintQuantity((q) => q + 5)}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 text-[10px] font-bold rounded"
                          >
                            +৫
                          </button>
                          <button
                            type="button"
                            onClick={() => setStickerPrintQuantity((q) => q + 10)}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 text-[10px] font-bold rounded"
                          >
                            +১০
                          </button>
                          <button
                            type="button"
                            onClick={() => setStickerPrintQuantity(Math.max(1, Number(formData.initialStock) || 10))}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 text-[10px] font-bold rounded"
                          >
                            স্টক সমান
                          </button>
                        </div>
                      </div>

                      {/* সেভ হলে স্বয়ংক্রিয় প্রিন্ট চেকবক্স */}
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoPrintStickersOnSave}
                          onChange={(e) => setAutoPrintStickersOnSave(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] font-bold text-slate-700">
                          সেভ হলে স্বয়ংক্রিয় স্টিকার প্রিন্ট
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* সেকশন ২: মূল্য নির্ধারণ ও স্টক লেভেল */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>২. মূল্য ও ইনভেন্টরি স্টক</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                    রিয়েল-টাইম মার্জিন ক্যালকুলেটর
                  </span>
                </div>

                {/* আর্থিক তথ্য: ক্রয়মূল্য, পাইকারি দর, ফ্লোর প্রাইস (নূন্যতম বিক্রয়মূল্য) ও বিক্রয়মূল্য */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      কেনা দাম / Cost ({currencySymbol})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="costPrice"
                        placeholder="100.00"
                        value={formData.costPrice}
                        onChange={handleChange}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">মিলের কেনা দর</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-indigo-900">
                        পাইকারি দর ({currencySymbol})
                      </label>
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-200" title="পাইকারি ক্রেতাদের জন্য দর">
                        হোলসেল
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-indigo-600">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="wholesalePrice"
                        placeholder={formData.costPrice ? `${(Number(formData.costPrice) * 1.15).toFixed(0)}` : "115.00"}
                        value={formData.wholesalePrice}
                        onChange={handleChange}
                        className="w-full pl-7 pr-3 py-2 bg-indigo-50/40 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-indigo-700 mt-1">পাইকারি ক্রেতাদের জন্য দর</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-amber-900">
                        নূন্যতম বিক্রয়মূল্য ({currencySymbol})
                      </label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300" title="দামাদামির সর্বনিম্ন সীমা">
                        ফ্লোর প্রাইস
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-600">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="minSellingPrice"
                        placeholder={formData.costPrice ? `${formData.costPrice}` : "110.00"}
                        value={formData.minSellingPrice}
                        onChange={handleChange}
                        className={`w-full pl-7 pr-3 py-2 bg-amber-50/50 border rounded-xl text-sm font-black text-amber-950 focus:outline-none focus:ring-4 transition-all shadow-2xs ${
                          isFloorBelowCost 
                            ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' 
                            : isFloorAboveSell 
                              ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' 
                              : 'border-amber-300 focus:ring-amber-500/10 focus:border-amber-500'
                        }`}
                        title="কাস্টমার দামাদামি করলেও এর নিচে বিক্রি করা যাবে না"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">দামাদামির সর্বনিম্ন সীমা</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      বিক্রয়মূল্য / MRP ({currencySymbol}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-600">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        name="sellingPrice"
                        placeholder="120.00"
                        value={formData.sellingPrice}
                        onChange={handleChange}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">স্বাভাবিক খুচরা বিক্রয় দর</p>
                  </div>
                </div>

                {/* সতর্কবার্তা যদি ফ্লোর প্রাইস কেনা দামের নিচে বা বিক্রয়মূল্যের উপরে যায় */}
                {isFloorBelowCost && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>সতর্কতা: নূন্যতম বিক্রয়মূল্য ({currencySymbol}{minSell}) কেনা দামের ({currencySymbol}{cost}) নিচে নির্ধারণ করা হয়েছে (লোকসান হতে পারে)।</span>
                  </div>
                )}
                {isFloorAboveSell && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>ত্রুটি: নূন্যতম বিক্রয়মূল্য ({currencySymbol}{minSell}) সাধারণ বিক্রয়মূল্যের ({currencySymbol}{sell}) চেয়ে বেশি হতে পারে না।</span>
                  </div>
                )}

                {/* লাইভ লাভ ও মার্জিন প্রিভিউ বার */}
                {(cost > 0 || sell > 0 || minSell > 0 || wholesale > 0) && (
                  <div className="p-3 rounded-xl border bg-slate-100/70 border-slate-200 space-y-2">
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-semibold transition-all ${
                      isProfitable 
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50/90 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className={`w-4 h-4 ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`} />
                        <span>
                          স্বাভাবিক লাভ (MRP-তে): <strong className="font-black">{currencySymbol}{netProfit.toFixed(2)}</strong>
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-slate-500">প্রফিট মার্জিন:</span>
                        <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                          isProfitable ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {isProfitable ? `+${profitMarginPercent}%` : `${profitMarginPercent}%`}
                        </span>
                      </div>
                    </div>

                    {wholesale > 0 && (
                      <div className="flex items-center justify-between text-xs font-semibold px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-200/90 rounded-lg text-indigo-950">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>
                            পাইকারি মুনাফা (হোলসেল দর {currencySymbol}{wholesale.toFixed(2)}): <strong className="font-black">{currencySymbol}{wholesaleProfit.toFixed(2)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] text-indigo-700">পাইকারি মার্জিন:</span>
                          <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-indigo-200 text-indigo-950">
                            {wholesaleProfit >= 0 ? `+${wholesaleMarginPercent}%` : `${wholesaleMarginPercent}%`}
                          </span>
                        </div>
                      </div>
                    )}

                    {minSell > 0 && (
                      <div className="flex items-center justify-between text-xs font-semibold px-2.5 py-1.5 bg-amber-50/80 border border-amber-200/90 rounded-lg text-amber-950">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>
                            দামাদামির সর্বনিম্ন লাভ (ফ্লোর দর {currencySymbol}{minSell.toFixed(2)}): <strong className="font-black">{currencySymbol}{minFloorProfit.toFixed(2)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] text-amber-700">ফ্লোর মার্জিন:</span>
                          <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-amber-200 text-amber-950">
                            {minFloorProfit >= 0 ? `+${minFloorMarginPercent}%` : `${minFloorMarginPercent}%`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ওপেনিং স্টক, সতর্কবার্তা লেভেল এবং ইউনিট */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>🏬 দোকান স্টক</span>
                      <span className="text-[10px] text-slate-400 font-normal">(শুরুতে ০)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="initialStock"
                      value={formData.initialStock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>🏭 গোডাউন স্টক</span>
                      <span className="text-[10px] text-indigo-600 font-bold">(সরাসরি জমা)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="initialGodownStock"
                      value={formData.initialGodownStock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      কম স্টক এলার্ট
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="minStockAlert"
                      value={formData.minStockAlert}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800">
                        পরিমাপক একক
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewUnit(!isAddingNewUnit)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                        title="নতুন একক তৈরি করুন"
                      >
                        {isAddingNewUnit ? 'তালিকায়' : '+ নতুন'}
                      </button>
                    </div>

                    {isAddingNewUnit ? (
                      <div className="space-y-1.5 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder="একক (যেমন: Bag / বস্তা)"
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={handleCreateUnit}
                            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded transition-colors"
                          >
                            সেভ
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewUnit(false)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] rounded transition-colors"
                          >
                            বাতিল
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      >
                        {uniqueUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        {formData.unit && !uniqueUnits.includes(formData.unit) && (
                          <option value={formData.unit}>{formData.unit}</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>

                {/* থান ও গজ ক্যালকুলেটর (কাপড় পরিমাপ) */}
                {isThanUnit && (
                  <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/90 rounded-2xl p-4 space-y-3.5 shadow-2xs mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-700">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-950">থান ও গজ ক্যালকুলেটর (বস্ত্রালয় কাপড় পরিমাপ)</h4>
                          <p className="text-[10px] text-amber-800">প্রতি থানের দৈর্ঘ্য ও মোট গজের নিখুঁত হিসাব ও কালার ভিত্তিক বণ্টন</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-amber-200/70 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                        অটো-ক্যালকুলেশন
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-amber-950">
                            🏭 মোট থান (গোডাউনে)
                          </label>
                          {variants.length > 0 && (
                            <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                              কালার যোগফল
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={formData.initialGodownStock}
                          onChange={(e) => setFormData(prev => ({ ...prev, initialGodownStock: e.target.value }))}
                          readOnly={variants.length > 0}
                          placeholder="যেমন: ১০"
                          className={`w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs ${
                            variants.length > 0 ? 'bg-amber-100/50 cursor-not-allowed' : ''
                          }`}
                          title={variants.length > 0 ? "কালার ভ্যারিয়েন্ট থাকায় নিচের কালার থানগুলোর যোগফল স্বয়ংক্রিয়ভাবে এখানে আসছে" : "মোট থান সংখ্যা লিখুন"}
                        />
                        <span className="text-[10px] text-amber-700">
                          {variants.length > 0 ? '✓ কালার ভ্যারিয়েন্ট থেকে অটো আপডেট হচ্ছে' : 'পণ্য যুক্ত হলে সরাসরি গোডাউনে ঢুকবে'}
                        </span>
                      </div>

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

                      <div className="bg-amber-100/80 rounded-xl p-3 border border-amber-300/80 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide">মোট কাপড়ের পরিমাণ</span>
                        <span className="text-base font-black text-amber-950 block">
                          {((Number(formData.initialGodownStock) || 0) + (Number(formData.initialStock) || 0)) * (Number(formData.yardsPerThan) || 0)} গজ
                        </span>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          ({(Number(formData.initialGodownStock) || 0) + (Number(formData.initialStock) || 0)} থান × {Number(formData.yardsPerThan) || 0} গজ/থান)
                        </span>
                      </div>
                    </div>

                    {/* কালার ভিত্তিক থান ও গজ স্টক বণ্টন (User Request) */}
                    <div className="bg-white/95 rounded-xl p-3.5 border border-amber-200/90 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Palette className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-black text-amber-950">কালার ভিত্তিক থান স্টক এন্ট্রি (Color-wise Thans)</span>
                        </div>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                          {variants.length} টি কালার ভ্যারিয়েন্ট
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        কাপড়ের বিভিন্ন কালার অনুযায়ী থান সংখ্যা দিন। প্রতিটি কালারের থান সংখ্যা স্বয়ংক্রিয়ভাবে মোট গোডাউন থান ও গজে যোগ হবে।
                      </p>

                      {/* দ্রুত কালার এন্ট্রি ইনপুট বার */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="কালার / রঙের নাম (যেমন: লাল, নেভি ব্লু)"
                          value={quickColorName}
                          onChange={(e) => setQuickColorName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddQuickColor();
                            }
                          }}
                          className="flex-1 min-w-[140px] px-3 py-1.5 bg-slate-50 border border-amber-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex items-center space-x-1 shrink-0">
                          <input
                            type="number"
                            min="0.5"
                            step="any"
                            placeholder="থান সংখ্যা"
                            value={quickColorThans}
                            onChange={(e) => setQuickColorThans(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddQuickColor();
                              }
                            }}
                            className="w-20 px-2.5 py-1.5 bg-slate-50 border border-amber-200 rounded-lg text-xs font-black text-amber-950 text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-[11px] font-bold text-amber-900">থান</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddQuickColor()}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center space-x-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ কালার যোগ</span>
                        </button>
                      </div>

                      {/* দ্রুত নির্বাচন চিপস */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-bold text-amber-800 shrink-0">জনপ্রিয় কালার:</span>
                        {['লাল', 'নীল', 'কালো', 'সাদা', 'সবুজ', 'হলুদ', 'গোলাপি', 'মেরুন', 'নেভি ব্লু', 'অফ-হোয়াইট', 'ছাই', 'বেগুনি'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleAddQuickColor(c, quickColorThans || 1)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                          >
                            + {c}
                          </button>
                        ))}
                      </div>

                      {/* কালার ভিত্তিক স্টকের তালিকা টেবিল */}
                      {variants.length > 0 && (
                        <div className="mt-2 border border-amber-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-amber-100/60 border-b border-amber-200 text-amber-950 font-bold">
                              <tr>
                                <th className="p-2 pl-3">রঙ / কালার</th>
                                <th className="p-2 w-32 text-center">থান সংখ্যা</th>
                                <th className="p-2 w-28 text-center">গজ হিসাব</th>
                                <th className="p-2 pr-3 w-14 text-center">মুছুন</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100 font-medium">
                              {variants.map((v, idx) => {
                                const colorTitle = v.Attributes?.Color || v.Attributes?.Option || Object.values(v.Attributes || {})[0] || v.VariantID;
                                const thans = Number(v.StockQuantity) || 0;
                                const calculatedGoj = thans * (Number(formData.yardsPerThan) || 0);
                                return (
                                  <tr key={v.VariantID || idx} className="hover:bg-amber-50/40">
                                    <td className="p-2 pl-3">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                                        <span className="font-bold text-slate-900">{colorTitle}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateVariantStock(idx, Math.max(0, thans - 1))}
                                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-black flex items-center justify-center cursor-pointer"
                                          title="১ থান কমান"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={v.StockQuantity}
                                          onChange={(e) => handleUpdateVariantStock(idx, e.target.value)}
                                          className="w-14 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-xs font-black text-amber-950"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateVariantStock(idx, thans + 1)}
                                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-black flex items-center justify-center cursor-pointer"
                                          title="১ থান বাড়ান"
                                        >
                                          +
                                        </button>
                                        <span className="text-[10px] text-slate-500 font-medium">থান</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="font-black text-amber-950 text-xs">
                                        {calculatedGoj} গজ
                                      </span>
                                    </td>
                                    <td className="p-2 pr-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVariant(idx)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                        title="এই কালার বাদ দিন"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-amber-100/70 border-t border-amber-200 text-amber-950 font-black">
                              <tr>
                                <td className="p-2 pl-3">
                                  মোট: {variants.length} টি কালার
                                </td>
                                <td className="p-2 text-center text-amber-900">
                                  {variants.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0)} থান (গোডাউন)
                                </td>
                                <td className="p-2 text-center text-amber-950">
                                  {variants.reduce((sum, v) => sum + (Number(v.StockQuantity) || 0), 0) * (Number(formData.yardsPerThan) || 0)} গজ
                                </td>
                                <td className="p-2 pr-3 text-center"></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start space-x-1.5">
                      <span className="font-bold text-amber-700 shrink-0">💡 নিয়ম:</span>
                      <span>নতুন কাপড় যোগ করার সাথে সাথে সরাসরি গোডাউন স্টকে জমা হবে এবং অনলাইন কাস্টমারদের জন্য "মজুদ আছে" দেখাবে। দোকানে বিক্রির জন্য 'গোডাউন থেকে দোকান চালান' করে আনা যাবে।</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 6: ভ্যারিয়েন্ট কনফিগারেশন (Variable Product) */}
              {productType === 'variable' && (
                <div className="bg-indigo-50/50 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <span className="text-xs font-bold text-indigo-950 flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>ভ্যারিয়েন্ট ম্যানেজার (সাইজ, রঙ, ওজন)</span>
                    </span>
                    <span className="text-[11px] text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full font-bold">
                      {variants.length}টি ভ্যারিয়েন্ট তৈরি
                    </span>
                  </div>

                  {/* স্বয়ংক্রিয় ভ্যারিয়েন্ট জেনারেটর ফর্ম */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-700">
                      অটো জেনারেটর (কমা দিয়ে একাধিক মান লিখুন):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="সাইজ / ওজন (যেমন: S, M, L, XL অথবা 500g, 1kg)"
                        value={attributeSizes}
                        onChange={(e) => setAttributeSizes(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="রঙ / কালার (যেমন: Black, Navy, White)"
                        value={attributeColors}
                        onChange={(e) => setAttributeColors(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleAutoGenerateVariants}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>স্বয়ংক্রিয় তৈরি করুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddManualVariant}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        + ম্যানুয়াল রো যোগ
                      </button>
                    </div>
                  </div>

                  {/* ভ্যারিয়েন্ট তালিকা টেবিল */}
                  {variants.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <tr>
                            <th className="p-2 pl-3">বৈশিষ্ট্য (Attributes)</th>
                            <th className="p-2">বারকোড</th>
                            <th className="p-2 w-20">কেনা ({currencySymbol})</th>
                            <th className="p-2 w-20">পাইকারি ({currencySymbol})</th>
                            <th className="p-2 w-20">বিক্রি ({currencySymbol})</th>
                            <th className="p-2 w-20">{isThanUnit ? 'থান স্টক' : 'স্টক'}</th>
                            <th className="p-2 pr-3 text-center">মুছুন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {variants.map((v, idx) => (
                            <tr key={v.VariantID || idx} className="hover:bg-slate-50/60">
                              <td className="p-2 pl-3">
                                <span className="font-bold text-slate-800">
                                  {v.Attributes ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ') : v.VariantID}
                                </span>
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={v.Barcode || ''}
                                  onChange={(e) => handleUpdateVariantField(idx, 'Barcode', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono"
                                  placeholder="বারকোড"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={v.CostPrice}
                                  onChange={(e) => handleUpdateVariantField(idx, 'CostPrice', Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={v.WholesalePrice !== undefined ? v.WholesalePrice : ''}
                                  onChange={(e) => handleUpdateVariantField(idx, 'WholesalePrice', Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-indigo-200 rounded text-[11px] font-bold text-indigo-700"
                                  placeholder="পাইকারি"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={v.SellingPrice}
                                  onChange={(e) => handleUpdateVariantField(idx, 'SellingPrice', Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-indigo-700"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={v.StockQuantity}
                                  onChange={(e) => handleUpdateVariantField(idx, 'StockQuantity', Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-black text-emerald-700"
                                  title={isThanUnit ? "এই কালার/অপশনের থান সংখ্যা" : "স্টক পরিমাণ"}
                                />
                              </td>
                              <td className="p-2 pr-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="মুছুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 6: কম্বো বান্ডেল কনফিগারেশন (Bundle Package) */}
              {productType === 'bundle' && (
                <div className="bg-amber-50/50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                    <span className="text-xs font-bold text-amber-950 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>কম্বো বান্ডেল আইটেম নির্বাচন</span>
                    </span>
                    <span className="text-[11px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full font-bold">
                      {bundleItems.length}টি সাব-আইটেম
                    </span>
                  </div>

                  {/* সাব-আইটেম অ্যাড ড্রপডাউন */}
                  <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-8">
                        <select
                          value={selectedBundleProduct}
                          onChange={(e) => setSelectedBundleProduct(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                          title="কতটি অন্তর্ভুক্ত থাকবে"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={handleAddBundleItem}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <span>+ যোগ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* বান্ডেল তালিকা */}
                  {bundleItems.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                      {bundleItems.map((bi) => (
                        <div key={bi.ProductID} className="p-2.5 px-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{bi.ProductName}</span>
                            <span className="text-[11px] text-slate-500 ml-2">x {bi.Quantity} পিস</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-amber-700">
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

              {/* Phase 6: ব্যাচ নম্বর ও মেয়াদ ট্র্যাকিং (সকল পণ্যের জন্য প্রযোজ্য) */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <CalendarClock className="w-4 h-4 text-rose-600" />
                    <span>ব্যাচ নম্বর ও মেয়াদ ট্র্যাকিং (অপশনাল)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    অটো মেয়াদ সতর্কতা ও ক্লিয়ারেন্স
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ব্যাচ নম্বর (Batch No.)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: BATCH-2026-A1"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      উৎপাদনের তারিখ (Mfg Date)
                    </label>
                    <input
                      type="date"
                      value={mfgDate}
                      onChange={(e) => setMfgDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মেয়াদোত্তীর্ণের তারিখ (Expiry Date)
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* সেকশন ৩: মিডিয়া ও পণ্যের ছবি */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>৩. পণ্যের ছবি ও মিডিয়া (ড্রাইভ সিঙ্ক)</span>
                  </span>
                  
                  {/* আপলোড মোড সুইচ */}
                  <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('upload')}
                      className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                        imageUploadMode === 'upload' 
                          ? 'bg-white text-emerald-800 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>ডিভাইস আপলোড</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('url')}
                      className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                        imageUploadMode === 'url' 
                          ? 'bg-white text-emerald-800 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>ইমেজ URL</span>
                    </button>
                  </div>
                </div>

                {/* ডিভাইস আপলোড ফিল্ড */}
                {imageUploadMode === 'upload' && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="add-product-file-input"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {isProcessingImage ? (
                      <div className="p-6 border-2 border-dashed border-emerald-300 rounded-2xl flex flex-col items-center justify-center space-y-2 bg-emerald-50/40 text-emerald-700 text-xs font-semibold">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        <span>ছবি অপটিমাইজ ও কম্প্রেস করা হচ্ছে...</span>
                      </div>
                    ) : localImagePreview ? (
                      <div className="flex items-center space-x-4 p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 shadow-inner">
                          <img
                            src={localImagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            ছবি সফলভাবে সংযুক্ত হয়েছে
                          </span>
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>গুগল ড্রাইভ 'products image' ফোল্ডারে সেভ হবে</span>
                          </span>
                          <label
                            htmlFor="add-product-file-input"
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline inline-block mt-1"
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
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="ছবি মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="add-product-file-input"
                        className="group border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center bg-white hover:bg-emerald-50/20 cursor-pointer transition-all text-center"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center mb-2 transition-colors">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                          কম্পিউটার বা মোবাইল থেকে ছবি নির্বাচন করুন
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          JPG, PNG, WebP সমর্থিত • অটো কম্প্রেশন সক্রিয়
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* ইমেজ URL ফিল্ড */}
                {imageUploadMode === 'url' && (
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="url"
                        name="imageUrl"
                        placeholder="https://example.com/product-photo.jpg"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                      />
                    </div>
                    {formData.imageUrl ? (
                      <div className="w-11 h-11 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/60?text=Error'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl border border-dashed border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )}

                {/* SEO ক্যাপশন */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>ছবির ক্যাপশন / Alt Text (SEO অপটিমাইজেশন)</span>
                    <span className="text-[10px] text-slate-400 font-normal">গুগল ইমেজ সার্চ সহায়িকা</span>
                  </label>
                  <input
                    type="text"
                    name="imageCaption"
                    placeholder="যেমন: চিনিগুঁড়া সুগন্ধি চাল ১ কেজি প্যাকেট - ফ্রন্ট সাইড"
                    value={formData.imageCaption}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* সেকশন ৪: বিবরণ ও বৈশিষ্ট্য */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                    <span>৪. বিবরণ ও মাল্টি-ফিচার বৈশিষ্ট্য</span>
                  </span>
                </div>

                {/* সংক্ষিপ্ত বিবরণ */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>সংক্ষিপ্ত বিবরণ (Short Description)</span>
                  </label>
                  <input
                    type="text"
                    name="shortDescription"
                    placeholder="যেমন: প্রিমিয়াম কোয়ালিটি লম্বা দানার সুগন্ধি চাল, ১০০% প্রাকৃতিক"
                    value={formData.shortDescription}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                  />
                </div>

                {/* মাল্টি ফিচারসমূহ */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <ListPlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>পণ্যের বৈশিষ্ট্যসমূহ (Multi Features)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Enter চেপে যুক্ত করুন</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="নতুন বৈশিষ্ট্য লিখুন (যেমন: অর্গানিক, রাসায়নিক মুক্ত)..."
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={handleFeatureKeyDown}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddFeature()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95"
                    >
                      + যোগ
                    </button>
                  </div>

                  {/* দ্রুত প্রিসেট বাটন */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 self-center mr-1">দ্রুত পছন্দ:</span>
                    {QUICK_FEATURE_PRESETS.map((preset) => {
                      const isAdded = features.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => !isAdded && handleAddFeature(preset)}
                          disabled={isAdded}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            isAdded
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-2xs'
                          }`}
                        >
                          + {preset}
                        </button>
                      );
                    })}
                  </div>

                  {/* সিলেক্টেড ফিচার চিপস */}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs group"
                        >
                          <span>{feat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(idx)}
                            className="ml-2 text-emerald-400 hover:text-rose-600 transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* বিস্তারিত বিবরণ (রিচ টেক্সট এডিটর) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center space-x-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>বিস্তারিত বিবরণ (Rich Text Description)</span>
                  </label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(newHtml) => setFormData((prev) => ({ ...prev, description: newHtml }))}
                    placeholder="পণ্যের পূর্ণ বিবরণ, ব্যবহারবিধি বা সংরক্ষণ নির্দেশিকা লিখুন..."
                  />
                </div>
              </div>

            </div>

            {/* ডান কলাম: লাইভ ক্যাটালগ কার্ড প্রিভিউ ও ফাইন্যান্সিয়াল ইনসাইটস (৫ কলাম) */}
            <div className={`lg:col-span-5 p-5 sm:p-7 bg-gradient-to-b from-slate-50/60 to-white space-y-6 ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
              
              <div className="sticky top-4 space-y-5">
                
                {/* প্রিভিউ হেডার */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>লাইভ ক্যাটালগ কার্ড প্রিভিউ</span>
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    কাস্টমার ভিউ
                  </span>
                </div>

                {/* স্টোরফ্রন্ট কার্ড প্রিভিউ (ProductCatalog-এর সাথে হুবহু সামঞ্জস্যপূর্ণ) */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-4 transition-all duration-300 relative overflow-hidden group">
                  
                  {/* ফ্লোটিং স্টক ব্যাজ (অনলাইন কাস্টমারদের জন্য গোডাউন স্টক থাকলেও মজুদ আছে দেখাবে) */}
                  <div className="absolute top-6 left-6 z-10">
                    {totalCombinedStock <= 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                        স্টক নেই
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                        মজুদ আছে ({totalCombinedStock} {formData.unit}{isThanUnit && Number(formData.yardsPerThan) > 0 ? ` / ${totalCombinedStock * Number(formData.yardsPerThan)} গজ` : ''})
                      </span>
                    )}
                  </div>

                  {/* কার্ড ইমেজ ফ্রেম */}
                  <div className="w-full h-44 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative mb-3.5">
                    {currentImageSource ? (
                      <img
                        src={currentImageSource}
                        alt={formData.productName || 'Preview'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 space-y-1.5">
                        <ImageIcon className="w-10 h-10 stroke-[1.2]" />
                        <span className="text-[11px] font-medium text-slate-400">ছবি আপলোড করুন</span>
                      </div>
                    )}
                  </div>

                  {/* ক্যাটাগরি ও সাব-ক্যাটাগরি ব্যাজ */}
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {formData.category || 'ক্যাটাগরি'}
                    </span>
                    {formData.subCategory && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {formData.subCategory}
                      </span>
                    )}
                    {formData.barcode && (
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">
                        #{formData.barcode}
                      </span>
                    )}
                  </div>

                  {/* পণ্যের নাম */}
                  <h5 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
                    {formData.productName.trim() || 'পণ্যের নাম লিখুন...'}
                  </h5>

                  {/* সংক্ষিপ্ত বিবরণ */}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1 min-h-[1.1rem]">
                    {formData.shortDescription.trim() || 'সংক্ষিপ্ত বৈশিষ্ট্য এখানে দেখা যাবে'}
                  </p>

                  {/* ফিচার ট্যাগস */}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {features.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          ✓ {f}
                        </span>
                      ))}
                      {features.length > 3 && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          +{features.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* মূল্য ও কার্ট বাটন */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">বিক্রয়মূল্য</span>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-lg font-black text-slate-900">
                          {currencySymbol}{sell > 0 ? sell.toFixed(2) : '০.০০'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          /{formData.unit}
                        </span>
                      </div>
                      {wholesale > 0 && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 block mt-0.5">
                          পাইকারি: {currencySymbol}{wholesale.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-emerald-600/90 text-white rounded-xl text-xs font-bold shadow-sm opacity-90 cursor-not-allowed"
                    >
                      + কার্টে যোগ
                    </button>
                  </div>

                  {/* কালার ভ্যারিয়েন্ট প্রিভিউ সামারি */}
                  {variants.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                      <span className="font-bold text-slate-700 block mb-1">
                        🎨 কালার স্টক ({variants.length} টি ভ্যারিয়েন্ট):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {variants.map((v, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-medium">
                            {v.Attributes?.Color || v.Attributes?.Option || Object.values(v.Attributes || {})[0] || `রঙ #${i+1}`}: {v.StockQuantity} {isThanUnit ? 'থান' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* আর্থিক লাভ-ক্ষতি ও স্টক ইনভেস্টমেন্ট সারসংক্ষেপ */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>ইনভেন্টরি ফাইন্যান্সিয়াল প্রজেকশন</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                      গোডাউন: {formData.initialGodownStock} | দোকান: {formData.initialStock} {formData.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block mb-0.5">মোট ক্রয় বিনিয়োগ</span>
                      <span className="text-sm font-bold text-slate-100">
                        {currencySymbol}{totalStockInvestment.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block mb-0.5">সম্ভাব্য বিক্রয় মূল্য</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {currencySymbol}{totalPotentialRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">সম্ভাব্য মোট প্রফিট (মজুদ শেষ হলে)</span>
                      <span className={`text-base font-black ${totalPotentialProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currencySymbol}{totalPotentialProfit.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">মার্জিন</span>
                      <span className="text-xs font-bold text-slate-200">
                        {profitMarginPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* ডাটাবেস নিরাপত্তা ও সিঙ্ক আশ্বাস বার্তা */}
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-start space-x-3 text-xs text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    সংরক্ষণ বাটনে ক্লিক করার সাথে সাথে পণ্যটি গুগল শিটের <strong>Products</strong> ট্যাবে রিয়েল-টাইম সেভ হবে এবং সংযুক্ত ছবি স্বয়ংক্রিয়ভাবে গুগল ড্রাইভে আপলোড হবে।
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* মডাল ফুটার একশন বার (Sticky Bottom) */}
          <div className="p-4 sm:px-8 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 hidden sm:block">
              {formData.productName.trim() ? (
                <span className="text-emerald-700 font-semibold flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>পণ্য প্রস্তুত: <strong>{formData.productName.trim()}</strong></span>
                </span>
              ) : (
                <span>* আবশ্যক ফিল্ডসমূহ পূরণ করুন</span>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
              >
                বাতিল করুন
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ডাটাবেসে সেভ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <PackagePlus className="w-4 h-4" />
                    <span>ডাটাবেসে পণ্য যোগ করুন</span>
                  </>
                )}
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
          onClose={() => {
            setIsStickerModalOpen(false);
            setPendingPrintProduct(null);
            // যদি সেভ প্রসেসের অংশ হিসেবে স্টিকার প্রিন্ট হয়ে থাকে, তবে মূল মডালও বন্ধ করা
            if (pendingPrintProduct) {
              onClose();
            }
          }}
          product={pendingPrintProduct || {
            ProductName: formData.productName || 'নতুন পণ্য',
            Barcode: formData.barcode,
            SellingPrice: Number(formData.sellingPrice) || 0,
            Unit: formData.unit,
            StockQuantity: Number(formData.initialStock) || 0
          }}
          initialQuantity={stickerPrintQuantity}
          currencySymbol={currencySymbol}
          storeName={settings?.StoreName || 'Pabna Bostraloy'}
        />
      )}

    </div>
  );
}
