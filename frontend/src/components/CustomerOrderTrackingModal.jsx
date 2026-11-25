import React, { useState, useMemo } from 'react';
import {
  Search,
  Truck,
  X,
  ExternalLink,
  RotateCcw,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

const TRACKING_STEPS = [
  { key: 'Pending', label: 'অর্ডার গৃহীত', desc: 'অর্ডারটি সিস্টেমে গ্রহণ করা হয়েছে' },
  { key: 'Confirmed', label: 'কনফার্মড', desc: 'অর্ডার যাচাই ও নিশ্চিত করা হয়েছে' },
  { key: 'Packaging', label: 'প্যাকিং চলছে', desc: 'ওয়্যারহাউজে মালামাল প্রস্তুত করা হচ্ছে' },
  { key: 'Shipped', label: 'কুরিয়ারে আছে', desc: 'ডেলিভারির উদ্দেশ্যে রওনা হয়েছে' },
  { key: 'Delivered', label: 'ডেলিভারি সম্পন্ন', desc: 'গ্রাহকের নিকট পার্সেল হস্তান্তর করা হয়েছে' }
];

export default function CustomerOrderTrackingModal({
  isOpen = false,
  onClose,
  orders = [],
  initialOrderId = '',
  settings = {},
  onSubmitRma,
  currencySymbol = '৳'
}) {
  const [searchTerm, setSearchTerm] = useState(initialOrderId || '');
  const [searchedId, setSearchedId] = useState(initialOrderId || '');
  const [copied, setCopied] = useState(false);

  // রিটার্ন / এক্সচেঞ্জ ফর্ম স্টেট (RMA)
  const [isRmaFormOpen, setIsRmaFormOpen] = useState(false);
  const [rmaType, setRmaType] = useState('Exchange');
  const [rmaReason, setRmaReason] = useState('সাইজ মিলছে না');
  const [rmaDetails, setRmaDetails] = useState('');
  const [rmaSubmittedMessage, setRmaSubmittedMessage] = useState(null);

  // অর্ডার খোঁজা (আইডি বা ফোন নম্বর অনুযায়ী)
  const matchedOrder = useMemo(() => {
    if (!searchedId.trim()) return null;
    const cleanSearch = searchedId.trim().toLowerCase();
    return (orders || []).find((o) => {
      const matchId = String(o.OrderID || '').toLowerCase() === cleanSearch;
      const matchPhone = String(o.CustomerPhone || '').trim() === cleanSearch;
      const matchTracking = String(o.TrackingID || '').toLowerCase() === cleanSearch;
      return matchId || matchPhone || matchTracking;
    });
  }, [orders, searchedId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchedId(searchTerm.trim());
    setIsRmaFormOpen(false);
    setRmaSubmittedMessage(null);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?track=${matchedOrder?.OrderID || ''}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRmaSubmit = (e) => {
    e.preventDefault();
    if (!matchedOrder) return;
    if (onSubmitRma) {
      onSubmitRma(matchedOrder.OrderID, {
        type: rmaType,
        reason: rmaReason,
        details: rmaDetails.trim()
      });
    }
    setIsRmaFormOpen(false);
    setRmaSubmittedMessage('আপনার আবেদনটি সফলভাবে গৃহীত হয়েছে! আমাদের সাপোর্ট টিম খুব শীঘ্রই যোগাযোগ করবে।');
  };

  if (!isOpen) return null;

  // বর্তমান অগ্রগতি ধাপ নির্ণয়
  const getStepProgressIndex = (status) => {
    if (status === 'Cancelled' || status === 'Returned') return -1;
    switch (status) {
      case 'Pending': return 0;
      case 'Confirmed': return 1;
      case 'Packaging': return 2;
      case 'Shipped': return 3;
      case 'Delivered': return 4;
      default: return 0;
    }
  };

  const currentStepIndex = matchedOrder ? getStepProgressIndex(matchedOrder.Status) : 0;

  // কুরিয়ার ট্র্যাকিং বাহ্যিক লিংক
  const getCourierExternalUrl = (courier, trackingCode) => {
    if (!trackingCode) return null;
    const cleanCode = encodeURIComponent(trackingCode.trim());
    if (courier === 'Steadfast') return `https://steadfast.com.bd/t/${cleanCode}`;
    if (courier === 'Pathao') return `https://merchant.pathao.com/tracking?consignment_id=${cleanCode}`;
    if (courier === 'RedX') return `https://redx.com.bd/track-order?trackingId=${cleanCode}`;
    if (courier === 'Paperfly') return `https://paperfly.com.bd/tracking?tracking_id=${cleanCode}`;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-neutral-200/80 animate-in fade-in zoom-in-95 flex flex-col">
        {/* মডাল হেডার */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex items-center justify-between sticky top-0 bg-[#FAFAFA] z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-white border border-neutral-200/80 text-[#0F172A] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#111111]">
                পার্সেল ও অর্ডার লাইভ ট্র্যাকিং
              </h2>
              <p className="text-xs text-[#525252] font-medium">
                {settings.StoreName || 'Pabna Bostraloy'} • সেলফ-সার্ভিস কাস্টমার ট্র্যাকিং পোর্টাল
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md hover:bg-neutral-200/60 text-[#525252] hover:text-[#111111] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 bg-white">
          {/* ১. ট্র্যাকিং অনুসন্ধান বার */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="আপনার অর্ডার নম্বর (যেমন: ORD-102931) বা মোবাইল নম্বর দিন..."
                className="w-full min-h-[44px] sm:min-h-[36px] pl-10 pr-4 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-medium text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              ট্র্যাক করুন
            </button>
          </form>

          {/* ২. কোনো অর্ডার খুঁজে না পেলে */}
          {searchedId && !matchedOrder && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-6 text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-[#B45309] mx-auto" />
              <h4 className="text-sm font-semibold tracking-tight text-[#111111]">অর্ডার খুঁজে পাওয়া যায়নি</h4>
              <p className="text-xs text-[#B45309] max-w-sm mx-auto">
                '<span className="font-mono">{searchedId}</span>' দিয়ে কোনো রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার আইডি বা যে মোবাইল নম্বর দিয়ে অর্ডার করেছিলেন তা নিশ্চিত করুন।
              </p>
            </div>
          )}

          {/* ৩. অর্ডার পাওয়া গেলে পূর্ণাঙ্গ লাইভ ট্র্যাকিং কার্ড */}
          {matchedOrder && (
            <div className="space-y-6">
              {/* ৩.১ অর্ডার সামারি বার ও কপি লিংক */}
              <div className="bg-[#0F172A] text-white p-4 sm:p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono tabular-nums font-semibold text-white text-sm sm:text-base">
                      {matchedOrder.OrderID}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/15 text-white border border-white/20">
                      {matchedOrder.OrderSource || 'Online'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 font-mono tabular-nums block mt-1">
                    অর্ডার তারিখ: {new Date(matchedOrder.CreatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyLink}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md border border-white/15 transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'লিংক কপি হয়েছে!' : 'ট্র্যাকিং লিংক কপি'}</span>
                  </button>
                </div>
              </div>

              {/* ৩.২ লাইভ স্ট্যাটাস টাইমলাইন (Visual Stepper) */}
              {matchedOrder.Status === 'Cancelled' ? (
                <div className="bg-[#F5F5F5] p-4 rounded-lg border border-neutral-200/80 text-center space-y-1">
                  <span className="text-xs font-medium text-[#737373] uppercase tracking-wider block">অর্ডার স্ট্যাটাস</span>
                  <span className="text-base font-semibold text-[#111111] flex items-center justify-center gap-1.5">
                    <X className="w-4 h-4 text-[#B91C1C]" />
                    <span>এই অর্ডারটি বাতিল করা হয়েছে</span>
                  </span>
                </div>
              ) : matchedOrder.Status === 'Returned' ? (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200/80 text-center space-y-1">
                  <span className="text-xs font-medium text-[#B91C1C] uppercase tracking-wider block">অর্ডার স্ট্যাটাস</span>
                  <span className="text-base font-semibold text-[#B91C1C] flex items-center justify-center gap-1.5">
                    <RotateCcw className="w-4 h-4" />
                    <span>পার্সেলটি রিটার্ন সম্পন্ন হয়েছে</span>
                  </span>
                </div>
              ) : (
                <div className="bg-[#FAFAFA] p-5 rounded-lg border border-neutral-200/80 space-y-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#525252] block">
                    পার্সেল ডেলিভারি অগ্রগতি
                  </span>

                  <div className="relative">
                    {/* কানেক্টিং লাইন */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-neutral-200 -z-0 hidden sm:block" />

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                      {TRACKING_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <div key={step.key} className="flex sm:flex-col items-center sm:text-center space-x-3 sm:space-x-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-mono tabular-nums font-semibold text-xs shrink-0 transition-colors ${
                                isCurrent
                                  ? 'bg-[#0F172A] text-white ring-4 ring-slate-200'
                                  : isDone
                                  ? 'bg-[#15803D] text-white'
                                  : 'bg-white border border-neutral-300 text-[#737373]'
                              }`}
                            >
                              {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                            </div>
                            <div className="sm:mt-2">
                              <span
                                className={`text-xs block font-semibold ${
                                  isCurrent ? 'text-[#0F172A]' : isDone ? 'text-[#111111]' : 'text-[#737373]'
                                }`}
                              >
                                {step.label}
                              </span>
                              <span className="text-[10px] text-[#737373] hidden sm:block leading-tight mt-0.5">
                                {step.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ৩.৩ কুরিয়ার ট্র্যাকিং লিংক (যদি থাকে) */}
              {matchedOrder.CourierName && (
                <div className="bg-[#F5F5F5] p-4 rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#525252] font-medium block">কুরিয়ার সার্ভিস:</span>
                    <span className="font-semibold text-[#111111] text-sm mt-0.5 block">
                      {matchedOrder.CourierName}{' '}
                      {matchedOrder.TrackingID ? (
                        <span className="font-mono tabular-nums text-xs text-[#525252]">(কোড: {matchedOrder.TrackingID})</span>
                      ) : ''}
                    </span>
                  </div>

                  {matchedOrder.TrackingID && getCourierExternalUrl(matchedOrder.CourierName, matchedOrder.TrackingID) && (
                    <a
                      href={getCourierExternalUrl(matchedOrder.CourierName, matchedOrder.TrackingID)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md font-medium flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer w-fit"
                    >
                      <span>কুরিয়ার ওয়েবসাইটে লাইভ দেখুন</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* ৩.৪ ডেলিভারি ঠিকানা ও পণ্য বিবরণ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* ঠিকানা */}
                <div className="bg-[#F5F5F5] p-4 rounded-lg border border-neutral-200/80 space-y-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block">
                    ডেলিভারি ঠিকানা
                  </span>
                  <span className="font-semibold text-[#111111] block text-sm">{matchedOrder.CustomerName}</span>
                  <span className="text-[#525252] font-mono tabular-nums block">{matchedOrder.CustomerPhone}</span>
                  <span className="text-[#111111] block leading-relaxed mt-1">
                    {matchedOrder.CustomerAddress}
                  </span>
                  <span className="text-[#525252] font-medium block text-[11px]">
                    জেলা: {matchedOrder.District || 'ঢাকা'}
                  </span>
                </div>

                {/* আর্থিক হিসাব */}
                <div className="bg-[#F5F5F5] p-4 rounded-lg border border-neutral-200/80 space-y-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block">
                    বিল ও পেমেন্ট বিবরণ
                  </span>
                  <div className="flex justify-between text-[#525252] pt-1">
                    <span>পণ্যের মোট মূল্য:</span>
                    <span className="font-mono tabular-nums text-[#111111]">{currencySymbol}{matchedOrder.SubTotal}</span>
                  </div>
                  <div className="flex justify-between text-[#525252]">
                    <span>ডেলিভারি ফি:</span>
                    <span className="font-mono tabular-nums text-[#111111]">+{currencySymbol}{matchedOrder.DeliveryCharge}</span>
                  </div>
                  {matchedOrder.AdvancePaid > 0 && (
                    <div className="flex justify-between text-[#15803D] font-medium">
                      <span>অগ্রিম পরিশোধ:</span>
                      <span className="font-mono tabular-nums">-{currencySymbol}{matchedOrder.AdvancePaid}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-[#B91C1C] text-sm pt-2 border-t border-neutral-200/80">
                    <span>ক্যাশ অন ডেলিভারি (বাকি):</span>
                    <span className="font-mono tabular-nums">{currencySymbol}{matchedOrder.DueAmount}</span>
                  </div>
                </div>
              </div>

              {/* ৩.৫ পণ্যসমূহ তালিকা */}
              <div className="border border-neutral-200/80 rounded-lg p-4 space-y-2 bg-white">
                <span className="text-xs font-semibold text-[#111111] block">প্যাকেজের পণ্য তালিকা:</span>
                <div className="divide-y divide-neutral-200/80 text-xs">
                  {(matchedOrder.Items || []).map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div className="pr-2">
                        <span className="font-semibold text-[#111111] block">{item.productName || item.ProductName}</span>
                        <span className="text-[10px] text-[#737373] font-mono tabular-nums">পরিমাণ: {item.quantity} {item.unit || 'Pcs'}</span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-[#111111]">
                        {currencySymbol}{(Number(item.sellingPrice) * Number(item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ৩.৬ সেলফ-সার্ভিস রিটার্ন / এক্সচেঞ্জ সেকশন (RMA Portal) */}
              {matchedOrder.Status === 'Delivered' && (
                <div className="bg-[#FAFAFA] p-5 rounded-lg border border-neutral-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <RotateCcw className="w-5 h-5 text-[#0F172A] shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold tracking-tight text-[#111111]">
                          পণ্য রিটার্ন বা পরিবর্তন (Exchange) করতে চান?
                        </h4>
                        <p className="text-[11px] text-[#525252]">
                          ডেলিভারি পাওয়ার পর পণ্য বা সাইজ নিয়ে সমস্যা থাকলে এখান থেকে আবেদন করুন।
                        </p>
                      </div>
                    </div>

                    {!isRmaFormOpen && !matchedOrder.RmaRequest && (
                      <button
                        onClick={() => setIsRmaFormOpen(true)}
                        className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer"
                      >
                        আবেদন করুন
                      </button>
                    )}
                  </div>

                  {/* পূর্ববর্তী আবেদনের স্ট্যাটাস */}
                  {matchedOrder.RmaRequest && (
                    <div className="bg-white p-3 rounded-md border border-neutral-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#111111]">
                          আবেদন: {matchedOrder.RmaRequest.type === 'Exchange' ? 'পণ্য পরিবর্তন (Exchange)' : 'রিটার্ন ও রিফান্ড'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${
                          matchedOrder.RmaRequest.status === 'Approved'
                            ? 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                            : matchedOrder.RmaRequest.status === 'Rejected'
                            ? 'bg-red-50 text-[#B91C1C] border-red-200/80'
                            : 'bg-amber-50 text-[#B45309] border-amber-200/80'
                        }`}>
                          {matchedOrder.RmaRequest.status === 'Approved' ? 'অনুমোদিত' : matchedOrder.RmaRequest.status === 'Rejected' ? 'বাতিল' : 'পর্যালোচনায় রয়েছে'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#525252]">কারণ: {matchedOrder.RmaRequest.reason}</p>
                    </div>
                  )}

                  {/* রিটার্ন আবেদন ফর্ম */}
                  {isRmaFormOpen && (
                    <form onSubmit={handleRmaSubmit} className="bg-white p-4 rounded-lg border border-neutral-200/80 space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-[#111111] mb-1">আবেদনের ধরন</label>
                          <select
                            value={rmaType}
                            onChange={(e) => setRmaType(e.target.value)}
                            className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                          >
                            <option value="Exchange">পণ্য / সাইজ পরিবর্তন (Exchange)</option>
                            <option value="Return">রিটার্ন ও টাকা ফেরত (Refund)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-medium text-[#111111] mb-1">সমস্যার কারণ</label>
                          <select
                            value={rmaReason}
                            onChange={(e) => setRmaReason(e.target.value)}
                            className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                          >
                            <option value="সাইজ মিলছে না">সাইজ মিলছে না / ছোট বা বড় হয়েছে</option>
                            <option value="ত্রুটিপূর্ণ বা ছেঁড়া পণ্য">পণ্যে কোনো ত্রুটি বা দাগ রয়েছে</option>
                            <option value="ভুল পণ্য এসেছে">অর্ডারকৃত পণ্য থেকে ভিন্ন পণ্য এসেছে</option>
                            <option value="পছন্দ হয়নি">ছবি থেকে কালার বা কাপড়ে ভিন্নতা</option>
                            <option value="অন্যান্য">অন্যান্য কারণ</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-[#111111] mb-1">বিস্তারিত বিবরণ (ঐচ্ছিক)</label>
                        <textarea
                          rows={2}
                          value={rmaDetails}
                          onChange={(e) => setRmaDetails(e.target.value)}
                          placeholder="আপনার সমস্যাটি বিস্তারিত লিখুন যাতে দ্রুত সমাধান দেওয়া যায়..."
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsRmaFormOpen(false)}
                          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-[#525252] hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md cursor-pointer"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-medium rounded-md cursor-pointer"
                        >
                          আবেদন জমা দিন
                        </button>
                      </div>
                    </form>
                  )}

                  {rmaSubmittedMessage && (
                    <div className="bg-emerald-50 border border-emerald-200/80 text-[#15803D] p-2.5 rounded-md text-xs font-medium text-center">
                      {rmaSubmittedMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
