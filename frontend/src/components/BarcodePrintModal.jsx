import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Printer,
  Tag,
  Barcode as BarcodeIcon,
  Search,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Sliders,
  Store,
  Sparkles,
  Layers,
  Settings2,
  RefreshCw,
  AlertCircle,
  Check,
  Grid,
  Box,
  ChevronRight
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

// একক বারকোড স্টিকার কার্ড রেন্ডারার
function SingleStickerItem({
  barcode,
  productName,
  price,
  currencySymbol = '৳',
  storeName = 'Pabna Bostraloy',
  showStoreName = true,
  showProductName = true,
  showPrice = true,
  showCodeText = true,
  format = 'thermal-50x30',
  isPrintVersion = false
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        const isCompact = format === 'thermal-40x25' || format === 'thermal-38x25';
        JsBarcode(svgRef.current, String(barcode), {
          format: 'CODE128',
          width: isCompact ? 1.3 : 1.6,
          height: isCompact ? 26 : 34,
          displayValue: showCodeText,
          fontSize: isCompact ? 9 : 11,
          font: 'monospace',
          fontOptions: 'bold',
          textMargin: 1,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.warn('JsBarcode render error:', err);
      }
    }
  }, [barcode, showCodeText, format]);

  // স্টাইল ও সাইজ কনফিগারেশন
  const getContainerStyles = () => {
    if (format === 'thermal-50x30') {
      return isPrintVersion
        ? 'w-[50mm] h-[30mm] p-[1.5mm] box-border'
        : 'w-[230px] h-[138px] p-2.5';
    }
    if (format === 'thermal-40x25') {
      return isPrintVersion
        ? 'w-[40mm] h-[25mm] p-[1mm] box-border'
        : 'w-[195px] h-[120px] p-2';
    }
    if (format === 'thermal-38x25') {
      return isPrintVersion
        ? 'w-[38mm] h-[25mm] p-[1mm] box-border'
        : 'w-[185px] h-[118px] p-1.5';
    }
    // A4 sheet sticker
    return isPrintVersion
      ? 'w-[65mm] h-[35mm] p-[2mm] box-border'
      : 'w-[240px] h-[135px] p-2.5';
  };

  return (
    <div
      className={`bg-white text-black flex flex-col justify-between items-center text-center select-none ${getContainerStyles()} ${
        isPrintVersion
          ? 'break-inside-avoid page-break-avoid'
          : 'border-2 border-slate-300 rounded-2xl shadow-md hover:shadow-lg transition-all mx-auto'
      }`}
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        ...(isPrintVersion && format.startsWith('thermal') ? { pageBreakAfter: 'always', breakAfter: 'page' } : {})
      }}
    >
      {/* দোকান বা ব্র্যান্ডের নাম */}
      {showStoreName && (
        <div className="w-full truncate font-black text-[11px] uppercase tracking-wider leading-none text-slate-900 border-b border-dashed border-slate-300 pb-0.5">
          {storeName}
        </div>
      )}

      {/* পণ্যের নাম */}
      {showProductName && (
        <div className="w-full truncate font-bold text-[10px] text-slate-800 leading-tight px-0.5 mt-0.5">
          {productName || 'পণ্য'}
        </div>
      )}

      {/* এসভিজি বারকোড (JsBarcode রেন্ডার) */}
      <div className="w-full flex justify-center items-center my-0.5 overflow-hidden">
        {barcode ? (
          <svg ref={svgRef} className="max-w-full h-auto block" />
        ) : (
          <div className="text-[10px] text-rose-500 font-bold py-1.5">বারকোড নেই</div>
        )}
      </div>

      {/* পণ্যের বিক্রয়মূল্য (MRP) */}
      {showPrice && price !== undefined && (
        <div className="w-full flex items-center justify-center font-black text-[12px] text-slate-950 leading-none pt-0.5 border-t border-dashed border-slate-300">
          <span>মূল্য: {currencySymbol}{Number(price).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export default function BarcodePrintModal({
  isOpen,
  onClose,
  products = [],
  currencySymbol = '৳',
  storeName = 'Pabna Bostraloy'
}) {
  // মোড: 'single' (একক পণ্য দ্রুত প্রিন্ট) | 'batch' (একাধিক পণ্য ব্যাচ প্রিন্ট)
  const [activeTab, setActiveTab] = useState('single');
  
  // Single Product Mode State
  const [singleProductId, setSingleProductId] = useState('');
  const [singleQuantity, setSingleQuantity] = useState(10);

  // Batch Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: quantity }
  
  // Printer Format Preset
  const [format, setFormat] = useState('thermal-50x30'); // 'thermal-50x30' | 'thermal-40x25' | 'thermal-38x25' | 'a4-sheet'

  // Customization Toggles
  const [customStoreName, setCustomStoreName] = useState(storeName || 'Pabna Bostraloy');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCodeText, setShowCodeText] = useState(true);

  // ডিফল্ট পণ্য সিলেকশন ইনিশিয়ালাইজেশন
  useEffect(() => {
    if (isOpen && products.length > 0) {
      if (!singleProductId) {
        setSingleProductId(products[0].ProductID);
        setSingleQuantity(Math.max(1, Number(products[0].StockQuantity) || 10));
      }
      setCustomStoreName(storeName || 'Pabna Bostraloy');
    }
  }, [isOpen, products, storeName]);

  // নির্বাচিত একক পণ্য অবজেক্ট
  const selectedSingleProduct = useMemo(() => {
    if (!products.length) return null;
    return products.find(p => p.ProductID === singleProductId) || products[0];
  }, [products, singleProductId]);

  // ক্যাটাগরি তালিকা
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.Category) set.add(p.Category);
    });
    return Array.from(set);
  }, [products]);

  // ফিল্টার করা পণ্য তালিকা (ব্যাচ মোডের জন্য)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'ALL' || p.Category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.Barcode && String(p.Barcode).toLowerCase().includes(q)) ||
        (p.SKU && String(p.SKU).toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  // ব্যাচ সিলেকশন টগল
  const handleToggleBatchItem = (product) => {
    const prodId = product.ProductID;
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[prodId]) {
        delete next[prodId];
      } else {
        const defaultQty = Number(product.StockQuantity) > 0 ? Number(product.StockQuantity) : 10;
        next[prodId] = Math.min(500, Math.max(1, defaultQty));
      }
      return next;
    });
  };

  // ব্যাচ পরিমাণ পরিবর্তন
  const handleBatchQuantityChange = (productId, qty) => {
    const validQty = Math.max(1, Math.min(500, parseInt(qty, 10) || 1));
    setSelectedItems(prev => ({
      ...prev,
      [productId]: validQty
    }));
  };

  // সব ফিল্টার করা পণ্য নির্বাচন
  const handleSelectAllFiltered = () => {
    const updated = { ...selectedItems };
    filteredProducts.forEach(p => {
      if (!updated[p.ProductID]) {
        const qty = Number(p.StockQuantity) > 0 ? Number(p.StockQuantity) : 10;
        updated[p.ProductID] = Math.min(500, Math.max(1, qty));
      }
    });
    setSelectedItems(updated);
  };

  // সব নির্বাচন বাতিল
  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  // প্রিন্টের জন্য মোট স্টিকার অ্যারে তৈরি
  const printItemsList = useMemo(() => {
    const list = [];
    if (activeTab === 'single') {
      if (selectedSingleProduct) {
        const count = Math.max(1, singleQuantity);
        for (let i = 0; i < count; i++) {
          list.push({
            productName: selectedSingleProduct.ProductName,
            barcode: selectedSingleProduct.Barcode || selectedSingleProduct.SKU || selectedSingleProduct.ProductID,
            price: selectedSingleProduct.SellingPrice
          });
        }
      }
    } else {
      // ব্যাচ মোড
      products.forEach(p => {
        const count = selectedItems[p.ProductID];
        if (count && count > 0) {
          for (let i = 0; i < count; i++) {
            list.push({
              productName: p.ProductName,
              barcode: p.Barcode || p.SKU || p.ProductID,
              price: p.SellingPrice
            });
          }
        }
      });
    }
    return list;
  }, [activeTab, selectedSingleProduct, singleQuantity, products, selectedItems]);

  const totalStickerCount = printItemsList.length;

  // লাইভ প্রিভিউ আইটেম
  const previewItem = useMemo(() => {
    if (activeTab === 'single') {
      return selectedSingleProduct ? {
        productName: selectedSingleProduct.ProductName,
        barcode: selectedSingleProduct.Barcode || selectedSingleProduct.SKU || selectedSingleProduct.ProductID,
        price: selectedSingleProduct.SellingPrice
      } : null;
    } else {
      // ব্যাচ মোডে নির্বাচিত প্রথম পণ্য অথবা লিস্টের প্রথম পণ্য
      const firstSelectedId = Object.keys(selectedItems)[0];
      const prod = firstSelectedId 
        ? products.find(p => p.ProductID === firstSelectedId)
        : (filteredProducts[0] || products[0]);
      return prod ? {
        productName: prod.ProductName,
        barcode: prod.Barcode || prod.SKU || prod.ProductID,
        price: prod.SellingPrice
      } : null;
    }
  }, [activeTab, selectedSingleProduct, selectedItems, products, filteredProducts]);

  // প্রিন্ট হ্যান্ডলার
  const handlePrint = () => {
    if (totalStickerCount === 0) return;
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      style={{ zIndex: 100 }}
    >
      
      {/* স্ক্রিন ইন্টারেক্টিভ মডাল (নো-প্রিন্ট) */}
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[88vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 no-print relative"
        style={{ zIndex: 101 }}
      >
        
        {/* ১. হেডার */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  বারকোড লেবেল ও প্রাইস ট্যাগ জেনারেটর
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Thermal & Sticker Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                পণ্যের বারকোড স্টিকার প্রিন্ট করুন এবং থার্মাল রোলে নিখুঁত লেবেল তৈরি করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ২. মোড ট্যাব সিলেকশন (Single vs Batch) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 bg-slate-200/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>একক পণ্য দ্রুত প্রিন্ট</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>একাধিক পণ্য ব্যাচ প্রিন্ট</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-600 hidden sm:block">
            মোট স্টিকার: <span className="text-indigo-600 font-black">{totalStickerCount} টি</span>
          </div>
        </div>

        {/* ৩. মেইন কনটেন্ট বডি (বামপাশে ইনপুট/পণ্য ও ডানপাশে লাইভ প্রিভিউ) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* বাম পাশ: পণ্য ও সেটিংস নির্বাচন (৭ কলাম) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* ট্যাব ১: একক পণ্য মোড */}
            {activeTab === 'single' && (
              <div className="space-y-4">
                {/* পণ্য ড্রপডাউন সিলেক্টর */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Box className="w-4 h-4 text-indigo-600" />
                    <span>পণ্য নির্বাচন করুন</span>
                  </label>
                  
                  <select
                    value={singleProductId}
                    onChange={(e) => {
                      setSingleProductId(e.target.value);
                      const prod = products.find(p => p.ProductID === e.target.value);
                      if (prod) {
                        setSingleQuantity(Math.max(1, Number(prod.StockQuantity) || 10));
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.ProductID} value={p.ProductID}>
                        {p.ProductName} (বারকোড: {p.Barcode || 'নেই'} | মূল্য: ৳{p.SellingPrice} | স্টক: {p.StockQuantity || 0})
                      </option>
                    ))}
                  </select>

                  {selectedSingleProduct && (
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 px-1">
                      <span>ক্যাটাগরি: <strong>{selectedSingleProduct.Category || 'General'}</strong></span>
                      <span>বর্তমান স্টক: <strong className="text-indigo-700">{selectedSingleProduct.StockQuantity || 0} পিস</strong></span>
                      <span>বিক্রয়মূল্য: <strong className="text-slate-900">৳{selectedSingleProduct.SellingPrice}</strong></span>
                    </div>
                  )}
                </div>

                {/* স্টিকার সংখ্যা সিলেক্টর ও দ্রুত বাটন */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <span>কতোটি স্টিকার প্রিন্ট করতে চান? (Quantity)</span>
                    </label>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      মোট: {singleQuantity} টি স্টিকার
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSingleQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={singleQuantity}
                      onChange={(e) => setSingleQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="flex-1 py-2 text-center text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />

                    <button
                      type="button"
                      onClick={() => setSingleQuantity((q) => q + 1)}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* দ্রুত সংখ্যা প্রিসেট বাটন */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 self-center mr-1">দ্রুত যোগ:</span>
                    {[
                      { label: '+১', val: 1 },
                      { label: '+৫', val: 5 },
                      { label: '+১০', val: 10 },
                      { label: '+২০', val: 20 },
                      { label: '+৫০', val: 50 },
                      { label: 'বর্তমান স্টক সমান', val: Number(selectedSingleProduct?.StockQuantity) || 10 },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (preset.label === 'বর্তমান স্টক সমান') {
                            setSingleQuantity(preset.val);
                          } else {
                            setSingleQuantity((q) => q + preset.val);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-2xs cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ট্যাব ২: ব্যাচ মাল্টি-সিলেক্ট মোড */}
            {activeTab === 'batch' && (
              <div className="space-y-3">
                {/* সার্চ ও ক্যাটাগরি ফিল্টার */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="পণ্য, বারকোড বা SKU দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {categories.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="ALL">সকল ক্যাটাগরি</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* কুইক অ্যাকশন রো */}
                <div className="flex items-center justify-between text-xs bg-slate-100 p-2.5 rounded-xl text-slate-700">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>সব সিলেক্ট ({filteredProducts.length})</span>
                    </button>

                    {Object.keys(selectedItems).length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>সিলেকশন মুছুন</span>
                      </button>
                    )}
                  </div>

                  <span className="font-black text-indigo-950">
                    নির্বাচিত: {Object.keys(selectedItems).length} টি পণ্য ({totalStickerCount} টি স্টিকার)
                  </span>
                </div>

                {/* পণ্য তালিকা স্ক্রোল এরিয়া */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">সিলেক্ট</th>
                        <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
                        <th className="py-2.5 px-3 text-right">মূল্য</th>
                        <th className="py-2.5 px-3 text-center">স্টক</th>
                        <th className="py-2.5 px-3 text-center w-28">প্রিন্ট কপি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map(p => {
                        const isSelected = !!selectedItems[p.ProductID];
                        const currentQty = selectedItems[p.ProductID] || 10;
                        return (
                          <tr
                            key={p.ProductID}
                            className={`transition-colors ${isSelected ? 'bg-indigo-50/50 font-bold' : 'hover:bg-slate-50'}`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleBatchItem(p)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3 cursor-pointer" onClick={() => handleToggleBatchItem(p)}>
                              <div className="text-slate-900">{p.ProductName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                বারকোড: {p.Barcode || 'নেই'} {p.SKU ? `| SKU: ${p.SKU}` : ''}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              {currencySymbol}{Number(p.SellingPrice || 0).toFixed(2)}
                            </td>

                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {p.StockQuantity || 0}
                            </td>

                            <td className="py-2.5 px-3">
                              {isSelected ? (
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleBatchQuantityChange(p.ProductID, currentQty - 1)}
                                    className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={currentQty}
                                    onChange={(e) => handleBatchQuantityChange(p.ProductID, e.target.value)}
                                    className="w-12 py-0.5 text-center bg-white border border-slate-300 rounded text-xs font-bold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleBatchQuantityChange(p.ProductID, currentQty + 1)}
                                    className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-[11px]">-</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ফরম্যাট ও কাস্টমাইজেশন অ্যাকর্ডিয়ন */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Grid className="w-4 h-4 text-indigo-600" />
                <span>প্রিন্টার পেপার সাইজ ফরম্যাট:</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'thermal-50x30', label: '৫০ × ৩০ মিমি', desc: 'স্ট্যান্ডার্ড রোল' },
                  { id: 'thermal-40x25', label: '৪০ × ২৫ মিমি', desc: 'কম্প্যাক্ট লেবেল' },
                  { id: 'thermal-38x25', label: '৩৮ × ২৫ মিমি', desc: 'মিনি স্টিকার' },
                  { id: 'a4-sheet', label: 'A4 পেপার', desc: '৩×৮ (২৪টি)' },
                ].map(fmt => {
                  const isSelected = format === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black">{fmt.label}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{fmt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* টগল সেটিংস */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">দোকানের নাম (Header)</label>
                  <input
                    type="text"
                    value={customStoreName}
                    onChange={(e) => setCustomStoreName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-700 pt-1">
                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStoreName}
                      onChange={(e) => setShowStoreName(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>দোকান নাম</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProductName}
                      onChange={(e) => setShowProductName(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>পণ্যের নাম</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>মূল্য (MRP)</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCodeText}
                      onChange={(e) => setShowCodeText(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>বারকোড সংখ্যা</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* ডান পাশ: রিয়েল-টাইম থার্মাল স্টিকার প্রিভিউ প্যানেল (৫ কলাম) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-100 to-slate-200/80 border border-slate-300 rounded-3xl p-5 flex flex-col items-center justify-between min-h-[380px] shadow-inner space-y-4">
            
            <div className="w-full text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                লাইভ স্টিকার প্রিভিউ (Live Preview)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                কাগজে ঠিক যেমনটি প্রিন্ট হবে
              </span>
            </div>

            {/* স্টিকার স্যাম্পল ডিসপ্লে */}
            <div className="w-full flex items-center justify-center py-2">
              {previewItem ? (
                <SingleStickerItem
                  barcode={previewItem.barcode}
                  productName={previewItem.productName}
                  price={previewItem.price}
                  currencySymbol={currencySymbol}
                  storeName={customStoreName}
                  showStoreName={showStoreName}
                  showProductName={showProductName}
                  showPrice={showPrice}
                  showCodeText={showCodeText}
                  format={format}
                  isPrintVersion={false}
                />
              ) : (
                <div className="text-xs text-slate-400 py-10 text-center">
                  কোনো পণ্য পাওয়া যায়নি
                </div>
              )}
            </div>

            {/* প্রিন্ট সারাংশ ও নির্দেশনা */}
            <div className="w-full text-center space-y-1 bg-white/70 backdrop-blur-xs p-3 rounded-2xl border border-slate-200/80 text-xs">
              <div className="font-black text-indigo-950">
                মোট {totalStickerCount} টি স্টিকার প্রিন্ট হবে
              </div>
              <div className="text-[11px] text-slate-500">
                {format === 'a4-sheet' 
                  ? 'A4 পেপারের প্রতি শীটে ২৪টি করে লেবেল সাজানো থাকবে'
                  : 'থার্মাল প্রিন্টারে প্রতিটি স্টিকারের পর অটো-কাট / পেজ ব্রেক হবে'}
              </div>
            </div>

          </div>

        </div>

        {/* ৪. ফুটার অ্যাকশন বার (নো-প্রিন্ট) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            নির্বাচিত ফরম্যাট: <strong className="text-slate-800">{format}</strong>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={totalStickerCount === 0}
              className="px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-300 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{totalStickerCount} টি স্টিকার প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ৫. প্রিন্টেবল এরিয়া (#printable-batch-barcode-stickers)
          শুধুমাত্র window.print() কলের সময় সরাসরি প্রিন্টারে পাঠাবে
         ========================================================================= */}
      <div id="printable-batch-barcode-stickers" className="hidden">
        <div className={`barcode-print-wrapper ${format === 'a4-sheet' ? 'a4-grid-layout' : 'thermal-roll-layout'}`}>
          {printItemsList.map((item, index) => (
            <SingleStickerItem
              key={index}
              productName={item.productName}
              barcode={item.barcode}
              price={item.price}
              currencySymbol={currencySymbol}
              storeName={customStoreName}
              showStoreName={showStoreName}
              showProductName={showProductName}
              showPrice={showPrice}
              showCodeText={showCodeText}
              format={format}
              isPrintVersion={true}
            />
          ))}
        </div>
      </div>

      {/* প্রিন্ট সিএসএস স্টাইল */}
      <style>{`
        @media print {
          @page {
            margin: 0mm !important;
            size: auto;
          }

          body * {
            visibility: hidden !important;
          }

          .no-print, .no-print * {
            display: none !important;
          }

          #printable-batch-barcode-stickers,
          #printable-batch-barcode-stickers * {
            visibility: visible !important;
          }

          #printable-batch-barcode-stickers {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .thermal-roll-layout {
            display: block !important;
            width: 100% !important;
          }

          .thermal-roll-layout > div {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
          }

          .a4-grid-layout {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 2mm !important;
            padding: 5mm !important;
            width: 210mm !important;
            box-sizing: border-box !important;
          }

          .a4-grid-layout > div {
            border: 1px dashed #cccccc !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}
