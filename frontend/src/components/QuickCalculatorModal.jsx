import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Calculator,
  Scissors,
  Tag,
  Copy,
  Check,
  RotateCcw,
  History,
  Trash2,
  ArrowRight,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { parseGojGira, calculateTotalYards, formatFabricQuantity } from '../utils/fabricUtils';

export default function QuickCalculatorModal({
  isOpen = false,
  onClose,
  currencySymbol = '৳'
}) {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' | 'fabric' | 'discount'

  // ==========================================
  // ১. সাধারণ ক্যালকুলেটর স্টেট (Standard Calc)
  // ==========================================
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState('');
  const [calcHistory, setCalcHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_quick_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // হিস্ট্রি লোকাল স্টোরেজে সংরক্ষণ
  const saveHistory = useCallback((entry) => {
    setCalcHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 20);
      try {
        localStorage.setItem('pos_quick_calc_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setCalcHistory([]);
    try {
      localStorage.removeItem('pos_quick_calc_history');
    } catch (e) {}
  }, []);

  // ক্যালকুলেটর লজিক ফাংশনসমূহ
  const inputDigit = useCallback((digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay((prev) => (prev === '0' ? String(digit) : prev + digit));
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay((prev) => prev + '.');
    }
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setExpression('');
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
  }, []);

  const backspace = useCallback(() => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay((prev) => prev.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display, waitingForOperand]);

  const toggleSign = useCallback(() => {
    const val = parseFloat(display);
    if (!isNaN(val) && val !== 0) {
      setDisplay(String(val * -1));
    }
  }, [display]);

  const inputPercent = useCallback(() => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const result = val / 100;
    setDisplay(String(Number(result.toFixed(6))));
    if (prevValue !== null && operation) {
      setExpression(`${prevValue} ${operation} ${val}%`);
    } else {
      setExpression(`${val}% =`);
    }
  }, [display, prevValue, operation]);

  const performOperation = useCallback((nextOperation) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setExpression(`${inputValue} ${nextOperation}`);
    } else if (operation) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      if (operation === '+') newValue = currentValue + inputValue;
      else if (operation === '-') newValue = currentValue - inputValue;
      else if (operation === '×' || operation === '*') newValue = currentValue * inputValue;
      else if (operation === '÷' || operation === '/') newValue = inputValue !== 0 ? currentValue / inputValue : 'Error';

      if (newValue === 'Error') {
        setDisplay('Error');
        setPrevValue(null);
        setOperation(null);
        setWaitingForOperand(true);
        setExpression('Cannot divide by zero');
        return;
      }

      // রাউন্ডিং ফিক্স (যেমন: 0.1 + 0.2 = 0.3)
      const cleanValue = Number(Math.round(newValue * 1000000) / 1000000);
      setDisplay(String(cleanValue));
      setPrevValue(cleanValue);

      if (nextOperation === '=') {
        const fullExpr = `${currentValue} ${operation} ${inputValue} = ${cleanValue}`;
        setExpression(`${currentValue} ${operation} ${inputValue} =`);
        saveHistory({
          id: Date.now(),
          expression: `${currentValue} ${operation} ${inputValue}`,
          result: cleanValue,
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        setExpression(`${cleanValue} ${nextOperation}`);
      }
    }

    setWaitingForOperand(true);
    setOperation(nextOperation === '=' ? null : nextOperation);
  }, [display, prevValue, operation, saveHistory]);

  // রেজাল্ট ক্লিপবোর্ডে কপি
  const handleCopyResult = (val = display) => {
    try {
      navigator.clipboard.writeText(String(val));
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 1800);
    } catch (e) {
      // ফলব্যাক
      const textArea = document.createElement('textarea');
      textArea.value = String(val);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 1800);
    }
  };

  // কীবোর্ড ইনপুট ইভেন্ট হ্যান্ডলার
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // যদি অন্য কোনো ইনপুট ফিল্ডে ফোকাস থাকে এবং ব্যবহারকারী টাইপ করছেন, তবে সাধারণ ক্যালকুলেটর শর্টকাট আটকাবেন
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose && onClose();
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(Number(e.key));
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        performOperation(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        performOperation('=');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        clearAll();
      } else if (e.key === '%') {
        e.preventDefault();
        inputPercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputDigit, inputDecimal, performOperation, backspace, clearAll, inputPercent, onClose]);

  // ==========================================
  // ২. গজ-গিরা কনভার্টার স্টেট (Fabric Converter)
  // ==========================================
  const [fabricGoj, setFabricGoj] = useState(1);
  const [fabricGira, setFabricGira] = useState(0);
  const [fabricRate, setFabricRate] = useState(150);

  // থান টু গজ স্টেট
  const [thanCount, setThanCount] = useState(1);
  const [yardsPerThan, setYardsPerThan] = useState(25);
  const [thanRate, setThanRate] = useState(150);
  const [thanPriceMode, setThanPriceMode] = useState('per_yard'); // 'per_yard' | 'per_than'

  // গজ-গিরা লাইভ মেমোরি ক্যালকুলেশন
  const fabricCalculations = useMemo(() => {
    const totalYards = calculateTotalYards(fabricGoj, fabricGira);
    const totalPrice = Math.round(totalYards * (Number(fabricRate) || 0));
    return {
      totalYards,
      totalPrice,
      fractionText: formatFabricQuantity(totalYards, 'গজ', false)
    };
  }, [fabricGoj, fabricGira, fabricRate]);

  // থান লাইভ ক্যালকুলেশন
  const thanCalculations = useMemo(() => {
    const tCount = Number(thanCount) || 0;
    const ypt = Number(yardsPerThan) || 0;
    const rate = Number(thanRate) || 0;
    const totalYards = tCount * ypt;
    const totalPrice = thanPriceMode === 'per_yard'
      ? Math.round(totalYards * rate)
      : Math.round(tCount * rate);
    return {
      totalYards,
      totalPrice,
      ratePerYard: thanPriceMode === 'per_yard' ? rate : (ypt > 0 ? Math.round((rate / ypt) * 100) / 100 : 0)
    };
  }, [thanCount, yardsPerThan, thanRate, thanPriceMode]);

  // ক্যালকুলেটরে মান পাঠানোর ফাংশন
  const sendToCalculator = (amount) => {
    setDisplay(String(amount));
    setWaitingForOperand(true);
    setPrevValue(null);
    setOperation(null);
    setExpression(`মান লোড করা হয়েছে: ${amount}`);
    setActiveTab('standard');
  };

  // ==========================================
  // ৩. ডিসকাউন্ট ও মার্জিন স্টেট (Discount/Margin)
  // ==========================================
  const [originalPrice, setOriginalPrice] = useState(500);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [costPrice, setCostPrice] = useState(300);
  const [sellingPrice, setSellingPrice] = useState(450);

  const discountResult = useMemo(() => {
    const p = Number(originalPrice) || 0;
    const d = Number(discountPercent) || 0;
    const discountAmount = Math.round((p * (d / 100)) * 100) / 100;
    const finalPrice = Math.max(0, Math.round((p - discountAmount) * 100) / 100);
    return { discountAmount, finalPrice };
  }, [originalPrice, discountPercent]);

  const marginResult = useMemo(() => {
    const cp = Number(costPrice) || 0;
    const sp = Number(sellingPrice) || 0;
    const profit = Math.round((sp - cp) * 100) / 100;
    const markupOnCost = cp > 0 ? Math.round(((profit / cp) * 100) * 10) / 10 : 0;
    const marginOnSale = sp > 0 ? Math.round(((profit / sp) * 100) * 10) / 10 : 0;
    return { profit, markupOnCost, marginOnSale };
  }, [costPrice, sellingPrice]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* শীর্ষ হেডার ও ট্যাব বার */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 flex items-center justify-between border-b border-indigo-900/60 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/80 flex items-center justify-center text-white shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center space-x-1.5">
                <span>স্মার্ট ক্যালকুলেটর</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Alt+C
                </span>
              </h3>
              <p className="text-[10px] text-slate-300">রিটেইল ও থান গজ-গিরা রূপান্তর হাব</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="বন্ধ করুন (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ৩টি মোড নেভিগেশন ট্যাব */}
        <div className="p-1.5 bg-slate-100/90 border-b border-slate-200/80 flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'standard'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>সাধারণ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fabric')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'fabric'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>গজ-গিরা</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discount')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'discount'
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>ছাড় ও লাভ</span>
          </button>
        </div>

        {/* কনটেন্ট এরিয়া */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">

          {/* ======================================================== */}
          {/* ট্যাব ১: সাধারণ রিটেইল ক্যালকুলেটর (Standard) */}
          {/* ======================================================== */}
          {activeTab === 'standard' && (
            <div className="space-y-3">
              {/* ডিজিটাল স্ক্রিন ডিসপ্লে */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-800 shadow-inner flex flex-col justify-between min-h-[96px] relative group">
                {/* এক্সপ্রেশন ও হিস্ট্রি বাটন */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono min-h-[18px]">
                  <span className="truncate pr-2">{expression || ' '}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowHistory((prev) => !prev)}
                      className={`p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-white ${
                        showHistory ? 'bg-indigo-600/50 text-indigo-300' : ''
                      }`}
                      title="পূর্ববর্তী হিসাবের ফিতা (Tape History)"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyResult(display)}
                      className="p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-white"
                      title="ফলাফল কপি করুন"
                    >
                      {copiedNotification ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* প্রধান বড় ফলাফল সংখ্যা */}
                <div className="flex items-baseline justify-end space-x-1 overflow-x-auto scrollbar-none mt-1">
                  <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white select-all">
                    {display}
                  </span>
                </div>

                {copiedNotification && (
                  <span className="absolute bottom-1 left-3 text-[10px] font-bold text-emerald-400 animate-pulse">
                    ✓ মান কপি হয়েছে!
                  </span>
                )}
              </div>

              {/* হিস্ট্রি ড্রয়ার (যদি টগল করা থাকে) */}
              {showHistory && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                      <History className="w-3 h-3 text-indigo-600" />
                      <span>পূর্ববর্তী হিসাবসমূহ ({calcHistory.length})</span>
                    </span>
                    {calcHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    )}
                  </div>

                  {calcHistory.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-2">কোনো হিস্ট্রি পাওয়া যায়নি</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {calcHistory.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setDisplay(String(item.result));
                            setWaitingForOperand(true);
                          }}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-mono transition-all cursor-pointer group"
                          title="এই ফলাফলটি পুনরায় ক্যালকুলেটরে আনতে ক্লিক করুন"
                        >
                          <span className="text-slate-500 group-hover:text-indigo-900 truncate">
                            {item.expression}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 pl-2">
                            = {item.result}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* কিপ্যাড বাটন গ্রিড (Tactile Buttons) */}
              <div className="grid grid-cols-4 gap-2">
                {/* সারি ১: ফাংশন কি */}
                <button
                  type="button"
                  onClick={clearAll}
                  className="py-2.5 rounded-xl text-sm font-black bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="সম্পূর্ণ মুছুন (Clear All - Esc)"
                >
                  AC
                </button>
                <button
                  type="button"
                  onClick={backspace}
                  className="py-2.5 rounded-xl text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="শেষ সংখ্যা মুছুন (Backspace)"
                >
                  ⌫
                </button>
                <button
                  type="button"
                  onClick={inputPercent}
                  className="py-2.5 rounded-xl text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="শতাংশ (%)"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => performOperation('÷')}
                  className="py-2.5 rounded-xl text-base font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="ভাগ (÷)"
                >
                  ÷
                </button>

                {/* সারি ২: ৭, ৮, ৯ ও গুণ */}
                <button
                  type="button"
                  onClick={() => inputDigit(7)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(8)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(9)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  9
                </button>
                <button
                  type="button"
                  onClick={() => performOperation('×')}
                  className="py-2.5 rounded-xl text-base font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="গুণ (×)"
                >
                  ×
                </button>

                {/* সারি ৩: ৪, ৫, ৬ ও বিয়োগ */}
                <button
                  type="button"
                  onClick={() => inputDigit(4)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  4
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(5)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(6)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  6
                </button>
                <button
                  type="button"
                  onClick={() => performOperation('-')}
                  className="py-2.5 rounded-xl text-base font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="বিয়োগ (-)"
                >
                  -
                </button>

                {/* সারি ৪: ১, ২, ৩ ও যোগ */}
                <button
                  type="button"
                  onClick={() => inputDigit(1)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(2)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(3)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => performOperation('+')}
                  className="py-2.5 rounded-xl text-base font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="যোগ (+)"
                >
                  +
                </button>

                {/* সারি ৫: ধনাত্মক/ঋণাত্মক, ০, দশমিক ও সমান */}
                <button
                  type="button"
                  onClick={toggleSign}
                  className="py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="চিহ্ন পরিবর্তন (±)"
                >
                  ±
                </button>
                <button
                  type="button"
                  onClick={() => inputDigit(0)}
                  className="py-2.5 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95 font-mono"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={inputDecimal}
                  className="py-2.5 rounded-xl text-base font-black bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="দশমিক (.)"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={() => performOperation('=')}
                  className="py-2.5 rounded-xl text-lg font-black bg-gradient-to-r from-emerald-600 to-[#0da487] text-white hover:from-emerald-700 hover:to-[#0b8b72] shadow-sm transition-all cursor-pointer active:scale-95"
                  title="ফলাফল হিসাব (Enter)"
                >
                  =
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ট্যাব ২: থান ও গজ-গিরা কনভার্টার (Fabric Mode) */}
          {/* ======================================================== */}
          {activeTab === 'fabric' && (
            <div className="space-y-3.5">
              
              {/* সেকশন ১: গজ ও গিরা থেকে মোট গজ ও মূল্য হিসাব */}
              <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                    <Scissors className="w-4 h-4 text-[#0da487]" />
                    <span>১. কাটা কাপড় (গজ ও গিরা থেকে মোট মূল্য)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">১৬ গিরা = ১ গজ</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">গজ (Goj)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fabricGoj}
                      onChange={(e) => setFabricGoj(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">গিরা (Gira)</label>
                    <select
                      value={fabricGira}
                      onChange={(e) => setFabricGira(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-bold text-slate-800"
                    >
                      {[...Array(16).keys()].map((g) => (
                        <option key={g} value={g}>
                          {g} গিরা {g === 4 ? '(১ পোয়া)' : g === 8 ? '(আধা গজ)' : g === 12 ? '(পৌনে এক)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">গজ দর ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fabricRate}
                      onChange={(e) => setFabricRate(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0da487] font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* ফলাফল কার্ড */}
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-emerald-800 block">মোট পরিমাণ:</span>
                    <span className="text-sm font-black text-emerald-950 font-mono">
                      {fabricCalculations.fractionText} ({fabricCalculations.totalYards} গজ)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10.5px] font-semibold text-emerald-800 block">মোট মূল্য:</span>
                    <span className="text-base font-black text-[#0b8b72] font-mono">
                      {currencySymbol}{fabricCalculations.totalPrice.toLocaleString('bn-BD')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleCopyResult(fabricCalculations.totalPrice)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>মূল্য কপি</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendToCalculator(fabricCalculations.totalPrice)}
                    className="px-2.5 py-1 bg-[#0da487] hover:bg-[#0b8b72] text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>ক্যালকুলেটরে পাঠান</span>
                  </button>
                </div>
              </div>

              {/* সেকশন ২: থান টু গজ ও লট মূল্য */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>২. আস্ত থান লট হিসাব</span>
                  </span>
                  <div className="flex items-center space-x-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setThanPriceMode('per_yard')}
                      className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                        thanPriceMode === 'per_yard' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      দর/গজ
                    </button>
                    <button
                      type="button"
                      onClick={() => setThanPriceMode('per_than')}
                      className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                        thanPriceMode === 'per_than' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      দর/থান
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">থান সংখ্যা</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={thanCount}
                      onChange={(e) => setThanCount(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">১ থান = গজ</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={yardsPerThan}
                      onChange={(e) => setYardsPerThan(Math.max(1, Number(e.target.value) || 25))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                      {thanPriceMode === 'per_yard' ? `দর/গজ (${currencySymbol})` : `দর/থান (${currencySymbol})`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={thanRate}
                      onChange={(e) => setThanRate(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* থান ফলাফল */}
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-indigo-800 block">মোট গজ:</span>
                    <span className="text-sm font-black text-indigo-950 font-mono">
                      {thanCalculations.totalYards.toLocaleString('bn-BD')} গজ
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10.5px] font-semibold text-indigo-800 block">মোট লট মূল্য:</span>
                    <span className="text-base font-black text-indigo-700 font-mono">
                      {currencySymbol}{thanCalculations.totalPrice.toLocaleString('bn-BD')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleCopyResult(thanCalculations.totalPrice)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>মূল্য কপি</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendToCalculator(thanCalculations.totalPrice)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>ক্যালকুলেটরে পাঠান</span>
                  </button>
                </div>
              </div>

              {/* সেকশন ৩: গজ-গিরা চিরন্তন রেফারেন্স পিল চার্ট */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <span className="text-[10.5px] font-bold text-slate-600 block flex items-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>কুইক গিরা কনভার্সন চার্ট:</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                  <span className="bg-white p-1 rounded-md border border-slate-200 text-center font-medium">২ গিরা = ০.১২৫ গজ</span>
                  <span className="bg-white p-1 rounded-md border border-slate-200 text-center font-medium">৪ গিরা = ০.২৫ গজ</span>
                  <span className="bg-white p-1 rounded-md border border-slate-200 text-center font-medium">৮ গিরা = ০.৫ গজ</span>
                  <span className="bg-white p-1 rounded-md border border-slate-200 text-center font-medium">১২ গিরা = ০.৭৫ গজ</span>
                  <span className="bg-white p-1 rounded-md border border-slate-200 text-center font-medium">১৪ গিরা = ০.৮৭৫ গজ</span>
                  <span className="bg-white p-1 rounded-md border border-slate-200 text-center font-medium">১৬ গিরা = ১ গজ</span>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* ট্যাব ৩: কুইক ডিসকাউন্ট ও লাভ-ক্ষতি মার্জিন (Discount/Margin) */}
          {/* ======================================================== */}
          {activeTab === 'discount' && (
            <div className="space-y-3.5">
              
              {/* কুইক ডিসকাউন্ট ক্যালকুলেটর */}
              <div className="bg-white p-3.5 rounded-2xl border border-purple-200/90 shadow-2xs space-y-3">
                <span className="text-xs font-bold text-purple-950 flex items-center space-x-1.5 border-b border-purple-100 pb-2">
                  <Percent className="w-4 h-4 text-purple-600" />
                  <span>১. কাস্টমার ডিসকাউন্ট / ছাড় হিসাব</span>
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">মূল দাম ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">ছাড়ের হার (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-semibold text-purple-800 block">ছাড়ের টাকা:</span>
                    <span className="text-sm font-black text-rose-700 font-mono">
                      - {currencySymbol}{discountResult.discountAmount.toLocaleString('bn-BD')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10.5px] font-semibold text-purple-800 block">ছাড়ের পর বিক্রয়মূল্য:</span>
                    <span className="text-base font-black text-purple-900 font-mono">
                      {currencySymbol}{discountResult.finalPrice.toLocaleString('bn-BD')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => handleCopyResult(discountResult.finalPrice)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>বিক্রয়মূল্য কপি</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendToCalculator(discountResult.finalPrice)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>ক্যালকুলেটরে পাঠান</span>
                  </button>
                </div>
              </div>

              {/* লাভ মার্জিন ও মার্কআপ ক্যালকুলেটর */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>২. লাভ ও প্রফিট মার্জিন (%)</span>
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">ক্রয়মূল্য / খরচ ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">বিক্রয়মূল্য ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">লাভের টাকা</span>
                    <span className={`text-xs font-black font-mono ${marginResult.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {currencySymbol}{marginResult.profit.toLocaleString('bn-BD')}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">মার্কআপ (ক্রয়ের উপর)</span>
                    <span className="text-xs font-black font-mono text-indigo-700">
                      {marginResult.markupOnCost}%
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">মার্জিন (বিক্রয়ের উপর)</span>
                    <span className="text-xs font-black font-mono text-[#0da487]">
                      {marginResult.marginOnSale}%
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ফুটার নোট ও হেল্পার */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="font-medium">
            💡 কীবোর্ডে <kbd className="px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 font-mono font-bold text-[10px] text-slate-800">Alt+C</kbd> বা <kbd className="px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 font-mono font-bold text-[10px] text-slate-800">F6</kbd> চাপলে ক্যালকুলেটর আসবে
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
