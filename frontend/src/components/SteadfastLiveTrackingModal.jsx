import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package
} from 'lucide-react';

export default function SteadfastLiveTrackingModal({
  isOpen,
  onClose,
  order = null,
  onSteadfastCheckStatus,
  currencySymbol = '৳'
}) {
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchStatus = async () => {
    if (!order) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (onSteadfastCheckStatus) {
        const res = await onSteadfastCheckStatus(order);
        if (res && res.success) {
          setStatusData(res.data);
        } else {
          setErrorMsg(res?.message || 'Steadfast থেকে ট্র্যাকিং ডাটা পাওয়া যায়নি।');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'নেটওয়ার্ক সংযোগ ব্যর্থ।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && order) {
      fetchStatus();
    } else {
      setStatusData(null);
      setErrorMsg('');
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const trackingCode = order.TrackingID || order.TrackingCode || '';
  const consignmentId = order.ConsignmentID || '';

  // Steadfast স্ট্যাটাস কোড অনুযায়ী বাংলা লেবেল ও স্টাইল
  const getStatusBadge = (rawStatus) => {
    const s = String(rawStatus || '').toLowerCase();
    if (s.includes('delivered') && !s.includes('pending')) {
      return { label: 'ডেলিভারি সম্পন্ন (Delivered)', color: 'bg-emerald-50 text-[#15803D] border-emerald-200/80', icon: <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> };
    }
    if (s.includes('in_review') || s.includes('review')) {
      return { label: 'রিভিউতে রয়েছে (In Review)', color: 'bg-[#F5F5F5] text-[#0F172A] border-neutral-200/80', icon: <Clock className="w-4 h-4 text-[#0F172A]" /> };
    }
    if (s.includes('transit') || s.includes('shipping') || s.includes('picked')) {
      return { label: 'অন দ্য ওয়ে / ট্রানজিটে (In Transit)', color: 'bg-slate-100 text-[#0F172A] border-slate-200/80', icon: <Truck className="w-4 h-4 text-[#0F172A]" /> };
    }
    if (s.includes('hold') || s.includes('pending')) {
      return { label: 'অপেক্ষমাণ / হোল্ড (Pending/Hold)', color: 'bg-amber-50 text-[#B45309] border-amber-200/80', icon: <Clock className="w-4 h-4 text-[#B45309]" /> };
    }
    if (s.includes('cancelled') || s.includes('returned') || s.includes('return')) {
      return { label: 'রিটার্ন / বাতিল (Returned)', color: 'bg-red-50 text-[#B91C1C] border-red-200/80', icon: <AlertCircle className="w-4 h-4 text-[#B91C1C]" /> };
    }
    return { label: rawStatus || 'ট্র্যাকিং প্রক্রিয়াধীন', color: 'bg-[#F5F5F5] text-[#525252] border-neutral-200/80', icon: <Package className="w-4 h-4 text-[#737373]" /> };
  };

  const badge = getStatusBadge(typeof statusData === 'string' ? statusData : statusData?.status || order.Status);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-neutral-200/80 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 bg-[#FAFAFA] text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-white border border-neutral-200/80 flex items-center justify-center text-[#0F172A] shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-[#111111]">Steadfast লাইভ ট্র্যাকিং</h3>
              <p className="text-xs text-[#525252] font-mono tabular-nums mt-0.5">অর্ডার #{order.OrderNumber || order.OrderID}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#525252] hover:text-[#111111] hover:bg-neutral-200/60 rounded-md transition-colors cursor-pointer flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          
          {/* লাইভ স্ট্যাটাস কার্ড */}
          <div className="p-4 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">বর্তমান লাইভ স্ট্যাটাস</span>
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                className="min-h-[44px] sm:min-h-[36px] px-2.5 rounded-md bg-white hover:bg-[#FAFAFA] border border-neutral-200/80 text-xs text-[#0F172A] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center space-x-1.5 ${badge.color}`}>
                {badge.icon}
                <span>{badge.label}</span>
              </span>
            </div>

            {errorMsg && (
              <p className="text-xs text-[#B91C1C] font-medium pt-1">{errorMsg}</p>
            )}
          </div>

          {/* ট্র্যাকিং ও কনসাইনমেন্ট কোড */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block mb-0.5">Tracking ID</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-[#111111] block truncate">
                {trackingCode || 'বুকিং প্রক্রিয়াধীন'}
              </span>
            </div>

            <div className="p-3 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block mb-0.5">Consignment ID</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-[#111111] block truncate">
                {consignmentId || 'CID তৈরি হয়নি'}
              </span>
            </div>
          </div>

          {/* পার্সেল ও ডেলিভারি বিবরণ */}
          <div className="p-3.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
              <span className="text-[#525252]">গ্রাহক:</span>
              <strong className="text-[#111111] font-semibold">{order.CustomerName}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
              <span className="text-[#525252]">ফোন:</span>
              <span className="font-mono tabular-nums font-semibold text-[#111111]">{order.CustomerPhone}</span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
              <span className="text-[#525252]">ক্যাশ অন ডেলিভারি (COD):</span>
              <strong className="font-mono tabular-nums text-[#15803D] font-semibold">{currencySymbol}{order.DueAmount || order.TotalAmount || 0}</strong>
            </div>
            <div className="pt-1">
              <span className="text-[#525252] block mb-0.5">ঠিকানা:</span>
              <p className="text-[#111111] font-medium leading-relaxed">{order.CustomerAddress || 'ঠিকানা পাওয়া যায়নি'}</p>
            </div>
          </div>

          {/* Steadfast পাবলিক ট্র্যাকিং লিংক */}
          {trackingCode && (
            <div className="pt-1">
              <a
                href={`https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] sm:min-h-[36px] py-2 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Steadfast অফিসিয়াল ট্র্যাকিং ওয়েবসাইট দেখুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

        </div>

        {/* ফুটার */}
        <div className="p-3.5 border-t border-neutral-200/80 bg-[#FAFAFA] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
