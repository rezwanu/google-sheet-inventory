import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Scissors,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  History,
  Trash2,
  Plus,
  Minus,
  Calculator
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity } from '../utils/fabricUtils';

export default function QuickCalculatorModal({
  isOpen = false,
  onClose,
  currencySymbol = '৳'
}) {
  const [goj, setGoj] = useState(1);
  const [gira, setGira] = useState(0);
  const [rate, setRate] = useState(150);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_fabric_cut_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const rateInputRef = useRef(null);

  // লাইভ মোট গজ ও মূল্য হিসাব
  const calculation = useMemo(() => {
    const numGoj = Number(goj) || 0;
    const numGira = Number(gira) || 0;
    const numRate = Number(rate) || 0;

    const totalYards = calculateTotalYards(numGoj, numGira);
    const exactPrice = totalYards * numRate;
    const roundedPrice = Math.round(exactPrice);

    let giraBangla = '';
    if (numGira === 4) giraBangla = ' (১ পোয়া)';
    else if (numGira === 8) giraBangla = ' (আধা গজ)';
    else if (numGira === 12) giraBangla = ' (পৌনে এক গজ)';
    else if (numGira === 2) giraBangla = ' (আধা পোয়া)';

    const fabricText = `${numGoj} গজ${numGira > 0 ? ` ${numGira} গিরা${giraBangla}` : ''}`;

    return {
      numGoj,
      numGira,
      numRate,
      totalYards,
      exactPrice,
      roundedPrice,
      fabricText
    };
  }, [goj, gira, rate]);

  // হিস্ট্রি লোকাল স্টোরেজে সেভ করা
  const saveToHistory = (item) => {
    setHistory((prev) => {
      // ডুপ্লিকেট রোধ
      if (prev.length > 0 && prev[0].text === item.text && prev[0].rate === item.rate) {
        return prev;
      }
      const updated = [item, ...prev].slice(0, 10);
      try {
        localStorage.setItem('pos_fabric_cut_calc_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('pos_fabric_cut_calc_history');
    } catch (e) {}
  };

  // ফলাফল ক্লিপবোর্ডে কপি
  const handleCopyPrice = () => {
    const textToCopy = String(calculation.roundedPrice);
    try {
      navigator.clipboard.writeText(textToCopy);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 1800);
    } catch (e) {
      const el = document.createElement('textarea');
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 1800);
    }

    // হিস্ট্রিতে সেভ করা
    if (calculation.roundedPrice > 0) {
      saveToHistory({
        id: Date.now(),
        text: calculation.fabricText,
        yards: calculation.totalYards,
        rate: calculation.numRate,
        price: calculation.roundedPrice,
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
      });
    }
  };

  // রিসেট ফাংশন
  const handleReset = () => {
    setGoj(1);
    setGira(0);
    setRate(150);
    if (rateInputRef.current) {
      rateInputRef.current.focus();
    }
  };

  // কীবোর্ড Esc শর্টকাট
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleCopyPrice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, calculation, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* শীর্ষ প্রিমিয়াম হেডার */}
        <div className="bg-gradient-to-r from-emerald-800 via-[#0da487] to-teal-800 text-white p-3.5 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center space-x-1.5">
                <span>কাটা কাপড় ক্যালকুলেটর</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-white/20 text-white border border-white/20">
                  Alt+C
                </span>
              </h3>
              <p className="text-[10.5px] text-emerald-100">গজ ও গিরা থেকে মোট কাপড় ও বিক্রয়মূল্য হিসাব</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handleReset}
              className="w-7 h-7 rounded-xl hover:bg-white/20 text-emerald-100 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="নতুন হিসাবে রিসেট করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl hover:bg-white/20 text-emerald-100 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="বন্ধ করুন (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* প্রধান কনটেন্ট বডি */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">

          {/* ১. ইনপুট সেকশন: গজ, গিরা ও প্রতি গজ দর */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90 space-y-3">
            
            {/* গজ ও গিরা গ্রিড */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* গজ ইনপুট ও +/- বাটন */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>গজ (Goj)</span>
                  <span className="text-[10px] font-medium text-slate-500">পূর্ণ গজ</span>
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setGoj(prev => Math.max(0, Number(prev || 0) - 1))}
                    className="w-8 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-sm font-bold shadow-2xs transition-colors cursor-pointer"
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
                    className="flex-1 px-2.5 py-1.5 text-center text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-mono font-bold text-slate-900 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setGoj(prev => Number(prev || 0) + 1)}
                    className="w-8 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-sm font-bold shadow-2xs transition-colors cursor-pointer"
                    title="১ গজ বাড়ান"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* গিরা ড্রপডাউন */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>গিরা (Gira)</span>
                  <span className="text-[10px] font-medium text-[#0da487] font-semibold">১৬ গিরা = ১ গজ</span>
                </label>
                <select
                  value={gira}
                  onChange={(e) => setGira(Number(e.target.value) || 0)}
                  className="w-full h-9 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-bold text-slate-800 shadow-2xs cursor-pointer"
                >
                  <option value={0}>০ গিরা (০ গজ)</option>
                  <option value={1}>১ গিরা (০.০৬২৫ গজ)</option>
                  <option value={2}>২ গিরা (আধা পোয়া)</option>
                  <option value={3}>৩ গিরা (০.১৮৭৫ গজ)</option>
                  <option value={4}>৪ গিরা (১ পোয়া / ০.২৫)</option>
                  <option value={5}>৫ গিরা (০.৩১২৫ গজ)</option>
                  <option value={6}>৬ গিরা (০.৩৭৫ গজ)</option>
                  <option value={7}>৭ গিরা (০.৪৩৭৫ গজ)</option>
                  <option value={8}>৮ গিরা (আধা গজ / ০.৫)</option>
                  <option value={9}>৯ গিরা (০.৫৬২৫ গজ)</option>
                  <option value={10}>১০ গিরা (০.৬২৫ গজ)</option>
                  <option value={11}>১১ গিরা (০.৬৮৭৫ গজ)</option>
                  <option value={12}>১২ গিরা (পৌনে ১ / ০.৭৫)</option>
                  <option value={13}>১৩ গিরা (০.৮১২৫ গজ)</option>
                  <option value={14}>১৪ গিরা (০.৮৭৫ গজ)</option>
                  <option value={15}>১৫ গিরা (০.৯৩৭৫ গজ)</option>
                </select>
              </div>

            </div>

            {/* কুইক গজ সিলেক্টর পিলস */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-[10px] text-slate-400 font-bold shrink-0">কুইক গজ:</span>
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map((preset) => {
                const isSelected = calculation.totalYards === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const full = Math.floor(preset);
                      const frac = preset - full;
                      setGoj(full);
                      setGira(Math.round(frac * 16));
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0da487] text-white shadow-xs'
                        : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {preset} গজ
                  </button>
                );
              })}
            </div>

            {/* কুইক গিরা সিলেক্টর পিলস */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-[10px] text-slate-400 font-bold shrink-0">কুইক গিরা:</span>
              {[
                { g: 0, label: '০' },
                { g: 2, label: '২ গিরা' },
                { g: 4, label: '৪ (১ পোয়া)' },
                { g: 8, label: '৮ (আধা গজ)' },
                { g: 12, label: '১২ (পৌনে ১)' },
                { g: 14, label: '১৪ গিরা' }
              ].map((item) => (
                <button
                  key={item.g}
                  type="button"
                  onClick={() => setGira(item.g)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                    gira === item.g
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* প্রতি গজ বিক্রয় দর ইনপুট */}
            <div className="pt-1 border-t border-slate-200/70">
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>প্রতি গজের বিক্রয় দর ({currencySymbol})</span>
                <span className="text-[10.5px] text-slate-500 font-mono">
                  {rate > 0 ? `৳${Number(rate).toLocaleString('bn-BD')} / গজ` : 'দর লিখুন'}
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
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-mono font-bold text-slate-900 shadow-2xs"
                />
              </div>
            </div>

          </div>

          {/* ২. বড় লাইভ রেজাল্ট কার্ড (Hero Display) */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-4 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 rounded-full bg-emerald-200/40 pointer-events-none blur-lg" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">
                  মোট কাপড়ের পরিমাণ
                </span>
                <h4 className="text-base sm:text-lg font-black text-emerald-950 font-mono mt-0.5">
                  {calculation.fabricText}
                </h4>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  = {calculation.totalYards} গজ
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">
                  মোট প্রদেয় মূল্য
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0b8b72] font-mono mt-0.5 tracking-tight">
                  {currencySymbol}{calculation.roundedPrice.toLocaleString('bn-BD')}
                </h2>
                {calculation.exactPrice !== calculation.roundedPrice && (
                  <span className="text-[10px] text-slate-400 font-mono block">
                    (সঠিক: {currencySymbol}{calculation.exactPrice.toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            {/* হিসাব বিবরণী ফর্মুলা লাইন */}
            <div className="bg-white/90 p-2 rounded-xl border border-emerald-200/80 text-xs font-mono text-slate-600 flex items-center justify-between">
              <span>সূত্র:</span>
              <span className="font-bold text-slate-800">
                {calculation.totalYards} গজ × {currencySymbol}{calculation.numRate} = {currencySymbol}{calculation.roundedPrice}
              </span>
            </div>

            {/* কপি অ্যাকশন বাটন */}
            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyPrice}
                className="flex-1 py-2 px-3 bg-[#0da487] hover:bg-[#0b8b72] active:scale-98 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>✓ মূল্য কপি হয়েছে ({currencySymbol}{calculation.roundedPrice})</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>মোট মূল্য কপি করুন ({currencySymbol}{calculation.roundedPrice})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  saveToHistory({
                    id: Date.now(),
                    text: calculation.fabricText,
                    yards: calculation.totalYards,
                    rate: calculation.numRate,
                    price: calculation.roundedPrice,
                    time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
                  });
                  setCopiedNotification(true);
                  setTimeout(() => setCopiedNotification(false), 1200);
                }}
                className="py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="হিস্ট্রিতে সংরক্ষণ করুন"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>

          {/* ৩. পূর্ববর্তী কাটা কাপড়ের হিস্ট্রি (Recent Cuts) */}
          {history.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>পূর্ববর্তী কাটা হিসাব ({history.length})</span>
                </span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>মুছুন</span>
                </button>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const parsed = parseGojGira(item.yards);
                      setGoj(parsed.goj);
                      setGira(parsed.gira);
                      setRate(item.rate);
                    }}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 text-xs font-mono transition-all cursor-pointer group"
                    title="এই হিসাবটি পুনরায় লোড করতে ক্লিক করুন"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-bold text-slate-800 group-hover:text-emerald-900">
                        {item.text}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (@ {currencySymbol}{item.rate})
                      </span>
                    </div>
                    <span className="font-black text-[#0da487] group-hover:scale-105 transition-transform pl-2">
                      {currencySymbol}{item.price.toLocaleString('bn-BD')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ফুটার নোট ও হেল্পার */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="font-medium">
            💡 শর্টকাট: <kbd className="px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 font-mono font-bold text-[10px] text-slate-800">Alt+C</kbd>
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
