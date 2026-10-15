import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Edit3, 
  Barcode, 
  DollarSign, 
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
  CheckCircle2
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeStickerModal from './BarcodeStickerModal';

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
  settings = {}
}) {
  const [formData, setFormData] = useState({
    productId: '',
    barcode: '',
    productName: '',
    category: 'General',
    subCategory: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockAlert: '5',
    unit: 'Pcs',
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
        sellingPrice: product.SellingPrice !== undefined ? String(product.SellingPrice) : '',
        stockQuantity: product.StockQuantity !== undefined ? String(product.StockQuantity) : '0',
        minStockAlert: product.MinStockAlert !== undefined ? String(product.MinStockAlert) : '5',
        unit: product.Unit || 'Pcs',
        imageUrl: product.ImageUrl || '',
        imageCaption: product.ImageCaption || '',
        shortDescription: product.ShortDescription || '',
        description: product.Description || '',
      });

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
    }
  }, [product, isOpen]);

  // অনন্য পরিমাপক একক (Units) তালিকা বের করা
  const uniqueUnits = useMemo(() => {
    const list = new Set();
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

  if (!isOpen || !product) return null;

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

    if (barcodeConflictProduct) {
      alert(`সতর্কতা: এই বারকোডটি (${formData.barcode}) ইতিমধ্যে "${barcodeConflictProduct.ProductName}" পণ্যে ব্যবহৃত হয়েছে! দয়া করে অনন্য বারকোড দিন বা স্বয়ংক্রিয়ভাবে তৈরি করুন।`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitUpdate({
        ...formData,
        productId: product.ProductID,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        stockQuantity: Number(formData.stockQuantity) || 0,
        minStockAlert: Number(formData.minStockAlert) || 5,
        imageUrl: imageUploadMode === 'url' ? formData.imageUrl.trim() : (formData.imageUrl || ''),
        imageCaption: formData.imageCaption.trim(),
        imageBase64: imageUploadMode === 'upload' ? imageBase64 : '',
        imageMimeType: imageMimeType,
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        features: features,
      });

      onClose();
    } catch (err) {
      alert(`পণ্য আপডেট করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* মডাল হেডার */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                পণ্য সম্পাদনা (Edit Product)
              </h3>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                আইডি: {product.ProductID}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ফর্ম কন্টেন্ট স্ক্রোলেবল এরিয়া */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {/* ১. পণ্যের নাম */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              পণ্যের নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="productName"
              required
              value={formData.productName}
              onChange={handleChange}
              placeholder="যেমন: মিনিকেট চাল ৫০ কেজি"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* ২. বারকোড / SKU */}
          <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                <span>বারকোড / SKU কোড</span>
              </label>

              <div className="flex items-center gap-1.5">
                {/* প্রিফিক্স */}
                <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px]">
                  <span className="text-slate-400 font-semibold">প্রিফিক্স:</span>
                  <input
                    type="text"
                    value={barcodePrefix}
                    onChange={(e) => setBarcodePrefix(e.target.value)}
                    placeholder="PB-"
                    className="w-10 font-mono font-bold text-indigo-700 uppercase focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateRandomBarcode}
                  className="text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-300 px-2 py-0.5 rounded flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                  title="কনফ্লিক্ট-মুক্ত কোড তৈরি করুন"
                >
                  <Wand2 className="w-3 h-3 text-indigo-600" />
                  <span>অটো কোড</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="text-[10px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-300 px-2 py-0.5 rounded flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                  title="ক্যামেরা দিয়ে স্ক্যান করুন"
                >
                  <Camera className="w-3 h-3 text-emerald-600" />
                  <span>ক্যামেরা</span>
                </button>

                {formData.barcode && (
                  <button
                    type="button"
                    onClick={() => setIsStickerModalOpen(true)}
                    className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-0.5 rounded flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                    title="বারকোড স্টিকার প্রিন্ট করুন"
                  >
                    <Printer className="w-3 h-3" />
                    <span>স্টিকার</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="স্ক্যানার দিয়ে স্ক্যান করুন বা লিখুন..."
                className={`w-full pl-3 pr-8 py-2 text-xs font-mono font-bold border rounded-lg focus:outline-none focus:ring-2 bg-white transition-all shadow-2xs ${
                  barcodeConflictProduct
                    ? 'border-rose-400 text-rose-900 focus:ring-rose-400 bg-rose-50/30'
                    : 'border-slate-300 text-slate-800 focus:ring-indigo-500'
                }`}
              />
              {formData.barcode && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, barcode: '' }))}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  title="মুছে ফেলুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {scannedNotification && (
              <div className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{scannedNotification}</span>
              </div>
            )}

            {barcodeConflictProduct && (
              <div className="text-[11px] font-bold text-rose-600 flex items-center space-x-1 bg-rose-50 p-2 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>এই বারকোডটি "{barcodeConflictProduct.ProductName}" পণ্যে ব্যবহৃত হয়েছে!</span>
              </div>
            )}
          </div>

          {/* ৩. ক্যাটাগরি ও সাব-ক্যাটাগরি */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>ক্যাটাগরি</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                >
                  <PlusCircle className="w-3 h-3 mr-0.5" />
                  {isAddingNewCategory ? 'বাতিল' : 'নতুন ক্যাটাগরি'}
                </button>
              </div>

              {!isAddingNewCategory ? (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  {uniqueCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {uniqueCategories.length === 0 && <option value="General">General</option>}
                </select>
              ) : (
                <div className="space-y-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="প্রধান ক্যাটাগরির নাম"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    type="text"
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    placeholder="সাব-ক্যাটাগরি (ঐচ্ছিক)"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="w-full py-1 bg-indigo-600 text-white text-[11px] font-bold rounded hover:bg-indigo-700 transition-colors"
                  >
                    যুক্ত করুন
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>সাব-ক্যাটাগরি (ঐচ্ছিক)</span>
              </label>
              {availableSubCategories.length > 0 ? (
                <div className="space-y-1">
                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">-- সাব-ক্যাটাগরি নির্বাচন করুন --</option>
                    {availableSubCategories.map((sub, idx) => (
                      <option key={idx} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  placeholder="যেমন: চিনিগুঁড়া বা সাধারণ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* ৪. আর্থিক তথ্য: কেনা দাম ও বিক্রয়মূল্য */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                কেনা দাম / Cost ({currencySymbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="costPrice"
                  step="any"
                  min="0"
                  value={formData.costPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">{currencySymbol}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                বিক্রয়মূল্য / Selling ({currencySymbol}) <span className="text-rose-500">*</span>
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
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-bold text-indigo-900 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
                <span className="absolute left-2.5 top-1.5 text-xs text-indigo-600 font-bold">{currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* ৫. বর্তমান মজুত ও পরিমাপক একক (Unit) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>বর্তমান মজুত</span>
              </label>
              <input
                type="number"
                name="stockQuantity"
                step="any"
                min="0"
                value={formData.stockQuantity}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                সতর্কবার্তা সীমা (Min Stock)
              </label>
              <input
                type="number"
                name="minStockAlert"
                min="0"
                value={formData.minStockAlert}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  পরিমাপক একক
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewUnit(!isAddingNewUnit)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                >
                  <PlusCircle className="w-3 h-3 mr-0.5" />
                  {isAddingNewUnit ? 'বাতিল' : 'নতুন একক'}
                </button>
              </div>

              {!isAddingNewUnit ? (
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  {uniqueUnits.map((u, idx) => (
                    <option key={idx} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <input
                    type="text"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="একক (যেমন: বস্তা, ডজন)"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    type="text"
                    value={newUnitShortName}
                    onChange={(e) => setNewUnitShortName(e.target.value)}
                    placeholder="সংক্ষিপ্ত রূপ (যেমন: Bosta)"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCreateUnit}
                    className="w-full py-1 bg-indigo-600 text-white text-[11px] font-bold rounded hover:bg-indigo-700 transition-colors"
                  >
                    যুক্ত করুন
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ৬. প্রধান ছবি ও ক্যাপশন (SEO অপটিমাইজড) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>পণ্যের প্রধান ছবি (Product Main Image)</span>
              </label>
              <div className="flex bg-slate-200 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setImageUploadMode('upload')}
                  className={`px-2 py-0.5 rounded-md flex items-center space-x-1 transition-all ${
                    imageUploadMode === 'upload' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>ডিভাইস আপলোড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageUploadMode('url')}
                  className={`px-2 py-0.5 rounded-md flex items-center space-x-1 transition-all ${
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
                    <div className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={localImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        নতুন ছবি সফলভাবে প্রস্তুত হয়েছে
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        গুগল ড্রাইভে 'products image' ফোল্ডারে সেভ হবে
                      </span>
                      <label
                        htmlFor="edit-product-image-upload"
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline inline-block mt-0.5"
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
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="নতুন ছবি বাদ দিন"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : formData.imageUrl ? (
                  <div className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200">
                    <div className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={formData.imageUrl}
                        alt="Current"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Error'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        বর্তমান সংরক্ষিত ছবি রয়েছে
                      </span>
                      <label
                        htmlFor="edit-product-image-upload"
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline inline-block mt-0.5"
                      >
                        নতুন ছবি আপলোড করে পরিবর্তন করুন
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-product-image-upload"
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-3 flex items-center justify-center space-x-2 bg-white hover:bg-indigo-50/20 cursor-pointer transition-all text-center"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-700">
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
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formData.imageUrl ? (
                  <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Error'; }}
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg border border-dashed border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            )}

            {/* ছবির ক্যাপশন (SEO অপটিমাইজেশন ফিল্ড) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>ছবির ক্যাপশন / Alt Text (SEO এর জন্য)</span>
                <span className="text-[10px] text-slate-400 font-normal">সার্চ অপটিমাইজেশন</span>
              </label>
              <input
                type="text"
                name="imageCaption"
                placeholder="যেমন: প্রিমিয়াম চিনিগুঁড়া চাল ১ কেজি প্যাকেট - ফ্রন্ট ভিউ"
                value={formData.imageCaption}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ৭. সংক্ষিপ্ত বিবরণ (Short Description) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>সংক্ষিপ্ত বিবরণ (Short Description)</span>
            </label>
            <textarea
              name="shortDescription"
              rows={2}
              value={formData.shortDescription}
              onChange={handleChange}
              placeholder="এক বা দুই লাইনে পণ্যের পরিচিতি..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* ৮. পণ্যের বৈশিষ্ট্যসমূহ (Features) */}
          <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 space-y-2">
            <label className="block text-xs font-semibold text-indigo-950 flex items-center space-x-1">
              <ListPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>প্রধান বৈশিষ্ট্যসমূহ (Features)</span>
            </label>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={handleFeatureKeyDown}
                placeholder="বৈশিষ্ট্য লিখে Enter চাপুন বা 'যোগ' বাটনে ক্লিক করুন..."
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
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
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white text-indigo-800 border border-indigo-200 shadow-2xs"
                  >
                    <Check className="w-3 h-3 text-emerald-600 mr-1" />
                    <span>{feat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="ml-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="মুছুন"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ৯. বিস্তারিত বিবরণ (Description) - রিচ টেক্সট ফরম্যাটিং ও ইমেজ সহ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <AlignLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>বিস্তারিত বিবরণ (Description)</span>
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(newHtml) => setFormData((prev) => ({ ...prev, description: newHtml }))}
              placeholder="পণ্যের পূর্ণ বিবরণ, ব্যবহারবিধি লিখুন বা ছবি যুক্ত করুন..."
            />
          </div>

          {/* অ্যাকশন বাটন */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isSubmitting ? 'আপডেট হচ্ছে...' : 'হালনাগাদ সংরক্ষণ করুন'}</span>
            </button>
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

    </div>
  );
}

