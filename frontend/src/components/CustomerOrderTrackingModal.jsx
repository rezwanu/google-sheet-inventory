import React, { useState, useMemo } from 'react';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  X,
  Phone,
  MapPin,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* মডাল হেডার */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                পার্সেল ও অর্ডার লাইভ ট্র্যাকিং
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {settings.StoreName || 'Pabna Bostraloy'} • সেলফ-সার্ভিস কাস্টমার ট্র্যাকিং পোর্টাল
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* ১. ট্র্যাকিং অনুসন্ধান বার */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="আপনার অর্ডার নম্বর (যেমন: ORD-102931) বা মোবাইল নম্বর দিন..."
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              ট্র্যাক করুন
            </button>
          </form>

          {/* ২. কোনো অর্ডার খুঁজে না পেলে */}
          {searchedId && !matchedOrder && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="text-sm font-bold text-amber-900">অর্ডার খুঁজে পাওয়া যায়নি</h4>
              <p className="text-xs text-amber-700 max-w-sm mx-auto">
                '{searchedId}' দিয়ে কোনো রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার আইডি বা যে মোবাইল নম্বর দিয়ে অর্ডার করেছিলেন তা নিশ্চিত করুন।
              </p>
            </div>
          )}

          {/* ৩. অর্ডার পাওয়া গেলে পূর্ণাঙ্গ লাইভ ট্র্যাকিং কার্ড */}
          {matchedOrder && (
            <div className="space-y-6">
              {/* ৩.১ অর্ডার সামারি বার ও কপি লিংক */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-amber-400 text-sm sm:text-base">
                      {matchedOrder.OrderID}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                      {matchedOrder.OrderSource || 'Online'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 block mt-1">
                    অর্ডার তারিখ: {new Date(matchedOrder.CreatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'লিংক কপি হয়েছে!' : 'ট্র্যাকিং লিংক কপি'}</span>
                  </button>
                </div>
              </div>

              {/* ৩.২ লাইভ স্ট্যাটাস টাইমলাইন (Visual Stepper) */}
              {matchedOrder.Status === 'Cancelled' ? (
                <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">অর্ডার স্ট্যাটাস</span>
                  <span className="text-base font-black text-slate-800 block">❌ এই অর্ডারটি বাতিল করা হয়েছে</span>
                </div>
              ) : matchedOrder.Status === 'Returned' ? (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-center space-y-1">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">অর্ডার স্ট্যাটাস</span>
                  <span className="text-base font-black text-rose-800 block">🔄 পার্সেলটি রিটার্ন সম্পন্ন হয়েছে</span>
                </div>
              ) : (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                    পার্সেল ডেলিভারি অগ্রগতি
                  </span>

                  <div className="relative">
                    {/* কানেক্টিং লাইন */}
                    <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 -z-0 hidden sm:block" />

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                      {TRACKING_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <div key={step.key} className="flex sm:flex-col items-center sm:text-center space-x-3 sm:space-x-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                                isCurrent
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 shadow-md'
                                  : isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border-2 border-slate-200 text-slate-400'
                              }`}
                            >
                              {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                            </div>
                            <div className="sm:mt-2">
                              <span
                                className={`text-xs block font-bold ${
                                  isCurrent ? 'text-indigo-700' : isDone ? 'text-slate-800' : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </span>
                              <span className="text-[10px] text-slate-400 hidden sm:block leading-tight mt-0.5">
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
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">কুরিয়ার সার্ভিস:</span>
                    <span className="font-bold text-indigo-900 text-sm mt-0.5 block">
                      {matchedOrder.CourierName} {matchedOrder.TrackingID ? `(কোড: ${matchedOrder.TrackingID})` : ''}
                    </span>
                  </div>

                  {matchedOrder.TrackingID && getCourierExternalUrl(matchedOrder.CourierName, matchedOrder.TrackingID) && (
                    <a
                      href={getCourierExternalUrl(matchedOrder.CourierName, matchedOrder.TrackingID)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-all shrink-0 cursor-pointer w-fit"
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
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    ডেলিভারি ঠিকানা
                  </span>
                  <span className="font-bold text-slate-800 block text-sm">{matchedOrder.CustomerName}</span>
                  <span className="text-slate-600 font-mono block">{matchedOrder.CustomerPhone}</span>
                  <span className="text-slate-700 block leading-relaxed mt-1">
                    {matchedOrder.CustomerAddress}
                  </span>
                  <span className="text-indigo-600 font-bold block text-[11px]">
                    জেলা: {matchedOrder.District || 'ঢাকা'}
                  </span>
                </div>

                {/* আর্থিক হিসাব */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    বিল ও পেমেন্ট বিবরণ
                  </span>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>পণ্যের মোট মূল্য:</span>
                    <span className="font-mono">{currencySymbol}{matchedOrder.SubTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি ফি:</span>
                    <span className="font-mono">+{currencySymbol}{matchedOrder.DeliveryCharge}</span>
                  </div>
                  {matchedOrder.AdvancePaid > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>অগ্রিম পরিশোধ:</span>
                      <span className="font-mono">-{currencySymbol}{matchedOrder.AdvancePaid}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-rose-600 text-sm pt-2 border-t border-slate-200">
                    <span>ক্যাশ অন ডেলিভারি (বাকি):</span>
                    <span className="font-mono">{currencySymbol}{matchedOrder.DueAmount}</span>
                  </div>
                </div>
              </div>

              {/* ৩.৫ পণ্যসমূহ তালিকা */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">প্যাকেজের পণ্য তালিকা:</span>
                <div className="divide-y divide-slate-100 text-xs">
                  {(matchedOrder.Items || []).map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div className="pr-2">
                        <span className="font-bold text-slate-800 block">{item.productName || item.ProductName}</span>
                        <span className="text-[10px] text-slate-400">পরিমাণ: {item.quantity} {item.unit || 'Pcs'}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {currencySymbol}{(Number(item.sellingPrice) * Number(item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ৩.৬ সেলফ-সার্ভিস রিটার্ন / এক্সচেঞ্জ সেকশন (RMA Portal) */}
              {matchedOrder.Status === 'Delivered' && (
                <div className="bg-violet-50 p-5 rounded-2xl border border-violet-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RotateCcw className="w-5 h-5 text-violet-600" />
                      <div>
                        <h4 className="text-xs font-black text-violet-900">
                          পণ্য রিটার্ন বা পরিবর্তন (Exchange) করতে চান?
                        </h4>
                        <p className="text-[11px] text-violet-700">
                          ডেলিভারি পাওয়ার পর পণ্য বা সাইজ নিয়ে সমস্যা থাকলে এখান থেকে আবেদন করুন।
                        </p>
                      </div>
                    </div>

                    {!isRmaFormOpen && !matchedOrder.RmaRequest && (
                      <button
                        onClick={() => setIsRmaFormOpen(true)}
                        className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                      >
                        আবেদন করুন
                      </button>
                    )}
                  </div>

                  {/* পূর্ববর্তী আবেদনের স্ট্যাটাস */}
                  {matchedOrder.RmaRequest && (
                    <div className="bg-white p-3 rounded-xl border border-violet-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          আবেদন: {matchedOrder.RmaRequest.type === 'Exchange' ? 'পণ্য পরিবর্তন (Exchange)' : 'রিটার্ন ও রিফান্ড'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          matchedOrder.RmaRequest.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : matchedOrder.RmaRequest.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {matchedOrder.RmaRequest.status === 'Approved' ? 'অনুমোদিত' : matchedOrder.RmaRequest.status === 'Rejected' ? 'বাতিল' : 'পর্যালোচনায় রয়েছে'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">কারণ: {matchedOrder.RmaRequest.reason}</p>
                    </div>
                  )}

                  {/* রিটার্ন আবেদন ফর্ম */}
                  {isRmaFormOpen && (
                    <form onSubmit={handleRmaSubmit} className="bg-white p-4 rounded-xl border border-violet-200 space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">আবেদনের ধরন</label>
                          <select
                            value={rmaType}
                            onChange={(e) => setRmaType(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                          >
                            <option value="Exchange">পণ্য / সাইজ পরিবর্তন (Exchange)</option>
                            <option value="Return">রিটার্ন ও টাকা ফেরত (Refund)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">সমস্যার কারণ</label>
                          <select
                            value={rmaReason}
                            onChange={(e) => setRmaReason(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
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
                        <label className="block font-bold text-slate-700 mb-1">বিস্তারিত বিবরণ (ঐচ্ছিক)</label>
                        <textarea
                          rows={2}
                          value={rmaDetails}
                          onChange={(e) => setRmaDetails(e.target.value)}
                          placeholder="আপনার সমস্যাটি বিস্তারিত লিখুন যাতে দ্রুত সমাধান দেওয়া যায়..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsRmaFormOpen(false)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-xs"
                        >
                          আবেদন জমা দিন
                        </button>
                      </div>
                    </form>
                  )}

                  {rmaSubmittedMessage && (
                    <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-xl text-xs font-bold text-center">
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
