import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  X, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ShoppingBag, 
  ArrowRight, 
  CloudDownload, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Receipt,
  Wallet,
  Banknote,
  BadgeCheck,
  TrendingUp,
  Tag,
  ArrowUpRight
} from 'lucide-react';
import { normalizeSale, extractAndNormalizeItems, formatImageUrl } from '../services/storage';
import { fetchSaleByInvoice } from '../services/api';
import StoreLogo from './StoreLogo';

export default function InvoiceLookupModal({
  isOpen,
  onClose,
  salesHistory = [],
  currencySymbol = '৳',
  settings = {},
  onOpenPrintInvoice,
  apiUrl = '',
  initialInvoiceNo = ''
}) {
  const [searchTerm, setSearchTerm] = useState(initialInvoiceNo || '');
  const [selectedSale, setSelectedSale] = useState(null);
  const [isCloudSearching, setIsCloudSearching] = useState(false);
  const [cloudError, setCloudError] = useState(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'CASH' | 'DIGITAL' | 'CARD'

  // নর্মালাইজড বিক্রয় তালিকা
  const normalizedSales = useMemo(() => {
    return (Array.isArray(salesHistory) ? salesHistory : [])
      .map(normalizeSale)
      .filter(Boolean);
  }, [salesHistory]);

  // নির্বাচিত বিক্রয়ের পণ্য তালিকা নিখুঁতভাবে বের করা
  const activeItems = useMemo(() => {
    return extractAndNormalizeItems(selectedSale);
  }, [selectedSale]);

  // ওভারভিউ KPI পরিসংখ্যান
  const kpiStats = useMemo(() => {
    const totalInvoices = normalizedSales.length;
    const todayStr = new Date().toDateString();
    const todayInvoices = normalizedSales.filter((s) => s.timestamp && new Date(s.timestamp).toDateString() === todayStr).length;
    const totalRevenue = normalizedSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

    return {
      totalInvoices,
      todayInvoices,
      totalRevenue,
    };
  }, [normalizedSales]);

  // ফিল্টার করা তালিকা
  const searchResults = useMemo(() => {
    let list = normalizedSales;

    // পেমেন্ট ও ডেট ফিল্টার
    if (paymentFilter === 'TODAY') {
      const todayStr = new Date().toDateString();
      list = list.filter((s) => s.timestamp && new Date(s.timestamp).toDateString() === todayStr);
    } else if (paymentFilter === 'CASH') {
      list = list.filter((s) => {
        const pm = String(s.paymentMethod || '').toLowerCase();
        return pm.includes('cash') || pm.includes('নগদ');
      });
    } else if (paymentFilter === 'DIGITAL') {
      list = list.filter((s) => {
        const pm = String(s.paymentMethod || '').toLowerCase();
        return pm.includes('bkash') || pm.includes('বিকাশ') || pm.includes('nagad') || pm.includes('rocket') || pm.includes('mfs');
      });
    } else if (paymentFilter === 'CARD') {
      list = list.filter((s) => {
        const pm = String(s.paymentMethod || '').toLowerCase();
        return pm.includes('card') || pm.includes('কার্ড');
      });
    }

    // সার্চ কিউরি ফিল্টার
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      list = list.filter((sale) => {
        const inv = String(sale.invoiceNo || '').toLowerCase();
        const saleId = String(sale.saleId || '').toLowerCase();
        const cName = String(sale.customerName || '').toLowerCase();
        const cPhone = String(sale.customerPhone || '').toLowerCase();
        const pMethod = String(sale.paymentMethod || '').toLowerCase();

        return (
          inv.includes(query) ||
          saleId.includes(query) ||
          cName.includes(query) ||
          cPhone.includes(query) ||
          pMethod.includes(query)
        );
      });
    }

    return list;
  }, [normalizedSales, searchTerm, paymentFilter]);

  // মডাল খুললে বা সার্চ শুরু হলে স্বয়ংক্রিয়ভাবে প্রথম ম্যাচ নির্বাচন করা
  useEffect(() => {
    if (initialInvoiceNo) {
      setSearchTerm(initialInvoiceNo);
      const target = String(initialInvoiceNo || '').toLowerCase();
      const match = normalizedSales.find(
        (s) => String(s.invoiceNo || '').toLowerCase() === target
      );
      if (match) setSelectedSale(match);
    } else if (!selectedSale && normalizedSales.length > 0) {
      setSelectedSale(normalizedSales[0]);
    }
  }, [isOpen, initialInvoiceNo, normalizedSales]);

  if (!isOpen) return null;

  // কারেন্সি ফরম্যাট হেল্পার
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // পেমেন্ট মাধ্যম ব্যাজ হেল্পার
  const getPaymentMethodBadge = (method) => {
    const m = String(method || '').toLowerCase();
    if (m.includes('cash') || m.includes('নগদ')) {
      return {
        label: 'নগদ (Cash)',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        icon: <Banknote className="w-3.5 h-3.5 text-emerald-600" />,
      };
    }
    if (m.includes('bkash') || m.includes('বিকাশ')) {
      return {
        label: 'বিকাশ (bKash)',
        className: 'bg-pink-50 text-pink-700 border-pink-200/80',
        icon: <Wallet className="w-3.5 h-3.5 text-pink-600" />,
      };
    }
    if (m.includes('nagad') || m.includes('rocket') || m.includes('mfs')) {
      return {
        label: 'ডিজিটাল ওয়ালেট',
        className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        icon: <Wallet className="w-3.5 h-3.5 text-amber-600" />,
      };
    }
    if (m.includes('card') || m.includes('কার্ড') || m.includes('pos')) {
      return {
        label: 'কার্ড পেমেন্ট (Card)',
        className: 'bg-blue-50 text-blue-700 border-blue-200/80',
        icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
      };
    }
    return {
      label: method || 'অন্যান্য',
      className: 'bg-slate-100 text-slate-700 border-slate-200/80',
      icon: <CreditCard className="w-3.5 h-3.5 text-slate-500" />,
    };
  };

  // ক্লাউড থেকে সরাসরি ইনভয়েস খোঁজা
  const handleCloudSearch = async () => {
    if (!searchTerm.trim()) return;
    if (!apiUrl) {
      setCloudError('গুগল শিট API URL কনফিগার করা নেই। Settings এ গিয়ে URL সেট করুন।');
      return;
    }

    setIsCloudSearching(true);
    setCloudError(null);

    try {
      const liveData = await fetchSaleByInvoice(apiUrl, searchTerm.trim());
      if (liveData) {
        const norm = normalizeSale(liveData);
        setSelectedSale(norm);
        setCloudError(null);
      } else {
        setCloudError(`ইনভয়েস '${searchTerm}' দিয়ে গুগল শিটে কোনো রেকর্ড পাওয়া যায়নি।`);
      }
    } catch (err) {
      setCloudError(`ক্লাউড অনুসন্ধানে সমস্যা: ${err.message}`);
    } finally {
      setIsCloudSearching(false);
    }
  };

  // ইনভয়েস নম্বর কপি করা
  const handleCopyInvoiceNumber = (invNo) => {
    if (!invNo) return;
    navigator.clipboard.writeText(invNo);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  // পূর্ণ বিবরণ টেক্সট কপি করা (এসএমএস বা হোয়াটসঅ্যাপের জন্য)
  const handleCopySummaryText = (sale) => {
    if (!sale) return;
    const itemsList = extractAndNormalizeItems(sale);
    const itemsText = itemsList
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.productName || 'Item'} x${it.quantity} = ${currencySymbol}${Number(
            it.total || 0
          ).toFixed(2)}`
      )
      .join('\n');

    const summary = `🧾 ${settings.StoreName || 'ইনভয়েস মেমো'}
ইনভয়েস নং: ${sale.invoiceNo}
তারিখ: ${new Date(sale.timestamp).toLocaleString('bn-BD')}
ক্রেতা: ${sale.customerName} (${sale.customerPhone || 'মোবাইল নেই'})
-------------------------
পণ্য বিবরণী:
${itemsText}
-------------------------
সাব-টোটাল: ${currencySymbol}${Number(sale.subTotal || 0).toFixed(2)}
ডিসকাউন্ট: -${currencySymbol}${Number(sale.discountAmount || 0).toFixed(2)}
ভ্যাট/ট্যাক্স: +${currencySymbol}${Number(sale.taxAmount || 0).toFixed(2)}
সর্বমোট বিল: ${currencySymbol}${Number(sale.grandTotal || 0).toFixed(2)}
পেমেন্ট মাধ্যম: ${sale.paymentMethod || 'Cash'}
-------------------------
ধন্যবাদ, আবার আসবেন!`;

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-6xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150">
        
        {/* ================= ১. শীর্ষ প্রিমিয়াম হেডার বার ================= */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 border border-indigo-400/40 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ইনভয়েস অনুসন্ধান ও বিস্তারিত মেমো
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  ডিজিটাল মেমো ভিউয়ার
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ইনভয়েস নম্বর, ক্রেতার নাম বা মোবাইল নম্বর দিয়ে বিক্রয় বিবরণ খুঁজে বের করুন, যাচাই করুন ও রি-প্রিন্ট নিন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* ছোট পরিসংখ্যান স্ট্রিপ */}
            <div className="hidden md:flex items-center space-x-3 text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">মোট মেমো</span>
                <span className="font-bold text-white font-mono">{kpiStats.totalInvoices} টি</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">আজকের বিক্রয়</span>
                <span className="font-bold text-emerald-400 font-mono">{kpiStats.todayInvoices} টি</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= ২. অনুসন্ধান ও ফিল্টার কমান্ড বার ================= */}
        <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* সার্চ ইনপুট */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      setSelectedSale(searchResults[0]);
                    } else {
                      handleCloudSearch();
                    }
                  }
                }}
                placeholder="ইনভয়েস নম্বর (যেমন: INV-20261012-0001) অথবা গ্রাহকের নাম বা ফোন নম্বর লিখুন..."
                className="w-full pl-10 pr-24 py-2 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  ক্লিয়ার ✕
                </button>
              )}
            </div>

            {/* গুগল শিট ক্লাউড অনুসন্ধান বাটন */}
            <button
              onClick={handleCloudSearch}
              disabled={isCloudSearching || !searchTerm.trim()}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs hover:shadow-md shrink-0 cursor-pointer disabled:cursor-not-allowed active:scale-95"
              title="গুগল শিট ক্লাউড ডেটাবেসে সরাসরি অনুসন্ধান করুন"
            >
              <CloudDownload className={`w-4 h-4 ${isCloudSearching ? 'animate-bounce' : ''}`} />
              <span>{isCloudSearching ? 'অনুসন্ধান চলছে...' : 'ক্লাউড সার্চ'}</span>
            </button>
          </div>

          {/* ক্লাউড এরর বার্তা */}
          {cloudError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center justify-between animate-in fade-in">
              <span>{cloudError}</span>
              <button onClick={() => setCloudError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ফিল্টার পিলস ও সাম্প্রতিক ইনভয়েস বার */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
            {/* পেমেন্ট ফিল্টার চিপস */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: 'সকল মেমো' },
                { id: 'TODAY', label: 'আজকের মেমো' },
                { id: 'CASH', label: 'নগদ (Cash)' },
                { id: 'DIGITAL', label: 'বিকাশ / MFS' },
                { id: 'CARD', label: 'কার্ড পেমেন্ট' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPaymentFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    paymentFilter === tab.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* সাম্প্রতিক ইনভয়েস কুইক পিলস */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                সাম্প্রতিক:
              </span>
              {normalizedSales.slice(0, 5).map((sale) => (
                <button
                  key={sale.saleId || sale.invoiceNo}
                  onClick={() => {
                    setSelectedSale(sale);
                    setSearchTerm(sale.invoiceNo);
                  }}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                    selectedSale?.invoiceNo === sale.invoiceNo
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  {sale.invoiceNo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================= ৩. মূল স্প্লিট ভিউ: বামে তালিকা এবং ডানে পূর্ণাঙ্গ মেমো ================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-100/60 min-h-0">
          
          {/* ৩.১ বাম কলাম: ম্যাচিং ইনভয়েস তালিকা */}
          <div className="lg:col-span-4 border-r border-slate-200 bg-white overflow-y-auto max-h-[38vh] lg:max-h-none p-3 space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ইনভয়েস তালিকা ({searchResults.length})
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                ক্লিক করে মেমো দেখুন
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-bold text-slate-700">কোনো ইনভয়েস খুঁজে পাওয়া যায়নি</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  গুগল শিট থেকে ক্লাউড ডেটাবেসে খুঁজতে উপরের 'ক্লাউড সার্চ' বাটনে ক্লিক করুন।
                </p>
              </div>
            ) : (
              searchResults.map((sale) => {
                const isSelected = selectedSale?.invoiceNo === sale.invoiceNo;
                const pBadge = getPaymentMethodBadge(sale.paymentMethod);
                const itemsCount = (sale.items || []).length;

                return (
                  <div
                    key={sale.saleId || sale.invoiceNo}
                    onClick={() => setSelectedSale(sale)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r" />
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                        {sale.invoiceNo}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatCurrency(sale.grandTotal)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {sale.customerName ? sale.customerName.charAt(0) : 'C'}
                        </div>
                        <span className="font-bold text-slate-800 truncate">
                          {sale.customerName || 'সাধারণ ক্রেতা'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {sale.timestamp ? new Date(sale.timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center space-x-1">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                        <span>{itemsCount > 0 ? `${itemsCount} টি আইটেম` : '১ টি অর্ডার'}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border font-bold flex items-center space-x-1 ${pBadge.className}`}>
                        {pBadge.icon}
                        <span>{pBadge.label}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ৩.২ ডান কলাম: নির্বাচিত ইনভয়েসের পূর্ণাঙ্গ ডিজিটাল মেমো */}
          <div className="lg:col-span-8 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex flex-col">
            {selectedSale ? (
              <div className="space-y-4 max-w-3xl mx-auto w-full">
                
                {/* ডিজিটাল মেমো হেডার কার্ড */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
                  
                  {/* স্টোর ইনফো ও অফিশিয়াল ভাউচার স্ট্যাম্প */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-3.5">
                      <StoreLogo
                        url={settings?.LogoUrl || settings?.logoUrl}
                        alt={settings?.StoreName || 'লোগো'}
                        className="w-12 h-12 object-contain rounded-2xl border border-slate-200 p-1 bg-white shadow-2xs"
                        fallbackIcon={Receipt}
                        fallbackClassName="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100"
                        iconClassName="w-6 h-6"
                      />
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {settings?.StoreName || 'ইনভয়েস মেমো'}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                          {settings?.Address && <span>{settings.Address}</span>}
                          {settings?.Phone && <span>• {settings.Phone}</span>}
                        </p>
                      </div>
                    </div>

                    {/* পরিশোধিত ভেরিফাইড ব্যাজ */}
                    <div className="flex items-center space-x-2 self-start sm:self-center">
                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                        পরিশোধিত (PAID)
                      </span>
                    </div>
                  </div>

                  {/* ইনভয়েস নম্বর ও তারিখ বার */}
                  <div className="mt-4 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-indigo-900 font-bold uppercase tracking-wider">ইনভয়েস নং:</span>
                      <span className="font-mono text-base font-black text-indigo-700">
                        {selectedSale.invoiceNo}
                      </span>
                      <button
                        onClick={() => handleCopyInvoiceNumber(selectedSale.invoiceNo)}
                        title="ইনভয়েস নম্বর কপি করুন"
                        className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors cursor-pointer"
                      >
                        {copiedInvoice ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {selectedSale.timestamp
                          ? new Date(selectedSale.timestamp).toLocaleString('bn-BD', { dateStyle: 'full', timeStyle: 'short' })
                          : 'তারিখ নেই'}
                      </span>
                    </div>
                  </div>

                  {/* ক্রেতা ও ক্যাশিয়ার তথ্য কার্ড */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                        ক্রেতার বিবরণ:
                      </span>
                      <div className="flex items-center space-x-2 font-bold text-slate-800">
                        <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-sm font-black">{selectedSale.customerName || 'সাধারণ ক্রেতা'}</span>
                        {selectedSale.customerType && (
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold border border-indigo-200">
                            {selectedSale.customerType}
                          </span>
                        )}
                      </div>
                      {selectedSale.customerPhone && (
                        <div className="flex items-center space-x-2 text-slate-600 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a href={`tel:${selectedSale.customerPhone}`} className="hover:text-indigo-600 hover:underline">
                            {selectedSale.customerPhone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                        পেমেন্ট ও ক্যাশিয়ার:
                      </span>
                      <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>পদ্ধতি: <b className="text-slate-900">{selectedSale.paymentMethod || 'Cash'}</b></span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ক্যাশিয়ার: {selectedSale.cashierEmail || 'POS Cashier'}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* আইটেম তালিকা কার্ড */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <span>পণ্য তালিকা ({activeItems.length} টি আইটেম)</span>
                    </h4>
                  </div>

                  {activeItems.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                            <th className="p-3">#</th>
                            <th className="p-3">পণ্যের বিবরণী</th>
                            <th className="p-3 text-center">পরিমাণ</th>
                            <th className="p-3 text-right">একক দর</th>
                            <th className="p-3 text-right">মোট টাকা</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {activeItems.map((item, idx) => (
                            <tr key={item.productId || idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{item.productName || 'আইটেম'}</span>
                                {item.barcode && (
                                  <span className="font-mono text-[10px] text-slate-400">#{item.barcode}</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-800">
                                {item.quantity} {item.unit || ''}
                              </td>
                              <td className="p-3 text-right text-slate-600">
                                {formatCurrency(item.sellingPrice)}
                              </td>
                              <td className="p-3 text-right font-black text-slate-900">
                                {formatCurrency(item.total || (Number(item.sellingPrice || 0) * Number(item.quantity || 1)))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                      {selectedSale.itemsSummary || selectedSale.ItemsSummary ? (
                        <div>
                          <p className="font-bold text-slate-700 mb-1">অর্ডার বিবরণী:</p>
                          <p className="font-mono text-slate-600">{selectedSale.itemsSummary || selectedSale.ItemsSummary}</p>
                        </div>
                      ) : (
                        <p>এই ইনভয়েসের জন্য পণ্যের বিস্তারিত তালিকা সংরক্ষিত নেই</p>
                      )}
                    </div>
                  )}
                </div>

                {/* হিসাব ও পেমেন্ট বিবরণী কার্ড */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* পেমেন্ট বিস্তারিত */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2.5 text-xs">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">
                      পেমেন্ট ও লেনদেন বিস্তারিত
                    </h5>
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                        <span className="font-bold text-indigo-700">{selectedSale.paymentMethod || 'Cash'}</span>
                      </div>
                      {selectedSale.receivedCash !== undefined && selectedSale.receivedCash > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">নগদ গ্রহণ:</span>
                          <span className="font-semibold text-slate-800">{formatCurrency(selectedSale.receivedCash)}</span>
                        </div>
                      )}
                      {selectedSale.changeDue !== undefined && selectedSale.changeDue > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">ফেরত দেওয়া হয়েছে:</span>
                          <span className="font-semibold text-emerald-700">{formatCurrency(selectedSale.changeDue)}</span>
                        </div>
                      )}
                      {selectedSale.transactionRef && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">ট্রানজেকশন আইডি:</span>
                          <span className="font-mono text-slate-800">{selectedSale.transactionRef}</span>
                        </div>
                      )}
                      {selectedSale.notes && (
                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 mt-2 text-[11px] border border-slate-100">
                          <b>বিশেষ নোট:</b> {selectedSale.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* আর্থিক সামারি */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2 text-xs">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">
                      হিসাব বিবরণী (Financial Summary)
                    </h5>
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-slate-600">
                        <span>সাব-টোটাল:</span>
                        <span className="font-semibold">{formatCurrency(selectedSale.subTotal)}</span>
                      </div>
                      {Number(selectedSale.discountAmount) > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>ডিসকাউন্ট:</span>
                          <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                        </div>
                      )}
                      {Number(selectedSale.taxAmount) > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>ভ্যাট / ট্যাক্স ({selectedSale.taxPercent || 0}%):</span>
                          <span>+{formatCurrency(selectedSale.taxAmount)}</span>
                        </div>
                      )}
                      <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                        <span className="font-black text-slate-900 text-sm">সর্বমোট পরিশোধিত:</span>
                        <span className="font-black text-indigo-700 text-xl">
                          {formatCurrency(selectedSale.grandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* অ্যাকশন বাটন প্যানেল */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => handleCopySummaryText(selectedSale)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all hover:border-slate-400 active:scale-95 cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">কপি সম্পন্ন!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>মেমো টেক্সট কপি (WhatsApp/SMS)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenPrintInvoice) {
                        onOpenPrintInvoice({ ...selectedSale, items: activeItems });
                      }
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-black flex items-center space-x-2 shadow-md shadow-indigo-600/25 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>রিসিট প্রিন্ট / ডাউনলোড করুন</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <FileText className="w-16 h-16 text-slate-300 mb-3 stroke-1" />
                <h3 className="text-base font-bold text-slate-700">কোনো ইনভয়েস নির্বাচন করা হয়নি</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  বাম পাশের তালিকা থেকে একটি ইনভয়েস নির্বাচন করুন অথবা উপরের সার্চ বারে নির্দিষ্ট ইনভয়েস নম্বর লিখুন।
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ================= ৪. ফুটার সেকশন ================= */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex justify-between items-center px-6 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">মোট বিক্রয় ভলিউম:</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(kpiStats.totalRevenue)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
