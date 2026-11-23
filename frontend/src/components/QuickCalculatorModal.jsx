import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Scissors,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Plus,
  Minus,
  Receipt,
  ShoppingCart
} from 'lucide-react';
import { calculateTotalYards, parseGojGira } from '../utils/fabricUtils';
import { playCashChime } from '../utils/soundEffects';

export default function QuickCalculatorModal({
  isOpen = false,
  onClose,
  onAddToCart,
  currencySymbol = '৳'
}) {
  // ১. বর্তমান এন্ট্রি ইনপুট স্টেট
  const [goj, setGoj] = useState(1);
  const [gira, setGira] = useState(0);
  const [rate, setRate] = useState(150);

  // ২. কাস্টমারের কাপড়ের সংরক্ষিত আইটেম তালিকা (Multi-Item Cut List)
  const [savedItems, setSavedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_fabric_calculator_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [copiedNotification, setCopiedNotification] = useState(false);
  const [copiedGrandTotal, setCopiedGrandTotal] = useState(false);
  const rateInputRef = useRef(null);

  // ৩. তালিকায় পরিবর্তন হলে লোকাল স্টোরেজে সংরক্ষণ
  useEffect(() => {
    try {
      localStorage.setItem('pos_fabric_calculator_items', JSON.stringify(savedItems));
    } catch (e) {}
  }, [savedItems]);

  // ৪. একক কাপড়ের লাইভ হিসাব
  const currentCalculation = useMemo(() => {
    const numGoj = Math.max(0, Number(goj) || 0);
    const numGira = Math.max(0, Math.min(15, Number(gira) || 0));
    const numRate = Math.max(0, Number(rate) || 0);

    const totalYards = calculateTotalYards(numGoj, numGira);
    const exactPrice = totalYards * numRate;
    const roundedPrice = Math.round(exactPrice);

    let giraSubText = '';
    if (numGira === 4) giraSubText = ' (১ পোয়া)';
    else if (numGira === 8) giraSubText = ' (আধা গজ)';
    else if (numGira === 12) giraSubText = ' (পৌনে ১ গজ)';
    else if (numGira === 2) giraSubText = ' (আধা পোয়া)';

    const labelText = `${numGoj} গজ${numGira > 0 ? ` ${numGira} গিরা${giraSubText}` : ''}`;

    return {
      numGoj,
      numGira,
      numRate,
      totalYards: Math.round(totalYards * 10000) / 10000,
      exactPrice,
      roundedPrice,
      labelText
    };
  }, [goj, gira, rate]);

  // ৫. সংরক্ষিত আইটেম তালিকার সর্বমোট (Grand Total Summary)
  const listSummary = useMemo(() => {
    const totalCount = savedItems.length;
    const totalYards = savedItems.reduce((acc, it) => acc + (Number(it.yards) || 0), 0);
    const grandTotal = savedItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
    
    // গজ-গিরাতে রূপান্তর
    const parsed = parseGojGira(totalYards);
    const formattedYardsText = `${parsed.goj} গজ${parsed.gira > 0 ? ` ${parsed.gira} গিরা` : ''}`;

    return {
      totalCount,
      totalYards: Math.round(totalYards * 10000) / 10000,
      grandTotal: Math.round(grandTotal),
      formattedYardsText
    };
  }, [savedItems]);

  // ৬. বর্তমান কাপড় তালিকায় যোগ / সংরক্ষণ করুন
  const handleAddItemToList = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (currentCalculation.roundedPrice <= 0 && currentCalculation.totalYards <= 0) {
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      itemNo: savedItems.length + 1,
      goj: currentCalculation.numGoj,
      gira: currentCalculation.numGira,
      yards: currentCalculation.totalYards,
      rate: currentCalculation.numRate,
      price: currentCalculation.roundedPrice,
      text: currentCalculation.labelText,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    setSavedItems((prev) => [...prev, newItem]);
    playCashChime();

    // নতুন এন্ট্রির সুবিধার জন্য গজ ১ ও গিরা ০ রাখা (দর অপরিবর্তিত রাখা হয় যাতে দ্রুত হিসাব করা যায়)
    setGoj(1);
    setGira(0);
    if (rateInputRef.current) {
      rateInputRef.current.focus();
      rateInputRef.current.select();
    }
  };

  // ৭. তালিকা থেকে একক আইটেম মোছা
  const handleRemoveItem = (id) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ৮. সম্পূর্ণ তালিকা খালি করা (নতুন কাস্টমার)
  const handleClearAllItems = () => {
    if (savedItems.length === 0) return;
    if (confirm('আপনি কি সম্পূর্ণ সংরক্ষিত তালিকা খালি করে নতুন কাস্টমারের হিসাব শুরু করতে চান?')) {
      setSavedItems([]);
    }
  };

  // ৯. একক কাপড়ের দাম কপি
  const handleCopyCurrentPrice = () => {
    const text = String(currentCalculation.roundedPrice);
    try {
      navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 1600);
    } catch (e) {}
  };

  // ১০. সর্বমোট প্রদেয় বিল কপি
  const handleCopyGrandTotal = () => {
    const text = String(listSummary.grandTotal);
    try {
      navigator.clipboard.writeText(text);
      setCopiedGrandTotal(true);
      setTimeout(() => setCopiedGrandTotal(false), 1600);
    } catch (e) {}
  };

  // ১০.১ সরাসরি কার্টে পাঠানোর হ্যান্ডলার (Single Item)
  const handleAddToCartCurrent = () => {
    if (!onAddToCart) return;
    onAddToCart({
      ProductID: `CUT-${Date.now().toString().slice(-4)}`,
      ProductName: `কাটা কাপড় (${currentCalculation.labelText})`,
      SellingPrice: currentCalculation.roundedPrice,
      sellingPrice: currentCalculation.roundedPrice,
      CostPrice: Math.round(currentCalculation.roundedPrice * 0.8),
      StockQuantity: 999,
      Category: 'কাটা কাপড়',
      Unit: 'গজ',
      Quantity: 1,
      quantity: 1,
      TotalYards: currentCalculation.totalYards,
      RatePerYard: currentCalculation.numRate
    });
    try { playCashChime(); } catch (e) {}
    onClose && onClose();
  };

  // ১০.২ তালিকায় থাকা সমস্ত আইটেম কার্টে পাঠানোর হ্যান্ডলার (All Items)
  const handleAddToCartAll = () => {
    if (!onAddToCart || savedItems.length === 0) return;
    savedItems.forEach((item, idx) => {
      onAddToCart({
        ProductID: `CUT-${item.id || Date.now() + idx}`,
        ProductName: `কাটা কাপড় #${idx + 1} (${item.labelText})`,
        SellingPrice: item.roundedPrice,
        sellingPrice: item.roundedPrice,
        CostPrice: Math.round(item.roundedPrice * 0.8),
        StockQuantity: 999,
        Category: 'কাটা কাপড়',
        Unit: 'গজ',
        Quantity: 1,
        quantity: 1,
        TotalYards: item.totalYards,
        RatePerYard: item.rate
      });
    });
    try { playCashChime(); } catch (e) {}
    setSavedItems([]);
    onClose && onClose();
  };

  // ১১. কীবোর্ড শর্টকাট (Esc দিয়ে ক্লোজ, Ctrl+Enter দিয়ে তালিকায় যোগ)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleAddItemToList();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentCalculation, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-100 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* শীর্ষ মার্জিত হেডার (Human Pro Dark Slate) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  কাটা কাপড় গজ-গিরা ক্যালকুলেটর
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Alt + C
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                গজ ও গিরা ভিত্তিক তাৎক্ষণিক কাপড় পরিমাপ ও কাস্টমার বিলিং স্লিপ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="বন্ধ করুন (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* স্ক্রোলেবল বডি কনটেন্ট */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* ======================================================== */}
          {/* সেকশন ১: ইনপুট প্যানেল (গজ, গিরা ও দর) */}
          {/* ======================================================== */}
          <form onSubmit={handleAddItemToList} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 space-y-3.5">
            
            {/* গজ ও গিরা ইনপুট গ্রিড */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* ১.১ গজ (Goj) ইনপুট ফিল্ড */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>গজ (Yards)</span>
                  <span className="text-[11px] text-slate-400 font-normal">পূর্ণ গজ</span>
                </label>
                <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400/20">
                  <button
                    type="button"
                    onClick={() => setGoj((prev) => Math.max(0, Number(prev || 0) - 1))}
                    className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
                    title="১ গজ কমান"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={goj}
                    onChange={(e) => setGoj(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full text-center text-sm font-bold font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none"
                    placeholder="০"
                  />
                  <button
                    type="button"
                    onClick={() => setGoj((prev) => Number(prev || 0) + 1)}
                    className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
                    title="১ গজ বাড়ান"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ১.২ গিরা (Gira) ইনপুট ফিল্ড */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>গিরা (Gira 0-15)</span>
                  <span className="text-[11px] text-slate-400 font-normal">১৬ গিরা = ১ গজ</span>
                </label>
                <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400/20">
                  <button
                    type="button"
                    onClick={() => setGira((prev) => Math.max(0, Number(prev || 0) - 1))}
                    className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
                    title="১ গিরা কমান"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="1"
                    value={gira}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setGira(Math.max(0, Math.min(15, val)));
                    }}
                    className="w-full text-center text-sm font-bold font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none"
                    placeholder="০"
                  />
                  <button
                    type="button"
                    onClick={() => setGira((prev) => Math.min(15, Number(prev || 0) + 1))}
                    className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
                    title="১ গিরা বাড়ান"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* ১.৩ গিরা কুইক প্রিসেট বাটন বার (Traditional Bengali Fabric Presets) */}
            <div>
              <span className="text-[11px] text-slate-500 font-medium block mb-1">
                দ্রুত গিরা বাছাই (Quick Gira Shortcuts):
              </span>
              <div className="grid grid-cols-5 gap-1.5 text-xs font-medium">
                {[
                  { g: 0, label: '০ গিরা' },
                  { g: 2, label: '২ (আধা পোয়া)' },
                  { g: 4, label: '৪ (১ পোয়া)' },
                  { g: 8, label: '৮ (আধা গজ)' },
                  { g: 12, label: '১২ (পৌনে)' },
                ].map((preset) => (
                  <button
                    key={preset.g}
                    type="button"
                    onClick={() => setGira(preset.g)}
                    className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer text-center truncate ${
                      Number(gira) === preset.g
                        ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ১.৪ প্রতি গজ বিক্রয় দর ইনপুট */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center justify-between">
                <span>প্রতি গজের বিক্রয় দর ({currencySymbol})</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentCalculation.numRate > 0 ? `${currencySymbol}${currentCalculation.numRate.toLocaleString('en-IN')} / গজ` : 'দর লিখুন'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  {currencySymbol}
                </span>
                <input
                  ref={rateInputRef}
                  type="number"
                  min="0"
                  step="1"
                  value={rate}
                  onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="যেমন: ১৮০"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            {/* ১.৫ বর্তমান কাপড়ের ফলাফল ও তালিকায় যোগ বাটন */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">পরিমাপ</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                    {currentCalculation.labelText} ({currentCalculation.totalYards} গজ)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-400 block">হিসাবকৃত মূল্য</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono tabular-nums">
                    {currencySymbol}{currentCalculation.roundedPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* অ্যাকশন বাটন গ্রুপ */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium inline-flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  title="এই কাপড়টি কাস্টমারের বিল তালিকায় যোগ করুন (Enter)"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-300" />
                  <span>তালিকায় যোগ করুন</span>
                </button>

                {onAddToCart && (
                  <button
                    type="button"
                    onClick={handleAddToCartCurrent}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                    title="এই কাটা কাপড়টি সরাসরি পিওএস বিক্রয় কার্টে পাঠান"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-100" />
                    <span>কার্টে পাঠান</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyCurrentPrice}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                  title="শুধু এই কাপড়ের দাম কপি করুন"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>

          {/* ======================================================== */}
          {/* সেকশন ২: কাস্টমারের সংরক্ষিত কাপড়ের তালিকা ও সর্বমোট */}
          {/* ======================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>কাটিং স্লিপ তালিকা ({savedItems.length})</span>
              </span>

              {savedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-800 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="সম্পূর্ণ তালিকা খালি করে নতুন কাস্টমারের হিসাব শুরু করুন"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>তালিকা মুছুন</span>
                </button>
              )}
            </div>

            {/* তালিকা বা এম্পটি স্টেট */}
            {savedItems.length === 0 ? (
              <div className="p-5 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                <p className="text-xs font-medium text-slate-500">তালিকায় এখনো কোনো কাপড় যোগ করা হয়নি</p>
                <p className="text-[11px]">
                  উপরে গজ, গিরা ও দর দিয়ে <span className="font-semibold text-slate-700">"তালিকায় যোগ করুন"</span> বাটনে চাপুন।
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {savedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 sm:px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate font-sans">
                          <span className="font-semibold text-slate-800 block truncate">
                            {item.text}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {item.yards} গজ @ ৳{item.rate}/গজ
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-bold text-slate-900 text-sm tabular-nums">
                          {currencySymbol}{item.price.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer rounded"
                          title="এই আইটেমটি মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* সর্বমোট গ্র্যান্ড টোটাল স্ট্রিপ (Clean Professional Summary Bar) */}
                <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      সর্বমোট প্রদেয় বিল ({listSummary.totalCount}টি আইটেম)
                    </span>
                    <span className="text-xs font-medium text-slate-700 font-mono">
                      মোট কাপড়ের মাপ: {listSummary.formattedYardsText} ({listSummary.totalYards} গজ)
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 justify-between sm:justify-end">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                      {currencySymbol}{listSummary.grandTotal.toLocaleString('en-IN')}
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyGrandTotal}
                      className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
                      title="সর্বমোট বিলের টাকা কপি করুন"
                    >
                      {copiedGrandTotal ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>সর্বমোট কপি</span>
                        </>
                      )}
                    </button>

                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={handleAddToCartAll}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
                        title="তালিকায় থাকা সমস্ত কাপড় এক ক্লিকে পিওএস কার্টে পাঠান"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-100" />
                        <span>সব কার্টে পাঠান</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ফুটার নোট ও হেল্পার */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span>শর্টকাট:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700">Alt + C</kbd>
            <span className="text-slate-300">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700">Enter</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
