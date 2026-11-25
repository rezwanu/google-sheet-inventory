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
  CreditCard,
  ShoppingBag,
  CloudDownload,
  CheckCircle2,
  Clock,
  Sparkles,
  Receipt,
  Wallet,
  Banknote
} from 'lucide-react';
import { normalizeSale, extractAndNormalizeItems } from '../services/storage';
import { fetchSaleByInvoice } from '../services/api';
import StoreLogo from './StoreLogo';

export default function InvoiceLookupModal({
  isOpen,
  onClose,
  embedded = false,
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

  if (!isOpen && !embedded) return null;

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
        className: 'bg-emerald-50 text-[#15803D] border-emerald-200/80',
        icon: <Banknote className="w-3.5 h-3.5 text-[#15803D]" />,
      };
    }
    if (m.includes('bkash') || m.includes('বিকাশ')) {
      return {
        label: 'বিকাশ (bKash)',
        className: 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80',
        icon: <Wallet className="w-3.5 h-3.5 text-[#0F172A]" />,
      };
    }
    if (m.includes('nagad') || m.includes('rocket') || m.includes('mfs')) {
      return {
        label: 'ডিজিটাল ওয়ালেট',
        className: 'bg-amber-50 text-[#B45309] border-amber-200/80',
        icon: <Wallet className="w-3.5 h-3.5 text-[#B45309]" />,
      };
    }
    if (m.includes('card') || m.includes('কার্ড') || m.includes('pos')) {
      return {
        label: 'কার্ড পেমেন্ট (Card)',
        className: 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80',
        icon: <CreditCard className="w-3.5 h-3.5 text-[#0F172A]" />,
      };
    }
    return {
      label: method || 'অন্যান্য',
      className: 'bg-[#F5F5F5] text-[#525252] border-neutral-200/80',
      icon: <CreditCard className="w-3.5 h-3.5 text-[#737373]" />,
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

    const summary = `${settings.StoreName || 'ইনভয়েস মেমো'}
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
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent" : "fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4"}>
      <div className={embedded ? "bg-white rounded-lg border border-neutral-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] overflow-hidden flex flex-col" : "bg-white rounded-lg border border-neutral-200/80 max-w-6xl w-full overflow-hidden flex flex-col max-h-[94vh]"}>
        
        {/* ================= ১. শীর্ষ হেডার বার ================= */}
        <div className="px-5 sm:px-6 py-4 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A] shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                  ইনভয়েস অনুসন্ধান ও বিস্তারিত মেমো
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#0F172A]" />
                  ডিজিটাল মেমো ভিউয়ার
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                ইনভয়েস নম্বর, ক্রেতার নাম বা মোবাইল নম্বর দিয়ে বিক্রয় বিবরণ খুঁজে বের করুন, যাচাই করুন ও রি-প্রিন্ট নিন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* ছোট পরিসংখ্যান স্ট্রিপ */}
            <div className="hidden md:flex items-center space-x-3 text-xs bg-white border border-neutral-200/80 px-3 py-1.5 rounded-md">
              <div className="text-right">
                <span className="text-[10px] text-[#737373] block">মোট মেমো</span>
                <span className="font-semibold text-[#111111] font-mono tabular-nums">{kpiStats.totalInvoices} টি</span>
              </div>
              <div className="h-6 w-px bg-neutral-200/80" />
              <div className="text-right">
                <span className="text-[10px] text-[#737373] block">আজকের বিক্রয়</span>
                <span className="font-semibold text-[#15803D] font-mono tabular-nums">{kpiStats.todayInvoices} টি</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`transition-colors cursor-pointer flex items-center space-x-1 rounded-md min-h-[44px] sm:min-h-[36px] border border-neutral-200/80 ${
                embedded
                  ? 'px-3 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium text-xs'
                  : 'min-w-[44px] sm:min-w-[36px] text-[#737373] hover:text-[#111111] bg-white hover:bg-[#F5F5F5] justify-center'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-semibold">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ================= ২. অনুসন্ধান ও ফিল্টার কমান্ড বার ================= */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-neutral-200/80 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* সার্চ ইনপুট */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
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
                className="w-full pl-10 pr-24 py-2 bg-[#F5F5F5] focus:bg-white border border-neutral-200/80 rounded-md text-xs sm:text-sm font-medium text-[#111111] placeholder-[#737373] focus:outline-none focus:border-[#0F172A] transition-colors min-h-[44px] sm:min-h-[36px]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] text-xs px-2 py-1 rounded-md hover:bg-neutral-200/60 cursor-pointer flex items-center gap-1"
                >
                  <span>ক্লিয়ার</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* গুগল শিট ক্লাউড অনুসন্ধান বাটন */}
            <button
              onClick={handleCloudSearch}
              disabled={isCloudSearching || !searchTerm.trim()}
              className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:bg-neutral-300 text-white rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed min-h-[44px] sm:min-h-[36px]"
              title="গুগল শিট ক্লাউড ডেটাবেসে সরাসরি অনুসন্ধান করুন"
            >
              <CloudDownload className={`w-4 h-4 ${isCloudSearching ? 'animate-bounce' : ''}`} />
              <span>{isCloudSearching ? 'অনুসন্ধান চলছে...' : 'ক্লাউড সার্চ'}</span>
            </button>
          </div>

          {/* ক্লাউড এরর বার্তা */}
          {cloudError && (
            <div className="p-2.5 bg-red-50 border border-red-200/80 rounded-md text-xs font-medium text-[#B91C1C] flex items-center justify-between">
              <span>{cloudError}</span>
              <button onClick={() => setCloudError(null)} className="text-[#B91C1C] hover:text-red-900 cursor-pointer p-1">
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
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border min-h-[44px] sm:min-h-[36px] ${
                    paymentFilter === tab.id
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white hover:bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* সাম্প্রতিক ইনভয়েস কুইক পিলস */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
              <span className="text-[10px] font-medium text-[#737373] uppercase shrink-0">
                সাম্প্রতিক:
              </span>
              {normalizedSales.slice(0, 5).map((sale) => (
                <button
                  key={sale.saleId || sale.invoiceNo}
                  onClick={() => {
                    setSelectedSale(sale);
                    setSearchTerm(sale.invoiceNo);
                  }}
                  className={`px-2 py-1 rounded-md font-mono tabular-nums text-[10px] font-medium border transition-colors shrink-0 cursor-pointer min-h-[36px] ${
                    selectedSale?.invoiceNo === sale.invoiceNo
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-[#111111] border-neutral-200/80 hover:border-neutral-300 hover:bg-[#F5F5F5]'
                  }`}
                >
                  {sale.invoiceNo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================= ৩. মূল স্প্লিট ভিউ: বামে তালিকা এবং ডানে পূর্ণাঙ্গ মেমো ================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#FAFAFA] min-h-0">
          
          {/* ৩.১ বাম কলাম: ম্যাচিং ইনভয়েস তালিকা */}
          <div className="lg:col-span-4 border-r border-neutral-200/80 bg-white overflow-y-auto max-h-[38vh] lg:max-h-none p-3 space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] font-mono tabular-nums">
                ইনভয়েস তালিকা ({searchResults.length})
              </span>
              <span className="text-[10px] text-[#737373] font-medium">
                ক্লিক করে মেমো দেখুন
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-[#737373]">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-neutral-300 stroke-1" />
                <p className="text-xs font-semibold text-[#111111]">কোনো ইনভয়েস খুঁজে পাওয়া যায়নি</p>
                <p className="text-[11px] text-[#737373] mt-1 leading-relaxed">
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
                    className={`p-3 rounded-lg border transition-colors cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-[#F5F5F5] border-[#0F172A]'
                        : 'bg-white border-neutral-200/80 hover:bg-[#FAFAFA] hover:border-neutral-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0F172A]" />
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#111111] bg-white px-2 py-0.5 rounded-md border border-neutral-200/80">
                        {sale.invoiceNo}
                      </span>
                      <span className="text-xs font-semibold font-mono tabular-nums text-[#111111]">
                        {formatCurrency(sale.grandTotal)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-[#525252]">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] flex items-center justify-center font-semibold text-[10px] shrink-0">
                          {sale.customerName ? sale.customerName.charAt(0) : 'C'}
                        </div>
                        <span className="font-semibold text-[#111111] truncate">
                          {sale.customerName || 'সাধারণ ক্রেতা'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#737373] shrink-0 font-mono tabular-nums">
                        {sale.timestamp ? new Date(sale.timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-200/80 flex items-center justify-between text-[10px] text-[#525252]">
                      <span className="flex items-center space-x-1 font-mono tabular-nums">
                        <ShoppingBag className="w-3 h-3 text-[#737373]" />
                        <span>{itemsCount > 0 ? `${itemsCount} টি আইটেম` : '১ টি অর্ডার'}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border font-medium flex items-center space-x-1 ${pBadge.className}`}>
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
          <div className="lg:col-span-8 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] flex flex-col">
            {selectedSale ? (
              <div className="space-y-4 max-w-3xl mx-auto w-full">
                
                {/* ডিজিটাল মেমো হেডার কার্ড */}
                <div className="bg-white rounded-lg p-5 sm:p-6 border border-neutral-200/80 relative overflow-hidden">
                  
                  {/* স্টোর ইনফো ও অফিশিয়াল ভাউচার স্ট্যাম্প */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
                    <div className="flex items-center space-x-3.5">
                      <StoreLogo
                        url={settings?.LogoUrl || settings?.logoUrl}
                        alt={settings?.StoreName || 'লোগো'}
                        className="w-12 h-12 object-contain rounded-md border border-neutral-200/80 p-1 bg-white"
                        fallbackIcon={Receipt}
                        fallbackClassName="w-12 h-12 rounded-md bg-[#F5F5F5] text-[#0F172A] flex items-center justify-center border border-neutral-200/80"
                        iconClassName="w-6 h-6"
                      />
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-[#111111] tracking-tight">
                          {settings?.StoreName || 'ইনভয়েস মেমো'}
                        </h3>
                        <p className="text-xs text-[#525252] flex items-center space-x-2 mt-0.5">
                          {settings?.Address && <span>{settings.Address}</span>}
                          {settings?.Phone && <span className="font-mono tabular-nums">• {settings.Phone}</span>}
                        </p>
                      </div>
                    </div>

                    {/* পরিশোধিত ভেরিফাইড ব্যাজ */}
                    <div className="flex items-center space-x-2 self-start sm:self-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200/80">
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#15803D]" />
                        পরিশোধিত (PAID)
                      </span>
                    </div>
                  </div>

                  {/* ইনভয়েস নম্বর ও তারিখ বার */}
                  <div className="mt-4 p-3 bg-[#F5F5F5] rounded-md border border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#525252] font-semibold uppercase tracking-wider">ইনভয়েস নং:</span>
                      <span className="font-mono tabular-nums text-base font-semibold text-[#111111]">
                        {selectedSale.invoiceNo}
                      </span>
                      <button
                        onClick={() => handleCopyInvoiceNumber(selectedSale.invoiceNo)}
                        title="ইনভয়েস নম্বর কপি করুন"
                        className="p-1.5 hover:bg-neutral-200/70 rounded-md text-[#525252] hover:text-[#111111] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        {copiedInvoice ? (
                          <Check className="w-4 h-4 text-[#15803D]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#525252] font-mono tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-[#737373]" />
                      <span>
                        {selectedSale.timestamp
                          ? new Date(selectedSale.timestamp).toLocaleString('bn-BD', { dateStyle: 'full', timeStyle: 'short' })
                          : 'তারিখ নেই'}
                      </span>
                    </div>
                  </div>

                  {/* ক্রেতা ও ক্যাশিয়ার তথ্য কার্ড */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-3.5 bg-[#FAFAFA] rounded-lg border border-neutral-200/80 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-[#737373] font-semibold uppercase block tracking-wider">
                        ক্রেতার বিবরণ:
                      </span>
                      <div className="flex items-center space-x-2 font-semibold text-[#111111]">
                        <User className="w-3.5 h-3.5 text-[#0F172A] shrink-0" />
                        <span className="text-sm font-semibold">{selectedSale.customerName || 'সাধারণ ক্রেতা'}</span>
                        {selectedSale.customerType && (
                          <span className="text-[10px] px-2 py-0.5 bg-[#F5F5F5] text-[#111111] rounded-md font-medium border border-neutral-200/80">
                            {selectedSale.customerType}
                          </span>
                        )}
                      </div>
                      {selectedSale.customerPhone && (
                        <div className="flex items-center space-x-2 text-[#525252] font-mono tabular-nums">
                          <Phone className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                          <a href={`tel:${selectedSale.customerPhone}`} className="hover:text-[#0F172A] hover:underline">
                            {selectedSale.customerPhone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-[#737373] font-semibold uppercase block tracking-wider">
                        পেমেন্ট ও ক্যাশিয়ার:
                      </span>
                      <div className="flex items-center space-x-2 text-[#525252] font-medium">
                        <CreditCard className="w-3.5 h-3.5 text-[#0F172A] shrink-0" />
                        <span>পদ্ধতি: <b className="text-[#111111]">{selectedSale.paymentMethod || 'Cash'}</b></span>
                      </div>
                      <div className="flex items-center space-x-2 text-[#737373] text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                        <span>ক্যাশিয়ার: {selectedSale.cashierEmail || 'POS Cashier'}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* আইটেম তালিকা কার্ড */}
                <div className="bg-white rounded-lg p-5 border border-neutral-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#525252] flex items-center space-x-1.5">
                      <ShoppingBag className="w-4 h-4 text-[#0F172A]" />
                      <span className="font-mono tabular-nums">পণ্য তালিকা ({activeItems.length} টি আইটেম)</span>
                    </h4>
                  </div>

                  {activeItems.length > 0 ? (
                    <div className="border border-neutral-200/80 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F5F5F5] text-[#525252] font-semibold border-b border-neutral-200/80 uppercase text-[10px]">
                              <th className="p-3">#</th>
                              <th className="p-3">পণ্যের বিবরণী</th>
                              <th className="p-3 text-center">পরিমাণ</th>
                              <th className="p-3 text-right">একক দর</th>
                              <th className="p-3 text-right">মোট টাকা</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200/80 font-medium text-[#525252]">
                            {activeItems.map((item, idx) => (
                              <tr key={item.productId || idx} className="hover:bg-[#FAFAFA] transition-colors">
                                <td className="p-3 text-[#737373] font-mono tabular-nums text-[11px]">{idx + 1}</td>
                                <td className="p-3">
                                  <span className="font-semibold text-[#111111] block">
                                    {item.productName || 'আইটেম'}
                                    {item.variantName && (
                                      <span className="ml-1.5 text-[10px] font-medium text-[#111111] bg-[#F5F5F5] px-1.5 py-0.5 rounded-md border border-neutral-200/80">
                                        {item.variantName}
                                      </span>
                                    )}
                                  </span>
                                  {item.barcode && (
                                    <span className="font-mono tabular-nums text-[10px] text-[#737373]">#{item.barcode}</span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono tabular-nums font-semibold text-[#111111]">
                                  {item.quantity} {item.unit || ''}
                                </td>
                                <td className="p-3 text-right font-mono tabular-nums text-[#525252]">
                                  {formatCurrency(item.sellingPrice)}
                                </td>
                                <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#111111]">
                                  {formatCurrency(item.total || (Number(item.sellingPrice || 0) * Number(item.quantity || 1)))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#FAFAFA] border border-neutral-200/80 rounded-lg text-center text-xs text-[#525252]">
                      {selectedSale.itemsSummary || selectedSale.ItemsSummary ? (
                        <div>
                          <p className="font-semibold text-[#111111] mb-1">অর্ডার বিবরণী:</p>
                          <p className="font-mono text-[#525252]">{selectedSale.itemsSummary || selectedSale.ItemsSummary}</p>
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
                  <div className="bg-white rounded-lg p-5 border border-neutral-200/80 space-y-2.5 text-xs">
                    <h5 className="font-semibold text-xs uppercase tracking-wider text-[#737373]">
                      পেমেন্ট ও লেনদেন বিস্তারিত
                    </h5>
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between py-1 border-b border-neutral-200/80">
                        <span className="text-[#525252]">পেমেন্ট মাধ্যম:</span>
                        <span className="font-semibold text-[#111111]">{selectedSale.paymentMethod || 'Cash'}</span>
                      </div>
                      {selectedSale.receivedCash !== undefined && selectedSale.receivedCash > 0 && (
                        <div className="flex justify-between py-1 border-b border-neutral-200/80">
                          <span className="text-[#525252]">নগদ গ্রহণ:</span>
                          <span className="font-mono tabular-nums font-semibold text-[#111111]">{formatCurrency(selectedSale.receivedCash)}</span>
                        </div>
                      )}
                      {selectedSale.changeDue !== undefined && selectedSale.changeDue > 0 && (
                        <div className="flex justify-between py-1 border-b border-neutral-200/80">
                          <span className="text-[#525252]">ফেরত দেওয়া হয়েছে:</span>
                          <span className="font-mono tabular-nums font-semibold text-[#15803D]">{formatCurrency(selectedSale.changeDue)}</span>
                        </div>
                      )}
                      {selectedSale.transactionRef && (
                        <div className="flex justify-between py-1 border-b border-neutral-200/80">
                          <span className="text-[#525252]">ট্রানজেকশন আইডি:</span>
                          <span className="font-mono tabular-nums text-[#111111]">{selectedSale.transactionRef}</span>
                        </div>
                      )}
                      {selectedSale.notes && (
                        <div className="p-2.5 bg-[#FAFAFA] rounded-md text-[#525252] mt-2 text-[11px] border border-neutral-200/80">
                          <b>বিশেষ নোট:</b> {selectedSale.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* আর্থিক সামারি */}
                  <div className="bg-white rounded-lg p-5 border border-neutral-200/80 space-y-2 text-xs">
                    <h5 className="font-semibold text-xs uppercase tracking-wider text-[#737373]">
                      হিসাব বিবরণী (Financial Summary)
                    </h5>
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-[#525252]">
                        <span>সাব-টোটাল:</span>
                        <span className="font-mono tabular-nums font-semibold text-[#111111]">{formatCurrency(selectedSale.subTotal)}</span>
                      </div>
                      {Number(selectedSale.discountAmount) > 0 && (
                        <div className="flex justify-between text-[#15803D] font-medium">
                          <span>ডিসকাউন্ট:</span>
                          <span className="font-mono tabular-nums">-{formatCurrency(selectedSale.discountAmount)}</span>
                        </div>
                      )}
                      {Number(selectedSale.taxAmount) > 0 && (
                        <div className="flex justify-between text-[#525252]">
                          <span>ভ্যাট / ট্যাক্স (<span className="font-mono tabular-nums">{selectedSale.taxPercent || 0}%</span>):</span>
                          <span className="font-mono tabular-nums">+{formatCurrency(selectedSale.taxAmount)}</span>
                        </div>
                      )}
                      <div className="pt-2.5 border-t border-neutral-200/80 flex justify-between items-baseline">
                        <span className="font-semibold text-[#111111] text-sm">সর্বমোট পরিশোধিত:</span>
                        <span className="font-semibold font-mono tabular-nums text-[#111111] text-xl">
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
                    className="px-4 py-2 bg-white hover:bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-4 h-4 text-[#15803D]" />
                        <span className="text-[#15803D]">কপি সম্পন্ন!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#737373]" />
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
                    className="px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>রিসিট প্রিন্ট / ডাউনলোড করুন</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#737373]">
                <FileText className="w-16 h-16 text-neutral-300 mb-3 stroke-1" />
                <h3 className="text-base font-semibold tracking-tight text-[#111111]">কোনো ইনভয়েস নির্বাচন করা হয়নি</h3>
                <p className="text-xs text-[#525252] max-w-sm mt-1 leading-relaxed">
                  বাম পাশের তালিকা থেকে একটি ইনভয়েস নির্বাচন করুন অথবা উপরের সার্চ বারে নির্দিষ্ট ইনভয়েস নম্বর লিখুন।
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ================= ৪. ফুটার সেকশন ================= */}
        <div className="p-3 bg-[#FAFAFA] border-t border-neutral-200/80 text-xs text-[#525252] flex justify-between items-center px-6 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-[#737373]">মোট বিক্রয় ভলিউম:</span>
            <span className="font-semibold font-mono tabular-nums text-[#111111]">
              {formatCurrency(kpiStats.totalRevenue)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#111111] text-xs font-medium rounded-md transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
