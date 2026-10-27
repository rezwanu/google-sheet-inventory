import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Plus,
  Trash2,
  Calculator,
  Package,
  UserCheck,
  Truck,
  FileText,
  Barcode,
  Search,
  Layers,
  Coins,
  ShieldCheck,
  Loader2,
  Check,
  Box,
  Camera,
  Printer,
  Tag,
  Warehouse,
  Store,
  Sparkles,
  Palette,
  Building2,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeStickerModal from './BarcodeStickerModal';
import { getLocalSuppliers, saveOrUpdateSupplierLocally } from '../services/storage';

// রঙের বাংলা/ইংরেজি নাম থেকে হেক্স কালার বের করার হেল্পার
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

// দ্রুত পরিমাণের প্রিসেট (Quick Quantity Presets)
const QUANTITY_PRESETS = [5, 10, 25, 50, 100];

// দ্রুত নোট প্রিসেট
const NOTE_PRESETS = ['নতুন লট চালান', 'জরুরি রিস্টক', 'সাপ্তাহিক স্টক', 'ড্যামেজ রিপ্লেসমেন্ট'];

export default function AddStockModal({
  isOpen,
  onClose,
  embedded = false,
  products = [],
  currencySymbol = '৳',
  activeUser,
  onSubmitStock,
  initialProductId = '',
  settings = {},
  suppliers = [],
  onSaveSupplier,
  variantAttributes = [],
  onAddVariantOption
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [incomingQty, setIncomingQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [handledBy, setHandledBy] = useState(activeUser?.FullName || 'Admin');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState('form'); // 'form' | 'analytics'

  // রিস্টক গন্তব্য (গোডাউন ওয়্যারহাউজ বনাম দোকান কাউন্টার)
  const [targetLocation, setTargetLocation] = useState('Godown'); // 'Godown' | 'Shop'

  // ভ্যারিয়েন্ট রিস্টক স্টেট
  const [variantRestockMode, setVariantRestockMode] = useState('all'); // 'all' | 'single'
  const [variantQuantities, setVariantQuantities] = useState({}); // { [variantId]: number|string }
  const [selectedSingleVariantId, setSelectedSingleVariantId] = useState('');
  const [singleVariantQty, setSingleVariantQty] = useState('');
  const [bulkVariantQty, setBulkVariantQty] = useState(''); // সব ভ্যারিয়েন্টে এক ক্লিকে সংখ্যা বসানোর জন্য

  // রিস্টকে সরাসরি নতুন কালার / ভ্যারিয়েন্ট যোগ করার স্টেট
  const [customAddedVariants, setCustomAddedVariants] = useState([]);
  const [isAddingNewColorOpen, setIsAddingNewColorOpen] = useState(false);
  const [isVariantRestockEnabled, setIsVariantRestockEnabled] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorStock, setNewColorStock] = useState('1');
  const [newColorType, setNewColorType] = useState('Color'); // 'Color' | 'Size' | 'Weight'
  const [newColorBarcode, setNewColorBarcode] = useState('');
  const [newColorCostPrice, setNewColorCostPrice] = useState('');
  const [newColorSellingPrice, setNewColorSellingPrice] = useState('');

  // সাপ্লায়ার ও ভেন্ডর খাতা ইন্টিগ্রেশন স্টেট
  const [localSuppliersList, setLocalSuppliersList] = useState(() => {
    if (Array.isArray(suppliers) && suppliers.length > 0) return suppliers;
    try {
      return getLocalSuppliers();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      setLocalSuppliersList(suppliers);
    }
  }, [suppliers]);

  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');

  // ক্যামেরা স্ক্যান ও স্টিকার স্টেট
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [autoPrintStickersOnRestock, setAutoPrintStickersOnRestock] = useState(false);
  const [pendingPrintProduct, setPendingPrintProduct] = useState(null);

  const barcodeInputRef = useRef(null);
  const incomingQtyInputRef = useRef(null);
  const comboboxRef = useRef(null);

  // মডাল খুললে বারকোড ইনপুট বা প্রাক-নির্বাচিত পণ্যের কোয়ান্টিটিতে ফোকাস
  useEffect(() => {
    if (isOpen) {
      if (initialProductId) {
        setSelectedProductId(initialProductId);
        const prod = products.find((p) => p.ProductID === initialProductId);
        if (prod) {
          setUnitCost(prod.CostPrice || '');
        }
        setTimeout(() => {
          incomingQtyInputRef.current?.focus();
        }, 120);
      } else {
        setTimeout(() => {
          barcodeInputRef.current?.focus();
        }, 100);
      }
    } else {
      setSelectedProductId('');
      setBarcodeSearchQuery('');
      setIsSearchDropdownOpen(false);
      setIncomingQty('');
      setVariantQuantities({});
      setBulkVariantQty('');
      setSingleVariantQty('');
      setTargetLocation('Godown');
      setVariantRestockMode('all');
      setUnitCost('');
      setSupplierName('');
      setSelectedSupplierId('');
      setNotes('');
      setMobileTab('form');
      setCustomAddedVariants([]);
      setIsAddingNewColorOpen(false);
      setIsVariantRestockEnabled(false);
      setIsAddingNewSupplier(false);
      setNewColorName('');
      setNewColorStock('1');
      setNewColorBarcode('');
      setNewColorCostPrice('');
      setNewColorSellingPrice('');
    }
  }, [isOpen, initialProductId, products]);

  // হ্যান্ডলার ইউজার আপডেট
  useEffect(() => {
    if (activeUser?.FullName) {
      setHandledBy(activeUser.FullName);
    }
  }, [activeUser]);

  // বাইরে ক্লিক করলে সার্চ ড্রপডাউন বন্ধ করার হ্যান্ডলার
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // নির্বাচিত প্রোডাক্টের তথ্য
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.ProductID === selectedProductId) || null;
  }, [products, selectedProductId]);

  // পণ্যের ভ্যারিয়েন্ট তালিকা নিরাপদ এক্সট্র্যাক্ট
  const productVariants = useMemo(() => {
    if (!selectedProduct) return [];
    let list = selectedProduct.Variants;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch (e) {
        list = [];
      }
    }
    if ((!list || !list.length) && (selectedProduct.VariantsJSON || selectedProduct.variantsJSON)) {
      try {
        list = JSON.parse(selectedProduct.VariantsJSON || selectedProduct.variantsJSON);
      } catch (e) {
        list = [];
      }
    }
    return Array.isArray(list) ? list : [];
  }, [selectedProduct]);

  // পণ্যের মূল ভ্যারিয়েন্টের সাথে রিস্টকে সরাসরি নতুন যুক্ত কালার ভ্যারিয়েন্ট মার্জ করা
  const allVariants = useMemo(() => {
    return [...productVariants, ...customAddedVariants];
  }, [productVariants, customAddedVariants]);

  const hasVariants = allVariants.length > 0 || isVariantRestockEnabled;

  // মাস্টার ভ্যারিয়েন্ট ডাটাবেস থেকে নির্বাচিত টাইপের তালিকা (কুইক চিপস ও ড্রপডাউন)
  const activeTypeDbOptions = useMemo(() => {
    const list = (variantAttributes || [])
      .filter((va) => {
        const t = String(va.Type || va.type || va.AttributeType || va.attributeType || 'Color').trim().toLowerCase();
        return t === newColorType.toLowerCase();
      })
      .map((va) => String(va.OptionName || va.optionName || va.Name || va.name || '').trim())
      .filter(Boolean);
    const defaults = newColorType === 'Color'
      ? ['লাল', 'কালো', 'সাদা', 'নীল', 'সবুজ', 'হলুদ', 'গোলাপি', 'মেরুন', 'আকাশি', 'বেগুনি', 'কমলা', 'ধূসর', 'ফিরোজা', 'বাসন্তী', 'ম্যাজেন্টা', 'অফ-হোয়াইট', 'নেভি ব্লু']
      : newColorType === 'Size'
      ? ['S', 'M', 'L', 'XL', '2XL', '3XL', '38', '40', '42', '44', 'Free']
      : ['500gm', '1kg', '2kg', '5kg', '10kg', '25kg', '50kg'];
    return Array.from(new Set([...list, ...defaults]));
  }, [variantAttributes, newColorType]);

  const allColorOptions = activeTypeDbOptions;

  // থান একক কিনা ও প্রতি থানে গজ
  const isThanUnit = useMemo(() => {
    if (!selectedProduct) return false;
    const u = String(selectedProduct.Unit || '').trim().toLowerCase();
    return u === 'than' || u === 'থান';
  }, [selectedProduct]);

  const yardsPerThan = Number(selectedProduct?.YardsPerThan) || 0;

  // প্রোডাক্ট পরিবর্তন হলে ভ্যারিয়েন্ট স্টেট রিসেট ও ডিফল্ট নির্বাচন
  useEffect(() => {
    if (selectedProduct) {
      setVariantQuantities({});
      setBulkVariantQty('');
      setSingleVariantQty('');
      setCustomAddedVariants([]);
      setIsAddingNewColorOpen(false);
      setIsVariantRestockEnabled(false);
      if (allVariants.length > 0) {
        setSelectedSingleVariantId(allVariants[0].VariantID || '');
      }
    }
  }, [selectedProductId]);

  // নতুন সাপ্লায়ার তৈরি ও নির্বাচন হ্যান্ডলার (ডাটাবেস ও গুগল শিট সিঙ্ক সহ)
  const handleCreateSupplier = async () => {
    const comp = newSupplierCompany.trim();
    const contact = newSupplierContact.trim();
    const phone = newSupplierPhone.trim();
    if (!comp && !contact) {
      alert('অনুগ্রহ করে সাপ্লায়ার বা প্রতিষ্ঠানের নাম লিখুন!');
      return;
    }

    const newSupData = {
      SupplierID: `SUP-${Date.now().toString().slice(-6)}`,
      CompanyName: comp || contact,
      ContactPerson: contact,
      Phone: phone, // হোয়াটসঅ্যাপ নম্বর
      Address: newSupplierAddress.trim(),
      TotalPurchased: 0,
      TotalPaid: 0,
      CurrentPayable: 0
    };

    const updated = saveOrUpdateSupplierLocally(newSupData);
    setLocalSuppliersList(updated);

    if (onSaveSupplier) {
      try {
        await onSaveSupplier(newSupData);
      } catch (err) {
        console.warn('onSaveSupplier sync error:', err);
      }
    }

    setSelectedSupplierId(newSupData.SupplierID);
    setSupplierName(newSupData.CompanyName || newSupData.ContactPerson);
    setNewSupplierCompany('');
    setNewSupplierContact('');
    setNewSupplierPhone('');
    setNewSupplierAddress('');
    setIsAddingNewSupplier(false);
  };

  const handleSupplierSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW_SUPPLIER') {
      setIsAddingNewSupplier(true);
      return;
    }
    setSelectedSupplierId(val);
    const found = localSuppliersList.find((s) => String(s.SupplierID) === String(val));
    if (found) {
      setSupplierName(found.CompanyName || found.ContactPerson || '');
    } else if (!val) {
      setSupplierName('');
    }
  };

  // রিস্টকে সরাসরি নতুন কালার / ভ্যারিয়েন্ট যোগ করার হ্যান্ডলার
  const handleAddNewColorVariant = async (e) => {
    if (e) e.preventDefault();
    const cleanName = String(newColorName || '').trim();
    if (!cleanName) {
      alert(`অনুগ্রহ করে ${newColorType === 'Color' ? 'কালার / রঙের' : 'ভ্যারিয়েন্টের'} নাম লিখুন!`);
      return;
    }

    const exists = allVariants.some((v) => {
      const c = v.Color || v.color || v.Attributes?.Color || v.Attributes?.color || v.Attributes?.[newColorType];
      return String(c || '').trim().toLowerCase() === cleanName.toLowerCase();
    });

    if (exists) {
      alert(`'${cleanName}' নামের একটি ভ্যারিয়েন্ট ইতিমধ্যে এই তালিকায় বিদ্যমান!`);
      return;
    }

    const baseCost = newColorCostPrice !== '' ? Number(newColorCostPrice) : (Number(selectedProduct?.CostPrice) || 0);
    const baseSell = newColorSellingPrice !== '' ? Number(newColorSellingPrice) : (Number(selectedProduct?.SellingPrice) || 0);
    const stockQty = Math.max(0, Number(newColorStock) || (isThanUnit ? 1 : 10));
    const generatedVarId = `VAR-${Date.now().toString().slice(-5)}-${cleanName.replace(/\s+/g, '_')}`;
    const baseBarcode = selectedProduct?.Barcode || `PB-${selectedProduct?.ProductID || 'PROD'}`;
    const generatedBarcode = newColorBarcode.trim() || `${baseBarcode}-${cleanName.toLowerCase().replace(/\s+/g, '-')}`;

    const newVar = {
      VariantID: generatedVarId,
      VariantId: generatedVarId,
      Attributes: { [newColorType]: cleanName },
      Color: newColorType === 'Color' ? cleanName : '',
      Size: newColorType === 'Size' ? cleanName : '',
      Barcode: generatedBarcode,
      barcode: generatedBarcode,
      CostPrice: baseCost,
      SellingPrice: baseSell,
      WholesalePrice: Number(selectedProduct?.WholesalePrice || 0),
      GodownStock: targetLocation === 'Godown' ? 0 : 0,
      godownStock: targetLocation === 'Godown' ? 0 : 0,
      StockQuantity: targetLocation === 'Shop' ? 0 : 0,
      stockQuantity: targetLocation === 'Shop' ? 0 : 0,
      ShopStock: 0,
      isNewVariant: true
    };

    setCustomAddedVariants((prev) => [...prev, newVar]);
    setVariantQuantities((prev) => ({
      ...prev,
      [generatedVarId]: stockQty
    }));

    if (onAddVariantOption) {
      try {
        await onAddVariantOption({
          attributeType: newColorType,
          optionName: cleanName,
          status: 'Active'
        });
      } catch (err) {
        console.warn('Could not auto-add to master variants tab:', err);
      }
    }

    setNewColorName('');
    setNewColorStock(isThanUnit ? '1' : '10');
    setNewColorBarcode('');
    setNewColorCostPrice('');
    setNewColorSellingPrice('');
    setIsAddingNewColorOpen(false);
  };

  const handleRemoveCustomVariant = (varId) => {
    setCustomAddedVariants((prev) => prev.filter((v) => v.VariantID !== varId));
    setVariantQuantities((prev) => {
      const copy = { ...prev };
      delete copy[varId];
      return copy;
    });
  };

  // কার্যকর আগমনী পরিমাণ (ভ্যারিয়েন্ট থাকলে ভ্যারিয়েন্টগুলোর যোগফল, না থাকলে সরাসরি ইনপুট)
  const effectiveIncomingQty = useMemo(() => {
    if (!hasVariants) {
      return Number(incomingQty) || 0;
    }
    if (variantRestockMode === 'single') {
      return Number(singleVariantQty) || 0;
    }
    return Object.values(variantQuantities).reduce((acc, q) => acc + (Number(q) || 0), 0);
  }, [hasVariants, variantRestockMode, incomingQty, singleVariantQty, variantQuantities]);

  // থান এককের জন্য কার্যকর মোট গজ
  const effectiveTotalYards = useMemo(() => {
    if (!isThanUnit) return 0;
    return effectiveIncomingQty * yardsPerThan;
  }, [isThanUnit, effectiveIncomingQty, yardsPerThan]);

  // সব ভ্যারিয়েন্টে এক ক্লিকে সমান সংখ্যা বসানোর হ্যান্ডলার
  const handleApplyBulkQtyToAllVariants = () => {
    const val = Number(bulkVariantQty) || 0;
    if (val <= 0) {
      alert('অনুগ্রহ করে ১ বা তার বেশি কোনো সংখ্যা প্রদান করুন।');
      return;
    }
    const nextMap = {};
    allVariants.forEach((v) => {
      nextMap[v.VariantID] = val;
    });
    setVariantQuantities(nextMap);
  };

  // সার্চ বা বারকোড অনুযায়ী ফিল্টার করা প্রোডাক্ট তালিকা
  const filteredProductOptions = useMemo(() => {
    if (!barcodeSearchQuery.trim()) return products;
    const q = barcodeSearchQuery.trim().toLowerCase();
    return products.filter(
      (p) =>
        (p.Barcode && String(p.Barcode).toLowerCase().includes(q)) ||
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.ProductID && p.ProductID.toLowerCase().includes(q)) ||
        (p.Category && p.Category.toLowerCase().includes(q))
    );
  }, [products, barcodeSearchQuery]);

  // পণ্য নির্বাচন হ্যান্ডলার
  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    setIsSearchDropdownOpen(false);
    setBarcodeSearchQuery('');
    const prod = products.find((p) => p.ProductID === productId);
    if (prod) {
      setUnitCost(prod.CostPrice || '');
    }
    setTimeout(() => {
      incomingQtyInputRef.current?.focus();
    }, 60);
  };

  // বারকোড স্ক্যানার বা কীবোর্ডে Enter চাপলে স্বয়ংক্রিয় পণ্য সিলেক্ট
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = barcodeSearchQuery.trim().toLowerCase();
      if (!query) return;

      // ১. হুবহু বারকোড বা প্রোডাক্ট আইডি মিললে
      const exactMatch = products.find(
        (p) =>
          (p.Barcode && String(p.Barcode).trim().toLowerCase() === query) ||
          (p.ProductID && p.ProductID.trim().toLowerCase() === query)
      );

      if (exactMatch) {
        handleProductSelect(exactMatch.ProductID);
        return;
      }

      // ২. নাম বা আংশিক মিললে
      const partialMatch = products.find((p) =>
        p.ProductName.toLowerCase().includes(query) ||
        (p.Barcode && String(p.Barcode).toLowerCase().includes(query))
      );

      if (partialMatch) {
        handleProductSelect(partialMatch.ProductID);
      } else {
        alert(`'${barcodeSearchQuery}' বারকোড বা নামের কোনো পণ্য পাওয়া যায়নি!`);
      }
    }
  };

  // মোবাইল ক্যামেরা স্ক্যানার দিয়ে পণ্য নির্বাচন
  const handleCameraScanSuccess = (query) => {
    const clean = String(query).trim().toLowerCase();
    const exactMatch = products.find(
      (p) =>
        (p.Barcode && String(p.Barcode).trim().toLowerCase() === clean) ||
        (p.ProductID && p.ProductID.trim().toLowerCase() === clean)
    );

    if (exactMatch) {
      handleProductSelect(exactMatch.ProductID);
    } else {
      alert(`'${query}' বারকোডের কোনো পণ্য পাওয়া যায়নি!`);
    }
  };

  // দ্রুত পরিমাণ বৃদ্ধি হ্যান্ডলার
  const handleAddPresetQty = (amount) => {
    const current = parseInt(incomingQty, 10) || 0;
    setIncomingQty(String(current + amount));
  };

  // কিউমুলেটিভ স্টক ও ওয়েইটেড এভারেজ কস্ট (WAC) লাইভ ক্যালকুলেশন
  const calculations = useMemo(() => {
    if (!selectedProduct) return null;

    const prevStock = targetLocation === 'Godown'
      ? (Number(selectedProduct.GodownStock !== undefined ? selectedProduct.GodownStock : selectedProduct.StockQuantity) || 0)
      : (Number(selectedProduct.StockQuantity) || 0);

    const incoming = effectiveIncomingQty;
    const newStock = prevStock + incoming; // Cumulative stock

    const prevCost = Number(selectedProduct.CostPrice) || 0;
    const newLotCost = unitCost !== '' ? Number(unitCost) : prevCost;

    let weightedAvgCost = newLotCost;
    if (newStock > 0) {
      const prevTotalValue = prevStock * prevCost;
      const incomingTotalValue = incoming * newLotCost;
      weightedAvgCost = parseFloat(((prevTotalValue + incomingTotalValue) / newStock).toFixed(2));
    }

    const prevStockValue = prevStock * prevCost;
    const incomingBatchValue = incoming * newLotCost;
    const totalNewStockValue = newStock * weightedAvgCost;
    const stockGrowthPercentage = prevStock > 0 
      ? Math.round((incoming / prevStock) * 100) 
      : 100;

    const costDiff = parseFloat((weightedAvgCost - prevCost).toFixed(2));

    return {
      prevStock,
      incoming,
      newStock,
      prevCost,
      newLotCost,
      weightedAvgCost,
      prevStockValue,
      incomingBatchValue,
      totalNewStockValue,
      stockGrowthPercentage,
      costDiff
    };
  }, [selectedProduct, targetLocation, effectiveIncomingQty, unitCost]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('অনুগ্রহ করে একটি পণ্য নির্বাচন করুন।');
      return;
    }

    const qtyNumber = effectiveIncomingQty;
    if (!qtyNumber || qtyNumber <= 0) {
      alert(hasVariants 
        ? 'অনুগ্রহ করে অন্তত একটি ভ্যারিয়েন্টে নতুন স্টকের পরিমাণ প্রদান করুন (১ বা তার বেশি)।' 
        : 'সঠিক নতুন স্টকের পরিমাণ প্রদান করুন (১ বা তার বেশি)।'
      );
      return;
    }

    // ভ্যারিয়েন্ট স্টক গণনা
    let updatedVariants = null;
    if (hasVariants && allVariants.length > 0) {
      updatedVariants = allVariants.map((v) => {
        const vId = v.VariantID;
        let incomingForV = 0;
        if (variantRestockMode === 'single') {
          if (vId === selectedSingleVariantId) {
            incomingForV = Number(singleVariantQty) || 0;
          }
        } else {
          incomingForV = Number(variantQuantities[vId]) || 0;
        }

        const prevVStock = Number(v.StockQuantity || 0);
        const prevVGodown = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : prevVStock));

        return {
          ...v,
          StockQuantity: targetLocation === 'Shop' ? (prevVStock + incomingForV) : prevVStock,
          stockQuantity: targetLocation === 'Shop' ? (prevVStock + incomingForV) : prevVStock,
          GodownStock: targetLocation === 'Godown' ? (prevVGodown + incomingForV) : prevVGodown,
          godownStock: targetLocation === 'Godown' ? (prevVGodown + incomingForV) : prevVGodown,
          TotalStock: (targetLocation === 'Shop' ? (prevVStock + incomingForV) : prevVStock) + (targetLocation === 'Godown' ? (prevVGodown + incomingForV) : prevVGodown),
        };
      });
    }

    setIsSubmitting(true);
    try {
      await onSubmitStock({
        productId: selectedProduct.ProductID,
        productName: selectedProduct.ProductName,
        incomingQty: qtyNumber,
        unitCost: unitCost !== '' ? Number(unitCost) : Number(selectedProduct.CostPrice),
        supplierId: selectedSupplierId,
        supplierName: supplierName.trim() || 'General Supplier',
        handledBy: handledBy.trim() || activeUser?.FullName || 'Admin',
        notes: notes.trim() || `${targetLocation === 'Godown' ? 'গোডাউন' : 'দোকান'} রিস্টক লট`,
        location: targetLocation,
        updatedVariants: updatedVariants,
        variants: updatedVariants,
        isThanUnit: isThanUnit,
        incomingThans: isThanUnit ? qtyNumber : 0,
        incomingYards: isThanUnit ? effectiveTotalYards : 0,
      });

      const restockedProd = {
        ProductName: selectedProduct.ProductName,
        Barcode: selectedProduct.Barcode,
        SellingPrice: Number(selectedProduct.SellingPrice) || 0,
        Unit: selectedProduct.Unit,
        StockQuantity: qtyNumber
      };

      // রিসেট ও ক্লোজ
      setSelectedProductId('');
      setBarcodeSearchQuery('');
      setIncomingQty('');
      setVariantQuantities({});
      setBulkVariantQty('');
      setSingleVariantQty('');
      setUnitCost('');
      setSupplierName('');
      setSelectedSupplierId('');
      setNotes('');

      if (autoPrintStickersOnRestock && restockedProd.Barcode) {
        setPendingPrintProduct(restockedProd);
        setIsStickerModalOpen(true);
      } else {
        onClose();
      }
    } catch (err) {
      alert(`স্টক আপডেট ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 sm:py-6 animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white rounded-3xl shadow-sm border border-slate-200/90 w-full flex-1 min-h-[calc(100vh-6.5rem)] overflow-hidden flex flex-col transition-all" : "bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh] transition-all animate-in zoom-in-95 duration-200"}>
        
        {/* মডাল হেডার (Header Bar with 1-Click Segmented Location Toggle) */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 bg-gradient-to-r from-slate-50 via-teal-50/25 to-white relative select-none">
          
          {/* বাম পাশে ব্র্যান্ডিং ও টাইটেল */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0 ring-4 ring-teal-50">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  গোডাউন রিস্টক ও লট বৃদ্ধি
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs">
                  WAC ওয়েইটেড কস্ট সিঙ্ক
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                পূর্বের মজুতের সাথে নতুন লটের সংখ্যা ও কেনা দাম স্বয়ংক্রিয় সমন্বয়
              </p>
            </div>
          </div>

          {/* ডান পাশে: লোকেশন টগল ও ব্যাক বাটন */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* মোবাইল মোডে ট্যাব সুইচ বাটন */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  mobileTab === 'form' 
                    ? 'bg-white text-teal-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ফর্ম
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('analytics')}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1 transition-all ${
                  mobileTab === 'analytics' 
                    ? 'bg-white text-teal-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>হিসাব</span>
              </button>
            </div>

            {/* ১-ক্লিক সেগমেন্টেড লোকেশন টগল (1-Click Segmented Location Pill) */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setTargetLocation('Godown')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  targetLocation === 'Godown'
                    ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="ওয়্যারহাউজ বা কেন্দ্রীয় গোডাউনে মাল জমা হবে"
              >
                <Warehouse className="w-3.5 h-3.5" />
                <span>🏭 কেন্দ্রীয় গোডাউন</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetLocation('Shop')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  targetLocation === 'Shop'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="দোকানের বিক্রয় কাউন্টারে সরাসরি মাল জমা হবে"
              >
                <Store className="w-3.5 h-3.5" />
                <span>🏬 শো-রুম কাউন্টার</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                embedded
                  ? 'bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-1.5 border border-slate-200 shadow-2xs'
                  : 'w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 justify-center'
              }`}
              title={embedded ? "ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            
            {/* বাম কলাম: স্টক ইনপুট ফর্ম (৭ কলাম) */}
            <div className={`lg:col-span-7 p-5 sm:p-7 space-y-5 ${mobileTab === 'analytics' ? 'hidden lg:block' : 'block'}`}>
              
              {/* সেকশন ১: স্মার্ট কম্বোবক্স ও পণ্য নির্বাচন (Smart Combobox) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                  <span className="text-xs font-black text-slate-800 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <span>১. পণ্য অনুসন্ধান ও নির্বাচন</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCameraScannerOpen(true)}
                      className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-teal-200 hover:bg-teal-50 transition-all shadow-2xs cursor-pointer"
                      title="মোবাইল বা ওয়েবক্যাম দিয়ে পণ্যের বারকোড স্ক্যান করুন"
                    >
                      <Camera className="w-3.5 h-3.5 text-teal-600" />
                      <span>ক্যামেরা স্ক্যান</span>
                    </button>
                  </div>
                </div>

                {/* নির্বাচিত পণ্যের হিরো কার্ড (Selected Product Hero Card) */}
                {selectedProduct ? (
                  <div className="bg-white border-2 border-teal-400/80 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-14 h-14 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs">
                          {selectedProduct.ImageUrl ? (
                            <img
                              src={selectedProduct.ImageUrl}
                              alt={selectedProduct.ProductName}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <Package className="w-6 h-6 text-teal-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                              {selectedProduct.Category || 'General'}
                            </span>
                            {selectedProduct.Barcode && (
                              <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                #{selectedProduct.Barcode}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-1 leading-snug">
                            {selectedProduct.ProductName}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mt-1">
                            <span>আইডি: <strong className="text-slate-700 font-mono">{selectedProduct.ProductID}</strong></span>
                            <span>•</span>
                            <span>একক: <strong className="text-teal-700">{selectedProduct.Unit || 'Pcs'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId('');
                          setBarcodeSearchQuery('');
                          setTimeout(() => barcodeInputRef.current?.focus(), 80);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 hover:border-teal-300 transition-all cursor-pointer shrink-0 shadow-2xs"
                        title="অন্য পণ্য নির্বাচন করুন"
                      >
                        পণ্য পরিবর্তন করুন
                      </button>
                    </div>

                    {/* বর্তমান লোকেশন অনুযায়ী লাইভ স্টক স্ট্যাটাস চিপস */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                          <span>গোডাউন মজুদ: <strong>{selectedProduct.GodownStock !== undefined ? selectedProduct.GodownStock : 0} {selectedProduct.Unit || 'Pcs'}</strong></span>
                        </span>
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Store className="w-3.5 h-3.5 text-blue-600" />
                          <span>কাউন্টার মজুদ: <strong>{selectedProduct.StockQuantity || 0} {selectedProduct.Unit || 'Pcs'}</strong></span>
                        </span>
                      </div>

                      {isThanUnit && yardsPerThan > 0 && (
                        <span className="text-[11px] font-bold text-teal-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          📏 {yardsPerThan} গজ / প্রতি থান
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* স্মার্ট কম্বোবক্স ইনপুট (Smart Combobox Input) */
                  <div ref={comboboxRef} className="relative">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      পণ্যের নাম, বারকোড বা আইডি খুঁজুন *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeSearchQuery}
                        onChange={(e) => {
                          setBarcodeSearchQuery(e.target.value);
                          setIsSearchDropdownOpen(true);
                        }}
                        onFocus={() => setIsSearchDropdownOpen(true)}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder="বারকোড স্ক্যান করুন বা পণ্যের নাম লিখে খুঁজুন..."
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 transition-all shadow-2xs"
                      />
                      <Barcode className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                    </div>

                    {/* লাইভ ড্রপডাউন সাজেশন লিস্ট (Instant Suggestions) */}
                    {isSearchDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        {filteredProductOptions.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            '{barcodeSearchQuery}' দিয়ে কোনো পণ্য পাওয়া যায়নি!
                          </div>
                        ) : (
                          filteredProductOptions.slice(0, 15).map((p) => {
                            const gStock = p.GodownStock !== undefined ? p.GodownStock : 0;
                            const sStock = p.StockQuantity || 0;
                            return (
                              <div
                                key={p.ProductID}
                                onClick={() => handleProductSelect(p.ProductID)}
                                className="p-2.5 sm:px-3.5 hover:bg-teal-50/60 cursor-pointer transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                                    {p.ImageUrl ? (
                                      <img src={p.ImageUrl} alt={p.ProductName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                    ) : (
                                      <Package className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-bold text-slate-900 truncate">
                                      {p.ProductName}
                                    </h5>
                                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                      {p.Barcode && <span className="font-mono">#{p.Barcode}</span>}
                                      <span>•</span>
                                      <span className="text-teal-700 font-semibold">{p.Category || 'General'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    🏭 {gStock}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    🏬 {sStock} {p.Unit || 'Pcs'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* সেকশন ২: নতুন আগমনী পরিমাণ ও ভ্যারিয়েন্ট রিস্টক */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                  <span className="text-xs font-black text-slate-800 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>২. লটের আগমনী পরিমাণ ও কেনা দাম</span>
                  </span>
                  {selectedProduct && (
                    <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                      গন্তব্য: {targetLocation === 'Godown' ? '🏭 কেন্দ্রীয় গোডাউন' : '🏬 শো-রুম কাউন্টার'}
                    </span>
                  )}
                </div>

                {/* যদি পণ্যটিতে ভ্যারিয়েন্ট থাকে (রং / সাইজ / থান অনুযায়ী) */}
                {hasVariants ? (
                  <div className="bg-white border border-teal-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-teal-100">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-slate-900">
                            ভ্যারিয়েন্ট ভিত্তিক রিস্টক ({allVariants.length}টি ভ্যারিয়েন্ট)
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            {isThanUnit ? 'প্রতিটি রঙের জন্য পৃথক থান সংখ্যা বসান' : 'প্রতিটি ভ্যারিয়েন্টের নতুন লটের সংখ্যা নির্ধারণ করুন'}
                          </p>
                        </div>
                      </div>

                      {/* মোড সুইচ বাটন */}
                      <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setVariantRestockMode('all')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            variantRestockMode === 'all'
                              ? 'bg-white text-teal-800 shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          সকল ভ্যারিয়েন্ট তালিকা
                        </button>
                        <button
                          type="button"
                          onClick={() => setVariantRestockMode('single')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            variantRestockMode === 'single'
                              ? 'bg-white text-teal-800 shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          একক ভ্যারিয়েন্ট
                        </button>
                      </div>
                    </div>

                    {/* নতুন ভ্যারিয়েন্ট যোগ করার টগল বাটন */}
                    <div className="flex items-center justify-between bg-teal-50/60 p-3 rounded-2xl border border-teal-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800">
                          লটে নতুন কোনো কালার বা ভ্যারিয়েন্ট এসেছে?
                        </span>
                        <span className="text-[10px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full font-bold">
                          অন-দ্য-ফ্লাই এন্ট্রি
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewColorOpen((prev) => !prev)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5 shadow-2xs ${
                          isAddingNewColorOpen
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        {isAddingNewColorOpen ? (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>ফর্ম বন্ধ করুন</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ নতুন ভ্যারিয়েন্ট যোগ করুন</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* নতুন ভ্যারিয়েন্ট যোগ করার ফর্ম ড্রয়ার */}
                    {isAddingNewColorOpen && (
                      <div className="p-4 bg-gradient-to-br from-white via-teal-50/40 to-indigo-50/30 border-2 border-teal-300 rounded-2xl shadow-sm space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                          <div className="flex items-center space-x-1.5 text-xs font-black text-teal-900">
                            <Palette className="w-4 h-4 text-teal-600" />
                            <span>নতুন ভ্যারিয়েন্টের স্টক যোগ করুন</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">
                            লটের সাথে সরাসরি যুক্ত হবে
                          </span>
                        </div>

                        {/* ভ্যারিয়েন্টের ধরণ ও ডাটাবেস ড্রপডাউন */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              ১. ভ্যারিয়েন্টের ধরণ নির্বাচন করুন <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={newColorType}
                              onChange={(e) => {
                                setNewColorType(e.target.value);
                                setNewColorName('');
                              }}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            >
                              <option value="Color">🎨 রঙ / কালার (Color)</option>
                              <option value="Size">📏 সাইজ / মাপ (Size)</option>
                              <option value="Weight">⚖️ ওজন / পরিমাপ (Weight)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              ২. ডাটাবেসের তালিকা ({allColorOptions.length}টি সংরক্ষিত):
                            </label>
                            <select
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            >
                              <option value="">
                                -- {newColorType === 'Color' ? 'রং নির্বাচন করুন' : newColorType === 'Size' ? 'সাইজ নির্বাচন করুন' : 'ওজন নির্বাচন করুন'} --
                              </option>
                              {allColorOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* কুইক চিপস */}
                        <div>
                          <div className="text-[10.5px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                              <span>১-ক্লিকে দ্রুত বাছাই ({newColorType}):</span>
                            </span>
                            <span className="text-[10px] text-teal-700 font-semibold">{allColorOptions.length}টি অপশন</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white/90 rounded-xl border border-slate-200">
                            {allColorOptions.map((c) => {
                              const dotColor = newColorType === 'Color' ? getColorHex(c) : null;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setNewColorName(c)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border inline-flex items-center space-x-1.5 ${
                                    newColorName === c
                                      ? 'bg-teal-600 text-white border-teal-700 shadow-xs ring-1 ring-teal-400'
                                      : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {dotColor && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                                      style={{ backgroundColor: dotColor }}
                                    />
                                  )}
                                  <span>{c}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ইনপুট গ্রিড */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              ৩. নাম <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              placeholder={`যেমন: ${newColorType === 'Color' ? 'ফিরোজা বা রয়্যাল ব্লু' : newColorType === 'Size' ? 'XL বা 42' : '1kg'}`}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              লটে আগত পরিমাণ ({isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'}) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newColorStock}
                              onChange={(e) => setNewColorStock(e.target.value)}
                              placeholder={isThanUnit ? '1' : '10'}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-black text-teal-800 text-center focus:ring-2 focus:ring-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              বারকোড (ঐচ্ছিক)
                            </label>
                            <input
                              type="text"
                              value={newColorBarcode}
                              onChange={(e) => setNewColorBarcode(e.target.value)}
                              placeholder="স্বয়ংক্রিয় তৈরি হবে"
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-600 focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingNewColorOpen(false)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            বাতিল
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewColorVariant}
                            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>এই ভ্যারিয়েন্টটি লটে যোগ করুন</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* সকল ভ্যারিয়েন্ট তালিকা মোড */}
                    {variantRestockMode === 'all' ? (
                      <div className="space-y-3.5">
                        {/* কুইক বাল্ক ফিল বার */}
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                          <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>সব ভ্যারিয়েন্টে এক ক্লিকে সমান সংখ্যা:</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="সংখ্যা"
                              value={bulkVariantQty}
                              onChange={(e) => setBulkVariantQty(e.target.value)}
                              className="w-18 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center focus:ring-1 focus:ring-teal-500"
                            />
                            <button
                              type="button"
                              onClick={handleApplyBulkQtyToAllVariants}
                              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                            >
                              সবগুলোতে দিন
                            </button>
                          </div>
                        </div>

                        {/* ভ্যারিয়েন্ট তালিকা টেবিল */}
                        <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-200 rounded-2xl shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 z-5 border-b border-slate-200 text-[11px]">
                              <tr>
                                <th className="p-3">ভ্যারিয়েন্ট / কালার বিবরণ</th>
                                <th className="p-3 text-center">বর্তমান মজুদ</th>
                                <th className="p-3 text-center">
                                  + নতুন আগমন ({isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'})
                                </th>
                                <th className="p-3 text-right pr-4">নতুন সমন্বিত মোট</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {allVariants.map((v) => {
                                const vId = v.VariantID;
                                const currentStock = targetLocation === 'Godown'
                                  ? (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : v.StockQuantity)) || 0)
                                  : (Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0)) || 0);
                                const incomingForV = Number(variantQuantities[vId]) || 0;
                                const newVStock = currentStock + incomingForV;
                                const vColor = v.Attributes?.Color || v.Color || '';
                                const vSize = v.Attributes?.Size || v.Size || '';
                                const hexColor = getColorHex(vColor);

                                return (
                                  <tr key={vId} className={`hover:bg-teal-50/40 transition-colors ${v.isNewVariant ? 'bg-amber-50/40' : ''}`}>
                                    <td className="p-3">
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        {vColor && (
                                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                            <span
                                              className="w-3 h-3 rounded-full border border-black/15 shrink-0"
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
                                        {!vColor && !vSize && (
                                          <span className="font-bold text-slate-800 text-xs">
                                            {v.Attributes ? Object.values(v.Attributes).join(' / ') : vId}
                                          </span>
                                        )}
                                        {v.isNewVariant && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
                                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                            <span>নতুন</span>
                                          </span>
                                        )}
                                        {v.isNewVariant && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveCustomVariant(v.VariantID)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                            title="এই নতুন ভ্যারিয়েন্টটি তালিকা থেকে বাদ দিন"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      {v.Barcode && (
                                        <span className="text-[10px] font-mono text-slate-400 block mt-1">
                                          #{v.Barcode}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                                        {currentStock} {isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="inline-flex items-center space-x-1">
                                        <span className="text-teal-600 font-bold">+</span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={variantQuantities[vId] !== undefined ? variantQuantities[vId] : ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setVariantQuantities((prev) => ({
                                              ...prev,
                                              [vId]: val
                                            }));
                                          }}
                                          className="w-18 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-center text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                                        />
                                      </div>
                                    </td>
                                    <td className="p-3 text-right pr-4">
                                      <span className={`px-3 py-1 rounded-xl text-xs font-black inline-flex items-center space-x-1 ${
                                        incomingForV > 0
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                                      }`}>
                                        <span>{newVStock}</span>
                                        <span className="text-[10px] text-slate-500 font-normal">{isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}</span>
                                      </span>
                                      {isThanUnit && yardsPerThan > 0 && incomingForV > 0 && (
                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 block mt-1 text-right">
                                          = {newVStock * yardsPerThan} গজ
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* ভ্যারিয়েন্ট সামারি বার */}
                        <div className="p-3 bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white rounded-2xl border border-teal-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-slate-700 font-bold">
                            মোট আগত লট স্টক (সকল ভ্যারিয়েন্ট মিলিয়ে):
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-teal-900 bg-white px-3 py-1 rounded-xl border border-teal-200 shadow-2xs">
                              +{effectiveIncomingQty} {isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'}
                            </span>
                            {isThanUnit && yardsPerThan > 0 && (
                              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                                = {effectiveTotalYards} গজ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* একক ভ্যারিয়েন্ট মোড */
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            নির্দিষ্ট ভ্যারিয়েন্ট নির্বাচন করুন *
                          </label>
                          <select
                            value={selectedSingleVariantId}
                            onChange={(e) => setSelectedSingleVariantId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 shadow-2xs"
                          >
                            {allVariants.map((v) => {
                              const cur = targetLocation === 'Godown'
                                ? (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : v.StockQuantity)) || 0)
                                : (Number(v.StockQuantity !== undefined ? v.StockQuantity : (v.stockQuantity !== undefined ? v.stockQuantity : 0)) || 0);
                              const label = v.Attributes
                                ? Object.entries(v.Attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
                                : (v.Color || v.Size || v.VariantID);
                              return (
                                <option key={v.VariantID} value={v.VariantID}>
                                  {v.isNewVariant ? '✨ [নতুন] ' : ''}{label} (বর্তমান মজুদ: {cur} {isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            এই ভ্যারিয়েন্টের নতুন আগত পরিমাণ ({isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'}) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-bold text-teal-600">+</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="পরিমাণ লিখুন"
                              value={singleVariantQty}
                              onChange={(e) => setSingleVariantQty(e.target.value)}
                              className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                            />
                          </div>
                          {isThanUnit && yardsPerThan > 0 && singleVariantQty && (
                            <p className="text-xs text-teal-800 font-bold mt-1.5 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block">
                              = {Number(singleVariantQty) * yardsPerThan} গজ ({singleVariantQty} থান × {yardsPerThan} গজ/থান)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* সাধারণ পণ্য (ভ্যারিয়েন্ট ছাড়া) */
                  <div className="space-y-4">
                    {/* অপশন: সাধারণ পণ্যকে কালার ভিত্তিক রিস্টক এন্ট্রি করার অপশন */}
                    {selectedProduct && (
                      <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-teal-50/70 to-emerald-50/50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                        <div className="flex items-center space-x-2.5 text-teal-900">
                          <Palette className="w-4 h-4 text-teal-600 shrink-0" />
                          <div>
                            <span className="text-xs font-bold block">
                              কালার বা সাইজ ভিত্তিক লট রিস্টক করতে চান?
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              কালার অপশন চালু করে প্রতিটি রঙের আলাদা থান/পিস স্টক এন্ট্রি করুন
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsVariantRestockEnabled(true);
                            setIsAddingNewColorOpen(true);
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs inline-flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ কালার ভিত্তিক রিস্টক চালু করুন</span>
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* নতুন স্টক পরিমাণ */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>নতুন আসা পরিমাণ (Incoming Qty) *</span>
                          {selectedProduct && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              বর্তমান: {targetLocation === 'Godown' ? (selectedProduct.GodownStock || 0) : (selectedProduct.StockQuantity || 0)} {selectedProduct.Unit || 'Pcs'}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs font-bold text-teal-600">
                            +
                          </span>
                          <input
                            ref={incomingQtyInputRef}
                            type="number"
                            min="1"
                            required
                            placeholder="যেমন: 50"
                            value={incomingQty}
                            onChange={(e) => setIncomingQty(e.target.value)}
                            className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 transition-all shadow-2xs"
                          />
                        </div>

                        {/* দ্রুত সংখ্যা প্রিসেট বাটন */}
                        <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold">কুইক অ্যাড:</span>
                          {QUANTITY_PRESETS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleAddPresetQty(amt)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>

                        {isThanUnit && yardsPerThan > 0 && incomingQty && (
                          <div className="mt-2.5 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                            <span>📏 মোট গজ:</span>
                            <span className="text-sm font-black text-emerald-900">{Number(incomingQty) * yardsPerThan} গজ</span>
                            <span className="text-[10px] text-slate-500">({incomingQty} থান × {yardsPerThan} গজ/থান)</span>
                          </div>
                        )}
                      </div>

                      {/* ক্রয়মূল্য ইনপুট */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>প্রতি ইউনিটের কেনা দাম (Unit Cost) *</span>
                          {selectedProduct && (
                            <button
                              type="button"
                              onClick={() => setUnitCost(selectedProduct.CostPrice || '')}
                              className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline"
                              title="পূর্বের কেনা দাম ফিরিয়ে আনুন"
                            >
                              আগের দাম: {currencySymbol}{Number(selectedProduct.CostPrice || 0).toFixed(2)}
                            </button>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="যেমন: 450.00"
                            value={unitCost}
                            onChange={(e) => setUnitCost(e.target.value)}
                            className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 transition-all shadow-2xs"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                          দাম পরিবর্তন হলে স্বয়ংক্রিয়ভাবে ওয়েইটেড এভারেজ কস্ট (WAC) হিসেব হবে
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* যদি ভ্যারিয়েন্ট থাকে, কেনা দাম আলাদা কার্ডে দেখান */}
                {hasVariants && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-2xl">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>লটের গড় কেনা দাম (Unit Cost) *</span>
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={() => setUnitCost(selectedProduct.CostPrice || '')}
                          className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline"
                          title="পূর্বের কেনা দাম ফিরিয়ে আনুন"
                        >
                          আগের দাম: {currencySymbol}{Number(selectedProduct.CostPrice || 0).toFixed(2)}
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="যেমন: 450.00"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      দাম পরিবর্তন হলে স্বয়ংক্রিয়ভাবে সমন্বিত ওয়েইটেড এভারেজ কস্ট (WAC) হিসেব হবে
                    </p>
                  </div>
                )}

                {/* রিস্টক বারকোড স্টিকার প্রিন্ট কার্ড */}
                {selectedProduct && (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 to-teal-50/50 border border-indigo-200/80 rounded-2xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">
                          রিস্টক বারকোড স্টিকার প্রিন্ট:
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                          {selectedProduct.Barcode || 'বারকোড নেই'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedProduct.Barcode) {
                            alert('এই পণ্যের কোনো বারকোড নম্বর নির্ধারণ করা নেই।');
                            return;
                          }
                          setPendingPrintProduct({
                            ProductName: selectedProduct.ProductName,
                            Barcode: selectedProduct.Barcode,
                            SellingPrice: Number(selectedProduct.SellingPrice) || 0,
                            Unit: selectedProduct.Unit,
                            StockQuantity: Number(effectiveIncomingQty) || Number(selectedProduct.StockQuantity) || 10
                          });
                          setIsStickerModalOpen(true);
                        }}
                        disabled={!selectedProduct.Barcode}
                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{effectiveIncomingQty > 0 ? `${effectiveIncomingQty}টি স্টিকার প্রিন্ট` : 'স্টিকার প্রিন্ট করুন'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-100/70 text-xs text-slate-600">
                      <span className="text-[11px] text-slate-500">
                        নতুন আসা লটের পণ্যে লাগানোর জন্য লেবেল প্রিন্ট করুন
                      </span>
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoPrintStickersOnRestock}
                          onChange={(e) => setAutoPrintStickersOnRestock(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] font-bold text-indigo-950">
                          রিস্টক শেষে স্বয়ংক্রিয় প্রিন্ট
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* সেকশন ৩: সাপ্লায়ার ও ভেন্ডর খাতা ইন্টিগ্রেশন এবং অডিট ট্র্যাকিং */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                  <span className="text-xs font-black text-slate-800 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span>৩. সাপ্লায়ার ও ভেন্ডর খাতা এবং চালান নোট</span>
                  </span>
                  <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                    সাপ্লায়ার ডাটাবেস সিঙ্ক
                  </span>
                </div>

                {/* সাপ্লায়ার নির্বাচন বা নতুন সাপ্লায়ার তৈরি */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span>সাপ্লায়ার ও ভেন্ডর (Supplier / Vendor) *</span>
                    </label>
                    {!isAddingNewSupplier && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewSupplier(true)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200 transition-all cursor-pointer inline-flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ নতুন সাপ্লায়ার</span>
                      </button>
                    )}
                  </div>

                  {isAddingNewSupplier ? (
                    /* নতুন সাপ্লায়ার ইনপুট কার্ড (WhatsApp Field সহ) */
                    <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/50 border-2 border-indigo-300 rounded-2xl shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                        <span className="text-xs font-black text-indigo-900 flex items-center space-x-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          <span>নতুন সাপ্লায়ার এন্ট্রি (সাপ্লায়ার খাতায় যুক্ত হবে)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewSupplier(false)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            প্রতিষ্ঠানের / কোম্পানির নাম <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: আনোয়ার টেক্সটাইল বা মেসার্স ট্রেডার্স"
                            value={newSupplierCompany}
                            onChange={(e) => setNewSupplierCompany(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            স্বত্বাধিকারী / যোগাযোগকারীর নাম
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: হাজী আব্দুল করিম"
                            value={newSupplierContact}
                            onChange={(e) => setNewSupplierContact(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            হোয়াটসঅ্যাপ নম্বর (WhatsApp Number) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: 017xxxxxxxx"
                            value={newSupplierPhone}
                            onChange={(e) => setNewSupplierPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            ঠিকানা / বাজার
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: ইসলামপুর, ঢাকা"
                            value={newSupplierAddress}
                            onChange={(e) => setNewSupplierAddress(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCreateSupplier}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>সাপ্লায়ার সংরক্ষণ ও নির্বাচন করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewSupplier(false)}
                          className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ড্রপডাউন থেকে সাপ্লায়ার নির্বাচন */
                    <div className="space-y-2">
                      <div className="relative">
                        <Truck className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <select
                          value={selectedSupplierId}
                          onChange={handleSupplierSelectChange}
                          className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        >
                          <option value="">-- সাপ্লায়ার নির্বাচন করুন ({localSuppliersList.length} জন সংরক্ষিত) --</option>
                          {localSuppliersList.map((sup) => (
                            <option key={sup.SupplierID} value={sup.SupplierID}>
                              {sup.CompanyName || sup.ContactPerson} {sup.Phone ? `(${sup.Phone})` : ''} {sup.Address ? ` - ${sup.Address}` : ''}
                            </option>
                          ))}
                          <option value="NEW_SUPPLIER">+ নতুন সাপ্লায়ার তৈরি করুন...</option>
                        </select>
                      </div>

                      {/* কুইক সাম্প্রতিক সাপ্লায়ার চিপস */}
                      {localSuppliersList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-semibold self-center">কুইক সিলেক্ট:</span>
                          {localSuppliersList.slice(0, 4).map((sup) => (
                            <button
                              key={sup.SupplierID}
                              type="button"
                              onClick={() => {
                                setSelectedSupplierId(sup.SupplierID);
                                setSupplierName(sup.CompanyName || sup.ContactPerson || '');
                              }}
                              className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all shadow-2xs cursor-pointer ${
                                selectedSupplierId === sup.SupplierID
                                  ? 'bg-indigo-600 text-white border-indigo-700'
                                  : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {sup.CompanyName || sup.ContactPerson}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* দায়িত্বপ্রাপ্ত ব্যক্তি */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      দায়িত্বপ্রাপ্ত ব্যক্তি (Handled By)
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="অ্যাডমিন বা ব্যবহারকারীর নাম"
                        value={handledBy}
                        onChange={(e) => setHandledBy(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* চালান বা রেফারেন্স নোট */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      চালান বা ভাউচার নম্বর (Notes)
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="যেমন: চালান #১০৫, লট রিস্টক..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* কুইক নোট চিপস */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold self-center">দ্রুত নোট:</span>
                  {NOTE_PRESETS.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setNotes(note)}
                      className="text-[10px] px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-teal-800 transition-all shadow-2xs font-bold cursor-pointer"
                    >
                      + {note}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* ডান কলাম: আধুনিক সফট-বেন্টো অ্যানালিটিক্স প্যানেল (Soft-Bento Analytics Panel) */}
            <div className={`lg:col-span-5 p-5 sm:p-7 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50 space-y-5 ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
              
              <div className="sticky top-4 space-y-4">
                
                {/* অ্যানালিটিক্স হেডার */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-teal-600" />
                      <span>রিস্টক ব্যালেন্স ও WAC অ্যানালিটিক্স</span>
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full border border-teal-200 shadow-2xs">
                    রিয়েল-টাইম
                  </span>
                </div>

                {selectedProduct && calculations ? (
                  <>
                    {/* বেন্টো কার্ড ১: স্টক প্রবৃদ্ধি রূপান্তর (Cumulative Growth) */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
                      <div className="flex items-center justify-between text-xs font-black text-slate-900">
                        <span className="flex items-center space-x-2">
                          <Layers className="w-4 h-4 text-teal-600" />
                          <span>স্টক প্রবৃদ্ধি রূপান্তর</span>
                        </span>
                        <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          +{calculations.stockGrowthPercentage}% প্রবৃদ্ধি
                        </span>
                      </div>

                      {/* ৩-ধাপের ভিজ্যুয়াল স্টক ব্যালেন্স কার্ড */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            পূর্বের ({targetLocation === 'Godown' ? 'গোডাউন' : 'কাউন্টার'})
                          </span>
                          <span className="text-sm sm:text-base font-black text-slate-800">
                            {calculations.prevStock}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-semibold">{isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}</span>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-teal-50 border border-teal-200">
                          <span className="text-[10px] font-bold text-teal-800 block mb-0.5">+ নতুন আগমন</span>
                          <span className="text-sm sm:text-base font-black text-teal-700">
                            +{calculations.incoming}
                          </span>
                          <span className="text-[10px] text-teal-700 block font-semibold">
                            {isThanUnit ? (
                              <span>থান {yardsPerThan > 0 ? `(${effectiveTotalYards} গজ)` : ''}</span>
                            ) : (
                              selectedProduct.Unit || 'Pcs'
                            )}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-sm">
                          <span className="text-[10px] font-bold text-emerald-100 block mb-0.5">= নতুন মোট</span>
                          <span className="text-sm sm:text-base font-black text-white">
                            {calculations.newStock}
                          </span>
                          <span className="text-[10px] text-emerald-100 block font-semibold">{isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}</span>
                        </div>
                      </div>

                      {/* প্রোগ্রেস বার */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>স্টক অনুপাত</span>
                          <span>{calculations.prevStock} ➔ {calculations.newStock} {selectedProduct.Unit || 'Pcs'}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                          <div 
                            className="h-full bg-slate-400 transition-all duration-300" 
                            style={{ width: `${calculations.newStock > 0 ? (calculations.prevStock / calculations.newStock) * 100 : 0}%` }}
                            title={`পূর্বের মজুদ: ${calculations.prevStock}`}
                          />
                          <div 
                            className="h-full bg-teal-500 transition-all duration-300" 
                            style={{ width: `${calculations.newStock > 0 ? (calculations.incoming / calculations.newStock) * 100 : 0}%` }}
                            title={`নতুন আগমন: ${calculations.incoming}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* বেন্টো কার্ড ২: লট খরচ ও ইনভেন্টরি ভ্যালু গ্রিড */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-indigo-200/90 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-indigo-700 flex items-center space-x-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>এই লটের মোট খরচ</span>
                        </span>
                        <div className="text-base sm:text-lg font-black text-indigo-950">
                          {currencySymbol}{calculations.incomingBatchValue.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          ({calculations.incoming} × {currencySymbol}{calculations.newLotCost})
                        </span>
                      </div>

                      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-emerald-200/90 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center space-x-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>মোট ইনভেন্টরি ভ্যালু</span>
                        </span>
                        <div className="text-base sm:text-lg font-black text-emerald-950">
                          {currencySymbol}{calculations.totalNewStockValue.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          (সমন্বিত মোট অ্যাসেট)
                        </span>
                      </div>
                    </div>

                    {/* বেন্টো কার্ড ৩: ওয়েইটেড এভারেজ কস্ট (WAC) সমন্বিত ক্রয়মূল্য */}
                    <div className="bg-white rounded-3xl border border-teal-200 p-4 sm:p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                          <Calculator className="w-4 h-4 text-teal-600" />
                          <span>সমন্বিত গড় ক্রয়মূল্য (New WAC)</span>
                        </span>
                        {calculations.costDiff !== 0 && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            calculations.costDiff > 0
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {calculations.costDiff > 0 ? `+${currencySymbol}${calculations.costDiff} (বৃদ্ধি)` : `-${currencySymbol}${Math.abs(calculations.costDiff)} (হ্রাস)`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight">
                            {currencySymbol}{calculations.weightedAvgCost.toFixed(2)}
                            <span className="text-xs font-semibold text-slate-400 ml-1">/ {selectedProduct.Unit || 'Pcs'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-400 block">পূর্বের কেনা দাম</span>
                          <span className="text-xs font-bold text-slate-400 line-through">
                            {currencySymbol}{Number(selectedProduct.CostPrice || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>হিসাবের সূত্র:</span>
                        <span className="font-mono text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          (আগের মোট মূল্য + নতুন লট মূল্য) ÷ নতুন মোট স্টক
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* কোনো পণ্য নির্বাচিত না থাকলে এম্পটি স্টেট */
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-white space-y-2.5">
                    <Box className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-700">কোনো পণ্য নির্বাচিত হয়নি</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      বাম পাশের কম্বোবক্স বা ক্যামেরা দিয়ে পণ্য নির্বাচন করলে লাইভ স্টক প্রবৃদ্ধি ও WAC হিসেব দেখতে পাবেন
                    </p>
                  </div>
                )}

                {/* ডাটাবেস নিরাপত্তা ও সিঙ্ক আশ্বাস বার্তা */}
                <div className="p-3.5 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 rounded-2xl border border-teal-200/90 flex items-start space-x-2.5 text-xs text-teal-950">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-teal-900">
                    রেকর্ড করার সাথে সাথে গুগল শিটের <strong>StockTransactions</strong> ট্যাবে বিস্তারিত ট্রানজ্যাকশন হিস্টোরি এবং <strong>Products</strong> ট্যাবে বর্তমান সমন্বিত স্টক স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* মডাল ফুটার একশন বার (Sticky Bottom) */}
          <div className="p-4 sm:px-8 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
            <div className="text-xs text-slate-600 w-full sm:w-auto text-center sm:text-left">
              {selectedProduct ? (
                <span className="text-teal-900 font-bold flex items-center justify-center sm:justify-start space-x-1.5 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    লট বৃদ্ধি ({targetLocation === 'Godown' ? '🏭 কেন্দ্রীয় গোডাউনে' : '🏬 শো-রুম কাউন্টারে'}): <strong className="text-slate-900">{selectedProduct.ProductName}</strong> (+{effectiveIncomingQty} {isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}{isThanUnit && yardsPerThan > 0 ? ` / ${effectiveTotalYards} গজ` : ''}) • খরচ: <strong className="text-indigo-900">{currencySymbol}{calculations ? calculations.incomingBatchValue.toFixed(2) : '0'}</strong>
                  </span>
                </span>
              ) : (
                <span className="text-slate-400">* পণ্য নির্বাচন করুন ও নতুন লটের পরিমাণ প্রদান করুন</span>
              )}
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                বাতিল করুন
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || !selectedProductId || effectiveIncomingQty <= 0}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white text-xs font-black rounded-xl shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ডাটাবেসে রেকর্ড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>{targetLocation === 'Godown' ? '🏭 গোডাউনে' : '🏬 শো-রুমে'} স্টক রেকর্ড করুন</span>
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
        title="রিস্টক বারকোড স্ক্যানার"
      />

      {/* বারকোড স্টিকার প্রিন্ট ও প্রিভিউ মডাল */}
      {isStickerModalOpen && (
        <BarcodeStickerModal
          isOpen={isStickerModalOpen}
          onClose={() => {
            setIsStickerModalOpen(false);
            setPendingPrintProduct(null);
            if (pendingPrintProduct) {
              onClose();
            }
          }}
          product={pendingPrintProduct || selectedProduct}
          initialQuantity={Number(incomingQty) || 10}
          currencySymbol={currencySymbol}
          storeName={settings?.StoreName || 'Pabna Bostraloy'}
        />
      )}

    </div>
  );
}
