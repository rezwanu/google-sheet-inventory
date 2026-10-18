import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck
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
      return { label: 'ডেলিভারি সম্পন্ন (Delivered)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> };
    }
    if (s.includes('in_review') || s.includes('review')) {
      return { label: 'রিভিউতে রয়েছে (In Review)', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Clock className="w-4 h-4 text-blue-600" /> };
    }
    if (s.includes('transit') || s.includes('shipping') || s.includes('picked')) {
      return { label: 'অন দ্য ওয়ে / ট্রানজিটে (In Transit)', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: <Truck className="w-4 h-4 text-purple-600" /> };
    }
    if (s.includes('hold') || s.includes('pending')) {
      return { label: 'অপেক্ষমাণ / হোল্ড (Pending/Hold)', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Clock className="w-4 h-4 text-amber-600" /> };
    }
    if (s.includes('cancelled') || s.includes('returned') || s.includes('return')) {
      return { label: 'রিটার্ন / বাতিল (Returned)', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: <AlertCircle className="w-4 h-4 text-rose-600" /> };
    }
    return { label: rawStatus || 'ট্র্যাকিং প্রক্রিয়াধীন', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: <Package className="w-4 h-4 text-slate-500" /> };
  };

  const badge = getStatusBadge(typeof statusData === 'string' ? statusData : statusData?.status || order.Status);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Truck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-black">Steadfast লাইভ ট্র্যাকিং</h3>
              <p className="text-xs text-emerald-100/90">অর্ডার #{order.OrderNumber || order.OrderID}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* লাইভ স্ট্যাটাস কার্ড */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">বর্তমান লাইভ স্ট্যাটাস</span>
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center space-x-1.5 ${badge.color}`}>
                {badge.icon}
                <span>{badge.label}</span>
              </span>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-bold pt-1">{errorMsg}</p>
            )}
          </div>

          {/* ট্র্যাকিং ও কনসাইনমেন্ট কোড */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Tracking ID</span>
              <span className="font-mono text-xs font-black text-slate-900 block truncate">
                {trackingCode || 'বুকিং প্রক্রিয়াধীন'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Consignment ID</span>
              <span className="font-mono text-xs font-black text-slate-900 block truncate">
                {consignmentId || 'CID তৈরি হয়নি'}
              </span>
            </div>
          </div>

          {/* পার্সেল ও ডেলিভারি বিবরণ */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">গ্রাহক:</span>
              <strong className="text-slate-900">{order.CustomerName}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">ফোন:</span>
              <span className="font-mono font-bold text-slate-800">{order.CustomerPhone}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">ক্যাশ অন ডেলিভারি (COD):</span>
              <strong className="text-emerald-700">{currencySymbol}{order.DueAmount || order.TotalAmount || 0}</strong>
            </div>
            <div className="pt-1">
              <span className="text-slate-500 block mb-0.5">ঠিকানা:</span>
              <p className="text-slate-800 font-medium leading-relaxed">{order.CustomerAddress || 'ঠিকানা পাওয়া যায়নি'}</p>
            </div>
          </div>

          {/* Steadfast পাবলিক ট্র্যাকিং লিংক */}
          {trackingCode && (
            <div className="pt-1">
              <a
                href={`https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Steadfast অফিসিয়াল ট্র্যাকিং ওয়েবসাইট দেখুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

        </div>

        {/* ফুটার */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

