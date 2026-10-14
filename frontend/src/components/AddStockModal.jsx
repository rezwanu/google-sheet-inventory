import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  Calculator, 
  Package, 
  UserCheck, 
  Truck, 
  FileText, 
  Barcode, 
  Search, 
  CheckCircle2,
  Layers,
  TrendingUp,
  Coins,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Check,
  RotateCcw,
  Clock,
  Box
} from 'lucide-react';

// দ্রুত পরিমাণের প্রিসেট (Quick Quantity Presets)
const QUANTITY_PRESETS = [5, 10, 25, 50, 100];

// দ্রুত সরবরাহকারী প্রিসেট
const SUPPLIER_PRESETS = ['প্রধান ডিলার', 'মেসার্স ট্রেডার্স', 'সরাসরি কোম্পানি', 'পাইকারি বাজার'];

// দ্রুত নোট প্রিসেট
const NOTE_PRESETS = ['নতুন লট চালান', 'জরুরি রিস্টক', 'সাপ্তাহিক স্টক', 'ড্যামেজ রিপ্লেসমেন্ট'];

export default function AddStockModal({
  isOpen,
  onClose,
  products = [],
  currencySymbol = '৳',
  activeUser,
  onSubmitStock,
  initialProductId = ''
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
      setUnitCost('');
      setSupplierName('');
      setNotes('');
      setMobileTab('form');
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

  // দ্রুত পরিমাণ বৃদ্ধি হ্যান্ডলার
  const handleAddPresetQty = (amount) => {
    const current = parseInt(incomingQty, 10) || 0;
    setIncomingQty(String(current + amount));
  };

  // কিউমুলেটিভ স্টক ও ওয়েইটেড এভারেজ কস্ট (WAC) লাইভ ক্যালকুলেশন
  const calculations = useMemo(() => {
    if (!selectedProduct) return null;

    const prevStock = Number(selectedProduct.StockQuantity) || 0;
    const incoming = Number(incomingQty) || 0;
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
  }, [selectedProduct, incomingQty, unitCost]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('অনুগ্রহ করে একটি পণ্য নির্বাচন করুন।');
      return;
    }

    const qtyNumber = Number(incomingQty);
    if (!qtyNumber || qtyNumber <= 0) {
      alert('সঠিক নতুন স্টকের পরিমাণ প্রদান করুন (১ বা তার বেশি)।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitStock({
        productId: selectedProduct.ProductID,
        incomingQty: qtyNumber,
        unitCost: unitCost !== '' ? Number(unitCost) : Number(selectedProduct.CostPrice),
        supplierName: supplierName.trim() || 'General Supplier',
        handledBy: handledBy.trim() || activeUser?.FullName || 'Admin',
        notes: notes.trim() || 'ম্যানুয়াল স্টক এন্ট্রি',
      });

      // রিসেট ও ক্লোজ
      setSelectedProductId('');
      setBarcodeSearchQuery('');
      setIncomingQty('');
      setUnitCost('');
      setSupplierName('');
      setNotes('');
      onClose();
    } catch (err) {
      alert(`স্টক আপডেট ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 sm:py-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh] transition-all animate-in zoom-in-95 duration-200">
        
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
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
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
                    <span className="text-[11px] text-slate-400 font-medium">
                      Enter চাপলে স্বয়ংক্রিয় সিলেক্ট হবে
                    </span>
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

              {/* সেকশন ২: নতুন স্টকের পরিমাণ ও ক্রয়মূল্য */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>২. নতুন লটের স্টক ও কেনা দাম</span>
                  </span>
                  {selectedProduct && (
                    <span className="text-[11px] font-bold text-slate-500">
                      একক: <strong className="text-slate-800">{selectedProduct.Unit || 'Pcs'}</strong>
                    </span>
                  )}
                </div>

                {/* আগত পরিমাণ এবং কেনা দাম */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* নতুন স্টক পরিমাণ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>নতুন আসা পরিমাণ (Incoming Qty) *</span>
                      {selectedProduct && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          পূর্বের স্টক: {selectedProduct.StockQuantity}
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
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-300 transition-all shadow-2xs active:scale-95"
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* নতুন লটের ইউনিট ক্রয়মূল্য */}
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
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">পূর্বের মজুদ</span>
                        <span className="text-sm font-bold text-slate-700">
                          {calculations.prevStock}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{selectedProduct.Unit || 'Pcs'}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                        <span className="text-[10px] font-bold text-teal-700 block mb-0.5">+ নতুন আগমন</span>
                        <span className="text-sm font-black text-teal-700">
                          +{calculations.incoming}
                        </span>
                        <span className="text-[10px] text-teal-600 block">{selectedProduct.Unit || 'Pcs'}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                        <span className="text-[10px] font-bold text-emerald-100 block mb-0.5">= নতুন মোট</span>
                        <span className="text-base font-black text-white">
                          {calculations.newStock}
                        </span>
                        <span className="text-[10px] text-emerald-100 block">{selectedProduct.Unit || 'Pcs'}</span>
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
                    স্টক সংযোজন: <strong>{selectedProduct.ProductName}</strong> (+{incomingQty || 0} {selectedProduct.Unit || 'Pcs'})
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
                disabled={isSubmitting || !selectedProductId || !incomingQty || Number(incomingQty) <= 0}
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
                    <span>স্টক যোগ ও রেকর্ড করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
