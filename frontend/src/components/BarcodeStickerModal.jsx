import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Tag, 
  Barcode as BarcodeIcon, 
  Layers, 
  Plus, 
  Minus, 
  Settings2, 
  Check, 
  Store, 
  Sparkles, 
  Grid, 
  FileText,
  Sliders,
  AlertCircle
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

// একক বারকোড স্টিকার কার্ড কম্পোনেন্ট
function SingleBarcodeSticker({
  productName,
  barcode,
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
        const isCompact = format === 'thermal-40x25';
        JsBarcode(svgRef.current, String(barcode), {
          format: 'CODE128',
          width: isCompact ? 1.4 : 1.7,
          height: isCompact ? 28 : 36,
          displayValue: showCodeText,
          fontSize: isCompact ? 10 : 11,
          font: 'monospace',
          fontOptions: 'bold',
          textMargin: 1,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
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
        ? 'w-[50mm] h-[30mm] p-[1.5mm] box-border overflow-hidden' 
        : 'w-[220px] h-[132px] p-2';
    }
    if (format === 'thermal-40x25') {
      return isPrintVersion 
        ? 'w-[40mm] h-[25mm] p-[1mm] box-border overflow-hidden' 
        : 'w-[185px] h-[115px] p-1.5';
    }
    // A4 sheet sticker
    return isPrintVersion 
      ? 'w-[65mm] h-[35mm] p-[2mm] box-border overflow-hidden' 
      : 'w-[240px] h-[135px] p-2.5';
  };

  return (
    <div 
      className={`bg-white text-black flex flex-col justify-between items-center text-center select-none ${getContainerStyles()} ${
        isPrintVersion 
          ? 'break-inside-avoid page-break-avoid' 
          : 'border-2 border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-shadow'
      }`}
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        ...(isPrintVersion && format.startsWith('thermal') ? { pageBreakAfter: 'always', breakAfter: 'page' } : {})
      }}
    >
      {/* দোকান বা ব্র্যান্ডের নাম */}
      {showStoreName && (
        <div className="w-full truncate font-black text-[11px] sm:text-[12px] uppercase tracking-wider leading-none text-slate-900 border-b border-dashed border-slate-300 pb-0.5">
          {storeName}
        </div>
      )}

      {/* পণ্যের নাম */}
      {showProductName && (
        <div className="w-full truncate font-bold text-[10px] sm:text-[11px] text-slate-800 leading-tight px-0.5 mt-0.5">
          {productName || 'পণ্য'}
        </div>
      )}

      {/* এসভিজি বারকোড (JsBarcode রেন্ডার) */}
      <div className="w-full flex justify-center items-center my-0.5 overflow-hidden">
        {barcode ? (
          <svg ref={svgRef} className="max-w-full h-auto block" />
        ) : (
          <div className="text-[10px] text-rose-500 font-bold py-2">কোনো বারকোড নেই</div>
        )}
      </div>

      {/* পণ্যের বিক্রয়মূল্য (MRP) */}
      {showPrice && price !== undefined && (
        <div className="w-full flex items-center justify-center font-black text-[12px] sm:text-[13px] text-slate-950 leading-none pt-0.5 border-t border-dashed border-slate-300">
          <span>মূল্য: {currencySymbol}{Number(price).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export default function BarcodeStickerModal({
  isOpen,
  onClose,
  product,
  initialQuantity = 10,
  currencySymbol = '৳',
  storeName = 'Pabna Bostraloy',
}) {
  const [quantity, setQuantity] = useState(initialQuantity || 10);
  const [format, setFormat] = useState('thermal-50x30'); // 'thermal-50x30' | 'thermal-40x25' | 'a4-sheet'
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCodeText, setShowCodeText] = useState(true);
  const [customStoreName, setCustomStoreName] = useState(storeName || 'Pabna Bostraloy');
  const [customPrice, setCustomPrice] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(Math.max(1, Number(initialQuantity) || Number(product.StockQuantity) || 10));
      setCustomPrice(product.SellingPrice !== undefined ? String(product.SellingPrice) : '');
      setCustomStoreName(storeName || 'Pabna Bostraloy');
    }
  }, [isOpen, product, initialQuantity, storeName]);

  if (!isOpen || !product) return null;

  const effectivePrice = customPrice !== '' ? Number(customPrice) : Number(product.SellingPrice || 0);
  const effectiveBarcode = product.Barcode || '';

  // প্রিন্ট হ্যান্ডলার
  const handlePrint = () => {
    // প্রিন্ট মোড ক্লাস যোগ করা
    document.body.classList.add('print-mode-barcode');
    window.print();
    // প্রিন্ট ডায়লগ শেষ হলে ক্লাস রিমুভ
    setTimeout(() => {
      document.body.classList.remove('print-mode-barcode');
    }, 1000);
  };

  // স্টিকার অ্যারে তৈরি
  const stickersArray = Array.from({ length: Math.max(1, quantity) });

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        
        {/* মডাল হেডার (নো-প্রিন্ট) */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white select-none no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  বারকোড স্টিকার প্রিন্ট ও প্রিভিউ
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Thermal & Laser Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                পণ্য: <strong className="text-indigo-200">{product.ProductName}</strong> #{effectiveBarcode}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট এরিয়া (নো-প্রিন্ট) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 no-print">
          
          {/* সতর্কতা যদি পণ্যের বারকোড না থাকে */}
          {!effectiveBarcode && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-3 text-amber-900 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block font-bold">সতর্কতা: এই পণ্যের কোনো বারকোড নম্বর নির্ধারণ করা নেই!</strong>
                <span>প্রিন্ট করার আগে পণ্যটি এডিট করে বারকোড স্ক্যান বা জেনারেট করে নিন।</span>
              </div>
            </div>
          )}

          {/* কন্ট্রোল ও প্রিভিউ গ্রিড */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* বাম কলাম: প্রিন্ট কনফিগারেশন ও সেটিংস (৭ কলাম) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* স্টিকার সংখ্যা সিলেক্টর */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span>কতোটি স্টিকার প্রিন্ট করতে চান? (Quantity)</span>
                  </label>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    মোট: {quantity} টি লেবেল
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 py-2 text-center text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />

                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs active:scale-95 cursor-pointer"
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
                    { label: 'স্টক সমান', val: Number(product.StockQuantity) || 10 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (preset.label === 'স্টক সমান') {
                          setQuantity(preset.val);
                        } else {
                          setQuantity((q) => q + preset.val);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-2xs cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* স্টিকার সাইজ ও লেআউট ফরম্যাট নির্বাচন */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Grid className="w-4 h-4 text-indigo-600" />
                  <span>স্টিকার প্রিন্টার ও লেবেল সাইজ ফরম্যাট:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'thermal-50x30',
                      title: 'থার্মাল রোল (স্ট্যান্ডার্ড)',
                      size: '৫০ × ৩০ মিমি',
                      desc: 'Xprinter, Rongta, Zebra বারকোড রোল',
                    },
                    {
                      id: 'thermal-40x25',
                      title: 'মিনি থার্মাল রোল',
                      size: '৪০ × ২৫ মিমি',
                      desc: 'ছোট প্যাকেট ও গহনা/কসমেটিকস',
                    },
                    {
                      id: 'a4-sheet',
                      title: 'A4 স্টিকার পেপার',
                      size: '৩ × ৮ (২৪ লেবেল)',
                      desc: 'লেজার বা ইনকজেট স্টিকার পেপার',
                    },
                  ].map((fmt) => {
                    const isSelected = format === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setFormat(fmt.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className={`text-xs font-bold block ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {fmt.title}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-indigo-600 block mt-0.5">
                            {fmt.size}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {fmt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* স্টিকারে কি কি তথ্য দেখাবে (টগল অপশন) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>স্টিকার কন্টেন্ট কাস্টমাইজেশন:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    {showAdvancedSettings ? 'সংক্ষিপ্ত করুন' : 'উন্নত এডিট'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStoreName}
                      onChange={(e) => setShowStoreName(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">দোকানের নাম</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProductName}
                      onChange={(e) => setShowProductName(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">পণ্যের নাম</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">বিক্রয়মূল্য</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCodeText}
                      onChange={(e) => setShowCodeText(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">বারকোড টেক্সট</span>
                  </label>
                </div>

                {/* উন্নত এডিট (কাস্টম স্টোর নেম বা মূল্য পরিবর্তন) */}
                {showAdvancedSettings && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        স্টিকারে প্রদর্শিত দোকানের নাম:
                      </label>
                      <input
                        type="text"
                        value={customStoreName}
                        onChange={(e) => setCustomStoreName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        স্টিকারে প্রদর্শিত মূল্য ({currencySymbol}):
                      </label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="অরিজিনাল মূল্য থাকবে"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* ডান কলাম: লাইভ স্টিকার প্রিভিউ (৫ কলাম) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-100 to-slate-50 border border-slate-200/80 rounded-3xl space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>লাইভ স্টিকার প্রিভিউ (প্রিন্ট আউটপুট)</span>
              </div>

              {/* সিঙ্গেল স্টিকার প্রিভিউ কার্ড */}
              <div className="p-3 bg-white/70 backdrop-blur-xs rounded-2xl border border-dashed border-indigo-300 shadow-sm flex items-center justify-center">
                <SingleBarcodeSticker
                  productName={product.ProductName}
                  barcode={effectiveBarcode}
                  price={effectivePrice}
                  currencySymbol={currencySymbol}
                  storeName={customStoreName}
                  showStoreName={showStoreName}
                  showProductName={showProductName}
                  showPrice={showPrice}
                  showCodeText={showCodeText}
                  format={format}
                  isPrintVersion={false}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-xs font-black text-indigo-900 block">
                  মোট {quantity} টি স্টিকার ক্রমানুসারে প্রিন্ট হবে
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  থার্মাল বারকোড প্রিন্টারের ক্ষেত্রে ১টি করে স্বয়ংক্রিয় পেজ ব্রেক হবে
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* মডাল ফুটার একশন বার (নো-প্রিন্ট) */}
        <div className="p-4 sm:px-8 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
          <div className="text-xs text-slate-500 hidden sm:block">
            ফরম্যাট: <strong className="text-slate-800">{format}</strong> • মোট: <strong className="text-indigo-700">{quantity} টি স্টিকার</strong>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!effectiveBarcode}
              className="px-7 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 hover:from-indigo-700 hover:to-slate-950 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{quantity} টি স্টিকার প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          প্রিন্টেবল এরিয়া (#printable-barcode-stickers)
          শুধুমাত্র window.print() কলের সময় কাগজে প্রিন্ট হবে
         ========================================================================= */}
      <div id="printable-barcode-stickers" className="hidden">
        <div className={`barcode-print-wrapper ${format === 'a4-sheet' ? 'a4-grid-layout' : 'thermal-roll-layout'}`}>
          {stickersArray.map((_, index) => (
            <SingleBarcodeSticker
              key={index}
              productName={product.ProductName}
              barcode={effectiveBarcode}
              price={effectivePrice}
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
          /* পুরো পেজের মার্জিন শূন্য করা */
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

          #printable-barcode-stickers,
          #printable-barcode-stickers * {
            visibility: visible !important;
          }

          #printable-barcode-stickers {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          /* থার্মাল রোল লেআউট */
          .thermal-roll-layout {
            display: block !important;
            width: 100% !important;
          }

          .thermal-roll-layout > div {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
          }

          /* A4 শিট গ্রিড লেআউট */
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

