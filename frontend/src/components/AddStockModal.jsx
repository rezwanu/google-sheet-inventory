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
  Palette
} from 'lucide-react';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeStickerModal from './BarcodeStickerModal';

// দ্রুত পরিমাণের প্রিসেট (Quick Quantity Presets)
const QUANTITY_PRESETS = [5, 10, 25, 50, 100];

// দ্রুত সরবরাহকারী প্রিসেট
const SUPPLIER_PRESETS = ['প্রধান ডিলার', 'মেসার্স ট্রেডার্স', 'সরাসরি কোম্পানি', 'পাইকারি বাজার'];

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
  variantAttributes = [],
  onAddVariantOption
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState('');
  const [incomingQty, setIncomingQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
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

  // ক্যামেরা স্ক্যান ও স্টিকার স্টেট
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [autoPrintStickersOnRestock, setAutoPrintStickersOnRestock] = useState(false);
  const [pendingPrintProduct, setPendingPrintProduct] = useState(null);

  const barcodeInputRef = useRef(null);
  const incomingQtyInputRef = useRef(null);

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
      setIncomingQty('');
      setVariantQuantities({});
      setBulkVariantQty('');
      setSingleVariantQty('');
      setTargetLocation('Godown');
      setVariantRestockMode('all');
      setUnitCost('');
      setSupplierName('');
      setNotes('');
      setMobileTab('form');
      setCustomAddedVariants([]);
      setIsAddingNewColorOpen(false);
      setIsVariantRestockEnabled(false);
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
      ? ['লাল', 'কালো', 'সাদা', 'নীল', 'সবুজ', 'হলুদ', 'গোলাপী', 'মেরুন', 'আকাশি', 'বেগুনি', 'কমলা', 'ধূসর', 'ফিরোজা', 'বাসন্তী', 'ম্যাজেন্টা', 'অফ-হোয়াইট', 'নেভি ব্লু']
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
        (p.ProductID && p.ProductID.toLowerCase().includes(q))
    );
  }, [products, barcodeSearchQuery]);

  // পণ্য নির্বাচন হ্যান্ডলার
  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.ProductID === productId);
    if (prod) {
      setUnitCost(prod.CostPrice || '');
    }
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
        setBarcodeSearchQuery('');
        setTimeout(() => {
          incomingQtyInputRef.current?.focus();
        }, 60);
        return;
      }

      // ২. নাম বা আংশিক মিললে
      const partialMatch = products.find((p) =>
        p.ProductName.toLowerCase().includes(query) ||
        (p.Barcode && String(p.Barcode).toLowerCase().includes(query))
      );

      if (partialMatch) {
        handleProductSelect(partialMatch.ProductID);
        setBarcodeSearchQuery('');
        setTimeout(() => {
          incomingQtyInputRef.current?.focus();
        }, 60);
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
      setBarcodeSearchQuery('');
      setTimeout(() => {
        incomingQtyInputRef.current?.focus();
      }, 80);
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
      stockGrowthPercentage
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
      <div className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] overflow-hidden flex flex-col transition-all" : "bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh] transition-all animate-in zoom-in-95 duration-200"}>
        
        {/* মডাল হেডার (Header Bar) */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-teal-50/20 to-white relative select-none">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0 ring-4 ring-teal-50">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  নতুন স্টক ইনপুট (Cumulative Stock Tracking)
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100/80 text-teal-800 border border-teal-200">
                  WAC ওয়েইটেড কস্ট সিঙ্ক
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                পূর্বের স্টকের সাথে নতুন লটের সংখ্যা ও কেনা দাম স্বয়ংক্রিয়ভাবে সমন্বয় হয়ে গুগল শিটে রেকর্ড হবে
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
                    ? 'bg-white text-teal-700 shadow-xs' 
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
                    ? 'bg-white text-teal-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>হিসাব ও প্রিভিউ</span>
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
            
            {/* বাম কলাম: স্টক ইনপুট ফর্ম (৭ কলাম) */}
            <div className={`lg:col-span-7 p-5 sm:p-7 space-y-5 ${mobileTab === 'analytics' ? 'hidden lg:block' : 'block'}`}>
              
              {/* সেকশন ১: পণ্য অনুসন্ধান ও নির্বাচন */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>১. পণ্য অনুসন্ধান ও নির্বাচন</span>
                  </span>
                  <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                    স্ক্যানার অথবা ড্রপডাউন
                  </span>
                </div>

                {/* বারকোড স্ক্যানার বা দ্রুত সার্চ ইনপুট */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Barcode className="w-4 h-4 text-teal-600" />
                      <span>বারকোড স্ক্যান করুন বা নাম লিখুন</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsCameraScannerOpen(true)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-all shadow-2xs cursor-pointer"
                        title="মোবাইল বা ওয়েবক্যাম দিয়ে পণ্যের বারকোড স্ক্যান করুন"
                      >
                        <Camera className="w-3.5 h-3.5 text-teal-600" />
                        <span>ক্যামেরা স্ক্যান</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        Enter চাপলে সিলেক্ট
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcodeSearchQuery}
                      onChange={(e) => setBarcodeSearchQuery(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      placeholder="বারকোড স্ক্যান করুন বা নাম লিখে Enter চাপুন..."
                      className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-2xs"
                    />
                    <Barcode className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* ড্রপডাউন থেকে পণ্য নির্বাচন */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    অথবা ক্যাটালগ তালিকা থেকে নির্বাচন করুন *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  >
                    <option value="">-- পণ্য নির্বাচন করুন ({filteredProductOptions.length}টি পণ্য উপলব্ধ) --</option>
                    {filteredProductOptions.map((p) => (
                      <option key={p.ProductID} value={p.ProductID}>
                        {p.Barcode ? `[${p.Barcode}] ` : ''}{p.ProductName} (মজুদ: {p.StockQuantity} {p.Unit || 'Pcs'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* সেকশন ২: রিস্টক গন্তব্য, নতুন স্টক ও কেনা দাম */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>২. রিস্টক গন্তব্য ও স্টকের পরিমাণ</span>
                  </span>
                  {selectedProduct && (
                    <span className="text-[11px] font-bold text-slate-500">
                      একক: <strong className="text-slate-800">{selectedProduct.Unit || 'Pcs'}</strong>
                      {isThanUnit && yardsPerThan > 0 && (
                        <span className="text-teal-700 ml-1">({yardsPerThan} গজ/থান)</span>
                      )}
                    </span>
                  )}
                </div>

                {/* রিস্টক গন্তব্য নির্বাচন (গোডাউন বনাম দোকান) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>রিস্টক গন্তব্য লোকেশন নির্বাচন করুন *</span>
                    <span className="text-[10px] text-slate-500">
                      {targetLocation === 'Godown' ? '🏭 ওয়্যারহাউজে মজুদ বাড়বে' : '🏬 বিক্রয় কাউন্টারে সরাসরি মজুদ বাড়বে'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetLocation('Godown')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        targetLocation === 'Godown'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/20'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Warehouse className="w-4 h-4" />
                      <span>🏭 গোডাউন (ডিফল্ট)</span>
                      {selectedProduct && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${targetLocation === 'Godown' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {selectedProduct.GodownStock !== undefined ? selectedProduct.GodownStock : 0}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetLocation('Shop')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        targetLocation === 'Shop'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>🏬 দোকান কাউন্টার</span>
                      {selectedProduct && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${targetLocation === 'Shop' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {selectedProduct.StockQuantity || 0}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* যদি পণ্যটিতে ভ্যারিয়েন্ট থাকে (রং / সাইজ / থান অনুযায়ী) */}
                {hasVariants ? (
                  <div className="bg-white border border-teal-200 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-teal-100">
                      <div className="flex items-center space-x-2">
                        <Palette className="w-4 h-4 text-teal-600" />
                        <div>
                          <h5 className="text-xs font-black text-slate-900">
                            ভ্যারিয়েন্ট অনুযায়ী রিস্টক এন্ট্রি ({allVariants.length}টি ভ্যারিয়েন্ট)
                          </h5>
                          <p className="text-[10px] text-slate-500">
                            {isThanUnit ? 'প্রতিটি কালারের জন্য পৃথক থান সংখ্যা প্রদান করুন' : 'রং বা সাইজ অনুযায়ী পৃথক স্টক প্রদান করুন'}
                          </p>
                        </div>
                      </div>

                      {/* মোড সুইচ বাটন */}
                      <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setVariantRestockMode('all')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            variantRestockMode === 'all'
                              ? 'bg-white text-teal-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          সকল ভ্যারিয়েন্ট তালিকা
                        </button>
                        <button
                          type="button"
                          onClick={() => setVariantRestockMode('single')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            variantRestockMode === 'single'
                              ? 'bg-white text-teal-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          একক ভ্যারিয়েন্ট
                        </button>
                      </div>
                    </div>

                    {/* নতুন ভ্যারিয়েন্ট যোগ করার টগল বাটন */}
                    <div className="flex items-center justify-between bg-teal-50/60 p-2.5 rounded-xl border border-teal-200/80">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800">
                          লটে নতুন কোনো ভ্যারিয়েন্ট এসেছে?
                        </span>
                        <span className="text-[10px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full font-bold">
                          নতুন ভ্যারিয়েন্ট রিস্টক
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewColorOpen((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5 shadow-xs ${
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

                    {/* নতুন ভ্যারিয়েন্ট যোগ করার ফর্ম কার্ড */}
                    {isAddingNewColorOpen && (
                      <div className="p-3.5 bg-gradient-to-br from-white via-teal-50/40 to-indigo-50/30 border-2 border-teal-300 rounded-2xl shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                          <div className="flex items-center space-x-1.5 text-xs font-black text-teal-900">
                            <Palette className="w-4 h-4 text-teal-600" />
                            <span>নতুন ভ্যারিয়েন্টের স্টক যোগ করুন</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">
                            লটের সাথে সরাসরি যুক্ত হবে
                          </span>
                        </div>

                        {/* ১. ভ্যারিয়েন্টের ধরণ ও ডাটাবেস ড্রপডাউন লিস্ট */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
                          <div className="text-[10.5px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                            <span className="flex items-center space-x-1">
                              <Sparkles className="w-3 h-3 text-teal-600" />
                              <span>১-ক্লিকে দ্রুত বাছাই ({newColorType}):</span>
                            </span>
                            <span className="text-[10px] text-teal-700 font-semibold">{allColorOptions.length}টি অপশন</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white/80 rounded-xl border border-slate-200">
                            {allColorOptions.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewColorName(c)}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                  newColorName === c
                                    ? 'bg-teal-600 text-white border-teal-700 shadow-xs ring-1 ring-teal-400'
                                    : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ইনপুট গ্রিড */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              ৩. {newColorType === 'Color' ? 'রঙের' : newColorType === 'Size' ? 'সাইজের' : 'ভ্যারিয়েন্টের'} নাম <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              placeholder={`যেমন: ${newColorType === 'Color' ? 'ফিরোজা বা রয়্যাল ব্লু' : newColorType === 'Size' ? 'XL বা 42' : '1kg বা 500gm'}`}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500"
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
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-black text-teal-800 text-center focus:ring-2 focus:ring-teal-500"
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
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-600 focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingNewColorOpen(false)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            বাতিল
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewColorVariant}
                            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1 cursor-pointer shadow-sm transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>এই ভ্যারিয়েন্টটি লটে যোগ করুন</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* সকল ভ্যারিয়েন্ট তালিকা মোড */}
                    {variantRestockMode === 'all' ? (
                      <div className="space-y-3">
                        {/* কুইক বাল্ক ফিল বার */}
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                          <span className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>সব ভ্যারিয়েন্টে সমান সংখ্যা:</span>
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="1"
                              placeholder="পরিমাণ"
                              value={bulkVariantQty}
                              onChange={(e) => setBulkVariantQty(e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center focus:ring-1 focus:ring-teal-500"
                            />
                            <button
                              type="button"
                              onClick={handleApplyBulkQtyToAllVariants}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                            >
                              সবগুলোতে দিন
                            </button>
                          </div>
                        </div>

                        {/* ভ্যারিয়েন্ট তালিকা টেবিল */}
                        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-5 border-b border-slate-200 text-[11px]">
                              <tr>
                                <th className="p-2 sm:px-3">ভ্যারিয়েন্ট / কালার</th>
                                <th className="p-2 text-center">বর্তমান মজুদ</th>
                                <th className="p-2 text-center">
                                  + নতুন আগমন ({isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'})
                                </th>
                                <th className="p-2 text-right sm:pr-3">নতুন মোট</th>
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

                                return (
                                  <tr key={vId} className={`hover:bg-teal-50/30 transition-colors ${v.isNewVariant ? 'bg-amber-50/40' : ''}`}>
                                    <td className="p-2 sm:px-3">
                                      <div className="flex items-center space-x-1.5 flex-wrap">
                                        {vColor && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                            {vColor}
                                          </span>
                                        )}
                                        {vSize && (
                                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                            {vSize}
                                          </span>
                                        )}
                                        {!vColor && !vSize && (
                                          <span className="font-semibold text-slate-800 text-xs">
                                            {v.Attributes ? Object.values(v.Attributes).join(' / ') : vId}
                                          </span>
                                        )}
                                        {v.isNewVariant && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-0.5">
                                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                            <span>নতুন ভ্যারিয়েন্ট</span>
                                          </span>
                                        )}
                                        {v.isNewVariant && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveCustomVariant(v.VariantID)}
                                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                            title="এই নতুন ভ্যারিয়েন্টটি তালিকা থেকে বাদ দিন"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      {v.Barcode && (
                                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                          #{v.Barcode}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-center font-bold text-slate-600">
                                      {currentStock}
                                    </td>
                                    <td className="p-2 text-center">
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
                                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                                        />
                                      </div>
                                    </td>
                                    <td className="p-2 text-right sm:pr-3">
                                      <span className={`font-black text-xs ${incomingForV > 0 ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                                        {newVStock}
                                      </span>
                                      {isThanUnit && yardsPerThan > 0 && incomingForV > 0 && (
                                        <span className="text-[9px] text-teal-600 block">
                                          ({incomingForV * yardsPerThan} গজ)
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
                        <div className="p-2.5 bg-teal-50/80 rounded-xl border border-teal-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-slate-600 font-medium">
                            মোট আগত স্টক (ভ্যারিয়েন্টসমূহ):
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-teal-900 bg-white px-2.5 py-0.5 rounded-lg border border-teal-200">
                              +{effectiveIncomingQty} {isThanUnit ? 'থান' : selectedProduct?.Unit || 'Pcs'}
                            </span>
                            {isThanUnit && yardsPerThan > 0 && (
                              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                = {effectiveTotalYards} গজ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* একক ভ্যারিয়েন্ট মোড */
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            নির্দিষ্ট ভ্যারিয়েন্ট নির্বাচন করুন *
                          </label>
                          <select
                            value={selectedSingleVariantId}
                            onChange={(e) => setSelectedSingleVariantId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
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
                                  {v.isNewVariant ? '✨ [নতুন] ' : ''}{label} (মজুদ: {cur})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            এই ভ্যারিয়েন্টের নতুন আগত পরিমাণ *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-teal-600">+</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="পরিমাণ"
                              value={singleVariantQty}
                              onChange={(e) => setSingleVariantQty(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                            />
                          </div>
                          {isThanUnit && yardsPerThan > 0 && singleVariantQty && (
                            <p className="text-[11px] text-teal-700 font-bold mt-1">
                              = {Number(singleVariantQty) * yardsPerThan} গজ
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* সাধারণ পণ্য (ভ্যারিয়েন্ট ছাড়া) */
                  <div className="space-y-3">
                    {/* অপশন: সাধারণ পণ্যকে কালার ভিত্তিক রিস্টক এন্ট্রি করার বাটন */}
                    {selectedProduct && (
                      <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-teal-50/70 to-emerald-50/50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center space-x-2 text-teal-900">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* নতুন স্টক পরিমাণ */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>নতুন আসা পরিমাণ (Incoming Qty) *</span>
                          {selectedProduct && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              বর্তমান মজুদ: {targetLocation === 'Godown' ? (selectedProduct.GodownStock || 0) : (selectedProduct.StockQuantity || 0)}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-teal-600">
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
                            className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-2xs"
                          />
                        </div>

                        {/* দ্রুত সংখ্যা প্রিসেট বাটন */}
                        <div className="flex items-center space-x-1.5 mt-2">
                          <span className="text-[10px] text-slate-400 font-medium">কুইক অ্যাড:</span>
                          {QUANTITY_PRESETS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleAddPresetQty(amt)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>

                        {isThanUnit && yardsPerThan > 0 && incomingQty && (
                          <div className="mt-2 p-2 bg-teal-50 rounded-lg border border-teal-200 text-xs font-bold text-teal-800">
                            মোট গজ: {Number(incomingQty) * yardsPerThan} গজ ({incomingQty} থান × {yardsPerThan} গজ/থান)
                          </div>
                        )}
                      </div>

                      {/* ক্রয়মূল্য ইনপউট */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>প্রতি ইউনিটের কেনা দাম (Unit Cost) *</span>
                          {selectedProduct && (
                            <button
                              type="button"
                              onClick={() => setUnitCost(selectedProduct.CostPrice || '')}
                              className="text-[10px] text-teal-600 hover:text-teal-800 font-bold hover:underline"
                              title="পূর্বের কেনা দাম ফিরিয়ে আনুন"
                            >
                              আগের দাম: {currencySymbol}{Number(selectedProduct.CostPrice || 0).toFixed(2)}
                            </button>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
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
                            className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-2xs"
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 mt-2">
                          দাম পরিবর্তন হলে স্বয়ংক্রিয়ভাবে ওয়েইটেড এভারেজ কস্ট (WAC) নির্ণয় হবে
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* যদি ভ্যারিয়েন্ট থাকে, কেনা দাম আলাদা কার্ডে দেখান */}
                {hasVariants && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>লটের গড় কেনা দাম (Unit Cost) *</span>
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={() => setUnitCost(selectedProduct.CostPrice || '')}
                          className="text-[10px] text-teal-600 hover:text-teal-800 font-bold hover:underline"
                          title="পূর্বের কেনা দাম ফিরিয়ে আনুন"
                        >
                          আগের দাম: {currencySymbol}{Number(selectedProduct.CostPrice || 0).toFixed(2)}
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
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
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      দাম পরিবর্তন হলে নতুন ওয়েইটেড এভারেজ কস্ট (WAC) নির্ণয় হবে
                    </p>
                  </div>
                )}

                {/* রিস্টক বারকোড স্টিকার প্রিন্ট কার্ড */}
                {selectedProduct && (
                  <div className="mt-3 p-3.5 bg-gradient-to-r from-indigo-50/80 to-teal-50/50 border border-indigo-200/80 rounded-2xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">
                          রিস্টক বারকোড স্টিকার প্রিন্ট:
                        </span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
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
                            StockQuantity: Number(incomingQty) || Number(selectedProduct.StockQuantity) || 10
                          });
                          setIsStickerModalOpen(true);
                        }}
                        disabled={!selectedProduct.Barcode}
                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{incomingQty ? `${incomingQty}টি স্টিকার প্রিন্ট` : 'স্টিকার প্রিন্ট করুন'}</span>
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
                        <span className="text-[11px] font-bold text-indigo-900">
                          রিস্টক শেষে স্বয়ংক্রিয় প্রিন্ট
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* সেকশন ৩: সরবরাহকারী, হ্যান্ডলার এবং চালান নোট */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>৩. সরবরাহকারী ও অডিট ট্র্যাকিং</span>
                  </span>
                  <span className="text-[11px] text-slate-400">StockTransactions ট্যাবে সংরক্ষণ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* সরবরাহকারী */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      সরবরাহকারী (Supplier Name)
                    </label>
                    <div className="relative">
                      <Truck className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="সাপ্লায়ারের নাম লিখুন..."
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                      />
                    </div>
                    {/* কুইক সাপ্লায়ার চিপস */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {SUPPLIER_PRESETS.map((sup) => (
                        <button
                          key={sup}
                          type="button"
                          onClick={() => setSupplierName(sup)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-teal-700 transition-all shadow-2xs"
                        >
                          {sup}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* দায়িত্বপ্রাপ্ত ব্যক্তি */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      দায়িত্বপ্রাপ্ত ব্যক্তি (Handled By)
                    </label>
                    <div className="relative">
                      <UserCheck className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="অ্যাডমিন বা ব্যবহারকারীর নাম"
                        value={handledBy}
                        onChange={(e) => setHandledBy(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      সিস্টেমে স্বয়ংক্রিয়ভাবে অডিট লগ হিসেবে থাকবে
                    </span>
                  </div>
                </div>

                {/* চালান বা রেফারেন্স নোট */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span>নোট বা চালান নম্বর (Notes)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="চালান #১০৫, নতুন লট সরবরাহ অথবা বিশেষ নোট..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                  {/* কুইক নোট চিপস */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {NOTE_PRESETS.map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setNotes(note)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-teal-700 transition-all shadow-2xs"
                      >
                        + {note}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ডান কলাম: কিউমুলেটিভ স্টক ম্যাট্রিক্স ও লাইভ অ্যানালিটিক্স (৫ কলাম) */}
            <div className={`lg:col-span-5 p-5 sm:p-7 bg-gradient-to-b from-slate-50/60 to-white space-y-5 ${mobileTab === 'form' ? 'hidden lg:block' : 'block'}`}>
              
              <div className="sticky top-4 space-y-5">
                
                {/* প্রিভিউ হেডার */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-teal-600" />
                      <span>কিউমুলেটিভ স্টক ও WAC অ্যানালিটিক্স</span>
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    রিয়েল-টাইম
                  </span>
                </div>

                {/* নির্বাচিত পণ্যের মিনি কার্ড */}
                {selectedProduct ? (
                  <div className="bg-white rounded-2xl border border-teal-200/80 p-3.5 shadow-sm space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
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
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md inline-block mb-1">
                          {selectedProduct.Category || 'General'}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {selectedProduct.ProductName}
                        </h5>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          {selectedProduct.Barcode && (
                            <span className="font-mono text-[10px]">#{selectedProduct.Barcode}</span>
                          )}
                          <span>•</span>
                          <span>আইডি: <strong>{selectedProduct.ProductID}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-white space-y-2">
                    <Box className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-600">কোনো পণ্য নির্বাচিত হয়নি</p>
                    <p className="text-[11px] text-slate-400">
                      বাম পাশের ড্রপডাউন বা বারকোড স্ক্যানার দিয়ে পণ্য নির্বাচন করুন
                    </p>
                  </div>
                )}

                {/* কিউমুলেটিভ স্টক ট্র্যাকার কার্ড (Visual Stock Transformation) */}
                {selectedProduct && calculations && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-teal-600" />
                        <span>স্টক রূপান্তর (Cumulative Growth)</span>
                      </span>
                      <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        +{calculations.stockGrowthPercentage}% প্রবৃদ্ধি
                      </span>
                    </div>

                    {/* ৩-ধাপের ভিজ্যুয়াল স্টক ব্যালেন্স বার */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          পূর্বের ({targetLocation === 'Godown' ? 'গোডাউন' : 'দোকান'})
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                          {calculations.prevStock}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                        <span className="text-[10px] font-bold text-teal-700 block mb-0.5">+ নতুন আগমন</span>
                        <span className="text-sm font-black text-teal-700">
                          +{calculations.incoming}
                        </span>
                        <span className="text-[10px] text-teal-600 block">
                          {isThanUnit ? (
                            <span>থান {yardsPerThan > 0 ? `(${effectiveTotalYards} গজ)` : ''}</span>
                          ) : (
                            selectedProduct.Unit || 'Pcs'
                          )}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                        <span className="text-[10px] font-bold text-emerald-100 block mb-0.5">= নতুন মোট</span>
                        <span className="text-base font-black text-white">
                          {calculations.newStock}
                        </span>
                        <span className="text-[10px] text-emerald-100 block">{isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}</span>
                      </div>
                    </div>

                    {/* প্রোগ্রেস ইন্ডিকেটর বার */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
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
                )}

                {/* ডার্ক কার্ড: ওয়েইটেড এভারেজ কস্ট (WAC) ও ইনভেস্টমেন্ট ম্যাট্রিক্স */}
                {selectedProduct && calculations && (
                  <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                        <Coins className="w-4 h-4 text-teal-400" />
                        <span>ওয়েইটেড এভারেজ কস্ট (WAC) ও ইনভেস্টমেন্ট</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block mb-0.5">এই লটের মোট খরচ</span>
                        <span className="text-sm font-bold text-teal-400">
                          {currencySymbol}{calculations.incomingBatchValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block mb-0.5">নতুন মোট ইনভেন্টরি ভ্যালু</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {currencySymbol}{calculations.totalNewStockValue.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">নতুন সমন্বিত গড় ক্রয়মূল্য (New WAC)</span>
                        <span className="text-base font-black text-white">
                          {currencySymbol}{calculations.weightedAvgCost.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">/ {selectedProduct.Unit || 'Pcs'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">আগের ক্রয়মূল্য</span>
                        <span className="text-xs font-bold text-slate-300 line-through">
                          {currencySymbol}{Number(selectedProduct.CostPrice || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ডাটাবেস নিরাপত্তা ও সিঙ্ক আশ্বাস বার্তা */}
                <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200/80 flex items-start space-x-3 text-xs text-teal-900">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-teal-800">
                    সংরক্ষণ নিশ্চিত করার সাথে সাথে গুগল শিটের <strong>StockTransactions</strong> ট্যাবে বিস্তারিত ট্রানজ্যাকশন হিস্টোরি এবং <strong>Products</strong> ট্যাবে বর্তমান সমন্বিত স্টক স্বয়ংক্রিয়ভাবে আপডেট হবে।
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* মডাল ফুটার একশন বার (Sticky Bottom) */}
          <div className="p-4 sm:px-8 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 hidden sm:block">
              {selectedProduct ? (
                <span className="text-teal-800 font-semibold flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    স্টক সংযোজন ({targetLocation === 'Godown' ? '🏭 গোডাউনে' : '🏬 দোকানে'}): <strong>{selectedProduct.ProductName}</strong> (+{effectiveIncomingQty} {isThanUnit ? 'থান' : selectedProduct.Unit || 'Pcs'}{isThanUnit && yardsPerThan > 0 ? ` / ${effectiveTotalYards} গজ` : ''})
                  </span>
                </span>
              ) : (
                <span>* পণ্য নির্বাচন করুন ও নতুন লটের পরিমাণ প্রদান করুন</span>
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
                disabled={isSubmitting || !selectedProductId || effectiveIncomingQty <= 0}
                className="px-7 py-2.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white text-xs font-black rounded-xl shadow-lg shadow-teal-600/25 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ডাটাবেসে রেকর্ড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>{targetLocation === 'Godown' ? '🏭 গোডাউনে' : '🏬 দোকানে'} স্টক রেকর্ড করুন</span>
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
