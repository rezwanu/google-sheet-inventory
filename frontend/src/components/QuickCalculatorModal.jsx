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
  Layers,
  ShoppingBag
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity, parseGojGira } from '../utils/fabricUtils';
import { playCashChime } from '../utils/soundEffects';

export default function QuickCalculatorModal({
  isOpen = false,
  onClose,
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
    if (e) e.preventDefault();
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
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    };

    setSavedItems((prev) => [...prev, newItem]);
    playCashChime();

    // নতুন এন্ট্রির সুবিধার জন্য গজ ১ ও গিরা ০ রাখা (দর অপরিবর্তিত রাখা হয় যাতে দ্রুত টাইপ করা যায়)
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
    if (confirm('আপনি কি নিশ্চিত যে সম্পূর্ণ সংরক্ষিত তালিকা খালি করে নতুন কাস্টমারের হিসাব শুরু করবেন?')) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* শীর্ষ মার্জিত হেডার (আঁখি-বান্ধব সফট ডার্ক স্লেট) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/90 text-white flex items-center justify-center shadow-xs">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight flex items-center space-x-2">
                <span>কাটা কাপড় গজ-গিরা ক্যালকুলেটর</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  Alt+C
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400">গজ ও গিরা থেকে তাৎক্ষণিক কাপড় ও সর্বমোট বিল হিসাব</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="বন্ধ করুন (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* স্ক্রোলেবল বডি কনটেন্ট */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          
          {/* ======================================================== */}
          {/* সেকশন ১: ইনপুট প্যানেল (গজ, গিরা ও দর) */}
          {/* ======================================================== */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/90 space-y-3">
            
            {/* গজ ও গিরা ইনপুট গ্রিড */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* ১.১ গজ (Goj) ইনপুট ফিল্ড */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>গজ (Goj)</span>
                  <span className="text-[10px] text-slate-500 font-medium">পূর্ণ গজ</span>
                </label>
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
                  <button
                    type="button"
                    onClick={() => setGoj((prev) => Math.max(0, Number(prev || 0) - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer active:scale-95 shrink-0"
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
                    className="w-full text-center text-sm font-bold font-mono text-slate-900 bg-transparent focus:outline-hidden"
                    placeholder="০"
                  />
                  <button
                    type="button"
                    onClick={() => setGoj((prev) => Number(prev || 0) + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer active:scale-95 shrink-0"
                    title="১ গজ বাড়ান"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ১.২ গিরা (Gira) ইনপুট ফিল্ড (ড্রপডাউনের পরিবর্তে ইনপুট) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>গিরা (Gira)</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">১৬ গিরা = ১ গজ</span>
                </label>
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
                  <button
                    type="button"
                    onClick={() => setGira((prev) => Math.max(0, Number(prev || 0) - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer active:scale-95 shrink-0"
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
                    className="w-full text-center text-sm font-bold font-mono text-slate-900 bg-transparent focus:outline-hidden"
                    placeholder="০"
                  />
                  <button
                    type="button"
                    onClick={() => setGira((prev) => Math.min(15, Number(prev || 0) + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer active:scale-95 shrink-0"
                    title="১ গিরা বাড়ান"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* ১.৩ প্রতি গজ বিক্রয় দর ইনপুট */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>প্রতি গজের বিক্রয় দর ({currencySymbol})</span>
                <span className="text-[10.5px] text-slate-500 font-mono">
                  {currentCalculation.numRate > 0 ? `৳${currentCalculation.numRate.toLocaleString('bn-BD')} / গজ` : 'দর লিখুন'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
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
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-mono font-bold text-slate-900 shadow-2xs"
                />
              </div>
            </div>

            {/* ১.৪ বর্তমান কাপড়ের ফলাফল কার্ড ও তালিকায় যোগ বাটন */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-semibold text-slate-500 block">এই কাপড়ের পরিমাপ:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                    {currentCalculation.labelText} ({currentCalculation.totalYards} গজ)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-semibold text-slate-500 block">এই কাপড়ের দাম:</span>
                  <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                    {currencySymbol}{currentCalculation.roundedPrice.toLocaleString('bn-BD')}
                  </span>
                </div>
              </div>

              {/* অ্যাকশন বাটন গ্রুপ: সংরক্ষণ/তালিকায় যোগ এবং কপি */}
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAddItemToList}
                  className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                  title="এই কাপড়টি কাস্টমারের বিল তালিকায় যোগ ও সংরক্ষণ করুন (Ctrl+Enter)"
                >
                  <Plus className="w-4 h-4" />
                  <span>তালিকায় যোগ / সংরক্ষণ করুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCurrentPrice}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                  title="শুধু এই কাপড়ের দাম কপি করুন"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* সেকশন ২: কাস্টমারের সংরক্ষিত কাপড়ের তালিকা ও সর্বমোট */}
          {/* ======================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>কাস্টমারের কাপড়ের তালিকা ({savedItems.length})</span>
              </span>

              {savedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="সম্পূর্ণ তালিকা খালি করে নতুন কাস্টমারের হিসাব শুরু করুন"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>নতুন কাস্টমার (তালিকা মুছুন)</span>
                </button>
              )}
            </div>

            {/* তালিকা বা এম্পটি স্টেট */}
            {savedItems.length === 0 ? (
              <div className="p-5 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                <p className="text-xs font-medium text-slate-500">এখনো কোনো কাপড় তালিকায় যোগ করা হয়নি</p>
                <p className="text-[10.5px]">
                  উপরে গজ, গিরা ও দর দিয়ে <span className="font-bold text-emerald-700">"তালিকায় যোগ / সংরক্ষণ করুন"</span> বাটনে চাপুন।
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                  {savedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 sm:px-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">
                            {item.text}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.yards} গজ @ ৳{item.rate}/গজ
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-bold text-slate-900 text-sm">
                          {currencySymbol}{item.price.toLocaleString('bn-BD')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer rounded-md"
                          title="এই আইটেমটি মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* সর্বমোট গ্র্যান্ড টোটাল স্ট্রিপ (চোখে আরামদায়ক সফট এমেরাল্ড ব্যানার) */}
                <div className="bg-emerald-50/80 p-3.5 border-t border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10.5px] font-bold text-emerald-900 uppercase tracking-wider block">
                      সর্বমোট প্রদেয় বিল ({listSummary.totalCount}টি কাপড়)
                    </span>
                    <span className="text-xs font-semibold text-slate-600 font-mono">
                      মোট কাপড়ের মাপ: {listSummary.formattedYardsText} ({listSummary.totalYards} গজ)
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 justify-between sm:justify-end">
                    <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono tracking-tight">
                      {currencySymbol}{listSummary.grandTotal.toLocaleString('bn-BD')}
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyGrandTotal}
                      className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                      title="সর্বমোট বিলের টাকা কপি করুন"
                    >
                      {copiedGrandTotal ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-200" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>সর্বমোট কপি</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ফুটার নোট ও হেল্পার */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="font-medium">
            💡 শর্টকাট: <kbd className="px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 font-mono font-bold text-[10px] text-slate-800">Alt+C</kbd> (খোলা/বন্ধ) | <kbd className="px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 font-mono font-bold text-[10px] text-slate-800">Ctrl+Enter</kbd> (তালিকায় যোগ)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            বন্ধ
          </button>
        </div>

      </div>
    </div>
  );
}
