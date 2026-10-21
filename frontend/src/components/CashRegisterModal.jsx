import React, { useState, useMemo } from 'react';
import {
  X,
  Coins,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Share2,
  Lock,
  Unlock,
  FileText,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function CashRegisterModal({
  isOpen = false,
  onClose,
  embedded = false,
  activeRegister = null,
  cashRegisters = [],
  salesHistory = [],
  customerLedger = [],
  supplierLedger = [],
  expenses = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  onOpenRegister,
  onCloseRegister
}) {
  const [activeTab, setActiveTab] = useState(activeRegister ? 'live' : 'open'); // 'live' | 'open' | 'history'
  
  // নতুন রেজিস্টার ওপেন ফর্ম স্টেট
  const [openingBalance, setOpeningBalance] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [isOpenSubmitting, setIsOpenSubmitting] = useState(false);

  // রেজিস্টার ক্লোজ ফর্ম স্টেট
  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [isCloseSubmitting, setIsCloseSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // সক্রিয় রেজিস্টার সেশনের রিয়েল-টাইম ক্যাশ ক্যালকুলেশন
  const liveSessionMetrics = useMemo(() => {
    if (!activeRegister || activeRegister.Status !== 'Open') {
      return {
        opening: 0,
        cashSales: 0,
        cashIn: 0,
        cashOutExpenses: 0,
        cashOutSuppliers: 0,
        totalCashOut: 0,
        expectedCash: 0
      };
    }

    const sessionStart = new Date(activeRegister.OpeningDate || activeRegister.Timestamp).getTime();
    const opening = Number(activeRegister.OpeningBalance) || 0;

    // ১. ক্যাশ সেলস (ক্যাশ পেমেন্ট বা স্প্লিট ক্যাশ)
    let cashSales = 0;
    (Array.isArray(salesHistory) ? salesHistory : []).forEach(sale => {
      const saleTime = new Date(sale.Timestamp || sale.Date || sale.CreatedAt).getTime();
      if (saleTime >= sessionStart) {
        if (sale.SplitPayments && sale.SplitPayments.Cash !== undefined) {
          cashSales += Number(sale.SplitPayments.Cash) || 0;
        } else if (String(sale.PaymentMethod || '').toLowerCase() === 'cash') {
          cashSales += Number(sale.FinalTotal !== undefined ? sale.FinalTotal : sale.TotalAmount) || 0;
        }
      }
    });

    // ২. কাস্টমার বকেয়া কালেকশন (নগদ ক্যাশে আসা)
    let cashIn = 0;
    (Array.isArray(customerLedger) ? customerLedger : []).forEach(entry => {
      const entryTime = new Date(entry.Timestamp).getTime();
      if (entryTime >= sessionStart && entry.EntryType === 'Payment' && String(entry.PaymentMethod || '').toLowerCase() === 'cash') {
        cashIn += Number(entry.Debit) || 0;
      }
    });

    // ৩. দৈনন্দিন ক্যাশ খরচ (Expenses)
    let cashOutExpenses = 0;
    (Array.isArray(expenses) ? expenses : []).forEach(exp => {
      const expTime = new Date(exp.Timestamp || exp.Date).getTime();
      if (expTime >= sessionStart && String(exp.PaymentMethod || '').toLowerCase() === 'cash') {
        cashOutExpenses += Number(exp.Amount) || 0;
      }
    });

    // ৪. সাপ্লায়ারদের দেওয়া নগদ পেমেন্ট (Supplier Ledger)
    let cashOutSuppliers = 0;
    (Array.isArray(supplierLedger) ? supplierLedger : []).forEach(supEntry => {
      const supTime = new Date(supEntry.Timestamp).getTime();
      if (supTime >= sessionStart && supEntry.EntryType === 'Payment' && String(supEntry.PaymentMethod || '').toLowerCase() === 'cash') {
        cashOutSuppliers += Number(supEntry.Debit) || 0;
      }
    });

    const totalCashOut = cashOutExpenses + cashOutSuppliers;
    const expectedCash = opening + cashSales + cashIn - totalCashOut;

    return {
      opening,
      cashSales,
      cashIn,
      cashOutExpenses,
      cashOutSuppliers,
      totalCashOut,
      expectedCash
    };
  }, [activeRegister, salesHistory, customerLedger, expenses, supplierLedger]);

  // ওপেন হ্যান্ডলার
  const handleOpenRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsOpenSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        openingBalance: Number(openingBalance) || 0,
        openedBy: activeUser?.FullName || activeUser?.UserName || 'Admin',
        notes: openNotes.trim()
      };

      if (typeof onOpenRegister === 'function') {
        await onOpenRegister(payload);
      }

      setStatusMessage({ type: 'success', text: 'ক্যাশ রেজিস্টার সফলভাবে ওপেন হয়েছে!' });
      setOpeningBalance('');
      setOpenNotes('');
      setActiveTab('live');
    } catch (err) {
      setStatusMessage({ type: 'error', text: `রেজিস্টার খুলতে ত্রুটি: ${err.message}` });
    } finally {
      setIsOpenSubmitting(false);
    }
  };

  // ক্লোজ হ্যান্ডলার
  const handleCloseRegisterSubmit = async (e) => {
    e.preventDefault();
    if (actualCashInput === '') {
      setStatusMessage({ type: 'error', text: 'অনুগ্রহ করে ড্রয়ারে বাস্তবে থাকা ক্যাশ টাকার পরিমাণ লিখুন।' });
      return;
    }

    setIsCloseSubmitting(true);
    setStatusMessage(null);

    try {
      const numActual = Number(actualCashInput) || 0;
      const numExpected = liveSessionMetrics.expectedCash;
      const diff = numActual - numExpected;

      const payload = {
        registerId: activeRegister?.RegisterID,
        openingBalance: liveSessionMetrics.opening,
        cashSales: liveSessionMetrics.cashSales,
        cashIn: liveSessionMetrics.cashIn,
        cashOut: liveSessionMetrics.totalCashOut,
        expectedCash: numExpected,
        actualCash: numActual,
        difference: diff,
        closedBy: activeUser?.FullName || activeUser?.UserName || 'Admin',
        notes: closeNotes.trim()
      };

      if (typeof onCloseRegister === 'function') {
        await onCloseRegister(payload);
      }

      setStatusMessage({
        type: 'success',
        text: `ক্যাশ রেজিস্টার সফলভাবে ক্লোজ হয়েছে! ${diff === 0 ? 'হিসাব সম্পূর্ণ মিলেছে।' : (diff > 0 ? `৳${diff} অতিরিক্ত ক্যাশ রয়েছে।` : `৳${Math.abs(diff)} ঘাটতি রয়েছে।`)}`
      });

      setActualCashInput('');
      setCloseNotes('');
      setActiveTab('history');
    } catch (err) {
      setStatusMessage({ type: 'error', text: `রেজিস্টার ক্লোজ করতে ত্রুটি: ${err.message}` });
    } finally {
      setIsCloseSubmitting(false);
    }
  };

  // WhatsApp EOD সামারি জেনারেটর
  const handleSendWhatsAppReport = (session) => {
    const s = session || activeRegister;
    if (!s) return;

    const storeName = storeSettings.StoreName || 'আমার সুপার শপ';
    const dateStr = new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    const cashierName = s.ClosedBy || activeUser?.FullName || 'ক্যাশিয়ার';
    const openCash = (Number(s.OpeningBalance) || 0).toLocaleString('en-IN');
    const sales = (Number(s.CashSales !== undefined ? s.CashSales : liveSessionMetrics.cashSales) || 0).toLocaleString('en-IN');
    const cashIn = (Number(s.CashIn !== undefined ? s.CashIn : liveSessionMetrics.cashIn) || 0).toLocaleString('en-IN');
    const cashOut = (Number(s.CashOut !== undefined ? s.CashOut : liveSessionMetrics.totalCashOut) || 0).toLocaleString('en-IN');
    const expected = (Number(s.ExpectedCash !== undefined ? s.ExpectedCash : liveSessionMetrics.expectedCash) || 0).toLocaleString('en-IN');
    const actual = (Number(s.ActualCash) || 0).toLocaleString('en-IN');
    const diff = Number(s.Difference) || 0;

    let diffText = '✅ হিসাব নিখুঁত মিলেছে (০)';
    if (diff > 0) diffText = `➕ অতিরিক্ত: ৳${diff.toLocaleString('en-IN')}`;
    if (diff < 0) diffText = `⚠️ ঘাটতি: ৳${Math.abs(diff).toLocaleString('en-IN')}`;

    const message = 
`📊 *দৈনিক ক্যাশ ড্রয়ার ও ইওডি রিপোর্ট (EOD Summary)*
🏪 *দোকান:* ${storeName}
📅 *তারিখ:* ${dateStr}
👤 *দায়িত্বপ্রাপ্ত:* ${cashierName}
----------------------------------------
💰 *সকালের ওপেনিং ক্যাশ:* ৳${openCash}
🛒 *আজকের নগদ বিক্রি:* ৳${sales}
📥 *বকেয়া কালেকশন (নগদ):* ৳${cashIn}
📤 *নগদ খরচ ও সাপ্লায়ার পেমেন্ট:* ৳${cashOut}
----------------------------------------
🎯 *হিসাবমতে ড্রয়ারে ক্যাশ:* ৳${expected}
💵 *বাস্তবে গোনা ক্যাশ:* ৳${actual}
⚖️ *পার্থক্য (Discrepancy):* ${diffText}
----------------------------------------
_Google Sheets Enterprise POS দ্বারা স্বয়ংক্রিয়ভাবে জেনারেটকৃত_`;

    const ownerPhone = storeSettings.Phone || '';
    const cleanPhone = ownerPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone;

    const url = `https://api.whatsapp.com/send?${formattedPhone ? `phone=${formattedPhone}&` : ''}text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // থার্মাল ইওডি রিসিট প্রিন্ট
  const handlePrintThermalSlip = (session) => {
    const s = session || activeRegister;
    if (!s) return;

    const storeName = storeSettings.StoreName || 'আমার সুপার শপ';
    const storeAddress = storeSettings.Address || '';
    const storePhone = storeSettings.Phone || '';
    const dateStr = new Date().toLocaleString('bn-BD');
    const cashierName = s.ClosedBy || activeUser?.FullName || 'ক্যাশিয়ার';
    const openCash = Number(s.OpeningBalance || 0);
    const sales = Number(s.CashSales !== undefined ? s.CashSales : liveSessionMetrics.cashSales) || 0;
    const cashIn = Number(s.CashIn !== undefined ? s.CashIn : liveSessionMetrics.cashIn) || 0;
    const cashOut = Number(s.CashOut !== undefined ? s.CashOut : liveSessionMetrics.totalCashOut) || 0;
    const expected = Number(s.ExpectedCash !== undefined ? s.ExpectedCash : liveSessionMetrics.expectedCash) || 0;
    const actual = Number(s.ActualCash || 0);
    const diff = Number(s.Difference || 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EOD Cash Slip - ${s.RegisterID || 'SESSION'}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: monospace, sans-serif;
              width: 72mm;
              margin: 0 auto;
              padding: 10px 4px;
              color: #000;
              font-size: 12px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .title { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <div class="title">${storeName}</div>
            <div>${storeAddress}</div>
            <div>মোবাইল: ${storePhone}</div>
            <div class="line"></div>
            <div class="bold">দৈনিক ক্যাশ ক্লোজিং রিপোর্ট (EOD)</div>
            <div style="font-size: 10px;">${dateStr}</div>
            <div style="font-size: 10px;">সেশন: ${s.RegisterID || 'ACTIVE'}</div>
            <div style="font-size: 10px;">স্টাফ: ${cashierName}</div>
          </div>
          <div class="line"></div>
          <div class="row"><span>ওপেনিং ক্যাশ:</span><span>৳${openCash.toLocaleString('en-IN')}</span></div>
          <div class="row"><span>ক্যাশ বিক্রয় (+):</span><span>৳${sales.toLocaleString('en-IN')}</span></div>
          <div class="row"><span>বকেয়া কালেকশন (+):</span><span>৳${cashIn.toLocaleString('en-IN')}</span></div>
          <div class="row"><span>খরচ ও সাপ্লায়ার (-):</span><span>৳${cashOut.toLocaleString('en-IN')}</span></div>
          <div class="line"></div>
          <div class="row bold"><span>হিসাবমতে ক্যাশ:</span><span>৳${expected.toLocaleString('en-IN')}</span></div>
          <div class="row bold"><span>বাস্তবে ক্যাশ:</span><span>৳${actual.toLocaleString('en-IN')}</span></div>
          <div class="line"></div>
          <div class="row bold" style="font-size: 13px;">
            <span>পার্থক্য (Diff):</span>
            <span>${diff === 0 ? '০ (মিলেছে)' : (diff > 0 ? `+৳${diff}` : `-৳${Math.abs(diff)}`)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="font-size: 10px; margin-top: 15px;">
            ক্যাশিয়ারের স্বাক্ষর: ___________________
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen && !embedded) return null;

  const isRegisterOpen = activeRegister && activeRegister.Status === 'Open';

  return (
    <div
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[100] animate-fadeIn"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white w-full flex-1 min-h-[calc(100vh-6.5rem)] rounded-2xl shadow-sm flex flex-col overflow-hidden border border-slate-200/90" : "bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100"}>
        
        {/* মোডাল হেডার */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Coins className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight">দৈনিক ক্যাশ ড্রয়ার ও EOD ক্লোজিং</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  isRegisterOpen ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-slate-500/20 text-slate-300 border-slate-400/30'
                }`}>
                  {isRegisterOpen ? 'সক্রিয় সেশন (Open)' : 'রেজিস্টার বন্ধ (Closed)'}
                </span>
              </div>
              <p className="text-xs text-emerald-200">সকালের ক্যাশ ফ্লোট, রিয়েল-টাইম ক্যাশ ট্র্যাকিং ও দিন শেষে নিখুঁত ক্যাশ মেলানো</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-all cursor-pointer flex items-center space-x-1 ${
              embedded
                ? 'px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 shadow-xs'
                : 'w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white justify-center'
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

        {/* ট্যাব নেভিগেশন */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white shrink-0">
          {isRegisterOpen ? (
            <button
              onClick={() => setActiveTab('live')}
              className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'live'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>লাইভ ড্রয়ার ট্র্যাকিং ও ক্লোজিং</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('open')}
              className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'open'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>সকালের রেজিস্টার ওপেন করুন</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>পূর্ববর্তী ক্লোজিং হিস্ট্রি ({cashRegisters.length})</span>
          </button>
        </div>

        {/* বডি কন্টেন্ট */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">

          {statusMessage && (
            <div className={`p-3.5 rounded-xl mb-4 text-xs sm:text-sm flex items-center space-x-2 ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* দৃশ্য ১: রেজিস্টার এখনও ওপেন করা হয়নি */}
          {!isRegisterOpen && activeTab === 'open' && (
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Unlock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">সকালের শিফট শুরু (রেজিস্টার ওপেন)</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                দোকান খোলার সময় ড্রয়ারে ভাঙতি/প্রারম্ভিক ক্যাশ হিসেবে কত টাকা রাখা হয়েছে তা ইনপুট দিয়ে শিফট শুরু করুন।
              </p>

              <form onSubmit={handleOpenRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    প্রারম্ভিক ক্যাশ ফ্লোট (Opening Cash in {currencySymbol}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="যেমন: 2000"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 text-base font-bold text-emerald-700 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  {/* কুইক প্রিসেট বাটন */}
                  <div className="flex gap-2 mt-2">
                    {[500, 1000, 2000, 5000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOpeningBalance(String(val))}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        {currencySymbol}{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    মন্তব্য বা নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: সকালের ড্রয়ারে ভাঙতির জন্য ৫০ ও ১০০ টাকার নোট..."
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isOpenSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isOpenSubmitting ? 'ওপেন করা হচ্ছে...' : 'ক্যাশ রেজিস্টার সেশন চালু করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* দৃশ্য ২: রেজিস্টার সক্রিয় রয়েছে (লাইভ ট্র্যাকিং ও দিন শেষে ক্লোজিং) */}
          {isRegisterOpen && activeTab === 'live' && (
            <div className="space-y-6">
              
              {/* লাইভ মেট্রিক কার্ডস */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-medium text-slate-500">১. প্রারম্ভিক ক্যাশ</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {currencySymbol}{liveSessionMetrics.opening.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">সকালের ফ্লোট</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-medium text-emerald-600">২. নগদ বিক্রয় (+)</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">
                    +{currencySymbol}{liveSessionMetrics.cashSales.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">ক্যাশ সেলস যোগ</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-medium text-rose-600">৩. ক্যাশ খরচ ও পেইড (-)</p>
                  <p className="text-lg font-bold text-rose-700 mt-1">
                    -{currencySymbol}{liveSessionMetrics.totalCashOut.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">খরচ ও সাপ্লায়ার</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-md">
                  <p className="text-xs font-medium text-emerald-100">হিসাবমতে ড্রয়ারে ক্যাশ</p>
                  <p className="text-xl font-bold mt-1">
                    {currencySymbol}{liveSessionMetrics.expectedCash.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-emerald-200 mt-0.5">প্রত্যাশিত মোট নগদ</p>
                </div>
              </div>

              {/* দিন শেষে ক্যাশ ড্রয়ার ক্লোজিং ফর্ম */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
                <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
                  <Lock className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-800">দিন শেষে ড্রয়ার বন্ধ করুন (EOD Closing)</h3>
                </div>

                <form onSubmit={handleCloseRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ড্রয়ারের ক্যাশ গুনে মোট কত টাকা পাওয়া গেল? (Actual Physical Cash) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder="যেমন: 7500"
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 text-base font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* গরমিল ডিটেকশন লাইভ ব্যানার */}
                  {actualCashInput !== '' && (
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
                      Number(actualCashInput) === liveSessionMetrics.expectedCash
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : Number(actualCashInput) < liveSessionMetrics.expectedCash
                        ? 'bg-rose-50 text-rose-900 border-rose-200'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {Number(actualCashInput) === liveSessionMetrics.expectedCash ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : Number(actualCashInput) < liveSessionMetrics.expectedCash ? (
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold">
                            {Number(actualCashInput) === liveSessionMetrics.expectedCash
                              ? 'হিসাব নিখুঁত মিলেছে!'
                              : Number(actualCashInput) < liveSessionMetrics.expectedCash
                              ? `ক্যাশ ঘাটতি (Shortage): ${currencySymbol}${Math.abs(Number(actualCashInput) - liveSessionMetrics.expectedCash).toLocaleString('en-IN')}`
                              : `অতিরিক্ত ক্যাশ (Excess): ${currencySymbol}${(Number(actualCashInput) - liveSessionMetrics.expectedCash).toLocaleString('en-IN')}`}
                          </p>
                          <p className="text-[11px] opacity-80">
                            হিসাবমতে থাকার কথা: {currencySymbol}{liveSessionMetrics.expectedCash.toLocaleString('en-IN')} | বাস্তবে গুনেছেন: {currencySymbol}{Number(actualCashInput).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ক্লোজিং নোট বা গরমিলের কারণ (যদি থাকে)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="যেমন: কোনো ক্যাশ ঘাটতি থাকলে তার ব্যাখ্যা..."
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReport({ ...activeRegister, ActualCash: actualCashInput || liveSessionMetrics.expectedCash })}
                      className="flex-1 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600" />
                      <span>মালিককে WhatsApp এ পাঠান</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isCloseSubmitting}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isCloseSubmitting ? 'ক্লোজ হচ্ছে...' : 'ক্যাশ ড্রয়ার ক্লোজ করুন'}</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* দৃশ্য ৩: পূর্ববর্তী ক্লোজিং হিস্ট্রি */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {cashRegisters.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">কোনো পূর্ববর্তী ক্লোজিং রেকর্ড নেই</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    দিন শেষে ক্যাশ রেজিস্টার ক্লোজ করলে তার বিস্তারিত স্টেটমেন্ট এখানে সংরক্ষিত থাকবে।
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-3 px-4">তারিখ ও সময়</th>
                          <th className="py-3 px-4">স্টাফ</th>
                          <th className="py-3 px-4 text-right">ওপেনিং ক্যাশ</th>
                          <th className="py-3 px-4 text-right">ক্যাশ বিক্রি</th>
                          <th className="py-3 px-4 text-right">প্রত্যাশিত ক্যাশ</th>
                          <th className="py-3 px-4 text-right">বাস্তব ক্যাশ</th>
                          <th className="py-3 px-4 text-center">পার্থক্য</th>
                          <th className="py-3 px-4 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cashRegisters.map((reg) => {
                          const diff = Number(reg.Difference) || 0;
                          return (
                            <tr key={reg.RegisterID || Math.random()} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <p className="font-mono text-slate-700">
                                  {reg.ClosingDate ? new Date(reg.ClosingDate).toLocaleDateString('bn-BD') : reg.OpeningDate}
                                </p>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  reg.Status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {reg.Status === 'Open' ? 'সক্রিয়' : 'ক্লোজড'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                                {reg.ClosedBy || 'Admin'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                                {currencySymbol}{(Number(reg.OpeningBalance) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium whitespace-nowrap">
                                {currencySymbol}{(Number(reg.CashSales) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                                {currencySymbol}{(Number(reg.ExpectedCash) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {currencySymbol}{(Number(reg.ActualCash) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {diff === 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                    মিলেছে (০)
                                  </span>
                                ) : diff > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    +৳{diff.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                    -৳{Math.abs(diff).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => handlePrintThermalSlip(reg)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                    title="থার্মাল স্লিপ প্রিন্ট"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSendWhatsAppReport(reg)}
                                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                                    title="WhatsApp এ পাঠান"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* মোডাল ফুটার */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <p>ক্যাশ ড্রয়ারের ব্যালেন্স নিয়মিত ক্লোজ করলে আর্থিক স্বচ্ছতা নিশ্চিত থাকে।</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

