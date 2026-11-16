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
  AlertCircle,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Calculator,
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  Coffee,
  Building2,
  Eye,
  RefreshCw
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
  tailoringOrders = [],
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
  const [showOpenDenominations, setShowOpenDenominations] = useState(false);
  const [openDenoms, setOpenDenoms] = useState({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 });

  // রেজিস্টার ক্লোজ ফর্ম স্টেট
  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [isCloseSubmitting, setIsCloseSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showCloseDenominations, setShowCloseDenominations] = useState(false);
  const [closeDenoms, setCloseDenoms] = useState({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 });
  const [showLiveBreakdown, setShowLiveBreakdown] = useState(false);

  // থার্মাল ইওডি রিসিট প্রিভিউ স্টেট (ইন-অ্যাপ প্রিভিউ ও প্রিন্ট)
  const [previewSlipSession, setPreviewSlipSession] = useState(null);

  // হিস্ট্রি সার্চ ও ফিল্টার স্টেট
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('ALL'); // 'ALL' | 'THIS_MONTH' | '7_DAYS'

  const DENOMINATION_LIST = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

  // ওপেন ডেনোমিনেশন চেঞ্জ হ্যান্ডলার
  const handleOpenDenomChange = (val, count) => {
    const newDenoms = { ...openDenoms, [val]: Math.max(0, parseInt(count) || 0) };
    setOpenDenoms(newDenoms);
    const total = Object.entries(newDenoms).reduce((sum, [d, c]) => sum + (Number(d) * Number(c)), 0);
    setOpeningBalance(total > 0 ? String(total) : '');
  };

  // ক্লোজ ডেনোমিনেশন চেঞ্জ হ্যান্ডলার
  const handleCloseDenomChange = (val, count) => {
    const newDenoms = { ...closeDenoms, [val]: Math.max(0, parseInt(count) || 0) };
    setCloseDenoms(newDenoms);
    const total = Object.entries(newDenoms).reduce((sum, [d, c]) => sum + (Number(d) * Number(c)), 0);
    setActualCashInput(total > 0 ? String(total) : '');
  };

  // সক্রিয় রেজিস্টার সেশনের রিয়েল-টাইম ক্যাশ ক্যালকুলেশন
  const liveSessionMetrics = useMemo(() => {
    if (!activeRegister || activeRegister.Status !== 'Open') {
      return {
        opening: 0,
        cashSales: 0,
        cashSalesCount: 0,
        cashIn: 0,
        cashTailoring: 0,
        cashTailoringCount: 0,
        dueCollectionCount: 0,
        cashOutExpenses: 0,
        expensesCount: 0,
        cashOutSuppliers: 0,
        suppliersCount: 0,
        totalCashOut: 0,
        expectedCash: 0,
        sessionStartTime: null
      };
    }

    const sessionStart = new Date(activeRegister.OpeningDate || activeRegister.Timestamp).getTime();
    const opening = Number(activeRegister.OpeningBalance) || 0;

    // ১. ক্যাশ সেলস (ক্যাশ পেমেন্ট বা স্প্লিট ক্যাশ)
    let cashSales = 0;
    let cashSalesCount = 0;
    (Array.isArray(salesHistory) ? salesHistory : []).forEach(sale => {
      const timeVal = sale.Timestamp || sale.timestamp || sale.Date || sale.date || sale.CreatedAt;
      if (!timeVal) return;
      const saleTime = new Date(timeVal).getTime();
      if (isNaN(saleTime) || saleTime < sessionStart) return;

      const split = sale.splitPayments || sale.SplitPayments;
      const method = String(sale.paymentMethod || sale.PaymentMethod || '').toLowerCase();

      if (split && (split.Cash !== undefined || split.cash !== undefined)) {
        const val = Number(split.Cash !== undefined ? split.Cash : split.cash) || 0;
        if (val > 0) {
          cashSales += val;
          cashSalesCount++;
        }
      } else if (method === 'cash') {
        const amt = sale.paidAmount !== undefined
          ? Number(sale.paidAmount)
          : Number(sale.grandTotal !== undefined ? sale.grandTotal : (sale.FinalTotal !== undefined ? sale.FinalTotal : (sale.TotalAmount || 0)));
        if (amt > 0) {
          cashSales += amt;
          cashSalesCount++;
        }
      }
    });

    // ১.১ টেইলারিং নগদ অগ্রিম ও কালেকশন (Tailoring Cash Inflow)
    let cashTailoring = 0;
    let cashTailoringCount = 0;
    (Array.isArray(tailoringOrders) ? tailoringOrders : []).forEach(to => {
      const timeVal = to.CreatedAt || to.createdAt || to.Date || to.date || to.Timestamp;
      if (!timeVal) return;
      const toTime = new Date(timeVal).getTime();
      if (isNaN(toTime) || toTime < sessionStart) return;

      if (String(to.PaymentMethod || to.paymentMethod || '').toLowerCase() === 'cash') {
        const adv = (Number(to.AdvancePaid || to.advancePaid) || 0);
        if (adv > 0) {
          cashTailoring += adv;
          cashTailoringCount++;
        }
      }
    });

    // ২. কাস্টমার বকেয়া কালেকশন (নগদ ক্যাশে আসা)
    let cashIn = cashTailoring;
    let dueCollectionCount = 0;
    (Array.isArray(customerLedger) ? customerLedger : []).forEach(entry => {
      const timeVal = entry.Timestamp || entry.timestamp || entry.Date || entry.date || entry.CreatedAt;
      if (!timeVal) return;
      const entryTime = new Date(timeVal).getTime();
      if (isNaN(entryTime) || entryTime < sessionStart) return;

      const eType = String(entry.EntryType || entry.entryType || '').toLowerCase();
      const eMethod = String(entry.PaymentMethod || entry.paymentMethod || '').toLowerCase();

      if ((eType === 'payment' || eType === 'collection') && eMethod === 'cash') {
        const amt = Number(entry.Credit !== undefined ? entry.Credit : (entry.Amount || entry.Debit || 0)) || 0;
        if (amt > 0) {
          cashIn += amt;
          dueCollectionCount++;
        }
      }
    });

    // ৩. দৈনন্দিন ক্যাশ খরচ (Expenses)
    let cashOutExpenses = 0;
    let expensesCount = 0;
    (Array.isArray(expenses) ? expenses : []).forEach(exp => {
      const expTime = new Date(exp.Timestamp || exp.Date).getTime();
      if (expTime >= sessionStart && String(exp.PaymentMethod || '').toLowerCase() === 'cash') {
        const amt = Number(exp.Amount) || 0;
        if (amt > 0) {
          cashOutExpenses += amt;
          expensesCount++;
        }
      }
    });

    // ৪. সাপ্লায়ারদের দেওয়া নগদ পেমেন্ট (Supplier Ledger)
    let cashOutSuppliers = 0;
    let suppliersCount = 0;
    (Array.isArray(supplierLedger) ? supplierLedger : []).forEach(supEntry => {
      const supTime = new Date(supEntry.Timestamp).getTime();
      if (supTime >= sessionStart && supEntry.EntryType === 'Payment' && String(supEntry.PaymentMethod || '').toLowerCase() === 'cash') {
        const amt = Number(supEntry.Debit) || 0;
        if (amt > 0) {
          cashOutSuppliers += amt;
          suppliersCount++;
        }
      }
    });

    const totalCashOut = cashOutExpenses + cashOutSuppliers;
    const expectedCash = opening + cashSales + cashIn - totalCashOut;

    return {
      opening,
      cashSales,
      cashSalesCount,
      cashIn,
      cashTailoring,
      cashTailoringCount,
      dueCollectionCount,
      cashOutExpenses,
      expensesCount,
      cashOutSuppliers,
      suppliersCount,
      totalCashOut,
      expectedCash,
      sessionStartTime: activeRegister.OpeningDate || activeRegister.Timestamp
    };
  }, [activeRegister, salesHistory, customerLedger, expenses, supplierLedger, tailoringOrders]);

  // ফিল্টার করা পূর্ববর্তী ক্লোজিং রেকর্ডসমূহ
  const filteredRegisters = useMemo(() => {
    let list = Array.isArray(cashRegisters) ? [...cashRegisters] : [];
    
    // ক্রমানুসারে সাজানো (নতুন থেকে পুরোনো)
    list.sort((a, b) => {
      const tA = new Date(a.ClosingDate || a.Timestamp || a.OpeningDate || 0).getTime();
      const tB = new Date(b.ClosingDate || b.Timestamp || b.OpeningDate || 0).getTime();
      return tB - tA;
    });

    // ডেট ফিল্টার
    const now = new Date();
    if (historyFilter === 'THIS_MONTH') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      list = list.filter(r => {
        const d = new Date(r.ClosingDate || r.Timestamp || r.OpeningDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (historyFilter === '7_DAYS') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
      list = list.filter(r => {
        const d = new Date(r.ClosingDate || r.Timestamp || r.OpeningDate).getTime();
        return d >= sevenDaysAgo;
      });
    }

    // সার্চ ফিল্টার
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      list = list.filter(r => {
        const id = String(r.RegisterID || '').toLowerCase();
        const staff = String(r.ClosedBy || r.OpenedBy || '').toLowerCase();
        const notes = String(r.Notes || '').toLowerCase();
        const dStr = r.ClosingDate ? new Date(r.ClosingDate).toLocaleDateString('bn-BD') : '';
        return id.includes(q) || staff.includes(q) || notes.includes(q) || dStr.includes(q);
      });
    }

    return list;
  }, [cashRegisters, historyFilter, historySearch]);

  // হিস্ট্রি সারাংশ মেট্রিক্স
  const historySummary = useMemo(() => {
    const totalClosed = filteredRegisters.filter(r => r.Status === 'Closed').length;
    let exactMatches = 0;
    let netDifference = 0;

    filteredRegisters.forEach(r => {
      if (r.Status === 'Closed') {
        const diff = Number(r.Difference) || 0;
        if (diff === 0) exactMatches++;
        netDifference += diff;
      }
    });

    return { totalClosed, exactMatches, netDifference };
  }, [filteredRegisters]);

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
      setShowOpenDenominations(false);
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

      // অটো প্রিভিউ ওপেন করা যাতে সাথে সাথে প্রিন্ট দেওয়া যায়
      setPreviewSlipSession({
        ...payload,
        ClosingDate: new Date().toISOString(),
        Status: 'Closed'
      });

      setActualCashInput('');
      setCloseNotes('');
      setShowCloseDenominations(false);
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

    const storeName = storeSettings.StoreName || 'পাবনা বস্ত্রালয়';
    const dateStr = new Date(s.ClosingDate || s.Timestamp || Date.now()).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
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
_Enterprise POS দ্বারা স্বয়ংক্রিয়ভাবে জেনারেটকৃত_`;

    const ownerPhone = storeSettings.Phone || '';
    const cleanPhone = ownerPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone;

    const url = `https://api.whatsapp.com/send?${formattedPhone ? `phone=${formattedPhone}&` : ''}text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // থার্মাল ইওডি প্রিভিউ ওপেন করা (যা পরবর্তীতে নির্ভরযোগ্যভাবে ব্রাউজার প্রিন্ট ট্রিগার করে)
  const handleOpenPrintPreview = (session) => {
    const s = session || activeRegister;
    if (!s) return;
    setPreviewSlipSession(s);
  };

  // এক্সেল/সিএসভি হিস্ট্রি এক্সপোর্ট
  const handleExportHistoryCSV = () => {
    if (!filteredRegisters || filteredRegisters.length === 0) return;

    const headers = ['RegisterID', 'ClosingDate', 'Staff', 'OpeningBalance', 'CashSales', 'CashIn', 'CashOut', 'ExpectedCash', 'ActualCash', 'Difference', 'Status', 'Notes'];
    const rows = filteredRegisters.map(r => [
      `"${r.RegisterID || ''}"`,
      `"${r.ClosingDate ? new Date(r.ClosingDate).toLocaleDateString('en-GB') : (r.OpeningDate || '')}"`,
      `"${r.ClosedBy || r.OpenedBy || 'Admin'}"`,
      Number(r.OpeningBalance || 0),
      Number(r.CashSales || 0),
      Number(r.CashIn || 0),
      Number(r.CashOut || 0),
      Number(r.ExpectedCash || 0),
      Number(r.ActualCash || 0),
      Number(r.Difference || 0),
      `"${r.Status || 'Closed'}"`,
      `"${(r.Notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EOD_Cash_Registers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen && !embedded) return null;

  const isRegisterOpen = activeRegister && activeRegister.Status === 'Open';

  return (
    <div
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[100] animate-fadeIn"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white w-full flex-1 min-h-[calc(100vh-6.5rem)] rounded-2xl shadow-sm flex flex-col overflow-hidden border border-slate-200/90" : "bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/90"}>
        
        {/* ১. স্লিম ও আধুনিক মোডাল হেডার */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#0da487] flex items-center justify-center shadow-inner shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  দৈনিক ক্যাশ ড্রয়ার ও EOD ক্লোজিং
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center space-x-1 shrink-0 ${
                  isRegisterOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRegisterOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{isRegisterOpen ? 'সক্রিয় সেশন চালু' : 'রেজিস্টার বন্ধ'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                {isRegisterOpen
                  ? `সেশন: ${activeRegister.RegisterID || 'ACTIVE'} • প্রারম্ভিক ক্যাশ: ${currencySymbol}${Number(activeRegister.OpeningBalance || 0).toLocaleString('en-IN')}`
                  : 'সকালের ক্যাশ ফ্লোট, রিয়েল-টাইম ক্যাশ ট্র্যাকিং ও দিন শেষে নিখুঁত ক্যাশ মেলানো'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-all cursor-pointer flex items-center space-x-1 ${
              embedded
                ? 'px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-2xs'
                : 'p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl'
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

        {/* ২. আধুনিক ট্যাব নেভিগেশন বার */}
        <div className="flex border-b border-slate-200/90 px-4 sm:px-6 pt-2.5 bg-slate-100/70 shrink-0 gap-2 select-none">
          {isRegisterOpen ? (
            <button
              onClick={() => setActiveTab('live')}
              className={`pb-2.5 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'live'
                  ? 'border-[#0da487] text-[#0da487] font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>লাইভ ড্রয়ার ট্র্যাকিং ও ক্লোজিং</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('open')}
              className={`pb-2.5 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeTab === 'open'
                  ? 'border-[#0da487] text-[#0da487] font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>সকালের রেজিস্টার ওপেন করুন</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#0da487] text-[#0da487] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>পূর্ববর্তী ক্লোজিং হিস্ট্রি</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono font-bold">
              {cashRegisters.length}
            </span>
          </button>
        </div>

        {/* ৩. বডি কন্টেন্ট এরিয়া */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">

          {statusMessage && (
            <div className={`p-3.5 rounded-2xl mb-4 text-xs sm:text-sm flex items-center space-x-2 shadow-2xs ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ========================================================
              দৃশ্য ১: সকালের রেজিস্টার ওপেন ফর্ম
              ======================================================== */}
          {!isRegisterOpen && activeTab === 'open' && (
            <div className="max-w-xl mx-auto bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0da487] flex items-center justify-center shrink-0">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">সকালের শিফট শুরু (রেজিস্টার ওপেন)</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    দোকান খোলার সময় ড্রয়ারে ভাঙতি/প্রারম্ভিক ক্যাশ কত টাকা রাখা হয়েছে তা ইনপুট দিয়ে শিফট শুরু করুন।
                  </p>
                </div>
              </div>

              <form onSubmit={handleOpenRegisterSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      প্রারম্ভিক ক্যাশ ফ্লোট (Opening Cash) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowOpenDenominations(!showOpenDenominations)}
                      className="text-[11px] font-bold text-[#0da487] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{showOpenDenominations ? 'ক্যালকুলেটর লুকান' : 'নোট গোনার ক্যালকুলেটর'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-lg text-slate-400">
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
                      className="w-full pl-9 pr-4 py-2.5 text-lg font-black font-mono text-emerald-800 bg-emerald-50/30 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-[#0da487]/20 focus:border-[#0da487] shadow-inner"
                    />
                  </div>

                  {/* কুইক প্রিসেট বাটন */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {[500, 1000, 2000, 3000, 5000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOpeningBalance(String(val))}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          Number(openingBalance) === val
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        +{currencySymbol}{val}
                      </button>
                    ))}
                    {openingBalance && (
                      <button
                        type="button"
                        onClick={() => { setOpeningBalance(''); setOpenDenoms({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }); }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                      >
                        মুছুন
                      </button>
                    )}
                  </div>

                  {/* ঐচ্ছিক নোট গোনার ক্যালকুলেটর গ্রিড */}
                  {showOpenDenominations && (
                    <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        💵 ড্রয়ারের বিভিন্ন নোটের সংখ্যা বসান (স্বয়ংক্রিয় যোগফল হবে):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {DENOMINATION_LIST.map(d => (
                          <div key={d} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs text-center">
                            <span className="text-[10.5px] font-bold text-slate-500 block">৳{d} এর নোট</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="০"
                              value={openDenoms[d] || ''}
                              onChange={(e) => handleOpenDenomChange(d, e.target.value)}
                              className="w-full mt-1 px-1.5 py-1 text-center font-black font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0da487]"
                            />
                            <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">
                              ={currencySymbol}{((openDenoms[d] || 0) * d).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মন্তব্য বা বিবরণ (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: সকালের ড্রয়ারে ভাঙতির জন্য ৫০ ও ১০০ টাকার নোট..."
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0da487]/20 focus:border-[#0da487] shadow-2xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isOpenSubmitting}
                    className="w-full py-3 bg-[#0da487] hover:bg-[#0b8b72] active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-md shadow-[#0da487]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isOpenSubmitting ? 'ওপেন করা হচ্ছে...' : 'ক্যাশ রেজিস্টার সেশন চালু করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              দৃশ্য ২: রেজিস্টার সক্রিয় রয়েছে (লাইভ ট্র্যাকিং ও EOD ক্লোজিং)
              ======================================================== */}
          {isRegisterOpen && activeTab === 'live' && (
            <div className="space-y-5">
              
              {/* ৪টি মূল লাইভ মেট্রিক কার্ডস */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">১. প্রারম্ভিক ক্যাশ</p>
                  <p className="text-xl font-black font-mono text-slate-900 mt-1">
                    {currencySymbol}{liveSessionMetrics.opening.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">সকালের ফ্লোট</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">২. নগদ বিক্রি (+)</p>
                  <p className="text-xl font-black font-mono text-emerald-700 mt-1">
                    +{currencySymbol}{liveSessionMetrics.cashSales.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">{liveSessionMetrics.cashSalesCount}টি ক্যাশ অর্ডারে</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs">
                  <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">৩. ক্যাশ খরচ ও পেইড (-)</p>
                  <p className="text-xl font-black font-mono text-rose-700 mt-1">
                    -{currencySymbol}{liveSessionMetrics.totalCashOut.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">দোকান খরচ ও মহাজন</p>
                </div>

                <div className="bg-gradient-to-br from-[#0da487] to-teal-800 text-white p-4 rounded-2xl shadow-md">
                  <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">হিসাবমতে ড্রয়ারে ক্যাশ</p>
                  <p className="text-2xl font-black font-mono mt-1">
                    {currencySymbol}{liveSessionMetrics.expectedCash.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10.5px] text-emerald-200 mt-0.5">প্রত্যাশিত মোট নগদ</p>
                </div>
              </div>

              {/* কলাপসিবল ক্যাশ ফ্লো ব্রেকডাউন টগল */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLiveBreakdown(!showLiveBreakdown)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#0da487]" />
                    <span>আজকের লাইভ লেনদেনের বিস্তারিত খতিয়ান (Cash Inflow & Outflow Breakdown)</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-400">
                    <span className="text-[11px]">{showLiveBreakdown ? 'সংক্ষেপ করুন' : 'বিস্তারিত দেখুন'}</span>
                    {showLiveBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {showLiveBreakdown && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                    {/* ক্যাশ আগমন (Inflows) */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100 space-y-2">
                      <span className="text-[11px] font-black text-emerald-800 flex items-center space-x-1.5 uppercase">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                        <span>নগদ আগমন (Cash Inflows)</span>
                      </span>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-600">🛒 কাউন্টার ক্যাশ সেলস:</span>
                          <strong className="font-mono text-emerald-700">+{currencySymbol}{liveSessionMetrics.cashSales.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-600">✂️ টেইলারিং অগ্রিম ও কালেকশন:</span>
                          <strong className="font-mono text-emerald-700">+{currencySymbol}{liveSessionMetrics.cashTailoring.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-600">📥 কাস্টমার বকেয়া আদায় (ক্যাশ):</span>
                          <strong className="font-mono text-emerald-700">+{currencySymbol}{(liveSessionMetrics.cashIn - liveSessionMetrics.cashTailoring).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* ক্যাশ নির্গমন (Outflows) */}
                    <div className="bg-white p-3.5 rounded-xl border border-rose-100 space-y-2">
                      <span className="text-[11px] font-black text-rose-800 flex items-center space-x-1.5 uppercase">
                        <ArrowUpRight className="w-4 h-4 text-rose-600" />
                        <span>নগদ নির্গমন (Cash Outflows)</span>
                      </span>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-600">☕ দৈনন্দিন দোকান খরচ:</span>
                          <strong className="font-mono text-rose-700">-{currencySymbol}{liveSessionMetrics.cashOutExpenses.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-600">🏭 মহাজন/সাপ্লায়ারকে নগদ প্রদান:</span>
                          <strong className="font-mono text-rose-700">-{currencySymbol}{liveSessionMetrics.cashOutSuppliers.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* দিন শেষে ক্যাশ ড্রয়ার ক্লোজিং ফর্ম (EOD Closing Form) */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
                <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">দিন শেষে ড্রয়ার বন্ধ করুন (EOD Closing)</h3>
                    <p className="text-xs text-slate-500 font-medium">ড্রয়ারের নগদ টাকা গুনে নিচে বসিয়ে হিসাব মিলিয়ে ক্লোজ করুন।</p>
                  </div>
                </div>

                <form onSubmit={handleCloseRegisterSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        ড্রয়ারে বাস্তবে গুনে মোট কত টাকা পাওয়া গেল? (Actual Physical Cash) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCloseDenominations(!showCloseDenominations)}
                        className="text-[11px] font-bold text-[#0da487] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>{showCloseDenominations ? 'ক্যালকুলেটর লুকান' : 'নোট গোনার ক্যালকুলেটর'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-lg text-slate-400">
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
                        className="w-full pl-9 pr-4 py-2.5 text-xl font-black font-mono text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0da487]/20 focus:border-[#0da487] shadow-inner"
                      />
                    </div>

                    {/* ড্রয়ার গোনার ক্যালকুলেটর */}
                    {showCloseDenominations && (
                      <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          💵 ক্যাশ বাক্সের নোট গুনে সংখ্যা লিখুন (স্বয়ংক্রিয় যোগফল বসবে):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {DENOMINATION_LIST.map(d => (
                            <div key={d} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs text-center">
                              <span className="text-[10.5px] font-bold text-slate-500 block">৳{d} এর নোট</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="০"
                                value={closeDenoms[d] || ''}
                                onChange={(e) => handleCloseDenomChange(d, e.target.value)}
                                className="w-full mt-1 px-1.5 py-1 text-center font-black font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0da487]"
                              />
                              <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">
                                ={currencySymbol}{((closeDenoms[d] || 0) * d).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* গরমিল ডিটেকশন লাইভ ব্যানার */}
                  {actualCashInput !== '' && (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm shadow-2xs ${
                      Number(actualCashInput) === liveSessionMetrics.expectedCash
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                        : Number(actualCashInput) < liveSessionMetrics.expectedCash
                        ? 'bg-rose-50 text-rose-950 border-rose-300'
                        : 'bg-indigo-50 text-indigo-950 border-indigo-300'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {Number(actualCashInput) === liveSessionMetrics.expectedCash ? (
                          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        ) : Number(actualCashInput) < liveSessionMetrics.expectedCash ? (
                          <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-sm">
                            {Number(actualCashInput) === liveSessionMetrics.expectedCash
                              ? 'হিসাব ১০০% নিখুঁত মিলেছে!'
                              : Number(actualCashInput) < liveSessionMetrics.expectedCash
                              ? `ক্যাশ ঘাটতি (Shortage): -${currencySymbol}${Math.abs(Number(actualCashInput) - liveSessionMetrics.expectedCash).toLocaleString('en-IN')}`
                              : `অতিরিক্ত ক্যাশ (Excess): +${currencySymbol}${(Number(actualCashInput) - liveSessionMetrics.expectedCash).toLocaleString('en-IN')}`}
                          </p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            হিসাবমতে থাকার কথা: {currencySymbol}{liveSessionMetrics.expectedCash.toLocaleString('en-IN')} | বাস্তবে গুনেছেন: {currencySymbol}{Number(actualCashInput).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ক্লোজিং নোট বা গরমিলের কারণ (যদি থাকে)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="যেমন: কোনো ক্যাশ ঘাটতি থাকলে তার কারণ বা হ্যান্ডওভার নোট লিখুন..."
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0da487]/20 focus:border-[#0da487] shadow-2xs resize-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReport({ ...activeRegister, ActualCash: actualCashInput || liveSessionMetrics.expectedCash })}
                      className="flex-1 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600" />
                      <span>মালিককে WhatsApp এ পাঠান</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isCloseSubmitting}
                      className="flex-1 py-3 px-4 bg-[#0da487] hover:bg-[#0b8b72] active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-[#0da487]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isCloseSubmitting ? 'ক্লোজ হচ্ছে...' : 'ক্যাশ ড্রয়ার ক্লোজ করুন'}</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* ========================================================
              দৃশ্য ৩: পূর্ববর্তী ক্লোজিং হিস্ট্রি ট্যাব
              ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              
              {/* সার্চ, ফিল্টার ও এক্সপোর্ট বার */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="তারিখ, সেশন আইডি বা স্টাফের নাম দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0da487]/20 focus:border-[#0da487]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                    >
                      সব ({cashRegisters.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('THIS_MONTH')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'THIS_MONTH' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                    >
                      চলতি মাস
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('7_DAYS')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === '7_DAYS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                    >
                      গত ৭ দিন
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportHistoryCSV}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-200"
                    title="সম্পূর্ণ হিস্ট্রি এক্সেল/সিএসভি ফাইলে ডাউনলোড করুন"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">এক্সেল ডাউনলোড</span>
                  </button>
                </div>
              </div>

              {/* হিস্ট্রি সারাংশ কার্ড */}
              {filteredRegisters.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">মোট ক্লোজড সেশন</span>
                    <span className="text-base font-black font-mono text-slate-800">{historySummary.totalClosed}টি</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs text-center">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">সম্পূর্ণ মিলেছে (০)</span>
                    <span className="text-base font-black font-mono text-emerald-700">{historySummary.exactMatches}টি</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">সর্বমোট নিট গরমিল</span>
                    <span className={`text-base font-black font-mono ${
                      historySummary.netDifference === 0 ? 'text-slate-700' : (historySummary.netDifference > 0 ? 'text-blue-700' : 'text-rose-600')
                    }`}>
                      {historySummary.netDifference === 0 ? '৳০' : (historySummary.netDifference > 0 ? `+৳${historySummary.netDifference.toLocaleString('en-IN')}` : `-৳${Math.abs(historySummary.netDifference).toLocaleString('en-IN')}`)}
                    </span>
                  </div>
                </div>
              )}

              {filteredRegisters.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-[#0da487] flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">কোনো পূর্ববর্তী ক্লোজিং রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    দিন শেষে ক্যাশ রেজিস্টার ক্লোজ করলে তার বিস্তারিত স্টেটমেন্ট এখানে সংরক্ষিত থাকবে।
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-3 px-4">তারিখ ও সময়</th>
                          <th className="py-3 px-4">সেশন আইডি</th>
                          <th className="py-3 px-4">স্টাফ</th>
                          <th className="py-3 px-4 text-right">ওপেনিং ক্যাশ</th>
                          <th className="py-3 px-4 text-right">ক্যাশ বিক্রি</th>
                          <th className="py-3 px-4 text-right">প্রত্যাশিত ক্যাশ</th>
                          <th className="py-3 px-4 text-right">বাস্তব ক্যাশ</th>
                          <th className="py-3 px-4 text-center">পার্থক্য</th>
                          <th className="py-3 px-4 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredRegisters.map((reg) => {
                          const diff = Number(reg.Difference) || 0;
                          return (
                            <tr key={reg.RegisterID || Math.random()} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <p className="font-bold text-slate-800 font-mono">
                                  {reg.ClosingDate ? new Date(reg.ClosingDate).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : reg.OpeningDate}
                                </p>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {reg.ClosingDate ? new Date(reg.ClosingDate).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-mono text-[11px] font-bold text-slate-600 block">
                                  {reg.RegisterID || 'REG-N/A'}
                                </span>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                  reg.Status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {reg.Status === 'Open' ? 'সক্রিয়' : 'ক্লোজড'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                                {reg.ClosedBy || reg.OpenedBy || 'Admin'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                                {currencySymbol}{(Number(reg.OpeningBalance) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                                {currencySymbol}{(Number(reg.CashSales) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                                {currencySymbol}{(Number(reg.ExpectedCash) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                                {currencySymbol}{(Number(reg.ActualCash) || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {diff === 0 ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    মিলেছে (০)
                                  </span>
                                ) : diff > 0 ? (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                                    +৳{diff.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                    -৳{Math.abs(diff).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPrintPreview(reg)}
                                    className="p-1.5 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-[#0da487] border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                                    title="থার্মাল স্লিপ প্রিভিউ ও প্রিন্ট"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppReport(reg)}
                                    className="p-1.5 rounded-xl hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 border border-emerald-100 transition-colors cursor-pointer shadow-2xs"
                                    title="মালিককে WhatsApp এ পাঠান"
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

      </div>

      {/* ========================================================================= */}
      {/* ৪. ইন-অ্যাপ থার্মাল ইওডি ক্লোজিং স্লিপ প্রিভিউ ও প্রিন্ট মডাল (১০০% নির্ভরযোগ্য) */}
      {/* ========================================================================= */}
      {previewSlipSession && (() => {
        const s = previewSlipSession;
        const storeName = storeSettings.StoreName || 'পাবনা বস্ত্রালয়';
        const storeAddress = storeSettings.Address || '';
        const storePhone = storeSettings.Phone || '';
        const dateStr = s.ClosingDate ? new Date(s.ClosingDate).toLocaleString('bn-BD') : new Date().toLocaleString('bn-BD');
        const cashierName = s.ClosedBy || s.OpenedBy || activeUser?.FullName || 'ক্যাশিয়ার';
        const openCash = Number(s.OpeningBalance || 0);
        const sales = Number(s.CashSales !== undefined ? s.CashSales : liveSessionMetrics.cashSales) || 0;
        const cashIn = Number(s.CashIn !== undefined ? s.CashIn : liveSessionMetrics.cashIn) || 0;
        const cashOut = Number(s.CashOut !== undefined ? s.CashOut : liveSessionMetrics.totalCashOut) || 0;
        const expected = Number(s.ExpectedCash !== undefined ? s.ExpectedCash : liveSessionMetrics.expectedCash) || 0;
        const actual = Number(s.ActualCash || 0);
        const diff = Number(s.Difference || 0);

        const handleDirectPrint = () => {
          window.print();
        };

        return (
          <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
              
              {/* প্রিভিউ হেডার */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
                <span className="text-xs font-bold flex items-center space-x-1.5">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>থার্মাল EOD স্লিপ প্রিভিউ (৮০মিমি)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewSlipSession(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* থার্মাল স্লিপ বডি (প্রিন্টেবল এরিয়া) */}
              <div className="p-5 overflow-y-auto bg-slate-100 flex justify-center">
                <div
                  id="printable-eod-slip"
                  className="w-[280px] bg-white p-4 shadow-sm border border-slate-300 font-mono text-[11px] text-slate-950 space-y-2 select-text"
                >
                  <div className="text-center pb-2 border-b border-dashed border-slate-400">
                    <h3 className="font-bold text-sm uppercase">{storeName}</h3>
                    {storeAddress && <p className="text-[10px] text-slate-600 mt-0.5">{storeAddress}</p>}
                    {storePhone && <p className="text-[10px] text-slate-600">মোবাইল: {storePhone}</p>}
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-900 text-white rounded text-[9.5px] font-bold uppercase tracking-wider">
                      দৈনিক ক্যাশ ক্লোজিং রিপোর্ট (EOD)
                    </span>
                  </div>

                  <div className="text-[10px] space-y-0.5 py-1 border-b border-dashed border-slate-400">
                    <div className="flex justify-between">
                      <span className="text-slate-500">তারিখ:</span>
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">সেশন:</span>
                      <span className="font-bold">{s.RegisterID || 'ACTIVE'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">দায়িত্বপ্রাপ্ত:</span>
                      <span className="font-bold">{cashierName}</span>
                    </div>
                  </div>

                  <div className="space-y-1 py-1 border-b border-dashed border-slate-400">
                    <div className="flex justify-between">
                      <span>প্রারম্ভিক ক্যাশ:</span>
                      <span>{currencySymbol}{openCash.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>ক্যাশ বিক্রয় (+):</span>
                      <span>+{currencySymbol}{sales.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>বকেয়া কালেকশন (+):</span>
                      <span>+{currencySymbol}{cashIn.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-rose-800">
                      <span>খরচ ও সাপ্লায়ার (-):</span>
                      <span>-{currencySymbol}{cashOut.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="space-y-1 py-1 border-b-2 border-slate-800 font-bold">
                    <div className="flex justify-between text-slate-700">
                      <span>হিসাবমতে ক্যাশ:</span>
                      <span>{currencySymbol}{expected.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-950 font-black">
                      <span>বাস্তবে গুনেছেন:</span>
                      <span>{currencySymbol}{actual.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="py-1 border-b border-dashed border-slate-400 text-center font-bold">
                    <span>পার্থক্য (Discrepancy): </span>
                    <span className={diff === 0 ? 'text-emerald-700' : (diff > 0 ? 'text-blue-700' : 'text-rose-600')}>
                      {diff === 0 ? '০ (হিসাব মিলেছে ✅)' : (diff > 0 ? `+৳${diff.toLocaleString('en-IN')} (উদ্বৃত্ত)` : `-৳${Math.abs(diff).toLocaleString('en-IN')} (ঘাটতি ⚠️)`)}
                    </span>
                  </div>

                  {s.Notes && (
                    <div className="text-[10px] py-1 border-b border-dashed border-slate-400">
                      <span className="text-slate-500 block">নোট:</span>
                      <p className="italic text-slate-700">{s.Notes}</p>
                    </div>
                  )}

                  <div className="pt-6 flex justify-between text-[10px] text-slate-600">
                    <div className="text-center">
                      <div className="w-20 border-t border-slate-400 mb-1" />
                      <span>ক্যাশিয়ার</span>
                    </div>
                    <div className="text-center">
                      <div className="w-20 border-t border-slate-400 mb-1" />
                      <span>মালিক/কর্তৃপক্ষ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* প্রিভিউ ফুটার অ্যাকশন বাটন */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 no-print">
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReport(s)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer border border-emerald-200"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>হোয়াটসঅ্যাপ</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewSlipSession(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="px-4 py-2 bg-[#0da487] hover:bg-[#0b8b72] text-white text-xs font-black rounded-xl shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
