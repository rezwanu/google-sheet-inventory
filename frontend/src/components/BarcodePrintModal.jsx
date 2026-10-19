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
  AlertCircle
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

// Single Barcode SVG item renderer
function BarcodeSvgItem({
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
          width: isCompact ? 1.3 : 1.7,
          height: isCompact ? 24 : 32,
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

  // Dimensions based on preset
  const getContainerStyles = () => {
    if (format === 'thermal-50x30') {
      return isPrintVersion
        ? 'w-[50mm] h-[30mm] p-[1.5mm] box-border'
        : 'w-[200px] h-[120px] p-2';
    }
    if (format === 'thermal-40x25') {
      return isPrintVersion
        ? 'w-[40mm] h-[25mm] p-[1mm] box-border'
        : 'w-[170px] h-[106px] p-1.5';
    }
    if (format === 'thermal-38x25') {
      return isPrintVersion
        ? 'w-[38mm] h-[25mm] p-[1mm] box-border'
        : 'w-[160px] h-[105px] p-1.5';
    }
    if (format === 'sheet-2up') {
      return isPrintVersion
        ? 'w-[48mm] h-[28mm] p-[1.5mm] box-border'
        : 'w-[190px] h-[112px] p-2';
    }
    // A4 sheet preset: 24 labels (65x35mm approx)
    return isPrintVersion
      ? 'w-[65mm] h-[33.9mm] p-[2mm] box-border'
      : 'w-[210px] h-[115px] p-2';
  };

  return (
    <div
      className={`bg-white text-black flex flex-col justify-between items-center text-center select-none overflow-hidden ${getContainerStyles()} ${
        isPrintVersion
          ? 'break-inside-avoid page-break-avoid'
          : 'border border-slate-300 rounded-xl shadow-xs'
      }`}
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        ...(isPrintVersion && format.startsWith('thermal') ? { pageBreakAfter: 'always', breakAfter: 'page' } : {})
      }}
    >
      {/* Store Name Header */}
      {showStoreName && (
        <div className="w-full truncate font-black text-[10px] sm:text-[11px] uppercase tracking-wider leading-none text-slate-900 border-b border-dashed border-slate-300 pb-0.5">
          {storeName}
        </div>
      )}

      {/* Product Name */}
      {showProductName && (
        <div className="w-full truncate font-bold text-[9px] sm:text-[10px] text-slate-800 leading-tight px-0.5 mt-0.5">
          {productName || 'পণ্য'}
        </div>
      )}

      {/* SVG Barcode */}
      <div className="w-full flex justify-center items-center my-0.5 overflow-hidden">
        {barcode ? (
          <svg ref={svgRef} className="max-w-full h-auto block" />
        ) : (
          <div className="text-[9px] text-rose-500 font-bold py-1">বারকোড নেই</div>
        )}
      </div>

      {/* MRP Price */}
      {showPrice && price !== undefined && (
        <div className="w-full flex items-center justify-center font-black text-[11px] sm:text-[12px] text-slate-950 leading-none pt-0.5 border-t border-dashed border-slate-300">
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: quantity }
  const [format, setFormat] = useState('thermal-50x30'); // 'thermal-50x30' | 'thermal-40x25' | 'thermal-38x25' | 'sheet-2up' | 'sheet-a4-24'
  
  // Customization Toggles
  const [customStoreName, setCustomStoreName] = useState(storeName || 'Pabna Bostraloy');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCodeText, setShowCodeText] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    setCustomStoreName(storeName || 'Pabna Bostraloy');
  }, [storeName]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.Category) set.add(p.Category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'ALL' || p.Category === categoryFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.Barcode && String(p.Barcode).toLowerCase().includes(q)) ||
        (p.SKU && String(p.SKU).toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  // Toggle item selection
  const handleToggleItem = (product) => {
    const prodId = product.ProductID;
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[prodId]) {
        delete next[prodId];
      } else {
        // default count: product's stock or 1
        const defaultQty = Number(product.StockQuantity) > 0 ? Number(product.StockQuantity) : 1;
        next[prodId] = Math.min(100, Math.max(1, defaultQty));
      }
      return next;
    });
  };

  // Change quantity for item
  const handleQuantityChange = (productId, qty) => {
    const validQty = Math.max(1, Math.min(500, parseInt(qty, 10) || 1));
    setSelectedItems(prev => ({
      ...prev,
      [productId]: validQty
    }));
  };

  // Quick Select: All Filtered
  const handleSelectAllFiltered = () => {
    const updated = { ...selectedItems };
    filteredProducts.forEach(p => {
      if (!updated[p.ProductID]) {
        const qty = Number(p.StockQuantity) > 0 ? Number(p.StockQuantity) : 1;
        updated[p.ProductID] = Math.min(100, Math.max(1, qty));
      }
    });
    setSelectedItems(updated);
  };

  // Quick Deselect All
  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  // Flattened stickers list for print & preview
  const stickersToPrint = useMemo(() => {
    const list = [];
    products.forEach(p => {
      const count = selectedItems[p.ProductID];
      if (count && count > 0) {
        for (let i = 0; i < count; i++) {
          list.push({
            productId: p.ProductID,
            productName: p.ProductName,
            barcode: p.Barcode || p.SKU || '',
            price: p.SellingPrice
          });
        }
      }
    });
    return list;
  }, [products, selectedItems]);

  const totalStickerCount = stickersToPrint.length;
  const totalProductsSelected = Object.keys(selectedItems).length;

  // Print Handler with CSS class injection
  const handlePrint = () => {
    document.body.classList.add('print-mode-barcode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-mode-barcode');
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Printable Area (Visible ONLY during window.print) */}
      <div className="hidden print:block fixed inset-0 z-9999 bg-white text-black p-0 m-0">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              .hidden.print\\:block, .hidden.print\\:block * {
                visibility: visible !important;
              }
              @page {
                size: auto;
                margin: 0mm;
              }
              body {
                margin: 0px !important;
                padding: 0px !important;
                background: #fff !important;
              }
            }
          `
        }} />

        <div className={`
          ${format === 'sheet-a4-24' 
            ? 'grid grid-cols-3 gap-2 p-4' 
            : format === 'sheet-2up' 
            ? 'grid grid-cols-2 gap-1 p-1' 
            : 'flex flex-col items-center justify-start'}
        `}>
          {stickersToPrint.map((sticker, idx) => (
            <BarcodeSvgItem
              key={idx}
              barcode={sticker.barcode}
              productName={sticker.productName}
              price={sticker.price}
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

      {/* Screen Interactive Modal (Hidden in Print) */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 no-print">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <BarcodeIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  থার্মাল বারকোড লেবেল ও প্রাইস ট্যাগ জেনারেটর
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Thermal & Laser Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                একসাথে একাধিক পণ্যের বারকোড স্টিকার নির্বাচন করুন, সাইজ কাস্টমাইজ করুন এবং ১-ক্লিকে প্রিন্ট দিন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: 2 Columns Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Product Selection & Quantities (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search and Category Filter */}
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

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between text-xs bg-slate-100 p-2.5 rounded-xl text-slate-700">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>সব সিলেক্ট করুন ({filteredProducts.length})</span>
                </button>

                {totalProductsSelected > 0 && (
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
                নির্বাচিত: {totalProductsSelected} টি পণ্য ({totalStickerCount} টি স্টিকার)
              </span>
            </div>

            {/* Product Items List Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">সিলেক্ট</th>
                    <th className="py-2 px-3">পণ্যের বিবরণ</th>
                    <th className="py-2 px-3 text-right">বিক্রয়মূল্য</th>
                    <th className="py-2 px-3 text-center">স্টক</th>
                    <th className="py-2 px-3 text-center w-32">প্রিন্ট সংখ্যা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(p => {
                    const isSelected = !!selectedItems[p.ProductID];
                    const currentQty = selectedItems[p.ProductID] || 1;
                    return (
                      <tr
                        key={p.ProductID}
                        className={`transition-colors ${isSelected ? 'bg-indigo-50/40 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleItem(p)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3" onClick={() => handleToggleItem(p)}>
                          <div className="text-slate-900 cursor-pointer">{p.ProductName}</div>
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
                                onClick={() => handleQuantityChange(p.ProductID, currentQty - 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="500"
                                value={currentQty}
                                onChange={(e) => handleQuantityChange(p.ProductID, e.target.value)}
                                className="w-12 py-0.5 text-center bg-white border border-slate-300 rounded text-xs font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(p.ProductID, currentQty + 1)}
                                className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
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

          {/* Right Column: Format Preset, Customization & Live Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Format Preset Selector */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>লেবেল সাইজ ও প্রিন্টার প্রিসেট</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'thermal-50x30', label: '50mm × 30mm', sub: 'স্ট্যান্ডার্ড থার্মাল সিঙ্গেল' },
                  { id: 'thermal-40x25', label: '40mm × 25mm', sub: 'কম্প্যাক্ট জুয়েলারি / গিফট' },
                  { id: 'thermal-38x25', label: '38mm × 25mm', sub: 'মিনি বারকোড স্টিকার' },
                  { id: 'sheet-2up', label: '2-Across Roll', sub: 'ডাবল কলাম থার্মাল' },
                  { id: 'sheet-a4-24', label: 'A4 Sheet (24 pcs)', sub: 'লেজার / ইঙ্কজেট স্টিকার শীট' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      format === opt.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div className={`text-[10px] ${format === opt.id ? 'text-indigo-100' : 'text-slate-500'}`}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customization Options */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span>স্টিকার লেআউট কাস্টমাইজেশন</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">দোকানের নাম (Header)</label>
                <input
                  type="text"
                  value={customStoreName}
                  onChange={(e) => setCustomStoreName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>দোকানের নাম দেখান</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>পণ্যের নাম দেখান</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>মূল্য (৳ MRP) দেখান</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCodeText}
                    onChange={(e) => setShowCodeText(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>বারকোড সংখ্যা দেখান</span>
                </label>
              </div>
            </div>

            {/* Live Sticker Preview Box */}
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                লাইভ প্রিভিউ (একটি স্টিকার স্যাম্পল)
              </span>

              {stickersToPrint.length > 0 ? (
                <BarcodeSvgItem
                  barcode={stickersToPrint[0].barcode}
                  productName={stickersToPrint[0].productName}
                  price={stickersToPrint[0].price}
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
                <div className="text-xs text-slate-400 py-6 text-center">
                  বামদিকের তালিকা থেকে যেকোনো পণ্য সিলেক্ট করুন।
                </div>
              )}
            </div>

            {/* Print Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={totalStickerCount === 0}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-indigo-300 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>প্রিন্ট করুন ({totalStickerCount} টি স্টিকার)</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
