import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Search,
  Receipt,
  Ticket,
  CheckCircle,
  AlertTriangle,
  Printer,
  Phone,
  Banknote,
  Coins,
  Check
} from 'lucide-react';
import { extractAndNormalizeItems } from '../services/storage';

export default function SalesReturnModal({
  isOpen,
  onClose,
  embedded = false,
  salesHistory = [],
  customers = [],
  products = [],
  salesReturns = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  onSaveSalesReturn,
  onRedeemStoreCredit
}) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'

  // ইনভয়েস সার্চ স্টেট
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // রিটার্ন আইটেমসমূহ স্টেট: { [uniqueKey]: { quantity: number, condition: 'Resellable' | 'Damaged', reason: string, returnPrice: number } }
  const [returnItemsState, setReturnItemsState] = useState({});

  // রিফান্ড মেথড ও ভাউচার অপশন
  const [refundMethod, setRefundMethod] = useState('StoreCredit'); // 'Cash' | 'StoreCredit' | 'DeductDue' | 'Exchange'
  const [validityDays, setValidityDays] = useState(60);
  const [generalReason, setGeneralReason] = useState('Customer Return');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // প্রিন্ট প্রিভিউ স্টেট
  const [printableRecord, setPrintableRecord] = useState(null);
  const [printDocType, setPrintDocType] = useState('memo'); // 'memo' | 'voucher'

  // হিস্ট্রি ফিল্টার
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('ALL');

  // ইনভয়েস সার্চ রেজাল্ট ফিল্টার
  const filteredInvoices = useMemo(() => {
    if (!invoiceQuery.trim()) return [];
    const q = invoiceQuery.trim().toLowerCase();
    return salesHistory
      .filter((s) => {
        const invNo = String(s.InvoiceNo || s.invoiceNo || s.saleId || s.SaleID || '').toLowerCase();
        const custName = String(s.CustomerName || s.customerName || '').toLowerCase();
        const custPhone = String(s.CustomerPhone || s.customerPhone || '').toLowerCase();
        return invNo.includes(q) || custName.includes(q) || custPhone.includes(q);
      })
      .slice(0, 10);
  }, [salesHistory, invoiceQuery]);

  // নির্বাচিত ইনভয়েসের আইটেম তালিকা
  const invoiceItems = useMemo(() => {
    if (!selectedInvoice) return [];
    return extractAndNormalizeItems(selectedInvoice);
  }, [selectedInvoice]);

  // ইনভয়েস নির্বাচন হ্যান্ডলার
  const handleSelectInvoice = (inv) => {
    setSelectedInvoice(inv);
    const initialItemsState = {};
    const items = extractAndNormalizeItems(inv);
    items.forEach((item, idx) => {
      const key = `${item.productId || idx}_${item.variantId || 'main'}`;
      initialItemsState[key] = {
        quantity: 0,
        maxQuantity: Number(item.quantity) || 1,
        condition: 'Resellable',
        reason: 'Size mismatch / Customer preference',
        item: item,
        returnPrice: Number(item.sellingPrice) || 0
      };
    });
    setReturnItemsState(initialItemsState);
  };

  // আইটেম রিটার্ন কোয়ান্টিটি চেঞ্জ
  const handleQtyChange = (key, val) => {
    setReturnItemsState((prev) => {
      const current = prev[key];
      if (!current) return prev;
      const num = Math.max(0, Math.min(Number(val) || 0, current.maxQuantity));
      return {
        ...prev,
        [key]: { ...current, quantity: num }
      };
    });
  };

  // কন্ডিশন চেঞ্জ
  const handleConditionChange = (key, condition) => {
    setReturnItemsState((prev) => ({
      ...prev,
      [key]: { ...prev[key], condition }
    }));
  };

  // রিজন চেঞ্জ
  const handleItemReasonChange = (key, reason) => {
    setReturnItemsState((prev) => ({
      ...prev,
      [key]: { ...prev[key], reason }
    }));
  };

  // রিটার্ন টোটাল হিসাব
  const returnSummary = useMemo(() => {
    const selectedEntries = Object.values(returnItemsState).filter((s) => s.quantity > 0);
    const totalItems = selectedEntries.reduce((sum, s) => sum + s.quantity, 0);
    const totalAmount = selectedEntries.reduce(
      (sum, s) => sum + s.quantity * (Number(s.returnPrice) || 0),
      0
    );
    const hasResellable = selectedEntries.some((s) => s.condition === 'Resellable');
    const hasDamaged = selectedEntries.some((s) => s.condition === 'Damaged');
    return {
      selectedEntries,
      totalItems,
      totalAmount,
      hasResellable,
      hasDamaged
    };
  }, [returnItemsState]);

  // কাস্টমারের বকেয়া তথ্য (যদি সিলেক্টেড ইনভয়েসে গ্রাহক থাকে)
  const customerObj = useMemo(() => {
    if (!selectedInvoice) return null;
    const phone = selectedInvoice.CustomerPhone || selectedInvoice.customerPhone;
    const name = selectedInvoice.CustomerName || selectedInvoice.customerName;
    return customers.find(
      (c) =>
        (phone && String(c.Phone).trim() === String(phone).trim()) ||
        (name && String(c.FullName || c.Name).trim().toLowerCase() === String(name).trim().toLowerCase())
    );
  }, [selectedInvoice, customers]);

  const customerCurrentDue = Number(customerObj?.CurrentDue || 0);

  // রিটার্ন সাবমিট হ্যান্ডলার
  const handleSubmitReturn = async (shouldPrint = true) => {
    if (returnSummary.totalItems === 0) {
      alert('অনুগ্রহ করে অন্তত ১টি পণ্যের রিটার্ন পরিমাণ নির্ধারণ করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToReturn = returnSummary.selectedEntries.map((s) => ({
        productId: s.item.productId,
        productName: s.item.productName,
        variantId: s.item.variantId || null,
        variantName: s.item.variantName || '',
        quantity: s.quantity,
        sellingPrice: s.returnPrice,
        returnPrice: s.returnPrice,
        condition: s.condition,
        reason: s.reason
      }));

      const invoiceNo = selectedInvoice.InvoiceNo || selectedInvoice.invoiceNo || selectedInvoice.saleId || '';
      const custId = customerObj?.CustomerID || selectedInvoice.CustomerID || 'GUEST';
      const custName = selectedInvoice.CustomerName || selectedInvoice.customerName || 'Walk-in Customer';
      const custPhone = selectedInvoice.CustomerPhone || selectedInvoice.customerPhone || '';

      const returnPayload = {
        invoiceNo,
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        items: itemsToReturn,
        totalRefundAmount: returnSummary.totalAmount,
        refundMethod: refundMethod,
        reason: generalReason,
        processedBy: activeUser?.FullName || activeUser?.UserName || 'Cashier',
        notes: notes.trim(),
        creditValidityDays: validityDays,
        generateCreditNote: refundMethod === 'StoreCredit' || refundMethod === 'Exchange'
      };

      const result = await onSaveSalesReturn(returnPayload);

      if (result && result.record) {
        if (shouldPrint) {
          setPrintableRecord(result.record);
          setPrintDocType(refundMethod === 'StoreCredit' ? 'voucher' : 'memo');
        } else {
          alert('পণ্য বিক্রয় রিটার্ন সফলভাবে সম্পন্ন হয়েছে!');
          handleResetForm();
        }
      }
    } catch (err) {
      alert(`রিটার্ন প্রক্রিয়ায় সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedInvoice(null);
    setInvoiceQuery('');
    setReturnItemsState({});
    setGeneralReason('Customer Return');
    setNotes('');
    setPrintableRecord(null);
  };

  // হিস্ট্রি ফিল্টারড তালিকা
  const filteredReturnsHistory = useMemo(() => {
    return salesReturns.filter((ret) => {
      const q = historySearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(ret.ReturnID || '').toLowerCase().includes(q) ||
        String(ret.InvoiceNo || '').toLowerCase().includes(q) ||
        String(ret.CreditNoteCode || '').toLowerCase().includes(q) ||
        String(ret.CustomerName || '').toLowerCase().includes(q);

      const matchMethod =
        historyMethodFilter === 'ALL' || String(ret.RefundMethod || '').toUpperCase() === historyMethodFilter;

      return matchSearch && matchMethod;
    });
  }, [salesReturns, historySearch, historyMethodFilter]);

  // স্টোর ক্রেডিট রিডিম হ্যান্ডলার (হিস্ট্রি ট্যাব থেকে ম্যানুয়াল বা টেস্ট)
  const handleQuickRedeem = async (code) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে ভাউচার '${code}' রিডিম / ব্যবহার করতে চান?`)) return;
    try {
      await onRedeemStoreCredit(code);
      alert(`ভাউচার '${code}' সফলভাবে রিডিম করা হয়েছে!`);
    } catch (e) {
      alert(`ভাউচার রিডিম ব্যর্থ: ${e.message}`);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"}>
      <div className={embedded ? "relative w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)]" : "relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"}>
        
        {/* মডাল হেডার */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">পণ্য বিক্রয় রিটার্ন ও স্টোর ক্রেডিট নোট</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  Phase 7 Live
                </span>
              </div>
              <p className="text-xs text-slate-300">
                বিক্রিত পণ্য ফেরত নেওয়া, স্টকে পুনঃসংযোজন ও স্টোর ক্রেডিট ভাউচার তৈরি
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ট্যাব নেভিগেশন */}
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center border border-slate-700/60">
              <button
                type="button"
                onClick={() => { setActiveTab('new'); setPrintableRecord(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'new'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                নতুন রিটার্ন / বিনিময়
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('history'); setPrintableRecord(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>রিটার্ন ও ভাউচার তালিকা</span>
                {salesReturns.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-400/40 text-white font-mono font-bold">
                    {salesReturns.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className={`rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 shadow-xs'
                  : 'p-2 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-bold">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* প্রিন্ট ভিউয়ার (যদি থাকে) */}
        {printableRecord ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-6 print:border-none print:shadow-none">
              
              {/* প্রিন্ট কন্ট্রোল বার */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4 print:hidden">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600">ডকুমেন্ট টাইপ:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPrintDocType('memo')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        printDocType === 'memo' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      রিটার্ন মেমো
                    </button>
                    {printableRecord.CreditNoteCode && (
                      <button
                        type="button"
                        onClick={() => setPrintDocType('voucher')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center space-x-1 ${
                          printDocType === 'voucher' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        <Ticket className="w-3 h-3" />
                        <span>ক্রেডিট ভাউচার</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    নতুন রিটার্ন
                  </button>
                </div>
              </div>

              {/* মেমো ডকুমেন্ট */}
              {printDocType === 'memo' ? (
                <div className="space-y-4 text-slate-800">
                  <div className="text-center pb-3 border-b border-slate-200">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {storeSettings?.StoreName || 'Pabna Bostraloy'}
                    </h3>
                    <p className="text-xs text-slate-500">{storeSettings?.Address || 'Bosila, Mohammadpur, Dhaka'}</p>
                    <p className="text-xs text-slate-500">ফোন: {storeSettings?.Phone || '01675934919'}</p>
                    <div className="inline-block mt-2 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-black">
                      পণ্য বিক্রয় রিটার্ন ও রিফান্ড মেমো
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-xs gap-2 py-1 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">রিটার্ন আইডি:</span>
                      <span className="font-bold font-mono">{printableRecord.ReturnID}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">মূল ইনভয়েস নম্বর:</span>
                      <span className="font-bold font-mono text-indigo-600">{printableRecord.InvoiceNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">গ্রাহক:</span>
                      <span className="font-bold">{printableRecord.CustomerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">তারিখ ও সময়:</span>
                      <span className="font-medium text-slate-600">{new Date(printableRecord.ReturnDate).toLocaleString('bn-BD')}</span>
                    </div>
                  </div>

                  {/* আইটেম তালিকা */}
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1">পণ্য</th>
                        <th className="py-1 text-center">পরিমাণ</th>
                        <th className="py-1 text-right">দর</th>
                        <th className="py-1 text-right">মোট টাকা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(printableRecord.Items || []).map((itm, i) => (
                        <tr key={i} className="py-1.5">
                          <td className="py-1.5">
                            <span className="font-bold text-slate-800">{itm.productName}</span>
                            {itm.variantName && <span className="block text-[10px] text-slate-500">{itm.variantName}</span>}
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold inline-block mt-0.5 ${
                              itm.condition === 'Resellable' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {itm.condition === 'Resellable' ? 'পুনর্বিক্রয়যোগ্য (Restocked)' : 'ত্রুটিযুক্ত/নষ্ট (Damaged)'}
                            </span>
                          </td>
                          <td className="py-1.5 text-center font-bold">{itm.quantity}</td>
                          <td className="py-1.5 text-right font-mono">{currencySymbol}{Number(itm.returnPrice || itm.sellingPrice || 0).toFixed(2)}</td>
                          <td className="py-1.5 text-right font-mono font-bold">
                            {currencySymbol}{(Number(itm.quantity) * Number(itm.returnPrice || itm.sellingPrice || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* টোটাল রিফান্ড ও মেথড */}
                  <div className="pt-3 border-t-2 border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-sm text-slate-900">
                      <span>মোট রিফান্ড / সমন্বয় টাকা:</span>
                      <span className="font-mono text-rose-600">{currencySymbol}{Number(printableRecord.TotalRefundAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>রিফান্ড মাধ্যম:</span>
                      <span className="font-bold text-indigo-700">
                        {printableRecord.RefundMethod === 'StoreCredit' && 'স্টোর ক্রেডিট নোট (ভাউচার)'}
                        {printableRecord.RefundMethod === 'Cash' && 'নগদ ক্যাশ প্রদান (Cash)'}
                        {printableRecord.RefundMethod === 'DeductDue' && 'বকেয়া খাতা থেকে কর্তন (Due Deduct)'}
                        {printableRecord.RefundMethod === 'Exchange' && 'অন্য পণ্যের সাথে বিনিময়'}
                      </span>
                    </div>
                    {printableRecord.CreditNoteCode && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-900">ইস্যুকৃত ভাউচার কোড:</span>
                          <span className="font-mono font-black text-sm text-amber-700">{printableRecord.CreditNoteCode}</span>
                        </div>
                        <span className="text-[10px] text-amber-700 block mt-0.5">
                          মেয়াদ: {printableRecord.CreditNoteExpiry || '৬০ দিন'} (পরবর্তী কেনাকাটায় প্রযোজ্য)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
                    প্রসেস করেছেন: {printableRecord.ProcessedBy || 'Cashier'} • পাবনা বস্ত্রালয় POS
                  </div>
                </div>
              ) : (
                /* স্টোর ক্রেডিট ভাউচার কার্ড */
                <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl border-2 border-indigo-400/40 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <Ticket className="w-5 h-5 text-amber-400" />
                      <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">STORE CREDIT VOUCHER</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      {printableRecord.CreditNoteStatus || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="text-center py-2">
                    <span className="text-[11px] text-indigo-300 font-medium">ভাউচারের মোট মূল্যমান:</span>
                    <div className="text-3xl font-black text-amber-300 font-mono tracking-tight my-1">
                      {currencySymbol}{Number(printableRecord.TotalRefundAmount).toFixed(2)}
                    </div>
                    <p className="text-xs text-indigo-200">
                      গ্রাহক: <strong className="text-white">{printableRecord.CustomerName}</strong> ({printableRecord.CustomerPhone || 'N/A'})
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">ভাউচার কোড (চেকআউটে দেখান):</span>
                    <span className="font-mono text-xl font-black tracking-widest text-white selection:bg-amber-400 selection:text-slate-900">
                      {printableRecord.CreditNoteCode}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[10px] text-indigo-300 pt-3 border-t border-indigo-500/30">
                    <span>ইস্যুর তারিখ: {new Date(printableRecord.ReturnDate).toLocaleDateString('bn-BD')}</span>
                    <span>মেয়াদ শেষ: {printableRecord.CreditNoteExpiry || '৬০ দিন'}</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : activeTab === 'new' ? (
          /* ট্যাব ১: নতুন রিটার্ন ও বিনিময় ফর্ম */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* ধাপ ১: মূল ইনভয়েস সার্চ */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                ধাপ ১: বিক্রয় মেমো / ইনভয়েস নম্বর বা গ্রাহকের ফোন দিয়ে সার্চ করুন:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="যেমন: INV-2610-1234 অথবা গ্রাহকের ফোন নম্বর বা নাম..."
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* অটো-সাজেশন রেজাল্ট */}
              {!selectedInvoice && invoiceQuery.trim() && (
                <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-md divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {filteredInvoices.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      কোনো ইনভয়েস খুঁজে পাওয়া যায়নি। নম্বরটি সঠিকভাবে টাইপ করুন।
                    </div>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const invId = inv.InvoiceNo || inv.invoiceNo || inv.saleId || `INV-${idx}`;
                      const total = Number(inv.GrandTotal || inv.grandTotal || inv.totalAmount || 0);
                      const date = inv.Timestamp || inv.Date || inv.date || '';
                      return (
                        <button
                          key={invId}
                          type="button"
                          onClick={() => handleSelectInvoice(inv)}
                          className="w-full p-2.5 text-left hover:bg-indigo-50/80 flex items-center justify-between transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center space-x-2.5">
                            <Receipt className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 font-mono block">{invId}</span>
                              <span className="text-[11px] text-slate-500">
                                {inv.CustomerName || 'Walk-in'} • {inv.CustomerPhone || 'N/A'} • {date ? new Date(date).toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {currencySymbol}{total.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-indigo-600 block font-bold">সিলেক্ট করুন ➔</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* নির্বাচিত ইনভয়েস সামারি বার */}
              {selectedInvoice && (
                <div className="mt-3 p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-indigo-950 font-mono">
                        ইনভয়েস: {selectedInvoice.InvoiceNo || selectedInvoice.invoiceNo || selectedInvoice.saleId}
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        গ্রাহক: {selectedInvoice.CustomerName || 'Walk-in'} ({selectedInvoice.CustomerPhone || 'N/A'}) • বিক্রয় মোট: {currencySymbol}{Number(selectedInvoice.GrandTotal || selectedInvoice.grandTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedInvoice(null); setReturnItemsState({}); }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 bg-white rounded-lg border border-rose-200"
                  >
                    অন্য ইনভয়েস বাছুন
                  </button>
                </div>
              )}
            </div>

            {/* ধাপ ২: আইটেম নির্বাচন ও রিটার্ন কোয়ান্টিটি */}
            {selectedInvoice && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    ধাপ ২: যে পণ্যগুলো রিটার্ন নেওয়া হবে তার পরিমাণ ও অবস্থা চিহ্নিত করুন:
                  </h3>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    মোট পণ্য: {invoiceItems.length} প্রকার
                  </span>
                </div>

                <div className="space-y-2.5">
                  {invoiceItems.map((item, idx) => {
                    const key = `${item.productId || idx}_${item.variantId || 'main'}`;
                    const state = returnItemsState[key] || {
                      quantity: 0,
                      maxQuantity: Number(item.quantity) || 1,
                      condition: 'Resellable',
                      reason: 'Customer preference',
                      returnPrice: Number(item.sellingPrice) || 0
                    };
                    const isSelected = state.quantity > 0;

                    return (
                      <div
                        key={key}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-white border-indigo-300 shadow-md ring-2 ring-indigo-500/10'
                            : 'bg-slate-50/70 border-slate-200 opacity-90'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* পণ্যের বিবরণ */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {item.productName}
                              {item.variantName && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200">
                                  {item.variantName}
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                              <span>মূল বিক্রয় দর: <strong className="text-slate-800 font-mono">{currencySymbol}{Number(item.sellingPrice).toFixed(2)}</strong></span>
                              <span>বিক্রয় পরিমাণ: <strong className="text-slate-800">{item.quantity} {item.unit || 'Pcs'}</strong></span>
                            </div>
                          </div>

                          {/* পরিমাণ কন্ট্রোল */}
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-600">ফেরতের পরিমাণ:</span>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(key, state.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 flex items-center justify-center text-sm"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={state.maxQuantity}
                                value={state.quantity}
                                onChange={(e) => handleQtyChange(key, e.target.value)}
                                className="w-12 py-1 text-center font-bold text-xs border border-slate-300 rounded-lg bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(key, state.quantity + 1)}
                                disabled={state.quantity >= state.maxQuantity}
                                className="w-7 h-7 rounded-lg bg-indigo-100 hover:bg-indigo-200 font-bold text-indigo-700 flex items-center justify-center text-sm disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400">/ সর্বোচ্চ {state.maxQuantity}</span>
                          </div>
                        </div>

                        {/* যদি আইটেমটি রিটার্নের জন্য সিলেক্ট করা হয় */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                            {/* পণ্যের কন্ডিশন / অবস্থা */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                পণ্যের অবস্থা (ইনভেন্টরি প্রভাব):
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleConditionChange(key, 'Resellable')}
                                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                                    state.condition === 'Resellable'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>ভালো / রিস্টক হবে</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConditionChange(key, 'Damaged')}
                                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                                    state.condition === 'Damaged'
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>ত্রুটিযুক্ত / নষ্ট</span>
                                </button>
                              </div>
                            </div>

                            {/* আইটেমের কারণ */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                রিটার্নের কারণ:
                              </label>
                              <select
                                value={state.reason}
                                onChange={(e) => handleItemReasonChange(key, e.target.value)}
                                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="Size mismatch / ফিটিং সমস্যা">সাইজ / ফিটিং সমস্যা</option>
                                <option value="Color or style preference / পছন্দ পরিবর্তন">রং বা ডিজাইন অপছন্দ</option>
                                <option value="Defective fabric / কাপড়ে ত্রুটি">কাপড়ে ত্রুটি বা দাগ</option>
                                <option value="Customer mind changed / গ্রাহকের সিদ্ধান্ত বদল">গ্রাহকের সিদ্ধান্ত বদল</option>
                                <option value="Wrong product delivered / ভুল পণ্য ডেলিভারি">ভুল পণ্য নেওয়া হয়েছিল</option>
                                <option value="Other / অন্যান্য">অন্যান্য কারণ</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ধাপ ৩: রিফান্ড বা সেটেলমেন্ট মেথড */}
                {returnSummary.totalItems > 0 && (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
                          ধাপ ৩: রিফান্ড বা ক্রেডিট সেটেলমেন্ট
                        </span>
                        <h3 className="text-base font-bold text-white">
                          মোট ফেরত পণ্য: <span className="text-amber-300 font-mono">{returnSummary.totalItems} পিস</span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-indigo-200 block">মোট রিফান্ড পরিমাণ:</span>
                        <span className="text-2xl font-black text-amber-400 font-mono">
                          {currencySymbol}{returnSummary.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* রিফান্ড মেথড অপশনস */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      
                      {/* অপশন ১: স্টোর ক্রেডিট নোট (রিকমেন্ডেড) */}
                      <button
                        type="button"
                        onClick={() => setRefundMethod('StoreCredit')}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          refundMethod === 'StoreCredit'
                            ? 'bg-indigo-600/90 border-indigo-400 ring-2 ring-indigo-400/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Ticket className="w-4 h-4 text-amber-300" />
                          <span className="text-xs font-bold text-white">স্টোর ক্রেডিট ভাউচার</span>
                        </div>
                        <p className="text-[10px] text-indigo-200">
                          গ্রাহকের জন্য একটি এসসিএন কোড তৈরি হবে, যা পরবর্তী কেনাকাটায় ব্যবহার করা যাবে।
                        </p>
                      </button>

                      {/* অপশন ২: নগদ টাকা ফেরত (Cash Refund) */}
                      <button
                        type="button"
                        onClick={() => setRefundMethod('Cash')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          refundMethod === 'Cash'
                            ? 'bg-rose-600/90 border-rose-400 ring-2 ring-rose-400/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Banknote className="w-4 h-4 text-rose-300" />
                          <span className="text-xs font-bold text-white">নগদ ক্যাশ ফেরত</span>
                        </div>
                        <p className="text-[10px] text-rose-200">
                          দোকানের ক্যাশ কাউন্টার ড্রয়ার থেকে গ্রাহককে নগদ টাকা প্রদান করা হবে।
                        </p>
                      </button>

                      {/* অপশন ৩: বাকির খাতা থেকে সমন্বয় (Deduct Due) */}
                      <button
                        type="button"
                        onClick={() => setRefundMethod('DeductDue')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          refundMethod === 'DeductDue'
                            ? 'bg-emerald-600/90 border-emerald-400 ring-2 ring-emerald-400/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Coins className="w-4 h-4 text-emerald-300" />
                          <span className="text-xs font-bold text-white">বকেয়া লেজার সমন্বয়</span>
                        </div>
                        <p className="text-[10px] text-emerald-200">
                          গ্রাহকের বর্তমান বকেয়া (৳{customerCurrentDue.toLocaleString('en-IN')}) থেকে কর্তন হবে।
                        </p>
                      </button>
                    </div>

                    {/* স্টোর ক্রেডিট মেয়াদ সিলেক্টর */}
                    {refundMethod === 'StoreCredit' && (
                      <div className="flex items-center space-x-3 text-xs bg-white/10 p-2.5 rounded-xl border border-white/10">
                        <span className="text-indigo-200">ভাউচারের মেয়াদকাল:</span>
                        <div className="flex space-x-2">
                          {[30, 60, 90, 180].map((days) => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => setValidityDays(days)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                validityDays === days
                                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                              }`}
                            >
                              {days} দিন
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* অতিরিক্ত নোট */}
                    <div>
                      <input
                        type="text"
                        placeholder="রিটার্ন সম্পর্কে অতিরিক্ত কোনো মন্তব্য / নোট (ঐচ্ছিক)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>

                    {/* অ্যাকশন বাটনস */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitReturn(true)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                      >
                        <Printer className="w-4 h-4" />
                        <span>প্রসেস ও স্লিপ প্রিন্ট করুন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSubmitReturn(false)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>শুধুমাত্র রিটার্ন সম্পন্ন করুন</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>
        ) : (
          /* ট্যাব ২: রিটার্ন ও ভাউচার হিস্ট্রি */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            
            {/* সার্চ ও ফিল্টার বার */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="রিটার্ন আইডি, ইনভয়েস বা ভাউচার কোড খুঁজুন..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'STORECREDIT', 'CASH', 'DEDUCTDUE'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHistoryMethodFilter(filter)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      historyMethodFilter === filter
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {filter === 'ALL' && 'সকল মেথড'}
                    {filter === 'STORECREDIT' && 'স্টোর ক্রেডিট'}
                    {filter === 'CASH' && 'ক্যাশ রিফান্ড'}
                    {filter === 'DEDUCTDUE' && 'বকেয়া সমন্বয়'}
                  </button>
                ))}
              </div>
            </div>

            {/* তালিকা */}
            {filteredReturnsHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RotateCcw className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">কোনো রিটার্ন রেকর্ড পাওয়া যায়নি</p>
                <p className="text-xs">নতুন কোনো বিক্রয় রিটার্ন নেওয়া হলে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReturnsHistory.map((ret, idx) => {
                  const items = Array.isArray(ret.Items) ? ret.Items : (typeof ret.Items === 'string' ? JSON.parse(ret.Items || '[]') : []);
                  const isCreditActive = ret.RefundMethod === 'StoreCredit' && ret.CreditNoteStatus === 'Active';

                  return (
                    <div
                      key={ret.ReturnID || idx}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                            {ret.ReturnID}
                          </span>
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            ইনভয়েস: {ret.InvoiceNo}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {new Date(ret.ReturnDate || ret.Timestamp).toLocaleDateString('bn-BD')}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600">
                          গ্রাহক: <strong className="text-slate-800">{ret.CustomerName}</strong> ({ret.CustomerPhone || 'N/A'})
                          • আইটেম: <strong className="text-slate-800">{ret.TotalItems || items.length} প্রকার</strong>
                        </div>

                        {/* ক্রেডিট নোট কোড ব্যাজ */}
                        {ret.CreditNoteCode && (
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[10px] font-bold text-slate-400">ভাউচার কোড:</span>
                            <span className="font-mono text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {ret.CreditNoteCode}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              ret.CreditNoteStatus === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ret.CreditNoteStatus === 'Redeemed'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {ret.CreditNoteStatus === 'Active' ? 'সক্রিয় (Active)' : ret.CreditNoteStatus === 'Redeemed' ? 'ব্যবহৃত (Redeemed)' : ret.CreditNoteStatus}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">রিফান্ড পরিমাণ:</span>
                          <span className="text-base font-black font-mono text-rose-600">
                            {currencySymbol}{Number(ret.TotalRefundAmount).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {isCreditActive && (
                            <button
                              type="button"
                              onClick={() => handleQuickRedeem(ret.CreditNoteCode)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-2xs transition-all"
                            >
                              রিডিম করুন
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPrintableRecord(ret);
                              setPrintDocType('memo');
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 transition-colors"
                            title="স্লিপ রি-প্রিন্ট"
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

