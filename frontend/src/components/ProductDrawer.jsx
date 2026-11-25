import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Barcode,
  Package,
  RefreshCw,
  Upload,
  Scissors,
  Layers,
  Trash2
} from 'lucide-react';
import { SlideOverDrawer, StatusBadge } from './ui';
import { isThanUnit, isFabricUnit } from '../utils/fabricUtils';

/**
 * ProductDrawer - Slide-over Add / Edit Product Drawer (Utilitarian Minimalism)
 * - ক্লিন ডানপাশের স্লাইড-ওভার ড্রয়ার (Esc চাপে বন্ধ হয়)
 * - Add এবং Edit উভয় মোড সমর্থন করে (পুরাতন ডাটা ও ভ্যারিয়েন্ট অক্ষুণ্ণ রাখে)
 * - ইনলাইন ফর্ম ভ্যালিডেশন ও "Processing..." সাবমিট স্টেট
 */
export default function ProductDrawer({
  isOpen = false,
  onClose,
  product = null, // null = Add New, object = Edit Product
  currencySymbol = '৳',
  onSubmitProduct,
  onSubmitUpdate,
  categories = [],
  onAddCategory,
  units = [],
  onAddUnit,
  suppliers = [],
  products = [],
}) {
  const isEditMode = Boolean(product && product.ProductID);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'pricing' | 'advanced'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    category: 'General',
    subCategory: '',
    barcode: '',
    unit: 'Pcs',
    supplierId: '',
    supplierName: '',
    costPrice: '',
    sellingPrice: '',
    minSellingPrice: '',
    wholesalePrice: '',
    stockQuantity: '',
    godownStock: '',
    minStockAlert: '5',
    yardsPerThan: '25',
    remnantThreshold: '',
    imageUrl: '',
    imageCaption: '',
    shortDescription: '',
    description: '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
  });
  const [imageBase64, setImageBase64] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [variants, setVariants] = useState([]);

  // ফর্ম ইনিশিয়ালাইজেশন
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('basic');
    setErrors({});
    setShowNewCategoryInput(false);
    setNewCategoryName('');

    if (product && product.ProductID) {
      let parsedVars = Array.isArray(product.Variants) ? product.Variants : [];
      if (parsedVars.length === 0 && typeof product.VariantsJSON === 'string' && product.VariantsJSON.trim()) {
        try {
          parsedVars = JSON.parse(product.VariantsJSON);
        } catch {}
      }
      setVariants(Array.isArray(parsedVars) ? parsedVars : []);
      setFormData({
        productName: product.ProductName || '',
        category: product.Category || 'General',
        subCategory: product.SubCategory || '',
        barcode: product.Barcode || '',
        unit: product.Unit || 'Pcs',
        supplierId: product.SupplierID || '',
        supplierName: product.SupplierName || product.Supplier || '',
        costPrice: product.CostPrice !== undefined ? String(product.CostPrice) : '',
        sellingPrice: product.SellingPrice !== undefined ? String(product.SellingPrice) : '',
        minSellingPrice: product.MinSellingPrice !== undefined ? String(product.MinSellingPrice) : '',
        wholesalePrice: product.WholesalePrice !== undefined ? String(product.WholesalePrice) : '',
        stockQuantity: product.StockQuantity !== undefined ? String(product.StockQuantity) : '0',
        godownStock: product.GodownStock !== undefined ? String(product.GodownStock) : '0',
        minStockAlert: product.MinStockAlert !== undefined ? String(product.MinStockAlert) : '5',
        yardsPerThan: product.YardsPerThan ? String(product.YardsPerThan) : '25',
        remnantThreshold: product.RemnantThreshold !== undefined ? String(product.RemnantThreshold) : '',
        imageUrl: product.ImageUrl || '',
        imageCaption: product.ImageCaption || '',
        shortDescription: product.ShortDescription || '',
        description: product.Description || '',
        batchNumber: product.BatchNumber || '',
        mfgDate: product.MfgDate || '',
        expiryDate: product.ExpiryDate || '',
      });
      setImageBase64('');
      setImageMimeType('');
    } else {
      setVariants([]);
      setFormData({
        productName: '',
        category: categories[0]?.CategoryName || 'General',
        subCategory: '',
        barcode: '',
        unit: 'Pcs',
        supplierId: '',
        supplierName: '',
        costPrice: '',
        sellingPrice: '',
        minSellingPrice: '',
        wholesalePrice: '',
        stockQuantity: '0',
        godownStock: '0',
        minStockAlert: '5',
        yardsPerThan: '25',
        remnantThreshold: '',
        imageUrl: '',
        imageCaption: '',
        shortDescription: '',
        description: '',
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
      });
      setImageBase64('');
      setImageMimeType('');
    }
  }, [isOpen, product, categories]);

  const categoryOptions = useMemo(() => {
    const set = new Set(['General']);
    (categories || []).forEach((c) => {
      if (c.CategoryName) set.add(c.CategoryName);
    });
    (products || []).forEach((p) => {
      if (p.Category) set.add(p.Category);
    });
    if (formData.category) set.add(formData.category);
    return Array.from(set);
  }, [categories, products, formData.category]);

  const unitOptions = useMemo(() => {
    const set = new Set(['Pcs', 'থান', 'গজ', 'Kg', 'Set', 'Box', 'Dozen', 'Pair']);
    (units || []).forEach((u) => {
      if (u.UnitName) set.add(u.UnitName);
    });
    if (formData.unit) set.add(formData.unit);
    return Array.from(set);
  }, [units, formData.unit]);

  const handleGenerateBarcode = () => {
    const code = `PB${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
    setFormData((prev) => ({ ...prev, barcode: code }));
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result || '';
      setImageBase64(result);
      setImageMimeType(file.type || 'image/png');
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.productName.trim()) {
      nextErrors.productName = 'পণ্যের নাম আবশ্যক';
    }
    const costNum = Number(formData.costPrice);
    const sellNum = Number(formData.sellingPrice);
    if (isNaN(costNum) || costNum < 0) {
      nextErrors.costPrice = 'সঠিক কেনা দাম লিখুন';
    }
    if (isNaN(sellNum) || sellNum <= 0) {
      nextErrors.sellingPrice = 'সঠিক বিক্রয় মূল্য লিখুন';
    }
    if (formData.barcode.trim()) {
      const conflict = (products || []).find(
        (p) =>
          p.Barcode &&
          String(p.Barcode).trim().toLowerCase() === formData.barcode.trim().toLowerCase() &&
          (!isEditMode || p.ProductID !== product.ProductID)
      );
      if (conflict) {
        nextErrors.barcode = `বারকোডটি ইতিমধ্যে "${conflict.ProductName}" পণ্যে ব্যবহৃত।`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      if (errors.productName || errors.barcode) setActiveTab('basic');
      else setActiveTab('pricing');
      return;
    }

    const costNum = Number(formData.costPrice) || 0;
    const sellNum = Number(formData.sellingPrice) || 0;
    const minSellNum =
      formData.minSellingPrice !== '' ? Number(formData.minSellingPrice) : costNum;
    const wholesaleNum = Number(formData.wholesalePrice) || 0;
    const shopQty = Number(formData.stockQuantity) || 0;
    const godownQty = Number(formData.godownStock) || 0;
    const isThan = isThanUnit(formData.unit);
    const ypt = isThan ? Number(formData.yardsPerThan) || 25 : 0;

    setIsSubmitting(true);
    try {
      if (isEditMode && typeof onSubmitUpdate === 'function') {
        await onSubmitUpdate({
          productId: product.ProductID,
          productName: formData.productName.trim(),
          category: formData.category || 'General',
          subCategory: formData.subCategory.trim(),
          barcode: formData.barcode.trim(),
          unit: formData.unit || 'Pcs',
          Unit: formData.unit || 'Pcs',
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          costPrice: costNum,
          minSellingPrice: minSellNum,
          sellingPrice: sellNum,
          wholesalePrice: wholesaleNum,
          WholesalePrice: wholesaleNum,
          stockQuantity: shopQty,
          godownStock: godownQty,
          totalStock: shopQty + godownQty,
          minStockAlert: Number(formData.minStockAlert) || 5,
          yardsPerThan: ypt,
          YardsPerThan: ypt,
          remnantThreshold:
            formData.remnantThreshold !== ''
              ? Number(formData.remnantThreshold)
              : isThan || isFabricUnit(formData.unit)
              ? 1
              : 0,
          imageUrl: imageBase64 ? '' : formData.imageUrl.trim(),
          imageCaption: formData.imageCaption.trim(),
          imageBase64,
          imageMimeType,
          shortDescription: formData.shortDescription.trim(),
          description: formData.description.trim(),
          features: Array.isArray(product.Features) ? product.Features : [],
          hasVariants: variants.length > 0,
          variants,
          variantsJSON: variants.length > 0 ? JSON.stringify(variants) : '',
          batchNumber: formData.batchNumber.trim(),
          expiryDate: formData.expiryDate.trim(),
          mfgDate: formData.mfgDate.trim(),
          isBundle: Boolean(product.IsBundle),
          bundleItems: Array.isArray(product.BundleItems) ? product.BundleItems : [],
          bundleItemsJSON: product.BundleItemsJSON || '',
        });
      } else if (!isEditMode && typeof onSubmitProduct === 'function') {
        const totalYards = isThan
          ? godownQty * ypt + shopQty
          : /গজ|yard/i.test(formData.unit)
          ? godownQty + shopQty
          : 0;
        await onSubmitProduct({
          productName: formData.productName.trim(),
          category: formData.category || 'General',
          subCategory: formData.subCategory.trim(),
          barcode: formData.barcode.trim(),
          unit: formData.unit || 'Pcs',
          Unit: formData.unit || 'Pcs',
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          costPrice: costNum,
          wholesalePrice: wholesaleNum,
          WholesalePrice: wholesaleNum,
          minSellingPrice: minSellNum,
          sellingPrice: sellNum,
          initialStock: shopQty,
          StockQuantity: shopQty,
          initialGodownStock: godownQty,
          godownStock: godownQty,
          GodownStock: godownQty,
          minStockAlert: Number(formData.minStockAlert) || 5,
          yardsPerThan: ypt,
          YardsPerThan: ypt,
          thanCount: isThan ? godownQty : 0,
          ThanCount: isThan ? godownQty : 0,
          totalYards,
          TotalYards: totalYards,
          imageUrl: imageBase64 ? '' : formData.imageUrl.trim(),
          imageCaption: formData.imageCaption.trim(),
          imageBase64,
          imageMimeType,
          shortDescription: formData.shortDescription.trim(),
          description: formData.description.trim(),
          features: [],
          hasVariants: variants.length > 0,
          variants,
          variantsJSON: variants.length > 0 ? JSON.stringify(variants) : '',
          batchNumber: formData.batchNumber.trim(),
          expiryDate: formData.expiryDate.trim(),
          mfgDate: formData.mfgDate.trim(),
          isBundle: false,
          bundleItems: [],
          bundleItemsJSON: '',
        });
      }
      if (onClose) onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'সংরক্ষণে সমস্যা হয়েছে।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInlineCategory = async () => {
    const clean = newCategoryName.trim();
    if (!clean) return;
    if (onAddCategory) {
      await onAddCategory({ categoryName: clean });
    }
    setFormData((prev) => ({ ...prev, category: clean }));
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  const handleAddEmptyVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        VariantID: `VAR-${Date.now().toString().slice(-4)}`,
        Attributes: { Color: 'Standard', Size: 'Free' },
        Barcode: `${formData.barcode || 'VAR'}-${prev.length + 1}`,
        CostPrice: Number(formData.costPrice) || 0,
        SellingPrice: Number(formData.sellingPrice) || 0,
        StockQuantity: 0,
        GodownStock: 0,
      },
    ]);
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Product` : 'Add New Product'}
      subtitle={
        isEditMode
          ? `${product.ProductName} • SKU: ${product.ProductID}`
          : 'ইনভেন্টরিতে নতুন পণ্যের তথ্য, মূল্য ও স্টক যুক্ত করুন'
      }
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          {errors.submit ? (
            <span className="text-xs text-[#B91C1C] font-medium truncate">{errors.submit}</span>
          ) : (
            <span className="text-[11px] font-mono text-[#737373]">
              Esc to close
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] md:min-h-[36px] px-4 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="min-h-[44px] md:min-h-[36px] px-5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : isEditMode ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </div>
      }
    >
      {/* ড্রয়ার ট্যাব */}
      <div className="flex items-center gap-1 border-b border-neutral-200/80 pb-3 mb-4">
        {[
          { id: 'basic', label: 'Basic Info' },
          { id: 'pricing', label: 'Pricing & Stock' },
          { id: 'advanced', label: `Variants & Batch${variants.length > 0 ? ` (${variants.length})` : ''}` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-neutral-200/80 text-[#525252] hover:text-[#111111]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {activeTab === 'basic' && (
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-4">
            {/* পণ্যের নাম */}
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">
                Product Name <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: প্রিমিয়াম কটন থ্রি-পিস"
                value={formData.productName}
                onChange={(e) => setFormData((prev) => ({ ...prev, productName: e.target.value }))}
                className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
              />
              {errors.productName && (
                <p className="text-[11px] text-[#B91C1C] mt-1">{errors.productName}</p>
              )}
            </div>

            {/* ক্যাটাগরি ও সাব-ক্যাটাগরি */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#111111]">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                    className="text-[11px] font-medium text-[#0F172A] hover:underline cursor-pointer"
                  >
                    {showNewCategoryInput ? 'Cancel' : '+ New'}
                  </button>
                </div>
                {showNewCategoryInput ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 min-h-[38px] px-2.5 text-xs border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A]"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineCategory}
                      className="px-3 bg-[#0F172A] text-white text-xs font-medium rounded-md cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Unit (একক)
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* বারকোড ও সাপ্লায়ার */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Barcode / SKU
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Barcode className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Auto or scan barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                      className="w-full min-h-[44px] md:min-h-[38px] pl-8 pr-2.5 py-2 text-xs font-mono bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    title="অটো বারকোড তৈরি"
                    className="min-h-[44px] md:min-h-[38px] px-2.5 rounded-md border border-neutral-200/80 bg-[#FAFAFA] hover:bg-neutral-100 text-xs font-medium text-[#111111] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                {errors.barcode && (
                  <p className="text-[11px] text-[#B91C1C] mt-1">{errors.barcode}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Supplier (মহাজন)
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    const found = (suppliers || []).find((s) => String(s.SupplierID) === String(sId));
                    setFormData((prev) => ({
                      ...prev,
                      supplierId: sId,
                      supplierName: found ? found.SupplierName : '',
                    }));
                  }}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="">-- Optional --</option>
                  {(suppliers || []).map((s) => (
                    <option key={s.SupplierID} value={s.SupplierID}>
                      {s.SupplierName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* পণ্যের ছবি */}
            <div className="space-y-2 pt-2 border-t border-neutral-200/80">
              <label className="block text-xs font-medium text-[#111111]">
                Product Image URL or Upload
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://... image link"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setImageBase64('');
                    setFormData((prev) => ({ ...prev, imageUrl: e.target.value }));
                  }}
                  className="flex-1 min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
                <label className="min-h-[44px] md:min-h-[38px] px-3 py-2 rounded-md border border-neutral-200/80 bg-[#FAFAFA] hover:bg-neutral-100 text-xs font-medium text-[#111111] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                </label>
              </div>
              {errors.image && <p className="text-[11px] text-[#B91C1C]">{errors.image}</p>}
              {(imageBase64 || formData.imageUrl) && (
                <div className="flex items-center gap-3 p-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md">
                  <img
                    src={imageBase64 || formData.imageUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-sm border border-neutral-200"
                  />
                  <span className="text-[11px] text-[#525252]">Image preview attached</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Cost Price ({currencySymbol}) <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, costPrice: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
                {errors.costPrice && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.costPrice}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Selling Price ({currencySymbol}) <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="0"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums font-semibold bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
                {errors.sellingPrice && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.sellingPrice}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Min Floor Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional bargaining limit"
                  value={formData.minSellingPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minSellingPrice: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Wholesale Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={formData.wholesalePrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, wholesalePrice: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Shop Stock ({formData.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Godown Stock ({formData.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.godownStock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, godownStock: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Low Stock Alert Limit
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockAlert}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minStockAlert: e.target.value }))}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            {isThanUnit(formData.unit) && (
              <div className="p-3.5 bg-[#FAFAFA] border border-neutral-200/80 rounded-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#111111]">
                  <Scissors className="w-4 h-4 text-[#B45309]" />
                  <span>প্রতি থানে কত গজ? (Yards per Than)</span>
                </div>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={formData.yardsPerThan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, yardsPerThan: e.target.value }))}
                  className="w-24 h-9 px-2.5 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-right focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, batchNumber: e.target.value }))}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs font-mono bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs font-mono bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            {/* Variants List */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#525252]" />
                  <h4 className="text-xs font-semibold text-[#111111]">
                    Product Variants ({variants.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddEmptyVariant}
                  className="px-2.5 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Variant</span>
                </button>
              </div>

              {variants.length === 0 ? (
                <p className="text-xs text-[#737373]">কোনো কালার/সাইজ ভ্যারিয়েন্ট নেই (Simple Product)।</p>
              ) : (
                <div className="space-y-2">
                  {variants.map((v, vIdx) => (
                    <div
                      key={v.VariantID || vIdx}
                      className="p-3 bg-[#FAFAFA] border border-neutral-200/80 rounded-md grid grid-cols-12 gap-2 items-end text-xs"
                    >
                      <div className="col-span-4">
                        <label className="block text-[10px] text-[#525252] mb-0.5">Color / Label</label>
                        <input
                          type="text"
                          value={
                            v.Attributes
                              ? Object.values(v.Attributes).join(' / ')
                              : v.VariantName || ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariants((prev) =>
                              prev.map((item, idx) =>
                                idx === vIdx
                                  ? { ...item, Attributes: { Option: val }, VariantName: val }
                                  : item
                              )
                            );
                          }}
                          className="w-full h-8 px-2 bg-white border border-neutral-200/80 rounded-sm text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] text-[#525252] mb-0.5">Price</label>
                        <input
                          type="number"
                          value={v.SellingPrice || 0}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, idx) =>
                                idx === vIdx ? { ...item, SellingPrice: Number(e.target.value) || 0 } : item
                              )
                            )
                          }
                          className="w-full h-8 px-2 bg-white border border-neutral-200/80 rounded-sm text-xs font-mono tabular-nums"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-[#525252] mb-0.5">Shop</label>
                        <input
                          type="number"
                          value={v.StockQuantity || 0}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, idx) =>
                                idx === vIdx ? { ...item, StockQuantity: Number(e.target.value) || 0 } : item
                              )
                            )
                          }
                          className="w-full h-8 px-2 bg-white border border-neutral-200/80 rounded-sm text-xs font-mono tabular-nums"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-[#525252] mb-0.5">Godown</label>
                        <input
                          type="number"
                          value={v.GodownStock || 0}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, idx) =>
                                idx === vIdx ? { ...item, GodownStock: Number(e.target.value) || 0 } : item
                              )
                            )
                          }
                          className="w-full h-8 px-2 bg-white border border-neutral-200/80 rounded-sm text-xs font-mono tabular-nums"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== vIdx))}
                          className="h-8 w-8 flex items-center justify-center text-[#737373] hover:text-[#B91C1C] cursor-pointer"
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
        )}
      </form>
    </SlideOverDrawer>
  );
}
