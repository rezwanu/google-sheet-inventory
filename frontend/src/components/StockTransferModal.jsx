import React, { useState, useMemo } from 'react';
import {
  X,
  Truck,
  ArrowRightLeft,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  Clock,
  Search,
  Check,
  AlertCircle,
  Building2,
  Boxes,
  FileText,
  User,
  Phone,
  Navigation
} from 'lucide-react';

export default function StockTransferModal({
  isOpen,
  onClose,
  products = [],
  stockTransfers = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  onSaveStockTransfer,
  onUpdateStockTransferStatus
}) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list'

  // নতুন চালান ফরম স্টেট
  const [challanNo, setChallanNo] = useState(() => `CHL-${Date.now().toString().slice(-6)}`);
  const [fromLocation, setFromLocation] = useState('Main Warehouse');
  const [toLocation, setToLocation] = useState('Main Shop');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');

  // আইটেম পিকার স্টেট
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [challanItems, setChallanItems] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // প্রিন্ট প্রিভিউ স্টেট
  const [printableChallan, setPrintableChallan] = useState(null);

  // লিস্ট ফিল্টার
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!isOpen) return null;

  // পণ্য ফিল্টার সাজেশন্স
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((p) => {
        const name = String(p.ProductName || p.productName || '').toLowerCase();
        const code = String(p.Barcode || p.barcode || p.ProductID || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 8);
  }, [products, productSearch]);

  // নির্বাচিত পণ্যের ভ্যারিয়েন্ট তালিকা
  const productVariants = useMemo(() => {
    if (!selectedProduct) return [];
    let vars = selectedProduct.Variants || selectedProduct.variants || [];
    if (typeof vars === 'string') {
      try {
        vars = JSON.parse(vars);
      } catch {
        vars = [];
      }
    }
    return Array.isArray(vars) ? vars : [];
  }, [selectedProduct]);

  // পণ্য সিলেক্ট করা
  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setProductSearch('');
    const vars = p.Variants || p.variants || [];
    if (Array.isArray(vars) && vars.length > 0) {
      setSelectedVariantId(vars[0].VariantID || vars[0].variantId || '');
    } else {
      setSelectedVariantId('');
    }
    setTransferQty(1);
  };

  // চালানে আইটেম যোগ করা
  const handleAddItemToChallan = () => {
    if (!selectedProduct) return;
    const qty = Number(transferQty) || 0;
    if (qty <= 0) {
      alert('সঠিক পরিমাণ উল্লেখ করুন।');
      return;
    }

    const pid = selectedProduct.ProductID || selectedProduct.id;
    const pName = selectedProduct.ProductName || selectedProduct.productName;
    const unit = selectedProduct.Unit || selectedProduct.unit || 'Pcs';

    let variantName = '';
    let costPrice = Number(selectedProduct.CostPrice || selectedProduct.costPrice || 0);

    if (selectedVariantId && productVariants.length > 0) {
      const v = productVariants.find((vr) => String(vr.VariantID || vr.variantId) === String(selectedVariantId));
      if (v) {
        const attrs = v.Attributes || v.attributes || {};
        variantName = Object.values(attrs).filter(Boolean).join(' / ') || v.VariantID;
        if (v.CostPrice) costPrice = Number(v.CostPrice);
      }
    }

    // ডুপ্লিকেট আইটেম চেক
    const existingIdx = challanItems.findIndex(
      (item) => item.productId === pid && String(item.variantId || '') === String(selectedVariantId || '')
    );

    if (existingIdx !== -1) {
      const updated = [...challanItems];
      updated[existingIdx].quantity += qty;
      setChallanItems(updated);
    } else {
      setChallanItems((prev) => [
        ...prev,
        {
          productId: pid,
          productName: pName,
          variantId: selectedVariantId || null,
          variantName: variantName,
          quantity: qty,
          unit: unit,
          costPrice: costPrice
        }
      ]);
    }

    // রিসেট পিকার
    setSelectedProduct(null);
    setSelectedVariantId('');
    setTransferQty(1);
  };

  const handleRemoveChallanItem = (index) => {
    setChallanItems((prev) => prev.filter((_, i) => i !== index));
  };

  // মোট চালানের পরিমাণ
  const totalChallanQty = challanItems.reduce((sum, itm) => sum + itm.quantity, 0);

  // চালান সাবমিট হ্যান্ডলার
  const handleSubmitChallan = async (shouldPrint = true) => {
    if (challanItems.length === 0) {
      alert('চালানে অন্তত ১টি পণ্য যোগ করুন।');
      return;
    }
    if (fromLocation === toLocation) {
      alert('উৎস এবং গন্তব্য একই হতে পারে না। অনুগ্রহ করে ভিন্ন লোকেশন নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const transferPayload = {
        challanNo: challanNo.trim() || `CHL-${Date.now().toString().slice(-6)}`,
        fromLocation,
        toLocation,
        driverName: `${driverName.trim()} ${driverPhone.trim() ? `(${driverPhone.trim()})` : ''} ${vehicleNo.trim() ? `[${vehicleNo.trim()}]` : ''}`.trim(),
        notes: notes.trim(),
        items: challanItems,
        status: 'In Transit', // ডিফল্ট স্ট্যাটাস পথে আছে
        createdBy: activeUser?.FullName || activeUser?.UserName || 'Admin'
      };

      const result = await onSaveStockTransfer(transferPayload);

      if (result && result.record) {
        if (shouldPrint) {
          setPrintableChallan(result.record);
        } else {
          alert(`স্টক ট্রান্সফার চালান #${result.record.ChallanNo} সফলভাবে তৈরি হয়েছে!`);
          handleResetChallan();
          setActiveTab('list');
        }
      }
    } catch (e) {
      alert(`চালান তৈরি ব্যর্থ: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetChallan = () => {
    setChallanNo(`CHL-${Date.now().toString().slice(-6)}`);
    setChallanItems([]);
    setDriverName('');
    setDriverPhone('');
    setVehicleNo('');
    setNotes('');
    setPrintableChallan(null);
  };

  // চালান রিসিভ ও স্টকে যোগ হ্যান্ডলার
  const handleReceiveChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    const confirmMsg = `আপনি কি নিশ্চিত যে চালান #${cNo}-এর সকল পণ্য (${challan.TotalQuantity || challan.totalQuantity} পিস) অক্ষত অবস্থায় বুঝে পেয়েছেন?\n\nএটি স্বয়ংক্রিয়ভাবে আপনার দোকানের স্টকে মালামাল রিস্টক করবে।`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await onUpdateStockTransferStatus({
        transferId: challan.TransferID || challan.transferId || cNo,
        status: 'Received',
        receivedBy: activeUser?.FullName || activeUser?.UserName || 'Manager'
      });
      alert(`চালান #${cNo} সফলভাবে গ্রহণ করা হয়েছে এবং পণ্য স্টকে যোগ হয়েছে!`);
    } catch (e) {
      alert(`চালান রিসিভ করতে সমস্যা হয়েছে: ${e.message}`);
    }
  };

  // চালান বাতিল হ্যান্ডলার
  const handleCancelChallan = async (challan) => {
    const cNo = challan.ChallanNo || challan.challanNo;
    if (!window.confirm(`আপনি কি চালান #${cNo} বাতিল করতে চান?`)) return;

    try {
      await onUpdateStockTransferStatus({
        transferId: challan.TransferID || challan.transferId || cNo,
        status: 'Cancelled',
        receivedBy: activeUser?.FullName || activeUser?.UserName || 'Manager'
      });
      alert(`চালান #${cNo} বাতিল করা হয়েছে।`);
    } catch (e) {
      alert(`চালান বাতিল করতে সমস্যা হয়েছে: ${e.message}`);
    }
  };

  // লিস্ট ফিল্টার
  const filteredChallans = useMemo(() => {
    return stockTransfers.filter((t) => {
      const q = listSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(t.ChallanNo || '').toLowerCase().includes(q) ||
        String(t.FromLocation || '').toLowerCase().includes(q) ||
        String(t.ToLocation || '').toLowerCase().includes(q) ||
        String(t.DriverName || '').toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'ALL' || String(t.Status || '').toUpperCase() === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [stockTransfers, listSearch, statusFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* মডাল হেডার */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">গোডাউন টু দোকান স্টক ট্রান্সফার চালান</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/20">
                  Phase 7 Live
                </span>
              </div>
              <p className="text-xs text-slate-300">
                গোডাউন থেকে দোকানে মালামাল স্থানান্তর, ডিজিটাল চালান ও রিসিভিং ট্র্যাকিং
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ট্যাব নেভিগেশন */}
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center border border-slate-700/60">
              <button
                type="button"
                onClick={() => { setActiveTab('new'); setPrintableChallan(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'new'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                নতুন চালান তৈরি
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('list'); setPrintableChallan(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'list'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>চালান ট্র্যাকিং ও তালিকা</span>
                {stockTransfers.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-400/40 text-white font-mono font-bold">
                    {stockTransfers.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* প্রিন্ট প্রিভিউ ভিউয়ার */}
        {printableChallan ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-0 print:border-none print:shadow-none">
              
              {/* কন্ট্রোল বার */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
                <span className="text-xs font-bold text-slate-600">ডেলিভারি চালান ও গেটপাস প্রিন্ট ভিউ</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>চালান প্রিন্ট করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPrintableChallan(null); handleResetChallan(); setActiveTab('list'); }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>

              {/* চালান ফরম্যাট */}
              <div className="space-y-6 text-slate-800 text-xs">
                
                {/* হেডার */}
                <div className="text-center pb-4 border-b-2 border-slate-900">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {storeSettings?.StoreName || 'Pabna Bostraloy'}
                  </h3>
                  <p className="text-xs text-slate-500">{storeSettings?.Address || 'Bosila, Mohammadpur, Dhaka'}</p>
                  <p className="text-xs text-slate-500">ফোন: {storeSettings?.Phone || '01675934919'}</p>
                  <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                    পণ্য স্থানান্তর ডেলিভারি চালান ও গেটপাস
                  </div>
                </div>

                {/* চালান বিবরণ */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-medium">চালান নম্বর:</span>
                    <span className="font-bold font-mono text-sm text-indigo-700">{printableChallan.ChallanNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">চালান তৈরির তারিখ:</span>
                    <span className="font-bold">{new Date(printableChallan.TransferDate || printableChallan.CreatedAt).toLocaleString('bn-BD')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">উৎস (প্রেরক স্থান):</span>
                    <span className="font-bold text-slate-900">{printableChallan.FromLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">গন্তব্য (প্রাপক স্থান):</span>
                    <span className="font-bold text-emerald-700">{printableChallan.ToLocation}</span>
                  </div>
                  {printableChallan.DriverName && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-medium">বাহক / ড্রাইভার তথ্য:</span>
                      <span className="font-medium text-slate-800">{printableChallan.DriverName}</span>
                    </div>
                  )}
                </div>

                {/* আইটেম তালিকা */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 bg-slate-100">
                      <th className="py-2 px-3">ক্রমিক</th>
                      <th className="py-2 px-3">পণ্যের বিবরণ</th>
                      <th className="py-2 px-3 text-center">একক</th>
                      <th className="py-2 px-3 text-right">স্থানান্তরিত পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(printableChallan.Items || []).map((itm, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{itm.productName}</strong>
                          {itm.variantName && (
                            <span className="text-[10px] text-slate-500 font-medium">ভ্যারিয়েন্ট: {itm.variantName}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{itm.unit || 'Pcs'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-slate-900">
                          {itm.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                      <td colSpan="3" className="py-2.5 px-3 text-right uppercase">মোট স্থানান্তর পরিমাণ:</td>
                      <td className="py-2.5 px-3 text-right font-black text-sm font-mono text-emerald-800">
                        {printableChallan.TotalQuantity || (printableChallan.Items || []).reduce((s, itm) => s + Number(itm.quantity), 0)} পিস
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {printableChallan.Notes && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                    <span className="font-bold text-amber-900 block">মন্তব্য:</span>
                    <span className="text-amber-800">{printableChallan.Notes}</span>
                  </div>
                )}

                {/* স্বাক্ষর সেকশন (স্বাক্ষর ব্লক) */}
                <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-200 text-center text-xs">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-700 block">প্রেরক স্বাক্ষর</span>
                    <span className="text-[10px] text-slate-400">গোডাউন ইন-চার্জ</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-700 block">বাহক স্বাক্ষর</span>
                    <span className="text-[10px] text-slate-400">ডেলিভারি ম্যান / ড্রাইভার</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-700 block">গ্রহীতা স্বাক্ষর</span>
                    <span className="text-[10px] text-slate-400">দোকান ম্যানেজার</span>
                  </div>
                </div>

                <div className="text-center pt-4 text-[10px] text-slate-400">
                  চালান প্রস্তুতকারী: {printableChallan.CreatedBy || 'Admin'} • পাবনা বস্ত্রালয় ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম
                </div>

              </div>

            </div>
          </div>
        ) : activeTab === 'new' ? (
          /* ট্যাব ১: নতুন চালান তৈরির ফর্ম */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* রো ১: চালান হেডার সেটিংস */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">চালান নম্বর:</label>
                <input
                  type="text"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">উৎস লোকেশন (From):</label>
                <select
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Main Warehouse">মূল গোডাউন (Main Warehouse)</option>
                  <option value="Main Shop">দোকান কাউন্টার (Main Shop)</option>
                  <option value="Factory / Godown 2">ফ্যাক্টরি / গোডাউন ২</option>
                  <option value="Branch 1">শাখা ১ (Branch 1)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">গন্তব্য লোকেশন (To):</label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Main Shop">দোকান কাউন্টার (Main Shop)</option>
                  <option value="Main Warehouse">মূল গোডাউন (Main Warehouse)</option>
                  <option value="Factory / Godown 2">ফ্যাক্টরি / গোডাউন ২</option>
                  <option value="Branch 1">শাখা ১ (Branch 1)</option>
                </select>
              </div>
            </div>

            {/* রো ২: ড্রাইভার ও ট্রান্সপোর্ট বিবরণ */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">ড্রাইভার / বাহকের নাম:</label>
                <input
                  type="text"
                  placeholder="যেমন: মোঃ রফিক"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-bold">মোবাইল নম্বর:</label>
                <input
                  type="text"
                  placeholder="যেমন: 01700-000000"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-bold">গাড়ির নম্বর / রিকশা / ভ্যান:</label>
                <input
                  type="text"
                  placeholder="যেমন: ঢাকা মেট্রো-ন..."
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* রো ৩: পণ্য নির্বাচন ও চালানে আইটেম সংযোজন */}
            <div className="p-4 sm:p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center space-x-2">
                <Boxes className="w-4 h-4" />
                <span>চালানে পণ্য নির্বাচন করুন</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* প্রোডাক্ট সার্চ ইনপুট */}
                <div className="sm:col-span-6 relative">
                  <label className="text-xs font-bold text-slate-700 block mb-1">পণ্য খুঁজুন:</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="পণ্যের নাম বা বারকোড লিখুন..."
                      value={selectedProduct ? selectedProduct.ProductName || selectedProduct.productName : productSearch}
                      onChange={(e) => {
                        setSelectedProduct(null);
                        setProductSearch(e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* অটো-কমপ্লিট ড্রপডাউন */}
                  {!selectedProduct && productSearch.trim() && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <button
                          key={p.ProductID || p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{p.ProductName || p.productName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">বারকোড: {p.Barcode || p.barcode || 'N/A'}</span>
                          </div>
                          <span className="font-bold text-emerald-700">স্টক: {p.StockQuantity || 0}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ভ্যারিয়েন্ট সিলেক্টর (যদি থাকে) */}
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">ভ্যারিয়েন্ট / সাইজ:</label>
                  <select
                    disabled={!selectedProduct || productVariants.length === 0}
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                  >
                    {productVariants.length === 0 ? (
                      <option value="">ডিফল্ট পণ্য (ভ্যারিয়েন্ট ছাড়া)</option>
                    ) : (
                      productVariants.map((vr) => {
                        const attrs = vr.Attributes || vr.attributes || {};
                        const label = Object.values(attrs).filter(Boolean).join(' - ') || vr.VariantID;
                        return (
                          <option key={vr.VariantID || vr.variantId} value={vr.VariantID || vr.variantId}>
                            {label} (স্টক: {vr.StockQuantity || 0})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* পরিমাণ ইনপুট */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">পরিমাণ (Qty):</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* অ্যাড বাটন */}
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddItemToChallan}
                    disabled={!selectedProduct}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center font-bold disabled:opacity-40 shadow-xs"
                    title="চালানে যোগ করুন"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* রো ৪: চালানের আইটেম তালিকা টেবিল */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">চালানে অন্তর্ভুক্ত পণ্যের তালিকা ({challanItems.length} প্রকার)</span>
                <span className="text-emerald-700 font-mono">মোট মালামাল: {totalChallanQty} পিস</span>
              </div>

              {challanItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  এখনো কোনো পণ্য চালানে যোগ করা হয়নি। উপরের বক্স থেকে পণ্য নির্বাচন করে যোগ করুন।
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold">
                      <th className="py-2 px-3">পণ্যের নাম</th>
                      <th className="py-2 px-3">ভ্যারিয়েন্ট</th>
                      <th className="py-2 px-3 text-center">পরিমাণ</th>
                      <th className="py-2 px-3 text-center">একক</th>
                      <th className="py-2 px-3 text-right">মুছে ফেলুন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {challanItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{item.productName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.variantName || '—'}</td>
                        <td className="py-2 px-3 text-center font-black font-mono text-emerald-700 text-sm">{item.quantity}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{item.unit || 'Pcs'}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveChallanItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* রো ৫: অতিরিক্ত নোট ও সাবমিট অ্যাকশন */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="চালান সম্পর্কে কোনো বিশেষ নির্দেশনা বা মন্তব্য (ঐচ্ছিক)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmitChallan(true)}
                  disabled={isSubmitting || challanItems.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>চালান তৈরি ও প্রিন্ট করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitChallan(false)}
                  disabled={isSubmitting || challanItems.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>শুধুমাত্র চালান সংরক্ষণ করুন</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ট্যাব ২: চালান ট্র্যাকিং ও তালিকা */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            
            {/* সার্চ ও ফিল্টার */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="চালান নম্বর, উৎস বা গন্তব্য খুঁজুন..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'IN TRANSIT', 'RECEIVED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL' && 'সকল চালান'}
                    {st === 'IN TRANSIT' && 'পথে আছে (In Transit)'}
                    {st === 'RECEIVED' && 'গৃহীত (Received)'}
                    {st === 'CANCELLED' && 'বাতিল (Cancelled)'}
                  </button>
                ))}
              </div>
            </div>

            {/* চালান কার্ড তালিকা */}
            {filteredChallans.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Truck className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">কোনো চালান রেকর্ড পাওয়া যায়নি</p>
                <p className="text-xs">নতুন কোনো স্টক ট্রান্সফার চালান তৈরি করা হলে তা এখানে স্বয়ংক্রিয়ভাবে দেখাবে।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChallans.map((challan, idx) => {
                  const items = Array.isArray(challan.Items) ? challan.Items : (typeof challan.Items === 'string' ? JSON.parse(challan.Items || '[]') : []);
                  const isInTransit = String(challan.Status || '').trim() === 'In Transit';
                  const isReceived = String(challan.Status || '').trim() === 'Received';
                  const isCancelled = String(challan.Status || '').trim() === 'Cancelled';

                  return (
                    <div
                      key={challan.TransferID || challan.ChallanNo || idx}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            #{challan.ChallanNo}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isInTransit
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : isReceived
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isInTransit ? 'পথে আছে (In Transit)' : isReceived ? 'গৃহীত ও রিস্টকড (Received)' : 'বাতিল (Cancelled)'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {new Date(challan.TransferDate || challan.CreatedAt).toLocaleDateString('bn-BD')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                          <span>{challan.FromLocation}</span>
                          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-emerald-700">{challan.ToLocation}</span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          মোট পণ্য: <strong className="text-slate-800">{challan.TotalQuantity || items.reduce((s, itm) => s + Number(itm.quantity), 0)} পিস</strong> ({items.length} প্রকার)
                          {challan.DriverName && <span> • বাহক: {challan.DriverName}</span>}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="flex items-center space-x-1.5">
                          {isInTransit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReceiveChallan(challan)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>গ্রহণ ও রিস্টক করুন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelChallan(challan)}
                                className="px-2 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs rounded-xl transition-colors"
                                title="চালান বাতিল"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setPrintableChallan(challan)}
                            className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200 transition-colors"
                            title="চালান কপি প্রিন্ট"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

