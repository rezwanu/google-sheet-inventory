import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Scissors,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  DollarSign,
  Package,
  Calendar,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  FileSpreadsheet,
  AlertOctagon
} from 'lucide-react';
import { calculateTotalYards, formatFabricQuantity, parseGojGira } from '../utils/fabricUtils';
import { playCashChime, playWarningBeep } from '../utils/soundEffects';

export default function FabricWastageModal({
  isOpen,
  onClose,
  embedded = false,
  fabricWastageList = [],
  products = [],
  currencySymbol = '৳',
  activeUser = null,
  onRecordWastage,
  onDeleteWastageRecord,
  onCreateRemnantBundle
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'new'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'Remnant' | 'Damaged'

  // নতুন এন্ট্রি ফর্ম স্টেট
  const [selectedProductId, setSelectedProductId] = useState('');
  const [entryType, setEntryType] = useState('Remnant'); // 'Remnant' | 'Damaged'
  const [goj, setGoj] = useState(1);
  const [gira, setGira] = useState(0);
  const [reason, setReason] = useState('থানের শেষ ছাঁট (End-of-bolt Remnant)');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [createClearanceBundle, setCreateClearanceBundle] = useState(false);
  const [bundlePrice, setBundlePrice] = useState(100);

  // থান ও গজ কাপড়ের পণ্য তালিকা
  const fabricProducts = useMemo(() => {
    return products.filter((p) => {
      const u = String(p.Unit || p.unit || '').toLowerCase();
      const cat = String(p.Category || p.category || '').toLowerCase();
      return u.includes('গজ') || u.includes('yard') || cat.includes('থান') || cat.includes('কাপড়');
    });
  }, [products]);

  // নির্বাচিত প্রোডাক্ট অবজেক্ট
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p.ProductID || p.id) === String(selectedProductId));
  }, [selectedProductId, products]);

  // মোট গজ ও আর্থিক ক্ষতি হিসাব
  const totalYards = useMemo(() => {
    return calculateTotalYards(goj, gira);
  }, [goj, gira]);

  const costPrice = Number(selectedProduct?.CostPrice || selectedProduct?.costPrice || 0);
  const lossAmount = useMemo(() => {
    return Math.round(totalYards * costPrice);
  }, [totalYards, costPrice]);

  // ফর্ম সাবমিট
  const handleSubmitWastage = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('অনুগ্রহ করে একটি থান কাপড় নির্বাচন করুন!');
      return;
    }
    if (totalYards <= 0) {
      alert('গজ বা গিরার সঠিক পরিমাণ দিন!');
      return;
    }

    const currentStock = Number(selectedProduct.CurrentStock || selectedProduct.stock || 0);
    if (totalYards > currentStock) {
      if (!confirm(`সতর্কতা: নষ্ট/ছাঁট কাপড়ের পরিমাণ (${totalYards} গজ) বর্তমান মজুতের (${currentStock} গজ) চেয়ে বেশি! আপনি কি নিশ্চিতভাবে স্টক সমন্বয় করতে চান?`)) {
        return;
      }
    }

    const finalReason = reason === 'অন্যান্য' ? (customReason.trim() || 'অন্যান্য') : reason;

    const payload = {
      ProductID: selectedProduct.ProductID || selectedProduct.id,
      ProductName: selectedProduct.ProductName || selectedProduct.name,
      Category: selectedProduct.Category || selectedProduct.category || 'থান কাপড়',
      Type: entryType,
      Goj: Number(goj) || 0,
      Gira: Number(gira) || 0,
      TotalYards: totalYards,
      CostPricePerYard: costPrice,
      LossAmount: lossAmount,
      Reason: finalReason,
      ActionTaken: createClearanceBundle ? 'ClearanceBundle' : 'WrittenOff',
      LoggedBy: activeUser?.FullName || activeUser?.UserName || 'Admin',
      Notes: notes.trim(),
      CreateBundle: createClearanceBundle,
      BundlePrice: createClearanceBundle ? (Number(bundlePrice) || 0) : 0
    };

    if (onRecordWastage) {
      onRecordWastage(payload);
      playCashChime();
    }

    // ফর্ম রিসেট
    setSelectedProductId('');
    setGoj(1);
    setGira(0);
    setNotes('');
    setCreateClearanceBundle(false);
    setActiveTab('list');
  };

  // ফিল্টার করা তালিকা
  const filteredList = useMemo(() => {
    return fabricWastageList.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQ =
        !q ||
        (item.ProductName && item.ProductName.toLowerCase().includes(q)) ||
        (item.WastageID && item.WastageID.toLowerCase().includes(q)) ||
        (item.Reason && item.Reason.toLowerCase().includes(q));

      const matchType = typeFilter === 'ALL' || item.Type === typeFilter;
      return matchQ && matchType;
    });
  }, [fabricWastageList, searchQuery, typeFilter]);

  // KPI হিসাব
  const kpi = useMemo(() => {
    let totalWastedYards = 0;
    let totalLoss = 0;
    let remnantCount = 0;
    let damagedCount = 0;

    fabricWastageList.forEach((r) => {
      totalWastedYards += Number(r.TotalYards) || 0;
      totalLoss += Number(r.LossAmount) || 0;
      if (r.Type === 'Remnant') remnantCount++;
      if (r.Type === 'Damaged') damagedCount++;
    });

    return {
      totalEntries: fabricWastageList.length,
      totalWastedYards: Math.round(totalWastedYards * 100) / 100,
      totalLoss: Math.round(totalLoss),
      remnantCount,
      damagedCount
    };
  }, [fabricWastageList]);

  if (!isOpen) return null;

  return (
    <div
      className={
        embedded
          ? 'w-full h-full flex flex-col bg-slate-50'
          : 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          embedded
            ? 'w-full h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'
            : 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200'
        }
      >
        {/* ================= ১. আল্ট্রা-মডার্ন হেডার ================= */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-rose-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-inner">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  কাপড়ের ছাঁট ও ড্যামেজ হিসাব ট্র্যাকার
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-400/40 uppercase tracking-wider">
                  Fabric Remnant & Loss Studio
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                থান কাপড়ের শেষ টুকরা (ছাঁট), ছেঁড়া-ফাটা ও ক্ষতি হিসাব এবং স্টক নিখুঁতকরণ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center border border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeTab === 'list'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>ছাঁট ও ক্ষতি তালিকা</span>
                {fabricWastageList.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-400/30 text-white">
                    {fabricWastageList.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeTab === 'new'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন ছাঁট/ড্যামেজ এন্ট্রি</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= ২. মূল কনটেন্ট এরিয়া ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 space-y-5">
          {/* ট্যাব ১: হিস্ট্রি ও সামারি */}
          {activeTab === 'list' && (
            <div className="space-y-5">
              {/* KPI স্ট্রিপ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট নষ্ট / ছাঁট কাপড়</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      {formatFabricQuantity(kpi.totalWastedYards, 'গজ', false)}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Scissors className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">মোট আর্থিক ক্ষতি</span>
                    <h3 className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">
                      {currencySymbol}{kpi.totalLoss.toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">থানের শেষ ছাঁট (Remnant)</span>
                    <h3 className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{kpi.remnantCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">নষ্ট / ছেঁড়া কাপড়</span>
                    <h3 className="text-xl sm:text-2xl font-black text-red-700 mt-0.5">{kpi.damagedCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* ফিল্টার ও সার্চ */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কাপড়ের নাম, আইডি বা কারণ দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ALL">সকল ধরণ (All)</option>
                    <option value="Remnant">থানের শেষ ছাঁট (Remnant)</option>
                    <option value="Damaged">নষ্ট / ড্যামেজ (Damaged)</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* টেবিল */}
              {filteredList.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
                    <Layers className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">কোনো ছাঁট বা ড্যামেজ রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    থান কাপড়ের শেষ অবশিষ্টাংশ বা নষ্ট কাপড় থাকলে "নতুন ছাঁট/ড্যামেজ এন্ট্রি" থেকে রেকর্ড করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-md shadow-rose-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>এন্ট্রি যোগ করুন</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                          <th className="p-3.5">তারিখ ও আইডি</th>
                          <th className="p-3.5">কাপড়ের বিবরণ</th>
                          <th className="p-3.5">ধরণ</th>
                          <th className="p-3.5">পরিমাণ (গজ ও গিরা)</th>
                          <th className="p-3.5">আর্থিক ক্ষতি</th>
                          <th className="p-3.5">কারণ ও গৃহীত ব্যবস্থা</th>
                          <th className="p-3.5">এন্ট্রি কারী</th>
                          <th className="p-3.5 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredList.map((item) => (
                          <tr key={item.WastageID} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-slate-700 block">{item.WastageID}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.CreatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-900">
                              {item.ProductName}
                              <span className="block text-[10px] text-slate-400 font-normal">{item.Category}</span>
                            </td>
                            <td className="p-3.5">
                              {item.Type === 'Remnant' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  থানের ছাঁট
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  ড্যামেজ / নষ্ট
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 font-mono">
                              {formatFabricQuantity(item.TotalYards, 'গজ', true)}
                            </td>
                            <td className="p-3.5 font-black text-rose-600 font-mono">
                              {currencySymbol}{item.LossAmount}
                              <span className="block text-[9px] text-slate-400 font-normal">
                                @{currencySymbol}{item.CostPricePerYard}/গজ
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-bold text-slate-800 block">{item.Reason}</span>
                              <span className="text-[10px] text-slate-500">
                                {item.ActionTaken === 'ClearanceBundle' ? '✨ ছাঁট প্যাক হিসেবে তৈরি' : 'সরাসরি রাইট-অফ (বাদ)'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium">
                              {item.LoggedBy}
                            </td>
                            <td className="p-3.5 text-right">
                              {onDeleteWastageRecord && (
                                <button
                                  onClick={() => {
                                    if (confirm('আপনি কি এই ছাঁট/ড্যামেজ রেকর্ডটি মুছে ফেলতে চান?')) {
                                      onDeleteWastageRecord(item.WastageID);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ২: নতুন ছাঁট বা ড্যামেজ রেকর্ড ফরম */}
          {activeTab === 'new' && (
            <form onSubmit={handleSubmitWastage} className="space-y-5">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                  ১. কাপড় নির্বাচন ও অপচয়ের ধরণ
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* থান কাপড় নির্বাচন */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">থান কাপড় নির্বাচন করুন *</label>
                    <select
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-800"
                    >
                      <option value="">তালিকায় থাকা থান কাপড় বাছাই করুন...</option>
                      {fabricProducts.map((p) => (
                        <option key={p.ProductID || p.id} value={p.ProductID || p.id}>
                          {p.ProductName || p.name} (মজুত: {p.CurrentStock || p.stock || 0} গজ | কেনা: {currencySymbol}{p.CostPrice || p.costPrice || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* অপচয়ের ধরণ */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ধরণ নির্বাচন করুন</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEntryType('Remnant');
                          setReason('থানের শেষ ছাঁট (End-of-bolt Remnant)');
                        }}
                        className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                          entryType === 'Remnant'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        থানের শেষ ছাঁট (Remnant)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEntryType('Damaged');
                          setReason('মিলের ত্রুটি / কালার ফল্ট (Mill Defect)');
                        }}
                        className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                          entryType === 'Damaged'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        ড্যামেজ / নষ্ট কাপড়
                      </button>
                    </div>
                  </div>
                </div>

                {/* পরিমাপ (গজ ও গিরা) */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-black text-slate-800">২. ছাঁট বা নষ্ট কাপড়ের পরিমাণ (গজ ও গিরা)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">গজ (Yards)</label>
                      <input
                        type="number"
                        min="0"
                        value={goj}
                        onChange={(e) => setGoj(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-black text-slate-900 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">গিরা (Gira - ১ গজ = ১৬ গিরা)</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={gira}
                        onChange={(e) => setGira(Math.min(15, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-black text-slate-900 text-sm"
                      />
                    </div>

                    {/* মোট হিসাব প্রিভিউ */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">মোট পরিমাণ</span>
                      <span className="text-base font-black text-indigo-900">
                        {formatFabricQuantity(totalYards, 'গজ', true)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* কারণ ও আর্থিক ক্ষতি */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">অপচয় / ছাঁটের কারণ *</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-800"
                    >
                      {entryType === 'Remnant' ? (
                        <>
                          <option value="থানের শেষ ছাঁট (End-of-bolt Remnant)">থানের শেষ ছাঁট (End-of-bolt Remnant)</option>
                          <option value="কাটিং অপচয় (Cutting Scrap)">কাটিং অপচয় (Cutting Scrap)</option>
                          <option value="অন্যান্য">অন্যান্য কারণ</option>
                        </>
                      ) : (
                        <>
                          <option value="মিলের ত্রুটি / কালার ফল্ট (Mill Defect)">মিলের ত্রুটি / কালার ফল্ট (Mill Defect)</option>
                          <option value="ছেঁড়া বা কাটা ভুল (Torn / Cut Mistake)">ছেঁড়া বা কাটা ভুল (Torn / Cut Mistake)</option>
                          <option value="ইঁদুরে কাটা / কীট-পতঙ্গের ক্ষতি (Pest Damage)">ইঁদুরে কাটা / কীট-পতঙ্গের ক্ষতি (Pest Damage)</option>
                          <option value="পানি বা স্যাঁতসেঁতে নষ্ট (Water Damage)">পানি বা স্যাঁতসেঁতে নষ্ট (Water Damage)</option>
                          <option value="অন্যান্য">অন্যান্য কারণ</option>
                        </>
                      )}
                    </select>

                    {reason === 'অন্যান্য' && (
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="সুনির্দিষ্ট কারণ লিখুন..."
                        className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium text-xs"
                      />
                    )}
                  </div>

                  {/* আর্থিক ক্ষতির হিসাব কার্ড */}
                  <div className="bg-rose-950 text-white p-4 rounded-2xl flex items-center justify-between border border-rose-900">
                    <div>
                      <span className="text-[10px] text-rose-300 uppercase font-bold block">আনুমানিক আর্থিক ক্ষতি</span>
                      <h4 className="text-xl font-black text-white mt-0.5">{currencySymbol}{lossAmount}</h4>
                      <span className="text-[10px] text-rose-300 block mt-1">
                        (কেনা দর: {currencySymbol}{costPrice} × {totalYards} গজ)
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-rose-800/60 text-rose-300 flex items-center justify-center font-bold">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* অপশন: ছাঁট প্যাক হিসেবে কম দামে বিক্রি */}
                {entryType === 'Remnant' && (
                  <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createClearanceBundle}
                        onChange={(e) => setCreateClearanceBundle(e.target.checked)}
                        className="w-4 h-4 rounded-md text-amber-600 focus:ring-amber-500 border-amber-300"
                      />
                      <span className="font-bold text-amber-900">
                        ✨ এই ছাঁট কাপড়টি ডিসকাউন্ট প্যাক হিসেবে ক্যাটালগে যুক্ত করুন (Clearance Remnant)
                      </span>
                    </label>

                    {createClearanceBundle && (
                      <div className="pt-2 flex items-center space-x-3">
                        <label className="font-bold text-slate-700">ছাঁট প্যাক বিক্রয় মূল্য (৳):</label>
                        <input
                          type="number"
                          min="1"
                          value={bundlePrice}
                          onChange={(e) => setBundlePrice(parseFloat(e.target.value) || 0)}
                          className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-black text-amber-900 w-32 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-[11px] text-slate-500">গ্রাহকরা কম দামে কিনতে পারবেন</span>
                      </div>
                    )}
                  </div>
                )}

                {/* অতিরিক্ত নোট */}
                <div className="text-xs">
                  <label className="block text-slate-700 font-bold mb-1">অতিরিক্ত নোট / বিবরণ</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="যেমন: এই থানটি শেষ হওয়ার পর ১ গজ ছাঁট পাওয়া গেছে..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* অ্যাকশন বাটন */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-rose-500/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>রেকর্ড সংরক্ষণ ও স্টক সমন্বয় করুন</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
